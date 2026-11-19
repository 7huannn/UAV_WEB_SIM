import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { config } from "../arena/geometry";
import { weatherAtLevels, windLevelOf, simpleWeather, windLevels } from "../training/weatherPresets";
import {
  PILOT_STATION,
  applyPilotCamera,
  pilotBearing,
  validStation,
  frontPilotStation,
  stationFromEdge,
  validFrontStation,
} from "../training/pilot";
import {
  ControllerInput,
  mode2,
  normalizeAxis,
  mapAxes,
  keyboardRC,
  validController,
  flightDemand,
} from "../training/input";
import { TrainingSession } from "../training/Session";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { Weather } from "../weather/Weather";
import { taskPath, routeGates, rules } from "../training/profiles";
import { samplePath } from "../simulation/missions";
import {
  seal,
  parseAttempt,
  replayAt,
  attemptCSV,
  readableReport,
  validateExternalManifest,
} from "../training/records";
const dt = 0.004;
function setup(
  profile: "figure-eight" | "outer-circuit" | "foundations" = "figure-eight",
  mode: "Training" | "Mock Examination" = "Training",
) {
  const w = new Weather();
  w.current = { ...w.current, wind: 0, gust: 0, turbulence: 0 };
  w.target = { ...w.current };
  const d = new DroneDynamics(w),
    input = new ControllerInput();
  d.manualOnly = true;
  const s = new TrainingSession("Test candidate", mode, profile, d, w, input, {
    ...PILOT_STATION,
  });
  const tick = () => {
    const state = d.simulation.snapshot();
    state.tick++; state.time = state.tick * dt;
    d.simulation.restore(state);
    s.sample(d, w, input, "PILOT VLOS");
  };
  return { w, d, input, s, tick };
}
function ready(o: ReturnType<typeof setup>) {
  o.d.arm();
  assert.ok(o.s.start(o.d));
}
function fixtureMove(
  o: ReturnType<typeof setup>,
  x: number,
  y: number,
  z: number,
  seconds: number,
) {
  // Evaluator unit fixture only: state interpolation, NOT evidence of physically flown manoeuvres.
  const start = o.d.position.clone(),
    end = new Vector3(x, y, z),
    count = Math.ceil(seconds / dt);
  o.d.velocity.copy(end).sub(start).divideScalar(seconds);
  for (let i = 1; i <= count; i++) {
    o.d.position.lerpVectors(start, end, i / count);
    o.tick();
  }
}
function fixtureHover(o: ReturnType<typeof setup>, seconds: number) {
  o.d.velocity.set(0, 0, 0);
  for (let i = 0; i < seconds / dt; i++) o.tick();
}
function reachRoute(o: ReturnType<typeof setup>) {
  ready(o);
  fixtureMove(o, -20, 5.32, 0, 4);
  fixtureHover(o, 7.1);
  assert.equal(o.s.task?.kind, "route");
}
test("pilot camera remains fixed under head look; bearing and perspective size follow geometry", () => {
  const c = new PerspectiveCamera(55, 1.6, 0.06, 1200);
  applyPilotCamera(c, PILOT_STATION);
  const eye = c.position.clone();
  applyPilotCamera(c, PILOT_STATION, -Math.PI / 2, 0);
  const projectHeight = (distance: number) => {
    c.updateMatrixWorld();
    const a = new Vector3(0, 1.115, PILOT_STATION.z - distance).project(c),
      b = new Vector3(0, 2.115, PILOT_STATION.z - distance).project(c);
    return Math.abs(a.y - b.y);
  };
  assert.ok(Math.abs(projectHeight(10) / projectHeight(20) - 2) < 1e-6);
  applyPilotCamera(c, PILOT_STATION, 0.7, 0.2);
  assert.deepEqual(c.position.toArray(), eye.toArray());
  assert.equal(c.zoom, 1);
  assert.equal(c.fov, PILOT_STATION.verticalFov);
  assert.equal(pilotBearing(PILOT_STATION, [0, 5, 0]), -Math.PI / 2);
  assert.ok(pilotBearing(PILOT_STATION, [-20, 5, 0]) < -Math.PI / 2);
  assert.notEqual(PILOT_STATION.x, -20);
  assert.ok(validStation(PILOT_STATION));
  assert.ok(!validStation({ ...PILOT_STATION, eyeHeight: NaN }));
});
test("controller mapping covers asymmetric range, center, deadzone, inversion and missing axes", () => {
  const p = mode2(),
    a = { ...p.axes.roll, min: -0.8, center: 0.1, max: 0.9 };
  assert.equal(normalizeAxis(0.1, a), 0);
  assert.equal(normalizeAxis(0.9, a), 1);
  assert.equal(normalizeAxis(-0.8, a), -1);
  assert.equal(normalizeAxis(0.9, { ...a, inverted: true }), -1);
  assert.equal(normalizeAxis(0.12, a), 0);
  assert.equal(normalizeAxis(NaN, a), 0);
  assert.equal(mapAxes([0.5, -1, 0.8, -0.7], p).throttle, 1);
  assert.ok(mapAxes([0.5, -1, 0.8, -0.7], p).pitch > 0);
  assert.equal(mapAxes([], p).roll, 0);
  assert.ok(validController(p));
  assert.ok(
    !validController({ ...p, axes: { ...p.axes, roll: { ...a, center: 1 } } }),
  );
  assert.deepEqual(keyboardRC(new Set(["KeyR", "KeyD", "KeyE", "KeyW"])), {
    throttle: 1,
    yaw: 1,
    pitch: 1,
    roll: 1,
  });
});
test("changing input sources clears stale connection state and pending movement", () => {
  const input = new ControllerInput();
  input.poll(new Set(["KeyR"]), true);
  assert.equal(input.connected, true);
  input.source = "Gamepad";
  assert.equal(input.connected, false);
  assert.equal(input.fault, "Controller disconnected");
  assert.deepEqual(input.value, { throttle: 0, yaw: 0, pitch: 0, roll: 0 });
  input.source = "Keyboard";
  assert.equal(input.connected, true);
  assert.equal(input.fault, "");
});
test("gamepad disconnect never substitutes keyboard; focus loss neutralizes all channels", () => {
  const input = new ControllerInput();
  input.source = "Gamepad";
  const pad = {
    connected: true,
    id: "Synthetic test fixture, not hardware",
    axes: [0, -1, 0, 0],
    buttons: [],
  } as unknown as Gamepad;
  assert.equal(input.poll(new Set(), true, [pad]).throttle, 1);
  assert.equal(input.poll(new Set(["KeyR"]), true, []).throttle, 0);
  assert.match(input.fault, /disconnected/);
  input.source = "Keyboard";
  assert.equal(input.poll(new Set(["KeyR"]), false).throttle, 0);
  assert.match(input.fault, /focus/);
});
test("manual-only dynamics prohibit automatic takeoff, landing and reference missions; input remains force driven", () => {
  const { d } = setup();
  assert.equal(d.takeoff(), false);
  assert.equal(d.land(), false);
  assert.equal(d.mission(), false);
  d.arm();
  d.engageManual();
  let maximumStep = 0;
  for (let i = 0; i < 250 * 4; i++) {
    const before = d.position.clone();
    d.manual(new Vector3(0, 1.25, 0), 0, dt);
    d.advance(dt);
    maximumStep = Math.max(maximumStep, d.position.distanceTo(before));
  }
  assert.ok(d.altitude > 4 && d.altitude < 6);
  assert.ok(maximumStep < 0.02);
  assert.ok(d.motors.every((m) => m > 0));
  const target = d.target.clone();
  for (let i = 0; i < 250 * 10; i++) {
    d.manual(new Vector3(), 0, dt);
    d.advance(dt);
  }
  assert.deepEqual(d.target.toArray(), target.toArray());
  assert.ok(d.velocity.length() < 0.2);
  for (let i = 0; i < 250 * 7; i++) {
    d.manual(new Vector3(0, -1, 0), 0, dt);
    d.advance(dt);
  }
  d.disarm();
  for (let i = 0; i < 250; i++) d.advance(dt);
  assert.ok(d.altitude < 0.03);
  assert.ok(d.motors.every((m) => m < 1));
});
test("manual fixed-step commands are independent of render cadence; reset preserves hooks and restrictions", () => {
  const a = setup().d,
    b = setup().d;
  for (const d of [a, b]) {
    d.arm();
    d.engageManual();
    d.beforeStep = (step) => d.manual(new Vector3(0.1, 1, 0), 0.1, step);
  }
  for (let i = 0; i < 200; i++) a.advance(0.02);
  for (let i = 0; i < 400; i++) b.advance(0.01);
  assert.ok(a.position.distanceTo(b.position) < 1e-8);
  const hook = a.beforeStep;
  a.reset();
  assert.equal(a.beforeStep, hook);
  assert.equal(a.manualOnly, true);
});
test("software readiness skips physical checks; arming and task completion still gate flight", () => {
  const o = setup();
  assert.equal(o.s.start(o.d), false);
  assert.equal(o.s.state, "READY");
  assert.deepEqual(o.s.attempt.preflight, []);
  assert.deepEqual(o.s.attempt.postflight, []);
  assert.equal(o.s.requestLanding(), false);
  assert.equal(o.s.finish(), false);
  ready(o);
  assert.equal(o.s.state, "ACTIVE");
  assert.equal(o.s.finish(), false);
  o.s.abort();
  assert.equal(o.s.state, "ABORTED");
  assert.ok(o.s.attempt.result.missedRouteGates > 100);
  assert.equal(o.s.attempt.result.decision, "INCOMPLETE_ATTEMPT");
  assert.equal(o.s.start(o.d), false);
});
for (const id of ["figure-eight", "outer-circuit"] as const)
  test(`${id}: full ordered route required; endpoint, wrong direction and missed lobe shortcuts fail`, () => {
    const o = setup(id);
    reachRoute(o);
    fixtureMove(o, -13, 5.32, 0, 4);
    fixtureMove(o, -20, 5.32, 0, 4);
    assert.equal(o.s.state, "ACTIVE");
    assert.ok(o.s.pathProgress < 0.2);
    const a = setup(id);
    reachRoute(a);
    const p = taskPath(id);
    for (let distance = 0; distance <= p.length + 0.01; distance += 0.008) {
      const [x, z] = samplePath(p, distance);
      a.d.position.set(x, 5.32, z);
      a.d.velocity.set(0, 0, 0);
      a.tick();
    }
    // Final gate may already be consumed within training positional tolerance.
    fixtureHover(a, 0.1);
    assert.equal(a.s.state, "TASK_COMPLETE");
    assert.ok(a.s.attempt.result.completedTasks.includes("route"));
    assert.ok(a.s.requestLanding());
    fixtureMove(a, -20, 0.32, 0, 5);
    a.d.disarm();
    a.d.motors.fill(0);
    fixtureHover(a, 0.2);
    assert.equal(a.s.state, "POSTFLIGHT");
    assert.ok(a.s.finish());
    assert.equal(a.s.attempt.result.decision, "HUMAN_REVIEW_REQUIRED");
    assert.equal(a.s.attempt.result.missedRouteGates, 0);
    const reverse = setup(id);
    reachRoute(reverse);
    for (
      let distance = p.length;
      distance > Math.max(0, p.length - 20);
      distance -= 0.008
    ) {
      const [x, z] = samplePath(p, distance);
      reverse.d.position.set(x, 5.32, z);
      reverse.tick();
    }
    assert.equal(reverse.s.state, "ACTIVE");
    assert.ok(reverse.s.pathProgress < 0.1);
  });
