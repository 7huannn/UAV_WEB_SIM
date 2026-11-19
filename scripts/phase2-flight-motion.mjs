import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const dir='docs/simulation/evidence/phase-2/flight-motion';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:720},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],samples=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>errors.push(r.url()));
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function capture(label,camera){
  if(camera)await page.evaluate(camera=>window.__UAV__.setCamera(camera),camera);
  await frame();await page.locator('canvas').first().screenshot({path:`${dir}/${label}.png`});
  samples.push(await page.evaluate(label=>{const w=window.__UAV__,d=w.drone,x=d.diagnostics;
    return {label,time:d.time,mode:d.mode,camera:w.cameraMode,position:d.position.toArray(),velocity:d.velocity.toArray(),
      orientation:d.orientation.toArray(),rates:d.angularVelocity.toArray(),target:d.target.toArray(),yawTarget:d.yaw,
      wind:d.wind.toArray(),motorOmega:[...d.motors],demandWrench:x?.demandWrench,commandWrench:x?.commandWrench,
      actualWrench:x?.actualWrench,motorClipped:x?.saturation.motor,environment:d.simulation.snapshot()};},label));
}
async function integrate(ticks){await page.evaluate(ticks=>{const d=window.__UAV__.drone;d.paused=false;
  for(let i=0;i<ticks;i++)d.advance(.004);d.paused=true;},ticks);}
async function sequence(prefix,times,camera){let previous=0;
  for(const seconds of times){await integrate(Math.round((seconds-previous)*250));previous=seconds;await capture(`${prefix}-${String(seconds).replace('.','p')}`,camera);}}
try{
  await page.goto(process.env.UAV_URL??'http://127.0.0.1:4182',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__UAV__&&!window.__UAV__.stats.loading);
  await page.getByRole('button',{name:'Xem bay mẫu tự động',exact:true}).click();
  await page.evaluate(()=>{const w=window.__UAV__;w.setQuality('Low');w.setWeatherPreset('Clear skies');
    w.drone.reset();w.drone.enableDiagnostics(true);w.drone.takeoff();w.drone.paused=true;});
  await sequence('takeoff',[0,2,5,10,22],'PILOT VLOS');
  await capture('takeoff-22-follow','Follow');await capture('takeoff-22-fpv','FPV');
  await page.evaluate(()=>window.__UAV__.drone.target.x+=5);
  await sequence('command',[0,2,5,10,15],'PILOT VLOS');
  await capture('command-15-follow','Follow');
  await page.evaluate(()=>window.__UAV__.drone.hold());
  await sequence('release',[0,2,10],'Follow');
  await page.evaluate(()=>window.__UAV__.setWeatherPreset('Wind & gusts'));
  await sequence('wind-transition',[0,2,5,10,20],'PILOT VLOS');
  await capture('wind-20-follow','Follow');await capture('wind-20-fpv','FPV');
  await page.evaluate(()=>window.__UAV__.drone.yaw+=Math.PI);
  await sequence('saturation',[0,.5,1,2],'Follow');
  await page.evaluate(()=>{const d=window.__UAV__.drone;d.hold();d.yaw=d.telemetry().yaw*Math.PI/180;});
  await sequence('recovery',[0,5,20],'Follow');
  await page.evaluate(()=>window.__UAV__.drone.land());
  await sequence('landing',[0,5,10,20],'PILOT VLOS');
  await capture('landing-20-follow','Follow');
  const landed=samples.at(-1);assert.ok(landed.position[1]<.5 && landed.mode==='Disarmed');
  await page.evaluate(()=>{const w=window.__UAV__;w.drone.reset();w.setCamera('Follow');w.drone.takeoff();
    const stream=w.renderer.domElement.captureStream(15),chunks=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:800000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    window.__P2_VIDEO__={stream,chunks,recorder};recorder.start();w.drone.paused=false;});
  const live=[];
  for(let i=0;i<60;i++){await frame();if(i%20===0||i===59){await capture(`live-${i}`);live.push(samples.at(-1));}}
  await page.evaluate(()=>window.__UAV__.drone.paused=true);
  const video=await page.evaluate(async()=>{const x=window.__P2_VIDEO__;await new Promise(resolve=>{x.recorder.onstop=resolve;x.recorder.stop();});
    x.stream.getTracks().forEach(track=>track.stop());const blob=new Blob(x.chunks,{type:'video/webm'});return Array.from(new Uint8Array(await blob.arrayBuffer()));});
  await writeFile(`${dir}/live.webm`,Buffer.from(video));
  assert.ok(live.at(-1).position[1]>live[0].position[1]);
  assert.ok(samples.every(s=>[...s.position,...s.velocity,...s.orientation,...s.rates,...s.motorOmega].every(Number.isFinite)));
  assert.deepEqual(errors,[]);
  const bundle=await page.locator('script[type=module][src]').last().getAttribute('src');
  const result={date:new Date().toISOString(),browser:browser.version(),bundle,samples,liveFrames:live.map(s=>s.label),
    videoBytes:video.length,landed:{mode:landed.mode,position:landed.position},
    note:'All selected-time trajectories use the actual fixed-step plant; live.webm is the real RAF run. Camera smoothing is presentation-only; no synthetic aircraft pose.',
    errors};
  await writeFile(`${dir}/evidence.json`,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({bundle,screenshots:samples.length,videoBytes:video.length,landed:result.landed,liveAltitudes:live.map(s=>s.position[1]),errors}));
}finally{await browser.close();}
