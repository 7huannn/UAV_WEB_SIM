import { Vector3 } from "three";
import { Weather, blendWeather, validWeather, type WeatherParams } from "../weather/Weather";
import { aircraft } from "./parameters";

/** Versioned CPU state, not a promise of exact cross-GPU raster reproduction. */
export type EnvironmentSnapshot = {
  version: 1;
  model: "sinusoidal-bulk-v1";
  seed: number;
  tick: number;
  time: number;
  current: WeatherParams;
  target: WeatherParams;
  wetness: number;
  cloudOffset: [number, number];
};
// ADR-003: existing bulk cloud approximation at (0,270,0), 0.3 transport scale.
export const cloudReference = new Vector3(0, 270, 0);
export const cloudTransportScale = 0.3;

export function validEnvironment(value: unknown): value is EnvironmentSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as EnvironmentSnapshot;
  return s.version === 1 && s.model === "sinusoidal-bulk-v1" && Number.isFinite(s.seed) &&
    Number.isSafeInteger(s.tick) && s.tick >= 0 && s.tick <= 1e9 &&
    Number.isFinite(s.time) && Math.abs(s.time - s.tick * aircraft.fixedDt) < 1e-7 &&
    validWeather(s.current) && validWeather(s.target) &&
    s.current.direction >= 0 && s.current.direction <= 360 &&
    s.target.direction >= 0 && s.target.direction <= 360 &&
    Number.isFinite(s.wetness) && s.wetness >= 0 && s.wetness <= 1 &&
    Array.isArray(s.cloudOffset) && s.cloudOffset.length === 2 &&
    s.cloudOffset.every(v => Number.isFinite(v) && Math.abs(v) <= 1e9);
}

/** Continuous fields interpolate; model/seed/target/tick hold the preceding completed state. */
export function interpolateEnvironment(a: EnvironmentSnapshot, b: EnvironmentSnapshot, alpha: number): EnvironmentSnapshot {
  if (!Number.isFinite(alpha)) throw Error("Invalid environment interpolation fraction");
  const t = Math.max(0, Math.min(1, alpha));
  if (t === 0) return { ...a, current: { ...a.current }, target: { ...a.target }, cloudOffset: [...a.cloudOffset] };
  if (t === 1) return { ...b, current: { ...b.current }, target: { ...b.target }, cloudOffset: [...b.cloudOffset] };
  return { ...a, time: a.time + (b.time - a.time) * t,
    current: blendWeather(a.current, b.current, t), target: { ...a.target },
    wetness: a.wetness + (b.wetness - a.wetness) * t,
    cloudOffset: [a.cloudOffset[0] + (b.cloudOffset[0] - a.cloudOffset[0]) * t,
      a.cloudOffset[1] + (b.cloudOffset[1] - a.cloudOffset[1]) * t] };
}

/** The only production scheduler. Aircraft methods are compatibility delegates to this owner. */
export class Simulation {
  private ticks = 0;
  accumulator = 0;
  droppedTime = 0;
  private pauseState = false;
  /** Host drops its wall-time baseline on resume; no wall clock enters simulation state. */
  onResume?: () => void;
  get paused() { return this.pauseState; }
  set paused(value: boolean) {
    if (this.pauseState && !value) this.onResume?.();
    this.pauseState = value;
  }
  private cloudOffset: [number, number] = [0, 0];
  private wind = new Vector3();
  private previous: EnvironmentSnapshot;
  constructor(readonly weather: Weather,
    private integrate: (dt: number, thrust?: number[]) => void,
    private completed: () => void) {
    this.previous = this.snapshot();
  }
  get tick() { return this.ticks; }
  get time() { return this.ticks * aircraft.fixedDt; }
  snapshot(): EnvironmentSnapshot {
    return { version: 1, model: "sinusoidal-bulk-v1", seed: this.weather.seed,
      tick: this.ticks, time: this.time, current: { ...this.weather.current },
      target: { ...this.weather.target }, wetness: this.weather.wetness, cloudOffset: [...this.cloudOffset] };
  }
  presentation(alpha = 1) { return interpolateEnvironment(this.previous, this.snapshot(), alpha); }
  initializeWeather() {
    this.weather.current = { ...this.weather.target };
    this.weather.wetness = this.weather.current.rain;
    this.previous = this.snapshot();
  }
  reset() {
    this.ticks = 0;
    this.accumulator = this.droppedTime = 0;
    this.paused = false;
    this.cloudOffset = [0, 0];
    this.initializeWeather();
  }
  /** Explicit completed-state restore; also used by evaluator-only test fixtures. */
  restore(state: EnvironmentSnapshot) {
    if (!validEnvironment(state) || state.seed !== this.weather.seed) throw Error("Invalid environment restore");
    this.ticks = state.tick;
    this.weather.current = { ...state.current };
    this.weather.target = { ...state.target };
    this.weather.wetness = state.wetness;
    this.cloudOffset = [...state.cloudOffset];
    this.accumulator = 0;
    this.previous = this.snapshot();
  }
  advance(elapsed: number) {
    if (this.paused || !Number.isFinite(elapsed) || elapsed <= 0) return;
    const admitted = Math.min(elapsed, 0.1);
    this.droppedTime += elapsed - admitted;
    this.accumulator += admitted;
    while (!this.paused && this.accumulator + 1e-12 >= aircraft.fixedDt) {
      this.accumulator = Math.max(0, this.accumulator - aircraft.fixedDt);
      this.step();
    }
  }
  step(thrust?: number[]) {
    if (thrust !== undefined && (!Array.isArray(thrust) || thrust.length !== 4 || !thrust.every(Number.isFinite)))
      throw Error("Motor override requires four finite thrust commands");
    if (this.paused) return;
    this.previous = this.snapshot();
    this.weather.step(aircraft.fixedDt);
    this.ticks++;
    this.integrate(aircraft.fixedDt, thrust);
    this.weather.windAt(this.time, cloudReference, this.wind);
    this.cloudOffset[0] += this.wind.x * aircraft.fixedDt * cloudTransportScale;
    this.cloudOffset[1] += this.wind.z * aircraft.fixedDt * cloudTransportScale;
    this.completed();
  }
}
