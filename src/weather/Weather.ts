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
    for (const k of Object.keys(this.current) as (keyof WeatherParams)[])
      this.current[k] +=
        (this.target[k] - this.current[k]) * (1 - Math.exp(-dt / 2));
    this.wetness +=
      (this.current.rain - this.wetness) *
      (1 - Math.exp(-dt / (this.current.rain > this.wetness ? 7 : 32)));
  }
  windAt(time: number, position = new Vector3(), out = new Vector3()): Vector3 {
    const w = this.current,
      phase = this.seed * 0.137;
    const gust =
      w.gust *
      (0.5 + 0.5 * Math.sin(time * 0.71 + phase)) *
      Math.sin(time * 1.9 + phase);
    const t = w.turbulence;
    const angle = (w.direction * Math.PI) / 180;
    return out.set(
      Math.cos(angle) * (w.wind + gust) +
        t * Math.sin(time * 3.7 + position.z * 0.13 + phase),
      t * 0.32 * Math.sin(time * 5.1 + position.x * 0.2 + phase),
      Math.sin(angle) * (w.wind + gust) +
        t * Math.cos(time * 4.3 + position.x * 0.17 + phase),
    );
  }
}
