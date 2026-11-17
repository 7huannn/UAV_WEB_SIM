import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { sampleRoute, routeLength, insideCourt } from "../arena/geometry";
import { Weather } from "../weather/Weather";
import { aircraft as p, motorPositions, motorSpin } from "./parameters";
export type FlightMode =
  | "Disarmed"
  | "Armed"
  | "Takeoff"
  | "Position hold"
  | "Manual"
  | "Figure eight"
  | "Landing"
  | "Crashed";
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export class DroneDynamics {
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
  missionEntered = false;
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
    return (this.missionDistance % routeLength) / routeLength;
  }
  reset() {
    const weather = this.weather;
    Object.assign(this, new DroneDynamics(weather));
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
    this.mode = "Disarmed";
    this.clearController();
  }
  takeoff() {
    if (this.mode === "Crashed") return;
    if (!this.armed) this.arm();
    this.target.copy(this.position);
    this.target.y = 5 + p.gearHeight;
    this.targetVelocity.set(0, 0, 0);
    this.mode = "Takeoff";
    this.clearController();
  }
  hold() {
    if (!this.armed) return;
    this.mode = "Position hold";
    this.target.copy(this.position);
    this.targetVelocity.set(0, 0, 0);
    this.missionPaused = false;
  }
  land() {
    if (!this.armed) return;
    this.mode = "Landing";
    this.target.copy(this.position);
    this.target.y = p.gearHeight - 0.15;
    this.targetVelocity.set(0, -0.55, 0);
    this.clearController();
  }
  mission() {
    if (this.mode === "Crashed") return;
    if (!this.armed) this.arm();
    this.mode = "Figure eight";
    this.missionDistance = 0;
    this.missionEntered = false;
    this.missionPaused = false;
    this.target.set(0.5, 5 + p.gearHeight, 0);
    this.clearController();
  }
  toggleMissionPause() {
    if (this.mode !== "Figure eight") return;
    this.missionPaused = !this.missionPaused;
    if (this.missionPaused) {
      this.target.copy(this.position);
      this.targetVelocity.set(0, 0, 0);
    }
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
      this.target.x = clamp(this.target.x, -21, 21);
      this.target.z = clamp(this.target.z, -12, 12);
      this.target.y = clamp(this.target.y, p.gearHeight + 0.2, 12);
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
    if (this.mode === "Figure eight" && !this.missionPaused) {
      if (!this.missionEntered) {
        this.target.set(0.5, 5 + p.gearHeight, 0);
        if (this.position.distanceTo(this.target) < 0.5)
          this.missionEntered = true;
      } else {
        if (this.position.distanceTo(this.target) < 2)
          this.missionDistance += 2.1 * dt;
        const [x, z] = sampleRoute(this.missionDistance);
        this.target.set(x, 5 + p.gearHeight, z);
        const next = sampleRoute(this.missionDistance + 0.1);
        this.targetVelocity.set((next[0] - x) * 21, 0, (next[1] - z) * 21);
      }
    }
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
    this.previousPosition.copy(this.position);
    this.previousOrientation.copy(this.orientation);
    this.time += dt;
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
  }
  private collide(dt: number) {
    if (Math.abs(this.position.x) > 30 || Math.abs(this.position.z) > 21) {
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
    };
  }
}
export type Telemetry = ReturnType<DroneDynamics["telemetry"]>;
