import { useEffect, useRef, useState } from "react";
import { World, type WorldStats } from "../scene/World";
import { DroneDynamics } from "../simulation/DroneDynamics";
import { Weather, type WeatherParams } from "../weather/Weather";
import { missions, type MissionId } from "../simulation/missions";
import type { Attempt } from "../training/Session";
import { saveAttempt, isFinal } from "../training/records";
import { Home } from "./Home";
import { TrainingDesk, ControlGuide } from "./TrainingDesk";
import { Settings } from "./Settings";
import { Review } from "./Review";
import { Icon } from "./Design";
import { FlightConditions } from "./FlightConditions";
import { storedWeather, preference } from "./LearnerControls";
import { vi } from "./vi";
const initial = new DroneDynamics(new Weather()).telemetry();
const initialStats: WorldStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  physicsHz: 250,
  gpu: "",
  loading: true,
  error: null,
};
const destinations = [
  "Training",
  "Mock Examination",
  "Session Review",
  "System Configuration",
];
export default function App() {
  const mount = useRef<HTMLDivElement>(null),
    world = useRef<World | null>(null);
  const practiceWeather = useRef<WeatherParams | null>(null);
  const [workspace, setWorkspace] = useState("Home"),
    [t, setT] = useState(initial),
    [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(""),
    [saveError, setSaveError] = useState("");
  const [dialog, setDialog] = useState<"help" | "leave" | null>(null),
    [leaving, setLeaving] = useState(false);
  const pendingPage = useRef("Home"),
    dialogRef = useRef<HTMLElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const checkpoint = useRef({ id: "", time: -Infinity, final: false }),
    saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!mount.current) return;
    try {
      const w = new World(mount.current, (telemetry, nextStats) => {
        setT(telemetry);
        setStats(nextStats);
      });
      world.current = w;
      w.setWorkspace("Home");
      w.setCamera("PILOT VLOS");
      w.weather.target = storedWeather();
      w.drone.paused = true;
      if (preference("uav-input-source", "Keyboard") === "Gamepad")
        w.input.source = "Gamepad";
      const quality = preference("uav-display-quality", "");
      if (["Low", "Medium", "High", "Ultra"].includes(quality))
        w.setQuality(quality as World["quality"]);
      Object.assign(window, { __UAV__: w });
      return () => {
        w.dispose();
        world.current = null;
        delete (window as unknown as Record<string, unknown>).__UAV__;
      };
    } catch (e) {
      setError(
        `Không mở được mô phỏng 3D. Kiểm tra hỗ trợ WebGL2 rồi tải lại trang. ${String(e)}`,
      );
    }
  }, []);
  function persist(attempt: Attempt) {
    const pending = saveQueue.current
      .catch(() => {})
      .then(() => saveAttempt(attempt));
    saveQueue.current = pending;
    return pending.then(() => {
      setSaveError("");
    });
  }
  const sessionState = world.current?.session?.state;
  useEffect(() => {
    const s = world.current?.session;
    if (!s || s.state === "READY") return;
    const prev = checkpoint.current,
      final = isFinal(s.state);
    if (
      prev.id === s.attempt.id &&
      (prev.final || (!final && t.time - prev.time < 10))
    )
      return;
    checkpoint.current = { id: s.attempt.id, time: t.time, final };
    const snapshot = s.snapshot();
    void persist(snapshot).catch(() => {
      setSaveError(
        "Chưa lưu được bài bay. Xuất bản ghi JSON từ kết quả để giữ dữ liệu.",
      );
      if (final) checkpoint.current.final = false;
    });
  }, [t.time, sessionState]);
  useEffect(() => {
    document.title = `UAV ARENA · ${vi(workspace)}`;
    const main = document.getElementById("main-content");
    main?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [workspace]);
  useEffect(() => {
    if (!dialog) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    const w = world.current;
    if (
      w?.session?.active &&
      ["ACTIVE", "LANDING", "TASK_COMPLETE"].includes(w.session.state)
    )
      w.session.pause(w.drone);
    const first = dialogRef.current?.querySelector<HTMLElement>("button");
    first?.focus();
    function key(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        dialogRef.current?.getAttribute("aria-busy") !== "true"
      )
        setDialog(null);
      if (e.key !== "Tab") return;
      const items = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a,input,select,summary",
          ) ?? [],
        ),
        first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      restoreFocus.current?.focus({ preventScroll: true });
    };
  }, [dialog]);
  function navigate(page: string) {
    const w = world.current;
    if (!w) {
      if (page === "Home") setWorkspace("Home");
      return;
    }
    if (page === workspace) return;
    if (w.session?.state === "READY") {
      w.session = null;
      w.drone.reset();
    }
    if (w.session?.active || w.drone.missionActive) {
      pendingPage.current = page;
      setDialog("leave");
      return;
    }
    const wasSeparate = ["Mock Examination", "Reference missions"].includes(
        w.workspace,
      ),
      nextSeparate = ["Mock Examination", "Reference missions"].includes(page);
    if (!wasSeparate && nextSeparate)
      practiceWeather.current = { ...w.weather.target };
    if (!w.setWorkspace(page)) return;
    if (wasSeparate && !nextSeparate && practiceWeather.current)
      w.weather.target = { ...practiceWeather.current };
    if (page === "Mock Examination") w.weather.target = storedWeather(true);
    if (page === "Reference missions") {
      w.session = null;
      w.drone.reset();
    }
    if (
      ["Training", "Mock Examination"].includes(page) &&
      w.session &&
      !w.session.active
    ) {
      w.session = null;
      w.drone.reset();
    }
    if (!["Training", "Mock Examination", "Reference missions"].includes(page))
      w.drone.paused = true;
    setWorkspace(page);
  }
  async function leave() {
    const w = world.current;
    if (!w) return;
    setLeaving(true);
    try {
      if (w.session?.active) {
        w.session.abort("User ended session to return to navigation");
        w.drone.hold();
        w.drone.paused = true;
      }
      if (w.session) await persist(w.session.snapshot());
      if (w.drone.missionActive) {
        w.drone.hold();
        w.drone.reset();
      }
      w.drone.paused = true;
      setDialog(null);
      navigate(pendingPage.current);
    } catch {
      setSaveError(
        "Chưa lưu được bài bay. Đóng hộp thoại và xuất bản ghi JSON để giữ dữ liệu.",
      );
    } finally {
      setLeaving(false);
    }
  }
  const w = world.current,
    flyPage = ["Training", "Mock Examination"].includes(workspace),
    inField = flyPage && !!w?.session;
  const sceneVisible =
    inField ||
    workspace === "Reference missions" ||
    (workspace === "Session Review" && !!w?.replay);
  useEffect(() => {
    if (world.current) world.current.presentationActive = sceneVisible;
  }, [sceneVisible]);
  return (
    <div
      className={`app-shell ${workspace === "Home" ? "home-mode" : ""} ${inField ? "in-flight" : ""} ${workspace === "Session Review" ? "review-mode" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Bỏ qua đến nội dung chính
      </a>
      <header className="app-header" inert={dialog ? true : undefined}>
        <button
          className="brand"
          onClick={() => navigate("Home")}
          aria-label="Về trang chủ UAV ARENA"
        >
          <span className="brand-mark">
            <Icon name="drone" size={27} />
          </span>
          <span>
            UAV<span className="brand-light"> ARENA</span>
            <small>FLIGHT SIMULATOR</small>
          </span>
        </button>
        {workspace !== "Home" && (
          <div className="context-navigation">
            <button
              className="home-back"
              aria-label="Về trang chủ"
              onClick={() => navigate("Home")}
            >
              <Icon name="back" size={17} />
              <span>Trang chủ</span>
            </button>
            <span className="breadcrumb-divider">/</span>
            <span className="current-page">{vi(workspace)}</span>
            {!w?.session?.active && !w?.drone.missionActive && (
              <details className="context-switch">
                <summary aria-label="Chuyển không gian">⌄</summary>
                <div>
                  {destinations
                    .filter((p) => p !== workspace)
                    .map((p) => (
                      <button
                        key={p}
                        onClick={(e) => {
                          navigate(p);
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                        }}
                      >
                        {vi(p)}
                        <Icon name="arrow" size={16} />
                      </button>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
        <button
          className="icon-button header-help"
          aria-label="Hướng dẫn sử dụng"
          onClick={() => setDialog("help")}
        >
          <Icon name="help" size={21} />
        </button>
      </header>
      <div className="experience-body" inert={dialog ? true : undefined}>
        <div
          className={`world-stage ${sceneVisible ? "visible" : ""}`}
          aria-hidden={!sceneVisible}
        >
          <div ref={mount} className="viewport" />
        </div>
        {workspace === "Home" ? (
          <Home navigate={navigate} />
        ) : w ? (
          flyPage ? (
            <TrainingDesk
              key={workspace}
              w={w}
              t={t}
              page={workspace}
              navigate={navigate}
              persist={persist}
            />
          ) : workspace === "Session Review" ? (
            <Review w={w} navigate={navigate} />
          ) : workspace === "Reference missions" ? (
            <Reference w={w} t={t} />
          ) : (
            <Settings
              key={workspace}
              w={w}
              page={workspace}
              navigate={navigate}
            />
          )
        ) : (
          <main className="connecting" id="main-content">
            <span className="spinner" /> Đang kết nối mô phỏng…
          </main>
        )}
        {sceneVisible && stats.loading && (
          <div className="scene-loading" role="status">
            <span className="spinner" /> Đang chuẩn bị không gian bay…
          </div>
        )}
        {(error || stats.error) && (
          <div className="system-error" role="alert">
            <Icon name="help" />
            <div>
              <b>Mô phỏng cần được khởi động lại</b>
              <p>{error || stats.error}</p>
            </div>
            <button onClick={() => window.location.reload()}>Tải lại</button>
          </div>
        )}
        {saveError && (
          <div className="save-error" role="alert">
            {saveError}
          </div>
        )}
      </div>
      {dialog && (
        <div
          className="dialog-scrim"
          onClick={() => {
            if (!leaving) setDialog(null);
          }}
        >
          <section
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-busy={leaving}
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button dialog-close"
              aria-label="Đóng hộp thoại"
              disabled={leaving}
              onClick={() => setDialog(null)}
            >
              <Icon name="close" />
            </button>
            <span className="eyebrow">
              UAV ARENA / {dialog === "help" ? "HƯỚNG DẪN" : "BÀI BAY CỦA BẠN"}
            </span>
            <h2 id="dialog-title">
              {dialog === "help"
                ? "Bầu trời bắt đầu từ đây."
                : "Kết thúc bài bay hiện tại?"}
            </h2>
            {dialog === "help" ? (
              <>
                <p>
                  Chọn Luyện tập, tìm một bài bay phù hợp rồi vào sân. Bạn tự
                  cất cánh, thực hiện mục tiêu và hạ cánh. Thả phím để giữ vị
                  trí.
                </p>
                <ControlGuide />
                <p>
                  <kbd>Space</kbd> tạm dừng hoặc tiếp tục. Ở góc người lái,
                  nhấp sân để khóa chuột và nhìn quanh; nhấp lần nữa hoặc nhấn
                  <kbd>Esc</kbd> để thả chuột. Nếu thiết bị ngắt kết nối hoặc cửa sổ mất tập trung,
                  bài bay được dừng và giữ lại bản ghi.
                </p>
                <details>
                  <summary>Về mô phỏng này</summary>
                  <p>
                    Chỉ dùng luyện tập, không thay thế sát hạch chính thức. Mô
                    hình máy bay chưa được hiệu chuẩn bằng dữ liệu UAV thực. Gió
                    tác động lên mô hình bay; mưa là hiệu ứng hình ảnh. Kết quả
                    và bản ghi chỉ lưu trên thiết bị hiện tại.
                  </p>
                </details>
                <button className="primary" onClick={() => setDialog(null)}>
                  Đã hiểu
                </button>
              </>
            ) : (
              <>
                <p>
                  Bản ghi sẽ được lưu để xem lại. Bài chưa hoàn tất sẽ được đánh
                  dấu đã kết thúc.
                </p>
                <button
                  className="primary"
                  disabled={leaving}
                  onClick={() => void leave()}
                >
                  {leaving ? "Đang lưu…" : "Lưu và rời bài bay"}
                </button>
                <button disabled={leaving} onClick={() => setDialog(null)}>
                  Ở lại bài bay
                </button>
                {saveError && <p role="alert">{saveError}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Reference({ w, t }: { w: World; t: typeof initial }) {
  const [, refresh] = useState(0),
    [message, setMessage] = useState("");
  const run = (fn: () => unknown) => {
    try {
      if (fn() === false) setMessage("Đặt lại máy bay về H rồi thử lại.");
      else setMessage("");
      refresh((n) => n + 1);
    } catch {
      setMessage("Chưa thực hiện được thao tác. Hãy thử lại.");
    }
  };
  return (
    <main className="reference-experience" id="main-content" tabIndex={-1}>
      <section className="reference-heading">
        <span className="eyebrow">QUAN SÁT & HỌC HỎI</span>
        <h1>Bay mẫu tự động</h1>
        <p>
          Quan sát đường bay trước khi tự thử sức. Bài mẫu không tính vào kết
          quả luyện tập.
        </p>
      </section>
      <div className="reference-controls">
        <FlightConditions w={w} onUpdate={() => refresh((n) => n + 1)} />
        <label>
          Bài bay mẫu
          <select
            aria-label="Chọn bài bay mẫu"
            disabled={t.missionActive}
            value={t.selectedMission}
            onChange={(e) =>
              run(() => {
                w.setRoute(true);
                return w.selectMission(e.target.value as MissionId);
              })
            }
          >
            {Object.values(missions).map((m) => (
              <option key={m.id} value={m.id}>
                {vi(m.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Góc quan sát
          <select
            aria-label="Góc quan sát bay mẫu"
            value={w.cameraMode}
            onChange={(e) =>
              run(() => w.setCamera(e.target.value as World["cameraMode"]))
            }
          >
            {[
              "Overview",
              "Orbit",
              "Top down",
              "Ground",
              "Follow",
              "FPV",
              "PILOT VLOS",
            ].map((v) => (
              <option key={v} value={v}>
                {vi(v)}
              </option>
            ))}
          </select>
        </label>
        {!t.missionActive ? (
          <button
            className="primary"
            onClick={() =>
              run(() => {
                w.drone.paused = false;
                w.setRoute(true);
                return w.drone.mission();
              })
            }
          >
            <Icon name="play" size={17} /> Xem bay mẫu
          </button>
        ) : (
          <>
            <button
              className="primary"
              onClick={() => run(() => w.drone.toggleMissionPause())}
            >
              {t.missionPaused ? "Tiếp tục bay mẫu" : "Tạm dừng bay mẫu"}
            </button>
            <button onClick={() => run(() => w.drone.hold())}>
              Dừng bài mẫu
            </button>
          </>
        )}
        <button
          onClick={() =>
            run(() => {
              w.drone.reset();
              return true;
            })
          }
        >
          Đặt lại về H
        </button>
        <details className="reference-manual">
          <summary>Điều khiển tự do</summary>
          <div>
            <button
              disabled={t.missionActive}
              onClick={() =>
                run(() => {
                  w.drone.paused = false;
                  return w.drone.armed ? w.drone.disarm() : w.drone.arm();
                })
              }
            >
              {t.armed ? "Tắt động cơ mẫu" : "Bật động cơ mẫu"}
            </button>
            <button
              disabled={t.missionActive}
              onClick={() =>
                run(() => {
                  w.drone.paused = false;
                  return w.drone.takeoff();
                })
              }
            >
              Cất cánh tự động
            </button>
            <button onClick={() => run(() => w.drone.hold())}>
              Giữ vị trí
            </button>
            <button
              onClick={() =>
                run(() => {
                  w.drone.paused = false;
                  return w.drone.land();
                })
              }
            >
              Hạ cánh tự động
            </button>
            <p>
              Chỉ dùng trong sân bay mẫu. WASD di chuyển, J/K lên xuống, Q/E
              xoay hướng.
            </p>
          </div>
        </details>
      </div>
      <div className="reference-telemetry">
        <span>{vi(t.missionPhase)}</span>
        <span>Độ cao {t.altitude.toFixed(1)} m</span>
        <span>Tốc độ {t.groundSpeed.toFixed(1)} m/s</span>
      </div>
      {message && (
        <p className="flight-feedback" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
