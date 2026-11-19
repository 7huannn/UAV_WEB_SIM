import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Quaternion, Vector3 } from "three";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { Weather } from "../weather/Weather";
import { aircraft as p, motorPositions, motorSpin } from "../simulation/parameters";
import { TrainingSession } from "../training/Session";
import { ControllerInput } from "../training/input";
import { PILOT_STATION } from "../training/pilot";

const dt = p.fixedDt, max = p.kThrust * p.maxOmega ** 2, hover = p.mass * p.gravity / 4;
const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
function weather(wind = 0, direction = 0, gust = 0, turbulence = 0, seed = 42) {
  const w = new Weather(seed);
  Object.assign(w.current, { wind, direction, gust, turbulence });
  w.target = { ...w.current };
  return w;
}
function airborne(w = weather()) {
  const d = new DroneDynamics(w);
  d.position.set(0, 10, 0);
  d.motors.fill(Math.sqrt(hover / p.kThrust));
  d.enableDiagnostics(true);
  return d;
}
function run(d: DroneDynamics, seconds: number) { for (let i = 0; i < Math.round(seconds / dt); i++) d.advance(dt); }
const geodesic = (a: Quaternion, b: Quaternion) => {
  const q = a.clone().invert().multiply(b);
  return 2 * Math.atan2(Math.hypot(q.x, q.y, q.z), Math.abs(q.w));
};

test("P2-A: accepted calm and seeded Phase 1 trajectories stay exact with diagnostics on/off", () => {
  const baseline = JSON.parse(readFileSync(new URL("../../docs/simulation/evidence/phase-2/baseline.json", import.meta.url), "utf8"));
  for (const fixture of baseline.fixtures) {
    for (const enabled of [false, true]) {
      const d = new DroneDynamics(weather(fixture.wind, 0, fixture.gust, fixture.turbulence, fixture.seed));
      d.enableDiagnostics(enabled); d.takeoff();
      for (let tick = 1; tick <= 7500; tick++) {
        d.advance(dt);
        if (tick % 1250) continue;
        const s = fixture.states[tick / 1250 - 1];
        for (const [actual, expected] of [
          [d.position.toArray(), s.position], [d.velocity.toArray(), s.velocity],
          [d.orientation.toArray(), s.orientation], [d.angularVelocity.toArray(), s.rates],
          [d.motors, s.motors], [d.positionIntegral.toArray().concat(d.rateIntegral.toArray()), s.integrals],
        ] as [number[], number[]][]) actual.forEach((v, i) => near(v, expected[i], 1e-8));
        assert.equal(d.mode, s.mode);
      }
    }
  }
});

