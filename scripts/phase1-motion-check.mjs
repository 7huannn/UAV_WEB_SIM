import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const dir='docs/simulation/evidence/phase-1/motion';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:720}});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function shot(name){await frames();await page.locator('canvas').first().screenshot({path:`${dir}/${name}.png`});}
try {
  await page.goto(process.env.UAV_URL??'http://127.0.0.1:4176',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__UAV__&&!window.__UAV__.stats.loading);
  await page.getByRole('button',{name:'Xem bay mẫu tự động',exact:true}).click();
  await page.evaluate(()=>{
    const w=window.__UAV__;w.drone.paused=true;w.setQuality('Low');w.setWeatherPreset('Partly cloudy');w.drone.reset();w.drone.paused=true;w.setCamera('Ground');
  });
  // Use the browser's native canvas encoder; no ffmpeg/package download required.
  await page.evaluate(()=>{
    const stream=window.__UAV__.renderer.domElement.captureStream(15),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:800000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    window.__P1_VIDEO__={recorder,chunks,stream};recorder.start();
  });
  const cloud=[];
  for(let n=0;n<=10;n++) {
    if(n) await page.evaluate(()=>{const d=window.__UAV__.drone;d.paused=false;for(let i=0;i<250;i++)d.advance(.004);d.paused=true;});
    await shot(`cloud-${String(n).padStart(2,'0')}`);
    cloud.push(await page.evaluate(()=>({time:window.__UAV__.presentationEnvironment.time,offset:window.__UAV__.atmosphere.cloudMaterial.uniforms.uOffset.value.toArray()})));
  }
  assert.ok(cloud.at(-1).time-cloud[0].time>=10);
  const paused=await page.evaluate(()=>JSON.stringify(window.__UAV__.drone.simulation.snapshot()));
  await frames();await frames();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__UAV__.drone.simulation.snapshot())),paused);
  const resume=await page.evaluate(async()=>{
    const d=window.__UAV__.drone,before=d.time;d.paused=false;
    await new Promise(requestAnimationFrame);const after=d.time;d.paused=true;return {before,after};
  });
  assert.equal(resume.before,resume.after);
  checks.push('Cloud motion observed at 11 selected times over 10 simulated seconds; repeated paused renders do not advance authoritative state.');

  await page.evaluate(()=>{const w=window.__UAV__;w.setCamera('Follow');w.drone.takeoff();w.drone.paused=false;});
  const liveFlight=[];
  for(let n=0;n<40;n++){
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    if(n%10===0){await shot(`live-flight-${n}`);liveFlight.push(await page.evaluate(()=>window.__UAV__.drone.telemetry()));}
  }
  await page.evaluate(()=>window.__UAV__.drone.paused=true);
  assert.ok(liveFlight.at(-1).altitude>liveFlight[0].altitude);
  checks.push('Real RAF-driven takeoff observed and recorded in motion, separately from fast-forwarded selected-time fixtures.');

  // A real force-integrated manual fixture, then read-only recorded-state playback.
  const attempt=await page.evaluate(()=>{
    const w=window.__UAV__;w.drone.disarm();w.drone.reset();w.setWorkspace('Training');
    if(!w.beginAttempt('P1 synthetic motion','Training','foundations'))throw Error('beginAttempt');
    w.drone.arm();if(!w.session.start(w.drone))throw Error('start');
    w.input.fault='';w.inputFocused=true;
    for(let n=0;n<2500;n++){
      w.input.value={throttle:n<1500?.6:0,roll:0,pitch:0,yaw:0};
      if(n===500)w.weather.target.direction=359;
      if(n===1000){w.weather.target.direction=1;w.weather.target.rain=.3;}
      w.drone.advance(.004);
    }
    w.session.abort('P1 synthetic recording complete');w.drone.paused=true;
    return w.session.snapshot();
  });
  assert.ok(attempt.frames.length>400);assert.ok(attempt.frames.at(-1).altitude>2);
  const live=await page.evaluate(()=>{const w=window.__UAV__;return JSON.stringify({state:w.drone.simulation.snapshot(),pause:w.drone.paused,accumulator:w.drone.accumulator,position:w.drone.position.toArray()});});
  await page.evaluate(attempt=>{window.__UAV__.setReplay(attempt);window.__UAV__.setCamera('FPV');},attempt);
  const samples=[];
  for(const time of [1,4,7,4,0,9,4]){
    await page.evaluate(time=>window.__UAV__.replay.time=time,time);await shot(`seek-${samples.length}`);
    samples.push(await page.evaluate(()=>window.__UAV__.presentationEnvironment));
  }
  assert.deepEqual(samples[1],samples[3]);assert.deepEqual(samples[1],samples[6]);
  checks.push('Force-integrated manual climb recorded; environmental state identical at 4 seconds after forward, backward and random seeks.');
  for(const speed of [.5,1,2]){
    await page.evaluate(speed=>{const w=window.__UAV__;w.replay.speed=speed;w.replay.playing=true;},speed);
    await frames();await frames();
    await page.evaluate(()=>{window.__UAV__.replay.playing=false;window.__UAV__.replay.time=4;});await frames();
    assert.deepEqual(await page.evaluate(()=>window.__UAV__.presentationEnvironment),samples[1]);
  }
  const frozen=await page.evaluate(()=>JSON.stringify(window.__UAV__.drone.simulation.snapshot()));
  for(const camera of ['Ground','Overview','Follow','FPV','PILOT VLOS']){
    await page.evaluate(camera=>window.__UAV__.setCamera(camera),camera);await frames();
    assert.equal(await page.evaluate(()=>JSON.stringify(window.__UAV__.drone.simulation.snapshot())),frozen);
  }
  checks.push('Playback speed and all principal camera switches preserve the live authoritative environment; selected-time snapshot agrees.');
  await page.evaluate(()=>window.__UAV__.setReplay(null));
  assert.equal(await page.evaluate(()=>{const w=window.__UAV__;return JSON.stringify({state:w.drone.simulation.snapshot(),pause:w.drone.paused,accumulator:w.drone.accumulator,position:w.drone.position.toArray()});}),live);
  await page.evaluate(()=>{
    const w=window.__UAV__;w.session=null;w.drone.disarm();w.drone.reset();w.drone.paused=true;w.setCamera('Ground');
    w.camera.position.set(0,.8,19);w.controls.target.set(0,0,16);w.controls.update();w.setQuality('Ultra');
  });
  await shot('ultra-local-grass');
  for(let n=0;n<4;n++){
    await page.evaluate(()=>{const d=window.__UAV__.drone;d.paused=false;for(let i=0;i<250;i++)d.advance(.004);d.paused=true;});
    await shot(`grass-motion-${n}`);
  }
  checks.push('Ultra near vegetation and matching depth shaders compile/render without errors; local wind motion captured across four additional simulated seconds.');
  const resets=await page.evaluate(()=>{
    const w=window.__UAV__;w.drone.reset();const a=w.drone.simulation.snapshot();
    w.drone.paused=false;for(let i=0;i<100;i++)w.drone.advance(.004);w.drone.reset();w.drone.paused=true;
    return [a,w.drone.simulation.snapshot()];
  });
  assert.deepEqual(resets[0],resets[1]);
  const legacy=structuredClone(attempt);delete legacy.environment;legacy.frames.forEach(f=>delete f.environment);
  const source=JSON.stringify(legacy);
  await page.evaluate(a=>{const w=window.__UAV__;w.setReplay(a);w.replay.time=4;w.setQuality('Low');},legacy);await shot('legacy-replay');
  const one=await page.evaluate(()=>window.__UAV__.presentationEnvironment);
  await page.evaluate(()=>{window.__UAV__.replay.time=8;});await frames();
  await page.evaluate(()=>{window.__UAV__.replay.time=4;});await frames();
  assert.deepEqual(await page.evaluate(()=>window.__UAV__.presentationEnvironment),one);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__UAV__.replay.attempt)),source);
  checks.push('Fresh reset reproduces environment; legacy adaptation is deterministic and does not mutate original payload.');
  const video=await page.evaluate(()=>new Promise(resolve=>{
    const {recorder,chunks,stream}=window.__P1_VIDEO__;
    recorder.onstop=async()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));stream.getTracks().forEach(t=>t.stop());};
    recorder.stop();
  }));
  await writeFile(`${dir}/motion.webm`,Buffer.from(video,'base64'));
  await writeFile(`${dir}/recording.json`,JSON.stringify(attempt));
  const metadata={date:new Date().toISOString(),browser:browser.version(),checks,errors,cloud,liveFlight,
    note:'Selected-time frames and real browser video; synthetic input is not a human flight. SwiftShader, no hardware GPU claim.'};
  await writeFile(`${dir}/evidence.json`,JSON.stringify(metadata,null,2));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks,errors,recordingFrames:attempt.frames.length}));
} finally {await context.close();await browser.close();}
