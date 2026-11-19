import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Group, PerspectiveCamera, Quaternion, Scene, Vector3 } from "three";
import { Weather, directionDelta, sampleWind } from "../weather/Weather";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { aircraft } from "../simulation/parameters";
import { interpolateEnvironment } from "../simulation/Simulation";
import { World } from "../scene/World";
import { makeGrass } from "../scene/grass";
import { makeAtmosphere } from "../scene/atmosphere";
import { TrainingSession } from "../training/Session";
import { ControllerInput } from "../training/input";
import { PILOT_STATION } from "../training/pilot";
import { parseAttempt, replayAt, replayEnvironment, seal, validateAttempt } from "../training/records";

const dt = aircraft.fixedDt;
function configured(wind = 0, seed = 17) {
  const w = new Weather(seed);
  Object.assign(w.current, { wind, gust: wind ? 2 : 0, turbulence: wind ? .4 : 0 });
  w.target = { ...w.current };
  return w;
}
function ticks(d: DroneDynamics, count: number) { for (let i=0;i<count;i++) d.advance(dt); }
const close = (a: number, b: number, tolerance = 1e-8) => assert.ok(Math.abs(a-b) <= tolerance, `${a} != ${b}`);

test("P1-B: unchanged plant matches pre-change calm and seeded-wind characterization", () => {
  const baseline = JSON.parse(readFileSync(new URL('../../docs/simulation/evidence/phase-1/characterization.json', import.meta.url), 'utf8'));
  for (const fixture of baseline.fixtures) {
    const d = new DroneDynamics(configured(fixture.wind)); d.takeoff(); ticks(d, baseline.steps);
    d.position.toArray().forEach((n,i) => close(n,fixture.position[i]));
    d.velocity.toArray().forEach((n,i) => close(n,fixture.velocity[i]));
    d.motors.forEach((n,i) => close(n,fixture.motors[i]));
    const difference = d.orientation.clone().invert().multiply(new Quaternion(...fixture.orientation as [number,number,number,number]));
    close(2*Math.atan2(Math.hypot(difference.x,difference.y,difference.z),Math.abs(difference.w)),0);
  }
  const w=configured(8); w.current.direction=0; w.current.gust=w.current.turbulence=0; w.target={...w.current};
  const d=new DroneDynamics(w); d.position.set(0,10,0); d.step(dt,[0,0,0,0]);
  close(d.force.x,12.544); assert.deepEqual(d.angularVelocity.toArray(),[0,0,0]);
});

test("P1-A/C: exactly-once single tick, invalid elapsed admission, bounded overload and pause", () => {
  const w=configured(), d=new DroneDynamics(w); let weatherSteps=0, before=0, after=0;
  const step=w.step.bind(w); w.step=n=>{weatherSteps++;step(n);};
  d.beforeStep=()=>before++; d.afterStep=()=>after++;
  d.step(); d.advance(.1);
  assert.equal(d.simulation.tick,26); assert.deepEqual([weatherSteps,before,after],[26,26,26]);
  const saved=d.simulation.snapshot();
  for(const elapsed of [NaN,Infinity,-Infinity,-1,0])d.advance(elapsed);
  assert.deepEqual(d.simulation.snapshot(),saved);
  d.advance(1); assert.equal(d.simulation.tick,51); close(d.droppedTime,.9);
  d.paused=true; const paused=d.simulation.snapshot(); d.advance(10);d.step();
  assert.deepEqual(d.simulation.snapshot(),paused);
  let invalidated=0;d.simulation.onResume=()=>invalidated++;
  d.paused=false;d.paused=false;assert.equal(invalidated,1);
  assert.deepEqual(d.simulation.snapshot(),paused);
  assert.throws(()=>d.step(.01));
  assert.throws(()=>interpolateEnvironment(saved,saved,NaN));
});

test("P1-C: actual reference/training command adapters are render-cadence independent", () => {
  for(const workspace of ['Reference missions','Training']) {
    const outputs=[];
    for(const schedule of [[1/30],[1/60],[1/120],[.013,.027,.081,.009]]) {
      const weather=configured(4),d=new DroneDynamics(weather),input=new ControllerInput();
      const world=Object.assign(Object.create(World.prototype),{weather,drone:d,input,keys:new Set(),workspace,replay:null,inputFocused:true}) as World;
      d.arm(); d.engageManual();
      if(workspace==='Training') {
        world.session=new TrainingSession('cadence','Training','foundations',d,weather,input,PILOT_STATION);
        world.session.start(d);
      }
      d.beforeStep=step=>{
        const n=d.simulation.tick;
        world.keys=new Set(n<300?['KeyR','KeyD']:[]);
        input.value={throttle:n<300?.5:0,roll:n<300?.5:0,pitch:0,yaw:0};
        if(n===100)weather.target.direction=1;
        world['flightInput'](step);
      };
      let elapsed=0,index=0;
      while(elapsed<4-1e-12){const next=Math.min(schedule[index++%schedule.length],4-elapsed);d.advance(next);elapsed+=next;}
      assert.equal(d.simulation.tick,1000);
      outputs.push({position:d.position.toArray(),orientation:d.orientation.toArray(),environment:d.simulation.snapshot(),target:d.target.toArray()});
    }
    for(const result of outputs.slice(1))assert.deepEqual(result,outputs[0]);
  }
});

test("P1-D: angular wrap, endpoint equivalence and half-turn tie use the declared arc", () => {
  for(const [from,to,expected] of [[359,1,0],[1,359,0],[0,360,0],[0,180,90],[180,0,270]]) {
    const w=configured();w.current.direction=from;w.target.direction=to;w.step(2*Math.log(2));
    close(w.current.direction,expected,1e-10);
  }
  assert.equal(directionDelta(359,1),2);assert.equal(directionDelta(1,359),-2);
  const legacy=configured();legacy.current.direction=1e308;
  assert.ok(legacy.windAt(1).toArray().every(Number.isFinite));
});