test("bounds use body extent, strict camera/automation and controller faults interrupt attempts", () => {
  const o = setup("figure-eight", "Mock Examination");
  ready(o);
  o.s.sample(o.d, o.w, o.input, "Overview"); // no elapsed step -> no sample
  o.d.simulation.restore({ ...o.d.simulation.snapshot(), tick: o.d.simulation.tick + 1, time: o.d.time + dt });
  o.s.sample(o.d, o.w, o.input, "Overview");
  assert.equal(o.s.state, "INCOMPLETE");
  const b = setup();
  ready(b);
  fixtureMove(b, 22.4, 5.32, 0, 40);
  assert.equal(b.s.state, "DISQUALIFIED");
  assert.equal(b.s.attempt.result.decision, "TRAINING_SAFETY_STOP");
  const c = setup();
  ready(c);
  c.input.fault = "Controller disconnected";
  c.tick();
  assert.equal(c.s.state, "INCOMPLETE");
  assert.ok(c.s.attempt.events.some((e) => e.code === "INPUT_LOSS"));
});
test("pause records an interruption and legal resume; abort is terminal", () => {
  const o = setup();
  ready(o);
  assert.ok(o.s.pause(o.d));
  assert.equal(o.s.state, "PAUSED");
  assert.equal(o.d.paused, true);
  assert.ok(o.s.pause(o.d));
  assert.equal(o.s.state, "ACTIVE");
  assert.equal(o.d.paused, false);
  o.s.abort();
  assert.equal(o.s.pause(o.d), false);
  assert.equal(o.s.finish(), false);
});
test("recording uses monotonic sim time, complete channels, immutable exports, replay interpolation and checksum rejection", async () => {
  const o = setup();
  reachRoute(o);
  o.s.abort();
  const a = o.s.snapshot(),
    original = JSON.stringify(a),
    sealed = await seal(a);
  assert.ok(a.frames.length > 100);
  for (let i = 1; i < a.frames.length; i++)
    assert.ok(Math.abs(a.frames[i].time - a.frames[i - 1].time - 0.02) < 1e-8);
  const imported = await parseAttempt(JSON.stringify(sealed));
  assert.equal(imported.sha256, sealed.sha256);
  const f = replayAt(a.frames, (a.frames[3].time + a.frames[4].time) / 2)!;
  assert.ok(f.time > a.frames[3].time && f.time < a.frames[4].time);
  assert.match(attemptCSV(a), /motor1_rads/);
  assert.match(readableReport(a), /not a licence/);
  assert.equal(JSON.stringify(a), original);
  sealed.payload.frames[0].position[0] += 1;
  await assert.rejects(() => parseAttempt(JSON.stringify(sealed)), /Integrity/);
  const bad = await seal({ ...a, frames: [a.frames[0], a.frames[0]] });
  await assert.rejects(() => parseAttempt(JSON.stringify(bad)), /monotonic/);
  assert.equal(
    validateExternalManifest({
      origin: "EXTERNAL_READ_ONLY",
      aircraftId: "x",
      sourceHash: "hash",
      units: "m,s,rad",
      frame: "ENU",
      worldFromSource: [],
      surveyReference: "",
      timeOffsetSeconds: 0,
      timeUncertaintySeconds: 1,
      configurationEvidence: "",
      hardwareSignatureVerified: false,
    }),
    false,
  );
  assert.equal(rules.status, "TRAINING_ONLY");
});

