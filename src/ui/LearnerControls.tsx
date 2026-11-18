import { useState } from "react";
import type { World } from "../scene/World";
import { config } from "../arena/geometry";
import { frontPilotStation, type PilotStation } from "../training/pilot";
import {
  windLevels,
  conditions,
  simpleWeather,
  weatherSummary,
  type WindLevel,
  type Condition,
} from "../training/weatherPresets";
import { channels } from "../training/input";
import { vi } from "./vi";
export function preference(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preference is optional */
  }
}
export function WindSelector({
  w,
  assessment = false,
  disabled = false,
  onUpdate,
}: {
  w: World;
  assessment?: boolean;
  disabled?: boolean;
  onUpdate: () => void;
}) {
  const prefix = assessment ? "uav-assessment" : "uav-practice";
  const [wind, setWind] = useState<WindLevel>(() => {
      const k = preference(prefix + "-wind", "calm");
      return k in windLevels ? (k as WindLevel) : "calm";
    }),
    [condition, setCondition] = useState<Condition>(() => {
      const k = preference(prefix + "-sky", "clear");
      return k in conditions ? (k as Condition) : "clear";
    });
  const actualWind = assessment
    ? wind
    : (Object.entries(windLevels).find(([, p]) =>
        (["wind", "gust", "turbulence", "direction"] as const).every(
          (k) => p[k] === w.weather.target[k],
        ),
      )?.[0] ?? "");
  const actualSky = assessment
    ? condition
    : (Object.keys(conditions).find((key) => {
        const p = simpleWeather("calm", key as Condition);
        return (["cloud", "rain", "visibility", "timeOfDay"] as const).every(
          (k) => p[k] === w.weather.target[k],
        );
      }) ?? "");
  function apply(a: WindLevel, b: Condition) {
    if (disabled || w.session?.locked) return;
    if (!assessment && !w.setSimpleWeather(a, b)) return;
    setWind(a);
    setCondition(b);
    remember(prefix + "-wind", a);
    remember(prefix + "-sky", b);
    onUpdate();
  }
  return (
    <fieldset
      disabled={disabled || !!w.session?.locked}
      className="simple-weather"
    >
      <legend>
        {assessment
          ? "Thời tiết thi thử do giảng viên chọn"
          : "Thời tiết luyện tập"}
      </legend>
      <label>
        Mức gió
        <select
          aria-label={assessment ? "Mức gió thi thử" : "Mức gió"}
          value={actualWind}
          onChange={(e) => apply(e.target.value as WindLevel, condition)}
        >
          <option value="" disabled>
            Tùy chỉnh bởi giảng viên
          </option>
          {Object.entries(windLevels).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Điều kiện thời tiết
        <select
          aria-label={assessment ? "Điều kiện thi thử" : "Điều kiện thời tiết"}
          value={actualSky}
          onChange={(e) => apply(wind, e.target.value as Condition)}
        >
          <option value="" disabled>
            Tùy chỉnh bởi giảng viên
          </option>
          {Object.entries(conditions).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        {weatherSummary(
          assessment ? simpleWeather(wind, condition) : w.weather.target,
        )}
      </p>
      <p className="training-muted">
        Các mức gió mô phỏng để luyện tập, không phải ngưỡng cho phép bay thực
        tế. Gió mạnh dành cho bài có giảng viên hướng dẫn.
      </p>
    </fieldset>
  );
}
export function storedWeather(assessment = false) {
  const prefix = assessment ? "uav-assessment" : "uav-practice";
  const a = preference(prefix + "-wind", "calm"),
    b = preference(prefix + "-sky", "clear");
  return simpleWeather(
    a in windLevels ? (a as WindLevel) : "calm",
    b in conditions ? (b as Condition) : "clear",
  );
}
export function InputCheck({
  w,
  disabled = false,
  onUpdate,
}: {
  w: World;
  disabled?: boolean;
  onUpdate: () => void;
}) {
  const gamepad = w.input.source === "Gamepad";
  return (
    <section
      className="procedure-card input-check"
      aria-label="Kiểm tra điều khiển"
    >
      <h2>Kiểm tra điều khiển</h2>
      <p role="status">
        {gamepad
          ? w.input.connected
            ? "Tay điều khiển đã kết nối · cần kiểm tra từng hướng"
            : "Chưa tìm thấy tay điều khiển"
          : "Đang dùng bàn phím để luyện thử"}
      </p>
      {gamepad && !w.input.connected && (
        <p>
          Cắm cáp USB, nhấn một nút trên thiết bị. Nếu vẫn chưa nhận, chọn Dùng
          bàn phím hoặc nhờ giảng viên kiểm tra.
        </p>
      )}
      {w.input.fault && <p className="input-fault">{vi(w.input.fault)}</p>}
      <div className="training-actions">
        <button
          aria-pressed={!gamepad}
          disabled={disabled}
          onClick={() => {
            w.input.source = "Keyboard";
            remember("uav-input-source", "Keyboard");
            onUpdate();
          }}
        >
          Dùng bàn phím
        </button>
        <button
          aria-pressed={gamepad}
          disabled={disabled}
          onClick={() => {
            w.input.source = "Gamepad";
            remember("uav-input-source", "Gamepad");
            onUpdate();
          }}
        >
          Dùng tay điều khiển
        </button>
      </div>
      <details>
        <summary>Kiểm tra phản hồi điều khiển</summary>
        <p>
          Di chuyển từng cần, hoặc thử các phím khi chưa bật động cơ. Thanh
          tương ứng phải đổi đúng hướng.
        </p>
        <div className="rc-bars">
          {channels.map((k) => (
            <div key={k}>
              <span>{vi(k)}</span>
              <meter
                aria-label={vi(k)}
                min={-1}
                max={1}
                value={w.input.value[k]}
              />
              <b>{w.input.value[k].toFixed(2)}</b>
            </div>
          ))}
        </div>
        <p className="training-muted">
          Được trình duyệt nhận không có nghĩa là đã tương thích. Giảng viên cần
          kiểm tra hướng, điểm giữa và toàn hành trình trước bài bay.
        </p>
      </details>
    </section>
  );
}
export function PilotDiagram({
  station = frontPilotStation(),
}: {
  station?: PilotStation;
}) {
  const c = config.concrete,
    sx = 350 / c.length,
    sz = sx,
    x = (v: number) => 30 + (v + c.length / 2) * sx,
    z = (v: number) => 35 + (v + c.width / 2) * sz;
  const h = config.landingZones[0];
  return (
    <figure className="pilot-diagram">
      <svg
        viewBox="0 0 410 355"
        role="img"
        aria-label="Sơ đồ vị trí người điều khiển ở giữa cạnh dài phía trước, bên ngoài V1; H là điểm máy bay cất hạ cánh"
      >
        <rect x="15" y="20" width="380" height="300" fill="#dce6cf" rx="8" />
        <rect
          x="30"
          y="35"
          width="350"
          height={c.width * sz}
          fill="#eef0e6"
          stroke="#687c68"
          strokeWidth="2"
        />
        <text x="205" y="17" textAnchor="middle">
          Sân {c.length} × {c.width} m
        </text>
        {config.figureEight.centers.map(([cx, cz]) => (
          <circle
            key={cx}
            cx={x(cx)}
            cy={z(cz)}
            r={config.figureEight.routeRadius * sx}
            fill="none"
            stroke="#879b7c"
            strokeDasharray="5 3"
          />
        ))}
        <circle cx={x(h.x)} cy={z(h.z)} r="13" fill="#fff" stroke="#3c6347" />
        <text x={x(h.x)} y={z(h.z) + 5} textAnchor="middle" fontWeight="bold">
          H
        </text>
        <text x="205" y={z(c.width / 2) - 8} textAnchor="middle">
          V1 · Cạnh dài phía trước
        </text>
        <path
          d={`M${x(station.x)} ${z(station.z)}L${x(0)} ${z(0)}`}
          stroke="#196279"
          strokeDasharray="4 4"
        />
        <path
          d={`M${x(station.x) - 5} ${z(station.z) - 10}l5 -8 5 8`}
          stroke="#196279"
          fill="none"
          strokeWidth="2"
        />
        <circle cx={x(station.x)} cy={z(station.z)} r="7" fill="#196279" />
        <text x="205" y="302" textAnchor="middle" fontWeight="bold">
          PILOT — Vị trí người điều khiển
        </text>
        <text x="205" y="341" textAnchor="middle">
          H = Điểm máy bay cất / hạ cánh
        </text>
      </svg>
      <figcaption>
        Người đứng ngoài V1, ở giữa cạnh dài phía trước. Vị trí tạm đề xuất;
        chưa phải quy định chính thức.
      </figcaption>
    </figure>
  );
}
export function Home({ navigate }: { navigate: (page: string) => void }) {
  return (
    <main className="learner-home" id="main-content">
      <div className="home-intro">
        <p className="home-kicker">UAV ARENA · LUYỆN BAY THỰC HÀNH</p>
        <h1>Bắt đầu bài bay của bạn</h1>
        <p>Chọn một việc bạn muốn làm. Ứng dụng sẽ hướng dẫn từng bước.</p>
      </div>
      <div className="home-actions">
        {[
          [
            "Training",
            "01",
            "Luyện tập",
            "Chọn bài bay, tập điều khiển và làm quen với sân.",
          ],
          [
            "Mock Examination",
            "02",
            "Thi thử",
            "Tự thực hiện bài bay với góc nhìn và điều kiện cố định.",
          ],
          [
            "Session Review",
            "03",
            "Xem lại bài bay",
            "Xem đường bay, kết quả và nhận xét đã lưu trên thiết bị.",
          ],
          [
            "System Configuration",
            "04",
            "Cài đặt",
            "Kiểm tra tay điều khiển và chọn cách hiển thị.",
          ],
        ].map(([page, n, title, description]) => (
          <button key={page} onClick={() => navigate(page)}>
            <span>{n}</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <b>Mở {title.toLocaleLowerCase("vi")} →</b>
          </button>
        ))}
      </div>
      <section className="home-foot">
        <div>
          <h2>Lần đầu sử dụng?</h2>
          <p>
            Vào Luyện tập và chọn Hướng dẫn từng bước. Bạn có thể dùng bàn phím
            để luyện thử trước khi cài tay điều khiển.
          </p>
          <button
            onClick={() => {
              remember("uav-show-guide", "yes");
              navigate("Training");
            }}
          >
            Hướng dẫn bắt đầu
          </button>
        </div>
        <div>
          <h2>Dành cho giảng viên</h2>
          <p>
            Thiết lập thời tiết thi thử, xem lại bài học viên hoặc mở bài bay
            mẫu tự động.
          </p>
          <button onClick={() => navigate("Instructor")}>
            Mở công cụ giảng viên
          </button>
        </div>
      </section>
      <p className="home-limitation">
        Mô phỏng hỗ trợ luyện tập. Kết quả cần giảng viên đánh giá; không thay
        thế sát hạch chính thức.
      </p>
      <p className="small-screen-note">
        Màn hình nhỏ phù hợp cài đặt và xem lại. Luyện bay đầy đủ cần màn hình
        lớn và thiết bị đã kiểm tra.
      </p>
    </main>
  );
}
