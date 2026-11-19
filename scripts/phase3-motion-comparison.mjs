import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [url, label] = process.argv.slice(2);
assert.ok(url && ['retained-sky', 'local-prototype'].includes(label));
const dir = 'docs/simulation/evidence/phase-3/motion';
await mkdir(dir, { recursive: true });
const framesDir = `${dir}/${label}-frames`;
await mkdir(framesDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage(), errors = [], segments = [];
let frameIndex = 0;
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole('button', { name: 'Xem bay mẫu tự động', exact: true }).click();
  await page.evaluate(() => {
    const w = window.__UAV__;
    w.setQuality('Low'); w.setWeatherPreset('Clear skies'); w.drone.reset();
    if (!w.drone.mission()) throw new Error('Reference flight mission did not start');
    w.drone.paused = false;
  });
  for (const [name, preset, camera, frames] of [
    ['clear-ground', 'Clear skies', 'Ground', 40],
    ['clear-pilot', 'Clear skies', 'PILOT VLOS', 40],
    ['partly-follow', 'Partly cloudy', 'Follow', 40],
    ['overcast-fpv', 'Overcast', 'FPV', 40],
    ['heavy-overview', 'Heavy rain', 'Overview', 40],
  ]) {
    await page.evaluate(([preset, camera]) => {
      const w = window.__UAV__;
      w.setWeatherPreset(preset); w.setCamera(camera);
    }, [preset, camera]);
    const start = await page.evaluate(() => ({ time: window.__UAV__.drone.time,
      pose: window.__UAV__.drone.position.toArray(), camera: window.__UAV__.cameraMode }));
    for (let i = 0; i < frames; i++) {
      if (name === 'clear-pilot' && i % 10 === 0) await page.evaluate(() => window.__UAV__.lookPilot(0.05, 0));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      if (i % 2 === 0) await page.locator('canvas').first().screenshot({
        path: `${framesDir}/${String(frameIndex++).padStart(4, '0')}.jpg`,
        type: 'jpeg', quality: 76 });
    }
    const end = await page.evaluate(() => ({ time: window.__UAV__.drone.time,
      pose: window.__UAV__.drone.position.toArray(), camera: window.__UAV__.cameraMode,
      atmosphere: { ...window.__UAV__.presentationEnvironment.current } }));
    segments.push({ name, preset, frames, start, end });
  }
  await page.evaluate(() => { window.__UAV__.drone.paused = true; });
  const bundle = await page.locator('script[type=module][src]').last().getAttribute('src');
  await context.close();
  const data = { label, url, bundle, browser: browser.version(), viewport: [1280, 800], dpr: 1,
    fixture: 'actual force-integrated figure-eight reference mission; live weather transitions; 200 rendered RAF frames, every second captured',
    framesDir, frames: frameIndex, intendedPlaybackFps: 10, segments, errors };
  await writeFile(`${dir}/${label}.json`, JSON.stringify(data, null, 2) + '\n');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ label, bundle, segments: segments.map(x => [x.name, x.start.time, x.end.time]), errors }));
} finally { await browser.close(); }