for (const id of ["figure-eight", "outer-circuit"] as const)
  test(`${id}: synthetic manual velocity inputs physically fly every gate, land and finalize without a physical checklist`, () => {
    const o = setup(id, "Mock Examination");
    ready(o);
    const route = taskPath(id),
      gates = routeGates(route);
    let maxStep = 0;
    o.d.beforeStep = (step) => {
      let x = -20,
        z = 0,
        y = 5.32;
      if (o.s.task?.kind === "route")
        [x, z] = gates[Math.min(o.s.gate, gates.length - 1)].point;
      if (o.s.state === "LANDING") y = 0.17;
      // Test pilot supplies velocity/climb demands only. Never assigns aircraft XYZ/attitude or invokes reference missions.
      const command = new Vector3(x, y, z).sub(o.d.target).multiplyScalar(1.6);
      command.x = Math.max(-1.7, Math.min(1.7, command.x));
      command.z = Math.max(-1.7, Math.min(1.7, command.z));
      command.y = Math.max(-1.25, Math.min(1.25, command.y));
      o.d.manual(command, 0, step);
    };
    o.d.afterStep = () => o.s.sample(o.d, o.w, o.input, "PILOT VLOS");
    for (
      let i = 0;
      i < 250 * 400 && o.s.state !== "POSTFLIGHT" && o.s.active;
      i++
    ) {
      if (o.s.state === "TASK_COMPLETE") o.s.requestLanding();
      if (
        o.s.state === "LANDING" &&
        o.d.altitude < 0.025 &&
        Math.abs(o.d.velocity.y) < 0.1
      )
        o.d.disarm();
      const before = o.d.position.clone();
      o.d.advance(dt);
      maxStep = Math.max(maxStep, before.distanceTo(o.d.position));
    }
    assert.equal(
      o.s.state,
      "POSTFLIGHT",
      JSON.stringify({
        state: o.s.state,
        task: o.s.task,
        gate: o.s.gate,
        position: o.d.position.toArray(),
        result: o.s.attempt.result,
      }),
    );
    assert.ok(maxStep < 0.02);
    assert.equal(o.d.missionPhase, "IDLE");
    assert.equal(o.d.mode, "Disarmed");
    assert.ok(o.s.attempt.frames.some((f) => f.task === "route"));
    assert.ok(o.s.finish());
    assert.equal(o.s.attempt.result.decision, "HUMAN_REVIEW_REQUIRED");
  });

