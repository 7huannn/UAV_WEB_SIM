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
  const samples = await page.evaluate(async () => {
    const w = window.__UAV__;
    w.setQuality('Low'); w.setCamera('Overview'); w.setWeatherPreset('Heavy rain');
    w.drone.reset(); w.drone.paused = false;
    const original = { context: w.context.visible, clouds: w.atmosphere.clouds.visible,
      sky: w.atmosphere.sky.visible, order: w.context.children.map(x => x.renderOrder) };
    const runs = [];
    const plan = ['baseline', 'no-context', 'baseline', 'context-last', 'baseline', 'no-clouds',
      'baseline', 'no-sky', 'baseline', 'context-last'];
    for (const mode of plan) {
      w.context.visible = original.context; w.atmosphere.clouds.visible = original.clouds;
      w.atmosphere.sky.visible = original.sky;
      w.context.children.forEach((x, i) => { x.renderOrder = original.order[i]; });
      if (mode === 'no-context') w.context.visible = false;
      if (mode === 'no-clouds') w.atmosphere.clouds.visible = false;
      if (mode === 'no-sky') w.atmosphere.sky.visible = false;
      if (mode === 'context-last') w.context.children.forEach(x => { x.renderOrder = 100; });
      let previous = performance.now(); const ms = [], start = previous;
      for (let i = 0; i < 150; i++) {
        await new Promise(requestAnimationFrame); const now = performance.now();
        if (i >= 30) ms.push(now - previous); previous = now;
      }
      ms.sort((a, b) => a - b);
      runs.push({ mode, warmup: 30, measured: 120, wallSeconds: (performance.now() - start) / 1000,
        medianMs: ms[60], p95Ms: ms[114], p99Ms: ms[118],
        calls: w.renderer.info.render.calls, triangles: w.renderer.info.render.triangles,
        reflectionCaptures: w.reflectionCaptures });
    }
    w.context.visible = original.context; w.atmosphere.clouds.visible = original.clouds;
    w.atmosphere.sky.visible = original.sky;
    w.context.children.forEach((x, i) => { x.renderOrder = original.order[i]; });
    w.drone.paused = true;
    return runs;
  });
  const bundle = await page.locator('script[type=module][src]').last().getAttribute('src');
  const data = { date: new Date().toISOString(), bundle, browser: browser.version(),
    fixture: 'same heavy-rain/Low/Overview live simulation; 1280×800 DPR1 SwiftShader; 30 warm/120 measured each',
    samples, errors };
  await writeFile('docs/simulation/evidence/phase-3/perf-isolation.json', JSON.stringify(data, null, 2) + '\n');
  console.log(JSON.stringify(data));
} finally { await browser.close(); }
