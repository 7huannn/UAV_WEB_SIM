import { Euler, Vector3 } from "three";
import type { DroneDynamics } from "../simulation/DroneDynamics";
import { config } from "../arena/geometry";
import { path } from "../simulation/missions";
import { aircraft } from "../simulation/parameters";
import type { Weather } from "../weather/Weather";
import {
  rules,
  profiles,
  preflight,
  postflight,
  taskPath,
  routeGates,
  type ProfileId,
} from "./profiles";
import type { ControllerInput, RC } from "./input";
import type { PilotStation } from "./pilot";
export type OperatingMode = "Training" | "Mock Examination";
export type ExamState =
  | "NOT_STARTED"
  | "PREFLIGHT"
  | "READY"
  | "ACTIVE"
  | "TASK_COMPLETE"
  | "LANDING"
  | "POSTFLIGHT"
  | "FINISHED"
  | "PAUSED"
  | "ABORTED"
  | "DISQUALIFIED"
  | "INCOMPLETE";
export type Event = { time: number; code: string; detail: string };
export type CameraPose = {
  position: number[];
  orientation: number[];
  verticalFov: number;
};
export type Frame = {
  time: number;
  cameraPose?: CameraPose;
  wetness: number;
  position: number[];
  altitude: number;
  orientation: number[];
  velocity: number[];
  rates: number[];
  motors: number[];
  thrust: number[];
  rc: RC;
  raw: number[];
  wind: number[];
  weather: Weather["current"];
  task: string;
  camera: string;
  operatingMode: OperatingMode;
  state: ExamState;
  flightMode: string;
  lateral: number;
  altitudeError: number;
  heading: number;
  headingError: number;
  progress: number;
  violations: string[];
  inputSource: string;
  device: string;
  focused: boolean;
};
export type Result = {
  decision: string;
  practiceScore: number;
  violations: Record<string, number>;
  completedTasks: string[];
  missedRouteGates: number;
  maxLateral: number;
  maxAltitudeError: number;
  maxSpeed: number;
  landingError: number | null;
  limitations: string[];
};
export type Attempt = {
  schema: 1;
  softwareVersion: string;
  geometry: typeof config;
  referencePaths: Record<string, [number, number][]>;
  id: string;
  createdAt: string;
  candidate: string;
  mode: OperatingMode;
  profile: (typeof profiles)[ProfileId];
  rules: typeof rules;
  aircraft: typeof aircraft;
  controller: {
    source: string;
    device: string;
    profile: ControllerInput["profile"];
    hardwareVerified: false;
  };
  pilotStation: PilotStation;
  weatherSeed: number;
  initialWeather: Weather["current"];
  fixedDt: number;
  recordEverySteps: number;
  flightMode: string;
  origin: "SIMULATION";
  status: ExamState;
  frames: Frame[];
  events: Event[];
  preflight: boolean[];
  postflight: boolean[];
  result: Result;
  droppedSimulationSeconds: number;
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const terminal = (s: ExamState) =>
  ["FINISHED", "ABORTED", "DISQUALIFIED", "INCOMPLETE"].includes(s);
const angle = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export class TrainingSession {
  state: ExamState = "NOT_STARTED";
  private resumeState: ExamState = "ACTIVE";
  readonly attempt: Attempt;
  taskIndex = 0;
  dwell = 0;
  orientationIndex = 0;
  gate = 0;
  pathProgress = 0;
  lateral = 0;
  altitudeError = 0;
  headingError = 0;
  speed = 0;
  activeViolations: string[] = [];
  private previous: Vector3;
  private startTime: number;
  private lastRecord = -Infinity;
  private lastSample: number;
  private violationSeconds: Record<string, number> = {};
  private lastViolation = new Set<string>();
  private interrupted = false;
  private lastDropped: number;
  private controllerInput: ControllerInput;
  constructor(
    candidate: string,
    mode: OperatingMode,
    profileId: ProfileId,
    d: DroneDynamics,
    w: Weather,
    input: ControllerInput,
    station: PilotStation,
    id = globalThis.crypto.randomUUID(),
  ) {
    this.controllerInput = input;
    this.previous = d.position.clone();
    this.startTime = d.time;
    this.lastSample = d.time;
    this.lastDropped = d.droppedTime;
    this.attempt = {
      schema: 1,
      softwareVersion: "uav-arena-0.2.0",
      geometry: clone(config),
      referencePaths: Object.fromEntries(
        profiles[profileId].tasks
          .filter((t) => t.kind === "route")
          .map((t) => [t.id, clone(taskPath(t.route).points)]),
      ),
      id,
      createdAt: new Date().toISOString(),
      candidate: candidate.trim().slice(0, 80) || "Anonymous",
      mode,
      profile: clone(profiles[profileId]),
      rules: clone(rules),
      aircraft: clone(aircraft),
      controller: {
        source: input.source,
        device: input.device,
        profile: clone(input.profile),
        hardwareVerified: false,
      },
      pilotStation: clone(station),
      weatherSeed: w.seed,
      initialWeather: clone(w.current),
      fixedDt: aircraft.fixedDt,
      recordEverySteps: 5,
      flightMode:
        "Position-stabilized body-frame velocity / climb / yaw-rate; release holds last target; no attitude mode",
      origin: "SIMULATION",
      status: "NOT_STARTED",
      frames: [],
      events: [],
      preflight: preflight.map(() => false),
      postflight: postflight.map(() => false),
      result: {
        decision: "INSUFFICIENT_DATA",
        practiceScore: 100,
        violations: {},
        completedTasks: [],
        missedRouteGates: 0,
        maxLateral: 0,
        maxAltitudeError: 0,
        maxSpeed: 0,
        landingError: null,
        limitations: [
          "Practice only; no official examination equivalence",
          "Rules and pilot station provisional; human review required",
          "Illustrative uncalibrated aircraft and ideal state telemetry",
          "RC hardware, display perceptual fidelity and field transfer unverified",
          "Replay is recorded-state playback, not resimulation or device-signed evidence",
        ],
      },
      droppedSimulationSeconds: 0,
    };
    this.transition("PREFLIGHT", d.time);
  }
  get active() {
    return !terminal(this.state);
  }
  get locked() {
    return this.active;
  }
  get strict() {
    return this.attempt.mode === "Mock Examination" && this.active;
  }
  get task() {
    return this.attempt.profile.tasks[this.taskIndex];
  }
  event(code: string, detail: string, time = this.lastSample) {
    this.attempt.events.push({
      time: Math.max(0, time - this.startTime),
      code,
      detail: detail.slice(0, 1000),
    });
  }
  private transition(next: ExamState, time = this.lastSample) {
    const legal: Partial<Record<ExamState, ExamState[]>> = {
      NOT_STARTED: ["PREFLIGHT"],
      PREFLIGHT: ["READY"],
      READY: ["ACTIVE"],
      ACTIVE: ["TASK_COMPLETE", "PAUSED", "DISQUALIFIED"],
      PAUSED: ["ACTIVE", "TASK_COMPLETE", "LANDING", "POSTFLIGHT"],
      TASK_COMPLETE: ["LANDING", "PAUSED"],
      LANDING: ["POSTFLIGHT", "PAUSED", "DISQUALIFIED"],
      POSTFLIGHT: ["FINISHED", "PAUSED"],
    };
    if (
      terminal(this.state) ||
      (!(legal[this.state] ?? []).includes(next) &&
        !["ABORTED", "INCOMPLETE"].includes(next))
    )
      return false;
    this.state = next;
    this.attempt.status = next;
    this.event("STATE", next, time);
    return true;
  }
  check(stage: "preflight" | "postflight", i: number, value: boolean) {
    if (
      (stage === "preflight" && this.state !== "PREFLIGHT") ||
      (stage === "postflight" && this.state !== "POSTFLIGHT")
    )
      return false;
    if (!Number.isInteger(i) || i < 0 || i >= this.attempt[stage].length)
      return false;
    this.attempt[stage][i] = value;
    this.event("CHECKLIST", `${stage} ${i + 1}: ${value}`);
    return true;
  }
  ready() {
    return this.attempt.preflight.every(Boolean) && this.transition("READY");
  }
  start(d: DroneDynamics) {
    if (
      this.state !== "READY" ||
      !d.armed ||
      d.altitude > this.attempt.rules.startAltitude ||
      Math.hypot(d.position.x + 20, d.position.z) >
        this.attempt.rules.homeRadius ||
      Object.values(this.controllerInput.value).some(
        (v) => Math.abs(v) > this.attempt.rules.neutralInputTolerance,
      ) ||
      (this.controllerInput.source === "Gamepad" &&
        (!this.controllerInput.connected || !!this.controllerInput.fault)) ||
      d.missionActive
    )
      return false;
    if (!this.transition("ACTIVE", d.time)) return false;
    d.engageManual();
    return true;
  }
  requestLanding() {
    return this.transition("LANDING");
  }
  finish() {
    if (this.state !== "POSTFLIGHT" || !this.attempt.postflight.every(Boolean))
      return false;
    const ok = this.transition("FINISHED");
    if (ok) this.finalize();
    return ok;
  }
  abort(reason = "Candidate aborted", incomplete = false) {
    if (!this.active) return false;
    this.event(incomplete ? "INTERRUPTION" : "ABORT", reason);
    const ok = this.transition(incomplete ? "INCOMPLETE" : "ABORTED");
    this.finalize();
    return ok;
  }
  pause(d: DroneDynamics) {
    if (
      !["ACTIVE", "TASK_COMPLETE", "LANDING", "POSTFLIGHT", "PAUSED"].includes(
        this.state,
      )
    )
      return false;
    if (this.state === "PAUSED") {
      this.transition(this.resumeState);
      d.paused = false;
    } else {
      this.resumeState = this.state;
      this.transition("PAUSED");
      d.paused = true;
      this.interrupted = true;
      this.event("PAUSE", "Practice interrupted; human review required");
    }
    return true;
  }
  acknowledgeAbnormal() {
    if (this.state !== "ACTIVE" || this.task?.kind !== "abnormal") return false;
    this.event(
      "ABNORMAL_ACK",
      "Candidate acknowledged lost-link briefing; no real receiver failure injected",
    );
    this.completeTask();
    return true;
  }
  private completeTask() {
    this.attempt.result.completedTasks.push(this.task.id);
    this.event("TASK_COMPLETE", this.task.label);
    this.taskIndex++;
    this.dwell = 0;
    this.gate = 0;
    this.pathProgress = 0;
    this.orientationIndex = 0;
    if (!this.task) this.transition("TASK_COMPLETE");
  }
  sample(
    d: DroneDynamics,
    w: Weather,
    input: ControllerInput,
    camera: string,
    focused = true,
    cameraPose?: CameraPose,
  ) {
    if (!this.active) return;
    const dt = d.time - this.lastSample;
    if (dt <= 0) return;
    this.lastSample = d.time;
    if (d.time - this.startTime > this.attempt.rules.maxSeconds) {
      this.abort("Training session recording time limit exceeded", true);
      d.hold();
      return;
    }
    const p = d.position,
      displacement = p.distanceTo(this.previous),
      speed = d.velocity.length();
    if (
      input.fault &&
      ["ACTIVE", "TASK_COMPLETE", "LANDING"].includes(this.state)
    ) {
      d.target.copy(p);
      d.targetVelocity.set(0, 0, 0);
      this.event("INPUT_LOSS", input.fault);
      this.abort(input.fault, true);
      return;
    }
    if (this.strict && camera !== "PILOT VLOS") {
      this.event("CAMERA_VIOLATION", camera);
      this.abort("Prohibited camera used", true);
      return;
    }
    if (d.missionActive || ["Mission", "Takeoff", "Landing"].includes(d.mode)) {
      this.abort("Automation entered manual attempt", true);
      return;
    }
    this.altitudeError = Math.abs(d.altitude - this.attempt.rules.altitude);
    this.speed = speed;
    const heading = new Euler().setFromQuaternion(d.orientation, "YXZ").y;
    const homeDistance = Math.hypot(p.x + 20, p.z),
      stable =
        speed < this.attempt.rules.hoverSpeed &&
        this.altitudeError < this.attempt.rules.altitudeTolerance &&
        homeDistance < this.attempt.rules.hoverRadius;
    const task = this.task;
    this.lateral = 0;
    this.headingError = 0;
    if (this.state === "ACTIVE" && task) {
      if (displacement > Math.max(0.15, dt * 15)) {
        this.abort(
          "Discontinuous aircraft state; insufficient trajectory evidence",
          true,
        );
        return;
      }
      if (task.kind === "takeoff" || task.kind === "hover") {
        this.dwell = stable ? this.dwell + dt : 0;
        if (this.dwell >= (task.seconds ?? 5)) this.completeTask();
      } else if (task.kind === "orientation") {
        this.headingError =
          (angle(
            heading,
            [0, Math.PI / 2, Math.PI, -Math.PI / 2][this.orientationIndex],
          ) *
            180) /
          Math.PI;
        this.dwell =
          stable &&
          this.headingError < this.attempt.rules.headingToleranceDegrees
            ? this.dwell + dt
            : 0;
        if (this.dwell >= (task.seconds ?? 2)) {
          this.orientationIndex++;
          this.dwell = 0;
          if (this.orientationIndex === 4) this.completeTask();
        }
      } else if (task.kind === "route") {
        const route = path(this.attempt.referencePaths[task.id]),
          gates = routeGates(route),
          next = gates[this.gate];
        this.lateral = Infinity;
        // Compare only the next ordered corridor segment; crossover cannot jump to a later lobe.
        for (
          let i = Math.max(1, this.gate - 2);
          i < Math.min(gates.length, this.gate + 3);
          i++
        ) {
          const a = gates[i - 1].point,
            b = gates[i].point,
            dx = b[0] - a[0],
            dz = b[1] - a[1],
            t = Math.max(
              0,
              Math.min(
                1,
                ((p.x - a[0]) * dx + (p.z - a[1]) * dz) /
                  (dx * dx + dz * dz || 1),
              ),
            );
          this.lateral = Math.min(
            this.lateral,
            Math.hypot(p.x - a[0] - t * dx, p.z - a[1] - t * dz),
          );
        }
        if (
          next &&
          this.altitudeError <= this.attempt.rules.altitudeTolerance &&
          Math.hypot(p.x - next.point[0], p.z - next.point[1]) <=
            this.attempt.rules.gateRadius
        ) {
          // One gate per fixed step. Returning to the start never substitutes for traversal.
          this.pathProgress = next.distance / route.length;
          this.gate++;
          if (this.gate === gates.length) this.completeTask();
        }
        const ahead = gates[Math.min(gates.length - 1, this.gate + 2)].point;
        const desired = Math.atan2(-(ahead[0] - p.x), -(ahead[1] - p.z));
        this.headingError = (angle(heading, desired) * 180) / Math.PI;
      }
    }
    const violation: string[] = [];
    if (["ACTIVE", "TASK_COMPLETE", "LANDING"].includes(this.state)) {
      // Rotated fuselage footprint, not propeller tips; simplified box assumption, not surveyed body contact.
      let outside = false;
      for (const x of [-0.24, 0.24])
        for (const z of [-0.32, 0.32]) {
          const corner = new Vector3(x, 0, z)
            .applyQuaternion(d.orientation)
            .add(p);
          if (Math.abs(corner.x) > 22.5 || Math.abs(corner.z) > 13.5)
            outside = true;
        }
      if (outside) violation.push("V1_BODY_BOUNDARY");
      if (d.altitude > this.attempt.rules.maxAltitude)
        violation.push("HEIGHT_ENVELOPE");
      if (speed > this.attempt.rules.maxSpeed) violation.push("SPEED");
      if (this.state === "ACTIVE" && task?.kind === "route") {
        if (this.lateral > this.attempt.rules.lateralTolerance)
          violation.push("ROUTE_DEVIATION");
        if (this.altitudeError > this.attempt.rules.altitudeTolerance)
          violation.push("ALTITUDE_DEVIATION");
      }
      if (d.mode === "Crashed") violation.push("CRASH");
      for (const code of violation) {
        this.violationSeconds[code] = (this.violationSeconds[code] ?? 0) + dt;
        if (!this.lastViolation.has(code))
          this.event(code, "Training rule exceeded");
      }
      for (const code of this.lastViolation)
        if (!violation.includes(code)) this.event("RECOVERED", code);
      this.lastViolation = new Set(violation);
      if (
        violation.some((v) =>
          ["V1_BODY_BOUNDARY", "HEIGHT_ENVELOPE", "CRASH"].includes(v),
        )
      ) {
        this.transition("DISQUALIFIED");
        this.event(
          "TRAINING_STOP",
          "Training safety envelope; not an official disqualification rule",
        );
        this.finalize();
        if (d.armed) {
          d.hold();
          this.event(
            "SAFE_HOLD",
            "Training safety stop captured the current stabilized target",
          );
        }
      }
      if (d.time - this.startTime > this.attempt.rules.maxSeconds)
        this.abort("Training time limit exceeded", true);
    }
    this.activeViolations = violation;
    const r = this.attempt.result;
    r.maxLateral = Math.max(
      r.maxLateral,
      Number.isFinite(this.lateral) ? this.lateral : 0,
    );
    r.maxSpeed = Math.max(r.maxSpeed, speed);
    if (task?.kind !== "takeoff" && this.state === "ACTIVE")
      r.maxAltitudeError = Math.max(r.maxAltitudeError, this.altitudeError);
    if (
      this.state === "LANDING" &&
      d.altitude < this.attempt.rules.touchdownAltitude &&
      speed < this.attempt.rules.touchdownSpeed &&
      !d.armed &&
      d.motors.every((m) => m < 1)
    ) {
      r.landingError = homeDistance;
      if (homeDistance > this.attempt.rules.homeRadius)
        this.event("LANDING_POSITION", "Landed outside training H tolerance");
      this.transition("POSTFLIGHT");
    }
    if (
      d.time - this.lastRecord >= aircraft.fixedDt * 5 - 1e-7 ||
      terminal(this.state)
    ) {
      r.violations = { ...this.violationSeconds };
      r.practiceScore = Math.max(
        0,
        100 -
          Object.values(this.violationSeconds).reduce((a, b) => a + b, 0) *
            this.attempt.rules.penaltyPerSecond,
      );
      this.attempt.frames.push({
        time: d.time - this.startTime,
        cameraPose: cameraPose ? clone(cameraPose) : undefined,
        wetness: w.wetness,
        position: p.toArray(),
        altitude: d.altitude,
        orientation: d.orientation.toArray(),
        velocity: d.velocity.toArray(),
        rates: d.angularVelocity.toArray(),
        motors: [...d.motors],
        thrust: [...d.thrusts],
        rc: { ...input.value },
        raw: [...input.raw],
        wind: d.wind.toArray(),
        weather: { ...w.current },
        task: task?.id ?? "landing/postflight",
        camera,
        operatingMode: this.attempt.mode,
        state: this.state,
        flightMode: d.mode,
        lateral: Number.isFinite(this.lateral) ? this.lateral : 0,
        altitudeError: this.altitudeError,
        heading,
        headingError: this.headingError,
        progress: this.pathProgress,
        violations: [...violation],
        inputSource: input.source,
        device: input.device,
        focused,
      });
      this.lastRecord = d.time;
    }
    this.attempt.droppedSimulationSeconds = d.droppedTime - this.lastDropped;
    this.previous.copy(p);
  }
  private finalize() {
    const r = this.attempt.result;
    r.violations = clone(this.violationSeconds);
    r.practiceScore = Math.max(
      0,
      100 -
        Object.values(this.violationSeconds).reduce((a, b) => a + b, 0) *
          this.attempt.rules.penaltyPerSecond,
    );
    r.missedRouteGates = this.attempt.profile.tasks
      .slice(this.taskIndex)
      .reduce(
        (sum, t, i) =>
          sum +
          (t.kind === "route"
            ? routeGates(path(this.attempt.referencePaths[t.id])).length -
              (i === 0 ? this.gate : 0)
            : 0),
        0,
      );
    r.decision =
      this.state === "FINISHED"
        ? "HUMAN_REVIEW_REQUIRED"
        : this.state === "DISQUALIFIED"
          ? "TRAINING_SAFETY_STOP"
          : "INCOMPLETE_ATTEMPT";
    if (
      this.interrupted &&
      !r.limitations.includes("Attempt paused/interrupted")
    )
      r.limitations.push("Attempt paused/interrupted");
    this.event("RESULT", r.decision);
  }
  snapshot(): Attempt {
    const a = clone(this.attempt);
    a.result.violations = clone(this.violationSeconds);
    a.result.practiceScore = Math.max(
      0,
      100 - Object.values(this.violationSeconds).reduce((x, y) => x + y, 0),
    );
    if (this.active) a.result.decision = "IN_PROGRESS / INSUFFICIENT_DATA";
    return a;
  }
}
