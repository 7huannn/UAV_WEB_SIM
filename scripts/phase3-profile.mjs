import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
try {
  await page.goto(process.env.UAV_URL ?? 'http://127.0.0.1:4190', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole('button', { name: 'Xem bay mẫu tự động', exact: true }).click();
  const profile = await page.evaluate(async () => {
    const w = window.__UAV__;
    w.setQuality('Low'); w.setCamera('Overview'); w.setWeatherPreset('Heavy rain');
    w.drone.reset(); w.drone.paused = false;
    let previous = performance.now(); const frameMs = [], start = performance.now(), simStart = w.drone.time;
    for (let i = 0; i < 360; i++) {
      await new Promise(requestAnimationFrame); const now = performance.now();
      if (i >= 60) frameMs.push(now - previous); previous = now;
    }
    const wall = (performance.now() - start) / 1000, sim = w.drone.time - simStart;
    w.drone.paused = true; frameMs.sort((a, b) => a - b);
    return { warmupFrames: 60, measuredFrames: 300, wallSeconds: wall,
      simulatedSeconds: sim, realTimeFactor: sim / wall,
      medianMs: frameMs[150], p95Ms: frameMs[285], p99Ms: frameMs[297],
      calls: w.renderer.info.render.calls, triangles: w.renderer.info.render.triangles,
      memory: w.renderer.info.memory, gpu: w.stats.gpu, quality: w.quality,
      reflectionCaptures: w.reflectionCaptures, reflectionCaptureMaxMs: w.reflectionCaptureMaxMs };
  });
  const bundle = await page.locator('script[type=module][src]').last().getAttribute('src');
  const data = { date: new Date().toISOString(), bundle, browser: browser.version(), profile, errors };
  await writeFile(process.argv[2] ?? 'docs/simulation/evidence/phase-3/profile-partial.json',
    JSON.stringify(data, null, 2) + '\n');
  console.log(JSON.stringify(data));
} finally { await browser.close(); }
