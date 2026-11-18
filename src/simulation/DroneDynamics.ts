import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { insideCourt } from "../arena/geometry";
import {
  missions,
  home,
  samplePath,
  missionIsActive,
  type MissionId,
  type MissionPhase,
} from "./missions";
import { Weather } from "../weather/Weather";
import { aircraft as p, motorPositions, motorSpin } from "./parameters";
export type FlightMode =
  | "Disarmed"
  | "Armed"
  | "Takeoff"
  | "Position hold"
  | "Manual"
  | "Mission"
  | "Landing"
  | "Crashed";
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export class DroneDynamics {
  manualOnly = false;
  resetGuard?: () => boolean;
  beforeStep?: (dt: number) => void;
  afterStep?: (dt: number) => void;
  position = new Vector3(-20, p.gearHeight, 0);
  previousPosition = this.position.clone();
  velocity = new Vector3();
  orientation = new Quaternion();
  previousOrientation = this.orientation.clone();
  angularVelocity = new Vector3();
  motors = [0, 0, 0, 0];
  thrusts = [0, 0, 0, 0];
  target = new Vector3(-20, 5, 0);
  targetVelocity = new Vector3();
  mode: FlightMode = "Disarmed";
  time = 0;
  paused = false;
  missionDistance = 0;
  selectedMission: MissionId = "figure-eight";
  missionPhase: MissionPhase = "IDLE";
  resumePhase: MissionPhase = "IDLE";
  missionLeg = 0;
  legDistance = 0;
  missionElapsed = 0;
  phaseHistory: MissionPhase[] = ["IDLE"];
  visitedWaypoints: string[] = [];
  missionPaused = false;
  yaw = 0;
  positionIntegral = new Vector3();
  rateIntegral = new Vector3();
  previousRate = new Vector3();
  wind = new Vector3();
  force = new Vector3();
  torque = new Vector3();
  lastContactSpeed = 0;
  accumulator = 0;
  droppedTime = 0;
  private weather: Weather;
  constructor(weather: Weather) {
    this.weather = weather;
  }
  get armed() {
    return this.mode !== "Disarmed" && this.mode !== "Crashed";
  }
  get altitude() {
    return Math.max(0, this.position.y - p.gearHeight);
  }
  get progress() {
    return this.missionPhase === "COMPLETED"
      ? 1
      : Math.min(
          0.98,
          this.missionDistance / missions[this.selectedMission].length,
        );
  }
  reset() {
    if (this.resetGuard?.() === false) return false;
    const weather = this.weather,
      selected = this.selectedMission,
      manualOnly = this.manualOnly,
      resetGuard = this.resetGuard,
      beforeStep = this.beforeStep,
      afterStep = this.afterStep;
    Object.assign(this, new DroneDynamics(weather));
    this.selectedMission = selected;
    this.manualOnly = manualOnly;
    this.resetGuard = resetGuard;
    this.beforeStep = beforeStep;
    this.afterStep = afterStep;
  }
  clearController() {
    this.positionIntegral.set(0, 0, 0);
    this.rateIntegral.set(0, 0, 0);
    this.previousRate.copy(this.angularVelocity);
  }
  arm() {
    if (this.mode === "Disarmed") {
      this.clearController();
      this.mode = "Armed";
      this.target.copy(this.position);
    }
  }
  disarm() {
    this.abortMission();
    this.mode = "Disarmed";
    this.clearController();
  }
  takeoff() {
    if (this.manualOnly) return false;
    this.abortMission();
    if (this.mode === "Crashed") return;
    if (!this.armed) this.arm();
    this.target.copy(this.position);
    this.target.y = 5 + p.gearHeight;
    this.targetVelocity.set(0, 0, 0);
    this.mode = "Takeoff";
    this.clearController();
  }
  hold() {
    this.abortMission();
    if (!this.armed) return;
    this.mode = "Position hold";
    this.target.copy(this.position);
    this.targetVelocity.set(0, 0, 0);
    this.missionPaused = false;
  }
  land() {
    if (this.manualOnly) return false;
    this.abortMission();
    if (!this.armed) return;
    this.mode = "Landing";
    this.target.copy(this.position);
    this.target.y = p.gearHeight - 0.15;
    this.targetVelocity.set(0, -0.55, 0);
    this.clearController();
  }
  get missionActive() {
    return missionIsActive(this.missionPhase);
  }
  get activeWaypoint() {
    if (this.missionPhase === "COMPLETED" || this.missionPhase === "LANDING")
      return "H";
    if (["IDLE", "ARMING", "TAKEOFF"].includes(this.missionPhase)) return "H";
    return (
      missions[this.selectedMission].legs[this.missionLeg]?.waypoint ?? "H"
    );
  }
  selectMission(id: MissionId) {
    if (this.missionActive || !missions[id]) return false;
    this.selectedMission = id;
    this.missionPhase = "IDLE";
    this.missionDistance = 0;
    this.visitedWaypoints = [];
    this.phaseHistory = ["IDLE"];
    return true;
  }
  private setPhase(phase: MissionPhase) {
    this.missionPhase = phase;
    this.phaseHistory.push(phase);
  }
  abortMission() {
    if (this.missionActive) this.setPhase("ABORTED");
    this.missionPaused = false;
  }
  mission() {
    if (this.manualOnly) return false;
    // Starting condition is reviewable and explicit: landed at H, never relocated.
    if (
      this.missionActive ||
      this.mode === "Crashed" ||
      this.altitude > 0.12 ||
      Math.hypot(this.position.x - home[0], this.position.z - home[1]) > 0.5
    )
      return false;
    this.missionDistance = 0;
    this.legDistance = 0;
    this.missionLeg = 0;
    this.missionElapsed = 0;
    this.visitedWaypoints = [];
    this.phaseHistory = ["IDLE"];
    this.missionPaused = false;
    this.arm();
    this.mode = "Armed";
    this.setPhase("ARMING");
    this.target.set(
      home[0],
      missions[this.selectedMission].altitude + p.gearHeight,
      home[1],
    );
    this.targetVelocity.set(0, 0, 0);
    this.clearController();
    return true;
  }
  toggleMissionPause() {
    if (!this.missionActive) return;
    if (this.missionPhase === "PAUSED") {
      this.setPhase(this.resumePhase);
      this.missionPaused = false;
      this.mode =
        this.resumePhase === "ARMING"
          ? "Armed"
          : this.resumePhase === "LANDING"
            ? "Landing"
            : "Mission";
      if (this.resumePhase === "LANDING") {
        this.target.set(home[0], p.gearHeight - 0.15, home[1]);
        this.targetVelocity.set(0, -0.55, 0);
      }
    } else {
      this.resumePhase = this.missionPhase;
      this.setPhase("PAUSED");
      this.missionPaused = true;
      this.mode = this.altitude < 0.02 ? "Armed" : "Position hold";
      this.target.copy(this.position);
      this.targetVelocity.set(0, 0, 0);
    }
  }
  private updateMission(dt: number) {
    if (!this.missionActive || this.missionPaused) return;
    this.missionElapsed += dt;
    if (this.missionElapsed > 360) {
      this.abortMission();
      this.setPhase("FAILED");
      this.mode = "Position hold";
      this.target.copy(this.position);
      this.targetVelocity.set(0, 0, 0);
      return;
    }
    const mission = missions[this.selectedMission];
    if (this.missionPhase === "ARMING") {
      if (this.missionElapsed > 0.6) {
        this.mode = "Mission";
        this.setPhase("TAKEOFF");
      }
      return;
    }
    if (this.missionPhase === "TAKEOFF") {
      this.target.set(home[0], mission.altitude + p.gearHeight, home[1]);
      if (
        this.position.distanceTo(this.target) < 0.18 &&
        this.velocity.length() < 0.2
      )
        this.setPhase("TRANSIT_TO_ROUTE");
      return;
    }
    if (this.missionPhase === "LANDING") return;
    const leg = mission.legs[this.missionLeg];
    if (this.missionPhase !== leg.phase) this.setPhase(leg.phase);
    const remaining = leg.path.length - this.legDistance;
    // Ease to zero at exact waypoint coordinates; the PID/motor system rounds turns physically.
    const speed = Math.min(2.1, Math.sqrt(Math.max(0, remaining) * 1.6));
    if (this.position.distanceTo(this.target) < 0.7) {
      const delta = Math.min(remaining, Math.max(0.08, speed) * dt);
      this.legDistance += delta;
      this.missionDistance += delta;
    }
    const [x, z] = samplePath(leg.path, this.legDistance);
    this.target.set(x, mission.altitude + p.gearHeight, z);
    const next = samplePath(leg.path, this.legDistance + 0.08);
    this.targetVelocity.set(
      ((next[0] - x) / 0.08) * speed,
      0,
      ((next[1] - z) / 0.08) * speed,
    );
    if (
      this.legDistance >= leg.path.length &&
      this.position.distanceTo(this.target) < 0.25 &&
      this.velocity.length() < 0.3
    ) {
      this.visitedWaypoints.push(leg.waypoint);
      this.missionLeg++;
      this.legDistance = 0;
      if (this.missionLeg === mission.legs.length) {
        this.setPhase("LANDING");
        this.mode = "Landing";
        this.target.set(home[0], p.gearHeight - 0.15, home[1]);
        this.targetVelocity.set(0, -0.55, 0);
        this.clearController();
      } else this.setPhase(mission.legs[this.missionLeg].phase);
    }
  }
  engageManual() {
    if (!this.armed || this.missionActive) return false;
    this.target.copy(this.position);
    this.targetVelocity.set(0, 0, 0);
    this.clearController();
    this.mode = "Manual";
    return true;
  }
  manual(command: Vector3, yawRate: number, dt: number) {
    if (!this.armed || this.mode === "Armed" || this.mode === "Landing") return;
    if (command.lengthSq() || yawRate) {
      if (this.mode !== "Manual") {
        this.hold();
        this.mode = "Manual";
      }
      this.yaw += yawRate * dt;
      this.target.addScaledVector(command, dt);
      if (!this.manualOnly) {
        this.target.x = clamp(this.target.x, -21, 21);
        this.target.z = clamp(this.target.z, -12, 12);
      }
      this.target.y = clamp(
        this.target.y,
        p.gearHeight + (this.manualOnly ? -0.15 : 0.2),
        12,
      );
      this.targetVelocity.copy(command);
    } else if (this.mode === "Manual") this.targetVelocity.set(0, 0, 0);
  }
  advance(elapsed: number) {
    if (this.paused) return;
    const limited = Math.min(Math.max(elapsed, 0), 0.1);
    this.droppedTime += Math.max(0, elapsed - limited);
    this.accumulator += limited;
    while (this.accumulator >= p.fixedDt) {
      this.weather.step(p.fixedDt);
      this.step(p.fixedDt);
      this.accumulator -= p.fixedDt;
    }
  }
  private controller(dt: number): number[] {
    if (!this.armed || this.mode === "Armed") return [0, 0, 0, 0];
    const error = this.target.clone().sub(this.position);
    // Integrator clamps + output saturation provide anti-windup at each cascade.
    this.positionIntegral.addScaledVector(error, dt).clampScalar(-3, 3);
    const acc = error
      .multiply(new Vector3(1.7, 3.5, 1.7))
      .add(
        this.targetVelocity
          .clone()
          .sub(this.velocity)
          .multiply(new Vector3(2.6, 3.1, 2.6)),
      )
      .add(this.positionIntegral.clone().multiply(new Vector3(0.3, 0.75, 0.3)));
    acc.x = clamp(acc.x, -4.5, 4.5);
    acc.z = clamp(acc.z, -4.5, 4.5);
    acc.y = clamp(acc.y, -4, 5);
    const up = new Vector3(acc.x, p.gravity + acc.y, acc.z).normalize();
    const back = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new Vector3().crossVectors(up, back).normalize();
    back.crossVectors(right, up);
    const desired = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(right, up, back),
    );
    const qError = this.orientation.clone().invert().multiply(desired);
    const sign = qError.w < 0 ? -1 : 1;
    const rate = new Vector3(qError.x, qError.y, qError.z)
      .multiplyScalar(sign * 9)
      .clampScalar(-3, 3);
    const re = rate.sub(this.angularVelocity);
    this.rateIntegral.addScaledVector(re, dt).clampScalar(-0.6, 0.6);
    const derivative = this.angularVelocity
      .clone()
      .sub(this.previousRate)
      .divideScalar(dt);
    this.previousRate.copy(this.angularVelocity);
    this.torque
      .copy(re)
      .multiplyScalar(13)
      .addScaledVector(this.rateIntegral, 3)
      .addScaledVector(derivative, -0.08)
      .multiply(new Vector3(...p.inertia))
      .clampScalar(-6, 6);
    const actualUp = new Vector3(0, 1, 0).applyQuaternion(this.orientation);
    const total = (p.mass * (p.gravity + acc.y)) / Math.max(0.45, actualUp.y);
    const max = p.kThrust * p.maxOmega ** 2;
    return motorPositions.map(([x, z], i) =>
      clamp(
        total / 4 -
          (z * this.torque.x) / (4 * p.arm * p.arm) +
          (x * this.torque.z) / (4 * p.arm * p.arm) -
          (motorSpin[i] * this.torque.y) / (4 * p.torqueRatio),
        0,
        max,
      ),
    );
  }
  step(dt = p.fixedDt, overrideThrust?: number[]) {
    this.beforeStep?.(dt);
    this.previousPosition.copy(this.position);
    this.previousOrientation.copy(this.orientation);
    this.time += dt;
    if (!overrideThrust) this.updateMission(dt);
    const commands = overrideThrust ?? this.controller(dt);
    const bodyTorque = new Vector3();
    let thrust = 0;
    for (let i = 0; i < 4; i++) {
      const desired = Math.sqrt(
        clamp(commands[i], 0, p.kThrust * p.maxOmega ** 2) / p.kThrust,
      );
      this.motors[i] +=
        (desired - this.motors[i]) * (1 - Math.exp(-dt / p.motorTimeConstant));
      const f = p.kThrust * this.motors[i] ** 2;
      this.thrusts[i] = f;
      thrust += f;
      bodyTorque.x -= motorPositions[i][1] * f;
      bodyTorque.z += motorPositions[i][0] * f;
      bodyTorque.y -= motorSpin[i] * p.torqueRatio * f;
    }
    this.weather.windAt(this.time, this.position, this.wind);
    const relative = this.velocity
      .clone()
      .sub(this.wind)
      .applyQuaternion(this.orientation.clone().invert());
    const drag = new Vector3(...p.dragArea)
      .multiply(
        relative
          .clone()
          .multiply(
            new Vector3(
              Math.abs(relative.x),
              Math.abs(relative.y),
              Math.abs(relative.z),
            ),
          ),
      )
      .multiplyScalar(-0.5 * p.airDensity)
      .applyQuaternion(this.orientation);
    this.force.set(0, thrust, 0).applyQuaternion(this.orientation).add(drag);
    this.force.y -= p.mass * p.gravity;
    this.velocity.addScaledVector(this.force, dt / p.mass);
    this.position.addScaledVector(this.velocity, dt);
    const momentum = this.angularVelocity
      .clone()
      .multiply(new Vector3(...p.inertia));
    bodyTorque
      .sub(new Vector3().crossVectors(this.angularVelocity, momentum))
      .addScaledVector(this.angularVelocity, -0.12);
    this.angularVelocity.addScaledVector(
      bodyTorque.divide(new Vector3(...p.inertia)),
      dt,
    );
    const dq = new Quaternion(
      this.angularVelocity.x * dt * 0.5,
      this.angularVelocity.y * dt * 0.5,
      this.angularVelocity.z * dt * 0.5,
      1,
    ).normalize();
    this.orientation.multiply(dq).normalize();
    this.collide(dt);
    if (
      this.mode === "Takeoff" &&
      Math.abs(this.position.y - this.target.y) < 0.12 &&
      Math.abs(this.velocity.y) < 0.15
    )
      this.mode = "Position hold";
    this.afterStep?.(dt);
  }
  private collide(dt: number) {
    if (Math.abs(this.position.x) > 30 || Math.abs(this.position.z) > 21) {
      if (this.missionActive) this.setPhase("FAILED");
      this.disarm();
    } // finite field safety shutdown
    const ground = insideCourt(this.position.x, this.position.z) ? 0 : -0.035;
    let lowest = Infinity;
    for (const x of [-0.4, 0.4])
      for (const z of [-0.28, 0.28])
        lowest = Math.min(
          lowest,
          new Vector3(x, -p.gearHeight, z).applyQuaternion(this.orientation).y +
            this.position.y,
        );
    if (lowest < ground) {
      this.lastContactSpeed = Math.max(0, -this.velocity.y);
      this.position.y += ground - lowest;
      const up = new Vector3(0, 1, 0).applyQuaternion(this.orientation);
      if (this.lastContactSpeed > 3 || up.y < 0.55) {
        if (this.missionActive) this.setPhase("FAILED");
        this.mode = "Crashed";
        this.clearController();
      }
      if (this.velocity.y < 0) this.velocity.y *= -0.03;
      const tangentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const friction = Math.max(
        0,
        1 -
          (((0.55 * Math.max(0, -this.force.y)) / p.mass) * dt) /
            (tangentSpeed || 1),
      );
      // Contact lasts this step: undo only the displacement removed by friction.
      this.position.x += this.velocity.x * (friction - 1) * dt;
      this.position.z += this.velocity.z * (friction - 1) * dt;
      this.velocity.x *= friction;
      this.velocity.z *= friction;
      this.angularVelocity.multiplyScalar(Math.exp(-15 * dt));
      if (this.mode === "Landing" && this.lastContactSpeed < 1.5) {
        if (this.missionPhase === "LANDING") this.setPhase("COMPLETED");
        this.disarm();
      }
    }
  }
  telemetry() {
    const e = new Euler().setFromQuaternion(this.orientation, "YXZ");
    return {
      mode: this.mode,
      armed: this.armed,
      altitude: this.altitude,
      position: this.position.toArray(),
      speed: this.velocity.length(),
      groundSpeed: Math.hypot(this.velocity.x, this.velocity.z),
      verticalSpeed: this.velocity.y,
      roll: (e.z * 180) / Math.PI,
      pitch: (e.x * 180) / Math.PI,
      yaw: (e.y * 180) / Math.PI,
      rates: this.angularVelocity.toArray(),
      rpm: this.motors.map((v) => (v * 60) / (2 * Math.PI)),
      thrust: [...this.thrusts],
      wind: this.wind.toArray(),
      progress: this.progress,
      time: this.time,
      droppedTime: this.droppedTime,
      paused: this.paused,
      missionPaused: this.missionPaused,
      selectedMission: this.selectedMission,
      missionPhase: this.missionPhase,
      missionActive: this.missionActive,
      activeWaypoint: this.activeWaypoint,
      visitedWaypoints: [...this.visitedWaypoints],
    };
  }
}
export type Telemetry = ReturnType<DroneDynamics["telemetry"]>;