test("P2-B: drag obeys air-relative force, rotation, work and weather independence", () => {
  for (const q of [new Quaternion(), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
    new Quaternion().setFromAxisAngle(new Vector3(1, 1, 1).normalize(), .7)]) {
    for (const u of [new Vector3(), new Vector3(5, -2, 3), new Vector3(-5, 2, -3)]) {
      const w = weather(); const d = airborne(w);
      d.orientation.copy(q); d.velocity.copy(u);
      d.step(dt, Array(4).fill(hover));
      const info = d.diagnostics!;
      const body = u.clone().applyQuaternion(q.clone().invert());
      const expected = new Vector3(...p.dragArea).multiply(new Vector3(body.x * Math.abs(body.x), body.y * Math.abs(body.y), body.z * Math.abs(body.z)))
        .multiplyScalar(-.5 * p.airDensity);
      expected.toArray().forEach((v, i) => near(info.dragBody[i], v));
      expected.applyQuaternion(q).toArray().forEach((v, i) => near(info.dragWorld[i], v));
      const work = new Vector3(...info.airVelocityBody).dot(new Vector3(...info.dragBody));
      assert.ok(work <= 1e-10);
      info.thrustWorld.forEach((v, i) => near(info.netForceWorld[i], v + info.dragWorld[i] + info.gravityWorld[i]));
      near(info.rotorMoment[0], 0); near(info.rotorMoment[1], 0); near(info.rotorMoment[2], 0);
    }
  }
  for (const direction of [0, 90, 180, 270]) {
    const w = weather(8, direction), d = airborne(w); d.velocity.set(0, 0, 0); d.step(dt, Array(4).fill(hover));
    const angle = direction * Math.PI / 180;
    near(d.force.x, 12.544 * Math.cos(angle)); near(d.force.z, 12.544 * Math.sin(angle));
  }
  const a = airborne(weather(8)), b = airborne(weather(8));
  b.velocity.x = 8; a.step(dt, Array(4).fill(hover)); b.step(dt, Array(4).fill(hover));
  near(a.diagnostics!.dragWorld[0], 12.544); near(b.diagnostics!.dragWorld[0], 0);
  const rainy = weather(8); rainy.current.rain = rainy.target.rain = 1;
  const r = airborne(rainy); r.step(dt, Array(4).fill(hover)); near(r.force.x, a.force.x);
  const c = airborne(weather()); c.velocity.x = 5; c.step(dt, Array(4).fill(hover));
  const e = airborne(weather()); e.velocity.x = 10; e.step(dt, Array(4).fill(hover));
  near(e.diagnostics!.dragWorld[0], 4 * c.diagnostics!.dragWorld[0]);
});

test("P2-C: motors obey exponential lag and the actual four-rotor wrench", () => {
  for (const k of [1, 3, 5]) {
    const d = airborne(); d.motors.fill(0);
    for (let i = 0; i < Math.round(k * p.motorTimeConstant / dt); i++) d.step(dt, Array(4).fill(hover));
    const t = Math.round(k * p.motorTimeConstant / dt) * dt;
    const expected = Math.sqrt(hover / p.kThrust) * (1 - Math.exp(-t / p.motorTimeConstant));
    d.motors.forEach((v, i) => { near(v, expected); near(d.thrusts[i], p.kThrust * v * v); });
  }
  for (let rotor = 0; rotor < 4; rotor++) {
    const d = airborne(), command = [0, 0, 0, 0]; command[rotor] = max;
    d.step(dt, command);
    const [x, z] = motorPositions[rotor], observed = d.diagnostics!;
    near(observed.actualWrench[0], d.thrusts.reduce((a, b) => a + b, 0));
    near(observed.actualWrench[1], d.thrusts.reduce((s, thrust, i) => s - motorPositions[i][1] * thrust, 0));
    near(observed.actualWrench[2], d.thrusts.reduce((s, thrust, i) => s - motorSpin[i] * p.torqueRatio * thrust, 0));
    near(observed.actualWrench[3], d.thrusts.reduce((s, thrust, i) => s + motorPositions[i][0] * thrust, 0));
    near(observed.commandWrench[1], -z * max); near(observed.commandWrench[2], -motorSpin[rotor] * p.torqueRatio * max);
    near(observed.commandWrench[3], x * max);
    for (let i = 0; i < 4; i++) assert.ok(d.motors[i] >= 0 && d.motors[i] <= p.maxOmega && d.thrusts[i] <= max + 1e-9);
  }
  const hoverD = airborne(); for (let i = 0; i < 1000; i++) hoverD.step(dt, Array(4).fill(hover));
  assert.ok(hoverD.velocity.length() < 1e-8 && hoverD.angularVelocity.length() < 1e-8);
  const before = hoverD.motors[0]; hoverD.step(dt, [0, 0, 0, 0]);
  assert.ok(hoverD.motors[0] < before && hoverD.motors[0] > 0);
});

