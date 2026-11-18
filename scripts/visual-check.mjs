import { chromium } from "@playwright/test";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
// ponytail: a fresh browser per section bounds software-renderer memory during long captures.
if (
  !process.env.UAV_VISUAL_SECTION &&
  !process.env.UAV_PAINT_ONLY &&
  !process.env.UAV_VISUAL_QUICK
) {
  const sections = ["environment", "temporal", "missions"];
  for (const section of sections)
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
        env: { ...process.env, UAV_VISUAL_SECTION: section },
        stdio: "inherit",
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Visual ${section} exited ${code}`)),
      );
    });
  const results = await Promise.all(
    sections.map(async (s) =>
      JSON.parse(await readFile(`docs/visual-${s}-evidence.json`, "utf8")),
    ),
  );
  assert.ok(
    results.every((r) => r.bundle === results[0].bundle),
    "Visual sections must use the same build",
  );
  const combined = {
    ...results[0],
    shots: results.flatMap((r) => r.shots),
    profiles: results.flatMap((r) => r.profiles),
    checks: results.flatMap((r) => r.checks),
    errors: results.flatMap((r) => r.errors),
    requests: results.flatMap((r) => r.requests),
  };
  await writeFile(
    "docs/visual-evidence.json",
    JSON.stringify(combined, null, 2),
  );
  console.log(
    `Visual matrix passed: ${combined.shots.length} views, ${combined.checks.length} temporal/layout checks`,
  );
  process.exit(0);
}
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
page.setDefaultTimeout(120000);
const errors = [],
  requests = [],
  shots = [],
  profiles = [],
  checks = [];
const section = process.env.UAV_VISUAL_SECTION;
browser.on("disconnected", () => console.log("Chrome disconnected"));
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) => requests.push(r.url()));
const frames = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
async function view(camera) {
  await page
    .getByRole("button", { name: camera, exact: true })
    .click({ noWaitAfter: true });
  await page.waitForFunction(
    (name) =>
      document.querySelector(".camera-tabs .active")?.textContent?.trim() ===
      name,
    camera,
  );
  await frames();
}
async function position(eye, target) {
  await page.evaluate(
    ({ eye, target }) => {
      const w = window.__UAV__;
      w.camera.position.set(...eye);
      w.controls.target.set(...target);
      w.controls.update();
    },
    { eye, target },
  );
  await frames();
}
async function simulate(seconds) {
  await page.evaluate((seconds) => {
    const d = window.__UAV__.drone,
      paused = d.paused;
    d.paused = false;
    for (let i = 0; i < seconds / 0.004; i++) d.advance(0.004);
    d.paused = paused;
  }, seconds);
  await frames();
}
async function weather(preset) {
  await page.getByLabel("Kịch bản thời tiết", { exact: true }).selectOption(preset);
  await simulate(14);
}
async function capture(name) {
  await frames();
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  const state = await page.evaluate(() => {
    const w = window.__UAV__;
    return {
      quality: w.quality,
      camera: w.cameraMode,
      time: w.drone.time,
      weather: w.weather.preset,
      wetness: w.weather.wetness,
      gpu: w.stats.gpu,
      calls: w.renderer.info.render.calls,
      triangles: w.renderer.info.render.triangles,
      memory: w.renderer.info.memory,
      mission: w.drone.telemetry(),
    };
  });
  shots.push({ name, ...state });
  console.log(
    `Captured ${name}: ${state.triangles} triangles, ${state.calls} calls`,
  );
}
async function profile(label) {
  await frames();
  const result = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = 0;
        function sample(stamp) {
          if (last) times.push(stamp - last);
          last = stamp;
          if (times.length < 30) requestAnimationFrame(sample);
          else {
            const sorted = [...times].sort((a, b) => a - b),
              w = window.__UAV__;
            resolve({
              frames: 30,
              meanFps: 30000 / times.reduce((s, v) => s + v, 0),
              medianFrameMs: sorted[15],
              p95FrameMs: sorted[28],
              quality: w.quality,
              gpu: w.stats.gpu,
              calls: w.renderer.info.render.calls,
              triangles: w.renderer.info.render.triangles,
              memory: w.renderer.info.memory,
              resolution: [
                w.renderer.domElement.width,
                w.renderer.domElement.height,
              ],
            });
          }
        }
        requestAnimationFrame(sample);
      }),
  );
  profiles.push({ label, ...result });
  console.log(`Profile ${label}: ${result.meanFps.toFixed(2)} FPS`);
}
async function raw(name) {
  const data = await page.evaluate(() => {
    const w = window.__UAV__;
    w.renderer.render(w.scene, w.camera);
    return w.renderer.domElement.toDataURL("image/png");
  });
  const buffer = Buffer.from(data.split(",")[1], "base64");
  await writeFile(`docs/screenshots/${name}.png`, buffer);
  return createHash("sha256").update(buffer).digest("hex");
}
try {
  await mkdir("docs/screenshots", { recursive: true });
  await page.goto(process.env.UAV_URL ?? "http://127.0.0.1:4175", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  await page.locator(".workspace-more summary").click();
  await page
    .getByRole("button", { name: "Bay mẫu tự động", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.__UAV__.clumps.state.ready),
    true,
  );
  await page
    .getByLabel("Chất lượng hình ảnh", { exact: true })
    .selectOption("High");
  await page.evaluate(() => (window.__UAV__.drone.paused = true));
  if (process.env.UAV_PAINT_ONLY) {
    await view("Top down");
    await capture("top-down-reference");
    await view("Overview");
    await capture("aerial-clear");
  } else if (process.env.UAV_VISUAL_QUICK) {
    await view("Ground");
    await capture("ground-concrete-detail");
    await position([-23.5, 0.3, 5], [-25.5, 0.07, 1]);
    await capture("grass-closeup");
  } else {
    if (!section || section === "environment") {
      await view("Overview");
      await capture("aerial-clear");
      await profile("High overview");
      for (const [preset, name] of [
        ["Partly cloudy", "overview-partly-cloudy"],
        ["Overcast", "overcast"],
        ["Heavy rain", "rain-overcast"],
      ]) {
        await weather(preset);
        await capture(name);
      }
      await weather("Clear skies");
      await simulate(100); // Dry the same material state before comparing details.
      await view("Top down");
      await capture("top-down-reference");
      await view("Ground");
      await capture("ground-concrete-detail");
      await position([-23.3, 0.42, 5], [-21.8, 0.02, 2]);
      await capture("concrete-grass-transition");
      await position([-23.5, 0.3, 5], [-25.5, 0.07, 1]);
      await capture("grass-closeup");
      await profile("High grass closeup");
    }
    if (!section || section === "temporal") {
      await view("Ground");
      await position([-23.5, 0.3, 5], [-25.5, 0.07, 1]);
      const signature = () =>
        page.evaluate(() => {
          const g = window.__UAV__.clumps.group;
          return JSON.stringify([
            g.position.toArray(),
            g.children.map((m) => [
              m.position.toArray(),
              Array.from(m.instanceMatrix.array.slice(0, 16)),
            ]),
          ]);
        });
      const anchored = await signature();
      for (let i = 0; i < 3; i++) {
        await position([-23.5 + i * 0.55, 0.3, 5], [-25.5 + i * 0.55, 0.07, 1]);
        await raw(`grass-travel-${i}`);
        assert.equal(await signature(), anchored);
      }
      checks.push(
        "Vegetation instance/tile transforms stay fixed while camera crosses tile boundaries",
      );
      await position([-25, 1.1, 7], [-25, 0.05, -5]);
      await capture("grass-mid-distance");
      await position([-25, 3, 17], [-24, 0, -14]);
      await capture("grass-long-distance");
      await weather("Partly cloudy");
      await position([-22, 2, 4], [-8, 5, -10]);
      await frames();
      await frames();
      const fixed0 = await raw("clouds-frozen-a");
      await frames();
      const fixed1 = await raw("clouds-frozen-b");
      assert.equal(
        fixed0,
        fixed1,
        "Frozen scene must not shimmer or randomly regenerate",
      );
      const offsets = [];
      for (let i = 0; i < 3; i++) {
        if (i) await simulate(10);
        await raw(`clouds-moving-${i}`);
        offsets.push(
          await page.evaluate(() =>
            window.__UAV__.atmosphere.cloudMaterial.uniforms.uOffset.value.toArray(),
          ),
        );
      }
      assert.ok(
        Math.hypot(
          offsets[2][0] - offsets[0][0],
          offsets[2][1] - offsets[0][1],
        ) > 5,
      );
      checks.push(
        "Frozen raw WebGL frames are byte-identical; three cloud-motion frames use continuously integrated wind offsets",
      );
      await view("Ground");
      await position([-23.5, 0.3, 5], [-25.5, 0.07, 1]);
      for (let i = 0; i < 3; i++) {
        if (i) await simulate(0.4);
        await raw(`grass-wind-${i}`);
      }
    }
    if (!section || section === "missions") {
      for (const id of ["figure-eight", "outer-circuit"]) {
        await page.getByLabel("Bài bay mẫu", { exact: true }).selectOption(id);
        await view("Top down");
        await capture(
          id === "figure-eight"
            ? "figure-eight-preview"
            : "outer-circuit-preview",
        );
      }
      await page
        .getByRole("checkbox", { name: "Nhãn mốc sân", exact: true })
        .check();
      await capture("compact-engineering-labels");
      await page
        .getByRole("checkbox", { name: "Nhãn mốc sân", exact: true })
        .uncheck();
      await weather("Clear skies");
      await page
        .getByRole("button", { name: "Đặt lại tại H", exact: true })
        .click({ noWaitAfter: true });
      await page
        .getByLabel("Bài bay mẫu", { exact: true })
        .selectOption("figure-eight");
      await page
        .getByRole("button", { name: "Bắt đầu bay mẫu", exact: true })
        .first()
        .click({ noWaitAfter: true });
      await page.evaluate(() => {
        const d = window.__UAV__.drone;
        d.paused = false;
        for (let i = 0; i < 240 / 0.004; i++) {
          d.advance(0.004);
          if (
            d.missionPhase === "RETURN_TO_H" &&
            Math.hypot(d.position.x + 20, d.position.z) < 4
          )
            break;
        }
        d.paused = true;
        if (d.missionPhase !== "RETURN_TO_H")
          throw new Error("No physical return approach");
      });
      await view("Follow");
      await capture("return-to-h-approach");
      await capture("drone-flight");
      await view("FPV");
      await capture("fpv-flight");
      await page
        .getByRole("button", { name: "Đặt lại tại H", exact: true })
        .click({ noWaitAfter: true });
      await page.evaluate(() => (window.__UAV__.drone.paused = true));
      await view("Overview");
      await page.setViewportSize({ width: 390, height: 844 });
      await frames();
      await capture("mobile-controls");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      const mobile = await page
          .getByLabel("Bài bay mẫu trên màn hình nhỏ", { exact: true })
          .boundingBox(),
        button = await page
          .getByRole("button", { name: "Bắt đầu bay mẫu", exact: true })
          .last()
          .boundingBox();
      assert.ok(mobile && button && mobile.y + mobile.height < button.y);
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page
        .getByLabel("Chất lượng hình ảnh", { exact: true })
        .selectOption("Low");
      await profile("Low overview");
    }
  }
  if (section === "quality") {
    await view("Ground");
    await position([-23.5, 0.3, 5], [-25.5, 0.07, 1]);
    for (const quality of ["Low", "Medium", "High", "Ultra"]) {
      await page
        .getByLabel("Chất lượng hình ảnh", { exact: true })
        .selectOption(quality);
      await frames();
      assert.equal(await page.evaluate(() => window.__UAV__.quality), quality);
    }
    await capture("ultra-grass-depth");
    await view("Overview");
    await page
      .getByLabel("Chất lượng hình ảnh", { exact: true })
      .selectOption("Low");
    for (const preset of [
      "Clear skies",
      "Partly cloudy",
      "Overcast",
      "Light rain",
      "Heavy rain",
      "Wind & gusts",
    ]) {
      await weather(preset);
      const state = await page.evaluate(() => ({
        rain: window.__UAV__.atmosphere.rain.visible,
        wind: window.__UAV__.weather.current.wind,
      }));
      assert.equal(
        state.rain,
        preset === "Light rain" || preset === "Heavy rain",
      );
      assert.ok(Number.isFinite(state.wind));
    }
    checks.push(
      "All four presets render near vegetation, including matching Ultra shadow shaders; all six weather presets blend without errors",
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(requests.length, 0, requests.join("\n"));
  const result = {
    browser: await browser.version(),
    viewport: [1600, 1000],
    bundle: await page.locator("script[type=module]").getAttribute("src"),
    shots,
    profiles,
    checks,
    errors,
    requests,
    note: "Real Chrome WebGL2 captures. Software-renderer results are not hardware GPU performance. Inspect images for subjective visual quality.",
  };
  await writeFile(
    process.env.UAV_PAINT_ONLY
      ? "docs/paint-evidence.json"
      : process.env.UAV_VISUAL_QUICK
        ? "docs/visual-quick-evidence.json"
        : section
          ? `docs/visual-${section}-evidence.json`
          : "docs/visual-evidence.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({ shots: shots.length, profiles, checks, errors }, null, 2),
  );
} catch (error) {
  await writeFile(
    "docs/visual-failure.json",
    JSON.stringify(
      {
        error: String(error),
        section,
        shots,
        profiles,
        checks,
        errors,
        requests,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
