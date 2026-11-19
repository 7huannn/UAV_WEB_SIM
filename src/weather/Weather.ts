import { Vector3 } from "three";
export const presets = {
  "Clear skies": {
    wind: 1.8,
    direction: 65,
    gust: 0.6,
    turbulence: 0.15,
    cloud: 0.12,
    rain: 0,
    visibility: 650,
    timeOfDay: 15.5,
  },
  "Partly cloudy": {
    wind: 3.2,
    direction: 80,
    gust: 1.2,
    turbulence: 0.25,
    cloud: 0.42,
    rain: 0,
    visibility: 500,
    timeOfDay: 14,
  },
  Overcast: {
    wind: 3.8,
    direction: 110,
    gust: 1.8,
    turbulence: 0.3,
    cloud: 0.92,
    rain: 0,
    visibility: 260,
    timeOfDay: 13,
  },
  "Light rain": {
    wind: 4,
    direction: 100,
    gust: 1.5,
    turbulence: 0.3,
    cloud: 0.85,
    rain: 0.3,
    visibility: 180,
    timeOfDay: 14,
  },
  "Heavy rain": {
    wind: 7,
    direction: 115,
    gust: 3,
    turbulence: 0.55,
    cloud: 1,
    rain: 0.95,
    visibility: 95,
    timeOfDay: 13,
  },
  "Wind & gusts": {
    wind: 9,
    direction: 80,
    gust: 4,
    turbulence: 0.7,
    cloud: 0.4,
    rain: 0,
    visibility: 450,
    timeOfDay: 15,
  },
} as const;
export type Preset = keyof typeof presets;
export type WeatherParams = {
  -readonly [K in keyof (typeof presets)["Clear skies"]]: number;
};
export const directionDelta = (from: number, to: number) => {
  const delta = ((to - from) % 360 + 540) % 360 - 180;
  return delta === -180 ? 180 : delta;
};
export function blendWeather(a: WeatherParams, b: WeatherParams, fraction: number): WeatherParams {
  const result = { ...a };
  for (const key of Object.keys(a) as (keyof WeatherParams)[])
    result[key] += (key === "direction" ? directionDelta(a[key], b[key]) : b[key] - a[key]) * fraction;
  result.direction = (result.direction % 360 + 360) % 360;
  return result;
}
export function validWeather(value: unknown): value is WeatherParams {
  if (!value || typeof value !== "object") return false;
  const w = value as WeatherParams;
  return Object.keys(presets["Clear skies"]).every(k => Number.isFinite(w[k as keyof WeatherParams])) &&
    w.wind >= 0 && w.wind <= 30 && w.gust >= 0 && w.gust <= 20 &&
    w.turbulence >= 0 && w.turbulence <= 5 && w.cloud >= 0 && w.cloud <= 1 &&
    w.rain >= 0 && w.rain <= 1 && w.visibility > 0 && w.visibility <= 100000 &&
    w.timeOfDay >= 0 && w.timeOfDay <= 24;
}
/** SI world velocity; towards direction from +X to +Z. Shared by physics and presentation. */
export function sampleWind(w: WeatherParams, seed: number, time: number, position: Vector3, out: Vector3): Vector3 {
  const phase = seed * 0.137;
  const gust = w.gust * (0.5 + 0.5 * Math.sin(time * 0.71 + phase)) * Math.sin(time * 1.9 + phase);
  const t = w.turbulence, angle = ((w.direction % 360) * Math.PI) / 180;
  return out.set(
    Math.cos(angle) * (w.wind + gust) + t * Math.sin(time * 3.7 + position.z * 0.13 + phase),
    t * 0.32 * Math.sin(time * 5.1 + position.x * 0.2 + phase),
    Math.sin(angle) * (w.wind + gust) + t * Math.cos(time * 4.3 + position.x * 0.17 + phase),
  );
}
export class Weather {
  readonly seed: number;
  target: WeatherParams = { ...presets["Clear skies"] };
  current: WeatherParams = { ...this.target };
  wetness = 0;
  preset: Preset = "Clear skies";
  constructor(seed = 42) {
    this.seed = seed;
  }
  setPreset(p: Preset) {
    this.preset = p;
    this.target = { ...presets[p] };
  }
  step(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const k of Object.keys(this.current) as (keyof WeatherParams)[])
      this.current[k] +=
        (k === "direction" ? directionDelta(this.current[k], this.target[k]) : this.target[k] - this.current[k]) * (1 - Math.exp(-dt / 2));
    this.current.direction = (this.current.direction % 360 + 360) % 360;
    this.wetness +=
      (this.current.rain - this.wetness) *
      (1 - Math.exp(-dt / (this.current.rain > this.wetness ? 7 : 32)));
  }
  windAt(time: number, position = new Vector3(), out = new Vector3()): Vector3 {
    return sampleWind(this.current, this.seed, time, position, out);
  }
}
