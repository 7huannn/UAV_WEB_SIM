import { mkdtemp, symlink, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir, cpus } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Weather } from "../src/weather/Weather";
import { DroneDynamics } from "../src/simulation/DroneDynamics";
import { TrainingSession } from "../src/training/Session";
import { ControllerInput } from "../src/training/input";
import { PILOT_STATION } from "../src/training/pilot";
import { validateAttempt, replayEnvironment } from "../src/training/records";

const base="aeeeccd617e39b0bff7c9aae717c6c7af0416946", temporary=await mkdtemp(join(tmpdir(),"uav-p1-bench-"));
try {
  // Read-only historical kernel; temporary imports use unchanged current parameters/missions and
  // the same wind formula. No checkout, competing runtime pipeline or dependency installation.
  if (!process.argv[2]) throw Error('Supply a temporary baseline source file produced with git show '+base+':src/simulation/DroneDynamics.ts');
  let source=await readFile(process.argv[2], 'utf8');
  for(const [from,to] of [['../arena/geometry','src/arena/geometry.ts'],['./missions','src/simulation/missions.ts'],
    ['../weather/Weather','src/weather/Weather.ts'],['./parameters','src/simulation/parameters.ts']])
    source=source.replace(JSON.stringify(from),JSON.stringify(resolve(to)));
  await writeFile(join(temporary,'DroneDynamics.ts'),source);
  await writeFile(join(temporary,'package.json'),'{"type":"module"}');
  await symlink(resolve('node_modules'),join(temporary,'node_modules'));
  const Old=(await import(pathToFileURL(join(temporary,'DroneDynamics.ts')).href)).DroneDynamics;
  function run(Plant:typeof DroneDynamics) {
    const weather=new Weather(17);weather.current={...weather.current,wind:8,gust:2,turbulence:.4};weather.target={...weather.current};
    const d=new Plant(weather);d.takeoff();
    for(let i=0;i<2500;i++)d.advance(.004);
    const durations=[];
    for(let batch=0;batch<7;batch++){const started=performance.now();for(let i=0;i<10000;i++)d.advance(.004);durations.push(performance.now()-started);}
    durations.sort((a,b)=>a-b);
    return {stepsPerBatch:10000,batches:7,medianBatchMs:durations[3],minBatchMs:durations[0],maxBatchMs:durations.at(-1),medianMicrosecondsPerTick:durations[3]/10};
  }
  const before=run(Old),after=run(DroneDynamics);
  const weather=new Weather();weather.current={...weather.current,wind:0,gust:0,turbulence:0};weather.target={...weather.current};
  const d=new DroneDynamics(weather),input=new ControllerInput(),session=new TrainingSession('capacity fixture','Training','foundations',d,weather,input,PILOT_STATION);
  d.arm();session.start(d);d.afterStep=()=>session.sample(d,weather,input,'PILOT VLOS');
  const started=performance.now();for(let i=0;i<150000;i++)d.advance(.004);
  session.abort('600-second capacity fixture');const attempt=session.snapshot();validateAttempt(attempt);
  const encodeStart=performance.now();
  const encoded=JSON.stringify(attempt),encodeMs=performance.now()-encodeStart;
  const bytes=Buffer.byteLength(encoded);
  const legacy=structuredClone(attempt);delete legacy.environment;legacy.frames.forEach(f=>delete f.environment);
  const legacyBytes=Buffer.byteLength(JSON.stringify(legacy)),cacheStart=performance.now();replayEnvironment(legacy,599);
  const cacheMs=performance.now()-cacheStart,seekStart=performance.now();for(let i=0;i<1000;i++)replayEnvironment(legacy,(i*17.37)%600);
  const result={date:new Date().toISOString(),node:process.version,cpu:cpus()[0]?.model,baseline:base,before,after,
    addedCpuMsPerSimulatedSecond:(after.medianMicrosecondsPerTick-before.medianMicrosecondsPerTick)*250/1000,
    recording:{seconds:600,frames:attempt.frames.length,bytes,legacyBytes,extensionBytesPerSecond:(bytes-legacyBytes)/600,
      serializationMs:encodeMs,observedProcessMemory:process.memoryUsage(),memoryNote:"Node workload holds new attempt, encoded JSON and legacy clone; not a browser/GPU footprint or normalized peak.",
      below100MBImportLimit:bytes<=100000000,legacyTransportCacheBytes:attempt.frames.length*16,cacheBuildMs:cacheMs,
      thousandSeeksMs:performance.now()-seekStart,totalFixtureMs:performance.now()-started},
    limits:'Node CPU microbenchmark, no rendering; old kernel uses unchanged current wind formula; not a hardware GPU or real-aircraft benchmark.'};
  await writeFile('docs/simulation/evidence/phase-1/costs.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await rm(temporary,{recursive:true,force:true});}
