import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../scene/World";
import { Weather } from "../weather/Weather";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { TrainingSession } from "../training/Session";
import { ControllerInput } from "../training/input";
import { PILOT_STATION } from "../training/pilot";

test("map weather edits snapshot READY, preserve started recordings, and lock all mock/replay/final setters", () => {
  // Exercise World policy without constructing a renderer; dynamics/session are real.
  for (const mode of ["Training", "Mock Examination"] as const) {
    const weather = new Weather(),
      drone = new DroneDynamics(weather),
      input = new ControllerInput();
    const session = new TrainingSession(
      "Weather test",
      mode,
      "foundations",
      drone,
      weather,
      input,
      PILOT_STATION,
    );
    const w: World = Object.assign(Object.create(World.prototype), {
      workspace: mode,
      weather,
      drone,
      input,
      session,
      replay: null,
    });
    assert.ok(w.setWeatherLevels(3, 4));
    assert.deepEqual(session.attempt.initialWeather, weather.target);
    assert.deepEqual(weather.current, weather.target);
    const original = structuredClone(session.attempt.initialWeather);
    drone.arm();
    assert.ok(drone.armed);
    assert.ok(session.start(drone));
    const setters = [
      () => w.setWeatherLevels(8, 7),
      () => w.setAdvancedWeather("direction", 120),
      () => w.setWeatherPreset("Clear skies"),
      () => w.setSimpleWeather("strong", "rain"),
    ];
    for (const set of setters) assert.equal(set(), mode === "Training");
    assert.deepEqual(session.attempt.initialWeather, original);
    session.pause(drone);
    for (const set of setters) assert.equal(set(), mode === "Training");
    const target = structuredClone(weather.target),
      events = session.attempt.events.length;
    assert.equal(w.setWeatherLevels(-1, 3), false);
    assert.equal(w.setAdvancedWeather("wind", NaN), false);
    assert.deepEqual(weather.target, target);
    assert.equal(session.attempt.events.length, events);
    session.abort("Test finished");
    const final = JSON.stringify(session.attempt);
    for (const set of setters) assert.equal(set(), false);
    assert.equal(JSON.stringify(session.attempt), final);
    w.session = null;
    w.workspace = "Reference missions";
    assert.ok(w.setWeatherLevels(2, 3));
    w.replay = {} as World["replay"];
    for (const set of setters) assert.equal(set(), false);
  }
});
