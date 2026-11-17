import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
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
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const frames = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
try {
  await page.goto(process.env.UAV_URL ?? "http://localhost:4175", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.__UAV__ && !window.__UAV__.stats.loading,
  );
  assert.equal(
    await page.evaluate(() => window.__UAV__.clumps.state.ready),
    true,
  );
  const shots = process.env.UAV_PAINT_ONLY
    ? [
        ["Top down", "top-down-reference"],
        ["Overview", "aerial-clear"],
      ]
    : [
        ["Ground", "ground-concrete-detail"],
        ["Ground", "grass-closeup"],
      ];
  await page
    .getByLabel("Graphics quality", { exact: true })
    .selectOption("High");
  for (const [camera, name] of shots) {
    await page
      .getByRole("button", { name: camera, exact: true })
      .click({ noWaitAfter: true });
    if (name === "grass-closeup")
      await page.evaluate(() => {
        const w = window.__UAV__;
        w.camera.position.set(-23.5, 0.3, 5);
        w.controls.target.set(-25.5, 0.07, 1);
        w.controls.update();
      });
    await frames();
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
    console.log(`Captured ${name}`);
  }
  const state = await page.evaluate(() => ({
    stats: window.__UAV__.stats,
    clumpsReady: window.__UAV__.clumps.state.ready,
    quality: window.__UAV__.quality,
  }));
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    process.env.UAV_PAINT_ONLY
      ? "docs/paint-evidence.json"
      : "docs/visual-evidence.json",
    JSON.stringify(
      {
        state,
        errors,
        screenshots: shots.map(([, name]) => `${name}.png`),
        note: "Actual High-quality WebGL2 browser screenshots on SwiftShader. Subjective visual acceptance requires inspection.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ state, errors }, null, 2));
} finally {
  await browser.close();
}
