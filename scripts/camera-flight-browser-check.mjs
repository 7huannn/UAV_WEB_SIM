import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(60000);
const state = () => page.evaluate(() => {
  const w = window.__UAV__, s = w.session, d = w.drone;
  const direction = w.camera.getWorldDirection(w.camera.position.clone().set(0, 0, 0));
  const screenY = (z, y = 0) =>
    (1 - w.camera.position.clone().set(0, y, z).project(w.camera).y) / 2;
  return {
    camera: w.cameraMode,
    eye: w.camera.position.toArray(),
    station: [w.pilotStation.x, w.pilotStation.groundY + w.pilotStation.eyeHeight, w.pilotStation.z],
    yaw: Math.atan2(direction.z, direction.x),
    pitch: Math.asin(direction.y),
    fov: w.camera.fov,
    horizonY: screenY(-100000, w.camera.position.y),
    farEdgeY: screenY(-13.5),
    nearEdgeY: screenY(13.5),
    state: s.state,
    time: d.time,
    frames: s.attempt.frames.length,
    taskIndex: s.taskIndex,
    completed: [...s.attempt.result.completedTasks],
    dwell: s.dwell,
    altitude: d.altitude,
    paused: d.paused,
    fault: w.input.fault,
    sameWorld: w === window.__cameraTest.world,
    sameSession: s === window.__cameraTest.session,
    sameDrone: d === window.__cameraTest.drone,
  };
});

try {
  await page.goto(process.env.UAV_URL ?? "http://127.0.0.1:4175", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole("button", { name: "Bắt đầu luyện tập" }).click();
  await page.getByRole("button", { name: "Vào sân bay" }).click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "READY");
  await page.locator(".view-tools>details:not(.conditions-control)>summary").click();
  const camera = page.getByLabel("Góc quan sát");
  await camera.selectOption("Overview");
  assert.equal(await page.evaluate(() => window.__UAV__.session.state), "READY");
  await camera.selectOption("PILOT VLOS");
  await page.getByRole("button", { name: "Bắt đầu bay" }).click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "ACTIVE");
  await page.evaluate(() => {
    const w = window.__UAV__;
    window.__cameraTest = { world: w, session: w.session, drone: w.drone };
  });
  await page.keyboard.down("KeyR");
  await page.waitForFunction(() => window.__UAV__.drone.altitude > 0.3);
  await page.keyboard.up("KeyR");
  const before = await state();
  assert.deepEqual(before.station, [0, 1.615, 17]);
  assert.ok(before.eye.every((v, i) => Math.abs(v - [0, 6.115, 25.5][i]) < 1e-9));
  assert.ok(Math.abs(before.yaw + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(before.pitch + 14.3 * Math.PI / 180) < 1e-9);
  assert.equal(before.fov, 45);
  assert.ok(Math.abs(before.horizonY - 0.193) < 0.01);
  assert.ok(Math.abs(before.farEdgeY - 0.385) < 0.01);
  assert.ok(Math.abs(before.nearEdgeY - 0.773) < 0.01);
  for (const mode of ["Overview", "Follow", "FPV", "Top down", "Ground", "PILOT VLOS"]) {
    await camera.selectOption(mode);
    await page.waitForFunction((expected) => window.__UAV__.cameraMode === expected, mode);
    if (mode === "PILOT VLOS")
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const current = await state();
    assert.equal(current.state, "ACTIVE", `flight ended when selecting ${mode}`);
    assert.equal(current.fault, "", `input fault when selecting ${mode}`);
    assert.equal(current.camera, mode);
    assert.equal(current.paused, false);
    assert.ok(current.sameWorld && current.sameSession && current.sameDrone);
    assert.equal(current.taskIndex, before.taskIndex);
    assert.deepEqual(current.completed, before.completed);
    assert.ok(current.altitude > 0.1);
    if (mode === "PILOT VLOS") {
      assert.deepEqual(current.eye, before.eye);
      assert.deepEqual(current.station, before.station);
      assert.ok(Math.abs(current.yaw - before.yaw) < 1e-9);
      assert.ok(Math.abs(current.pitch - before.pitch) < 1e-9);
      assert.equal(current.fov, before.fov);
    }
    assert.equal(await page.getByRole("region", { name: "Kết quả bài bay" }).count(), 0);
  }
  await page.waitForFunction((frames) => window.__UAV__.session.attempt.frames.length > frames, before.frames);
  const after = await state();
  assert.ok(after.time > before.time && after.frames > before.frames);

  await page.getByRole("button", { name: "Tạm dừng" }).click();
  assert.equal(await page.evaluate(() => window.__UAV__.session.state), "PAUSED");
  await page.getByRole("button", { name: "Kết thúc và lưu bản ghi" }).click();
  await page.waitForFunction(() => window.__UAV__.session.state === "ABORTED");
  assert.equal(await page.getByRole("region", { name: "Kết quả bài bay" }).count(), 1);
  assert.equal(await page.evaluate(() => window.__UAV__.setCamera("Overview")), true);
  assert.equal(await page.evaluate(() => window.__UAV__.session.state), "ABORTED");
  console.log("Camera switches preserve active flight, drone/session identity, progress, and timer; explicit end still works.");
} finally {
  await browser.close();
}
