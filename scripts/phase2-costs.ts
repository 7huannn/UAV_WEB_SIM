import ts from "typescript";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir, cpus } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { Weather } from "../src/weather/Weather";
import { DroneDynamics } from "../src/simulation/DroneDynamics";

// Benchmark-only derivative removes optional diagnostic branches from the same
// final source. It never enters the product or a saved attempt. The original
// Phase 1 CPU microbenchmark remains historical; its source was not checked in.
const source = await readFile("src/simulation/DroneDynamics.ts", "utf8");
const tree = ts.createSourceFile("DroneDynamics.ts", source, ts.ScriptTarget.Latest, true);
const cuts: [number, number][] = [];
function walk(node: ts.Node) {
  if (ts.isIfStatement(node) && node.expression.getText(tree) === "diagnostics") cuts.push([node.getStart(tree), node.end]);
  if (ts.isVariableStatement(node) && node.getText(tree).trim() === "const diagnostics = this.diagnostics;") cuts.push([node.getStart(tree), node.end]);
  ts.forEachChild(node, walk);
}
walk(tree);
let stripped = source;
for (const [start, end] of cuts.sort((a, b) => b[0] - a[0])) stripped = stripped.slice(0, start) + stripped.slice(end);
for (const [from, to] of [["../arena/geometry", "src/arena/geometry.ts"], ["./missions", "src/simulation/missions.ts"],
  ["../weather/Weather", "src/weather/Weather.ts"], ["./Simulation", "src/simulation/Simulation.ts"],
  ["./parameters", "src/simulation/parameters.ts"]]) stripped = stripped.replace(JSON.stringify(from), JSON.stringify(resolve(to)));
const temp = await mkdtemp(join(tmpdir(), "uav-p2-cost-"));
try {
  await writeFile(join(temp, "DroneDynamics.ts"), stripped);
  await writeFile(join(temp, "package.json"), '{"type":"module"}');
  await symlink(resolve("node_modules"), join(temp, "node_modules"));
  const Before = (await import(pathToFileURL(join(temp, "DroneDynamics.ts")).href)).DroneDynamics as typeof DroneDynamics;
  const scenarios: Record<string, unknown> = {};
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
  function fixture(Plant: typeof DroneDynamics, wind: boolean, enabled: boolean) {
    const w = new Weather(42);
    Object.assign(w.current, { wind: wind ? 9 : 0, direction: 80, gust: wind ? 4 : 0, turbulence: wind ? .7 : 0 });
    w.target = { ...w.current };
    const d = new Plant(w); d.takeoff(); d.enableDiagnostics(enabled);
    for (let i = 0; i < 10000; i++) d.advance(.004);
    return d;
  }
  for (const wind of [false, true]) {
    const pair = { stripped: fixture(Before, wind, false), off: fixture(DroneDynamics, wind, false), on: fixture(DroneDynamics, wind, true) };
    const timings: Record<string, number[]> = { stripped: [], off: [], on: [] };
    const names = ["stripped", "off", "on"];
    for (let batch = 0; batch < 9; batch++) {
      for (let order = 0; order < 3; order++) {
        const name = names[(batch + order) % 3], d = pair[name as keyof typeof pair];
        const start = performance.now();
        for (let i = 0; i < 10000; i++) d.advance(.004);
        timings[name].push((performance.now() - start) / 10); // µs per tick averaged over batch
      }
    }
    const state = (d: DroneDynamics) => ({ time: d.time, position: d.position.toArray(), velocity: d.velocity.toArray(),
      orientation: d.orientation.toArray(), motors: d.motors, rates: d.angularVelocity.toArray() });
    const exactState = JSON.stringify(state(pair.stripped)) === JSON.stringify(state(pair.off)) &&
      JSON.stringify(state(pair.off)) === JSON.stringify(state(pair.on));
    const stats = Object.fromEntries(names.map(name => [name, { batches: timings[name].length,
      medianMicrosecondsPerTick: median(timings[name]), p95MicrosecondsPerTick: percentile(timings[name], .95),
      p99MicrosecondsPerTick: percentile(timings[name], .99), rawBatchMeanMicrosecondsPerTick: timings[name] }]));
    const old = stats.stripped as { medianMicrosecondsPerTick: number; p95MicrosecondsPerTick: number };
    const off = stats.off as typeof old, on = stats.on as typeof old;
    const disabledCost = off.medianMicrosecondsPerTick - old.medianMicrosecondsPerTick;
    const enabledCost = on.medianMicrosecondsPerTick - old.medianMicrosecondsPerTick;
    scenarios[wind ? "F2" : "F0"] = { exactState, stats, disabledCost, enabledCost,
      disabledMedianPass: disabledCost <= Math.max(.1 * old.medianMicrosecondsPerTick, .25),
      disabledP95Pass: off.p95MicrosecondsPerTick - old.p95MicrosecondsPerTick <= Math.max(.2 * old.p95MicrosecondsPerTick, .5),
      enabledMedianPass: enabledCost <= Math.max(.25 * old.medianMicrosecondsPerTick, 1) };
  }
  const result = { date: new Date().toISOString(), contract: "P2-v1", node: process.version, cpu: cpus()[0]?.model,
    finalSourceSHA256: createHash("sha256").update(source).digest("hex"),
    comparator: "diagnostics-stripped derivative of final Dynamics source; one plant equation set, same current Simulation/Weather/parameters; exact final states checked",
    removedDiagnosticIfStatements: cuts.length - 2, batchesPerMode: 9, stepsPerBatch: 10000, warmupSteps: 10000,
    units: "microseconds per tick; batch means, not individual-tick latency", scenarios,
    limit: "Measures optional diagnostic branch cost. The narrow Simulation override guard is shared by both comparators. This is Node CPU, not browser/GPU capacity." };
  await writeFile("docs/simulation/evidence/phase-2/costs.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ comparator: result.comparator, scenarios }, null, 2));
} finally { await rm(temp, { recursive: true, force: true }); }
