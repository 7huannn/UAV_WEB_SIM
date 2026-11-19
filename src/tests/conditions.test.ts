import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../scene/World";
import { Weather } from "../weather/Weather";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { TrainingSession } from "../training/Session";
import { ControllerInput } from "../training/input";
import { PILOT_STATION } from "../training/pilot";
import { weatherAtLevels } from "../training/weatherPresets";
import { extinctionForVisibility, transmittance, MOR_CONTRAST } from "../scene/optics";

test("P3-C: meteorological visibility uses five-percent Beer–Lambert contrast", () => {
  for (const visibility of [95, 180, 260, 650]) {
    assert.equal(transmittance(0, visibility), 1);
    assert.ok(Math.abs(transmittance(visibility, visibility) - MOR_CONTRAST) < 1e-12);
    assert.ok(transmittance(visibility / 2, visibility) > MOR_CONTRAST);
    assert.ok(transmittance(visibility * 2, visibility) < MOR_CONTRAST);
    assert.ok(extinctionForVisibility(visibility) > 0);
  }
});

test("P3-H: rain-level editing preserves the selected solar time", () => {
  const base = new Weather().target;
  for (const solarTime of [7, 13, 15.5, 17.5, 18]) {
    for (const rain of [0, 1, 5, 10]) {
      const source = { ...base, timeOfDay: solarTime };
      const edited = weatherAtLevels(source, undefined, rain);
      assert.equal(edited.timeOfDay, solarTime);
      assert.equal(source.timeOfDay, solarTime);
    }
  }
});

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
    const solarTime = weather.target.timeOfDay;
    assert.ok(w.setWeatherLevels(undefined, 10));
    assert.equal(weather.target.timeOfDay, solarTime);
    assert.deepEqual(session.attempt.initialWeather, weather.target);
    assert.deepEqual(weather.current, weather.target);
    assert.deepEqual(session.attempt.environment, drone.simulation.snapshot());
    assert.equal(weather.wetness, weather.current.rain);
    const original = structuredClone(session.attempt.initialWeather);
    drone.arm();
    assert.ok(drone.armed);
    assert.ok(session.start(drone));
    const startedSolarTime = weather.target.timeOfDay;
    assert.equal(w.setWeatherLevels(undefined, 7), mode === "Training");
    assert.equal(weather.target.timeOfDay, startedSolarTime);
    assert.equal(weather.current.timeOfDay, startedSolarTime);
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