test("P1-E: world tile wind respects analytic gradient bound and stays independent of aircraft/camera", () => {
  const weather=configured(6), d=new DroneDynamics(weather), grass=makeGrass(), camera=new PerspectiveCamera();
  const environment=d.simulation.snapshot(); grass.update(camera,environment);
  const tile=grass.meshes[0], wind=(tile.userData.wind as Vector3).clone();
  for(const dx of [-2,0,2])for(const dz of [-2,0,2]) {
    const point=sampleWind(environment.current,environment.seed,environment.time,tile.position.clone().add(new Vector3(dx,0,dz)),new Vector3());
    const delta=point.sub(wind),t=environment.current.turbulence;
    assert.ok(Math.abs(delta.x)<=t*.13*Math.abs(dz)+1e-12);
    assert.ok(Math.abs(delta.y)<=t*.064*Math.abs(dx)+1e-12);
    assert.ok(Math.abs(delta.z)<=t*.17*Math.abs(dx)+1e-12);
  }
  const matrices=Array.from(tile.instanceMatrix.array);
  d.position.set(25,10,12);camera.position.set(100,30,100);grass.update(camera,environment);
  assert.deepEqual(tile.userData.wind,wind);assert.deepEqual(Array.from(tile.instanceMatrix.array),matrices);
  new Set(grass.meshes.map(m=>m.geometry)).forEach(g=>g.dispose());
  grass.meshes.forEach(m=>(m.material as import('three').Material).dispose());
});

function recording() {
  const weather=configured(4),d=new DroneDynamics(weather),input=new ControllerInput();
  ticks(d,250); // Nonzero absolute phase: attempt-relative time is insufficient on its own.
  const session=new TrainingSession('phase1','Training','foundations',d,weather,input,PILOT_STATION);
  d.arm();session.start(d);
  d.afterStep=()=>session.sample(d,weather,input,'PILOT VLOS');
  d.beforeStep=step=>d.manual(new Vector3(0,1,0),0,step);
  ticks(d,500);weather.target.direction=359;weather.target.rain=.3;ticks(d,500);session.abort();
  return {attempt:session.snapshot(),weather,d};
}

test("P1-F/G: reset/READY are repeatable; playback/seek cannot contaminate live context", () => {
  const {attempt,weather,d}=recording();validateAttempt(attempt);
  const world=Object.assign(Object.create(World.prototype),{drone:d,weather,session:null,replay:null,replayPaused:null,
    groundGuide:{group:new Group()},setCamera:()=>true}) as World;
  const atmosphere=makeAtmosphere(new Scene()),camera=new PerspectiveCamera();
  for(const paused of [false,true]) {
    d.paused=paused;d.accumulator=.002;
    const original={environment:d.simulation.snapshot(),accumulator:d.accumulator,dropped:d.droppedTime,position:d.position.toArray()};
    world.setReplay(attempt);
    const at=replayEnvironment(attempt,.731);
    for(const time of [1.5,.731,0,1.9,.731]) {
      const env=replayEnvironment(attempt,time);atmosphere.update(env,camera);d.advance(1);
      if(time===.731)assert.deepEqual(env,at);
    }
    world.setReplay(null);assert.equal(d.paused,paused);
    assert.deepEqual({environment:d.simulation.snapshot(),accumulator:d.accumulator,dropped:d.droppedTime,position:d.position.toArray()},original);
  }
  weather.target.rain=.8;d.reset();const reset=d.simulation.snapshot();
  close(reset.wetness,.8);assert.equal(reset.tick,0);assert.deepEqual(reset.cloudOffset,[0,0]);
  ticks(d,100);d.reset();assert.deepEqual(d.simulation.snapshot(),reset);
  d.resetGuard=()=>false;assert.equal(d.reset(),false);
  atmosphere.dispose();
});

test("P1-G: versioned environmental capture validates; legacy adaptation is immutable and seek-order independent", async () => {
  const {attempt}=recording();
  const sealed=await seal(attempt);await parseAttempt(JSON.stringify(sealed));
  for(const f of attempt.frames)assert.deepEqual(replayEnvironment(attempt,f.time),f.environment);
  const legacy=structuredClone(attempt);delete legacy.environment;legacy.frames.forEach(f=>delete f.environment);
  const original=JSON.stringify(legacy), checksum=(await seal(legacy)).sha256;
  const at=replayEnvironment(legacy,.777);
  for(const time of [1.9,0,.777,1.1,.777]){const env=replayEnvironment(legacy,time);if(time===.777)assert.deepEqual(env,at);}
  assert.equal(JSON.stringify(legacy),original);assert.equal((await seal(legacy)).sha256,checksum);
  await parseAttempt(JSON.stringify(await seal(legacy)));
  for(const corrupt of [(a:typeof attempt)=>{a.environment!.version=2 as 1;},
    (a:typeof attempt)=>{a.frames[0].environment!.time=NaN;},
    (a:typeof attempt)=>{delete a.frames[0].environment;},
    (a:typeof attempt)=>{a.frames[0].environment!.seed++;},
    (a:typeof attempt)=>{a.frames[0].environment!.target.direction=361;},
    (a:typeof attempt)=>{a.frames[0].environment!.current.wind++;}]) {
    const bad=structuredClone(attempt);corrupt(bad);assert.throws(()=>validateAttempt(bad),/environment/);
  }
  assert.throws(()=>replayAt(attempt.frames,NaN));
});
