import { Quaternion, Vector3 } from "three";
import type { Attempt, Frame } from "./Session";
import { channels, validController } from "./input";
import { rules } from "./profiles";
import { validStation } from "./pilot";
export type Annotation = {
  id?: number;
  attemptId: string;
  author: string;
  at: number;
  createdAt: string;
  kind: "NOTE" | "PRACTICE_REVIEW";
  text: string;
};
export type SealedAttempt = {
  format: "UAV_ARENA_ATTEMPT_V1";
  sha256: string;
  payload: Attempt;
  annotations?: Annotation[];
};
export const isFinal = (s: string) =>
  ["FINISHED", "ABORTED", "DISQUALIFIED", "INCOMPLETE"].includes(s);
export async function seal(payload: Attempt): Promise<SealedAttempt> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return {
    format: "UAV_ARENA_ATTEMPT_V1",
    sha256: [...new Uint8Array(digest)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join(""),
    payload: JSON.parse(JSON.stringify(payload)),
  };
}
const finiteArray = (a: unknown, n: number) =>
  Array.isArray(a) &&
  a.length === n &&
  a.every((x) => typeof x === "number" && Number.isFinite(x));
const textValue = (s: unknown, max = 2000) =>
  typeof s === "string" && s.length <= max;
const stringList = (a: unknown) =>
  Array.isArray(a) && a.length < 1000 && a.every((v) => textValue(v));