test("P2-C: malformed motor overrides reject before weather, hooks, tick or aircraft mutation", () => {
  for (const invalid of [[], [1], [1, 2, 3, 4, 5], [1, NaN, 2, 3], [Infinity, 0, 0, 0], "bad", null]) {
    const w = weather(), d = airborne(w); let before = 0, after = 0;
    d.beforeStep = () => before++; d.afterStep = () => after++;
    const state = JSON.stringify({ env: d.simulation.snapshot(), p: d.position.toArray(), v: d.velocity.toArray(), q: d.orientation.toArray(), m: d.motors, diag: d.diagnostics });
    assert.throws(() => d.step(dt, invalid as number[]), /four finite/);
    assert.throws(() => d.simulation.step(invalid as number[]), /four finite/);
    assert.equal(JSON.stringify({ env: d.simulation.snapshot(), p: d.position.toArray(), v: d.velocity.toArray(), q: d.orientation.toArray(), m: d.motors, diag: d.diagnostics }), state);
    assert.deepEqual([before, after], [0, 0]);
  }
  const d = airborne(); d.step(dt, [-10, max * 100, 0, 0]);
  assert.deepEqual(d.diagnostics!.motorCommand, [0, max, 0, 0]);
});

test("P2-D: semi-implicit gravity, drag decay and first-order refinement", () => {
  const fall = new DroneDynamics(weather()); fall.position.set(0, 10, 0); fall.step(dt, [0, 0, 0, 0]);
  near(fall.velocity.y, -p.gravity * dt, 1e-10); near(fall.position.y, 10 - p.gravity * dt * dt, 1e-10);
  const cases = [];
  for (const h of [dt, dt / 2, dt / 4]) {
    const d = airborne(); d.velocity.x = 5;
    for (let i = 0; i < 2 / h; i++) (d as unknown as { integrate: (h: number, f: number[]) => void }).integrate(h, Array(4).fill(hover));
    const beta = p.airDensity * p.dragArea[0] * 5 / (2 * p.mass);
    const exactV = 5 / (1 + 2 * beta), exactX = 5 * Math.log(1 + 2 * beta) / beta;
    cases.push({ h, ev: Math.abs(d.velocity.x - exactV), ex: Math.abs(d.position.x - exactX) });
  }
  assert.ok(cases[0].ev < .005 && cases[0].ex < .01, JSON.stringify(cases));
  console.log("P2-D drag decay convergence (h s, velocity error m/s, displacement error m):", JSON.stringify(cases));
  for (const key of ["ev", "ex"] as const) {
    const ratio1 = cases[0][key] / cases[1][key], ratio2 = cases[1][key] / cases[2][key];
    assert.ok(ratio1 >= 1.5 && ratio1 <= 2.6 && ratio2 >= 1.5 && ratio2 <= 2.6, JSON.stringify(cases));
  }
});

test("P2-D: rigid-body damping, gyroscopic signs and quaternion norm", () => {
  const d = airborne(); d.angularVelocity.set(.5, .4, -.3);
  const omega = d.angularVelocity.clone(), momentum = omega.clone().multiply(new Vector3(...p.inertia));
  d.step(dt, Array(4).fill(hover));
  const info = d.diagnostics!;
  const gyro = new Vector3().crossVectors(omega, momentum).negate();
  gyro.toArray().forEach((v, i) => near(info.gyroscopicMoment[i], v));
  omega.toArray().forEach((v, i) => near(info.dampingMoment[i], -.12 * v));
  info.netRateMoment.forEach((v, i) => near(v, info.rotorMoment[i] + info.gyroscopicMoment[i] + info.dampingMoment[i]));
  d.angularVelocity.toArray().forEach((v, i) => near(v, omega.getComponent(i) + dt * info.netRateMoment[i] / p.inertia[i]));
  const results = [];
  for (const h of [dt, dt / 2, dt / 4]) {
    const body = airborne(); body.angularVelocity.y = .5;
    for (let i = 0; i < 2 / h; i++) (body as unknown as { integrate: (h: number, f: number[]) => void }).integrate(h, Array(4).fill(hover));
    const decay = Math.exp(-.12 * 2 / p.inertia[1]);
    const exactRate = .5 * decay, exactAngle = .5 * p.inertia[1] / .12 * (1 - decay);
    const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), exactAngle);
    results.push({ h, rate: Math.abs(body.angularVelocity.y - exactRate), attitude: geodesic(body.orientation, expected), norm: Math.abs(body.orientation.length() - 1) });
  }
  assert.ok(results[0].rate < .001 && results[0].attitude < .002, JSON.stringify(results));
  console.log("P2-D angular decay convergence (h s, rate error rad/s, attitude geodesic rad):", JSON.stringify(results));
  for (const key of ["rate", "attitude"] as const) {
    const r1 = results[0][key] / results[1][key], r2 = results[1][key] / results[2][key];
    assert.ok(r1 >= 1.5 && r1 <= 2.6 && r2 >= 1.5 && r2 <= 2.6, JSON.stringify(results));
  }
  results.forEach(r => assert.ok(r.norm <= 1e-10));
});

