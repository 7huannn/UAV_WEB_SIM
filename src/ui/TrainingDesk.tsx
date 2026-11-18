import { useEffect, useRef, useState } from "react";
import { presets, type Preset } from "../weather/Weather";
import type { World } from "../scene/World";
import type { Telemetry } from "../simulation/DroneDynamics";
import {
  profiles,
  rules,
  preflight,
  postflight,
  type ProfileId,
} from "../training/profiles";
import {
  channels,
  mode2,
  validController,
  type Channel,
  type ControllerProfile,
} from "../training/input";
import { vi, learnerReport } from "./vi";
import {
  InputCheck, TaskGroup,
  WindSelector,
  PilotDiagram,
  preference,
  remember,
} from "./LearnerControls";
import { weatherSummary } from "../training/weatherPresets";
import {
  PILOT_STATION,
  frontPilotStation,
  validFrontStation,
  type PilotStation,
} from "../training/pilot";
import type { Attempt } from "../training/Session";
import {
  loadAttempts,
  saveAttempt,
  parseAttempt,
  seal,
  download,
  attemptCSV,
  replayAt,
  addAnnotation,
  annotationsFor,
  isFinal,
  type Annotation,
  type SealedAttempt,
} from "../training/records";
export const workspaces = [
  "Home",
  "Training",
  "Mock Examination",
  "Instructor",
  "Session Review",
  "Controller Calibration",
  "Examination Profiles",
  "System Configuration",
  "Reference missions",
];
const views = [
  "PILOT VLOS",
  "Overview",
  "Orbit",
  "Top down",
  "Ground",
  "Follow",
  "FPV",
] as const;
const fixed = (v: number | undefined, d = 2) =>
  Number.isFinite(v) ? v!.toFixed(d) : "—";
