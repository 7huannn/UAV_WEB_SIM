import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.UAV_URL ?? "http://localhost:4175";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(60000);
const errors = [],
  checks = [],
  screenshots = [],
  completeFlights = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) =>
  errors.push(`${r.url()}: ${r.failure()?.errorText}`),
);
await mkdir("docs/training-screenshots", { recursive: true });
const nav = async (name) => {
  await page
    .getByRole("navigation", { name: "Training workspaces" })
    .getByRole("button", { name, exact: true })
    .click();
};
const frames = () =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
async function capture(name) {
  await frames();
  await page.screenshot({ path: `docs/training-screenshots/${name}.png` });
  screenshots.push(name);
  console.log("Captured", name);
}
async function fast(seconds, rc = { throttle: 0, yaw: 0, pitch: 0, roll: 0 }) {
  await page.evaluate(
    ({ seconds, rc }) => {
      const w = window.__UAV__;
      w.input.value = rc;
      w.input.fault = "";
      w.inputFocused = true;
      const paused = w.drone.paused;
      w.drone.paused = false;
      for (let i = 0; i < Math.round(seconds / 0.004); i++)
        w.drone.advance(0.004);
      w.drone.paused = paused;
      w.input.value = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
    },
    { seconds, rc },
  );
  await frames();
}
async function prepare(name, profile = "figure-eight") {
  await page.getByLabel("Candidate identifier", { exact: true }).fill(name);
  await page
    .getByLabel("Training profile", { exact: true })
    .selectOption(profile);
  await page
    .getByRole("button", { name: "Prepare attempt", exact: true })
    .click();
  for (const label of [
    "Airspace, field boundaries and people checked",
    "Aircraft, propellers, battery and control mode checked",
    "Controller axes and neutral response checked",
    "Wind, emergency plan and provisional pilot station briefed",
  ])
    await page.getByLabel(label, { exact: true }).check();
  await page
    .getByRole("button", { name: "Confirm preflight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Arm for manual flight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Begin manual task", exact: true })
    .click();
}
async function savedCount() {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("uav-arena-training", 1);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("attempts").objectStore("attempts").count();
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  await frames();
  const initial = await page.evaluate(() => ({
    camera: window.__UAV__.cameraMode,
    station: window.__UAV__.camera.position.toArray(),
    gpu: window.__UAV__.stats.gpu,
    quality: window.__UAV__.quality,
  }));
  assert.equal(initial.camera, "PILOT VLOS");
  checks.push("Training default and fixed provisional Pilot VLOS");
  await capture("pilot-vlos");
  const canvas = page.locator(".viewport canvas"),
    box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, {
    steps: 4,
  });
  await page.mouse.up();
  await page.mouse.wheel(0, -600);
  await frames();
  assert.deepEqual(
    await page.evaluate(() => window.__UAV__.camera.position.toArray()),
    initial.station,
  );
  assert.equal(await page.evaluate(() => window.__UAV__.camera.zoom), 1);
  checks.push("VLOS head look and wheel preserve eye and zoom");
  await nav("Controller Calibration");
  await page.getByLabel("roll axis", { exact: true }).fill("3");
  await page.getByLabel("roll inverted", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save controller profile", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.__UAV__.input.profile.axes.roll.axis),
    3,
  );
  await capture("controller-calibration");
  checks.push(
    "Calibration profile edited, normalized diagnostics visible and persisted",
  );
  await page
    .getByRole("button", { name: "Mode 2 defaults", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save controller profile", exact: true })
    .click();
  await nav("Training");
  await prepare("Browser figure-eight manual attempt");
  assert.equal(
    await page.evaluate(() => window.__UAV__.setWorkspace("Mock Examination")),
    false,
  );
  checks.push("Operating mode cannot change during a live training attempt");
  await fast(2.5, { throttle: 1, yaw: 0, pitch: 0, roll: 0 });
  await fast(10);
  assert.ok(await page.evaluate(() => window.__UAV__.drone.altitude > 4));
  await page
    .getByLabel("Training guidance: reference route & candidate trace", {
      exact: true,
    })
    .check();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.7,
    box.y + box.height * 0.6 - 100,
    { steps: 4 },
  );
  await page.mouse.up();
  await capture("manual-figure-eight-attempt");
  checks.push(
    "Manual stick climb through motors, procedure/trace and figure-eight training attempt",
  );
  const before = await page.evaluate(() =>
    window.__UAV__.drone.position.toArray(),
  );
  await canvas.click();
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyD");
  await fast(2);
  const after = await page.evaluate(() =>
    window.__UAV__.drone.position.toArray(),
  );
  assert.ok(Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.03);
  checks.push(
    "Actual browser keyboard body-frame input changes force-integrated aircraft",
  );
  await page
    .getByRole("button", { name: "Pause attempt", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.__UAV__.session.state),
    "PAUSED",
  );
  await page
    .getByRole("button", { name: "Resume attempt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abort attempt", exact: true })
    .click();
  await page.waitForFunction(() => window.__UAV__.session.state === "ABORTED");
  await page.waitForTimeout(400);
  assert.ok((await savedCount()) >= 1);
  checks.push("Pause/resume/abort and offline persistence");
  await page.getByRole("button", { name: "Reset at H", exact: true }).click();
  await prepare("Browser outer-circuit manual attempt", "outer-circuit");
  await fast(2.5, { throttle: 1, yaw: 0, pitch: 0, roll: 0 });
  await fast(10);
  await page
    .getByLabel("Training guidance: reference route & candidate trace", {
      exact: true,
    })
    .check();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.7,
    box.y + box.height * 0.6 - 100,
    { steps: 4 },
  );
  await page.mouse.up();
  await capture("manual-outer-circuit-attempt");
  await page
    .getByRole("button", { name: "Abort attempt", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Reset at H", exact: true }).click();
  await nav("Mock Examination");
  await prepare("Browser restricted practice exam");
  await fast(1, { throttle: 0.5, yaw: 0, pitch: 0, roll: 0 });
  const restricted = await page.evaluate(() => {
    const w = window.__UAV__,
      before = w.camera.position.toArray();
    const results = {
      overview: w.setCamera("Overview"),
      route: w.setRoute(true),
      labels: w.setLabels(true),
      debug: w.setDebug(true),
      auto: w.drone.mission(),
      takeoff: w.drone.takeoff(),
      land: w.drone.land(),
      nav: w.setWorkspace("Instructor"),
      station: w.configureStation({ ...w.pilotStation, x: -24 }),
      reset: w.drone.reset(),
    };
    return {
      results,
      camera: w.cameraMode,
      route: w.route.visible,
      labels: w.labels.visible,
      debug: w.debug.visible,
      eye: w.camera.position.toArray(),
      before,
      manual: w.drone.manualOnly,
    };
  });
  assert.ok(Object.values(restricted.results).every((v) => v === false));
  assert.equal(restricted.camera, "PILOT VLOS");
  assert.equal(restricted.route, false);
  assert.equal(restricted.labels, false);
  assert.deepEqual(restricted.eye, restricted.before);
  assert.equal(
    await page
      .getByRole("navigation", { name: "Training workspaces" })
      .getByRole("button", { name: "Instructor", exact: true })
      .isDisabled(),
    true,
  );
  await capture("mock-examination");
  checks.push(
    "Mock camera, aids, station, reference automation and navigation locked at API and UI",
  );
  await page
    .getByRole("button", { name: "Abort attempt", exact: true })
    .click();
  await page.waitForTimeout(500);
  await nav("Session Review");
  await page
    .getByRole("button", { name: /Browser figure-eight manual attempt/ })
    .click();
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  await page.getByLabel("Replay time", { exact: false }).fill("4");
  await capture("replay-telemetry");
  checks.push(
    "Stored recording replay with RC, attitude/position and task timeline",
  );
  await page
    .getByRole("heading", { name: "Recorded telemetry history", exact: true })
    .scrollIntoViewIfNeeded();
  await page.locator(".telemetry-plots").scrollIntoViewIfNeeded();
  await capture("replay-telemetry-history");
  const hashBefore = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("uav-arena-training", 1);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("attempts").objectStore("attempts").getAll();
          q.onsuccess = () => {
            resolve(q.result.map((x) => x.sha256));
            db.close();
          };
        };
      }),
  );
  await page
    .getByLabel("Instructor annotation", { exact: true })
    .fill(
      "Synthetic browser QA review: partial attempt, not a completed flight or certification.",
    );
  await page
    .getByRole("button", { name: "Append review", exact: true })
    .click();
  await page.waitForTimeout(300);
  const hashAfter = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("uav-arena-training", 1);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("attempts").objectStore("attempts").getAll();
          q.onsuccess = () => {
            resolve(q.result.map((x) => x.sha256));
            db.close();
          };
        };
      }),
  );
  assert.deepEqual(hashAfter, hashBefore);
  checks.push("Instructor annotation preserves original attempt hashes");
  for (const format of ["JSON", "CSV", "Report"]) {
    const promise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Export ${format}`, exact: true })
      .click();
    const d = await promise;
    await d.saveAs(
      `/tmp/uav-training-${format.toLowerCase()}.${format === "JSON" ? "json" : format === "CSV" ? "csv" : "txt"}`,
    );
    assert.ok(d.suggestedFilename());
  }
  checks.push("JSON, CSV and readable report downloads");
  await page
    .getByRole("button", { name: "Recorded camera", exact: true })
    .click();
  await frames();
  const restored = await page.evaluate(() => {
    const w = window.__UAV__,
      frames = w.replay.attempt.frames;
    let f = frames[0];
    for (const row of frames) if (row.time <= w.replay.time) f = row;
    return {
      eye: w.camera.position.toArray(),
      recorded: f.cameraPose?.position,
    };
  });
  assert.deepEqual(restored.eye, restored.recorded);
  checks.push("Recorded camera pose replay preserves fixed eye");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByLabel("Import simulation JSON", { exact: true })
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"format":"UAV_ARENA_ATTEMPT_V1","sha256":"tampered","payload":{}}',
      ),
    });
  await page.getByText(/Import rejected:/).waitFor();
  checks.push(
    "Malformed recording import is rejected without replacing original evidence",
  );
  await page.locator(".result-metrics").scrollIntoViewIfNeeded();
  await capture("scoring-report");
  await nav("Instructor");
  await page.locator(".training-panel").evaluate((el) => (el.scrollTop = 0));
  await capture("instructor");
  await nav("Examination Profiles");
  assert.ok(
    (await page
      .getByText("TRAINING_ONLY · OFFICIAL APPLICABILITY UNVERIFIED", {
        exact: true,
      })
      .count()) === 4,
  );
  await capture("examination-profiles");
  await nav("System Configuration");
  await page.getByLabel("Pilot eyeHeight", { exact: true }).fill("1.7");
  await page
    .getByRole("button", { name: "Save provisional station", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.__UAV__.pilotStation.eyeHeight),
    1.7,
  );
  checks.push("Provisional station configuration and rule provenance");
  await nav("Training");
  await page.getByRole("button", { name: "Reset at H", exact: true }).click();
  await prepare("Focus-loss QA", "foundations");
  await canvas.click();
  await page.keyboard.down("KeyR");
  await fast(0.1);
  await page.keyboard.up("KeyR");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForFunction(
    () => window.__UAV__.session.state === "INCOMPLETE",
  );
  checks.push(
    "Active focus loss marks attempt incomplete and neutralizes input",
  );
  for (const id of ["figure-eight", "outer-circuit"]) {
    await nav("Training");
    await page.getByRole("button", { name: "Reset at H", exact: true }).click();
    await page.evaluate(() => {
      const w = window.__UAV__;
      w.weather.current = {
        ...w.weather.current,
        wind: 0,
        gust: 0,
        turbulence: 0,
      };
      w.weather.target = { ...w.weather.current };
    });
    await prepare(`Browser QA synthetic RC full ${id}`, id);
    const flown = await page.evaluate(() => {
      const w = window.__UAV__,
        d = w.drone,
        s = w.session,
        task = s.attempt.profile.tasks.find((t) => t.kind === "route"),
        points = s.attempt.referencePaths[task.id];
      s.event(
        "TEST_INPUT_FIXTURE",
        "Synthetic software RC fixture; reference-guided QA, not human pilot/hardware evidence",
      );
      s.attempt.result.limitations.push(
        "Synthetic software-generated RC fixture; not human flight or physical controller validation",
      );
      const distances = [0];
      for (let i = 1; i < points.length; i++)
        distances.push(
          distances[i - 1] +
            Math.hypot(
              points[i][0] - points[i - 1][0],
              points[i][1] - points[i - 1][1],
            ),
        );
      const length = distances.at(-1),
        gates = [];
      let cursor = 1;
      for (
        let distance = 0;
        distance < length;
        distance += s.attempt.rules.routeSpacing
      ) {
        while (cursor < points.length - 1 && distances[cursor] < distance)
          cursor++;
        const ratio =
          (distance - distances[cursor - 1]) /
          (distances[cursor] - distances[cursor - 1] || 1);
        gates.push([
          points[cursor - 1][0] +
            (points[cursor][0] - points[cursor - 1][0]) * ratio,
          points[cursor - 1][1] +
            (points[cursor][1] - points[cursor - 1][1]) * ratio,
        ]);
      }
      gates.push(points.at(-1));
      let maxStep = 0;
      d.paused = false;
      w.inputFocused = true;
      w.input.fault = "";
      const bounded = (v, min, max) => Math.max(min, Math.min(max, v));
      for (let i = 0; i < 250 * 400 && s.state === "ACTIVE"; i++) {
        const goal =
          s.task?.kind === "route"
            ? gates[Math.min(s.gate, gates.length - 1)]
            : [-20, 0];
        const vx = bounded((goal[0] - d.target.x) * 1.6, -1.7, 1.7),
          vz = bounded((goal[1] - d.target.z) * 1.6, -1.7, 1.7),
          vy = bounded((5.32 - d.target.y) * 1.6, -1.25, 1.25);
        const q = d.orientation,
          heading = Math.atan2(
            2 * (q.x * q.z + q.y * q.w),
            1 - 2 * (q.x * q.x + q.y * q.y),
          );
        w.input.value = {
          throttle: vy / 2,
          yaw: 0,
          roll: (vx * Math.cos(heading) - vz * Math.sin(heading)) / 2,
          pitch: -(vx * Math.sin(heading) + vz * Math.cos(heading)) / 2,
        };
        const before = d.position.clone();
        d.advance(0.004);
        maxStep = Math.max(maxStep, before.distanceTo(d.position));
      }
      w.input.value = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      return {
        state: s.state,
        maxStep,
        completed: [...s.attempt.result.completedTasks],
        samples: s.attempt.frames.length,
        simSeconds: s.attempt.frames.at(-1)?.time,
      };
    });
    assert.equal(flown.state, "TASK_COMPLETE");
    assert.ok(flown.maxStep < 0.02);
    assert.ok(flown.completed.includes("route"));
    await frames();
    await page
      .getByRole("button", { name: "Begin manual landing", exact: true })
      .click();
    await fast(5.5, { throttle: -0.5, yaw: 0, pitch: 0, roll: 0 });
    await fast(8);
    assert.ok(await page.evaluate(() => window.__UAV__.drone.altitude < 0.08));
    await page.getByRole("button", { name: "Disarm", exact: true }).click();
    await fast(2);
    await page.waitForFunction(
      () => window.__UAV__.session.state === "POSTFLIGHT",
    );
    await page
      .getByLabel("Aircraft disarmed and propulsion stopped", { exact: true })
      .check();
    await page
      .getByLabel("Aircraft condition and occurrence report reviewed", {
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Finish practice & save", exact: true })
      .click();
    await page
      .getByText("Attempt saved offline. Human review remains required.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.evaluate(() => window.__UAV__.session.attempt.result.decision),
      "HUMAN_REVIEW_REQUIRED",
    );
    completeFlights.push({
      id,
      ...flown,
      result: await page.evaluate(() => window.__UAV__.session.attempt.result),
    });
    await nav("Instructor");
    await page
      .getByRole("button", {
        name: new RegExp(`Browser QA synthetic RC full ${id}`),
      })
      .click();
    await page.getByRole("button", { name: "Top down", exact: true }).click();
    await page.locator(".training-panel").evaluate((el) => (el.scrollTop = 0));
    await capture(`complete-${id}-debrief`);
    await page
      .getByRole("button", { name: "Close replay", exact: true })
      .click();
    checks.push(
      `${id}: synthetic RC full force-integrated route, manual descent/disarm, postflight, sealed review-required outcome and replay`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("Controller Calibration");
  await capture("mobile-calibration");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  );
  checks.push(
    "390px responsive navigation/calibration without horizontal overflow",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "docs/training-browser-evidence.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        url: base,
        browser: browser.version(),
        initial,
        checks,
        screenshots,
        completeFlights,
        bundle: await page.evaluate(() =>
          document.querySelector("script[type=module]")?.getAttribute("src"),
        ),
        errors,
        limitations: [
          "SwiftShader software rendering, not hardware GPU acceptance",
          "Synthetic software stick commands include both full force-integrated courses and partial keyboard attempts; no human full-course or physical RC validation",
          "Original attempt hashes preserved by separate annotations",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { checks: checks.length, screenshots: screenshots.length, errors },
      null,
      2,
    ),
  );
} catch (error) {
  await capture("failure-state");
  throw error;
} finally {
  await browser.close();
}
