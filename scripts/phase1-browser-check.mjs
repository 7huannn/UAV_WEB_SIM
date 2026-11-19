import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const stage = process.argv[2] ?? 'after';
const profileOnly = process.argv.includes('--profile-only');
assert.ok(['before', 'after'].includes(stage));
const dir = `docs/simulation/evidence/phase-1/${stage}`;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [], shots = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', r => errors.push(r.url()));
const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function capture(name) {
  await frames();
  await page.locator('canvas').first().screenshot({ path: `${dir}/${name}.png` });
  shots.push(await page.evaluate(name => {
    const w = window.__UAV__;
    return { name, gpu: w.stats.gpu, camera: w.cameraMode, eye: w.camera.position.toArray(),
      orientation: w.camera.quaternion.toArray(), fov: w.camera.fov, weather: {...w.weather.current},
      time: w.drone.time, wetness: w.weather.wetness, cloud: w.atmosphere.cloudMaterial.uniforms.uOffset.value.toArray(),
      calls: w.renderer.info.render.calls, triangles: w.renderer.info.render.triangles,
      memory: w.renderer.info.memory, environment: w.presentationEnvironment ?? null };
  }, name));
}
try {
  await page.goto(process.env.UAV_URL ?? 'http://127.0.0.1:4176', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__UAV__ && !window.__UAV__.stats.loading);
  await page.getByRole('button', { name: 'Xem bay mẫu tự động', exact: true }).click();
  await page.evaluate(() => { const w = window.__UAV__; w.drone.paused = true; w.setQuality('Low'); });
  if (!profileOnly) {
  for (const preset of ['Clear skies', 'Overcast', 'Light rain', 'Heavy rain']) {
    await page.evaluate(preset => {
      const w = window.__UAV__; w.setWeatherPreset(preset);
      w.drone.reset(); w.weather.current = {...w.weather.target}; w.weather.wetness = w.weather.current.rain;
      w.drone.paused = false;
      for (let i=0; i<250; i++) w.drone.advance(.004);
      w.drone.paused = true;
    }, preset);
    for (const camera of ['Ground', 'Overview', 'FPV']) {
      await page.evaluate(camera => {
        const w = window.__UAV__; w.setCamera(camera);
        // Synthetic camera-height fixture, not evidence of a flown manoeuvre.
        if (camera === 'FPV') { w.drone.position.set(0,5.32,0); w.drone.previousPosition.copy(w.drone.position); }
      }, camera);
      await capture(`${preset.toLowerCase().replaceAll(' ', '-')}-${camera.toLowerCase()}`);
    }
  }
  await page.evaluate(() => { const w = window.__UAV__; w.drone.position.set(-20,.32,0); w.drone.previousPosition.copy(w.drone.position); w.setCamera('Ground'); });
  for (let n=0; n<4; n++) {
    await page.evaluate(() => { const d=window.__UAV__.drone; d.paused=false; for(let i=0;i<1000;i++)d.advance(.004); d.paused=true; });
    await capture(`motion-${n}`);
  }
  } else {
    await page.evaluate(()=>{const w=window.__UAV__;w.setWeatherPreset('Heavy rain');w.weather.current={...w.weather.target};w.weather.wetness=w.weather.current.rain;});
  }
  // Real RAF samples, separate from deterministic fast-forwarded selected-time captures.
  const profile = await page.evaluate(async (profileOnly) => {
    const w=window.__UAV__, samples=[], started=performance.now();
    const components={};
    if(profileOnly)for(const name of ['grass','clumps','atmosphere']){
      const original=w[name].update.bind(w[name]);components[name]=[];
      w[name].update=(...args)=>{const begin=performance.now();const result=original(...args);components[name].push(performance.now()-begin);return result;};
    }
    w.setCamera('Overview'); w.drone.reset(); w.drone.paused=false;
    const simStart=w.drone.time;
    let previous=performance.now();
    for(let i=0;i<(profileOnly?135:45);i++) { await new Promise(requestAnimationFrame); const now=performance.now(); if(i>=(profileOnly?15:5))samples.push(now-previous); previous=now; }
    const wall=(performance.now()-started)/1000, simulated=w.drone.time-simStart;
    w.drone.paused=true; samples.sort((a,b)=>a-b);
    return { frameCount:samples.length, wallSeconds:wall, simulatedSeconds:simulated, realTimeFactor:simulated/wall,
      median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],p99:samples.at(-1),
      gpu:w.stats.gpu,quality:w.quality,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
      calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:w.renderer.info.memory,
      gpuTiming:null,components:Object.fromEntries(Object.entries(components).map(([k,v])=>{v.sort((a,b)=>a-b);return [k,{medianMs:v[Math.floor(v.length*.5)],p95Ms:v[Math.floor(v.length*.95)]}];})),
      note:'SwiftShader RAF timing; GPU timestamps unavailable; not a hardware budget claim.' };
  },profileOnly);
  const bundle=await page.locator('script[type=module][src]').last().getAttribute('src');
  const result = { stage, date:new Date().toISOString(), browser:browser.version(), bundle, source:'P1-v1 final source; see source-manifest.json',shots,profile,errors };
  await writeFile(`${dir}/${profileOnly?'profile-repeat':'evidence'}.json`,JSON.stringify(result,null,2));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({stage,shots:shots.length,profile,errors}));
} finally { await browser.close(); }