function TraceMap({ attempt, at }: { attempt: Attempt; at: number }) {
  const route = attempt.profile.tasks.find((t) => t.kind === "route"),
    ref = route ? attempt.referencePaths[route.id] : [];
  // Shared metre-to-screen transform in both axes; no distortion in instructor plan.
  const projection = (points: number[][]) =>
    points
      .map(
        (p) =>
          `${(p[0] + 22.5) * 6},${((p.length === 2 ? p[1] : p[2]) + 13.5) * 6}`,
      )
      .join(" ");
  const frame = replayAt(attempt.frames, at);
  return (
    <svg
      className="training-map"
      viewBox="-5 -5 280 172"
      role="img"
      aria-label="Đường bay mẫu và vệt bay học viên đã ghi"
    >
      <rect
        x="0"
        y="0"
        width="270"
        height="162"
        fill="#e5e8dc"
        stroke="#84947b"
      />
      <polyline
        points={projection(ref)}
        stroke="#7c9875"
        strokeDasharray="3 2"
        fill="none"
      />
      <polyline
        points={projection(
          attempt.frames
            .filter(
              (_, i) =>
                i % Math.max(1, Math.ceil(attempt.frames.length / 1500)) === 0,
            )
            .map((f) => f.position),
        )}
        stroke="#ca6439"
        strokeWidth="1.4"
        fill="none"
      />
      {frame && (
        <circle
          cx={(frame.position[0] + 22.5) * 6}
          cy={(frame.position[2] + 13.5) * 6}
          r="3"
          fill="#273e30"
        />
      )}
      <text x="7" y="12" fontSize="7">
        H
      </text>
    </svg>
  );
}
function TelemetryPlots({ attempt, at }: { attempt: Attempt; at: number }) {
  const frames = attempt.frames.filter(
    (_, i) => i % Math.max(1, Math.ceil(attempt.frames.length / 1000)) === 0,
  );
  const end = Math.max(0.02, attempt.frames.at(-1)?.time ?? 0);
  const panels = [
    {
      name: "Độ cao càng đáp (m)",
      series: [{ color: "#456844", values: frames.map((f) => f.altitude) }],
      max: Math.max(6, ...frames.map((f) => f.altitude)),
    },
    {
      name: "Tốc độ (m/s)",
      series: [
        {
          color: "#936044",
          values: frames.map((f) => Math.hypot(...f.velocity)),
        },
      ],
      max: Math.max(3, ...frames.map((f) => Math.hypot(...f.velocity))),
    },
    {
      name: "Độ lệch ngang (m)",
      series: [{ color: "#6c779b", values: frames.map((f) => f.lateral) }],
      max: Math.max(1, ...frames.map((f) => f.lateral)),
    },
  ];
  return (
    <section className="procedure-card telemetry-plots">
      <h2>Biểu đồ bài bay đã ghi</h2>
      {panels.map((panel) => (
        <div key={panel.name}>
          <p>
            {panel.name} · 0–{fixed(panel.max, 1)}
          </p>
          <svg viewBox="0 0 320 70" role="img" aria-label={panel.name}>
            <path d="M0 2V60H320" stroke="#c8d3be" fill="none" />
            {panel.series.map((series) => (
              <polyline
                key={series.color}
                points={frames
                  .map(
                    (f, i) =>
                      `${(f.time / end) * 320},${60 - (series.values[i] / panel.max) * 56}`,
                  )
                  .join(" ")}
                stroke={series.color}
                strokeWidth="1.2"
                fill="none"
              />
            ))}
            <path
              d={`M${(at / end) * 320} 0V60`}
              stroke="#cf783f"
              strokeDasharray="2 2"
            />
            <text x="1" y="69" fontSize="7">
              0 s
            </text>
            <text x="318" y="69" textAnchor="end" fontSize="7">
              {fixed(end, 1)} s
            </text>
          </svg>
        </div>
      ))}
      <div>
        <p>Cần điều khiển −1…+1: lên xuống / xoay / tiến lùi / trái phải</p>
        <svg
          viewBox="0 0 320 72"
          role="img"
          aria-label="Lịch sử cần điều khiển đã ghi"
        >
          <path d="M0 32H320" stroke="#b5c3a7" />
          {channels.map((k, i) => (
            <polyline
              key={k}
              points={frames
                .map((f) => `${(f.time / end) * 320},${32 - f.rc[k] * 28}`)
                .join(" ")}
              stroke={["#3c704b", "#cc8044", "#557ea1", "#9b659b"][i]}
              fill="none"
              strokeWidth="1"
            />
          ))}
          <path
            d={`M${(at / end) * 320} 0V62`}
            stroke="#cf783f"
            strokeDasharray="2 2"
          />
          {channels.map((k, i) => (
            <text
              key={k}
              x={i * 79}
              y="71"
              fill={["#3c704b", "#cc8044", "#557ea1", "#9b659b"][i]}
              fontSize="7"
            >
              {vi(k)}
            </text>
          ))}
        </svg>
      </div>
      <p className="training-muted">
        Biểu đồ hiển thị tối đa 1.000 mẫu. Tệp JSON/CSV giữ toàn bộ dữ liệu.
        Vạch cam chỉ thời điểm đang xem.
      </p>
    </section>
  );
}
export function TrainingDesk({
  w,
  t,
  page,
  navigate,
}: {
  w: World | null;
  t: Telemetry;
  page: string;
  navigate: (page: string) => void;
}) {
  const [guide, setGuide] = useState(() =>
    preference("uav-show-guide", "yes") === "yes" ? 0 : -1,
  );
  const [, refresh] = useState(0),
    [candidate, setCandidate] = useState(""),
    [profile, setProfile] = useState<ProfileId>(() => {
      const p = preference("uav-preferred-profile", "figure-eight");
      return Object.hasOwn(profiles, p) ? (p as ProfileId) : "figure-eight";
    }),
    [message, setMessage] = useState(
      "Chọn bài bay và kiểm tra điều khiển để bắt đầu. Các tiêu chí chỉ dùng luyện tập.",
    ),
    [stored, setStored] = useState<SealedAttempt[]>([]),
    [selected, setSelected] = useState<Attempt | null>(null),
    [notes, setNotes] = useState<Annotation[]>([]),
    [author, setAuthor] = useState("Giảng viên"),
    [note, setNote] = useState(""),
    [noteKind, setNoteKind] = useState<Annotation["kind"]>("NOTE"),
    [draft, setDraft] = useState<ControllerProfile>(mode2()),
    [controllerProfiles, setControllerProfiles] = useState<ControllerProfile[]>(
      [],
    ),
    [station, setStation] = useState<PilotStation>({ ...PILOT_STATION });
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [groups, setGroups] = useState({ exercise: true, device: false, weather: false, help: false, advanced: false, aids: false });
  const toggleGroup = (key: keyof typeof groups, value: boolean) => setGroups(p => ({...p, [key]: value}));
  const panelRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dock = dockRef.current;
    const shell = dock?.closest<HTMLElement>(".app-shell");
    if (!dock || !shell) return;
    const measure = () => shell.style.setProperty("--flight-dock-height", `${dock.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    measure();
    return () => { observer.disconnect(); shell.style.removeProperty("--flight-dock-height"); };
  }, [page, !!w]);
  const saveKey = useRef(""),
    lastCheckpoint = useRef(0),
    extremes = useRef<Record<number, { min: number; max: number }>>({});
  const s = w?.session,
    locked = !!s?.locked,
    strict = !!s?.strict;
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [page]);
  useEffect(() => {
    if (guide === 1) setGroups(p => ({...p, exercise: true, device: false}));
    if (guide === 2) setGroups(p => ({...p, exercise: false, device: true}));
  }, [guide]);
  const update = () => refresh((n) => n + 1);
  const run = (fn: () => unknown, success?: string) => {
    try {
      const result = fn();
      if (result === false)
        setMessage(
          "Chưa thể thực hiện. Kiểm tra đúng bước, máy bay đã ở H, các cần ở trung tâm và thiết bị đã kết nối.",
        );
      else if (success) setMessage(vi(success));
      update();
    } catch (e) {
      setMessage(
        `Không thực hiện được. Kiểm tra lại thao tác hoặc xuất bản ghi để giữ dữ liệu. Chi tiết kỹ thuật: ${String(e)}`,
      );
    }
  };
  async function reload() {
    try {
      setStored(
        (await loadAttempts()).sort((a, b) =>
          b.payload.createdAt.localeCompare(a.payload.createdAt),
        ),
      );
    } catch (e) {
      setMessage(
        `Không đọc được bộ nhớ. Xuất JSON để giữ dữ liệu. Chi tiết: ${String(e)}`,
      );
    }
  }
  useEffect(() => {
    void reload();
    try {
      const rows = JSON.parse(
        localStorage.getItem("uav-controller-profiles") ?? "[]",
      );
      if (Array.isArray(rows))
        setControllerProfiles(rows.filter(validController).slice(0, 20));
    } catch {
      /* no valid saved library */
    }
  }, []);
  useEffect(() => {
    if (w) {
      setDraft(JSON.parse(JSON.stringify(w.input.profile)));
      setStation({ ...w.pilotStation });
    }
  }, [w, page]);
  useEffect(() => {
    if (!s) return;
    const key = `${s.attempt.id}:${vi(s.state)}`;
    const final = isFinal(s.state);
    if (
      (final && saveKey.current !== key) ||
      (!final && t.time - lastCheckpoint.current >= 10)
    ) {
      if (final) saveKey.current = key;
      lastCheckpoint.current = t.time;
      void saveAttempt(s.snapshot())
        .then(() => {
          if (final) {
            setMessage(
              "Đã lưu bài bay trên thiết bị này. Cần giảng viên đánh giá kết quả.",
            );
            void reload();
          }
        })
        .catch((e) => {
          setMessage(
            `Chưa lưu được bài bay. Hãy xuất JSON để giữ bản ghi. Chi tiết: ${String(e)}`,
          );
        });
    }
  }, [t.time, s?.state]);
  if (!w)
    return <aside className="training-panel">Đang kết nối mô phỏng…</aside>;
  const current = selected ?? s?.attempt ?? null;
  const replay = w.replay,
    frame = replay ? replayAt(replay.attempt.frames, replay.time) : null;
  const flyPage = page === "Training" || page === "Mock Examination";
  const begin = () =>
    run(() => {
      const ok = w.beginAttempt(
        candidate,
        page === "Mock Examination" ? "Mock Examination" : "Training",
        profile,
      );
      if (ok) {
        setSelected(null);
        lastCheckpoint.current = t.time;
        saveKey.current = "";
      }
      return ok;
    }, "Hãy kiểm tra từng mục trước bay. Đây là xác nhận của học viên trong mô phỏng.");
  const exportFile = async (format: "JSON" | "CSV" | "Report") => {
    if (!current) return;
    try {
      if (format === "JSON")
        download(
          `${current.id}.json`,
          JSON.stringify(
            { ...(await seal(current)), annotations: notes },
            null,
            2,
          ),
        );
      else if (format === "CSV")
        download(`${current.id}.csv`, attemptCSV(current), "text/csv");
      else
        download(
          `${current.id}-report.txt`,
          learnerReport(current, notes),
          "text/plain",
        );
    } catch (e) {
      setMessage(
        `Không thực hiện được. Kiểm tra lại thao tác hoặc xuất bản ghi để giữ dữ liệu. Chi tiết kỹ thuật: ${String(e)}`,
      );
    }
  };
  async function openAttempt(a: Attempt) {
    if (!w) return;
    if (locked) {
      setMessage("Hoàn tất hoặc hủy bài đang bay trước khi mở phát lại.");
      return;
    }
    try {
      await parseAttempt(JSON.stringify(await seal(a)));
      setSelected(a);
      setNotes(await annotationsFor(a.id));
      if (a.frames.length) {
        w.setReplay(a);
        w.setCamera("Overview");
      } else {
        w.setReplay(null);
        setMessage(
          "Bài này chưa có mẫu đường bay. Chỉ có thể xem thông tin và các bước đã ghi.",
        );
      }
      update();
    } catch (e) {
      setMessage(
        `Không thực hiện được. Kiểm tra lại thao tác hoặc xuất bản ghi để giữ dữ liệu. Chi tiết kỹ thuật: ${String(e)}`,
      );
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 100_000_000) {
      setMessage("Tệp quá lớn. Chọn bản ghi JSON không quá 100 MB.");
      return;
    }
    try {
      const e = await parseAttempt(await file.text());
      await saveAttempt(e.payload);
      const existing = await annotationsFor(e.payload.id);
      for (const n of e.annotations ?? [])
        if (
          !existing.some(
            (v) => v.at === n.at && v.author === n.author && v.text === n.text,
          )
        )
          await addAnnotation({ ...n, id: undefined });
      await reload();
      await openAttempt(e.payload);
      setMessage(
        "Đã nhập bản ghi và kiểm tra checksum. Đây là dữ liệu mô phỏng tự khai báo, không có chữ ký thiết bị.",
      );
    } catch (e) {
      setMessage(
        `Không thể nhập tệp. Chọn đúng bản ghi mô phỏng JSON còn nguyên vẹn. Chi tiết: ${String(e)}`,
      );
    }
  }
  function axisUpdate(k: Channel, key: string, value: number | boolean) {
    setDraft((p) => ({
      ...p,
      axes: { ...p.axes, [k]: { ...p.axes[k], [key]: value } },
    }));
  }
  for (const [i, value] of w.input.raw.entries()) {
    const a = extremes.current[i] ?? { min: value, max: value };
    a.min = Math.min(a.min, value);
    a.max = Math.max(a.max, value);
    extremes.current[i] = a;
  }
  return (
    <>
      <aside
        className={`training-panel ${flyPage ? "flight-panel" : "wide-panel"} ${panelCollapsed ? "collapsed-panel" : ""}`}
        aria-label={`${vi(page)} · nội dung`}
        id="main-content"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="training-eyebrow">
          LUYỆN BAY UAV<span>LƯU TRÊN THIẾT BỊ</span>
        </div>
        <h1>{vi(page)}</h1>
        <p className="training-intro" hidden={flyPage}>
          {vi(
            page === "Mock Examination"
              ? "SIMULATED / PRACTICE EXAMINATION. Manual flight, fixed Pilot VLOS, locked profile and no guidance aids."
              : page === "Training"
                ? "Practise procedures and complete courses from the pilot’s fixed observation station."
                : "Instructor tools and inspectable practice evidence. No official certification.",
          )}
        </p>
        {flyPage && <>
          {!locked && <>
            <p className="journey-step">1 · Chuẩn bị <span>→ 2 · Bay → 3 · Xem kết quả</span></p>
            <div className="guide-switch">
              <button onClick={() => { setGuide(0); remember("uav-show-guide", "yes"); }}>Hướng dẫn từng bước</button>
              {guide >= 0 && <button onClick={() => { setGuide(-1); remember("uav-show-guide", "no"); }}>Bỏ qua hướng dẫn</button>}
            </div>
            {guide >= 0 && <section className="setup-guide" aria-label="Hướng dẫn bắt đầu">
              <p>Bước {guide + 1} / 4</p>
              <h2>{["Chọn chế độ", "Chọn bài bay", "Kiểm tra điều khiển", "Sẵn sàng bắt đầu"][guide]}</h2>
              {guide === 0 ? <div className="training-actions">
                <button onClick={() => { navigate("Training"); setGuide(1); }}>Luyện tập</button>
                <button onClick={() => { navigate("Mock Examination"); setGuide(1); }}>Thi thử</button>
              </div> : <p>{guide === 1 ? "Nhập tên hoặc mã và chọn bài muốn tập." : guide === 2 ? "Chọn bàn phím hoặc cắm tay điều khiển rồi thử phản hồi." : "Chọn Chuẩn bị bài bay bên dưới, rồi kiểm tra trước bay. Bạn sẽ tự cất và hạ cánh."}</p>}
              <div className="training-actions">
                {guide > 0 && <button onClick={() => setGuide(guide - 1)}>Quay lại</button>}
                {guide < 3 && <button className="training-primary" disabled={guide === 2 && w.input.source === "Gamepad" && (!w.input.connected || !!w.input.fault)} onClick={() => setGuide(guide + 1)}>Tiếp theo</button>}
              </div>
            </section>}
            <fieldset disabled={!!replay} className="preparation-groups">
              <TaskGroup title="Bài bay" summary={`${candidate || "Chưa nhập tên"} · ${vi(profiles[profile].name)}`} open={groups.exercise} onToggle={v => toggleGroup("exercise", v)}>
                <label>Tên hoặc mã học viên<input aria-label="Tên hoặc mã học viên" maxLength={80} value={candidate} onChange={e => setCandidate(e.target.value)} /></label>
                <label>Chọn bài bay<select aria-label="Chọn bài bay" value={profile} onChange={e => { setProfile(e.target.value as ProfileId); remember("uav-preferred-profile", e.target.value); }}>
                  {Object.entries(profiles).map(([id, p]) => <option key={id} value={id}>{vi(p.name)}</option>)}
                </select></label>
                <p>{vi(profiles[profile].tasks[0]?.label)}</p>
                <button onClick={() => setGroups(p => ({...p, exercise: false, device: true}))}>Tiếp tục: kiểm tra điều khiển</button>
              </TaskGroup>
              <TaskGroup title="Thiết bị điều khiển" summary={w.input.source === "Keyboard" ? "Bàn phím · sẵn sàng luyện thử" : w.input.connected ? "Tay điều khiển · đã kết nối" : "Tay điều khiển · chưa kết nối"} open={groups.device} onToggle={v => toggleGroup("device", v)}>
                <InputCheck w={w} onUpdate={update} />
              </TaskGroup>
              <TaskGroup title="Điều kiện bay" summary={page === "Mock Examination" ? "Giảng viên chọn · không thể sửa" : weatherSummary(w.weather.target)} open={groups.weather} onToggle={v => toggleGroup("weather", v)}>
                {page === "Training" ? <WindSelector w={w} onUpdate={update} /> : <p>Thời tiết do giảng viên chọn: {weatherSummary(w.weather.target)}. Bạn không thể thay đổi trong Thi thử.</p>}
              </TaskGroup>
            </fieldset>
          </>}
          {s && <section className="essential-status" aria-label="Trạng thái bài bay">
            <b data-testid="exam-state">{vi(s.state)}</b>
            <p>{w.input.source === "Keyboard" ? "Bàn phím" : w.input.connected ? "Tay điều khiển đã kết nối" : "Chưa kết nối tay điều khiển"}</p>
            {w.input.fault && <p role="alert">{vi(w.input.fault)}</p>}
            {!strict && <p>Độ cao {fixed(t.altitude, 1)} m · tốc độ {fixed(t.groundSpeed, 1)} m/s</p>}
          </section>}
          {s && <section className="procedure-card flight-task" aria-label="Việc cần làm">
            {s.state === "PREFLIGHT" && <><h2>Kiểm tra trước bay</h2>{preflight.map((text, i) => <label className="training-check" key={text}><input type="checkbox" checked={s.attempt.preflight[i]} onChange={e => run(() => s.check("preflight", i, e.target.checked))} />{vi(text)}</label>)}</>}
            {s.state === "READY" && <><h2>Sẵn sàng cất cánh</h2><p>Bật động cơ, chọn Bắt đầu bài tập rồi tự đưa máy bay lên bằng R hoặc cần lên.</p></>}
            {s.state === "ACTIVE" && <><h2>{vi(s.task?.label)}</h2><p>Phần {s.taskIndex + 1} / {s.attempt.profile.tasks.length}</p>
              {!strict && <><progress max={1} value={s.task?.kind === "route" ? s.pathProgress : Math.min(1, s.dwell / (s.task?.seconds ?? 5))} /><p>Đường bay {Math.round(s.pathProgress * 100)}% · giữ ổn định {fixed(s.dwell, 1)} s</p>
                <details><summary>Số liệu bài tập</summary><p>Lệch độ cao {fixed(s.altitudeError)} m · lệch ngang {fixed(s.lateral)} m</p>{s.task?.kind === "orientation" && <p>Hướng cần giữ {[0, 90, 180, -90][s.orientationIndex]}° · lệch {fixed(s.headingError, 0)}°</p>}</details></>}
              {s.task?.kind === "abnormal" && <button onClick={() => run(() => s.acknowledgeAbnormal(), "Đã xác nhận phương án. Tự đưa máy bay về H và hạ cánh.")}>Xác nhận tình huống và phương án xử lý</button>}
            </>}
            {s.state === "PAUSED" && <><h2>Đang tạm dừng</h2><p>Kiểm tra thiết bị và chọn Tiếp tục bài bay khi sẵn sàng.</p></>}
            {s.state === "TASK_COMPLETE" && <><h2>Đưa máy bay về H</h2><p>Đã ghi nhận các phần bài bay. Chọn Bắt đầu hạ cánh thủ công rồi tự hạ bằng F hoặc cần xuống.</p></>}
            {s.state === "LANDING" && <><h2>Hạ cánh thủ công</h2><p>Hạ xuống trên H. Chỉ tắt động cơ khi đã chạm đất ổn định. Chờ cánh quạt dừng.</p></>}
            {s.state === "POSTFLIGHT" && <><h2>Kiểm tra sau bay</h2>{postflight.map((text, i) => <label className="training-check" key={text}><input type="checkbox" checked={s.attempt.postflight[i]} onChange={e => run(() => s.check("postflight", i, e.target.checked))} />{vi(text)}</label>)}</>}
            {isFinal(s.state) && <div className="training-result"><h2>{vi(s.attempt.result.decision)}</h2><p>Điểm luyện tập {fixed(s.attempt.result.practiceScore, 1)} / 100</p><p>Hoàn thành {s.attempt.result.completedTasks.length} phần. Điểm cao chưa đủ để kết luận đạt.</p><button onClick={() => navigate("Session Review")}>Xem kết quả và bản ghi</button></div>}
          </section>}
          {page === "Training" && !strict && <TaskGroup title="Hỗ trợ luyện tập" summary="Tùy chọn · không dùng trong Thi thử" open={groups.aids} onToggle={v => toggleGroup("aids", v)}>
            <label className="training-check"><input type="checkbox" checked={w.groundGuideEnabled} onChange={e => run(() => w.setGroundGuide(e.target.checked))} />Hiện vị trí dưới máy bay</label>
            <label className="training-check"><input type="checkbox" checked={w.routeVisible} onChange={e => run(() => w.setRoute(e.target.checked))} />Hỗ trợ luyện tập: hiện đường mẫu và vệt bay</label>
          </TaskGroup>}
          <TaskGroup title="Hướng dẫn" summary={locked ? "Phím điều khiển và bước tiếp theo" : "Tùy chọn · đọc khi cần"} open={groups.help} onToggle={v => toggleGroup("help", v)}>
            <div className="training-keyboard"><b>Cách điều khiển</b><p>W/S tiến / lùi · A/D trái / phải<br />R/F lên / xuống · Q/E xoay hướng · Space tạm dừng</p><p>Chọn vùng mô phỏng trước khi bay. Nhập chữ sẽ ngắt điều khiển. Kéo chuột hoặc dùng nút nhìn quanh; góc người lái không phóng to.</p></div>
            <details className="control-explanation"><summary>Chế độ điều khiển này hoạt động thế nào?</summary><p>Cần ra lệnh vận tốc theo hướng máy bay. Thả cần để hệ thống giữ mục tiêu. Không phải ga trực tiếp hay điều khiển góc nghiêng trên UAV thật.</p></details>
          </TaskGroup>
          {!locked && <TaskGroup title="Cài đặt nâng cao" summary="Hiệu chỉnh và công cụ giảng viên" open={groups.advanced} onToggle={v => toggleGroup("advanced", v)}>
            <button onClick={() => navigate("Controller Calibration")}>Hiệu chỉnh tay điều khiển</button><button onClick={() => navigate("System Configuration")}>Mở cài đặt chi tiết</button>
          </TaskGroup>}
        </>}
        {page === "Controller Calibration" && (
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
                        w.input.source = e.target.value as
                          "Keyboard" | "Gamepad";
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
                        w.input.index = Math.max(
                          0,
                          Math.min(7, +e.target.value),
                        );
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
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
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
                            {({axis:"Số trục",min:"Đầu hành trình dưới",center:"Điểm giữa",max:"Đầu hành trình trên",deadzone:"Vùng chết"})[key]}
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
        )}
        {page === "Examination Profiles" && (
          <>
            {Object.values(profiles).map((p) => (
              <section className="procedure-card" key={p.id}>
                <h2>
                  {vi(p.name)} · v{p.version}
                </h2>
                <p className="training-tag">
                  CHỈ LUYỆN TẬP · CHƯA XÁC MINH ÁP DỤNG SÁT HẠCH
                </p>
                <ol>
                  {p.tasks.map((task) => (
                    <li key={task.id}>{vi(task.label)}</li>
                  ))}
                  <li>Tự đưa về H, hạ cánh, tắt động cơ và kiểm tra sau bay</li>
                </ol>
                <p>
                  Cần kiểm tra trước và sau bay, cùng đánh giá của giảng viên.
                  Bay mẫu tự động không tính là bài bay của học viên.
                </p>
              </section>
            ))}
            <details open>
              <summary>Tiêu chí kỹ thuật theo phiên bản</summary>
              <dl className="rule-list">
                {Object.entries(rules).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <p>
              Nguồn tiêu chí: docs/UAV_EXAMINATION_STANDARDS_RESEARCH.md. Chưa
              có bộ tiêu chí sát hạch Việt Nam chính thức được xác minh. Mọi
              thay đổi cần phiên bản mới; giữ nguyên dữ liệu bài đã bay.
            </p>
          </>
        )}
        {page === "Instructor" && locked && !strict && (
          <section className="procedure-card">
            <h2>Điều khiển của giảng viên</h2>
            <div className="training-actions">
              <button onClick={() => run(() => s?.pause(w.drone))}>
                {s?.state === "PAUSED"
                  ? "Tiếp tục bài đang bay"
                  : "Tạm dừng bài đang bay"}
              </button>
              <button
                onClick={() =>
                  run(() => {
                    s?.abort("Instructor terminated practice");
                    w.drone.hold();
                    w.drone.paused = false;
                    return true;
                  })
                }
              >
                Kết thúc bài đang bay
              </button>
            </div>
            <p>
              Tạm dừng trước khi đổi thời tiết. Nhận xét được lưu riêng sau bản
              ghi.
            </p>
          </section>
        )}
        {(page === "System Configuration" || page === "Instructor") && (
          <>
            <div className="training-actions">
              <button onClick={() => navigate("Controller Calibration")}>
                Kiểm tra tay điều khiển
              </button>
              {page === "Instructor" && (
                <>
                  <button
                    disabled={locked}
                    onClick={() => navigate("Reference missions")}
                  >
                    Bay mẫu tự động
                  </button>
                  <button
                    disabled={locked}
                    onClick={() => navigate("Examination Profiles")}
                  >
                    Bài bay và tiêu chí
                  </button>
                </>
              )}
            </div>
            {page === "System Configuration" && (
              <>
                <InputCheck w={w} disabled={locked} onUpdate={update} />
                <label>
                  Hiển thị
                  <select
                    aria-label="Hiển thị"
                    value={w.quality}
                    onChange={(e) => {
                      w.setQuality(e.target.value as World["quality"]);
                      remember("uav-display-quality", e.target.value);
                      update();
                    }}
                    disabled={strict}
                  >
                    <option value="Low">Ưu tiên mượt</option>
                    <option value="Medium">Cân bằng</option>
                    <option value="High">Ưu tiên hình ảnh</option>
                    <option value="Ultra">Chi tiết tối đa · máy mạnh</option>
                  </select>
                </label>
                <p className="training-muted">
                  Chất lượng hình ảnh không thay đổi mô hình bay. Nếu mô phỏng
                  chậm, chọn Ưu tiên mượt. Không tự đổi chất lượng trong bài thi
                  thử.
                </p>
              </>
            )}
            {page === "Instructor" && (
              <>
                <h2>Thiết lập trước bài thi thử</h2>
                <WindSelector
                  w={w}
                  assessment
                  disabled={locked}
                  onUpdate={update}
                />
                <p>
                  Chỉ áp dụng cho lần mở Thi thử tiếp theo. Không sửa dữ liệu
                  bài bay đã ghi.
                </p>
              </>
            )}
            <details className="technical-settings">
              <summary>Cài đặt nâng cao</summary>
              <fieldset
                disabled={
                  strict ||
                  !!replay ||
                  (locked && (page !== "Instructor" || s?.state !== "PAUSED"))
                }
              >
                <legend>Thời tiết chi tiết · luyện tập</legend>
                <label>
                  Kịch bản gốc
                  <select
                    aria-label="Kịch bản thời tiết luyện tập"
                    value={
                      Object.keys(presets).find((p) =>
                        Object.entries(presets[p as Preset]).every(
                          ([k, v]) =>
                            w.weather.target[
                              k as keyof typeof w.weather.target
                            ] === v,
                        ),
                      ) ?? ""
                    }
                    onChange={(e) =>
                      run(() => w.setWeatherPreset(e.target.value as Preset))
                    }
                  >
                    <option value="" disabled>
                      Đã tùy chỉnh · xem thông số bên dưới
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
                    ["direction", 0, 360, 1, "Hướng gió tới · +X = 0°"],
                    ["gust", 0, 7, 0.1, "Biên độ gió giật (m/s)"],
                    ["turbulence", 0, 1, 0.05, "Mức nhiễu gió"],
                    ["rain", 0, 1, 0.05, "Cường độ mưa"],
                    ["cloud", 0, 1, 0.05, "Mức mây"],
                    ["visibility", 60, 800, 10, "Tầm nhìn (m)"],
                    ["timeOfDay", 7, 18, 0.1, "Giờ trong ngày"],
                  ] as const
                ).map(([key, min, max, step, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      aria-label={`Chi tiết ${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={w.weather.target[key]}
                      onChange={(e) =>
                        run(() => w.setAdvancedWeather(key, +e.target.value))
                      }
                    />
                    {fixed(w.weather.target[key])}
                  </label>
                ))}
                <p>
                  Chuyển thời tiết được hòa trộn trong khoảng vài giây. Khi
                  chuẩn bị bài, điều kiện đã chọn được cố định và ghi lại. Mưa
                  chỉ có tác dụng hình ảnh; gió tác động lên mô hình bay.
                </p>
              </fieldset>
              <fieldset disabled={locked || !!replay}>
                <legend>Vị trí người lái · tạm đề xuất</legend>
                <PilotDiagram station={station} />
                {(
                  [
                    ["setback", 0.1, 7, 0.1, "Khoảng lùi ngoài V1 (m)"],
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
                      onChange={(e) => {
                        const value = +e.target.value;
                        setStation(
                          key === "setback" && value > 0
                            ? {
                                ...frontPilotStation(value),
                                eyeHeight: station.eyeHeight,
                                verticalFov: station.verticalFov,
                              }
                            : { ...station, [key]: value },
                        );
                      }}
                    />
                  </label>
                ))}
                <p>
                  X {fixed(station.x, 1)} m · Z {fixed(station.z, 1)} m · ngoài
                  cạnh V1 phía trước. Không di chuyển H hoặc vạch sân.
                </p>
                {!validFrontStation(station) && (
                  <p role="alert">
                    Chưa lưu được vị trí. Nhập khoảng lùi lớn hơn 0,025 m và nằm
                    trong bãi cỏ; chiều cao mắt từ 1 đến 2,2 m; góc nhìn từ 35
                    đến 80 độ.
                  </p>
                )}
                <button
                  disabled={!validFrontStation(station)}
                  onClick={() =>
                    run(
                      () => w.configureStation(station),
                      "Provisional station saved. Validate against authority/site evidence before field use.",
                    )
                  }
                >
                  Lưu vị trí người lái tạm đề xuất
                </button>
              </fieldset>
              <details>
                <summary>Hiệu chỉnh màn hình và góc nhìn</summary>
                <p>
                  Đo chiều cao vùng ảnh trên màn hình và khoảng cách từ mắt tới
                  màn hình. Góc nhìn dọc tương ứng = 2 × atan(chiều cao ảnh / (2
                  × khoảng cách nhìn)). Nhập kết quả ở Góc nhìn dọc trước bài
                  bay. Góc ngang hiện tại{" "}
                  {fixed(
                    (2 *
                      Math.atan(
                        Math.tan((w.pilotStation.verticalFov * Math.PI) / 360) *
                          w.camera.aspect,
                      ) *
                      180) /
                      Math.PI,
                    1,
                  )}
                  °.
                </p>
                <p>
                  Máy bay giữ đúng kích thước mét. Độ phân giải, khoảng cách
                  nhìn, thị lực và độ trễ làm thay đổi khả năng nhận hướng. Phối
                  cảnh đúng chưa chứng minh tương đương quan sát ngoài thực địa.
                  Không thay đổi góc nhìn để phóng đại máy bay trong thi thử.
                </p>
              </details>
              <fieldset disabled={strict}>
                <legend>Lớp phủ kỹ thuật</legend>
                <label className="training-check">
                  <input
                    type="checkbox"
                    checked={w.pilotMarker.visible}
                    onChange={(e) =>
                      run(() => w.setPilotMarker(e.target.checked))
                    }
                  />
                  PILOT — Vị trí người điều khiển và hướng nhìn
                </label>
                <label className="training-check">
                  <input
                    type="checkbox"
                    checked={w.labels.visible}
                    onChange={(e) => run(() => w.setLabels(e.target.checked))}
                  />
                  Nhãn mốc sân
                </label>
                <label className="training-check">
                  <input
                    type="checkbox"
                    checked={w.debug.visible}
                    onChange={(e) => run(() => w.setDebug(e.target.checked))}
                  />
                  Khung va chạm
                </label>
              </fieldset>
              <p className="training-muted">
                Thông tin kỹ thuật: {w.stats.gpu} · {w.stats.fps} FPS ·{" "}
                {w.stats.physicsHz} bước vật lý / giây thực. Chưa xác minh hiệu
                năng phần cứng thực.
              </p>
              <p>
                Chỉ nhập bản ghi mô phỏng JSON. Không có kết nối gửi lệnh, bật
                động cơ hoặc cất cánh trên máy bay thật.
              </p>
            </details>
          </>
        )}
        {(page === "Instructor" || page === "Session Review") && (
          <>
            <div className="training-actions">
              <button onClick={() => void reload()}>
                Tải lại danh sách bài bay
              </button>
              <label className="file-button">
                Nhập bản ghi mô phỏng JSON
                <input
                  aria-label="Nhập bản ghi mô phỏng JSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void importFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {stored.length === 0 && (
              <p>
                Chưa có bài bay đã lưu. Bản ghi được lưu trên thiết bị khi hoàn
                tất hoặc hủy bài bay.
              </p>
            )}
            <div className="attempt-list">
              {stored.map((a) => (
                <button
                  key={a.payload.id}
                  className={selected?.id === a.payload.id ? "selected" : ""}
                  disabled={locked}
                  onClick={() => void openAttempt(a.payload)}
                >
                  <b>
                    {vi(a.payload.candidate)} · {vi(a.payload.profile.name)}
                  </b>
                  <span>
                    {vi(a.payload.status)} ·{" "}
                    {new Date(a.payload.createdAt).toLocaleString()}
                  </span>
                  <small>{a.sha256.slice(0, 16)}…</small>
                </button>
              ))}
            </div>
            {locked && (
              <p>
                Bài đang bay: {vi(s?.state)}.{" "}
                {strict
                  ? "Công cụ giảng viên bị khóa khi thi thử."
                  : "Có thể xem số liệu và vệt bay bên dưới. Không có tự động lái."}
              </p>
            )}
            {current && (
              <>
                <section className="procedure-card">
                  <h2>
                    {vi(current.candidate)} · {vi(current.profile.name)}
                  </h2>
                  <p>
                    {vi(current.status)} · {vi(current.result.decision)}
                  </p>
                  <p className="training-tag">THI THỬ TRONG MÔ PHỎNG</p>
                  <TraceMap
                    attempt={current}
                    at={replay?.time ?? current.frames.at(-1)?.time ?? 0}
                  />
                  <p className="training-muted">
                    Nét đứt xanh: đường mẫu. Nét cam: vệt bay thực đã ghi, chiếu
                    xuống mặt bằng.
                  </p>
                  <dl className="result-metrics">
                    <div>
                      <dt>Điểm luyện tập</dt>
                      <dd>{fixed(current.result.practiceScore, 1)} / 100</dd>
                    </div>
                    <div>
                      <dt>Lệch ngang lớn nhất</dt>
                      <dd>{fixed(current.result.maxLateral)} m</dd>
                    </div>
                    <div>
                      <dt>Lệch độ cao lớn nhất</dt>
                      <dd>{fixed(current.result.maxAltitudeError)} m</dd>
                    </div>
                    <div>
                      <dt>Tốc độ lớn nhất</dt>
                      <dd>{fixed(current.result.maxSpeed)} m/s</dd>
                    </div>
                    <div>
                      <dt>Độ lệch khi hạ cánh</dt>
                      <dd>
                        {current.result.landingError === null
                          ? "Chưa ghi nhận"
                          : fixed(current.result.landingError) + " m"}
                      </dd>
                    </div>
                    <div>
                      <dt>Phần bài bay đã hoàn thành</dt>
                      <dd>
                        {current.result.completedTasks
                          .map((id) =>
                            vi(
                              current.profile.tasks.find((t) => t.id === id)
                                ?.label ?? id,
                            ),
                          )
                          .join("; ") || "Chưa có"}
                      </dd>
                    </div>
                    <div>
                      <dt>Mốc đường bay chưa đi qua</dt>
                      <dd>{current.result.missedRouteGates}</dd>
                    </div>
                  </dl>
                  <p>
                    Thời gian vượt giới hạn (giây):{" "}
                    {Object.entries(current.result.violations)
                      .map(
                        ([code, seconds]) =>
                          `${vi(code)}: ${fixed(seconds, 1)} s`,
                      )
                      .join("; ") || "Chưa ghi nhận vượt giới hạn"}
                  </p>
                  <p>
                    Nguồn tiêu chí: {vi(current.rules.status)} ·{" "}
                    {vi(current.rules.source)}
                  </p>
                  {!isFinal(current.status) && (
                    <p className="training-callout">
                      Bản lưu giữa chừng hoặc bài đang bay. Bài chưa hoàn tất,
                      không thể kết luận đạt.
                    </p>
                  )}
                </section>
                {replay && (
                  <section className="procedure-card">
                    <h2>Phát lại bài bay đã ghi</h2>
                    <label>
                      Thời gian mô phỏng {fixed(replay.time, 2)} s
                      <input
                        aria-label="Thời điểm phát lại"
                        type="range"
                        min={replay.attempt.frames[0]?.time ?? 0}
                        max={replay.attempt.frames.at(-1)?.time ?? 0}
                        step={0.02}
                        value={replay.time}
                        onChange={(e) =>
                          run(() => {
                            replay.time = +e.target.value;
                          })
                        }
                      />
                    </label>
                    <div className="training-actions">
                      <button
                        onClick={() =>
                          run(() => {
                            replay.playing = !replay.playing;
                          })
                        }
                      >
                        {replay.playing ? "Tạm dừng phát lại" : "Phát lại"}
                      </button>
                      <select
                        aria-label="Tốc độ phát lại"
                        value={replay.speed}
                        onChange={(e) =>
                          run(() => {
                            replay.speed = +e.target.value;
                          })
                        }
                      >
                        {[0.25, 0.5, 1, 2, 4].map((v) => (
                          <option key={v} value={v}>
                            {v}×
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!frame?.cameraPose}
                        onClick={() =>
                          run(() => {
                            if (w.replay) {
                              w.replay.recordedCamera = true;
                              w.controls.enabled = false;
                            }
                          })
                        }
                      >
                        Góc nhìn đã ghi
                      </button>
                      <button onClick={() => run(() => w.setReplay(null))}>
                        Đóng phát lại
                      </button>
                    </div>
                    {frame && (
                      <details>
                        <summary>Số liệu chi tiết của bản ghi</summary>
                        <p>
                          Phần {vi(frame.task)} · {vi(frame.state)} · góc đã ghi{" "}
                          {vi(frame.camera)}
                        </p>
                        <p>
                          XYZ {frame.position.map((n) => fixed(n)).join(" / ")}{" "}
                          m<br />
                          Độ cao {fixed(frame.altitude)} m · tốc độ{" "}
                          {fixed(Math.hypot(...frame.velocity))} m/s
                          <br />
                          Lệch ngang {fixed(frame.lateral)} m · lệch hướng{" "}
                          {fixed(frame.headingError, 1)}°
                        </p>
                        <div className="rc-bars">
                          {channels.map((k) => (
                            <div key={k}>
                              <span>{vi(k)}</span>
                              <meter min={-1} max={1} value={frame.rc[k]} />
                              <b>{fixed(frame.rc[k])}</b>
                            </div>
                          ))}
                        </div>
                        <p>
                          Động cơ{" "}
                          {frame.motors.map((n) => fixed(n, 0)).join(" / ")}{" "}
                          rad/s
                          <br />
                          Gió {frame.wind.map((n) => fixed(n)).join(" / ")} m/s
                        </p>
                      </details>
                    )}
                  </section>
                )}
                <TelemetryPlots
                  attempt={current}
                  at={replay?.time ?? current.frames.at(-1)?.time ?? 0}
                />
                <section className="procedure-card">
                  <h2>Nhận xét của giảng viên</h2>
                  <label>
                    Người đánh giá
                    <input
                      aria-label="Người đánh giá"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Loại nhận xét
                    <select
                      aria-label="Loại nhận xét"
                      value={noteKind}
                      onChange={(e) =>
                        setNoteKind(e.target.value as Annotation["kind"])
                      }
                    >
                      <option value="NOTE">Nhận xét tại thời điểm này</option>
                      <option value="PRACTICE_REVIEW">
                        Đánh giá luyện tập của giảng viên
                      </option>
                    </select>
                  </label>
                  <label>
                    Nhận xét hoặc kết luận
                    <textarea
                      aria-label="Nội dung nhận xét"
                      maxLength={2000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={locked || !note.trim() || !author.trim()}
                    onClick={() =>
                      void (async () => {
                        try {
                          await addAnnotation({
                            attemptId: current.id,
                            author,
                            at:
                              replay?.time ?? current.frames.at(-1)?.time ?? 0,
                            createdAt: "",
                            kind: noteKind,
                            text: note,
                          });
                          setNotes(await annotationsFor(current.id));
                          setNote("");
                          setMessage(
                            "Đã lưu nhận xét riêng. Bản ghi bài bay được giữ nguyên.",
                          );
                        } catch (e) {
                          setMessage(
                            `Không thực hiện được. Kiểm tra lại thao tác hoặc xuất bản ghi để giữ dữ liệu. Chi tiết kỹ thuật: ${String(e)}`,
                          );
                        }
                      })()
                    }
                  >
                    Lưu nhận xét
                  </button>
                  {notes.map((n) => (
                    <p key={n.id}>
                      {fixed(n.at)}s · {n.author} · {vi(n.kind)}: {n.text}
                    </p>
                  ))}
                </section>
                <details className="procedure-card">
                  <summary>Diễn biến bài bay và lỗi</summary>
                  <ol className="event-timeline">
                    {current.events.map((e, i) => (
                      <li key={i}>
                        <button
                          disabled={!replay}
                          onClick={() =>
                            run(() => {
                              if (replay) replay.time = e.time;
                            })
                          }
                        >
                          {fixed(e.time, 2)}s
                        </button>
                        <b>{vi(e.code)}</b> {vi(e.detail)}
                      </li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary>Giới hạn và nguồn dữ liệu</summary>
                  <ul>
                    {current.result.limitations.map((l) => (
                      <li key={l}>{vi(l)}</li>
                    ))}
                  </ul>
                  <p>
                    SHA-256 giúp phát hiện dữ liệu thay đổi. Tệp cục bộ không
                    phải dữ liệu máy bay có chữ ký xác thực hay hồ sơ sát hạch
                    chính thức.
                  </p>
                </details>
              </>
            )}
          </>
        )}
        {current && !strict && (
          <div className="training-actions exports">
            {(["JSON", "CSV", "Report"] as const).map((f) => (
              <button key={f} onClick={() => void exportFile(f)}>
                {vi(`Export ${f}`)}
              </button>
            ))}
          </div>
        )}
        <p className="training-notice" role="status" aria-live="polite">
          {message}
        </p>
      </aside>
      {flyPage && <div className="flight-dock" ref={dockRef} role="group" aria-label="Thao tác bài bay">
        <span className="dock-state">{s ? vi(s.state) : "Chuẩn bị xong?"}</span>
        {!locked && !replay && <button className="training-primary" disabled={w.input.source === "Gamepad" && (!w.input.connected || !!w.input.fault)} onClick={() => { begin(); setGuide(-1); remember("uav-show-guide", "no"); }}>Chuẩn bị bài bay</button>}
        {replay && <button onClick={() => run(() => { w.setReplay(null); setSelected(null); return true; })}>Đóng phát lại để chuẩn bị bay</button>}
        {s?.state === "PREFLIGHT" && <><button className="training-primary" disabled={!s.attempt.preflight.every(Boolean)} onClick={() => run(() => s.ready(), "Đã kiểm tra xong. Bật động cơ rồi chọn Bắt đầu bài tập.")}>Xác nhận kiểm tra trước bay</button><button onClick={() => run(() => s.abort())}>Hủy chuẩn bị</button></>}
        {s?.state === "READY" && <>{!t.armed ? <button className="training-primary" onClick={() => run(() => w.drone.arm(), "Đã bật động cơ. Chọn Bắt đầu bài tập.")}>Bật động cơ</button> : <button className="training-primary" onClick={() => run(() => s.start(w.drone), "Tự cất cánh bằng R hoặc cần lên. W/S tiến lùi, A/D trái phải.")}>Bắt đầu bài tập</button>}</>}
        {s?.state === "TASK_COMPLETE" && <button className="training-primary" onClick={() => run(() => s.requestLanding())}>Bắt đầu hạ cánh thủ công</button>}
        {s?.state === "POSTFLIGHT" && <button className="training-primary" disabled={!s.attempt.postflight.every(Boolean)} onClick={() => run(() => s.finish(), "Đã lưu bài bay. Cần giảng viên đánh giá.")}>Hoàn tất và lưu bài bay</button>}
        {s?.active && !["PREFLIGHT", "READY", "POSTFLIGHT"].includes(s.state) && <button className={s.state === "TASK_COMPLETE" ? "" : "training-primary"} onClick={() => run(() => s.pause(w.drone))}>{s.state === "PAUSED" ? "Tiếp tục bài bay" : "Tạm dừng bài bay"}</button>}
        {t.armed && <button className="safety-action" onClick={() => run(() => {
          if (w.drone.altitude > .12 && !window.confirm("Dừng khẩn cấp sẽ tắt lực đẩy khi máy bay đang ở trên không. Tiếp tục?")) return true;
          if (w.drone.altitude > .12) s?.abort("Emergency motor stop", true);
          w.drone.disarm();
        }, "Đã tắt lực đẩy. Kiểm tra và lưu bản ghi.")}>{t.altitude > .12 ? "Dừng khẩn cấp" : "Tắt động cơ"}</button>}
        {s?.active && s.state !== "PREFLIGHT" && <button onClick={() => run(() => { if (!window.confirm("Hủy bài bay hiện tại? Bản ghi sẽ được giữ để xem lại; bài này được đánh dấu chưa hoàn thành.")) return true; s.abort(); w.drone.hold(); w.drone.paused = false; return true; })}>Hủy bài bay</button>}
        {!locked && (s || t.armed || t.altitude > .12) && <button onClick={() => run(() => { w.setReplay(null); w.drone.reset(); w.session = null; setSelected(null); return true; }, "Đã đặt lại máy bay tại H.")}>Thử lại từ H</button>}
      </div>}
      <div className="training-scene-tools">
        <button className="panel-toggle" aria-expanded={!panelCollapsed} aria-controls="main-content" onClick={() => setPanelCollapsed(!panelCollapsed)}>{panelCollapsed ? "Mở bảng điều khiển" : "Thu gọn bảng điều khiển"}</button>
        {!flyPage && <details className="camera-aids"><summary>Góc quan sát · {vi(w.cameraMode)}</summary><div>{views.filter(v => !strict || v === "PILOT VLOS").map(v => <button key={v} onClick={() => run(() => w.setCamera(v))}>{vi(v)}</button>)}</div></details>}
        {flyPage && !strict && <details className="camera-aids"><summary>Góc quan sát hỗ trợ</summary><div>{views.map(v => <button key={v} onClick={() => run(() => w.setCamera(v))}>{vi(v)}</button>)}</div></details>}
        {w.cameraMode === "PILOT VLOS" && <div className="head-controls" role="group" aria-label="Nhìn quanh tại chỗ">
          <button aria-label="Nhìn trái" onClick={() => { w.lookPilot(-.2, 0); update(); }}>← Trái</button>
          <button onClick={() => { w.recenterPilot(); update(); }}>Nhìn thẳng</button>
          <button aria-label="Nhìn phải" onClick={() => { w.lookPilot(.2, 0); update(); }}>Phải →</button>
          <details className="head-more"><summary>Nhìn lên / xuống</summary><div><button aria-label="Nhìn lên" onClick={() => { w.lookPilot(0, .12); update(); }}>↑ Lên</button><button aria-label="Nhìn xuống" onClick={() => { w.lookPilot(0, -.12); update(); }}>↓ Xuống</button></div></details>
        </div>}
      </div>
    </>
  );
}
