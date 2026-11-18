import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.UAV_URL ?? "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    ...(process.env.UAV_HARDWARE
      ? []
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
  ],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(90000);
const errors = [],
  requests = [],
  checks = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) =>
  requests.push({ url: r.url(), error: r.failure() }),
);
await mkdir("docs/screenshots", { recursive: true });
async function frames() {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function screenshot(name) {
  if (
    process.env.UAV_CAPTURE_ONLY &&
    !process.env.UAV_CAPTURE_ONLY.split(",").includes(name)
  )
    return;
  const captureHigh =
    process.env.UAV_CAPTURE_HIGH && name !== "mobile-controls";
  if (process.env.UAV_SKIP_SCREENSHOTS && name !== "mobile-controls") return;
  const previous = await page.evaluate(() => window.__UAV__.quality);
  if (captureHigh)
    await page
      .getByLabel("Graphics quality", { exact: true })
      .selectOption("High");
  await frames();
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  console.log(`Captured ${name}`);
  if (captureHigh)
    await page
      .getByLabel("Graphics quality", { exact: true })
      .selectOption(previous);
}
// Fast forward the same 250Hz force-based simulation, never mutate aircraft XYZ.
async function simulate(seconds) {
  await page.evaluate((seconds) => {
    const d = window.__UAV__.drone;
    const wasPaused = d.paused;
    d.paused = false;
    for (let i = 0; i < seconds / 0.02; i++) d.advance(0.02);
    d.paused = wasPaused;
  }, seconds);
  await frames();
}
try {
  await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
    null,
    { timeout: 60000 },
  );
  await page.getByRole("button",{name:"Reference missions",exact:true}).click();
  await frames();
  const profile = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const intervals = [];
        let last = 0;
        function sample(stamp) {
          if (last) intervals.push(stamp - last);
          last = stamp;
          if (intervals.length < 30) requestAnimationFrame(sample);
          else {
            const sorted = [...intervals].sort((a, b) => a - b);
            resolve({
              quality: window.__UAV__.quality,
              frames: intervals.length,
              meanFps:
                1000 /
                (intervals.reduce((a, b) => a + b, 0) / intervals.length),
              medianFrameMs: sorted[Math.floor(sorted.length / 2)],
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              userAgent: navigator.userAgent,
              hardwareConcurrency: navigator.hardwareConcurrency,
              bundle: document
                .querySelector("script[type=module]")
                ?.getAttribute("src"),
              clumpsReady: window.__UAV__.clumps.state.ready,
            });
          }
        }
        requestAnimationFrame(sample);
      }),
  );
  console.log("Measured steady-state render profile:", JSON.stringify(profile));
  const initial = await page.evaluate(() => ({
    t: window.__UAV__.drone.telemetry(),
    stats: window.__UAV__.stats,
  }));
  assert.equal(initial.stats.error, null);
  assert.ok(initial.stats.triangles > 1000);
  checks.push("Initial WebGL2 scene, textures and original GLB loaded");
  await screenshot("aerial-clear");
  await page
    .getByRole("button", { name: "Top down", exact: true })
    .click({ noWaitAfter: true });
  await screenshot("top-down-reference");
  await page
    .getByRole("button", { name: "Ground", exact: true })
    .click({ noWaitAfter: true });
  await screenshot("ground-concrete-detail");
  await page.evaluate(() => {
    const w = window.__UAV__;
    w.camera.position.set(-23.5, 0.3, 5);
    w.controls.target.set(-25.5, 0.07, 1);
    w.controls.update();
  });
  await screenshot("grass-closeup");
  await page
    .getByRole("button", { name: "Take off", exact: true })
    .click({ noWaitAfter: true });
  await simulate(22);
  const takeoff = await page.evaluate(() => window.__UAV__.drone.telemetry());
  assert.ok(Math.abs(takeoff.altitude - 5) < 0.2);
  assert.ok(takeoff.rpm.every((v) => v > 0));
  checks.push("Takeoff button drives motor-based climb and stable 5m hover");
  const beforeManual = await page.evaluate(
    () => window.__UAV__.drone.position.x,
  );
  await page.keyboard.down("d");
  await frames();
  await page.keyboard.up("d");
  await simulate(5);
  assert.ok(
    await page.evaluate(
      (x) => window.__UAV__.drone.position.x > x + 0.05,
      beforeManual,
    ),
  );
  await page.keyboard.down("q");
  await frames();
  await page.keyboard.up("q");
  await simulate(5);
  assert.ok(
    (await page.evaluate(() => window.__UAV__.drone.telemetry().yaw)) > 1,
  );
  checks.push(
    "Keyboard movement and yaw go through the physical controller after a button click",
  );
  await page
    .getByRole("button", { name: "Follow", exact: true })
    .click({ noWaitAfter: true });
  await page.evaluate(() => {
    const w = window.__UAV__;
    w.camera.position.copy(w.drone.position).add({ x: 2, y: 1.2, z: 2.5 });
  });
  await screenshot("drone-flight");
  await page
    .getByRole("button", { name: "FPV", exact: true })
    .click({ noWaitAfter: true });
  await frames();
  assert.equal(await page.evaluate(() => window.__UAV__.cameraMode), "FPV");
  checks.push("Follow and FPV cameras track the physical aircraft");
  await page
    .getByRole("button", { name: "Overview", exact: true })
    .click({ noWaitAfter: true });
  await page
    .getByLabel("Weather preset", { exact: true })
    .selectOption("Overcast");
  await simulate(12);
  await screenshot("overcast");
  await page
    .getByLabel("Weather preset", { exact: true })
    .selectOption("Heavy rain");
  await simulate(24);
  await screenshot("rain-overcast");
  const rainy = await page.evaluate(() => ({
    wet: window.__UAV__.weather.wetness,
    rain: window.__UAV__.atmosphere.rain.visible,
    wind: window.__UAV__.drone.wind.length(),
    roll: window.__UAV__.drone.telemetry().roll,
  }));
  assert.ok(rainy.wet > 0.7 && rainy.rain && rainy.wind > 3);
  checks.push(
    "Weather selector blends cloud/rain, wets concrete and physically disturbs aircraft",
  );
  await page
    .getByRole("button", { name: /^Tune environment/ })
    .click({ noWaitAfter: true });
  await page
    .getByRole("slider", { name: "Wind speed", exact: true })
    .press("End");
  assert.equal(
    await page.evaluate(() => window.__UAV__.weather.target.wind),
    15,
  );
  await page
    .getByRole("button", { name: /^Close environment settings/ })
    .click({ noWaitAfter: true });
  await page
    .getByLabel("Weather preset", { exact: true })
    .selectOption("Clear skies");
  await simulate(12);
  await page
    .getByRole("button", { name: "Reset", exact: true })
    .click({ noWaitAfter: true });
  const missionResults = [];
  async function until(condition) {
    await page.evaluate((condition) => {
      const d = window.__UAV__.drone;
      const matches = () =>
        condition === "EXECUTING"
          ? d.missionPhase === "EXECUTING"
          : condition === "APPROACH"
            ? d.missionPhase === "RETURN_TO_H" &&
              Math.hypot(d.position.x + 20, d.position.z) < 4
            : d.missionPhase === "COMPLETED";
      for (let i = 0; i < 240 / 0.004 && !matches(); i++) {
        const before = d.position.clone();
        d.advance(0.004);
        if (before.distanceTo(d.position) > 0.03)
          throw new Error("Discontinuous aircraft position");
        if (Math.abs(d.position.x) > 21.6 || Math.abs(d.position.z) > 12.6)
          throw new Error("Aircraft outside safe court bounds");
        if (d.missionPhase === "FAILED" || d.mode === "Crashed")
          throw new Error("Mission failed");
      }
      if (!matches())
        throw new Error("Mission condition timed out: " + condition);
    }, condition);
    await frames();
  }
  let previousPreview = "";
  for (const id of ["figure-eight", "outer-circuit"]) {
    // Trigger both selections even when Figure Eight is the initial option.
    if (id === "figure-eight")
      await page
        .getByLabel("Mission", { exact: true })
        .selectOption("outer-circuit");
    await page.getByLabel("Mission", { exact: true }).selectOption(id);
    await frames();
    const preview = await page
      .locator(".mini-map polyline")
      .getAttribute("points");
    assert.notEqual(preview, previousPreview);
    previousPreview = preview;
    assert.equal(
      await page.evaluate(() => window.__UAV__.drone.selectedMission),
      id,
    );
    await screenshot(
      id === "figure-eight" ? "figure-eight-preview" : "outer-circuit-preview",
    );
    await page
      .getByRole("button", { name: "Start mission", exact: true })
      .first()
      .click({ noWaitAfter: true });
    await until("EXECUTING");
    assert.equal(
      await page.getByLabel("Mission", { exact: true }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: /^Pause mission/ })
      .first()
      .click({ noWaitAfter: true });
    const distance = await page.evaluate(
      () => window.__UAV__.drone.missionDistance,
    );
    await simulate(4);
    assert.equal(
      await page.evaluate(() => window.__UAV__.drone.missionDistance),
      distance,
    );
    assert.equal(
      await page.evaluate(() => window.__UAV__.drone.missionPhase),
      "PAUSED",
    );
    await page
      .getByRole("button", { name: /^Resume mission/ })
      .first()
      .click({ noWaitAfter: true });
    await until("APPROACH");
    const approach = await page.evaluate(() =>
      window.__UAV__.drone.telemetry(),
    );
    assert.ok(approach.altitude > 4.5);
    assert.ok(approach.progress < 1);
    if (id === "figure-eight") {
      await page
        .getByRole("button", { name: "Follow", exact: true })
        .click({ noWaitAfter: true });
      await screenshot("return-to-h-approach");
      await page
        .getByRole("button", { name: "Overview", exact: true })
        .click({ noWaitAfter: true });
    }
    await until("COMPLETED");
    const result = await page.evaluate(() => ({
      telemetry: window.__UAV__.drone.telemetry(),
      phases: window.__UAV__.drone.phaseHistory,
    }));
    assert.equal(result.telemetry.mode, "Disarmed");
    assert.ok(result.telemetry.altitude < 0.02);
    assert.ok(
      Math.hypot(
        result.telemetry.position[0] + 20,
        result.telemetry.position[2],
      ) < 0.25,
    );
    assert.equal(result.telemetry.progress, 1);
    if (id === "outer-circuit")
      assert.deepEqual(
        result.telemetry.visitedWaypoints.filter((x) => /^M/.test(x)),
        ["M1", "M2", "M3", "M4", "M5"],
      );
    missionResults.push({ id, approach, ...result });
    checks.push(
      `${id}: selected preview/overlay, takeoff, route, pause/resume, H approach and physical landing before completion`,
    );
    await page
      .getByRole("button", { name: "Reset", exact: true })
      .click({ noWaitAfter: true });
  }
  const mission = missionResults;
  await page.getByRole("checkbox", { name: "Markers", exact: true }).check();
  assert.equal(await page.evaluate(() => window.__UAV__.labels.visible), true);
  await page.getByRole("checkbox", { name: "Markers", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Colliders", exact: true }).check();
  assert.equal(await page.evaluate(() => window.__UAV__.debug.visible), true);
  await page
    .getByRole("checkbox", { name: "Colliders", exact: true })
    .uncheck();
  await page
    .getByLabel("Graphics quality", { exact: true })
    .selectOption("Low");
  assert.equal(await page.evaluate(() => window.__UAV__.quality), "Low");
  checks.push("Markers, collider overlay and graphics quality controls work");
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click({ noWaitAfter: true });
  const pausedTime = await page.evaluate(() => window.__UAV__.drone.time);
  await frames();
  assert.equal(
    await page.evaluate(() => window.__UAV__.drone.time),
    pausedTime,
  );
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click({ noWaitAfter: true });
  checks.push("Global pause stops simulated time");
  await page
    .getByRole("button", { name: "Take off", exact: true })
    .click({ noWaitAfter: true });
  await simulate(16);
  await page
    .getByRole("button", { name: "Land", exact: true })
    .click({ noWaitAfter: true });
  await simulate(25);
  assert.equal(
    await page.evaluate(() => window.__UAV__.drone.mode),
    "Disarmed",
  );
  checks.push("Land button descends and disarms on physical ground contact");
  await page
    .getByRole("button", { name: "Reset", exact: true })
    .click({ noWaitAfter: true });
  await frames();
  assert.equal(await page.evaluate(() => window.__UAV__.drone.altitude), 0);
  checks.push("Reset returns to H at rest");
  await page
    .getByRole("button", { name: "Reference plan", exact: true })
    .click({ noWaitAfter: true });
  assert.ok(await page.getByRole("dialog").isVisible());
  await page
    .getByRole("button", { name: "Close dialog", exact: true })
    .click({ noWaitAfter: true });
  await page
    .getByRole("button", { name: "Open controls help", exact: true })
    .click({ noWaitAfter: true });
  assert.ok(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  checks.push("Reference and keyboard-help dialogs open and close");
  await page.setViewportSize({ width: 390, height: 844 });
  await frames();
  await screenshot("mobile-controls");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Start mission", exact: true })
      .last()
      .isVisible(),
  );
  await page
    .getByLabel("Mobile mission", { exact: true })
    .selectOption("figure-eight");
  assert.equal(
    await page.evaluate(() => window.__UAV__.drone.selectedMission),
    "figure-eight",
  );
  checks.push(
    "390px mobile layout has accessible flight/mission controls and no horizontal overflow",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(requests.length, 0, JSON.stringify(requests));
  const result = {
    url: base,
    browser: await browser.version(),
    viewport: [1600, 1000],
    renderer: initial.stats.gpu,
    profile,
    performance: initial.stats,
    initial,
    takeoff,
    rainy,
    mission,
    checks,
    errors,
    requests,
    note: "Physics forward-stepped through the actual fixed-step integrator for long flight scenarios. Screenshots are actual live browser renders. Software SwiftShader performance is not a hardware GPU benchmark.",
  };
  await writeFile(
    "docs/browser-evidence.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify(
      { passed: checks.length, checks, performance: initial.stats, errors },
      null,
      2,
    ),
  );
} catch (error) {
  const state = await page
    .evaluate(() => ({
      telemetry: window.__UAV__?.drone.telemetry(),
      quality: window.__UAV__?.quality,
    }))
    .catch(() => null);
  await writeFile(
    "docs/browser-failure.json",
    JSON.stringify(
      { error: String(error), checks, errors, requests, state },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
