import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Vector3 } from "three";
import { DroneDynamics } from "../src/simulation/DroneDynamics";
import { aircraft as p } from "../src/simulation/parameters";
import { Weather } from "../src/weather/Weather";
import { flightDemand } from "../src/training/input";

const dt = p.fixedDt;
const source = ["src/simulation/DroneDynamics.ts", "src/simulation/Simulation.ts", "src/simulation/parameters.ts", "src/weather/Weather.ts"];
const sha = Object.fromEntries(source.map(file => [file, createHash("sha256").update(readFileSync(file)).digest("hex")]));
const wrap = (radians: number) => Math.atan2(Math.sin(radians), Math.cos(radians));
function configured(wind = 0, direction = 0, gust = 0, turbulence = 0, seed = 42) {
  const w = new Weather(seed);
  Object.assign(w.current, { wind, direction, gust, turbulence });
  w.target = { ...w.current };
  return w;
}
function settled(w = configured()) {
  const d = new DroneDynamics(w);
  d.takeoff();
  for (let i = 0; i < 22 / dt; i++) d.advance(dt);
  d.enableDiagnostics(true);
  return d;
}
type Sample = { t: number; horizontal: number; altitude: number; position: number; speed: number; rate: number; yaw: number; yawSigned: number; motorClip: boolean; motorMax: number; normError: number; wind: number; mode: string; target: number[]; actual: number[]; demandYaw: number; achievedYaw: number };
type MetricSample = Pick<Sample, "horizontal" | "altitude" | "position" | "speed" | "rate" | "yaw" | "motorClip" | "motorMax" | "normError" | "wind">;
let peakCollectorSerializedBytes = 0;
function trace(d: DroneDynamics, seconds: number, input?: (tick: number) => void) {
  const samples: Sample[] = [], finalRing: MetricSample[] = [];
  let lastSample: Sample | null = null;
  let clipTicks = 0, longestClip = 0, streak = 0, maxIntegral = 0, maxRateIntegral = 0;
  let nonfinite = 0, safetyEvents = 0, firstSafetyTime: number | null = null, lastNominalViolation = -1;
  let maxPositiveX = 0, maxPositiveAltitude = 0, maxPositiveYaw = 0;
  const blank = () => ({ count: 0, maxHorizontal: 0, maxAltitude: 0, maxPosition: 0, maxSpeed: 0,
    maxRate: 0, maxYawDeg: 0, maxMotor: 0, maxNormError: 0, maxWind: 0, rmsPosition: 0 });
  const all = blank();
  const add = (a: ReturnType<typeof blank>, s: MetricSample) => {
    a.count++; a.maxHorizontal = Math.max(a.maxHorizontal, s.horizontal); a.maxAltitude = Math.max(a.maxAltitude, s.altitude);
    a.maxPosition = Math.max(a.maxPosition, s.position); a.maxSpeed = Math.max(a.maxSpeed, s.speed);
    a.maxRate = Math.max(a.maxRate, s.rate); a.maxYawDeg = Math.max(a.maxYawDeg, s.yaw * 180 / Math.PI);
    a.maxMotor = Math.max(a.maxMotor, s.motorMax); a.maxNormError = Math.max(a.maxNormError, s.normError);
    a.maxWind = Math.max(a.maxWind, s.wind); a.rmsPosition += s.position * s.position;
  };
  const total = Math.round(seconds / dt);
  for (let i = 0; i < total; i++) {
    input?.(i);
    d.advance(dt);
    const info = d.diagnostics!;
    const clipped = info.saturation.motor;
    if (clipped) { clipTicks++; streak++; longestClip = Math.max(longestClip, streak); } else streak = 0;
    maxIntegral = Math.max(maxIntegral, ...d.positionIntegral.toArray().map(Math.abs));
    maxRateIntegral = Math.max(maxRateIntegral, ...d.rateIntegral.toArray().map(Math.abs));
    if (![...d.position.toArray(), ...d.velocity.toArray(), ...d.orientation.toArray(), ...d.angularVelocity.toArray(), ...d.motors, ...d.thrusts].every(Number.isFinite)) nonfinite++;
    if (d.mode === "Crashed" || d.mode === "Disarmed") { safetyEvents++; firstSafetyTime ??= (i + 1) * dt; }
    const dx = d.position.x - d.target.x, dz = d.position.z - d.target.z;
    const yawSigned = wrap(d.telemetry().yaw * Math.PI / 180 - d.yaw);
    const sample: Sample = { t: (i + 1) * dt, horizontal: Math.hypot(dx, dz), altitude: Math.abs(d.position.y - d.target.y),
      position: d.position.distanceTo(d.target), speed: d.velocity.length(), rate: d.angularVelocity.length(), yaw: Math.abs(yawSigned), yawSigned,
      motorClip: clipped, motorMax: Math.max(...d.motors), normError: Math.abs(d.orientation.length() - 1), wind: d.wind.length(), mode: d.mode,
      target: d.target.toArray(), actual: d.position.toArray(), demandYaw: info.demandWrench[2], achievedYaw: info.actualWrench[2] };
    add(all, sample);
    finalRing[i % 1250] = { horizontal: sample.horizontal, altitude: sample.altitude, position: sample.position,
      speed: sample.speed, rate: sample.rate, yaw: sample.yaw, motorClip: sample.motorClip,
      motorMax: sample.motorMax, normError: sample.normError, wind: sample.wind };
    lastSample = sample;
    if (i % (seconds > 60 ? 2500 : 500) === 0 || i === total - 1) samples.push(sample);
    if (sample.position > .15 || sample.speed > .15 || sample.yaw > .5 * Math.PI / 180) lastNominalViolation = i;
    maxPositiveX = Math.max(maxPositiveX, sample.actual[0] - sample.target[0]);
    maxPositiveAltitude = Math.max(maxPositiveAltitude, sample.actual[1] - sample.target[1]);
    maxPositiveYaw = Math.max(maxPositiveYaw, sample.yawSigned);
  }
  const tail = (duration: number) => {
    const a = blank();
    for (let i = Math.max(0, total - Math.round(duration / dt)); i < total; i++) add(a, finalRing[i % 1250]);
    a.rmsPosition = Math.sqrt(a.rmsPosition / a.count);
    return a;
  };
  all.rmsPosition = Math.sqrt(all.rmsPosition / all.count);
  const last = lastSample!;
  let final2ClipTicks = 0;
  for (let i = total - 500; i < total; i++) if (finalRing[i % 1250].motorClip) final2ClipTicks++;
  peakCollectorSerializedBytes = Math.max(peakCollectorSerializedBytes,
    Buffer.byteLength(JSON.stringify(results)) + Buffer.byteLength(JSON.stringify(finalRing)) + Buffer.byteLength(JSON.stringify(samples)));
  return { all, final2: tail(2), final5: tail(5), final2ClipTicks,
    nominalSettlingTime: lastNominalViolation + 1 < total ? (lastNominalViolation + 2) * dt : null,
    maxPositiveX, maxPositiveAltitude, maxPositiveYaw,
    clipTicks, clipFraction: clipTicks / total, longestClipSeconds: longestClip * dt,
    maxPositionIntegral: maxIntegral, maxRateIntegral, nonfinite, safetyEvents, firstSafetyTime,
    final: last, samples };
}
function compact(result: ReturnType<typeof trace>) {
  const { samples, ...rest } = result;
  return { ...rest, oneHertz: samples };
}
const results: Record<string, unknown> = {};
const gates: Record<string, boolean> = {};
function gate(id: string, condition: boolean) { gates[id] = condition; }

