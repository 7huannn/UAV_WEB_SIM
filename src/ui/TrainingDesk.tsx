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
import { PILOT_STATION, type PilotStation } from "../training/pilot";
import type { Attempt } from "../training/Session";
import {
  loadAttempts,
  saveAttempt,
  parseAttempt,
  seal,
  download,
  attemptCSV,
  readableReport,
  replayAt,
  addAnnotation,
  annotationsFor,
  isFinal,
  type Annotation,
  type SealedAttempt,
} from "../training/records";
export const workspaces = [
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
      aria-label="Reference route and recorded candidate trace"
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
      name: "Gear altitude (m)",
      series: [{ color: "#456844", values: frames.map((f) => f.altitude) }],
      max: Math.max(6, ...frames.map((f) => f.altitude)),
    },
    {
      name: "Speed (m/s)",
      series: [
        {
          color: "#936044",
          values: frames.map((f) => Math.hypot(...f.velocity)),
        },
      ],
      max: Math.max(3, ...frames.map((f) => Math.hypot(...f.velocity))),
    },
    {
      name: "Lateral deviation (m)",
      series: [{ color: "#6c779b", values: frames.map((f) => f.lateral) }],
      max: Math.max(1, ...frames.map((f) => f.lateral)),
    },
  ];
  return (
    <section className="procedure-card telemetry-plots">
      <h2>Recorded telemetry history</h2>
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
        <p>RC inputs −1…+1 · throttle / yaw / pitch / roll</p>
        <svg
          viewBox="0 0 320 72"
          role="img"
          aria-label="Recorded controller input history"
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
              {k}
            </text>
          ))}
        </svg>
      </div>
      <p className="training-muted">
        Plots sample at most 1000 recorded points for display. JSON/CSV preserve
        every recorded sample. Orange cursor follows replay time.
      </p>
    </section>
  );
}
export function TrainingDesk({
  w,
  t,
  page,
}: {
  w: World | null;
  t: Telemetry;
  page: string;
}) {
  const [, refresh] = useState(0),
    [candidate, setCandidate] = useState(""),
    [profile, setProfile] = useState<ProfileId>("figure-eight"),
    [message, setMessage] = useState(
      "Prepare a manual training attempt. All tolerances are training-only.",
    ),
    [stored, setStored] = useState<SealedAttempt[]>([]),
    [selected, setSelected] = useState<Attempt | null>(null),
    [notes, setNotes] = useState<Annotation[]>([]),
    [author, setAuthor] = useState("Instructor"),
    [note, setNote] = useState(""),
    [noteKind, setNoteKind] = useState<Annotation["kind"]>("NOTE"),
    [draft, setDraft] = useState<ControllerProfile>(mode2()),
    [controllerProfiles, setControllerProfiles] = useState<ControllerProfile[]>(
      [],
    ),
    [station, setStation] = useState<PilotStation>({ ...PILOT_STATION });
  const saveKey = useRef(""),
    lastCheckpoint = useRef(0),
    extremes = useRef<Record<number, { min: number; max: number }>>({});
  const s = w?.session,
    locked = !!s?.locked,
    strict = !!s?.strict;
  const update = () => refresh((n) => n + 1);
  const run = (fn: () => unknown, success?: string) => {
    try {
      const result = fn();
      if (result === false)
        setMessage(
          "Action unavailable. Check the procedure, landed H condition, neutral sticks and controller connection.",
        );
      else if (success) setMessage(success);
      update();
    } catch (e) {
      setMessage(String(e));
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
        `Storage unavailable: ${String(e)}. Export JSON to retain evidence.`,
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
    const key = `${s.attempt.id}:${s.state}`;
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
            setMessage("Attempt saved offline. Human review remains required.");
            void reload();
          }
        })
        .catch((e) => {
          setMessage(`Save failed: ${String(e)}. Export JSON now.`);
        });
    }
  }, [t.time, s?.state]);
  if (!w)
    return (
      <aside className="training-panel">Connecting training system…</aside>
    );
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
    }, "Preflight opened. Checklist acknowledgements are self-reported simulation checks.");
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
          readableReport(current, notes),
          "text/plain",
        );
    } catch (e) {
      setMessage(String(e));
    }
  };
  async function openAttempt(a: Attempt) {
    if (!w) return;
    if (locked) {
      setMessage("Finish or abort the current attempt before replay.");
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
          "No trajectory samples in this attempt. Only procedural metadata can be reviewed.",
        );
      }
      update();
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 100_000_000) {
      setMessage("Import limit is 100 MB.");
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
        "Simulation recording imported and checksum verified. Provenance is self-reported, not a device signature.",
      );
    } catch (e) {
      setMessage(`Import rejected: ${String(e)}`);
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
        className={`training-panel ${flyPage ? "" : "wide-panel"}`}
        aria-label={`${page} workspace`}
      >
        <div className="training-eyebrow">
          UAV PRACTICAL TRAINING <span>LOCAL / OFFLINE</span>
        </div>
        <h1>{page}</h1>
        <p className="training-intro">
          {page === "Mock Examination"
            ? "SIMULATED / PRACTICE EXAMINATION. Manual flight, fixed Pilot VLOS, locked profile and no guidance aids."
            : page === "Training"
              ? "Practise procedures and complete courses from the pilot’s fixed observation station."
              : "Instructor tools and inspectable practice evidence. No official certification."}
        </p>
        {flyPage && (
          <>
            <div className="training-callout">
              Position-stabilized velocity mode. Sticks command body-frame
              movement, climb and yaw rate. Release holds the last target. No
              attitude/rate flight mode.
            </div>
            <fieldset disabled={locked || !!replay}>
              <legend>Attempt setup</legend>
              <label>
                Candidate identifier
                <input
                  aria-label="Candidate identifier"
                  maxLength={80}
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                />
              </label>
              <label>
                Training profile
                <select
                  aria-label="Training profile"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as ProfileId)}
                >
                  {Object.entries(profiles).map(([id, p]) => (
                    <option key={id} value={id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="training-muted">
                {profiles[profile].version} · {rules.version} · TRAINING_ONLY
              </p>
              <button className="training-primary" onClick={begin}>
                Prepare attempt
              </button>
            </fieldset>
            {replay && (
              <button
                onClick={() =>
                  run(() => {
                    w.setReplay(null);
                    setSelected(null);
                    return true;
                  })
                }
              >
                Close replay before flying
              </button>
            )}
            {s && (
              <section className="procedure-card">
                <div className="training-eyebrow">
                  PROCEDURE <b data-testid="exam-state">{s.state}</b>
                </div>
                {s.state === "PREFLIGHT" && (
                  <>
                    {preflight.map((text, i) => (
                      <label className="training-check" key={text}>
                        <input
                          type="checkbox"
                          checked={s.attempt.preflight[i]}
                          onChange={(e) =>
                            run(() => s.check("preflight", i, e.target.checked))
                          }
                        />
                        {text}
                      </label>
                    ))}
                    <button
                      disabled={!s.attempt.preflight.every(Boolean)}
                      onClick={() =>
                        run(
                          () => s.ready(),
                          "Ready. Arm motors, then begin the manual task.",
                        )
                      }
                    >
                      Confirm preflight
                    </button>
                  </>
                )}
                {s.state === "READY" && (
                  <>
                    <button
                      onClick={() =>
                        run(
                          () => w.drone.arm(),
                          "Motors armed; no automatic climb.",
                        )
                      }
                      disabled={t.armed}
                    >
                      Arm for manual flight
                    </button>
                    <button
                      className="training-primary"
                      disabled={!t.armed}
                      onClick={() =>
                        run(
                          () => s.start(w.drone),
                          "Manual task active. R/F climb/descend; WASD body-frame movement; Q/E yaw.",
                        )
                      }
                    >
                      Begin manual task
                    </button>
                  </>
                )}
                {s.state === "ACTIVE" && (
                  <>
                    <h2>{s.task?.label}</h2>
                    <p>
                      Task {s.taskIndex + 1} / {s.attempt.profile.tasks.length}
                    </p>
                    {!strict && (
                      <>
                        <progress
                          max={1}
                          value={
                            s.task?.kind === "route"
                              ? s.pathProgress
                              : Math.min(1, s.dwell / (s.task?.seconds ?? 5))
                          }
                        />
                        <p>
                          Route {Math.round(s.pathProgress * 100)}% · dwell{" "}
                          {fixed(s.dwell, 1)} s
                        </p>
                        <p>
                          Altitude error {fixed(s.altitudeError)} m · lateral{" "}
                          {fixed(s.lateral)} m
                        </p>
                        {s.task?.kind === "orientation" && (
                          <p>
                            Heading target{" "}
                            {[0, 90, 180, -90][s.orientationIndex]}° · error{" "}
                            {fixed(s.headingError, 0)}°
                          </p>
                        )}
                      </>
                    )}
                    {s.task?.kind === "abnormal" && (
                      <button
                        onClick={() =>
                          run(
                            () => s.acknowledgeAbnormal(),
                            "Recovery plan acknowledged for instructor review. Return to H and land manually.",
                          )
                        }
                      >
                        Acknowledge abnormal briefing & recovery plan
                      </button>
                    )}
                  </>
                )}
                {s.state === "TASK_COMPLETE" && (
                  <>
                    <p>
                      Flight tasks observed. Return to H and descend manually
                      using F / throttle down.
                    </p>
                    <button
                      className="training-primary"
                      onClick={() =>
                        run(
                          () => s.requestLanding(),
                          "Landing phase: manual descent, then disarm at ground contact.",
                        )
                      }
                    >
                      Begin manual landing
                    </button>
                  </>
                )}
                {s.state === "LANDING" && (
                  <p>
                    Descend over H. Disarm only after stable ground contact.
                    Motors must stop before postflight.
                  </p>
                )}
                {s.state === "POSTFLIGHT" && (
                  <>
                    {postflight.map((text, i) => (
                      <label className="training-check" key={text}>
                        <input
                          type="checkbox"
                          checked={s.attempt.postflight[i]}
                          onChange={(e) =>
                            run(() =>
                              s.check("postflight", i, e.target.checked),
                            )
                          }
                        />
                        {text}
                      </label>
                    ))}
                    <button
                      className="training-primary"
                      disabled={!s.attempt.postflight.every(Boolean)}
                      onClick={() =>
                        run(
                          () => s.finish(),
                          "Practice completed; human review required. No official pass awarded.",
                        )
                      }
                    >
                      Finish practice & save
                    </button>
                  </>
                )}
                {s.active && s.state !== "PREFLIGHT" && (
                  <div className="training-actions">
                    <button
                      onClick={() => run(() => s.pause(w.drone))}
                      disabled={s.state === "READY"}
                    >
                      {s.state === "PAUSED"
                        ? "Resume attempt"
                        : "Pause attempt"}
                    </button>
                    <button
                      onClick={() =>
                        run(() => {
                          s.abort();
                          w.drone.hold();
                          w.drone.paused = false;
                          return true;
                        })
                      }
                    >
                      Abort attempt
                    </button>
                  </div>
                )}
                {s.state === "PREFLIGHT" && (
                  <button onClick={() => run(() => s.abort())}>
                    Cancel preflight
                  </button>
                )}
                {isFinal(s.state) && (
                  <div className="training-result">
                    <h2>{s.attempt.result.decision.replaceAll("_", " ")}</h2>
                    <p>
                      Practice score {fixed(s.attempt.result.practiceScore, 1)}{" "}
                      / 100
                    </p>
                    <p>
                      Completed {s.attempt.result.completedTasks.length} tasks.
                      Landing alone does not establish competence.
                    </p>
                  </div>
                )}
              </section>
            )}
            <div className="training-actions">
              <button
                onClick={() =>
                  run(
                    () => w.drone.disarm(),
                    "Thrust removed. Use only on ground or as an intentional emergency action.",
                  )
                }
                disabled={!t.armed}
              >
                Disarm
              </button>
              <button
                disabled={locked}
                onClick={() =>
                  run(() => {
                    w.setReplay(null);
                    w.drone.reset();
                    w.session = null;
                    setSelected(null);
                    return true;
                  }, "Aircraft reset at H for a new attempt.")
                }
              >
                Reset at H
              </button>
            </div>
            {!strict && (
              <>
                <label className="training-check">
                  <input
                    type="checkbox"
                    checked={w.routeVisible}
                    onChange={(e) =>
                      run(() => {
                        w.setRoute(e.target.checked);
                      })
                    }
                  />
                  Training guidance: reference route & candidate trace
                </label>
                <p className="training-muted">
                  Guidance is optional in training; prohibited in mock
                  examination.
                </p>
              </>
            )}
            <div className="training-keyboard">
              <b>Manual input</b>
              <p>
                W/S forward/back · A/D left/right
                <br />
                R/F climb/descend · Q/E yaw · Space pause
              </p>
              <p>
                Click the scene to focus. Text entry neutralizes input and
                interrupts active attempts. Drag the scene to turn your head;
                wheel does not magnify Pilot VLOS.
              </p>
            </div>
          </>
        )}
        {page === "Controller Calibration" && (
          <>
            <div className="training-callout">
              Browser Gamepad API only. Connect USB/RC simulator adapter, then
              press a controller button. Hardware compatibility and latency are
              UNVERIFIED. No direct WebUSB aircraft control.
            </div>
            <fieldset disabled={locked}>
              <legend>Input source</legend>
              <label>
                Source
                <select
                  aria-label="Input source"
                  value={w.input.source}
                  onChange={(e) =>
                    run(() => {
                      w.input.source = e.target.value as "Keyboard" | "Gamepad";
                    })
                  }
                >
                  <option>Keyboard</option>
                  <option>Gamepad</option>
                </select>
              </label>
              <label>
                Browser gamepad slot
                <input
                  aria-label="Gamepad slot"
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
                {w.input.connected ? "Connected" : "Disconnected"} ·{" "}
                {w.input.device}
              </p>
              <p>{w.input.fault}</p>
            </fieldset>
            <div className="rc-bars">
              {channels.map((k) => (
                <div key={k}>
                  <span>{k}</span>
                  <meter min={-1} max={1} value={w.input.value[k]} />
                  <b>{fixed(w.input.value[k])}</b>
                </div>
              ))}
            </div>
            <p className="training-muted">
              Mode 2: left stick climb/yaw; right stick pitch/roll. Centered
              climb demand, not raw motor throttle. Inspect all channels;
              browser axis order is device-dependent.
            </p>
            <fieldset disabled={locked}>
              <legend>Mapping & calibration</legend>
              {controllerProfiles.length > 0 && (
                <label>
                  Saved mappings
                  <select
                    aria-label="Saved controller profiles"
                    value=""
                    onChange={(e) => {
                      const p = controllerProfiles[+e.target.value];
                      if (p) setDraft(JSON.parse(JSON.stringify(p)));
                    }}
                  >
                    <option value="" disabled>
                      Load a saved mapping…
                    </option>
                    {controllerProfiles.map((p, i) => (
                      <option key={i} value={i}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Profile name
                <input
                  aria-label="Controller profile name"
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
                      {k.toUpperCase()} · raw {fixed(w.input.raw[a.axis])}
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
                          {key}
                          <input
                            aria-label={`${k} ${key}`}
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
                          aria-label={`${k} inverted`}
                          type="checkbox"
                          checked={a.inverted}
                          onChange={(e) =>
                            axisUpdate(k, "inverted", e.target.checked)
                          }
                        />
                        Invert
                      </label>
                    </div>
                    <div className="training-actions">
                      <button
                        disabled={!w.input.raw.length}
                        onClick={() =>
                          axisUpdate(k, "center", w.input.raw[a.axis] ?? 0)
                        }
                      >
                        Capture center
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
                        Use observed range
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
                      "Range observations cleared. Sweep all axes, then capture center and range.",
                    );
                  }}
                >
                  Restart range sweep
                </button>
                <button onClick={() => setDraft(mode2())}>
                  Mode 2 defaults
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
                    }, "Mapping saved locally. Physical controller validation remains required.")
                  }
                >
                  Save controller profile
                </button>
              </div>
            </fieldset>
            <p className="training-muted">
              Raw axes: {JSON.stringify(w.input.raw)}
              <br />
              Buttons: {JSON.stringify(w.input.buttons)}
            </p>
          </>
        )}
        {page === "Examination Profiles" && (
          <>
            {Object.values(profiles).map((p) => (
              <section className="procedure-card" key={p.id}>
                <h2>
                  {p.name} · v{p.version}
                </h2>
                <p className="training-tag">
                  TRAINING_ONLY · OFFICIAL APPLICABILITY UNVERIFIED
                </p>
                <ol>
                  {p.tasks.map((task) => (
                    <li key={task.id}>{task.label}</li>
                  ))}
                  <li>Manual return, descent, disarm and postflight</li>
                </ol>
                <p>
                  Preflight and postflight required. Human review required.
                  Reference missions do not count as candidate evidence.
                </p>
              </section>
            ))}
            <details open>
              <summary>Versioned rule configuration</summary>
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
              Source register: docs/UAV_EXAMINATION_STANDARDS_RESEARCH.md. No
              official Vietnamese profile is enabled. Changes require a new
              version and preserve existing attempt snapshots.
            </p>
          </>
        )}
        {page === "Instructor" && locked && !strict && (
          <section className="procedure-card">
            <h2>Live instructor controls</h2>
            <div className="training-actions">
              <button onClick={() => run(() => s?.pause(w.drone))}>
                {s?.state === "PAUSED"
                  ? "Resume live attempt"
                  : "Pause live attempt"}
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
                End live attempt
              </button>
            </div>
            <p>
              Pause before changing environment. Human judgement is appended
              after the recording is sealed.
            </p>
          </section>
        )}
        {(page === "System Configuration" || page === "Instructor") && (
          <fieldset
            disabled={strict || !!replay || (locked && s?.state !== "PAUSED")}
          >
            <legend>Training environment</legend>
            <label>
              Weather scenario
              <select
                aria-label="Training weather preset"
                value={w.weather.preset}
                onChange={(e) =>
                  run(() => {
                    w.weather.setPreset(e.target.value as Preset);
                    s?.event("WEATHER_CHANGE", e.target.value);
                  })
                }
              >
                {Object.keys(presets).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            {(
              [
                ["wind", 0, 15, 0.1, "m/s"],
                ["gust", 0, 7, 0.1, "m/s"],
                ["turbulence", 0, 1, 0.05, "normalized"],
              ] as const
            ).map(([key, min, max, step, unit]) => (
              <label key={key}>
                {key} · {unit}
                <input
                  type="range"
                  aria-label={`Training ${key}`}
                  min={min}
                  max={max}
                  step={step}
                  value={w.weather.target[key]}
                  onChange={(e) =>
                    run(() => {
                      w.weather.target[key] = +e.target.value;
                      s?.event("WEATHER_CHANGE", `${key}=${e.target.value}`);
                    })
                  }
                />
                {fixed(w.weather.target[key])}
              </label>
            ))}
            <p className="training-muted">
              Shared wind acts on dynamics. Mock attempt conditions lock at
              preparation. Physical weather equivalence is unverified.
            </p>
          </fieldset>
        )}
        {page === "System Configuration" && (
          <>
            <div className="training-callout">
              Pilot station is provisional. H is the aircraft landing location.
              The diagram does not designate a pilot station. These controls do
              not make the coordinates official.
            </div>
            <fieldset disabled={locked}>
              <legend>PILOT_STATION · engineering assumption</legend>
              {(
                [
                  ["x", -30, 30, 0.1],
                  ["z", -21, 21, 0.1],
                  ["groundY", -0.1, 0.1, 0.005],
                  ["eyeHeight", 1, 2.2, 0.01],
                  ["verticalFov", 35, 80, 1],
                ] as const
              ).map(([key, min, max, step]) => (
                <label key={key}>
                  {key}
                  <input
                    aria-label={`Pilot ${key}`}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={station[key]}
                    onChange={(e) =>
                      setStation({ ...station, [key]: +e.target.value })
                    }
                  />
                </label>
              ))}
              <button
                className="training-primary"
                onClick={() =>
                  run(
                    () => w.configureStation(station),
                    "Provisional station saved. Validate against authority/site evidence before field use.",
                  )
                }
              >
                Save provisional station
              </button>
            </fieldset>
            <p>Source: {w.pilotStation.source}</p>
            <p>Confidence: {w.pilotStation.confidence}</p>
            <p>Verification: {w.pilotStation.verification}</p>
            <p>
              Vertical FOV {w.pilotStation.verticalFov}° · horizontal FOV{" "}
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
              ° at current aspect. Aircraft stays at real metre scale. Screen
              size, viewing distance and acuity require validation.
            </p>
            <label>
              Graphics quality
              <select
                aria-label="Training graphics quality"
                value={w.quality}
                onChange={(e) =>
                  run(() => w.setQuality(e.target.value as World["quality"]))
                }
              >
                {["Low", "Medium", "High", "Ultra"].map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </label>
            <p className="training-muted">
              {w.stats.gpu}. Observed {w.stats.fps} FPS, {w.stats.physicsHz}{" "}
              actual steps / wall second. No hardware 60 FPS claim.
            </p>
            <details>
              <summary>Read-only field telemetry boundary</summary>
              <p>
                Only sealed simulator JSON can currently be imported. Future
                aircraft logs require units/frame transform, survey reference,
                clock offset/uncertainty, aircraft configuration, source hash
                and signature status. No command transmission, arming or
                aircraft takeoff integration exists.
              </p>
            </details>
          </>
        )}
        {(page === "Instructor" || page === "Session Review") && (
          <>
            <div className="training-actions">
              <button onClick={() => void reload()}>
                Refresh saved attempts
              </button>
              <label className="file-button">
                Import simulation JSON
                <input
                  aria-label="Import simulation JSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void importFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {stored.length === 0 && (
              <p>
                No saved attempts yet. Training records are checkpointed offline
                and sealed at completion or abort.
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
                    {a.payload.candidate} · {a.payload.profile.name}
                  </b>
                  <span>
                    {a.payload.status} ·{" "}
                    {new Date(a.payload.createdAt).toLocaleString()}
                  </span>
                  <small>{a.sha256.slice(0, 16)}…</small>
                </button>
              ))}
            </div>
            {locked && (
              <p>
                Live attempt: {s?.state}.{" "}
                {strict
                  ? "Instructor aids locked during mock examination."
                  : "Live metrics and trace are available below; automation remains disabled."}
              </p>
            )}
            {current && (
              <>
                <section className="procedure-card">
                  <h2>
                    {current.candidate} · {current.profile.name}
                  </h2>
                  <p>
                    {current.status} · {current.result.decision}
                  </p>
                  <p className="training-tag">
                    SIMULATED / PRACTICE EXAMINATION
                  </p>
                  <TraceMap
                    attempt={current}
                    at={replay?.time ?? current.frames.at(-1)?.time ?? 0}
                  />
                  <p className="training-muted">
                    Green dashed: reference / orange: actual recorded 3D
                    trajectory projected into plan
                  </p>
                  <dl className="result-metrics">
                    <div>
                      <dt>Practice score</dt>
                      <dd>{fixed(current.result.practiceScore, 1)} / 100</dd>
                    </div>
                    <div>
                      <dt>Max lateral error</dt>
                      <dd>{fixed(current.result.maxLateral)} m</dd>
                    </div>
                    <div>
                      <dt>Max altitude error</dt>
                      <dd>{fixed(current.result.maxAltitudeError)} m</dd>
                    </div>
                    <div>
                      <dt>Max speed</dt>
                      <dd>{fixed(current.result.maxSpeed)} m/s</dd>
                    </div>
                    <div>
                      <dt>Landing error</dt>
                      <dd>
                        {current.result.landingError === null
                          ? "Not observed"
                          : fixed(current.result.landingError) + " m"}
                      </dd>
                    </div>
                    <div>
                      <dt>Completed tasks</dt>
                      <dd>
                        {current.result.completedTasks.join(", ") || "None"}
                      </dd>
                    </div>
                    <div>
                      <dt>Missed route gates</dt>
                      <dd>{current.result.missedRouteGates}</dd>
                    </div>
                  </dl>
                  <p>
                    Violations (seconds):{" "}
                    {JSON.stringify(current.result.violations)}
                  </p>
                  <p>
                    Provenance: {current.rules.status} · {current.rules.source}
                  </p>
                  {!isFinal(current.status) && (
                    <p className="training-callout">
                      Interrupted checkpoint / in-progress evidence. This is not
                      a completed attempt and cannot establish a pass.
                    </p>
                  )}
                </section>
                {replay && (
                  <section className="procedure-card">
                    <h2>Recorded-state replay</h2>
                    <label>
                      Simulation time {fixed(replay.time, 2)} s
                      <input
                        aria-label="Replay time"
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
                        {replay.playing ? "Pause replay" : "Play replay"}
                      </button>
                      <select
                        aria-label="Replay speed"
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
                        Recorded camera
                      </button>
                      <button onClick={() => run(() => w.setReplay(null))}>
                        Close replay
                      </button>
                    </div>
                    {frame && (
                      <>
                        <p>
                          Task {frame.task} · {frame.state} · recorded{" "}
                          {frame.camera}
                        </p>
                        <p>
                          XYZ {frame.position.map((n) => fixed(n)).join(" / ")}{" "}
                          m<br />
                          Altitude {fixed(frame.altitude)} m · speed{" "}
                          {fixed(Math.hypot(...frame.velocity))} m/s
                          <br />
                          Lateral {fixed(frame.lateral)} m · heading error{" "}
                          {fixed(frame.headingError, 1)}°
                        </p>
                        <div className="rc-bars">
                          {channels.map((k) => (
                            <div key={k}>
                              <span>{k}</span>
                              <meter min={-1} max={1} value={frame.rc[k]} />
                              <b>{fixed(frame.rc[k])}</b>
                            </div>
                          ))}
                        </div>
                        <p>
                          Motors{" "}
                          {frame.motors.map((n) => fixed(n, 0)).join(" / ")}{" "}
                          rad/s
                          <br />
                          Wind {frame.wind.map((n) => fixed(n)).join(" / ")} m/s
                        </p>
                      </>
                    )}
                  </section>
                )}
                <TelemetryPlots
                  attempt={current}
                  at={replay?.time ?? current.frames.at(-1)?.time ?? 0}
                />
                <section className="procedure-card">
                  <h2>Append instructor review</h2>
                  <label>
                    Reviewer
                    <input
                      aria-label="Reviewer"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Review kind
                    <select
                      aria-label="Review kind"
                      value={noteKind}
                      onChange={(e) =>
                        setNoteKind(e.target.value as Annotation["kind"])
                      }
                    >
                      <option value="NOTE">Time-stamped annotation</option>
                      <option value="PRACTICE_REVIEW">
                        Human practice assessment
                      </option>
                    </select>
                  </label>
                  <label>
                    Observation / decision
                    <textarea
                      aria-label="Instructor annotation"
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
                            "Review appended separately. Original recording unchanged.",
                          );
                        } catch (e) {
                          setMessage(String(e));
                        }
                      })()
                    }
                  >
                    Append review
                  </button>
                  {notes.map((n) => (
                    <p key={n.id}>
                      {fixed(n.at)}s · {n.author} · {n.kind}: {n.text}
                    </p>
                  ))}
                </section>
                <details className="procedure-card" open>
                  <summary>Task / violation timeline</summary>
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
                        <b>{e.code}</b> {e.detail}
                      </li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary>Limitations & evidence provenance</summary>
                  <ul>
                    {current.result.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <p>
                    SHA-256 detects accidental modification; local files are not
                    authenticated aircraft evidence or secure official exam
                    records.
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
                Export {f}
              </button>
            ))}
          </div>
        )}
        <p className="training-notice" role="status" aria-live="polite">
          {message}
        </p>
      </aside>
      <div className="training-scene-tools">
        <span className="training-scene-label">
          {strict
            ? "SIMULATED / PRACTICE EXAMINATION · VLOS LOCKED"
            : replay
              ? "INSTRUCTOR · RECORDED STATE REPLAY"
              : "PILOT TRAINING · SIMULATION"}
        </span>
        <div className="training-camera-buttons">
          {views
            .filter((v) => !strict || v === "PILOT VLOS")
            .map((v) => (
              <button
                key={v}
                className={
                  !w.replay?.recordedCamera && w.cameraMode === v
                    ? "active"
                    : ""
                }
                onClick={() => run(() => w.setCamera(v))}
              >
                {v}
              </button>
            ))}
        </div>
        {w.cameraMode === "PILOT VLOS" && (
          <p>
            Fixed eye {fixed(w.pilotStation.x, 1)},{" "}
            {fixed(w.pilotStation.groundY + w.pilotStation.eyeHeight)},{" "}
            {fixed(w.pilotStation.z, 1)} m · {w.pilotStation.verticalFov}°
            vertical FOV · PROVISIONAL station
            <br />
            Drag to turn your head. No orbit, tracking or zoom.
          </p>
        )}
      </div>
      <div className="training-scene-status">
        <b>
          {frame ? `REPLAY · ${frame.state}` : (s?.state ?? "READY TO PREPARE")}
        </b>
        <span>
          {strict
            ? (s?.task?.label ?? "Complete procedures")
            : `Gear altitude ${fixed(frame?.altitude ?? t.altitude)} m · ${frame?.flightMode ?? t.mode}`}
        </span>
        <small>
          {w.input.source} ·{" "}
          {strict ? "Guidance OFF" : "Manual body-frame velocity"}
        </small>
      </div>
    </>
  );
}
