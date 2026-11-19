import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const stage = process.argv[2];
assert.ok(stage === 'before' || stage === 'after');
const root = process.argv[3] ?? 'docs/simulation/evidence/phase-3/' + stage;
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [], shots = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', r => errors.push(r.url()));
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function state(name) {
  return page.evaluate(name => {
    const w = window.__UAV__;
    return { name, time: w.drone.time, environment: w.presentationEnvironment,
      aircraft: { position: w.drone.position.toArray(), orientation: w.drone.orientation.toArray() },
      camera: { mode: w.cameraMode, position: w.camera.position.toArray(), quaternion: w.camera.quaternion.toArray(),
        fov: w.camera.fov, near: w.camera.near, far: w.camera.far },
      gpu: w.stats.gpu, quality: w.quality, exposure: w.renderer.toneMappingExposure,
      calls: w.renderer.info.render.calls, triangles: w.renderer.info.render.triangles,
      memory: w.renderer.info.memory };
  }, name);
}
async function capture(name) {
  await frames();
  await page.locator('canvas').first().screenshot({ path: root + '/' + name + '.png' });
  shots.push(await state(name));
}
async function variant(name) {
  await page.evaluate(name => {
    const w = window.__UAV__;
    if (!window.__P3_ORIGINAL__) {
      window.__P3_ORIGINAL__ = {
      fog: w.scene.fog, sky: w.atmosphere.sky.visible, clouds: w.atmosphere.clouds.visible,
      context: w.context.visible, shader: w.atmosphere.cloudMaterial.fragmentShader,
      children: w.scene.children.map(x => x.visible), update: w.atmosphere.update };
      w.atmosphere.update = (...args) => {
        const result = window.__P3_ORIGINAL__.update(...args);
        if (window.__P3_VARIANT__ === 'no-fog') w.scene.fog.density = 0;
        return result;
      };
    }
    const o = window.__P3_ORIGINAL__;
    window.__P3_VARIANT__ = name;
    w.scene.fog = o.fog;
    w.scene.children.forEach((x, i) => { x.visible = o.children[i]; });
    w.atmosphere.sky.visible = o.sky;
    w.atmosphere.clouds.visible = o.clouds;
    w.context.visible = o.context;
    w.atmosphere.cloudMaterial.fragmentShader = o.shader;
    w.atmosphere.cloudMaterial.needsUpdate = true;
    if (name === 'no-fog') w.scene.fog.density = 0;
    if (name === 'no-context') w.context.visible = false;
    if (name === 'no-clouds') w.atmosphere.clouds.visible = false;
    if (name === 'sky-only') {
      w.scene.children.forEach(x => { x.visible = x === w.atmosphere.sky || x === w.atmosphere.clouds; });
    }
    if (name === 'cloud-unfaded') {
      w.atmosphere.cloudMaterial.fragmentShader = o.shader
        .replace('if(rd.y<.008)discard;', '')
        .replace('color=mix(vec3(.78,.83,.86)*(1.-uRain*.18),color,smoothstep(.01,.17,rd.y));', '')
        .replace('alpha*=smoothstep(.008,.055,rd.y)*smoothstep(0.,.08,uCoverage);',
          'alpha*=smoothstep(0.,.08,uCoverage);');
      w.atmosphere.cloudMaterial.needsUpdate = true;
    }
  }, name);
}

try {
  await page.goto(process.env.UAV_URL ?? 'http://127.0.0.1:4190', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole('button', { name: 'Xem bay mẫu tự động', exact: true }).click();
  await page.evaluate(() => { const w = window.__UAV__; w.setQuality('Low'); w.drone.paused = true; });
  for (const preset of ['Clear skies', 'Partly cloudy', 'Overcast', 'Light rain', 'Heavy rain']) {
    await page.evaluate(preset => {
      const w = window.__UAV__;
      w.setWeatherPreset(preset); w.drone.reset(); w.drone.paused = true;
      w.drone.position.set(0, 5.32, 0); w.drone.previousPosition.copy(w.drone.position);
    }, preset);
    for (const camera of ['Ground', 'PILOT VLOS', 'Overview', 'Follow', 'FPV']) {
      await page.evaluate(camera => window.__UAV__.setCamera(camera), camera);
      const label = preset.toLowerCase().replaceAll(' ', '-') + '-' + camera.toLowerCase().replaceAll(' ', '-');
      await variant('combined');
      await capture(label);
      if (['Clear skies', 'Overcast', 'Heavy rain'].includes(preset) &&
          ['Ground', 'PILOT VLOS', 'FPV', 'Overview'].includes(camera)) {
        for (const v of ['sky-only', 'no-clouds', 'no-context', 'no-fog', 'cloud-unfaded']) {
          await variant(v); await capture(label + '--' + v);
        }
        await variant('combined');
      }
    }
  }
  const bundle = await page.locator('script[type=module][src]').last().getAttribute('src');
  await writeFile(root + '/evidence.json', JSON.stringify({ stage, browser: browser.version(), bundle,
    viewport: [1280, 800], dpr: 1, fixture: 'synthetic 5.32m body-centre; paused environmental snapshot',
    shots, errors }, null, 2) + '\n');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ stage, bundle, shots: shots.length, errors }));
} finally {
  await browser.close();
}
