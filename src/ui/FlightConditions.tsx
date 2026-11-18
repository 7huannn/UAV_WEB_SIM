import { useEffect, useId, useRef, useState } from "react";
import type { World } from "../scene/World";
import { presets, type Preset } from "../weather/Weather";
import {
  levelDescription,
  weatherSummary,
  windLevelOf,
} from "../training/weatherPresets";
import { remember } from "./LearnerControls";
import { Icon } from "./Design";
import { vi } from "./vi";

export function FlightConditions({
  w,
  onUpdate,
}: {
  w: World;
  onUpdate: () => void;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  const description = useId();
  const [changed, setChanged] = useState(false);
  const p = w.weather.target;
  const wind = windLevelOf(p),
    rain = Math.round(p.rain * 10),
    customRain = Math.abs(p.rain * 10 - rain) > 1e-6;
  const editable = w.canAdjustFlightConditions;
  const exam = w.workspace === "Mock Examination";
  const ready = w.session?.state === "READY";
  const paused = w.session?.state === "PAUSED";
  const state = w.session?.state;
  useEffect(() => {
    if (
      state &&
      ["ACTIVE", "TASK_COMPLETE", "LANDING", "POSTFLIGHT"].includes(state) &&
      panel.current
    )
      panel.current.open = false;
  }, [state]);
  const timing = !editable
    ? exam
      ? "Điều kiện thi thử đã cố định khi bắt đầu. Bạn có thể chọn lại ở lượt thi tiếp theo."
      : "Bài bay đã hoàn tất. Chọn điều kiện mới ở lượt tiếp theo."
    : ready
      ? exam
        ? "Áp dụng cho lượt thi này. Điều kiện sẽ cố định khi bạn bắt đầu."
        : "Áp dụng cho bài bay này ngay khi bắt đầu."
      : paused
        ? "Bài bay đang tạm dừng. Điều kiện chuyển dần khi bạn tiếp tục; vị trí và tiến độ được giữ nguyên."
        : "Áp dụng ngay trong sân, chuyển dần trong vài giây. Không cần bắt đầu lại.";
  function apply(fn: () => boolean, a?: number, b?: number) {
    if (!fn()) return;
    // Demo conditions stay local; practice and examination remember separate levels.
    if (w.workspace !== "Reference missions") {
      const prefix = exam ? "uav-assessment" : "uav-practice";
      if (a !== undefined) remember(prefix + "-wind-level", String(a));
      if (b !== undefined) remember(prefix + "-rain-level", String(b));
    }
    setChanged(true);
    onUpdate();
  }
  function close() {
    if (panel.current) {
      panel.current.open = false;
      panel.current.querySelector("summary")?.focus();
    }
  }
  return (
    <details
      ref={panel}
      name="flight-tools"
      className="conditions-control"
      onToggle={(e) => {
        if (!e.currentTarget.open) return;
        w.keys.clear();
        if (
          editable &&
          w.session &&
          ["ACTIVE", "TASK_COMPLETE", "LANDING"].includes(w.session.state)
        )
          w.session.pause(w.drone);
        onUpdate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <summary>
        <Icon name="wind" size={19} />
        <span>Điều kiện bay</span>
        <small>
          {wind === null ? "Gió tùy chỉnh" : `Gió ${wind}`} · Mưa{" "}
          {customRain ? `${Math.round(p.rain * 100)}%` : rain}
        </small>
      </summary>
      <section
        className="conditions-panel"
        aria-label="Điều chỉnh điều kiện bay"
      >
        <div className="conditions-heading">
          <div>
            <span className="eyebrow">
              {exam ? "ĐIỀU KIỆN THI THỬ" : "THỬ SỨC THEO TỪNG MỨC ĐỘ"}
            </span>
            <h2>Gió & mưa</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Đóng điều kiện bay"
            onClick={close}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p id={description} className="conditions-timing" role="status">
          {changed && editable && <b>Đã chọn điều kiện mới. </b>}
          {timing}
        </p>
        <fieldset disabled={!editable} aria-describedby={description}>
          <legend className="sr-only">Mức độ gió và mưa</legend>
          <label>
            <span>
              <b>Gió</b>
              <output>
                {wind === null
                  ? "Tùy chỉnh"
                  : `${wind}/10 · ${levelDescription(wind)}`}
              </output>
            </span>
            <input
              aria-label="Mức gió"
              aria-valuetext={
                wind === null
                  ? `Tùy chỉnh, ${p.wind.toFixed(1)} mét mỗi giây`
                  : `${wind} trên 10, ${levelDescription(wind)}`
              }
              type="range"
              min="0"
              max="10"
              step="1"
              value={wind ?? Math.min(10, Math.round(p.wind / 0.9))}
              onChange={(e) => {
                const n = +e.target.value;
                apply(() => w.setWeatherLevels(n), n);
              }}
            />
            <span className="range-endpoints">
              <span>0 · Không gió</span>
              <span>10 · Mạnh</span>
            </span>
          </label>
          <label>
            <span>
              <b>Mưa</b>
              <output>
                {customRain
                  ? `Tùy chỉnh · ${Math.round(p.rain * 100)}%`
                  : `${rain}/10 · ${levelDescription(rain, true)}`}
              </output>
            </span>
            <input
              aria-label="Mức mưa"
              aria-valuetext={
                customRain
                  ? `Tùy chỉnh, ${Math.round(p.rain * 100)} phần trăm`
                  : `${rain} trên 10, ${levelDescription(rain, true)}`
              }
              type="range"
              min="0"
              max="10"
              step="1"
              value={rain}
              onChange={(e) => {
                const n = +e.target.value;
                apply(() => w.setWeatherLevels(undefined, n), undefined, n);
              }}
            />
            <span className="range-endpoints">
              <span>0 · Không mưa</span>
              <span>10 · Mưa mạnh</span>
            </span>
          </label>
          <p className="conditions-summary">{weatherSummary(p)}</p>
          <button
            className="text-button conditions-reset"
            onClick={() => apply(() => w.setWeatherLevels(0, 0), 0, 0)}
          >
            Không gió, không mưa
          </button>
          <details className="conditions-advanced">
            <summary>Tinh chỉnh môi trường</summary>
            <label>
              Kịch bản thời tiết
              <select
                aria-label="Kịch bản thời tiết"
                value=""
                onChange={(e) =>
                  apply(() => w.setWeatherPreset(e.target.value as Preset))
                }
              >
                <option value="" disabled>
                  Chọn kịch bản…
                </option>
                {Object.keys(presets).map((v) => (
                  <option key={v} value={v}>
                    {vi(v)}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["wind", 0, 15, 0.1, "Gió nền (m/s)"],
                ["direction", 0, 360, 1, "Hướng gió (độ)"],
                ["gust", 0, 7, 0.1, "Gió giật (m/s)"],
                ["turbulence", 0, 1, 0.05, "Nhiễu gió"],
                ["rain", 0, 1, 0.05, "Cường độ mưa"],
                ["cloud", 0, 1, 0.05, "Mức mây"],
                ["visibility", 60, 800, 10, "Tầm nhìn (m)"],
                ["timeOfDay", 7, 18, 0.1, "Giờ trong ngày"],
              ] as const
            ).map(([key, min, max, step, label]) => (
              <label key={key}>
                <span>
                  {label}
                  <output>{p[key].toFixed(1)}</output>
                </span>
                <input
                  type="range"
                  aria-label={label}
                  min={min}
                  max={max}
                  step={step}
                  value={p[key]}
                  onChange={(e) =>
                    apply(() => w.setAdvancedWeather(key, +e.target.value))
                  }
                />
              </label>
            ))}
          </details>
        </fieldset>
        <p className="conditions-footnote">
          Mức mô phỏng dùng để luyện tập. Gió tác động đường bay; mưa thay đổi
          hình ảnh, chưa quy đổi sang mm/giờ.
        </p>
      </section>
    </details>
  );
}