const calm = settled();
const f0 = trace(calm, 30); results.F0 = compact(f0);
gate("P2-E-F0", f0.final2.maxPosition <= .15 && f0.final2.maxSpeed <= .15 && f0.safetyEvents === 0);

for (const direction of [0, 90, 180, 270]) {
  const d = settled(configured(8, direction));
  const result = trace(d, 30); results[`F1-${direction}`] = compact(result);
  gate(`P2-F-F1-${direction}`, result.final5.maxHorizontal <= 1.2 && result.final5.maxAltitude <= .3 && result.final5.maxSpeed <= .3 && result.safetyEvents === 0);
}
for (const seed of [42, 17]) {
  const d = settled(configured(9, 80, 4, .7, seed));
  const result = trace(d, 60); results[`F2-hold-${seed}`] = compact(result);
  gate(`P2-F-F2-${seed}`, result.all.maxHorizontal <= 2 && result.all.maxAltitude <= .75 && result.safetyEvents === 0);
  const manual = settled(configured(9, 80, 4, .7, seed)); manual.engageManual();
  let manualTicks = 0;
  manual.beforeStep = step => {
    const demand = flightDemand({ throttle: 0, roll: 0, pitch: manualTicks++ < 750 ? .5 : 0, yaw: 0 }, manual.telemetry().yaw * Math.PI / 180);
    manual.manual(new Vector3(...demand.worldVelocity), demand.yawRate, step);
  };
  const m = trace(manual, 30); results[`F2-manual-${seed}`] = compact(m);
  gate(`P2-F-manual-${seed}`, m.nonfinite === 0 && m.safetyEvents === 0);
}

for (const label of ["wind", "wrap", "halfturn"] as const) {
  const initial = label === "wrap" ? 359 : label === "halfturn" ? 90 : 0;
  const target = label === "wrap" ? 1 : label === "halfturn" ? 270 : 0;
  const d = settled(configured(label === "wind" ? 0 : 8, initial));
  d.simulation.weather.target.wind = 8; d.simulation.weather.target.direction = target;
  const first = trace(d, 20);
  if (label === "wind") d.simulation.weather.target.wind = 0;
  const second = trace(d, 20);
  results[`F3-${label}`] = { first: compact(first), second: compact(second) };
  gate(`P2-F-F3-${label}`, first.final5.maxHorizontal <= 1.2 && first.final5.maxAltitude <= .3 && first.final5.maxSpeed <= .3 &&
    (label !== "wind" || second.final5.maxHorizontal <= .2 && second.final5.maxSpeed <= .2));
}

