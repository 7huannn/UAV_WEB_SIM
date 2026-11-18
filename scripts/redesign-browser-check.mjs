import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(60000);
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
const frames = () =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
async function capture(name) {
  await frames();
  await page.screenshot({
    path: `docs/redesign-screenshots/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  screenshots.push(name);
  console.log("Captured", name);
}
async function overflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "horizontal overflow",
  );
}
async function home() {
  await button("Về trang chủ UAV ARENA").click();
  await frames();
}
async function switchTo(name) {
  await page.getByLabel("Chuyển không gian", { exact: true }).click();
  await page
    .locator(".context-switch")
    .getByRole("button", { name, exact: true })
    .click();
  await frames();
}
await mkdir("docs/redesign-screenshots", { recursive: true });
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
async function physicallyFlyRoute() {
  return page.evaluate(() => {
    const w = window.__UAV__,
      d = w.drone,
      s = w.session,
      task = s.attempt.profile.tasks.find((t) => t.kind === "route"),
      points = s.attempt.referencePaths[task.id];
    s.event(
      "TEST_INPUT_FIXTURE",
      "Synthetic RC through the existing fixed-step integrator, not human or hardware evidence",
    );
    s.attempt.result.limitations.push(
      "Synthetic software RC fixture; not human or physical controller validation",
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
    const gates = [],
      length = distances.at(-1);
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
    const bound = (n, min, max) => Math.max(min, Math.min(max, n));
    let maxStep = 0;
    d.paused = false;
    w.inputFocused = true;
    w.input.fault = "";
    for (let i = 0; i < 250 * 400 && s.state === "ACTIVE"; i++) {
      const goal =
        s.task?.kind === "route"
          ? gates[Math.min(s.gate, gates.length - 1)]
          : [-20, 0];
      const vx = bound((goal[0] - d.target.x) * 1.6, -1.7, 1.7),
        vz = bound((goal[1] - d.target.z) * 1.6, -1.7, 1.7),
        vy = bound((5.32 - d.target.y) * 1.6, -1.25, 1.25),
        q = d.orientation,
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
    };
  });
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  await capture("home-desktop");
  await overflow();
  assert.equal(await page.locator(".workspace-navigation").count(), 0);
  assert.equal(await page.getByText("Giảng viên", { exact: true }).count(), 0);
  assert.equal(await button("Bắt đầu luyện tập").count(), 1);
  checks.push(
    "Homepage uses one primary practice entry; no instructor or permanent destination menu",
  );
  await button("Bắt đầu luyện tập").click();
  await capture("exercise-selection");
  await button("Vào sân bay").click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "READY");
  assert.deepEqual(
    await page.evaluate(() => window.__UAV__.session.attempt.preflight),
    [],
  );
  assert.equal(
    await page.getByText("Kiểm tra trước bay", { exact: true }).count(),
    0,
  );
  await capture("ready");
  await button("Bắt đầu bay").click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "ACTIVE");
  await page.keyboard.down("KeyR");
  await page.waitForFunction(() => window.__UAV__.drone.altitude > 0.3);
  await page.keyboard.up("KeyR");
  await capture("flight");
  const optics = await page.evaluate(() => {
    const w = window.__UAV__;
    return {
      eye: w.camera.position.toArray(),
      zoom: w.camera.zoom,
      scale: (w.loadedAirframe ?? w.airframe.group).scale.toArray(),
    };
  });
  await page
    .locator(".view-tools>details:not(.conditions-control)>summary")
    .click();
  await button("Nhìn trái").click();
  await frames();
  assert.deepEqual(
    await page.evaluate(() => window.__UAV__.camera.position.toArray()),
    optics.eye,
  );
  await button("Nhìn thẳng").click();
  await page.getByLabel("Hiện vị trí dưới máy bay", { exact: true }).uncheck();
  assert.equal(
    await page.evaluate(() => window.__UAV__.groundGuideEnabled),
    false,
  );
  await page.getByLabel("Hiện vị trí dưới máy bay", { exact: true }).check();
  assert.equal(optics.zoom, 1);
  assert.deepEqual(optics.scale, [1, 1, 1]);
  await page
    .locator(".view-tools>details:not(.conditions-control)>summary")
    .click();
  checks.push(
    "Contextual look controls preserve fixed eye, unit aircraft scale and zoom; training ground-guide toggle remains functional",
  );
  await button("Tạm dừng").click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "PAUSED");
  await capture("paused");
  await button("Tiếp tục bài bay").click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "ACTIVE");
  checks.push(
    "Exercise enters READY without physical checks; one start action arms and starts; real keyboard climbs; pause/resume works",
  );
  await button("Tạm dừng").click();
  await button("Kết thúc và lưu bản ghi").click();
  await page.waitForFunction(() => window.__UAV__.session?.state === "ABORTED");
  await page
    .getByText("Đã lưu bản ghi trên thiết bị", { exact: true })
    .waitFor();
  await capture("aborted-result");
  await button("Xem lại đường bay").click();
  await page.waitForFunction(() => !!window.__UAV__.replay);
  await capture("replay");
  await page.getByLabel("Thời điểm phát lại", { exact: true }).fill("0.2");
  await button("Phát lại").click();
  await page.waitForFunction(() => window.__UAV__.replay.time > 0.2);
  await button("Tạm dừng phát lại").click();
  await page.getByLabel("Tốc độ phát lại", { exact: true }).selectOption("2");
  await page.locator("summary").filter({ hasText: "Ghi chú của bạn" }).click();
  await page
    .getByLabel("Nội dung ghi chú", { exact: true })
    .fill("Cần giữ độ cao ổn định hơn.");
  await button("Lưu ghi chú").click();
  await page.getByText("Đã lưu ghi chú.", { exact: true }).waitFor();
  const dl = page.waitForEvent("download");
  await button("Xuất JSON").click();
  const download = await dl;
  assert.match(download.suggestedFilename(), /\.json$/);
  const legacy = JSON.parse(await readFile(await download.path(), "utf8"));
  legacy.payload.id = "legacy-recording-check";
  legacy.payload.candidate = "Bản ghi cũ";
  legacy.payload.preflight = [true, true, false, true];
  legacy.payload.postflight = [true, false];
  legacy.annotations = legacy.annotations.map((n) => ({
    ...n,
    attemptId: legacy.payload.id,
  }));
  legacy.sha256 = createHash("sha256")
    .update(JSON.stringify(legacy.payload))
    .digest("hex");
  await page
    .getByLabel("Nhập bản ghi mô phỏng JSON", { exact: true })
    .setInputFiles({
      name: "legacy.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await page
    .getByText("Đã nhập bản ghi và kiểm tra tính toàn vẹn.", { exact: true })
    .waitFor();
  assert.deepEqual(
    await page.evaluate(() => window.__UAV__.replay.attempt.preflight),
    [true, true, false, true],
  );
  await page
    .getByLabel("Nhập bản ghi mô phỏng JSON", { exact: true })
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
  await page.getByText(/Không thể nhập tệp/).waitFor();
  checks.push(
    "Legacy recordings with physical checklist fields still import unchanged; invalid imports fail without losing existing records",
  );
  checks.push(
    "Aborted flight is saved to IndexedDB; replay opens, scrubs, plays, pauses, changes speed, saves personal notes and exports JSON",
  );
  await switchTo("Cài đặt");
  assert.equal(await page.evaluate(() => window.__UAV__.replay), null);
  await capture("settings");
  await page.getByLabel("Hiển thị", { exact: true }).selectOption("Medium");
  assert.equal(await page.evaluate(() => window.__UAV__.quality), "Medium");
  await page.getByLabel("Hiển thị", { exact: true }).selectOption("Low");
  assert.equal(await page.getByLabel("Mức gió", { exact: true }).count(), 0);
  await button("Hiệu chỉnh tay điều khiển").click();
  await page
    .getByText("Cài đặt nâng cao · hiệu chỉnh tay điều khiển", { exact: true })
    .click();
  await capture("calibration");
  await button("Về cài đặt").click();
  await home();
  await button("Bài bay và tiêu chí").click();
  await capture("criteria");
  await page.locator(".back-link").click();
  checks.push(
    "Context switch closes replay and restores weather; graphics and calibration remain in settings, learning criteria are accessible from home",
  );
  await home();
  await button("Thử sức với bài thi").click();
  await capture("test-selection");
  await page.getByRole("button", { name: /Đường bay số 8/ }).click();
  await button("Vào sân bay").click();
  await button("Bắt đầu bay").click();
  const strict = await page.evaluate(() => {
    const w = window.__UAV__;
    return {
      state: w.session.state,
      route: w.setRoute(true),
      camera: w.setCamera("Overview"),
      guide: w.setGroundGuide(true),
      weather: w.setWeatherLevels(8, 8),
    };
  });
  assert.equal(strict.state, "ACTIVE");
  assert.equal(strict.route, false);
  assert.equal(strict.camera, false);
  assert.equal(strict.guide, false);
  assert.equal(strict.weather, false);
  const complete = await physicallyFlyRoute();
  assert.equal(complete.state, "TASK_COMPLETE");
  assert.ok(complete.maxStep < 0.02);
  assert.ok(complete.completed.includes("route"));
  await capture("route-complete");
  await button("Bắt đầu hạ cánh thủ công").click();
  await fast(5.5, { throttle: -0.5, yaw: 0, pitch: 0, roll: 0 });
  await fast(8);
  assert.ok(await page.evaluate(() => window.__UAV__.drone.altitude < 0.08));
  await button("Tắt động cơ").click();
  await fast(2);
  await page.waitForFunction(
    () => window.__UAV__.session.state === "POSTFLIGHT",
  );
  await capture("landed");
  await button("Hoàn tất bài bay").click();
  await page
    .getByText("Đã lưu bản ghi trên thiết bị", { exact: true })
    .waitFor();
  await capture("finished-result");
  await button("Xem lại đường bay").click();
  await page.waitForFunction(
    () => window.__UAV__.replay?.attempt.status === "FINISHED",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("completed-replay-mobile");
  await overflow();
  const replayBounds = await page.locator(".replay-window").boundingBox(),
    canvasBounds = await page.locator(".viewport canvas").boundingBox();
  assert.ok(
    Math.abs(replayBounds.y - canvasBounds.y) < 2,
    "mobile replay canvas aligns with its controls",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await home();
  await button("Xem bay mẫu tự động").click();
  await button("Xem bay mẫu").click();
  await page.waitForFunction(() => window.__UAV__.drone.missionActive);
  await button("Tạm dừng bay mẫu").click();
  await page.waitForFunction(() => window.__UAV__.drone.missionPaused);
  await button("Tiếp tục bay mẫu").click();
  await capture("reference-demo");
  await button("Dừng bài mẫu").click();
  await button("Đặt lại về H").click();
  await home();
  await button("Bắt đầu luyện tập").click();
  await page.locator(".setup-options>summary").click();
  await button("Dùng tay điều khiển").click();
  await page.waitForFunction(() => !!window.__UAV__.input.fault);
  assert.ok(await button("Vào sân bay").isDisabled());
  await page
    .locator(".input-recovery")
    .getByRole("button", { name: "Dùng bàn phím", exact: true })
    .click();
  assert.ok(await button("Vào sân bay").isEnabled());
  await button("Vào sân bay").click();
  await button("Chọn bài khác").click();
  assert.equal(await page.evaluate(() => window.__UAV__.session), null);
  await button("Vào sân bay").click();
  await button("Bắt đầu bay").click();
  await button("Về trang chủ UAV ARENA").click();
  await page.getByRole("dialog").waitFor();
  await button("Ở lại bài bay").click();
  await page.waitForFunction(() => window.__UAV__.session.state === "PAUSED");
  await button("Về trang chủ UAV ARENA").click();
  await button("Lưu và rời bài bay").click();
  await page.locator(".home").waitFor();
  await button("Bắt đầu luyện tập").click();
  assert.equal(await page.evaluate(() => window.__UAV__.session), null);
  checks.push(
    "Full figure-eight through unchanged force integrator completes every ordered gate, manual landing and shutdown, final save and responsive replay; strict exam rejects aids",
  );
  checks.push(
    "Reference demo starts/pauses/resumes/stops; disconnected gamepad blocks entry with keyboard recovery; ready can return to selection; leaving active flight pauses, cancels safely or saves before returning home",
  );
  await button("Hướng dẫn sử dụng").click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  checks.push(
    "Test flight and accessible help modal open; Escape restores focus",
  );
  for (const size of [
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 683, height: 384 },
  ]) {
    await page.setViewportSize(size);
    await home();
    await capture(`home-${size.width}`);
    await overflow();
    await button("Bắt đầu luyện tập").click();
    await capture(`practice-${size.width}`);
    await overflow();
    await switchTo("Cài đặt");
    await capture(`settings-${size.width}`);
    await overflow();
    await switchTo("Xem lại bài bay");
    await capture(`review-${size.width}`);
    await overflow();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home();
  assert.equal(
    await page
      .locator(".home")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  checks.push(
    "Desktop/tablet/390px mobile/200%-equivalent viewport reflow without horizontal overflow; reduced motion disables transitions",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "docs/redesign-browser-evidence.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        checks,
        screenshots,
        errors,
        limits: [
          "Software WebGL rendering; no physical RC hardware or human usability validation",
          "683×384 is a zoom-equivalent CSS viewport, not native browser zoom",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { checks, screenshots: screenshots.length, errors },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e);
  try {
    await page.screenshot({
      path: "/tmp/uav-redesign-failure.png",
      fullPage: true,
      timeout: 5000,
    });
  } catch {}
  process.exitCode = 1;
} finally {
  await browser.close();
}
