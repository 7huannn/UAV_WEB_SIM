const evidenceRoot = process.env.UAV_EVIDENCE_DIR ?? "docs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const errors = [],
  checks = [],
  screenshots = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) =>
  errors.push(r.url() + ": " + r.failure()?.errorText),
);
const button = (name) => page.getByRole("button", { name, exact: true });
const home = () => button("Về trang chủ UAV ARENA").click();
const conditions = () => page.locator(".conditions-control>summary").click();
const wind = () => page.getByLabel("Mức gió", { exact: true });
const rain = () => page.getByLabel("Mức mưa", { exact: true });
async function capture(name) {
  await page.evaluate(async () => {
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations !== Infinity)
        animation.finish();
    }
  });
  await page.screenshot({
    path: `${evidenceRoot}/conditions-screenshots/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  screenshots.push(name);
  console.log("Captured", name);
}
async function layout() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "horizontal overflow",
  );
  const bounds = await page.locator(".conditions-panel").boundingBox();
  const viewport = page.viewportSize();
  assert.ok(
    bounds.x >= 0 &&
      bounds.y >= 60 &&
      bounds.x + bounds.width <= viewport.width &&
      bounds.y + bounds.height <= viewport.height,
    JSON.stringify(bounds),
  );
  await wind().scrollIntoViewIfNeeded();
  await rain().scrollIntoViewIfNeeded();
  assert.ok(await rain().isVisible());
  assert.ok(
    await page.locator(".conditions-panel").evaluate((panel) => {
      const bounds = panel.getBoundingClientRect();
      for (let y = bounds.top + 12; y < bounds.bottom - 12; y += 24) {
        for (const x of [
          bounds.left + 12,
          bounds.left + bounds.width / 2,
          bounds.right - 16,
        ]) {
          if (!panel.contains(document.elementFromPoint(x, y))) return false;
        }
      }
      return true;
    }),
    "another control overlays the conditions panel",
  );
}
try {
  await mkdir(`${evidenceRoot}/conditions-screenshots`, { recursive: true });
  await page.goto(process.env.UAV_URL ?? "http://127.0.0.1:4175", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  const bundle = await page
    .locator("script[type=module][src]")
    .last()
    .getAttribute("src");
  await capture("home-desktop");
  await button("Bài bay và tiêu chí").click();
  await page.getByRole("heading", { name: "Bài bay & tiêu chí" }).waitFor();
  assert.equal(await page.locator(".criteria-grid ol").count(), 4);
  await capture("criteria");
  await page.locator(".back-link").click();
  await button("Cài đặt của bạn").click();
  assert.equal(await wind().count(), 0);
  assert.equal(await button("Bài bay và tiêu chí").count(), 0);
  assert.equal(await button("Xem bay mẫu tự động").count(), 0);
  await capture("settings-desktop");
  checks.push(
    "Home learning links reach criteria; contextual return goes home; obsolete settings weather and discovery controls removed",
  );
  await home();
  await button("Bắt đầu luyện tập").click();
  assert.equal(await wind().count(), 0);
  for (const exercise of [
    "Làm quen bầu trời",
    "Đường bay số 8",
    "Chinh phục vòng sân",
    "Bình tĩnh xử lý",
  ]) {
    await page.getByRole("button", { name: new RegExp(exercise) }).click();
    await button("Vào sân bay").click();
    await conditions();
    await wind().fill("3");
    await rain().fill("4");
    const before = await page.evaluate(() => {
      const w = window.__UAV__;
      return {
        state: w.session.state,
        initial: w.session.attempt.initialWeather,
        current: w.weather.current,
        target: w.weather.target,
        time: w.drone.time,
        frames: w.session.attempt.frames.length,
      };
    });
    assert.equal(before.state, "READY");
    assert.equal(before.target.wind, 2.7);
    assert.equal(before.target.rain, 0.4);
    assert.deepEqual(before.initial, before.target);
    assert.deepEqual(before.current, before.target);
    assert.equal(before.frames, 0);
    await layout();
    await capture(
      `ready-${exercise === "Làm quen bầu trời" ? "basic" : exercise === "Đường bay số 8" ? "eight" : exercise === "Chinh phục vòng sân" ? "circuit" : "abnormal"}`,
    );
    await button("Không gió, không mưa").click();
    await button("Đóng điều kiện bay").click();
    if (exercise !== "Bình tĩnh xử lý") await button("Chọn bài khác").click();
  }
  checks.push(
    "Conditions available in all four practice maps before start; initial recording and actual weather match selected levels without advancing physics",
  );
  await button("Bắt đầu bay").click();
  await page.keyboard.down("KeyR");
  await page.waitForFunction(() => window.__UAV__.drone.altitude > 0.4);
  await page.keyboard.up("KeyR");
  await conditions();
  await page.waitForFunction(() => window.__UAV__.session.state === "PAUSED");
  const paused = await page.evaluate(() => ({
    id: window.__UAV__.session.attempt.id,
    position: window.__UAV__.drone.position.toArray(),
    time: window.__UAV__.drone.time,
    frames: window.__UAV__.session.attempt.frames.length,
    initial: window.__UAV__.session.attempt.initialWeather,
    seed: window.__UAV__.weather.seed,
  }));
  await wind().fill("4");
  await rain().fill("7");
  await wind().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  assert.equal(
    await page.evaluate(() => window.__UAV__.session.state),
    "PAUSED",
  );
  const changed = await page.evaluate(() => ({
    id: window.__UAV__.session.attempt.id,
    position: window.__UAV__.drone.position.toArray(),
    time: window.__UAV__.drone.time,
    frames: window.__UAV__.session.attempt.frames.length,
    initial: window.__UAV__.session.attempt.initialWeather,
    seed: window.__UAV__.weather.seed,
  }));
  assert.deepEqual(changed, paused);
  await capture("paused-conditions");
  await button("Đóng điều kiện bay").click();
  await button("Tiếp tục bài bay").click();
  await page.waitForFunction(() => window.__UAV__.session.state === "ACTIVE");
  await page.waitForFunction(
    () =>
      window.__UAV__.weather.current.wind > 0.2 &&
      window.__UAV__.weather.current.rain > 0.05,
  );
  const live = await page.evaluate(() => ({
    frames: window.__UAV__.session.attempt.frames.length,
    weather: window.__UAV__.weather.current,
    wetness: window.__UAV__.weather.wetness,
    event: window.__UAV__.session.attempt.events
      .filter((e) => e.code === "WEATHER_CHANGE")
      .at(-1),
    wind: window.__UAV__.weather
      .windAt(window.__UAV__.drone.time, window.__UAV__.drone.position)
      .length(),
  }));
  assert.ok(live.frames > paused.frames);
  assert.ok(live.wetness > 0 && live.wind > 0);
  assert.equal(JSON.parse(live.event.detail).rain, 0.7);
  await conditions();
  await page.waitForFunction(() => window.__UAV__.session.state === "PAUSED");
  await button("Không gió, không mưa").click();
  await page.locator(".conditions-advanced>summary").click();
  await page.getByLabel("Hướng gió (độ)", { exact: true }).fill("120");
  assert.equal(
    await page.evaluate(() => window.__UAV__.weather.target.direction),
    120,
  );
  await capture("advanced-conditions");
  await page.locator(".conditions-advanced>summary").click();
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await layout();
    await capture(`practice-${width}x${height}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await button("Đóng điều kiện bay").click();
  await button("Kết thúc và lưu bản ghi").click();
  await page
    .getByText("Đã lưu bản ghi trên thiết bị", { exact: true })
    .waitFor();
  checks.push(
    "Opening practice conditions pauses flight; keyboard sliders do not fly or resume; editing preserves ID, position, time, progress and seed; resumed wind/rain/wetness blend through existing physics and changes are recorded; advanced controls retained",
  );
  await home();
  await button("Thử sức với bài thi").click();
  await button("Vào sân bay").click();
  await conditions();
  await wind().fill("2");
  await rain().fill("3");
  await capture("exam-ready-conditions");
  await button("Đóng điều kiện bay").click();
  await button("Bắt đầu bay").click();
  await conditions();
  assert.ok(await wind().isDisabled());
  assert.ok(await rain().isDisabled());
  const locked = await page.evaluate(() => {
    const w = window.__UAV__,
      before = JSON.stringify(w.weather.target);
    const accepted = [
      w.setWeatherLevels(10, 10),
      w.setAdvancedWeather("wind", 9),
      w.setWeatherPreset("Clear skies"),
      w.setSimpleWeather("strong", "rain"),
    ];
    return {
      accepted,
      same: before === JSON.stringify(w.weather.target),
      state: w.session.state,
      initial: w.session.attempt.initialWeather,
    };
  });
  assert.deepEqual(locked.accepted, [false, false, false, false]);
  assert.ok(locked.same);
  assert.equal(locked.state, "ACTIVE");
  assert.equal(locked.initial.wind, 1.8);
  await capture("exam-locked-conditions");
  await button("Đóng điều kiện bay").click();
  await button("Tạm dừng").click();
  await conditions();
  assert.ok(await wind().isDisabled());
  await button("Đóng điều kiện bay").click();
  await button("Kết thúc và lưu bản ghi").click();
  await page
    .getByText("Đã lưu bản ghi trên thiết bị", { exact: true })
    .waitFor();
  checks.push(
    "Mock conditions editable on map before start; all four weather APIs and sliders lock after start including paused state",
  );
  await home();
  const practice = await page.evaluate(() => ({
    weather: { ...window.__UAV__.weather.target },
    stored: localStorage.getItem("uav-practice-wind-level"),
  }));
  await button("Xem bay mẫu tự động").click();
  await conditions();
  await wind().fill("5");
  await rain().fill("6");
  await capture("demo-ready-conditions");
  await button("Đóng điều kiện bay").click();
  await button("Xem bay mẫu").click();
  await page.waitForFunction(() => window.__UAV__.drone.missionActive);
  await conditions();
  await wind().fill("7");
  assert.equal(
    await page.evaluate(
      () =>
        window.__UAV__.drone.missionActive &&
        !window.__UAV__.drone.missionPaused,
    ),
    true,
  );
  await capture("demo-live-conditions");
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await layout();
    await capture(`demo-${width}x${height}`);
  }
  await button("Đóng điều kiện bay").click();
  await button("Dừng bài mẫu").click();
  await button("Đặt lại về H").click();
  await home();
  assert.deepEqual(
    await page.evaluate(() => ({
      weather: { ...window.__UAV__.weather.target },
      stored: localStorage.getItem("uav-practice-wind-level"),
    })),
    practice,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("home-mobile");
  checks.push(
    "Homepage demo entry works; conditions adjust before/during automatic demonstration without resetting mission or changing saved practice conditions; desktop/tablet/mobile/short landscape panels fit viewport",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${evidenceRoot}/conditions-browser-evidence.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        bundle,
        checks,
        screenshots,
        errors,
        limitations: [
          "Synthetic browser input and software rendering; no physical-controller or human usability validation",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      screenshots: screenshots.length,
      errors,
    }),
  );
} catch (e) {
  await page.screenshot({
    path: "/tmp/uav-conditions-failure.png",
    fullPage: true,
  });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