const states = [
  "NOT_STARTED",
  "PREFLIGHT",
  "READY",
  "ACTIVE",
  "TASK_COMPLETE",
  "LANDING",
  "POSTFLIGHT",
  "FINISHED",
  "PAUSED",
  "ABORTED",
  "DISQUALIFIED",
  "INCOMPLETE",
];
const weatherKeys = [
  "wind",
  "direction",
  "gust",
  "turbulence",
  "cloud",
  "rain",
  "visibility",
  "timeOfDay",
] as const;
const validWeather = (w: unknown) => {
  if (!w || typeof w !== "object") return false;
  const v = w as Record<string, number>;
  return (
    weatherKeys.every(
      (k) => typeof v[k] === "number" && Number.isFinite(v[k]),
    ) &&
    v.wind >= 0 &&
    v.wind <= 30 &&
    v.gust >= 0 &&
    v.gust <= 20 &&
    v.turbulence >= 0 &&
    v.turbulence <= 5 &&
    v.cloud >= 0 &&
    v.cloud <= 1 &&
    v.rain >= 0 &&
    v.rain <= 1 &&
    v.visibility > 0 &&
    v.visibility <= 100000 &&
    v.timeOfDay >= 0 &&
    v.timeOfDay <= 24
  );
};
export function validateAttempt(a: Attempt) {
  if (
    !a ||
    a.schema !== 1 ||
    !textValue(a.softwareVersion, 100) ||
    a.geometry?.concrete?.length !== 45 ||
    a.geometry?.concrete?.width !== 27 ||
    !textValue(a.geometry?.reference?.image, 500) ||
    !finiteArray(a.geometry?.reference?.pixelBounds, 4) ||
    !validWeather(a.initialWeather) ||
    a.origin !== "SIMULATION" ||
    typeof a.id !== "string" ||
    a.id.length > 100 ||
    typeof a.candidate !== "string" ||
    a.candidate.length > 80 ||
    !Array.isArray(a.frames) ||
    a.frames.length > 30001 ||
    !Array.isArray(a.events) ||
    a.events.length > 20000 ||
    !a.referencePaths ||
    typeof a.referencePaths !== "object" ||
    !Object.values(a.referencePaths).every(
      (points) =>
        Array.isArray(points) &&
        points.length >= 2 &&
        points.length <= 5000 &&
        points.every((p) => finiteArray(p, 2)),
    ) ||
    !a.profile?.tasks?.length ||
    a.profile.tasks.length > 50 ||
    !validController(a.controller?.profile) ||
    !validStation(a.pilotStation) ||
    a.fixedDt !== 0.004 ||
    a.recordEverySteps !== 5 ||
    !a.rules ||
    a.rules.status !== "TRAINING_ONLY" ||
    !a.result ||
    !Array.isArray(a.result.limitations) ||
    !Array.isArray(a.result.completedTasks) ||
    !Array.isArray(a.preflight) ||
    !Array.isArray(a.postflight)
  )
    throw Error("Unsupported or malformed simulation attempt");
  if (
    a.profile.tasks.some(
      (t) =>
        !t ||
        typeof t.id !== "string" ||
        typeof t.label !== "string" ||
        !["takeoff", "hover", "orientation", "route", "abnormal"].includes(
          t.kind,
        ),
    )
  )
    throw Error("Invalid task profile");
  if (
    !states.includes(a.status) ||
    !["Training", "Mock Examination"].includes(a.mode) ||
    !textValue(a.createdAt, 100) ||
    !Number.isFinite(Date.parse(a.createdAt)) ||
    !textValue(a.profile.name, 200) ||
    !textValue(a.profile.id, 100) ||
    !textValue(a.profile.version, 100) ||
    !textValue(a.flightMode) ||
    !textValue(a.controller.device) ||
    !["Keyboard", "Gamepad"].includes(a.controller.source) ||
    !Number.isFinite(a.weatherSeed) ||
    !Number.isFinite(a.droppedSimulationSeconds) ||
    !a.aircraft ||
    !Number.isFinite(a.aircraft.mass)
  )
    throw Error("Invalid attempt metadata");
  if (
    !Object.entries(rules).every(([key, value]) =>
      typeof value === "number"
        ? Number.isFinite((a.rules as unknown as Record<string, number>)[key])
        : textValue((a.rules as unknown as Record<string, unknown>)[key]),
    ) ||
    a.preflight.some((v) => typeof v !== "boolean") ||
    a.postflight.some((v) => typeof v !== "boolean")
  )
    throw Error("Invalid rules or procedure evidence");
  const result = a.result;
  if (
    !textValue(result.decision) ||
    !stringList(result.limitations) ||
    !stringList(result.completedTasks) ||
    ![
      result.practiceScore,
      result.maxLateral,
      result.maxAltitudeError,
      result.maxSpeed,
      result.missedRouteGates,
    ].every(Number.isFinite) ||
    result.practiceScore < 0 ||
    result.practiceScore > 100 ||
    !(result.landingError === null || Number.isFinite(result.landingError)) ||
    !result.violations ||
    typeof result.violations !== "object" ||
    !Object.values(result.violations).every((v) => Number.isFinite(v) && v >= 0)
  )
    throw Error("Invalid result evidence");
  if (
    a.profile.tasks.some(
      (t) => t.kind === "route" && !Object.hasOwn(a.referencePaths, t.id),
    )
  )
    throw Error("Missing locked reference path");
  let last = -1;
  for (const f of a.frames) {
    if (
      !f ||
      !Number.isFinite(f.time) ||
      !Number.isFinite(f.wetness) ||
      (f.cameraPose !== undefined &&
        (!finiteArray(f.cameraPose.position, 3) ||
          !finiteArray(f.cameraPose.orientation, 4) ||
          !Number.isFinite(f.cameraPose.verticalFov) ||
          f.cameraPose.verticalFov < 1 ||
          f.cameraPose.verticalFov > 179)) ||
      f.time <= last ||
      !finiteArray(f.position, 3) ||
      !finiteArray(f.orientation, 4) ||
      !finiteArray(f.velocity, 3) ||
      !finiteArray(f.rates, 3) ||
      !finiteArray(f.motors, 4) ||
      !finiteArray(f.thrust, 4) ||
      !finiteArray(f.wind, 3) ||
      !Array.isArray(f.raw) ||
      f.raw.length > 32 ||
      !f.raw.every(Number.isFinite) ||
      !channels.every(
        (k) => Number.isFinite(f.rc?.[k]) && Math.abs(f.rc[k]) <= 1,
      ) ||
      ![
        f.altitude,
        f.lateral,
        f.altitudeError,
        f.heading,
        f.headingError,
        f.progress,
      ].every(Number.isFinite) ||
      !validWeather(f.weather) ||
      !Array.isArray(f.violations) ||
      typeof f.task !== "string" ||
      typeof f.camera !== "string" ||
      !states.includes(f.state) ||
      !["Training", "Mock Examination"].includes(f.operatingMode) ||
      !textValue(f.flightMode, 100) ||
      !textValue(f.device) ||
      !textValue(f.inputSource, 100) ||
      typeof f.focused !== "boolean" ||
      !stringList(f.violations)
    )
      throw Error("Invalid or non-monotonic frame data");
    const norm = Math.hypot(...f.orientation);
    if (Math.abs(norm - 1) > 0.01) throw Error("Invalid quaternion");
    last = f.time;
  }
  if (
    a.events.some(
      (e) =>
        !Number.isFinite(e.time) ||
        e.time < 0 ||
        typeof e.code !== "string" ||
        typeof e.detail !== "string" ||
        e.detail.length > 1000,
    )
  )
    throw Error("Invalid event data");
  return a;
}
export async function parseAttempt(text: string) {
  if (text.length > 100_000_000)
    throw Error("Attempt exceeds 100 MB import limit");
  const e = JSON.parse(text) as SealedAttempt;
  if (e.format !== "UAV_ARENA_ATTEMPT_V1" || typeof e.sha256 !== "string")
    throw Error(
      "Import a sealed UAV Arena simulation JSON, not an aircraft log",
    );
  validateAttempt(e.payload);
  if (
    e.annotations !== undefined &&
    (!Array.isArray(e.annotations) ||
      e.annotations.length > 10000 ||
      e.annotations.some(
        (n) =>
          !n ||
          n.attemptId !== e.payload.id ||
          !textValue(n.author, 80) ||
          !textValue(n.text, 2000) ||
          !Number.isFinite(n.at) ||
          n.at < 0 ||
          !["NOTE", "PRACTICE_REVIEW"].includes(n.kind),
      ))
  )
    throw Error("Invalid appended annotations");
  if ((await seal(e.payload)).sha256 !== e.sha256)
    throw Error("Integrity check failed: recording has changed");
  return e;
}
export function replayAt(frames: Frame[], time: number): Frame | null {
  if (!frames.length) return null;
  let lo = 0,
    hi = frames.length - 1;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2);
    if (frames[m].time <= time) lo = m;
    else hi = m - 1;
  }
  const a = frames[lo],
    b = frames[Math.min(lo + 1, frames.length - 1)],
    t = Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time || 1)));
  return {
    ...a,
    position: new Vector3(...(a.position as [number, number, number]))
      .lerp(new Vector3(...(b.position as [number, number, number])), t)
      .toArray(),
    orientation: new Quaternion(
      ...(a.orientation as [number, number, number, number]),
    )
      .slerp(
        new Quaternion(...(b.orientation as [number, number, number, number])),
        t,
      )
      .toArray(),
    time: a.time + (b.time - a.time) * t,
  };
}
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("uav-arena-training", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("attempts", { keyPath: "payload.id" });
      r.result.createObjectStore("annotations", {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function saveAttempt(attempt: Attempt) {
  const sealed = await seal(attempt),
    db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("attempts", "readwrite"),
        s = tx.objectStore("attempts"),
        r = s.get(attempt.id);
      r.onsuccess = () => {
        const old = r.result as SealedAttempt | undefined;
        if (
          old &&
          isFinal(old.payload.status) &&
          old.sha256 !== sealed.sha256
        ) {
          tx.abort();
          reject(Error("Original finalized attempt is immutable"));
          return;
        }
        s.put(sealed);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? Error("Attempt was not saved"));
    });
  } finally {
    db.close();
  }
}
export async function loadAttempts(): Promise<SealedAttempt[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("attempts").objectStore("attempts").getAll();
      r.onsuccess = () => {
        Promise.all(
          (r.result as SealedAttempt[]).map((row) =>
            parseAttempt(JSON.stringify(row)),
          ),
        ).then(resolve, reject);
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function addAnnotation(a: Annotation) {
  if (
    !a.author.trim() ||
    !a.text.trim() ||
    a.text.length > 2000 ||
    !Number.isFinite(a.at) ||
    a.at < 0
  )
    throw Error("Enter an author, valid time and note (max 2000 characters)");
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("annotations", "readwrite");
      const annotation = {
        ...a,
        author: a.author.slice(0, 80),
        createdAt: new Date().toISOString(),
      };
      // Imported note IDs belong to another database. Let this store allocate its key.
      delete annotation.id;
      tx.objectStore("annotations").add(annotation);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function annotationsFor(id: string): Promise<Annotation[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("annotations")
        .objectStore("annotations")
        .getAll();
      r.onsuccess = () =>
        resolve((r.result as Annotation[]).filter((a) => a.attemptId === id));
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
const csvCell = (s: unknown) => {
  const value =
    typeof s === "string" && /^[=+\-@]/.test(s) ? `'${s}` : String(s ?? "");
  return `"${value.replaceAll('"', '""')}"`;
};
export function attemptCSV(a: Attempt) {
  const header = [
    "sim_s",
    "x_m",
    "y_m",
    "z_m",
    "gear_alt_m",
    "vx_mps",
    "vy_mps",
    "vz_mps",
    "qx",
    "qy",
    "qz",
    "qw",
    "rate_x_rps",
    "rate_y_rps",
    "rate_z_rps",
    "motor1_rads",
    "motor2_rads",
    "motor3_rads",
    "motor4_rads",
    "throttle",
    "yaw",
    "pitch",
    "roll",
    "wind_x",
    "wind_y",
    "wind_z",
    "task",
    "camera",
    "state",
    "lateral_m",
    "altitude_error_m",
    "heading_rad",
    "heading_error_deg",
    "progress",
    "violations",
    "thrust1_n",
    "thrust2_n",
    "thrust3_n",
    "thrust4_n",
    "raw_axes_json",
    "input_source",
    "device",
    "focused",
    "flight_mode",
    "operating_mode",
    "weather_wind_mps",
    "weather_towards_deg",
    "weather_gust_mps",
    "weather_turbulence",
    "cloud_fraction",
    "rain_fraction",
    "visibility_m",
    "time_of_day_h",
    "wetness",
    "camera_pose_json",
  ];
  return [
    header.map(csvCell).join(","),
    ...a.frames.map((f) =>
      [
        f.time,
        ...f.position,
        f.altitude,
        ...f.velocity,
        ...f.orientation,
        ...f.rates,
        ...f.motors,
        ...channels.map((k) => f.rc[k]),
        ...f.wind,
        f.task,
        f.camera,
        f.state,
        f.lateral,
        f.altitudeError,
        f.heading,
        f.headingError,
        f.progress,
        f.violations.join("|"),
        ...f.thrust,
        JSON.stringify(f.raw),
        f.inputSource,
        f.device,
        f.focused,
        f.flightMode,
        f.operatingMode,
        ...[
          "wind",
          "direction",
          "gust",
          "turbulence",
          "cloud",
          "rain",
          "visibility",
          "timeOfDay",
        ].map((k) => f.weather[k as keyof typeof f.weather]),
        f.wetness,
        JSON.stringify(f.cameraPose ?? null),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}
export function readableReport(a: Attempt, notes: Annotation[] = []) {
  return [
    `SIMULATED / PRACTICE EXAMINATION - not a licence or certificate`,
    `Candidate: ${a.candidate}`,
    `Attempt: ${a.id} · ${a.createdAt}`,
    `Software: ${a.softwareVersion} · geometry ${a.geometry.reference.image}`,
    `Status: ${a.status} · ${a.result.decision}`,
    `Profile: ${a.profile.name} ${a.profile.version} · ${a.rules.version}`,
    `Provenance: ${a.rules.status} · ${a.rules.source}`,
    `Flight mode: ${a.flightMode}`,
    `Pilot station: ${JSON.stringify(a.pilotStation)}`,
    `Controller: ${a.controller.source} · ${a.controller.device} · hardware UNVERIFIED`,
    `Physics: ${a.fixedDt}s fixed step · state recording every ${a.recordEverySteps} steps`,
    `Samples: ${a.frames.length} · dropped wall time: ${a.droppedSimulationSeconds.toFixed(3)}s`,
    `Practice score: ${a.result.practiceScore.toFixed(1)}/100 (engineering deduction, NOT official pass/fail)`,
    `Completed tasks: ${a.result.completedTasks.join(", ") || "None"}`,
    `Missing gates at stop: ${a.result.missedRouteGates}`,
    `Max lateral: ${a.result.maxLateral.toFixed(2)}m · max altitude error: ${a.result.maxAltitudeError.toFixed(2)}m · max speed: ${a.result.maxSpeed.toFixed(2)}m/s`,
    `Landing error: ${a.result.landingError === null ? "NOT OBSERVED" : a.result.landingError.toFixed(2) + "m"}`,
    `Rule exceedance seconds: ${JSON.stringify(a.result.violations)}`,
    `Preflight: ${a.preflight.map(Boolean).join(",")} · Postflight: ${a.postflight.map(Boolean).join(",")}`,
    "LIMITATIONS",
    ...a.result.limitations,
    "EVENT TIMELINE",
    ...a.events.map((e) => `${e.time.toFixed(3)}s ${e.code}: ${e.detail}`),
    "APPENDED HUMAN REVIEW (original recording unchanged)",
    ...notes.map((n) => `${n.at.toFixed(2)}s ${n.author} ${n.kind}: ${n.text}`),
  ].join("\n");
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const u = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
// Future aircraft evidence boundary: data in only. No transport, command/arm/takeoff API exists.
export type ExternalLogManifest = {
  origin: "EXTERNAL_READ_ONLY";
  aircraftId: string;
  sourceHash: string;
  units: "m,s,rad";
  frame: "ENU" | "NED" | "LOCAL_XYZ";
  worldFromSource: number[];
  surveyReference: string;
  timeOffsetSeconds: number;
  timeUncertaintySeconds: number;
  configurationEvidence: string;
  hardwareSignatureVerified: boolean;
};
export function validateExternalManifest(m: ExternalLogManifest) {
  return (
    m.origin === "EXTERNAL_READ_ONLY" &&
    finiteArray(m.worldFromSource, 16) &&
    !!m.surveyReference &&
    !!m.configurationEvidence &&
    !!m.sourceHash &&
    Number.isFinite(m.timeOffsetSeconds) &&
    Number.isFinite(m.timeUncertaintySeconds) &&
    m.timeUncertaintySeconds >= 0
  );
}
