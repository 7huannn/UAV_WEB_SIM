import { presets, type WeatherParams } from "../weather/Weather";
export const windLevels = {
  calm: { label: "Không gió", wind: 0, gust: 0, turbulence: 0, direction: 65 },
  light: { label: "Gió nhẹ", ...pickWind(presets["Clear skies"]) },
  medium: { label: "Gió trung bình", ...pickWind(presets.Overcast) },
  strong: { label: "Gió mạnh", ...pickWind(presets["Wind & gusts"]) },
};
function pickWind(p: WeatherParams) {
  return {
    wind: p.wind,
    gust: p.gust,
    turbulence: p.turbulence,
    direction: p.direction,
  };
}
export const conditions = {
  clear: "Trời quang",
  cloudy: "Nhiều mây",
  rain: "Mưa",
};
export type WindLevel = keyof typeof windLevels;
export type Condition = keyof typeof conditions;
export function simpleWeather(
  wind: WindLevel,
  condition: Condition,
): WeatherParams {
  const sky =
    presets[
      condition === "rain"
        ? "Light rain"
        : condition === "cloudy"
          ? "Overcast"
          : "Clear skies"
    ];
  const { label: _, ...physical } = windLevels[wind];
  return { ...sky, ...physical };
}
export function weatherSummary(p: WeatherParams) {
  return `Gió nền ${p.wind.toFixed(1)} m/s · gió giật tối đa ±${p.gust.toFixed(1)} m/s · ${p.rain > 0 ? "Mưa" : p.cloud > 0.6 ? "Nhiều mây" : "Trời quang"}`;
}

// Teaching scale, not legal wind limits or calibrated rainfall in mm/h.
export function validLevel(n: number) {
  return Number.isInteger(n) && n >= 0 && n <= 10;
}
export function weatherAtLevels(base: WeatherParams, wind?: number, rain?: number): WeatherParams {
  if ((wind !== undefined && !validLevel(wind)) || (rain !== undefined && !validLevel(rain)))
    throw new Error("Weather level must be an integer from 0 to 10");
  const result = { ...base };
  if (wind !== undefined) Object.assign(result, { wind: wind * 0.9, gust: wind * 0.4, turbulence: wind * 0.07 });
  if (rain !== undefined) {
    const r = rain / 10;
    Object.assign(result, { rain: r, cloud: 0.12 + 0.88 * r, visibility: 650 - 555 * r });
  }
  return result;
}
export function windLevelOf(p: WeatherParams) {
  const n = Math.round(p.wind / 0.9);
  return validLevel(n) && Math.abs(p.wind - n * 0.9) < 1e-6 && Math.abs(p.gust - n * 0.4) < 1e-6 && Math.abs(p.turbulence - n * 0.07) < 1e-6 ? n : null;
}
export function levelDescription(n: number, rain = false) {
  return n === 0 ? (rain ? "Không mưa" : "Không gió") : n <= 3 ? "Nhẹ" : n <= 6 ? "Trung bình" : "Mạnh";
}
