import test from "node:test";
import assert from "node:assert/strict";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { aircraft as p } from "../simulation/parameters";
import { Weather } from "../weather/Weather";
import {
  config,
  fromPixel,
  insideCourt,
  route,
  routeLength,
  rectangle,
} from "../arena/geometry";
import { ribbon } from "../scene/paint";
const calm = () => {
  const w = new Weather();
  w.current = { ...w.current, wind: 0, gust: 0, turbulence: 0 };
  w.target = { ...w.current };
  return w;
};
const run = (d: DroneDynamics, seconds: number) => {
  for (let i = 0; i < seconds / p.fixedDt; i++) d.advance(p.fixedDt);
};
test("dimension calibration, finite grass and reference course stay inside V1", () => {
  assert.equal(config.concrete.length, 45);
  assert.equal(config.concrete.width, 27);
  assert.equal((config.grass.length - config.concrete.length) / 2, 7.5);
  assert.deepEqual(fromPixel(129, 136), [-22.5, -13.5]);
  assert.ok(route.every(([x, z]) => insideCourt(x, z, 0.1)));
  const expected =
    4 * Math.sqrt(8 ** 2 - 5.5 ** 2) +
    2 * 5.5 * (2 * Math.PI - 2 * Math.acos(5.5 / 8));
  assert.ok(Math.abs(routeLength - expected) < 0.01);
});
test("zero thrust is gravitational free fall, followed by finite ground collision", () => {
  const d = new DroneDynamics(calm());
  d.position.set(0, 10, 0);
  run(d, 0.5);
  assert.ok(Math.abs(d.velocity.y + p.gravity * 0.5) < 0.1);
  assert.ok(d.position.y < 9);
  run(d, 4);
  assert.ok(d.position.y >= p.gearHeight - 1e-6);
  assert.equal(d.mode, "Crashed");
});
test("symmetric hover thrust creates no roll, pitch or yaw torque", () => {
  const d = new DroneDynamics(calm());
  d.position.set(0, 5, 0);
  d.motors.fill(Math.sqrt((p.mass * p.gravity) / 4 / p.kThrust));
  for (let i = 0; i < 1000; i++)
    d.step(p.fixedDt, Array(4).fill((p.mass * p.gravity) / 4));
  assert.ok(d.velocity.length() < 1e-8);
  assert.ok(d.angularVelocity.length() < 1e-8);
});
test("cascaded controller takes off, holds, moves through real motor forces, and lands", () => {
  const d = new DroneDynamics(calm());
  d.takeoff();
  run(d, 22);
  assert.ok(Math.abs(d.altitude - 5) < 0.12, JSON.stringify(d.telemetry()));
  assert.ok(d.velocity.length() < 0.15);
  assert.ok(d.motors.every((v) => v > 0 && v <= p.maxOmega));
  d.target.x = -15;
  run(d, 15);
  assert.ok(Math.abs(d.position.x + 15) < 0.15, JSON.stringify(d.telemetry()));
  assert.ok(d.orientation.length() > 0.9999);
  d.land();
  run(d, 20);
  assert.equal(d.mode, "Disarmed");
  assert.ok(d.altitude < 0.02);
});
test("wind produces physical drift and controller compensation; seeded replay matches", () => {
  const a = new DroneDynamics(calm());
  a.takeoff();
  run(a, 15);
  const w = new Weather(17);
  w.current = { ...w.current, wind: 8, gust: 2, turbulence: 0.4 };
  w.target = { ...w.current };
  const d = new DroneDynamics(w);
  d.takeoff();
  run(d, 30);
  assert.ok(Math.abs(d.position.x + 20) < 1.2, JSON.stringify(d.telemetry()));
  assert.ok(Math.abs(d.position.z) < 1.2);
  assert.ok(Math.abs(d.telemetry().roll) + Math.abs(d.telemetry().pitch) > 1);
  assert.ok(d.wind.length() > 4);
  const replayWeather = new Weather(17);
  replayWeather.current = { ...w.target };
  replayWeather.target = { ...w.target };
  const replay = new DroneDynamics(replayWeather);
  replay.takeoff();
  run(replay, 30);
  assert.deepEqual(replay.position.toArray(), d.position.toArray());
});
test("fixed clock is independent of render cadence, pause discards hidden time", () => {
  const a = new DroneDynamics(calm()),
    b = new DroneDynamics(calm());
  a.takeoff();
  b.takeoff();
  for (let i = 0; i < 500; i++) a.advance(0.02);
  for (let i = 0; i < 1000; i++) b.advance(0.01);
  assert.ok(a.position.distanceTo(b.position) < 0.02);
  a.paused = true;
  const time = a.time;
  a.advance(5);
  assert.equal(a.time, time);
  a.paused = false;
  a.advance(5);
  assert.ok(a.time - time < 0.101);
  assert.ok(a.droppedTime > 4);
});
test("autonomous figure eight completes a lap within the court; pause holds", () => {
  const d = new DroneDynamics(calm());
  d.mission();
  run(d, 80);
  assert.ok(d.missionDistance > routeLength, JSON.stringify(d.telemetry()));
  assert.ok(insideCourt(d.position.x, d.position.z, 1));
  d.toggleMissionPause();
  const distance = d.missionDistance;
  run(d, 3);
  assert.equal(d.missionDistance, distance);
  assert.ok(d.velocity.length() < 0.3);
});

