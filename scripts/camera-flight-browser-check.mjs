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
    pointerLocked: document.pointerLockElement === w.renderer.domElement,
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
  await page.keyboard.down("KeyJ");
  await page.waitForFunction(() => window.__UAV__.drone.altitude > 2);
  await page.keyboard.up("KeyJ");
  await page.waitForFunction(() => Math.abs(window.__UAV__.drone.velocity.y) < 0.1);
  const climbAltitude = await page.evaluate(() => window.__UAV__.drone.altitude);
  const climbTarget = await page.evaluate(() => window.__UAV__.drone.target.y);
  await page.keyboard.down("KeyK");
  await page.waitForFunction((target) => window.__UAV__.drone.target.y < target - 0.6, climbTarget);
  await page.keyboard.up("KeyK");
  await page.waitForFunction((altitude) => window.__UAV__.drone.altitude < altitude - 0.1, climbAltitude);
  const before = await state();
  assert.deepEqual(before.station, [0, 1.615, 17]);
  assert.ok(before.eye.every((v, i) => Math.abs(v - [0, 6.115, 25.5][i]) < 1e-9));
  assert.ok(Math.abs(before.yaw + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(before.pitch + 14.3 * Math.PI / 180) < 1e-9);
  assert.equal(before.fov, 45);
  assert.ok(Math.abs(before.horizonY - 0.193) < 0.02);
  assert.ok(Math.abs(before.farEdgeY - 0.385) < 0.01);
  assert.ok(Math.abs(before.nearEdgeY - 0.773) < 0.02);
  assert.ok(before.farEdgeY - before.horizonY > 0.15);
  const canvas = page.locator(".viewport canvas");
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForFunction(() => document.pointerLockElement === window.__UAV__.renderer.domElement);
  await page.mouse.move(x + 80, y - 40);
  await page.waitForFunction((yaw) => window.__UAV__.headYaw > yaw + 0.05, before.yaw);
  const turned = await state();
  assert.ok(turned.pointerLocked && turned.pitch > before.pitch);
  assert.deepEqual(turned.eye, before.eye);
  assert.equal(turned.state, "ACTIVE");
  await page.mouse.move(x - 280, y - 40);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const uav = await page.evaluate(() => window.__UAV__.drone.position.clone().project(window.__UAV__.camera).toArray());
  assert.ok(Math.abs(uav[0]) < 0.3 && Math.abs(uav[1]) < 1, "mouse look can bring the UAV into view");
  await page.mouse.click(x, y);
  await page.waitForFunction(() => document.pointerLockElement === null);
  await page.mouse.click(x, y);
  await page.waitForFunction(() => document.pointerLockElement === window.__UAV__.renderer.domElement);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.pointerLockElement === null);
  await page.mouse.click(x, y);
  await page.waitForFunction(() => document.pointerLockElement === window.__UAV__.renderer.domElement);
  await page.evaluate(() => window.__UAV__.setCamera("Overview"));
  await page.waitForFunction(() => document.pointerLockElement === null);
  assert.equal((await state()).state, "ACTIVE");
  await page.evaluate(() => window.__UAV__.setCamera("PILOT VLOS"));
  await page.evaluate(() => window.__UAV__.recenterPilot());
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  for (const mode of ["Overview", "Follow", "FPV", "Top down", "Ground", "PILOT VLOS"]) {
    await camera.selectOption(mode);
    await page.waitForFunction((expected) => window.__UAV__.cameraMode === expected, mode);
    if (mode === "PILOT VLOS")
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const current = await state();
    assert.equal(current.state, "ACTIVE", `flight ended when selecting ${mode}`);
    assert.equal(current.fault, "", `input fault when selecting ${mode}`);
    assert.equal(current.camera, mode);
    assert.equal(current.pointerLocked, false);
    assert.equal(current.paused, false);
    assert.ok(current.sameWorld && current.sameSession && current.sameDrone);
    assert.equal(current.taskIndex, before.taskIndex);
    assert.deepEqual(current.completed, before.completed);
    assert.ok(current.altitude > 0.1);
    if (mode === "FPV") {
      await page.mouse.click(x, y);
      assert.equal((await state()).pointerLocked, false);
    }
    if (mode === "PILOT VLOS") {
      assert.deepEqual(current.eye, before.eye);
      assert.deepEqual(current.station, before.station);
      assert.ok(Math.abs(current.yaw - before.yaw) < 1e-9);
      assert.ok(Math.abs(current.pitch - before.pitch) < 1e-9);
      assert.equal(current.fov, before.fov);
    }
    await canvas.focus();
    for (const [key, throttle] of [["KeyJ", 1], ["KeyK", -1]]) {
      await page.keyboard.down(key);
      await page.waitForFunction((expected) => window.__UAV__.input.value.throttle === expected, throttle);
      await page.keyboard.up(key);
      await page.waitForFunction(() => window.__UAV__.input.value.throttle === 0);
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
  console.log("J climbs, K descends, both keys work across camera modes, and Pointer Lock/camera switches preserve the active flight.");
} finally {
  await browser.close();
}