for (const kind of ["x", "altitude", "yaw"] as const) {
  const d = settled();
  if (kind === "x") d.target.x += 5;
  else if (kind === "altitude") d.target.y += 2;
  else d.yaw += .5;
  const result = trace(d, 15); results[`F4-${kind}`] = compact(result);
  const end = result.final2;
  const overshoot = kind === "x" ? result.maxPositiveX / 5 :
    kind === "altitude" ? result.maxPositiveAltitude / 2 : result.maxPositiveYaw;
  gate(`P2-E-F4-${kind}`, kind === "yaw" ? end.maxYawDeg <= .5 && end.maxRate <= .03 && overshoot <= 10 * Math.PI / 180 :
    end.maxPosition <= .15 && end.maxSpeed <= .15 && overshoot <= .2);
}
for (const heading of [0, Math.PI / 2]) {
  const d = settled(); d.yaw = heading;
  for (let i = 0; i < 15 / dt; i++) d.advance(dt); // settle the commanded heading before input
  d.engageManual(); let manualTicks = 0;
  d.beforeStep = step => {
    const demand = flightDemand({ throttle: 0, roll: 0, pitch: manualTicks++ < 750 ? .5 : 0, yaw: 0 }, d.telemetry().yaw * Math.PI / 180);
    d.manual(new Vector3(...demand.worldVelocity), demand.yawRate, step);
  };
  const result = trace(d, 18); results[`F4-manual-${heading}`] = compact(result);
  gate(`P2-E-manual-${heading}`, result.final2.maxPosition <= .2 && result.final2.maxSpeed <= .2 && result.safetyEvents === 0);
}

const yaw = settled(); yaw.yaw += Math.PI;
const pulse = trace(yaw, 2); yaw.hold(); yaw.yaw = yaw.telemetry().yaw * Math.PI / 180;
const recovery = trace(yaw, 20);
results.F5 = { pulse: compact(pulse), recovery: compact(recovery) };
gate("P2-G", pulse.clipTicks > 0 && pulse.nonfinite === 0 && pulse.safetyEvents === 0 && recovery.nonfinite === 0 && recovery.safetyEvents === 0 &&
  recovery.final2.maxPosition <= .3 && recovery.final2.maxSpeed <= .2 && recovery.final2.maxYawDeg <= 2 && recovery.final2.maxRate <= .1 &&
  recovery.final2.maxNormError <= 1e-10 && recovery.final2.maxMotor <= p.maxOmega + 1e-10 &&
  recovery.maxPositionIntegral <= 3 + 1e-12 && recovery.maxRateIntegral <= .6 + 1e-12 &&
  recovery.final2ClipTicks === 0);

const stress = settled();
Object.assign(stress.simulation.weather.target, { wind: 30, direction: 80, gust: 20, turbulence: 5 });
const stressResult = trace(stress, 30); results.F5_stress = compact(stressResult);
gate("P2-G-stress", stressResult.nonfinite === 0 && stressResult.all.maxMotor <= p.maxOmega + 1e-10 && stressResult.all.maxNormError <= 1e-10);

for (const label of ["calm", "gust"] as const) {
  const d = settled(label === "calm" ? configured() : configured(9, 80, 4, .7));
  const result = trace(d, 600); results[`F6-${label}`] = compact(result);
  gate(`P2-H-${label}`, result.nonfinite === 0 && result.safetyEvents === 0 && result.all.maxNormError <= 1e-10 &&
    result.all.maxMotor <= p.maxOmega + 1e-10 && result.maxPositionIntegral <= 3 + 1e-12 && result.maxRateIntegral <= .6 + 1e-12 &&
    (label === "calm" ? result.final2.maxPosition <= .15 : result.all.maxHorizontal <= 2 && result.all.maxAltitude <= .75));
}

peakCollectorSerializedBytes = Math.max(peakCollectorSerializedBytes, Buffer.byteLength(JSON.stringify(results)));
const output = { contract: "P2-v1", sourceSHA256: sha, build: "source-run-tsx", timeStep: dt, initialSettleSeconds: 22,
  modelScope: "Illustrative ideal-state simulator; no real-aircraft calibration", gates, results,
  collector: { maxRetainedSamplesInRing: 1250, maximumTraceOutputHz: .5,
    peakRetainedSerializedBytes: peakCollectorSerializedBytes, limitBytes: 1048576,
    note: "Encoded size of retained scenario summaries, sampled rows and ring. JS object heap overhead is not separately measured." } };
const path = process.argv[2] ?? "docs/simulation/evidence/phase-2/scenarios.json";
writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ path, gates, failures: Object.keys(gates).filter(key => !gates[key]) }, null, 2));
