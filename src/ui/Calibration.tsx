import { useRef, useState } from "react";
import type { World } from "../scene/World";
import {
  channels,
  mode2,
  validController,
  type Channel,
  type ControllerProfile,
} from "../training/input";
import { InputCheck } from "./LearnerControls";
import { vi } from "./vi";
const fixed = (n: number | undefined) =>
  Number.isFinite(n) ? n!.toFixed(2) : "—";
export function Calibration({
  w,
  update,
  run,
  setMessage,
}: {
  w: World;
  update: () => void;
  run: (fn: () => unknown, success?: string) => void;
  setMessage: (message: string) => void;
}) {
  const locked = !!w.session?.active;
  const [draft, setDraft] = useState<ControllerProfile>(() =>
    structuredClone(w.input.profile),
  );
  const [controllerProfiles, setControllerProfiles] = useState<
    ControllerProfile[]
  >(() => {
    try {
      const rows = JSON.parse(
        localStorage.getItem("uav-controller-profiles") ?? "[]",
      );
      return Array.isArray(rows)
        ? rows.filter(validController).slice(0, 20)
        : [];
    } catch {
      return [];
    }
  });
  const extremes = useRef<
    Record<
      number,
      {
        min: number;
        max: number;
      }
    >
  >({});
  for (const [i, value] of w.input.raw.entries()) {
    const a = extremes.current[i] ?? { min: value, max: value };
    a.min = Math.min(a.min, value);
    a.max = Math.max(a.max, value);
    extremes.current[i] = a;
  }
  function axisUpdate(k: Channel, key: string, value: number | boolean) {
    setDraft((p) => ({
      ...p,
      axes: { ...p.axes, [k]: { ...p.axes[k], [key]: value } },
    }));
  }
  return (
    <div className="calibration-content">
      {
        <>
          <div className="training-callout">
            Cắm tay điều khiển hoặc bộ chuyển USB, rồi nhấn một nút để trình
            duyệt nhận thiết bị. Chưa xác minh tương thích và độ trễ bằng phần
            cứng thực. Ứng dụng không gửi lệnh tới máy bay thật.
          </div>
          <InputCheck w={w} disabled={locked} onUpdate={update} />
          <details className="technical-settings">
            <summary>Cài đặt nâng cao · hiệu chỉnh tay điều khiển</summary>
            <fieldset disabled={locked}>
              <legend>Thiết bị điều khiển</legend>
              <label>
                Nguồn điều khiển
                <select
                  aria-label="Thiết bị điều khiển"
                  value={w.input.source}
                  onChange={(e) =>
                    run(() => {
                      w.input.source = e.target.value as "Keyboard" | "Gamepad";
                    })
                  }
                >
                  <option value="Keyboard">Bàn phím</option>
                  <option value="Gamepad">Tay điều khiển</option>
                </select>
              </label>
              <label>
                Số thiết bị trong trình duyệt
                <input
                  aria-label="Số thiết bị"
                  type="number"
                  min={0}
                  max={7}
                  value={w.input.index}
                  onChange={(e) =>
                    run(() => {
                      w.input.index = Math.max(0, Math.min(7, +e.target.value));
                    })
                  }
                />
              </label>
              <p>
                {w.input.connected ? "Đã kết nối" : "Chưa kết nối"} ·{" "}
                {vi(w.input.device)}
              </p>
              <p>{vi(w.input.fault)}</p>
            </fieldset>
            <div className="rc-bars">
              {channels.map((k) => (
                <div key={k}>
                  <span>{vi(k)}</span>
                  <meter min={-1} max={1} value={w.input.value[k]} />
                  <b>{fixed(w.input.value[k])}</b>
                </div>
              ))}
            </div>
            <p className="training-muted">
              Mode 2: cần trái lên xuống và xoay; cần phải tiến lùi và trái
              phải. Kiểm tra từng hướng. Lệnh lên xuống là vận tốc, không phải
              ga động cơ trực tiếp.
            </p>
            <fieldset disabled={locked}>
              <legend>Gán trục và hiệu chỉnh</legend>
              {controllerProfiles.length > 0 && (
                <label>
                  Cấu hình đã lưu
                  <select
                    aria-label="Cấu hình tay điều khiển đã lưu"
                    value=""
                    onChange={(e) => {
                      const p = controllerProfiles[+e.target.value];
                      if (p) setDraft(JSON.parse(JSON.stringify(p)));
                    }}
                  >
                    <option value="" disabled>
                      Chọn cấu hình đã lưu…
                    </option>
                    {controllerProfiles.map((p, i) => (
                      <option key={i} value={i}>
                        {vi(p.name)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Tên cấu hình
                <input
                  aria-label="Tên cấu hình tay điều khiển"
                  value={draft.name}
                  maxLength={80}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              {channels.map((k) => {
                const a = draft.axes[k];
                return (
                  <details key={k} open>
                    <summary>
                      {vi(k)} · tín hiệu thô {fixed(w.input.raw[a.axis])}
                    </summary>
                    <div className="calibration-grid">
                      {(
                        [
                          ["axis", 0, 31, 1],
                          ["min", -1, 1, 0.01],
                          ["center", -1, 1, 0.01],
                          ["max", -1, 1, 0.01],
                          ["deadzone", 0, 0.49, 0.01],
                        ] as const
                      ).map(([key, min, max, step]) => (
                        <label key={key}>
                          {
                            {
                              axis: "Số trục",
                              min: "Đầu hành trình dưới",
                              center: "Điểm giữa",
                              max: "Đầu hành trình trên",
                              deadzone: "Vùng chết",
                            }[key]
                          }
                          <input
                            aria-label={`${vi(k)} ${vi(key)}`}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={a[key]}
                            onChange={(e) =>
                              axisUpdate(k, key, +e.target.value)
                            }
                          />
                        </label>
                      ))}
                      <label className="training-check">
                        <input
                          aria-label={`${vi(k)} đảo chiều`}
                          type="checkbox"
                          checked={a.inverted}
                          onChange={(e) =>
                            axisUpdate(k, "inverted", e.target.checked)
                          }
                        />
                        Đảo chiều
                      </label>
                    </div>
                    <div className="training-actions">
                      <button
                        disabled={!w.input.raw.length}
                        onClick={() =>
                          axisUpdate(k, "center", w.input.raw[a.axis] ?? 0)
                        }
                      >
                        Ghi vị trí trung tâm
                      </button>
                      <button
                        disabled={!w.input.raw.length}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            axes: {
                              ...p.axes,
                              [k]: {
                                ...p.axes[k],
                                min: extremes.current[a.axis]?.min ?? -1,
                                max: extremes.current[a.axis]?.max ?? 1,
                              },
                            },
                          }))
                        }
                      >
                        Dùng khoảng đã đo
                      </button>
                    </div>
                  </details>
                );
              })}
              <div className="training-actions">
                <button
                  onClick={() => {
                    extremes.current = {};
                    setMessage(
                      "Đã xóa số đo cũ. Di chuyển hết hành trình từng cần, thả về trung tâm rồi ghi lại.",
                    );
                  }}
                >
                  Đo lại hành trình cần
                </button>
                <button onClick={() => setDraft(mode2())}>
                  Khôi phục cách gán Mode 2
                </button>
                <button
                  className="training-primary"
                  disabled={!validController(draft)}
                  onClick={() =>
                    run(() => {
                      if (!validController(draft)) return false;
                      w.input.profile = JSON.parse(
                        JSON.stringify({ ...draft, hardwareVerified: false }),
                      );
                      localStorage.setItem(
                        "uav-controller",
                        JSON.stringify(w.input.profile),
                      );
                      const library = [
                        ...controllerProfiles.filter(
                          (p) => p.name !== w.input.profile.name,
                        ),
                        w.input.profile,
                      ].slice(-20);
                      localStorage.setItem(
                        "uav-controller-profiles",
                        JSON.stringify(library),
                      );
                      setControllerProfiles(library);
                      return true;
                    }, "Đã lưu cấu hình trên thiết bị này. Cần kiểm tra từng hướng cần bằng tay điều khiển thực.")
                  }
                >
                  Lưu cấu hình tay điều khiển
                </button>
              </div>
            </fieldset>
            <p className="training-muted">
              Giá trị trục thô: {JSON.stringify(w.input.raw)}
              <br />
              Nút bấm: {JSON.stringify(w.input.buttons)}
            </p>
          </details>
        </>
      }
    </div>
  );
}