test("body-frame stick mapping preserves nose/tail reversal and right yaw convention", () => {
  const forward = { throttle: 0, yaw: 0, pitch: 1, roll: 0 };
  assert.deepEqual(flightDemand(forward, 0).worldVelocity, [0, 0, -2]);
  const turned = flightDemand(forward, Math.PI / 2);
  assert.ok(Math.abs(turned.worldVelocity[0] + 2) < 1e-8);
  assert.ok(Math.abs(turned.worldVelocity[2]) < 1e-8);
  const noseIn = flightDemand(forward, Math.PI);
  assert.ok(noseIn.worldVelocity[2] > 1.99);
  assert.equal(flightDemand({ ...forward, yaw: 1 }, 0).yawRate, -0.7);
});
test("orientation exercise requires every requested heading and stable dwell", () => {
  const o = setup("foundations");
  ready(o);
  fixtureMove(o, -20, 5.32, 0, 4);
  fixtureHover(o, 7.1);
  assert.equal(o.s.task?.kind, "orientation");
  fixtureHover(o, 3);
  assert.equal(o.s.orientationIndex, 1);
  fixtureHover(o, 4);
  assert.equal(o.s.orientationIndex, 1);
  for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
    o.d.orientation.setFromAxisAngle(new Vector3(0, 1, 0), angle);
    fixtureHover(o, 2.1);
  }
  assert.equal(o.s.task?.kind, "route");
  assert.ok(o.s.attempt.result.completedTasks.includes("orientation"));
});

