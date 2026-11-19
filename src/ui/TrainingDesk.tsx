import { useEffect, useRef, useState } from "react";
import type { World } from "../scene/World";
import type { Telemetry } from "../simulation/DroneDynamics";
import { profiles, type ProfileId } from "../training/profiles";
import type { Attempt } from "../training/Session";
import { isFinal, seal, download } from "../training/records";
import { Icon, exerciseInfo, exerciseOrder, RouteArt } from "./Design";
import { InputCheck, preference, remember } from "./LearnerControls";
import { FlightConditions } from "./FlightConditions";
import { vi } from "./vi";
const time = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function TrainingDesk({
  w,
  t,
  page,
  navigate,
  persist,
}: {
  w: World;
  t: Telemetry;
  page: string;
  navigate: (page: string) => void;
  persist: (attempt: Attempt) => Promise<void>;
}) {
  const [, refresh] = useState(0);
  const [profile, setProfile] = useState<ProfileId>(() => {
    const id = preference("uav-preferred-profile", "foundations");
    return Object.hasOwn(profiles, id) ? (id as ProfileId) : "foundations";
  });
  const [candidate, setCandidate] = useState(() =>
    preference("uav-candidate", ""),
  );
  const [message, setMessage] = useState("");
  const [help, setHelp] = useState(false);
  const [saved, setSaved] = useState(false),
    [saveFailed, setSaveFailed] = useState(false);
  const session = w.session,
    strict = page === "Mock Examination",
    info = exerciseInfo[profile];
  const final = !!session && isFinal(session.state),
    entered = !!session;
  const seenFinal = useRef("");
  const flightRef = useRef<HTMLDivElement>(null);
  const update = () => refresh((n) => n + 1);
  function run(fn: () => unknown, success = "") {
    try {
      const ok = fn();
      setMessage(
        ok === false
          ? "Chưa thể bắt đầu. Đưa máy bay về H, thả các phím hoặc cần về trung tâm và kiểm tra kết nối điều khiển."
          : success,
      );
      update();
    } catch {
      setMessage(
        "Thao tác chưa hoàn tất. Hãy thử lại; bản ghi hiện có vẫn được giữ.",
      );
    }
  }
  function saveFinal() {
    if (!session) return;
    setSaved(false);
    setSaveFailed(false);
    void persist(session.snapshot())
      .then(() => {
        setSaved(true);
        setMessage("");
      })
      .catch(() => {
        setSaveFailed(true);
        setMessage(
          "Chưa lưu được bài bay. Xuất bản ghi JSON trước khi rời trang.",
        );
      });
  }
  useEffect(() => {
    if (final && session && seenFinal.current !== session.attempt.id) {
      seenFinal.current = session.attempt.id;
      w.drone.paused = true;
      setSaved(false);
      saveFinal();
    }
  }, [session?.state]);
  useEffect(() => {
    if (session?.state === "ACTIVE") w.renderer.domElement.focus();
    else if (session) flightRef.current?.focus({ preventScroll: true });
  }, [session?.state]);
  function prepare() {
    run(() => {
      if (w.stats.loading || w.stats.error) return false;
      const ok = w.beginAttempt(
        candidate,
        strict ? "Mock Examination" : "Training",
        profile,
      );
      if (ok) {
        remember("uav-candidate", candidate);
        setSaved(false);
      }
      return ok;
    });
  }
  function start() {
    run(() => {
      if (
        !session ||
        (w.input.source === "Gamepad" &&
          (!w.input.connected || !!w.input.fault))
      )
        return false;
      w.drone.arm();
      if (!session.start(w.drone)) {
        w.drone.disarm();
        return false;
      }
      w.renderer.domElement.focus();
      return true;
    });
  }
  async function reset() {
    if (session) {
      try {
        await persist(session.snapshot());
      } catch {
        setMessage(
          "Chưa lưu được bài bay. Xuất JSON trước khi thử lại để giữ bản ghi.",
        );
        return;
      }
    }
    w.setReplay(null);
    w.drone.reset();
    w.session = null;
    setSaved(false);
    seenFinal.current = "";
    setMessage("");
    update();
  }
  const deviceReady =
    w.input.source === "Keyboard" ||
    (w.input.connected &&
      (!w.input.fault || w.input.fault === "Input focus lost"));
  if (!entered)
    return (
      <main
        className="exercise-page page-enter"
        id="main-content"
        tabIndex={-1}
      >
        <div className="page-heading">
          <span className="eyebrow">
            {strict ? "THỬ SỨC / THI THỬ" : "KHÁM PHÁ / LUYỆN TẬP"}
          </span>
          <h1>
            {strict ? "Sẵn sàng thử sức?" : "Hôm nay, bạn muốn bay thế nào?"}
          </h1>
          <p>
            {strict
              ? "Tự thực hiện bài bay với góc người lái và điều kiện cố định."
              : "Chọn một bài bay. Hiểu mục tiêu. Rồi bắt đầu hành trình của bạn."}
          </p>
        </div>
        <div className="exercise-layout">
          <section className="exercise-list" aria-label="Chọn bài bay">
            <div className="section-heading">
              <h2>Chọn hành trình</h2>
              <span>4 bài bay</span>
            </div>
            {exerciseOrder.map((id) => (
              <button
                className={`exercise-option ${profile === id ? "selected" : ""}`}
                key={id}
                aria-pressed={profile === id}
                onClick={() => {
                  setProfile(id);
                  remember("uav-preferred-profile", id);
                }}
              >
                <span className="exercise-number">
                  {exerciseInfo[id].number}
                </span>
                <span className="exercise-option-copy">
                  <span className="exercise-level">
                    {exerciseInfo[id].level}
                  </span>
                  <h2>{exerciseInfo[id].title}</h2>
                  <p>
                    {id === "foundations"
                      ? "Cất cánh · Giữ vị trí · Đổi hướng"
                      : id === "figure-eight"
                        ? "Phối hợp · Hai vòng bay liên tiếp"
                        : id === "outer-circuit"
                          ? "Định hướng · Bay qua các mốc M1–M5"
                          : "Nhận biết · Giữ bình tĩnh · Trở về"}
                  </p>
                </span>
                <span className="exercise-check">
                  <Icon name={profile === id ? "check" : "arrow"} size={18} />
                </span>
              </button>
            ))}
            <p className="selection-tip">
              <Icon name="help" size={17} /> Mới bắt đầu? Chọn Làm quen bầu
              trời.
            </p>
          </section>
          <section className="exercise-brief" aria-label="Mục tiêu bài bay">
            <div className="brief-visual" key={profile}>
              <div className="brief-visual-heading">
                <span className="eyebrow">
                  SÂN 01 / {info.level.toLocaleUpperCase("vi")}
                </span>
                <span>{info.number}</span>
              </div>
              <RouteArt profile={profile} />
              <span className="brief-visual-caption">
                H · ĐIỂM CẤT VÀ HẠ CÁNH
              </span>
            </div>
            <div className="brief-content" key={`copy-${profile}`}>
              <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>
              <h2>{info.title}</h2>
              <p>{info.description}</p>
              <ol className="objective-list">
                {profiles[profile].tasks.map((task) => (
                  <li key={task.id}>
                    <span />
                    <span>{vi(task.label)}</span>
                  </li>
                ))}
                <li>
                  <span />
                  <span>Trở về H, tự hạ cánh và tắt động cơ.</span>
                </li>
              </ol>
              <details className="setup-options">
                <summary>
                  Điều khiển & thông tin <Icon name="settings" size={18} />
                </summary>
                <InputCheck w={w} onUpdate={update} />
                <p className="muted">
                  Chọn gió và mưa ngay trong sân, trước khi bắt đầu bay.
                </p>
                <label>
                  Tên của bạn <span className="optional">· không bắt buộc</span>
                  <input
                    aria-label="Tên của bạn"
                    value={candidate}
                    maxLength={80}
                    placeholder="Nhập tên để nhận ra bản ghi"
                    onChange={(e) => setCandidate(e.target.value)}
                  />
                </label>
              </details>
              <div className="software-readiness" role="status">
                <span
                  className={w.stats.loading || w.stats.error ? "pending" : ""}
                >
                  <i />
                  {w.stats.error
                    ? "Sân chưa sẵn sàng"
                    : w.stats.loading
                      ? "Đang tải sân…"
                      : "Sân đã tải"}
                </span>
                <span className={!deviceReady ? "pending" : ""}>
                  <i />
                  {w.input.source === "Keyboard"
                    ? "Bàn phím sẵn sàng"
                    : deviceReady
                      ? "Tay điều khiển đã kết nối"
                      : "Chưa kết nối điều khiển"}
                </span>
              </div>
              {!deviceReady && (
                <div className="input-recovery" role="alert">
                  <p>
                    Kết nối tay điều khiển rồi nhấn một nút, hoặc chuyển sang
                    bàn phím.
                  </p>
                  <button
                    onClick={() => {
                      w.input.source = "Keyboard";
                      remember("uav-input-source", "Keyboard");
                      update();
                    }}
                  >
                    Dùng bàn phím
                  </button>
                </div>
              )}
              <button
                className="primary enter-flight"
                disabled={!deviceReady || w.stats.loading || !!w.stats.error}
                onClick={prepare}
              >
                Vào sân bay <Icon name="arrow" />
              </button>
              <p className="brief-note">
                Bạn sẽ được hướng dẫn điều khiển trước khi cất cánh.
              </p>
            </div>
          </section>
        </div>
        {message && (
          <p className="inline-feedback" role="status">
            {message}
          </p>
        )}
      </main>
    );
  const s = session!,
    task = s.task;
  const elapsed = s.attempt.frames.at(-1)?.time ?? 0;
  const progress =
    task?.kind === "route"
      ? s.pathProgress
      : Math.min(1, s.dwell / (task?.seconds ?? 5));
  return (
    <main
      className={`flight-experience ${strict ? "test-flight" : ""}`}
      id="main-content"
      tabIndex={-1}
      ref={flightRef}
    >
      <div className="flight-top">
        <section className="flight-objective" aria-label="Việc cần làm">
          <span className="eyebrow">
            <span
              className={`status-dot ${s.state === "PAUSED" ? "paused" : ""}`}
            />{" "}
            {strict ? "THI THỬ" : "LUYỆN TẬP"} / {vi(s.state)}
          </span>
          <h1 key={s.taskIndex}>
            {s.state === "ACTIVE"
              ? vi(task?.label)
              : s.state === "LANDING"
                ? "Trở về H và hạ cánh"
                : s.state === "TASK_COMPLETE"
                  ? "Đã hoàn thành các phần bài bay"
                  : vi(s.attempt.profile.name)}
          </h1>
          {s.state === "ACTIVE" && !strict && (
            <div className="task-progress">
              <progress
                max={1}
                value={progress}
                aria-label="Tiến độ phần bài bay"
              />
              <span>
                Phần {s.taskIndex + 1}/{s.attempt.profile.tasks.length}
                {task?.kind === "route"
                  ? ` · ${Math.round(progress * 100)}%`
                  : ` · Giữ ${s.dwell.toFixed(1)} / ${task?.seconds ?? 5} s`}
              </span>
            </div>
          )}
        </section>
        {!strict && (
          <div className="flight-metrics" aria-label="Số liệu bay">
            <div>
              <span>Độ cao</span>
              <b>
                {t.altitude.toFixed(1)} <small>m</small>
              </b>
            </div>
            <div>
              <span>Tốc độ</span>
              <b>
                {t.groundSpeed.toFixed(1)} <small>m/s</small>
              </b>
            </div>
            <div>
              <span>Thời gian</span>
              <b>{time(elapsed)}</b>
            </div>
          </div>
        )}
      </div>
      {s.state === "READY" && (
        <div className="flight-overlay">
          <section
            className="session-card ready-card page-enter"
            aria-label="Sẵn sàng cất cánh"
          >
            <span className="session-icon">
              <Icon name="drone" size={30} />
            </span>
            <span className="eyebrow">KHOẢNG TRỜI ĐÃ SẴN SÀNG</span>
            <h2>Bạn đang ở vị trí người lái.</h2>
            <p>
              {w.input.source === "Gamepad" ? (
                <>
                  Bắt đầu bay, rồi đẩy nhẹ cần trái lên để lên độ cao 5 m. Thả
                  cần về giữa để giữ vị trí.
                </>
              ) : (
                <>
                  Bắt đầu bay, rồi nhấn <kbd>R</kbd> để đưa máy bay lên độ cao 5
                  m. Thả phím để giữ vị trí.
                </>
              )}
            </p>
            <ControlGuide gamepad={w.input.source === "Gamepad"} />
            <div className="ready-status">
              <Icon name="check" size={17} /> Bài bay đã chọn ·{" "}
              {deviceReady ? "Điều khiển sẵn sàng" : "Kiểm tra điều khiển"}
            </div>
            {!deviceReady && (
              <button
                onClick={() => {
                  w.input.source = "Keyboard";
                  remember("uav-input-source", "Keyboard");
                  update();
                }}
              >
                Dùng bàn phím
              </button>
            )}
            <button className="primary" disabled={!deviceReady} onClick={start}>
              <Icon name="play" size={18} /> Bắt đầu bay
            </button>
            <button
              className="text-button"
              onClick={() =>
                run(() => {
                  w.session = null;
                  w.drone.reset();
                  return true;
                })
              }
            >
              Chọn bài khác
            </button>
          </section>
        </div>
      )}
      {s.state === "PAUSED" && (
        <div className="flight-overlay paused-overlay">
          <section
            className="session-card page-enter"
            aria-label="Bài bay tạm dừng"
          >
            <span className="session-icon">
              <Icon name="pause" size={30} />
            </span>
            <span className="eyebrow">MỘT KHOẢNG NGHỈ</span>
            <h2>Cứ thong thả.</h2>
            <p>Mô phỏng đã tạm dừng. Tiếp tục khi bạn sẵn sàng.</p>
            <button
              className="primary"
              onClick={() => run(() => s.pause(w.drone))}
            >
              <Icon name="play" size={18} /> Tiếp tục bài bay
            </button>
            <details>
              <summary>Nhắc lại cách điều khiển</summary>
              <ControlGuide gamepad={w.input.source === "Gamepad"} />
            </details>
            <button
              className="text-button"
              onClick={() =>
                run(() => {
                  s.abort();
                  w.drone.hold();
                  w.drone.paused = true;
                  return true;
                })
              }
            >
              Kết thúc và lưu bản ghi
            </button>
          </section>
        </div>
      )}
      {s.state === "POSTFLIGHT" && (
        <div className="flight-overlay">
          <section className="session-card page-enter">
            <span className="session-icon">
              <Icon name="check" size={32} />
            </span>
            <span className="eyebrow">CHẠM ĐẤT AN TOÀN</span>
            <h2>Một đường bay trọn vẹn.</h2>
            <p>Đã hạ cánh và tắt động cơ. Cùng nhìn lại hành trình vừa qua.</p>
            <button className="primary" onClick={() => run(() => s.finish())}>
              Hoàn tất bài bay <Icon name="arrow" size={18} />
            </button>
          </section>
        </div>
      )}
      {final && (
        <div className="flight-overlay result-overlay">
          <section
            className="session-card result-card page-enter"
            aria-label="Kết quả bài bay"
          >
            <span className="session-icon">
              <Icon
                name={s.state === "FINISHED" ? "check" : "replay"}
                size={30}
              />
            </span>
            <span className="eyebrow">
              {s.state === "FINISHED"
                ? "HÀNH TRÌNH ĐÃ HOÀN THÀNH"
                : s.state === "DISQUALIFIED"
                  ? "MÔ PHỎNG ĐÃ DỪNG"
                  : "ĐÃ KẾT THÚC BÀI BAY"}
            </span>
            <h2>
              {s.state === "FINISHED"
                ? "Tiến thêm một bước."
                : "Sẵn sàng cho lần bay tiếp theo."}
            </h2>
            <p>
              {s.state === "DISQUALIFIED"
                ? "Máy bay đã vượt giới hạn bài tập hoặc va chạm. Xem lại bản ghi để tìm điểm cần cải thiện."
                : s.state === "INCOMPLETE"
                  ? "Bài bay bị gián đoạn. Các bước đã thực hiện vẫn được ghi lại."
                  : s.state === "FINISHED"
                    ? "Giữ lại những gì làm tốt và thử lại những gì còn khó."
                    : "Bài chưa hoàn thành. Bạn có thể xem lại những gì đã thực hiện."}
            </p>
            <div className="debrief-metrics">
              <div>
                <b>
                  {s.attempt.result.completedTasks.length}
                  <small>/{s.attempt.profile.tasks.length}</small>
                </b>
                <span>Phần hoàn thành</span>
              </div>
              <div>
                <b>{time(elapsed)}</b>
                <span>Thời gian bay</span>
              </div>
              {s.state === "FINISHED" && (
                <div>
                  <b>
                    {s.attempt.result.practiceScore.toFixed(0)}
                    <small>/100</small>
                  </b>
                  <span>Điểm luyện tập</span>
                </div>
              )}
            </div>
            <p className="save-status" role="status">
              <Icon name={saved ? "check" : "replay"} size={16} />
              {saved
                ? "Đã lưu bản ghi trên thiết bị"
                : saveFailed
                  ? "Chưa lưu được bài bay"
                  : "Đang lưu bản ghi…"}
            </p>
            {saveFailed && <button onClick={saveFinal}>Thử lưu lại</button>}
            <button
              className="primary"
              disabled={!saved}
              onClick={() => navigate("Session Review")}
            >
              Xem lại đường bay <Icon name="arrow" size={18} />
            </button>
            <button onClick={() => void reset()}>Chọn bài và bay tiếp</button>
            <button
              className="text-button"
              onClick={() =>
                void (async () => {
                  try {
                    download(
                      `${s.attempt.id}.json`,
                      JSON.stringify(await seal(s.snapshot()), null, 2),
                    );
                    setMessage("Đã xuất bản ghi.");
                  } catch {
                    setMessage("Chưa thể xuất bản ghi. Hãy thử lại.");
                  }
                })()
              }
            >
              Xuất bản ghi JSON
            </button>
            <p className="brief-note">
              Kết quả mô phỏng chỉ dùng để luyện tập.
            </p>
          </section>
        </div>
      )}
      {s.state === "ACTIVE" && task?.kind === "abnormal" && (
        <section className="abnormal-prompt">
          <h2>Tình huống: mất liên kết giả lập</h2>
          <p>
            Giữ vị trí. Xác nhận phương án trở về H và hạ cánh. Đây là tình
            huống hướng dẫn, không ngắt kết nối thiết bị thật.
          </p>
          <button onClick={() => run(() => s.acknowledgeAbnormal())}>
            Xác nhận phương án trở về
          </button>
        </section>
      )}
      {s.state === "TASK_COMPLETE" && (
        <div className="landing-prompt">
          <Icon name="check" />
          <p>Đã xong các phần bay. Trở về H để hạ cánh.</p>
          <button
            className="primary"
            onClick={() => run(() => s.requestLanding())}
          >
            Bắt đầu hạ cánh thủ công
          </button>
        </div>
      )}
      {s.state === "LANDING" && (
        <p className="landing-guidance">
          {w.input.source === "Gamepad" ? (
            "Đẩy nhẹ cần trái xuống để hạ trên H."
          ) : (
            <>
              Nhấn <kbd>F</kbd> để hạ xuống H.
            </>
          )}{" "}
          Chạm đất ổn định rồi chọn Tắt động cơ.
        </p>
      )}
      {s.activeViolations.length > 0 && !final && (
        <p className="flight-warning" role="status">
          {s.activeViolations.map(vi).join(" · ")}
        </p>
      )}
      <div className="flight-bottom">
        {!final && (
          <>
            <div className="view-tools">
              <FlightConditions w={w} onUpdate={update} />
              <details name="flight-tools">
                <summary>
                  <Icon name="eye" size={19} />
                  <span>Góc nhìn</span>
                </summary>
                <div className="view-popover">
                  {!strict && (
                    <label>
                      Góc quan sát
                      <select
                        aria-label="Góc quan sát"
                        value={w.cameraMode}
                        onChange={(e) =>
                          run(() =>
                            w.setCamera(e.target.value as World["cameraMode"]),
                          )
                        }
                      >
                        {[
                          "PILOT VLOS",
                          "Overview",
                          "Orbit",
                          "Top down",
                          "Ground",
                          "Follow",
                          "FPV",
                        ].map((v) => (
                          <option key={v} value={v}>
                            {vi(v)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {w.cameraMode === "PILOT VLOS" && (
                    <div className="head-controls">
                      <button
                        aria-label="Nhìn trái"
                        onClick={() => run(() => w.lookPilot(-0.2, 0))}
                      >
                        ← Trái
                      </button>
                      <button onClick={() => run(() => w.recenterPilot())}>
                        Nhìn thẳng
                      </button>
                      <button
                        aria-label="Nhìn phải"
                        onClick={() => run(() => w.lookPilot(0.2, 0))}
                      >
                        Phải →
                      </button>
                      <button
                        aria-label="Nhìn lên"
                        onClick={() => run(() => w.lookPilot(0, 0.12))}
                      >
                        ↑ Lên
                      </button>
                      <button
                        aria-label="Nhìn xuống"
                        onClick={() => run(() => w.lookPilot(0, -0.12))}
                      >
                        ↓ Xuống
                      </button>
                    </div>
                  )}
                  {!strict && (
                    <>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={w.groundGuideEnabled}
                          onChange={(e) =>
                            run(() => w.setGroundGuide(e.target.checked))
                          }
                        />
                        Hiện vị trí dưới máy bay
                      </label>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={w.routeVisible}
                          onChange={(e) =>
                            run(() => w.setRoute(e.target.checked))
                          }
                        />
                        Hiện đường mẫu và vệt bay
                      </label>
                    </>
                  )}
                </div>
              </details>
              <button
                aria-label="Phím điều khiển"
                aria-pressed={help}
                onClick={() => setHelp(!help)}
              >
                <Icon name="help" size={19} />{" "}
                <span className="flight-help-label">Phím điều khiển</span>
              </button>
              <button
                aria-label="Toàn màn hình"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else
                    void document.documentElement
                      .requestFullscreen()
                      .catch(() =>
                        setMessage("Trình duyệt chưa cho phép toàn màn hình."),
                      );
                }}
              >
                <Icon name="expand" size={19} />
              </button>
            </div>
            <div
              className="flight-actions"
              role="group"
              aria-label="Thao tác bài bay"
            >
              {["ACTIVE", "TASK_COMPLETE", "LANDING", "PAUSED"].includes(
                s.state,
              ) && (
                <button
                  className="primary pause-action"
                  aria-label={s.state === "PAUSED" ? "Tiếp tục" : "Tạm dừng"}
                  onClick={() => run(() => s.pause(w.drone))}
                >
                  <Icon
                    name={s.state === "PAUSED" ? "play" : "pause"}
                    size={18}
                  />
                  {s.state === "PAUSED" ? "Tiếp tục" : "Tạm dừng"}
                  <kbd>Space</kbd>
                </button>
              )}
              {t.armed && (
                <button
                  className="danger-action"
                  onClick={() =>
                    run(() => {
                      if (t.altitude > 0.12)
                        s.abort("Emergency motor stop", true);
                      w.drone.disarm();
                      return true;
                    })
                  }
                >
                  {t.altitude > 0.12 ? "Dừng khẩn cấp" : "Tắt động cơ"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {help && (
        <section className="flight-help">
          <button
            className="icon-button"
            aria-label="Đóng hướng dẫn điều khiển"
            onClick={() => setHelp(false)}
          >
            <Icon name="close" />
          </button>
          <h2>Cách điều khiển</h2>
          <ControlGuide gamepad={w.input.source === "Gamepad"} />
          <p>
            Ở góc người lái, nhấp vào sân để khóa chuột và nhìn quanh. Nhấp lần
            nữa hoặc nhấn Esc để thả chuột. Thả phím để giữ vị trí.
          </p>
        </section>
      )}
      {message && (
        <p className="flight-feedback" role="status">
          {message}
        </p>
      )}
      <span className="sr-only" data-testid="exam-state">
        {vi(s.state)}
      </span>
    </main>
  );
}
export function ControlGuide({ gamepad = false }: { gamepad?: boolean }) {
  return (
    <div className={`control-guide ${gamepad ? "gamepad-guide" : ""}`}>
      {(gamepad
        ? [
            ["Phải ↕", "Tiến / lùi"],
            ["Phải ↔", "Trái / phải"],
            ["Trái ↕", "Lên / xuống"],
            ["Trái ↔", "Xoay hướng"],
          ]
        : [
            ["W S", "Tiến / lùi"],
            ["A D", "Trái / phải"],
            ["R F", "Lên / xuống"],
            ["Q E", "Xoay hướng"],
          ]
      ).map(([key, label]) => (
        <div key={key}>
          <kbd>{key}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
