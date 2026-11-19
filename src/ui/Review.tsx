import { useEffect, useRef, useState } from "react";
import type { World } from "../scene/World";
import type { Attempt } from "../training/Session";
import { channels } from "../training/input";
import {
  addAnnotation,
  annotationsFor,
  attemptCSV,
  download,
  isFinal,
  loadAttempts,
  parseAttempt,
  replayAt,
  saveAttempt,
  seal,
  type Annotation,
  type SealedAttempt,
} from "../training/records";
import { vi, learnerReport } from "./vi";
import { Icon } from "./Design";
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
export function Review({
  w,
  navigate,
}: {
  w: World;
  navigate: (page: string) => void;
}) {
  const libraryRef = useRef<HTMLDivElement>(null);
  const [, refresh] = useState(0);
  const [stored, setStored] = useState<SealedAttempt[]>([]);
  const [selected, setSelected] = useState<Attempt | null>(
    w.session && isFinal(w.session.state) ? w.session.attempt : null,
  );
  const [notes, setNotes] = useState<Annotation[]>([]),
    [note, setNote] = useState("");
  const [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true);
  const replay = w.replay,
    current = selected,
    at = replay?.time ?? current?.frames.at(-1)?.time ?? 0;
  const update = () => refresh((n) => n + 1);
  useEffect(() => {
    const library = libraryRef.current,
      shell = library?.closest<HTMLElement>(".experience-body");
    if (!library || !shell) return;
    const measure = () =>
      shell.style.setProperty(
        "--replay-top",
        `${library.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(library);
    measure();
    return () => {
      observer.disconnect();
      shell.style.removeProperty("--replay-top");
    };
  }, []);
  async function reload() {
    setLoading(true);
    try {
      setStored(
        (await loadAttempts()).sort((a, b) =>
          b.payload.createdAt.localeCompare(a.payload.createdAt),
        ),
      );
    } catch {
      setMessage(
        "Không đọc được bản ghi. Kiểm tra quyền lưu trữ của trình duyệt, rồi tải lại danh sách.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function open(a: Attempt) {
    try {
      await parseAttempt(JSON.stringify(await seal(a)));
      setSelected(a);
      setNotes(await annotationsFor(a.id));
      if (a.frames.length) {
        w.setReplay(a);
        w.setCamera("Overview");
        setMessage("");
      } else {
        w.setReplay(null);
        setMessage(
          "Bài này chưa có đường bay được ghi. Bạn vẫn có thể xem thông tin và kết quả.",
        );
      }
      update();
    } catch {
      setMessage(
        "Chưa thể mở bản ghi này. Hãy thử một bản ghi khác hoặc nhập lại tệp JSON gốc.",
      );
    }
  }
  useEffect(() => {
    void reload();
    if (selected) void open(selected);
    return () => {
      w.setReplay(null);
    };
  }, [w]);
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 100000000) {
      setMessage("Chọn tệp JSON không quá 100 MB.");
      return;
    }
    try {
      const a = await parseAttempt(await file.text());
      await saveAttempt(a.payload);
      const existing = await annotationsFor(a.payload.id);
      for (const n of a.annotations ?? [])
        if (
          !existing.some(
            (v) => v.at === n.at && v.author === n.author && v.text === n.text,
          )
        )
          await addAnnotation({ ...n, id: undefined });
      await reload();
      await open(a.payload);
      setMessage("Đã nhập bản ghi và kiểm tra tính toàn vẹn.");
    } catch {
      setMessage(
        "Không thể nhập tệp. Kiểm tra bản ghi JSON và dung lượng lưu trữ; dữ liệu hiện có vẫn được giữ.",
      );
    }
  }
  async function exportFile(format: string) {
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
      setMessage("Đã xuất bản ghi.");
    } catch {
      setMessage(
        "Chưa thể xuất. Hãy thử lại và kiểm tra quyền tải xuống của trình duyệt.",
      );
    }
  }
  return (
    <main
      className={`review-page page-enter ${current ? "with-selection" : ""}`}
      id="main-content"
      tabIndex={-1}
    >
      <div className="review-library" ref={libraryRef}>
        <div className="page-heading">
          <span className="eyebrow">NHÌN LẠI ĐỂ TIẾN XA HƠN</span>
          <h1>Xem lại bài bay</h1>
          <p>Mỗi đường bay đều có điều đáng học.</p>
        </div>
        <div className="library-actions">
          <button
            onClick={() => void reload()}
            aria-label="Tải lại danh sách bài bay"
          >
            <Icon name="replay" size={18} /> Tải lại
          </button>
          <label className="file-button">
            Nhập bản ghi
            <input
              aria-label="Nhập bản ghi mô phỏng JSON"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {loading && <p role="status">Đang đọc các bài bay…</p>}
        {!loading && !stored.length && (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="replay" size={34} />
            </span>
            <h2>Đường bay đầu tiên đang chờ bạn</h2>
            <p>Sau khi luyện tập, bản ghi sẽ xuất hiện ở đây để bạn xem lại.</p>
            <button className="primary" onClick={() => navigate("Training")}>
              Bắt đầu luyện tập <Icon name="arrow" size={18} />
            </button>
          </div>
        )}
        <div className="attempt-list">
          {stored.map(({ payload: a }) => (
            <button
              key={a.id}
              aria-pressed={selected?.id === a.id}
              onClick={() => void open(a)}
            >
              <span className="attempt-icon">
                <Icon name="drone" />
              </span>
              <span>
                <b>{vi(a.profile.name)}</b>
                <span>
                  {new Date(a.createdAt).toLocaleString("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <small>
                  {vi(a.status)} ·{" "}
                  {a.frames.length
                    ? `${Math.round(a.frames.at(-1)!.time)} giây`
                    : "Chưa có đường bay"}
                </small>
              </span>
              <Icon name="arrow" size={17} />
            </button>
          ))}
        </div>
        <p className="library-note">
          <span className="status-dot" /> Bản ghi chỉ lưu trên thiết bị này.
          Xuất JSON để giữ một bản sao.
        </p>
      </div>
      {current ? (
        <div className="review-workspace">
          <div className={`replay-window ${replay ? "loaded" : ""}`}>
            <div className="replay-heading">
              <span className="eyebrow">
                {replay ? "PHÁT LẠI BẢN GHI" : "THÔNG TIN BÀI BAY"}
              </span>
              <h2>{vi(current.profile.name)}</h2>
            </div>
            {replay && !replay.attempt.environment && (
              <p className="library-note">Bản ghi cũ: môi trường được tái dựng gần đúng từ dữ liệu đã lưu.</p>
            )}
            {replay && (
              <>
                <div className="replay-views">
                  <select
                    aria-label="Góc quan sát phát lại"
                    value={replay.recordedCamera ? "recorded" : w.cameraMode}
                    onChange={(e) => {
                      if (e.target.value === "recorded") {
                        replay.recordedCamera = true;
                        w.controls.enabled = false;
                      } else {
                        replay.recordedCamera = false;
                        w.setCamera(e.target.value as World["cameraMode"]);
                      }
                      update();
                    }}
                  >
                    <option value="Overview">Toàn cảnh</option>
                    <option value="Top down">Nhìn từ trên</option>
                    <option value="Follow">Theo máy bay</option>
                    <option value="PILOT VLOS">Góc người lái</option>
                    {replay.attempt.frames[0]?.cameraPose && (
                      <option value="recorded">Góc nhìn đã ghi</option>
                    )}
                  </select>
                </div>
                <div className="replay-controls">
                  <label>
                    Thời điểm phát lại{" "}
                    <span>
                      {fixed(replay.time, 1)} /{" "}
                      {fixed(current.frames.at(-1)?.time, 1)} s
                    </span>
                    <input
                      aria-label="Thời điểm phát lại"
                      type="range"
                      min={current.frames[0]?.time ?? 0}
                      max={current.frames.at(-1)?.time ?? 0}
                      step={0.02}
                      value={replay.time}
                      onChange={(e) => {
                        replay.time = +e.target.value;
                        update();
                      }}
                    />
                  </label>
                  <div>
                    <button
                      className="primary"
                      onClick={() => {
                        if (
                          !replay.playing &&
                          replay.time >= (current.frames.at(-1)?.time ?? 0)
                        )
                          replay.time = current.frames[0]?.time ?? 0;
                        replay.playing = !replay.playing;
                        update();
                      }}
                    >
                      <Icon
                        name={replay.playing ? "pause" : "play"}
                        size={17}
                      />
                      {replay.playing ? "Tạm dừng phát lại" : "Phát lại"}
                    </button>
                    <label className="speed-label">
                      Tốc độ
                      <select
                        aria-label="Tốc độ phát lại"
                        value={replay.speed}
                        onChange={(e) => {
                          replay.speed = +e.target.value;
                          update();
                        }}
                      >
                        {[0.25, 0.5, 1, 2, 4].map((v) => (
                          <option key={v} value={v}>
                            {v}×
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>
                      Độ cao{" "}
                      {fixed(
                        replayAt(current.frames, replay.time)?.altitude,
                        1,
                      )}{" "}
                      m
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="review-content">
            <section className="review-summary">
              <div>
                <span className="eyebrow">{vi(current.status)}</span>
                <h2>
                  {isFinal(current.status) && current.status === "FINISHED"
                    ? "Một hành trình đã hoàn thành."
                    : "Mỗi lần thử là một bước tiến."}
                </h2>
                <p>
                  {vi(current.candidate)} ·{" "}
                  {current.result.completedTasks.length}/
                  {current.profile.tasks.length} phần đã hoàn thành
                </p>
              </div>
              <div className="score">
                <strong>{fixed(current.result.practiceScore, 0)}</strong>
                <span>/100 · điểm luyện tập</span>
              </div>
            </section>
            <div className="review-analysis">
              <section className="settings-section">
                <h2>Đường bay của bạn</h2>
                <TraceMap attempt={current} at={at} />
                <p className="muted">
                  Nét xanh đứt: đường mẫu · Nét cam: đường đã bay
                </p>
                <dl className="result-metrics">
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
                    <dt>Lệch điểm hạ cánh</dt>
                    <dd>
                      {current.result.landingError === null
                        ? "Chưa ghi nhận"
                        : fixed(current.result.landingError) + " m"}
                    </dd>
                  </div>
                </dl>
              </section>
              <TelemetryPlots attempt={current} at={at} />
            </div>
            <details className="settings-section">
              <summary>
                Ghi chú của bạn {notes.length ? `(${notes.length})` : ""}
              </summary>
              <label>
                Nội dung ghi chú
                <textarea
                  aria-label="Nội dung ghi chú"
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Bạn muốn cải thiện điều gì ở lần bay sau?"
                />
              </label>
              <button
                disabled={!note.trim()}
                onClick={() =>
                  void (async () => {
                    try {
                      await addAnnotation({
                        attemptId: current.id,
                        author: "Bạn",
                        at,
                        createdAt: "",
                        kind: "NOTE",
                        text: note,
                      });
                      setNotes(await annotationsFor(current.id));
                      setNote("");
                      setMessage("Đã lưu ghi chú.");
                    } catch {
                      setMessage("Chưa lưu được ghi chú. Hãy thử lại.");
                    }
                  })()
                }
              >
                Lưu ghi chú
              </button>
              {notes.map((n) => (
                <p key={n.id}>
                  {fixed(n.at, 1)} s · {n.author}: {n.text}
                </p>
              ))}
            </details>
            <details className="settings-section">
              <summary>Diễn biến và giới hạn mô phỏng</summary>
              <ol className="event-timeline">
                {current.events.map((e, i) => (
                  <li key={i}>
                    <button
                      disabled={!replay}
                      onClick={() => {
                        if (replay) replay.time = e.time;
                        update();
                      }}
                    >
                      {fixed(e.time, 1)} s
                    </button>
                    <span>
                      {vi(e.code)} · {vi(e.detail)}
                    </span>
                  </li>
                ))}
              </ol>
              <ul>
                {current.result.limitations.map((l) => (
                  <li key={l}>{vi(l)}</li>
                ))}
              </ul>
              <p>
                Điểm chỉ phản ánh bài luyện tập trong mô phỏng, không phải kết
                quả sát hạch chính thức.
              </p>
            </details>
            <div className="export-actions">
              <span>Giữ lại hành trình</span>
              {["JSON", "CSV", "Báo cáo"].map((f) => (
                <button key={f} onClick={() => void exportFile(f)}>
                  Xuất {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        !!stored.length && (
          <div className="review-placeholder">
            <Icon name="replay" size={52} />
            <h2>Chọn một bài để xem lại</h2>
            <p>
              Phát lại đường bay, theo dõi số liệu và ghi chú cho lần tiếp theo.
            </p>
          </div>
        )
      )}
      {message && (
        <p className="inline-feedback review-feedback" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