test("neutral input gates manual start and recording duration is bounded while ready", () => {
  const o = setup();
  o.d.arm();
  o.input.value.throttle = 1;
  assert.equal(o.s.start(o.d), false);
  o.input.value.throttle = 0;
  assert.equal(o.s.start(o.d), true);
  const idle = setup();
  idle.d.simulation.restore({ ...idle.d.simulation.snapshot(), tick: 150250, time: 601 });
  idle.s.sample(idle.d, idle.w, idle.input, "PILOT VLOS");
  assert.equal(idle.s.state, "INCOMPLETE");
  assert.match(idle.s.attempt.events.at(-1)?.detail ?? "", /INCOMPLETE/);
  assert.equal(replayAt([], 0), null);
});

test("malformed replay weather and geometry are rejected before rendering", async () => {
  const o = setup();
  ready(o);
  fixtureHover(o, 0.1);
  o.s.abort();
  const a = o.s.snapshot();
  const badWeather = structuredClone(a);
  badWeather.frames[0].weather = {} as typeof a.initialWeather;
  const sealedWeather = await seal(badWeather);
  await assert.rejects(() => parseAttempt(JSON.stringify(sealedWeather)));
  const badGeometry = structuredClone(a);
  delete (badGeometry.geometry as unknown as Record<string, unknown>).reference;
  const sealedGeometry = await seal(badGeometry);
  await assert.rejects(() => parseAttempt(JSON.stringify(sealedGeometry)));
});

test("front pilot station follows court midpoint and outward edge normal, including rotated edges", () => {
  const s = frontPilotStation();
  assert.equal(s.x, 0);
  assert.equal(s.z, config.concrete.width / 2 + 3.5);
  assert.ok(validFrontStation(s));
  assert.ok(s.z > config.concrete.width / 2 + config.paint.v1Width / 2);
  const t = stationFromEdge([10, -20], [10, 20], [0, 0], 3, -0.035);
  assert.equal(t.x, 13);
  assert.equal(t.z, 0);
  assert.ok(Math.abs(t.initialYaw! - Math.atan2(8, -13)) < 1e-8);
  const reversed = stationFromEdge([10, 20], [10, -20], [0, 0], 3, -0.035);
  assert.deepEqual(reversed, t);
  assert.ok(!validFrontStation({ ...s, x: 1 }));
  assert.ok(!validFrontStation({ ...s, setback: NaN }));
  // Old archived station remains readable; it is never selected as the new default.
  assert.ok(
    validStation({
      ...s,
      x: -25,
      z: 0,
      edge: undefined,
      setback: undefined,
      initialYaw: undefined,
      initialPitch: undefined,
    }),
  );
});

