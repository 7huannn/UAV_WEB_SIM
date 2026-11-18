import test from "node:test";
import assert from "node:assert/strict";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { Weather } from "../weather/Weather";
import { missions, home, type MissionId } from "../simulation/missions";
import { config, insideCourt, routeLength } from "../arena/geometry";
import { aircraft } from "../simulation/parameters";
const dt = aircraft.fixedDt;
function create() {
  const w = new Weather();
  w.current = { ...w.current, wind: 0, gust: 0, turbulence: 0 };
  w.target = { ...w.current };
  return new DroneDynamics(w);
}
test("mission definitions preserve analytical figure eight and exact M1–M5 ordering, transfers and H return", () => {
  assert.ok(
    Math.abs(missions["figure-eight"].legs[1].path.length - routeLength) < 1e-8,
  );
  assert.deepEqual(
    missions["outer-circuit"].legs
      .filter((l) => /^M/.test(l.waypoint))
      .map((l) => l.waypoint),
    ["M1", "M2", "M3", "M4", "M5"],
  );
  for (const m of Object.values(missions)) {
    assert.deepEqual(m.preview[0], home);
    assert.deepEqual(m.preview.at(-1), home);
    assert.ok(m.preview.every(([x, z]) => insideCourt(x, z, 1)));
  }
  const c = config.corridors;
  for (const l of missions["outer-circuit"].legs.filter(
    (l) => l.phase === "EXECUTING",
  ))
    for (const [x, z] of l.path.points) {
      assert.ok(
        x >= c.outer.minX &&
          x <= c.outer.maxX &&
          z >= c.outer.minZ &&
          z <= c.outer.maxZ,
      );
      assert.ok(
        x <= c.inner.minX ||
          x >= c.inner.maxX ||
          z <= c.inner.minZ ||
          z >= c.inner.maxZ,
      );
    }
});
for (const id of Object.keys(missions) as MissionId[])
  test(`${id}: physical takeoff, full route, H return, landing, pause/resume and no teleport`, () => {
    const d = create();
    assert.ok(d.selectMission(id));
    assert.ok(d.mission());
    assert.equal(d.missionPhase, "ARMING");
    assert.equal(
      d.selectMission(id === "figure-eight" ? "outer-circuit" : "figure-eight"),
      false,
    );
    let paused = false,
      maxStep = 0;
    const track: number[][] = [];
    for (
      let i = 0;
      i < 250 * 240 && String(d.missionPhase) !== "COMPLETED";
      i++
    ) {
      const before = d.position.clone();
      d.advance(dt);
      maxStep = Math.max(maxStep, before.distanceTo(d.position));
      assert.ok(
        insideCourt(d.position.x, d.position.z, 0.8),
        JSON.stringify(d.telemetry()),
      );
      if (String(d.missionPhase) === "EXECUTING") {
        track.push([d.position.x, d.position.z]);
        if (id === "outer-circuit") {
          const { x, z } = d.position,
            c = config.corridors;
          assert.ok(
            x >= c.outer.minX + 0.3 &&
              x <= c.outer.maxX - 0.3 &&
              z >= c.outer.minZ + 0.3 &&
              z <= c.outer.maxZ - 0.3,
          );
          assert.ok(
            x <= c.inner.minX - 0.3 ||
              x >= c.inner.maxX + 0.3 ||
              z <= c.inner.minZ - 0.3 ||
              z >= c.inner.maxZ + 0.3,
          );
        }
        if (!paused) {
          d.toggleMissionPause();
          assert.equal(d.missionPhase, "PAUSED");
          const distance = d.missionDistance;
          for (let k = 0; k < 1000; k++) d.advance(dt);
          assert.equal(d.missionDistance, distance);
          assert.ok(d.velocity.length() < 0.3);
          d.toggleMissionPause();
          assert.equal(d.missionPhase, "EXECUTING");
          paused = true;
        }
      }
      if (d.altitude > 0.1) assert.notEqual(d.missionPhase, "COMPLETED");
    }
    assert.equal(d.missionPhase, "COMPLETED", JSON.stringify(d.telemetry()));
    assert.equal(d.mode, "Disarmed");
    assert.ok(d.altitude < 0.02);
    assert.ok(Math.hypot(d.position.x - home[0], d.position.z - home[1]) < 0.2);
    assert.ok(maxStep < 0.025, `Maximum step ${maxStep}`);
    assert.equal(d.progress, 1);
    const phases = d.phaseHistory
      .filter((p) => p !== "PAUSED")
      .filter((p, i, a) => !i || p !== a[i - 1]);
    assert.deepEqual(phases, [
      "IDLE",
      "ARMING",
      "TAKEOFF",
      "TRANSIT_TO_ROUTE",
      "EXECUTING",
      "RETURN_TO_H",
      "LANDING",
      "COMPLETED",
    ]);
    if (id === "outer-circuit")
      assert.deepEqual(
        d.visitedWaypoints.filter((x) => /^M/.test(x)),
        ["M1", "M2", "M3", "M4", "M5"],
      );
    else
      for (const cx of [-7.5, 8.5])
        assert.ok(
          track.some(([x, z]) => Math.hypot(x - cx, z - 5.5) < 0.5) &&
            track.some(([x, z]) => Math.hypot(x - cx, z + 5.5) < 0.5),
          "Both lobes traversed",
        );
  });
test("abort holds through controller; reset restores H; starting away from H is rejected", () => {
  const d = create();
  d.selectMission("outer-circuit");
  d.mission();
  for (let i = 0; i < 5000; i++) d.advance(dt);
  const before = d.position.clone();
  d.hold();
  assert.equal(d.missionPhase, "ABORTED");
  assert.ok(d.position.equals(before));
  d.reset();
  assert.equal(d.missionPhase, "IDLE");
  assert.equal(d.selectedMission, "outer-circuit");
  assert.deepEqual([d.position.x, d.position.z], home);
  d.takeoff();
  for (let i = 0; i < 3000; i++) d.advance(dt);
  assert.equal(d.mission(), false);
});
