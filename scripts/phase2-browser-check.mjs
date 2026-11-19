import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const stage=process.argv[2];
assert.ok(['before','after'].includes(stage));
const dir=`docs/simulation/evidence/phase-2/browser/${stage}`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[],shots=[],live=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>errors.push(r.url()));
const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function shot(name){
  await frames();await page.locator('canvas').first().screenshot({path:`${dir}/${name}.png`});
  shots.push(await page.evaluate(name=>{const w=window.__UAV__;return {name,time:w.drone.time,mode:w.drone.mode,
    position:w.drone.position.toArray(),orientation:w.drone.orientation.toArray(),weather:{...w.weather.current},
    camera:w.cameraMode,eye:w.camera.position.toArray(),fov:w.camera.fov,quality:w.quality,
    calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:w.renderer.info.memory};},name));
}
async function advance(ticks){await page.evaluate(ticks=>{const d=window.__UAV__.drone;d.paused=false;
  for(let i=0;i<ticks;i++)d.advance(.004);d.paused=true;},ticks);}
try{
  await page.goto(process.env.UAV_URL??'http://127.0.0.1:4181',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__UAV__&&!window.__UAV__.stats.loading);
  await page.getByRole('button',{name:'Xem bay mẫu tự động',exact:true}).click();
  await page.evaluate(()=>{const w=window.__UAV__;w.setQuality('Low');w.setWeatherPreset('Clear skies');w.drone.reset();w.drone.takeoff();w.drone.paused=true;});
  await advance(5500);
  for(const camera of ['Ground','PILOT VLOS','Follow','FPV']){
    await page.evaluate(camera=>window.__UAV__.setCamera(camera),camera);await shot(`calm-${camera.replaceAll(' ','-').toLowerCase()}`);
  }
  await page.evaluate(()=>{const d=window.__UAV__.drone;d.target.x+=5;});await advance(3750);
  for(const camera of ['PILOT VLOS','Follow']){await page.evaluate(camera=>window.__UAV__.setCamera(camera),camera);await shot(`command-${camera.replaceAll(' ','-').toLowerCase()}`);}
  await page.evaluate(()=>{const w=window.__UAV__;w.setWeatherPreset('Wind & gusts');w.drone.reset();w.drone.takeoff();w.drone.paused=true;});await advance(5500+5000);
  for(const camera of ['PILOT VLOS','Follow','FPV']){await page.evaluate(camera=>window.__UAV__.setCamera(camera),camera);await shot(`wind-${camera.replaceAll(' ','-').toLowerCase()}`);}
  await page.evaluate(()=>{window.__UAV__.drone.yaw+=Math.PI;});await advance(500);await shot('yaw-pulse');
  await page.evaluate(()=>{const d=window.__UAV__.drone;d.hold();d.yaw=d.telemetry().yaw*Math.PI/180;});await advance(5000);await shot('yaw-recovered');
  await page.evaluate(()=>{const w=window.__UAV__;w.setWeatherPreset('Clear skies');w.drone.reset();w.setCamera('Follow');w.drone.takeoff();w.drone.paused=false;});
  for(let i=0;i<40;i++){
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    if(i%20===0||i===39){await shot(`live-${i}`);live.push(await page.evaluate(()=>window.__UAV__.drone.telemetry()));}
  }
  await page.evaluate(()=>window.__UAV__.drone.paused=true);
  assert.ok(live.at(-1).altitude>live[0].altitude);
  const profile=await page.evaluate(async()=>{
    const w=window.__UAV__;w.setQuality('Low');w.setCamera('Overview');w.setWeatherPreset('Heavy rain');w.drone.reset();w.drone.paused=false;
    let previous=performance.now();const frameMs=[],start=performance.now(),simStart=w.drone.time;
    for(let i=0;i<360;i++){
      await new Promise(requestAnimationFrame);const now=performance.now();
      if(i>=60)frameMs.push(now-previous);previous=now;
    }
    const wall=(performance.now()-start)/1000,sim=w.drone.time-simStart;
    w.drone.paused=true;frameMs.sort((a,b)=>a-b);
    return {warmupFrames:60,measuredFrames:300,wallSeconds:wall,simulatedSeconds:sim,realTimeFactor:sim/wall,
      medianMs:frameMs[150],p95Ms:frameMs[285],p99Ms:frameMs[297],
      calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:w.renderer.info.memory,
      admittedSeconds:sim,droppedSeconds:w.drone.droppedTime,gpuTiming:null,gpu:w.stats.gpu,
      quality:w.quality,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
      note:'Chrome/ANGLE SwiftShader wall RAF samples; no hardware GPU timestamps.'};
  });
  const bundle=await page.locator('script[type=module][src]').last().getAttribute('src');
  const result={stage,date:new Date().toISOString(),browser:browser.version(),bundle,shots,live,profile,errors};
  await writeFile(`${dir}/evidence.json`,JSON.stringify(result,null,2)+'\n');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({stage,bundle,shots:shots.length,liveAltitudes:live.map(s=>s.altitude),profile,errors}));
}finally{await browser.close();}
