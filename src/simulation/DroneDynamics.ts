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
import { Simulation } from "./Simulation";
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
type V3 = [number, number, number];
type Wrench = [number, number, number, number]; // total thrust N, body moments N·m
/** Optional last completed tick only. Values are observations of the production plant. */
export type PhysicsDiagnostics = {
  time: number; position: V3; wind: V3; airVelocityBody: V3;
  dragBody: V3; dragWorld: V3; thrustWorld: V3; gravityWorld: V3; netForceWorld: V3;
  demandWrench: Wrench; commandWrench: Wrench; actualWrench: Wrench;
  rotorMoment: V3; gyroscopicMoment: V3; dampingMoment: V3; netRateMoment: V3;
  accelerationRaw: V3; accelerationCommand: V3; rateRaw: V3; rateCommand: V3;
  torqueRaw: V3; torqueCommand: V3;
  motorRaw: Wrench; motorCommand: Wrench; motorActual: Wrench;
  positionIntegral: V3; rateIntegral: V3;
  saturation: { acceleration: boolean; rate: boolean; torque: boolean; motor: boolean };
  controllerActive: boolean;
  preContactPosition: V3; postContactPosition: V3;
  preContactVelocity: V3; postContactVelocity: V3;
  contactCorrection: V3;
};
const v3 = (): V3 => [0, 0, 0];
const wrench = (): Wrench => [0, 0, 0, 0];
function emptyDiagnostics(): PhysicsDiagnostics {
  return {
    time: 0, position: v3(), wind: v3(), airVelocityBody: v3(),
    dragBody: v3(), dragWorld: v3(), thrustWorld: v3(), gravityWorld: [0, -p.mass * p.gravity, 0], netForceWorld: v3(),
    demandWrench: wrench(), commandWrench: wrench(), actualWrench: wrench(),
    rotorMoment: v3(), gyroscopicMoment: v3(), dampingMoment: v3(), netRateMoment: v3(),
    accelerationRaw: v3(), accelerationCommand: v3(), rateRaw: v3(), rateCommand: v3(),
    torqueRaw: v3(), torqueCommand: v3(), motorRaw: wrench(), motorCommand: wrench(), motorActual: wrench(),
    positionIntegral: v3(), rateIntegral: v3(),
    saturation: { acceleration: false, rate: false, torque: false, motor: false }, controllerActive: false,
    preContactPosition: v3(), postContactPosition: v3(), preContactVelocity: v3(), postContactVelocity: v3(), contactCorrection: v3(),
  };
}
function motorWrench(forces: readonly number[], out: Wrench) {
  out[0] = out[1] = out[2] = out[3] = 0;
  for (let i = 0; i < 4; i++) {
    const f = forces[i];
    out[0] += f; out[1] -= motorPositions[i][1] * f; out[2] -= motorSpin[i] * p.torqueRatio * f; out[3] += motorPositions[i][0] * f;
  }
}
const differs = (a: readonly number[], b: readonly number[]) =>
  a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3];
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
  readonly simulation: Simulation;
  get time() { return this.simulation.time; }
  get paused() { return this.simulation.paused; }
  set paused(value: boolean) { this.simulation.paused = value; }
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
  diagnostics: PhysicsDiagnostics | null = null;
  enableDiagnostics(enabled: boolean) { this.diagnostics = enabled ? this.diagnostics ?? emptyDiagnostics() : null; }
  lastContactSpeed = 0;
  get accumulator() { return this.simulation.accumulator; }
  set accumulator(value: number) { this.simulation.accumulator = value; }
  get droppedTime() { return this.simulation.droppedTime; }
  private weather: Weather;
  constructor(weather: Weather) {
    this.weather = weather;
    this.simulation = new Simulation(weather,
      (dt, thrust) => this.integrate(dt, thrust),
      () => this.afterStep?.(p.fixedDt));
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
      afterStep = this.afterStep,
      diagnostics = this.diagnostics;
    // Keep coordinator callbacks bound to this aircraft, not the temporary fresh instance.
    const { simulation: _unused, ...fresh } = new DroneDynamics(weather);
    Object.assign(this, fresh);
    this.diagnostics = diagnostics;
    if (diagnostics) Object.assign(diagnostics, emptyDiagnostics());
    this.simulation.reset();
    this.selectedMission = selected;
    this.manualOnly = manualOnly;
    this.resetGuard = resetGuard;
    this.beforeStep = beforeStep;
    this.afterStep = afterStep;
    this.weather.windAt(this.time, this.position, this.wind);
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
    this.simulation.advance(elapsed);
  }
  private controller(dt: number): number[] {
    if (!this.armed || this.mode === "Armed") return [0, 0, 0, 0];
    const diagnostics = this.diagnostics;
    if (diagnostics) diagnostics.controllerActive = true;
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
    if (diagnostics) acc.toArray(diagnostics.accelerationRaw);
    acc.x = clamp(acc.x, -4.5, 4.5);
    acc.z = clamp(acc.z, -4.5, 4.5);
    acc.y = clamp(acc.y, -4, 5);
    if (diagnostics) {
      acc.toArray(diagnostics.accelerationCommand);
      diagnostics.saturation.acceleration = differs(diagnostics.accelerationRaw, diagnostics.accelerationCommand);
    }
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
      .multiplyScalar(sign * 9);
    if (diagnostics) rate.toArray(diagnostics.rateRaw);
    rate.clampScalar(-3, 3);
    if (diagnostics) {
      rate.toArray(diagnostics.rateCommand);
      diagnostics.saturation.rate = differs(diagnostics.rateRaw, diagnostics.rateCommand);
    }
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
      .multiply(new Vector3(...p.inertia));
    if (diagnostics) this.torque.toArray(diagnostics.torqueRaw);
    this.torque.clampScalar(-6, 6);
    if (diagnostics) {
      this.torque.toArray(diagnostics.torqueCommand);
      diagnostics.saturation.torque = differs(diagnostics.torqueRaw, diagnostics.torqueCommand);
    }
    const actualUp = new Vector3(0, 1, 0).applyQuaternion(this.orientation);
    const total = (p.mass * (p.gravity + acc.y)) / Math.max(0.45, actualUp.y);
    const max = p.kThrust * p.maxOmega ** 2;
    if (diagnostics) {
      diagnostics.demandWrench[0] = total;
      this.torque.toArray(diagnostics.demandWrench, 1);
    }
    const commands = motorPositions.map(([x, z], i) => {
      const raw = total / 4 -
          (z * this.torque.x) / (4 * p.arm * p.arm) +
          (x * this.torque.z) / (4 * p.arm * p.arm) -
          (motorSpin[i] * this.torque.y) / (4 * p.torqueRatio);
      if (diagnostics) diagnostics.motorRaw[i] = raw;
      return clamp(raw, 0, max);
    });
    if (diagnostics) {
      for (let i = 0; i < 4; i++) diagnostics.motorCommand[i] = commands[i];
      diagnostics.saturation.motor = differs(commands, diagnostics.motorRaw);
    }
    return commands;
  }
  step(dt = p.fixedDt, overrideThrust?: number[]) {
    if (dt !== p.fixedDt) throw Error("Single-step requires the fixed simulation timestep");
    this.simulation.step(overrideThrust);
  }
  private integrate(dt: number, overrideThrust?: number[]) {
    this.beforeStep?.(dt);
    this.previousPosition.copy(this.position);
    this.previousOrientation.copy(this.orientation);
    const diagnostics = this.diagnostics;
    if (diagnostics) {
      diagnostics.time = this.time;
      this.position.toArray(diagnostics.position);
      diagnostics.controllerActive = false;
      diagnostics.demandWrench[0] = diagnostics.demandWrench[1] = diagnostics.demandWrench[2] = diagnostics.demandWrench[3] = 0;
      diagnostics.motorRaw[0] = diagnostics.motorRaw[1] = diagnostics.motorRaw[2] = diagnostics.motorRaw[3] = 0;
      diagnostics.motorCommand[0] = diagnostics.motorCommand[1] = diagnostics.motorCommand[2] = diagnostics.motorCommand[3] = 0;
      diagnostics.saturation.acceleration = diagnostics.saturation.rate =
        diagnostics.saturation.torque = diagnostics.saturation.motor = false;
    }
    if (!overrideThrust) this.updateMission(dt);
    const commands = overrideThrust ?? this.controller(dt);
    if (diagnostics) {
      if (!diagnostics.controllerActive) {
        diagnostics.accelerationRaw.fill(0); diagnostics.accelerationCommand.fill(0);
        diagnostics.rateRaw.fill(0); diagnostics.rateCommand.fill(0);
        diagnostics.torqueRaw.fill(0); diagnostics.torqueCommand.fill(0);
      }
      this.positionIntegral.toArray(diagnostics.positionIntegral);
      this.rateIntegral.toArray(diagnostics.rateIntegral);
      if (overrideThrust) {
        for (let i = 0; i < 4; i++) {
          const f = overrideThrust[i];
          diagnostics.motorRaw[i] = f;
          diagnostics.motorCommand[i] = clamp(f, 0, p.kThrust * p.maxOmega ** 2);
        }
        diagnostics.saturation.motor = differs(diagnostics.motorRaw, diagnostics.motorCommand);
      }
      motorWrench(diagnostics.motorCommand, diagnostics.commandWrench);
    }
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
    if (diagnostics) {
      for (let i = 0; i < 4; i++) diagnostics.motorActual[i] = this.motors[i];
      motorWrench(this.thrusts, diagnostics.actualWrench);
      bodyTorque.toArray(diagnostics.rotorMoment);
    }
    this.weather.windAt(this.time, this.position, this.wind);
    const relative = this.velocity
      .clone()
      .sub(this.wind)
      .applyQuaternion(this.orientation.clone().invert());
    if (diagnostics) {
      this.wind.toArray(diagnostics.wind);
      relative.toArray(diagnostics.airVelocityBody);
    }
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
      .multiplyScalar(-0.5 * p.airDensity);
    if (diagnostics) drag.toArray(diagnostics.dragBody);
    drag.applyQuaternion(this.orientation);
    if (diagnostics) drag.toArray(diagnostics.dragWorld);
    this.force.set(0, thrust, 0).applyQuaternion(this.orientation);
    if (diagnostics) this.force.toArray(diagnostics.thrustWorld);
    this.force.add(drag);
    this.force.y -= p.mass * p.gravity;
    if (diagnostics) this.force.toArray(diagnostics.netForceWorld);
    this.velocity.addScaledVector(this.force, dt / p.mass);
    this.position.addScaledVector(this.velocity, dt);
    const momentum = this.angularVelocity
      .clone()
      .multiply(new Vector3(...p.inertia));
    if (diagnostics) {
      const omega = this.angularVelocity, gyro = diagnostics.gyroscopicMoment, damping = diagnostics.dampingMoment;
      gyro[0] = omega.z * momentum.y - omega.y * momentum.z;
      gyro[1] = omega.x * momentum.z - omega.z * momentum.x;
      gyro[2] = omega.y * momentum.x - omega.x * momentum.y;
      damping[0] = -0.12 * omega.x; damping[1] = -0.12 * omega.y; damping[2] = -0.12 * omega.z;
    }
    bodyTorque
      .sub(new Vector3().crossVectors(this.angularVelocity, momentum))
      .addScaledVector(this.angularVelocity, -0.12);
    if (diagnostics) bodyTorque.toArray(diagnostics.netRateMoment);
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
    if (diagnostics) {
      this.position.toArray(diagnostics.preContactPosition);
      this.velocity.toArray(diagnostics.preContactVelocity);
    }
    this.collide(dt);
    if (diagnostics) {
      this.position.toArray(diagnostics.postContactPosition);
      this.velocity.toArray(diagnostics.postContactVelocity);
      for (let i = 0; i < 3; i++) diagnostics.contactCorrection[i] = diagnostics.postContactPosition[i] - diagnostics.preContactPosition[i];
    }
    if (
      this.mode === "Takeoff" &&
      Math.abs(this.position.y - this.target.y) < 0.12 &&
      Math.abs(this.velocity.y) < 0.15
    )
      this.mode = "Position hold";
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
