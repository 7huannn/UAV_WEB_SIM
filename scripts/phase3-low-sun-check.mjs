import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [url, label] = process.argv.slice(2);
assert.ok(url && ['retained-sky', 'local-prototype'].includes(label));
const dir = `docs/simulation/evidence/phase-3/low-sun/${label}`;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [], shots = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole('button', { name: 'Xem bay mẫu tự động', exact: true }).click();
  for (const preset of ['Clear skies', 'Overcast']) {
    await page.evaluate(preset => {
      const w = window.__UAV__;
      w.setQuality('Low'); w.setWeatherPreset(preset); w.setAdvancedWeather('timeOfDay', 17.5);
      w.drone.reset(); w.drone.paused = true;
      w.drone.position.set(0, 5.32, 0); w.drone.previousPosition.copy(w.drone.position);
    }, preset);
    for (const camera of ['Ground', 'PILOT VLOS', 'Overview', 'Follow', 'FPV']) {
      await page.evaluate(camera => window.__UAV__.setCamera(camera), camera);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const name = `${preset.toLowerCase().replaceAll(' ', '-')}-${camera.toLowerCase().replaceAll(' ', '-')}`;
      await page.locator('canvas').first().screenshot({ path: `${dir}/${name}.png` });
      shots.push(await page.evaluate(name => { const w = window.__UAV__; return { name,
        current: { ...w.presentationEnvironment.current }, camera: w.camera.position.toArray(),
        sun: w.atmosphere.sun.position.toArray() }; }, name));
    }
  }
  const bundle = await page.locator('script[type=module][src]').last().getAttribute('src');
  const data = { label, url, bundle, browser: browser.version(), viewport: [1280, 800], dpr: 1,
    fixture: 'synthetic 5.32 m pose; named preset plus 17.5 solar time, paused', shots, errors };
  await writeFile(`${dir}/evidence.json`, JSON.stringify(data, null, 2) + '\n');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ label, bundle, shots: shots.length, errors }));
} finally { await browser.close(); }