test("P2-C/G: demand, clipping and lagged achievement stay distinct during yaw saturation", () => {
  const d = new DroneDynamics(weather()); d.enableDiagnostics(true); d.takeoff(); run(d, 22);
  d.yaw += Math.PI; let clipped = 0, deficit = 0;
  for (let i = 0; i < 500; i++) {
    d.advance(dt); const info = d.diagnostics!;
    if (info.saturation.motor) { clipped++; deficit = Math.max(deficit, Math.abs(info.demandWrench[2] - info.commandWrench[2])); }
    assert.ok(d.positionIntegral.toArray().every(v => Math.abs(v) <= 3 + 1e-12));
    assert.ok(d.rateIntegral.toArray().every(v => Math.abs(v) <= .6 + 1e-12));
  }
  assert.ok(clipped > 0 && deficit > 0, `clipped ${clipped}, deficit ${deficit}`);
  d.hold(); d.yaw = d.telemetry().yaw * Math.PI / 180; run(d, 20);
  assert.ok(d.position.distanceTo(d.target) <= .3 && d.velocity.length() <= .2 && d.angularVelocity.length() <= .1);
});

test("P2-W2: unsaturated controller request closes through the mixer and contact is separate", () => {
  const d = new DroneDynamics(weather()); d.enableDiagnostics(true); d.takeoff(); run(d, 22);
  d.step();
  const info = d.diagnostics!;
  assert.equal(info.saturation.motor, false);
  info.demandWrench.forEach((v, i) => near(info.commandWrench[i], v, 1e-8));
  info.actualWrench.forEach((v, i) => near(i ? info.rotorMoment[i - 1] : d.thrusts.reduce((a, b) => a + b, 0), v));
  const contact = new DroneDynamics(weather()); contact.enableDiagnostics(true);
  contact.position.set(0, p.gearHeight - .1, 0);
  contact.step(dt, [0, 0, 0, 0]);
  assert.ok(contact.diagnostics!.contactCorrection[1] > 0);
  near(contact.diagnostics!.postContactPosition[1] - contact.diagnostics!.preContactPosition[1], contact.diagnostics!.contactCorrection[1]);
  assert.ok(contact.diagnostics!.preContactPosition[1] < p.gearHeight);
});

test("P2-H/J: optional diagnostics do not change saved attempt bytes or replay channels", () => {
  function record(enabled: boolean) {
    const w = weather(), d = new DroneDynamics(w), input = new ControllerInput();
    d.enableDiagnostics(enabled); d.arm();
    const session = new TrainingSession("P2 diagnostic comparison", "Training", "foundations", d, w, input, PILOT_STATION);
    session.start(d);
    d.beforeStep = step => d.manual(new Vector3(0, 1, 0), 0, step);
    d.afterStep = () => session.sample(d, w, input, "PILOT VLOS");
    run(d, 5); session.abort("comparison complete");
    const attempt = session.snapshot();
    attempt.id = "same-id";
    attempt.createdAt = "fixed-for-comparison";
    return JSON.stringify(attempt);
  }
  assert.equal(record(true), record(false));
});