test("motor saturation, differential reaction torque, and disarm lag stay finite", () => {
  const d = new DroneDynamics(calm());
  d.position.set(0, 8, 0);
  const maximum = p.kThrust * p.maxOmega ** 2;
  for (let i = 0; i < 80; i++)
    d.step(p.fixedDt, [maximum * 100, -10, maximum * 100, -10]);
  assert.ok(
    d.motors.every((v) => Number.isFinite(v) && v >= 0 && v <= p.maxOmega),
  );
  assert.ok(d.angularVelocity.y < -0.1);
  d.disarm();
  const speed = d.motors[0];
  d.step();
  assert.ok(d.motors[0] < speed && d.motors[0] > 0);
  for (let i = 0; i < 400; i++) d.step();
  assert.ok(d.motors.every((v) => v < 1e-8));
});
test("static ground friction holds a disarmed aircraft in ordinary wind", () => {
  const w = new Weather();
  w.current = { ...w.current, wind: 8, gust: 0, turbulence: 0 };
  w.target = { ...w.current };
  const d = new DroneDynamics(w);
  const start = d.position.clone();
  run(d, 10);
  assert.ok(d.position.distanceTo(start) < 0.02);
  assert.equal(d.mode, "Disarmed");
});

test("yaw mixer follows the requested heading with opposing rotor reaction torque", () => {
  const d = new DroneDynamics(calm());
  d.takeoff();
  run(d, 12);
  d.yaw = 0.5;
  run(d, 8);
  assert.ok(
    Math.abs(d.telemetry().yaw - (180 / Math.PI) * 0.5) < 0.5,
    JSON.stringify(d.telemetry()),
  );
  assert.ok(Math.abs(d.angularVelocity.y) < 0.03);
});

test("paint widths and mitered V1 outer extent preserve official dimensions", () => {
  const border = ribbon(
    rectangle({ minX: -22.475, maxX: 22.475, minZ: -13.475, maxZ: 13.475 }),
    0.05,
    "white",
  );
  border.geometry.computeBoundingBox();
  const box = border.geometry.boundingBox!;
  assert.ok(Math.abs(box.max.x - box.min.x - 45) < 1e-5);
  assert.ok(Math.abs(box.max.z - box.min.z - 27) < 1e-5);
  const straight = ribbon(
    [
      [0, 0],
      [5, 0],
    ],
    0.1,
    "white",
  );
  straight.geometry.computeBoundingBox();
  const b = straight.geometry.boundingBox!;
  assert.ok(Math.abs(b.max.z - b.min.z - 0.1) < 1e-6);
  border.geometry.dispose();
  border.material.dispose();
  straight.geometry.dispose();
  straight.material.dispose();
});
