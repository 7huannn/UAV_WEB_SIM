import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const base = process.env.UAV_URL ?? "http://127.0.0.1:4175";
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
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(30000);
const checks = [],
  errors = [],
  screenshots = [],
  perspective = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) =>
  errors.push(r.url() + ": " + r.failure()?.errorText),
);
page.on("dialog", (d) => d.accept());
await mkdir("docs/ux-screenshots", { recursive: true });
const frames = () =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const button = (name) => page.getByRole("button", { name, exact: true });
async function nav(name) {
  const n = page.getByRole("navigation", { name: "Điều hướng chính" });
  if (
    [
      "Cài đặt tay điều khiển",
      "Bài bay và tiêu chí",
      "Bay mẫu tự động",
    ].includes(name)
  )
    await n.locator(".workspace-more summary").click();
  await n.getByRole("button", { name, exact: true }).click();
  await frames();
}
async function capture(name, locator) {
  await frames();
  if (locator)
    await locator.screenshot({ path: `docs/ux-screenshots/${name}.png` });
  else
    await page.screenshot({
      path: `docs/ux-screenshots/${name}.png`,
      fullPage: true,
    });
  screenshots.push(name);
  console.log("Captured", name);
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
}
async function fast(seconds) {
  await page.evaluate((seconds) => {
    const w = window.__UAV__;
    w.drone.paused = false;
    for (let i = 0; i < Math.ceil(seconds / 0.004); i++) w.drone.advance(0.004);
    w.drone.paused = true;
  }, seconds);
  await frames();
}
async function aimForSnapshot() {
  // Test-only deliberate head turn once at a capture. Production camera never tracks.
  const delta = await page.evaluate(() => {
    const w = window.__UAV__,
      s = w.pilotStation,
      p = w.drone.position;
    return [
      (Math.atan2(p.z - s.z, p.x - s.x) - w.headYaw) / 0.003,
      -(
        Math.atan2(
          p.y - s.groundY - s.eyeHeight,
          Math.hypot(p.x - s.x, p.z - s.z),
        ) - w.headPitch
      ) / 0.003,
    ];
  });
  const b = await page.locator(".viewport canvas").boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    b.x + b.width / 2 + delta[0],
    b.y + b.height / 2 + delta[1],
    { steps: 5 },
  );
  await page.mouse.up();
  await frames();
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  await frames();
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  assert.equal(await page.locator(".home-actions>button").count(), 4);
  assert.ok(
    !/telemetry|quaternion|deadzone|PID/i.test(
      await page.locator(".learner-home").innerText(),
    ),
  );
  await capture("vietnamese-home-desktop");
  checks.push(
    "Vietnamese home has four task choices without engineering controls",
  );
  // Real keyboard activation of native controls and a visible focus ring.
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Luyện tập", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await frames();
  assert.ok(
    await page
      .getByRole("heading", { name: "Chọn chế độ", exact: true })
      .isVisible(),
  );
  await page
    .locator(".setup-guide")
    .getByRole("button", { name: "Luyện tập", exact: true })
    .click();
  await page
    .getByLabel("Chọn bài bay", { exact: true })
    .selectOption("outer-circuit");
  if ((await page.locator('.task-group').filter({has: page.locator('summary>b', {hasText: /^Điều kiện bay$/})}).getAttribute('open')) === null)
    await page.locator('.task-group>summary').filter({hasText: 'Điều kiện bay'}).click();
  await page.getByLabel("Mức gió", { exact: true }).fill("2");
  await button("Tiếp theo").click();
  await button("Dùng tay điều khiển").click();
  await frames();
  await page
    .getByText("Chưa tìm thấy tay điều khiển", { exact: true })
    .waitFor();
  await capture("controller-connection-error");
  await button("Dùng bàn phím").click();
  await capture("controller-simple-check");
  await button("Tiếp theo").click();
  assert.ok(await page.getByRole("heading", { name: "Sẵn sàng bắt đầu", exact: true }).isVisible());
  await button("Chuẩn bị bài bay").focus();
  await page.keyboard.press("Space");
  await frames();
  assert.equal(
    await page.evaluate(() => window.__UAV__.session.state),
    "PREFLIGHT",
  );
  assert.equal(await page.evaluate(() => window.__UAV__.drone.paused), false);
  checks.push(
    "Optional four-step setup, native keyboard activation and actionable controller fault; no false hardware compatibility",
  );
  await button("Hủy chuẩn bị").click();
  await page.waitForTimeout(300);
  await button("Thử lại từ H").click();
  // Convenience weather preferences are independent of instructor assessment settings.
  await button("Bỏ qua hướng dẫn")
    .isVisible()
    .then(async (yes) => {
      if (yes) await button("Bỏ qua hướng dẫn").click();
    });
  const weatherGroup = page.locator('.task-group').filter({has: page.locator('summary>b', {hasText: /^Điều kiện bay$/})});
  if ((await weatherGroup.getAttribute('open')) === null) await weatherGroup.locator('summary').click();
  for (let n = 0; n <= 10; n++) {
    await page.getByLabel("Mức gió", {exact: true}).fill(String(n));
    const actual = await page.evaluate(() => { const t = window.__UAV__.weather.target; return [t.wind, t.gust, t.turbulence]; });
    for (const [i, factor] of [.9, .4, .07].entries()) assert.ok(Math.abs(actual[i] - n * factor) < 1e-8);
    await page.getByLabel("Mức mưa", {exact: true}).fill(String(n));
    assert.equal(await page.evaluate(() => window.__UAV__.weather.target.rain), n / 10);
  }
  await page.getByLabel("Mức gió", {exact: true}).fill("2");
  await page.getByLabel("Mức mưa", {exact: true}).fill("3");
  await capture("wind-simple-selector");
  await page.reload({waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await nav('Luyện tập');
  if ((await page.locator('.task-group').filter({has: page.locator('summary>b', {hasText: /^Điều kiện bay$/})}).getAttribute('open')) === null)
    await page.locator('.task-group>summary').filter({hasText: 'Điều kiện bay'}).click();
  assert.equal(await page.getByLabel("Mức gió", {exact: true}).inputValue(), '2');
  assert.equal(await page.getByLabel("Mức mưa", {exact: true}).inputValue(), '3');
  assert.equal(await page.evaluate(() => window.__UAV__.weather.target.wind), 1.8);
  checks.push('Eleven discrete wind/rain levels map to the shared engine, remain independent and persist separately from assessment');
  // Fixed camera: controls and wheel only rotate, and FOV never depends on aircraft distance.
  await page.locator(".training-panel").evaluate((e) => (e.scrollTop = 0));
  const initial = await page.evaluate(() => {
    const w = window.__UAV__;
    return {
      station: w.pilotStation,
      eye: w.camera.position.toArray(),
      q: w.camera.quaternion.toArray(),
      fov: w.camera.fov,
    };
  });
  const geom = JSON.parse(
    await readFile("src/arena/arenaGeometry.json", "utf8"),
  );
  assert.equal(initial.station.x, 0);
  assert.equal(
    initial.station.z,
    geom.concrete.width / 2 + initial.station.setback,
  );
  assert.ok(
    initial.station.z > geom.concrete.width / 2 + geom.paint.v1Width / 2,
  );
  assert.deepEqual(initial.eye, [0, geom.grass.height + 1.65, 17]);
  await button("Nhìn phải").click();
  await page.locator(".head-more>summary").click();
  await button("Nhìn lên").click();
  await page.locator(".head-more>summary").click();
  await frames();
  assert.deepEqual(
    await page.evaluate(() => window.__UAV__.camera.position.toArray()),
    initial.eye,
  );
  await page.mouse.wheel(0, -500);
  await frames();
  assert.equal(await page.evaluate(() => window.__UAV__.camera.zoom), 1);
  assert.equal(
    await page.evaluate(() => window.__UAV__.camera.fov),
    initial.fov,
  );
  await button("Nhìn thẳng").click();
  await frames();
  const q = await page.evaluate(() =>
    window.__UAV__.camera.quaternion.toArray(),
  );
  assert.ok(q.every((n, i) => Math.abs(n - initial.q[i]) < 1e-8));
  await capture("pilot-front-view");
  checks.push(
    "Derived midpoint station outside V1, 1.65m eye, head buttons/recenter, fixed position/FOV/zoom",
  );
  await nav("Cài đặt");
  assert.equal(
    await page.locator(".technical-settings").getAttribute("open"),
    null,
  );
  await capture("settings-advanced-collapsed");
  await page.locator(".technical-settings>summary").click();
  await page.locator(".technical-settings").scrollIntoViewIfNeeded();
  await capture("settings-advanced-expanded");
  await page.locator(".pilot-diagram").scrollIntoViewIfNeeded();
  await capture("pilot-station-diagram", page.locator(".pilot-diagram"));
  await page.getByLabel("Chi tiết gust", { exact: true }).fill("2.4");
  await nav("Luyện tập");
  assert.equal(
    await page.evaluate(() => window.__UAV__.weather.target.gust),
    2.4,
  );
  if ((await page.locator('.task-group').filter({has: page.locator('summary>b', {hasText: /^Điều kiện bay$/})}).getAttribute('open')) === null)
    await page.locator('.task-group>summary').filter({hasText: 'Điều kiện bay'}).click();
  assert.ok(await page.getByText('Gió: Tùy chỉnh bởi giảng viên', {exact:true}).isVisible());
  await nav("Cài đặt");
  await page.locator(".technical-settings>summary").click();
  await page.getByLabel("Pilot setback", { exact: true }).fill("");
  assert.ok(await button("Lưu vị trí người lái tạm đề xuất").isDisabled());
  assert.equal(
    await page.evaluate(() => window.__UAV__.pilotStation.setback),
    3.5,
  );
  await page.getByLabel("Pilot setback", { exact: true }).fill("3.5");
  await page.getByLabel("Pilot eyeHeight", { exact: true }).fill("1.7");
  await button("Lưu vị trí người lái tạm đề xuất").click();
  assert.equal(
    await page.evaluate(() => window.__UAV__.pilotStation.eyeHeight),
    1.7,
  );
  await page
    .getByLabel("PILOT — Vị trí người điều khiển và hướng nhìn", {
      exact: true,
    })
    .check();
  assert.equal(
    await page.evaluate(() => window.__UAV__.pilotMarker.visible),
    true,
  );
  await page.locator(".training-scene-tools .camera-aids>summary").click();
  await button("Nhìn từ trên").click();
  await capture("pilot-technical-marker");
  await button("Góc người lái").click();
  await page.locator(".training-scene-tools .camera-aids>summary").click();
  await page.getByLabel("Hiển thị", { exact: true }).selectOption("Low");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  assert.equal(
    await page.evaluate(() => window.__UAV__.pilotStation.eyeHeight),
    1.7,
  );
  assert.equal(await page.evaluate(() => window.__UAV__.quality), "Low");
  checks.push(
    "Advanced settings initially collapsed; station diagram/optional marker; valid station and display quality persist",
  );
  await nav("Giảng viên");
  await page.getByLabel("Mức gió thi thử", {exact:true}).fill("4");
  await page.getByLabel("Mức mưa thi thử", {exact:true}).fill("6");
  await capture("instructor-dashboard");
  await nav("Thi thử");
  assert.equal(
    await page.evaluate(() => window.__UAV__.weather.target.wind),
    3.6,
  );
  const skip = button("Bỏ qua hướng dẫn");
  if (await skip.isVisible()) await skip.click();
  assert.equal(await page.getByLabel("Mức gió", { exact: true }).count(), 0);
  assert.deepEqual(
    await page.evaluate(() => {
      const w = window.__UAV__;
      return [
        w.setSimpleWeather("calm", "clear"),
        w.setAdvancedWeather("wind", 0),
        w.setWeatherPreset("Clear skies"),
        w.setWeatherLevels(0, 0),
      ];
    }),
    [false, false, false, false],
  );
  await button("Chuẩn bị bài bay").click();
  const strict = await page.evaluate(() => {
    const w = window.__UAV__,
      before = JSON.stringify(w.weather.target);
    return {
      camera: w.setCamera("Overview"),
      marker: w.setPilotMarker(true),
      wind: w.setSimpleWeather("calm", "clear"),
      advanced: w.setAdvancedWeather("wind", 0),
      home: w.setWorkspace("Home"),
      unchanged: before === JSON.stringify(w.weather.target),
      record: JSON.stringify(w.session.attempt.initialWeather) === before,
      markerVisible: w.pilotMarker.visible,
      route: w.routeVisible,
    };
  });
  assert.deepEqual(strict, {
    camera: false,
    marker: false,
    wind: false,
    advanced: false,
    home: false,
    unchanged: true,
    record: true,
    markerVisible: false,
    route: false,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await frames();
  await capture("mock-examination-laptop");
  await noOverflow();
  assert.ok(
    !(await page.locator(".training-panel").innerText()).includes("PREFLIGHT"),
  );
  checks.push(
    "Instructor assessment weather separate from learner preferences, captured exactly and locked with cameras/marker/navigation in mock",
  );
  await button("Hủy chuẩn bị").click();
  await nav("Luyện tập");
  assert.equal(
    await page.evaluate(() => window.__UAV__.weather.target.gust),
    0.8,
  );
  // The prior reload intentionally restores the simple light/cloudy convenience preset.
  // Renderer/reference demonstration remains the original force-driven mission.
  await nav("Bay mẫu tự động");
  await page
    .getByLabel("Kịch bản thời tiết", { exact: true })
    .selectOption("Clear skies");
  await page.evaluate(() => {
    const w = window.__UAV__;
    w.weather.current = {
      ...w.weather.target,
      wind: 0,
      gust: 0,
      turbulence: 0,
    };
    w.weather.target = { ...w.weather.current };
    w.drone.reset();
    w.setCamera("PILOT VLOS");
  });
  await button("Góc người lái").click();
  const fixedEye = await page.evaluate(() =>
    window.__UAV__.camera.position.toArray(),
  );
  for (const id of ["figure-eight", "outer-circuit"]) {
    await page.evaluate((id) => {
      const w = window.__UAV__;
      w.drone.reset();
      w.selectMission(id);
      w.drone.mission();
    }, id);
    await fast(12);
    await aimForSnapshot();
    const viewBefore = await page.evaluate(() =>
      window.__UAV__.camera.quaternion.toArray(),
    );
    await fast(12);
    assert.deepEqual(
      await page.evaluate(() => window.__UAV__.camera.quaternion.toArray()),
      viewBefore,
    );
    await aimForSnapshot();
    await capture(`pilot-${id}`);
    for (const phase of ["first", "second"]) {
      await fast(phase === "first" ? 12 : 25);
      await aimForSnapshot();
      const metric = await page.evaluate(() => {
        const w = window.__UAV__,
          p = w.drone.position,
          s = w.pilotStation,
          a = p.clone(),
          b = p.clone();
        a.y -= 0.5;
        b.y += 0.5;
        a.project(w.camera);
        b.project(w.camera);
        return {
          position: p.toArray(),
          distance: Math.hypot(p.x - s.x, p.z - s.z),
          pixelHeight:
            (Math.abs(a.y - b.y) * w.renderer.domElement.clientHeight) / 2,
          eye: w.camera.position.toArray(),
          fov: w.camera.fov,
          zoom: w.camera.zoom,
          scale: (w.loadedAirframe ?? w.airframe.group).scale.toArray(),
          phase: w.drone.missionPhase,
        };
      });
      perspective.push({ mission: id, capture: phase, ...metric });
      assert.deepEqual(metric.eye, fixedEye);
      assert.equal(metric.zoom, 1);
      assert.deepEqual(metric.scale, [1, 1, 1]);
      if (id === "outer-circuit") await capture(`pilot-distance-${phase}`);
    }
    await page.evaluate(() => {
      const w = window.__UAV__;
      w.drone.hold();
      w.drone.disarm();
      w.drone.reset();
    });
  }
  checks.push(
    "Pilot View works in both original force-integrated reference missions; quaternion stays fixed during aircraft movement; distance captures preserve eye/FOV/unit scale",
  );
  await nav("Luyện tập");
  await page.setViewportSize({ width: 1366, height: 768 });
  await frames();
  await capture("training-laptop");
  await noOverflow();
  const controls = await page
    .locator(".head-controls button,.workspace-navigation>button")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => !n.disabled && n.getBoundingClientRect().height > 0)
        .map((n) => ({
          text: n.innerText,
          height: n.getBoundingClientRect().height,
          width: n.getBoundingClientRect().width,
          font: getComputedStyle(n).fontSize,
        })),
    );
  assert.ok(
    controls.every(
      (x) => x.height >= 44 && x.width >= 44 && parseFloat(x.font) >= 16,
    ),
  );
  checks.push(
    "Desktop/laptop primary navigation and head controls have >=44px targets and >=16px type",
  );
  await page.setViewportSize({ width: 1024, height: 768 });
  await nav("Cài đặt");
  await frames();
  await capture("settings-tablet");
  await noOverflow();
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("Cài đặt tay điều khiển");
  await frames();
  await capture("controller-mobile");
  await noOverflow();
  await nav("Trang chủ");
  await capture("home-mobile");
  await noOverflow();
  assert.ok(
    await page
      .getByText("Màn hình nhỏ phù hợp cài đặt và xem lại.", { exact: false })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Hướng dẫn sử dụng", exact: true })
    .click();
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  checks.push(
    "Tablet and 390px mobile configuration/review layout, explicit fidelity caveat and keyboard-contained help dialog",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "docs/ux-browser-evidence.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        url: base,
        browser: browser.version(),
        bundle: await page.locator('script[type="module"]').getAttribute("src"),
        checks,
        screenshots,
        perspective,
        controls,
        errors,
        note: "Reference missions and capture-only scripted head turns are software QA; no human usability or RC hardware validation.",
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
} catch (e) {
  await page.screenshot({ path: "/tmp/uav-ux-failure.png", fullPage: true });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
