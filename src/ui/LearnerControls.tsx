import { useState } from "react";
import type { World } from "../scene/World";
import { config } from "../arena/geometry";
import { frontPilotStation, type PilotStation } from "../training/pilot";
import {
  simpleWeather,
  weatherAtLevels,
  validLevel,
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
export function storedWeather(assessment = false) {
  const prefix = assessment ? "uav-assessment" : "uav-practice";
  const legacy = preference(prefix + "-wind", "calm"),
    sky = preference(prefix + "-sky", "clear");
  const a = Number(
    preference(
      prefix + "-wind-level",
      String(
        (
          { calm: 0, light: 2, medium: 4, strong: 10 } as Record<string, number>
        )[legacy] ?? 0,
      ),
    ),
  );
  const b = Number(
    preference(prefix + "-rain-level", sky === "rain" ? "3" : "0"),
  );
  return weatherAtLevels(
    simpleWeather("calm", "clear"),
    validLevel(a) ? a : 0,
    validLevel(b) ? b : 0,
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
          bàn phím rồi kiểm tra kết nối USB.
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
          Trước khi bay, hãy kiểm tra hướng, điểm giữa và toàn hành trình.
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
