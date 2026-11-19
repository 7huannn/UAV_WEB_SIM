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
  return {
    camera: w.cameraMode,
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
  for (const mode of ["Overview", "Follow", "FPV", "Top down", "Ground", "PILOT VLOS"]) {
    await camera.selectOption(mode);
    await page.waitForFunction((expected) => window.__UAV__.cameraMode === expected, mode);
    const current = await state();
    assert.equal(current.state, "ACTIVE", `flight ended when selecting ${mode}`);
    assert.equal(current.fault, "", `input fault when selecting ${mode}`);
    assert.equal(current.camera, mode);
    assert.equal(current.paused, false);
    assert.ok(current.sameWorld && current.sameSession && current.sameDrone);
    assert.equal(current.taskIndex, before.taskIndex);
    assert.deepEqual(current.completed, before.completed);
    assert.ok(current.altitude > 0.1);
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