test("simple wind presets reuse existing physical values independently of cloud and rain", () => {
  for (const level of Object.keys(windLevels) as (keyof typeof windLevels)[]) {
    const a = simpleWeather(level, "clear"),
      b = simpleWeather(level, "rain");
    for (const key of ["wind", "gust", "turbulence", "direction"] as const)
      assert.equal(a[key], b[key]);
    assert.equal(a.rain, 0);
    assert.equal(b.rain, 0.3);
  }
  assert.deepEqual(
    [
      simpleWeather("calm", "clear").wind,
      simpleWeather("calm", "clear").gust,
      simpleWeather("calm", "clear").turbulence,
    ],
    [0, 0, 0],
  );
  assert.equal(simpleWeather("light", "clear").wind, 1.8);
  assert.equal(simpleWeather("medium", "cloudy").wind, 3.8);
  assert.equal(simpleWeather("strong", "clear").wind, 9);
});

test("legacy archived station stays importable and Vietnamese reporting never edits evidence", async () => {
  const o = setup();
  const archived = o.s.snapshot();
  archived.softwareVersion = "uav-arena-0.2.0";
  archived.pilotStation = {
    x: -25,
    z: 0,
    groundY: -0.035,
    eyeHeight: 1.65,
    verticalFov: 60,
    source: "Historical west station",
    confidence: "Unverified",
    verification: "PROVISIONAL",
  };
  const sealed = await seal(archived),
    parsed = await parseAttempt(JSON.stringify(sealed));
  const { learnerReport } = await import("../ui/vi");
  assert.match(learnerReport(parsed.payload), /BÁO CÁO LUYỆN BAY/);
  assert.match(learnerReport(parsed.payload), /không tự kết luận đạt/);
  assert.equal((await seal(parsed.payload)).sha256, sealed.sha256);
  assert.equal(parsed.payload.pilotStation.x, -25);
});


test("0–10 weather levels are monotonic, independent, bounded and use the existing engine", () => {
  const base = simpleWeather("calm", "clear");
  for (let n = 0; n <= 10; n++) {
    const p = weatherAtLevels(base, n, n);
    assert.equal(windLevelOf(p), n);
    assert.equal(p.wind, n * .9);
    assert.equal(p.rain, n / 10);
    const weather = new Weather(); weather.current = {...base}; weather.target = p;
    for (let i = 0; i < 3000; i++) weather.step(.004);
    assert.ok(Math.abs(weather.current.wind - p.wind) < .025);
    if (n) { const prev = weatherAtLevels(base, n - 1, n - 1); assert.ok(p.wind > prev.wind && p.gust > prev.gust && p.rain > prev.rain && p.visibility < prev.visibility); }
    assert.deepEqual(weatherAtLevels(p, undefined, 0).wind, p.wind);
    assert.equal(weatherAtLevels(p, 0).rain, p.rain);
  }
  for (const n of [-1, 11, NaN, .5]) assert.throws(() => weatherAtLevels(base, n, 0));
});

test("ground guide projects vertically to court/turf, fades on landing and is Training only", async () => {
  const { projectedGround, groundGuideAllowed, makeGroundGuide } = await import("../scene/groundGuide");
  const guide = makeGroundGuide();
  const p = new Vector3(4, 5.32, -2);
  guide.update(p, true);
  assert.equal(guide.group.visible, true);
  const line = guide.group.children[0] as import("three").Line;
  const ring = guide.group.children[1] as import("three").Mesh;
  assert.deepEqual(ring.position.toArray(), [4, .025, -2]);
  const data = Array.from(line.geometry.attributes.position.array);
  assert.equal(data[0], data[3]); assert.equal(data[2], data[5]);
  assert.equal(projectedGround(23, 0), -.035);
  guide.update(new Vector3(23, 5, 0), true);
  assert.ok(Math.abs(ring.position.y - (-.01)) < 1e-8);
  guide.update(new Vector3(0, .32, 0), true); assert.equal(guide.group.visible, false);
  for (const page of ["Training", "Mock Examination", "Instructor", "Session Review", "Reference missions"]) {
    for (const mock of [false, true]) for (const replay of [false, true])
      assert.equal(groundGuideAllowed(page, mock, replay), page === "Training" && !mock && !replay);
  }
  guide.update(p, false); assert.equal(guide.group.visible, false);
});
