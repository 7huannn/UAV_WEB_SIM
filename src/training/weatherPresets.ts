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
