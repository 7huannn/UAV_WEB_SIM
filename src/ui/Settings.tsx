import { useState } from "react";
import type { World } from "../scene/World";
import { presets, type Preset } from "../weather/Weather";
import { frontPilotStation, validFrontStation } from "../training/pilot";
import { profiles, rules } from "../training/profiles";
import { Calibration } from "./Calibration";
import { Icon } from "./Design";
import {
  InputCheck,
  PilotDiagram,
  remember,
  WindSelector,
} from "./LearnerControls";
import { vi } from "./vi";
export function Settings({
  w,
  page,
  navigate,
}: {
  w: World;
  page: string;
  navigate: (p: string) => void;
}) {
  const [, refresh] = useState(0);
  const [message, setMessage] = useState("");
  const [station, setStation] = useState(() => ({ ...w.pilotStation }));
  const update = () => refresh((n) => n + 1);
  const run = (fn: () => unknown, success = "Đã cập nhật cài đặt.") => {
    try {
      setMessage(
        fn() === false
          ? "Chưa thể thay đổi. Kết thúc bài bay rồi thử lại."
          : success,
      );
      update();
    } catch {
      setMessage(
        "Chưa lưu được cài đặt. Kiểm tra quyền lưu trữ của trình duyệt rồi thử lại.",
      );
    }
  };
  const calibration = page === "Controller Calibration",
    criteria = page === "Examination Profiles";
  return (
    <main className="settings-page page-enter" id="main-content" tabIndex={-1}>
      {(calibration || criteria) && (
        <button
          className="text-button back-link"
          onClick={() => navigate("System Configuration")}
        >
          <Icon name="back" size={18} /> Về cài đặt
        </button>
      )}
      <div className="page-heading">
        <span className="eyebrow">THEO CÁCH CỦA BẠN</span>
        <h1>
          {calibration
            ? "Tay điều khiển"
            : criteria
              ? "Bài bay & tiêu chí"
              : "Cài đặt của bạn"}
        </h1>
        <p>
          {calibration
            ? "Kết nối, kiểm tra phản hồi và hiệu chỉnh từng trục điều khiển."
            : criteria
              ? "Hiểu rõ mục tiêu trước khi vào sân. Các tiêu chí chỉ dùng để luyện tập."
              : "Một vài điều chỉnh để mỗi lần bay đều thoải mái."}
        </p>
      </div>
      {calibration ? (
        <section className="settings-section">
          <Calibration
            w={w}
            update={update}
            run={run}
            setMessage={setMessage}
          />
        </section>
      ) : criteria ? (
        <div className="criteria-grid">
          {Object.values(profiles).map((p) => (
            <section className="settings-section" key={p.id}>
              <span className="eyebrow">BÀI BAY · {p.version}</span>
              <h2>{vi(p.name)}</h2>
              <ol>
                {p.tasks.map((task) => (
                  <li key={task.id}>{vi(task.label)}</li>
                ))}
                <li>Trở về H, tự hạ cánh và tắt động cơ.</li>
              </ol>
            </section>
          ))}
          <details className="settings-section">
            <summary>Tiêu chí kỹ thuật</summary>
            <dl className="rule-list">
              {Object.entries(rules).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
            <p>
              Tiêu chí giả định cho mô phỏng, không phải kết quả sát hạch chính
              thức.
            </p>
          </details>
        </div>
      ) : (
        <div className="settings-layout">
          <div className="settings-column">
            <section className="settings-section">
              <div className="section-title">
                <span className="section-icon">
                  <Icon name="keyboard" />
                </span>
                <div>
                  <span className="eyebrow">01 / ĐIỀU KHIỂN</span>
                  <h2>Chọn cách cầm lái</h2>
                </div>
              </div>
              <InputCheck w={w} onUpdate={update} />
              <button
                className="text-button"
                onClick={() => navigate("Controller Calibration")}
              >
                Hiệu chỉnh tay điều khiển <Icon name="arrow" size={17} />
              </button>
            </section>
            <section className="settings-section">
              <div className="section-title">
                <span className="section-icon">
                  <Icon name="eye" />
                </span>
                <div>
                  <span className="eyebrow">02 / HIỂN THỊ</span>
                  <h2>Hình ảnh vừa sức thiết bị</h2>
                </div>
              </div>
              <label>
                Chất lượng hình ảnh
                <select
                  aria-label="Hiển thị"
                  value={w.quality}
                  onChange={(e) =>
                    run(() => {
                      w.setQuality(e.target.value as World["quality"]);
                      remember("uav-display-quality", e.target.value);
                    })
                  }
                >
                  <option value="Low">Ưu tiên mượt</option>
                  <option value="Medium">Cân bằng</option>
                  <option value="High">Ưu tiên hình ảnh</option>
                  <option value="Ultra">Chi tiết tối đa</option>
                </select>
              </label>
              <p className="muted">
                Nếu hình ảnh bị giật, chọn Ưu tiên mượt. Chất lượng hình ảnh
                không thay đổi mô hình bay.
              </p>
            </section>
          </div>
          <div className="settings-column">
            <section className="settings-section">
              <div className="section-title">
                <span className="section-icon">
                  <Icon name="wind" />
                </span>
                <div>
                  <span className="eyebrow">03 / ĐIỀU KIỆN BAY</span>
                  <h2>Thử sức theo từng mức độ</h2>
                </div>
              </div>
              <WindSelector w={w} onUpdate={update} />
              <details>
                <summary>Điều kiện cho lần thi thử tiếp theo</summary>
                <WindSelector w={w} assessment onUpdate={update} />
                <p className="muted">Được cố định khi bắt đầu thi thử.</p>
              </details>
            </section>
            <section className="settings-section settings-links">
              <h2>Khám phá thêm</h2>
              <button onClick={() => navigate("Examination Profiles")}>
                <span>Bài bay và tiêu chí</span>
                <Icon name="arrow" size={18} />
              </button>
              <button onClick={() => navigate("Reference missions")}>
                <span>Xem bay mẫu tự động</span>
                <Icon name="arrow" size={18} />
              </button>
              <p className="muted">
                Bay mẫu chỉ để quan sát, không tính vào kết quả luyện tập.
              </p>
            </section>
          </div>
          <details className="settings-section advanced-settings">
            <summary>Cài đặt nâng cao</summary>
            <div className="advanced-grid">
              <fieldset>
                <legend>Thời tiết chi tiết</legend>
                <label>
                  Kịch bản thời tiết
                  <select
                    aria-label="Kịch bản thời tiết luyện tập"
                    defaultValue=""
                    onChange={(e) =>
                      run(() => w.setWeatherPreset(e.target.value as Preset))
                    }
                  >
                    <option value="" disabled>
                      Chọn kịch bản…
                    </option>
                    {Object.keys(presets).map((p) => (
                      <option key={p} value={p}>
                        {vi(p)}
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
                      {label} <b>{w.weather.target[key].toFixed(1)}</b>
                    </span>
                    <input
                      type="range"
                      aria-label={`Chi tiết ${key}`}
                      min={min}
                      max={max}
                      step={step}
                      value={w.weather.target[key]}
                      onChange={(e) =>
                        run(() => w.setAdvancedWeather(key, +e.target.value))
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Góc nhìn người lái</legend>
                <PilotDiagram station={station} />
                {(
                  [
                    ["setback", 0.1, 7, 0.1, "Khoảng lùi ngoài sân (m)"],
                    ["eyeHeight", 1, 2.2, 0.01, "Chiều cao mắt (m)"],
                    ["verticalFov", 35, 80, 1, "Góc nhìn dọc (độ)"],
                  ] as const
                ).map(([key, min, max, step, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      aria-label={`Pilot ${key}`}
                      min={min}
                      max={max}
                      step={step}
                      value={station[key] ?? 3.5}
                      onChange={(e) =>
                        setStation(
                          key === "setback"
                            ? {
                                ...frontPilotStation(+e.target.value),
                                eyeHeight: station.eyeHeight,
                                verticalFov: station.verticalFov,
                              }
                            : { ...station, [key]: +e.target.value },
                        )
                      }
                    />
                  </label>
                ))}
                {!validFrontStation(station) && (
                  <p role="alert">Kiểm tra lại giới hạn vị trí và góc nhìn.</p>
                )}
                <button
                  disabled={!validFrontStation(station)}
                  onClick={() =>
                    run(
                      () => w.configureStation(station),
                      "Đã lưu góc nhìn người lái.",
                    )
                  }
                >
                  Lưu góc nhìn
                </button>
              </fieldset>
              <fieldset>
                <legend>Lớp phủ kỹ thuật</legend>
                {(
                  [
                    [
                      "Vị trí người lái",
                      w.pilotMarker.visible,
                      (v: boolean) => w.setPilotMarker(v),
                    ],
                    [
                      "Nhãn mốc sân",
                      w.labels.visible,
                      (v: boolean) => w.setLabels(v),
                    ],
                    [
                      "Khung va chạm",
                      w.debug.visible,
                      (v: boolean) => w.setDebug(v),
                    ],
                    [
                      "Phông cảnh xa",
                      w.context.visible,
                      (v: boolean) => {
                        w.context.visible = v;
                      },
                    ],
                  ] as const
                ).map(([label, checked, change]) => (
                  <label className="check-row" key={label}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => run(() => change(e.target.checked))}
                    />
                    {label}
                  </label>
                ))}
                <p className="muted">
                  {w.stats.gpu} · {w.stats.fps} FPS
                </p>
              </fieldset>
            </div>
          </details>
        </div>
      )}
      {message && (
        <p className="inline-feedback" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
