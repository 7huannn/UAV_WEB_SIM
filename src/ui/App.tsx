import { useEffect, useRef, useState } from "react";
import {
  World,
  type CameraMode,
  type Quality,
  type WorldStats,
} from "../scene/World";
import { DroneDynamics, type Telemetry } from "../simulation/DroneDynamics";
import {
  Weather,
  presets,
  type Preset,
  type WeatherParams,
} from "../weather/Weather";
import { config, figureEight, routeLength } from "../arena/geometry";
const iconPaths: Record<string, string> = {
  drone:
    "M8 8 4 4m12 4 4-4M8 16l-4 4m12-4 4 4M8 8h8v8H8zM2 4h4M4 2v4m14-2h4m-2-2v4M2 20h4m-2-2v4m14-2h4m-2-2v4",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  cloud: "M6 18h12a4 4 0 0 0 .3-8 6 6 0 0 0-11.6-1A4.5 4.5 0 0 0 6 18",
  wind: "M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3",
  rain: "M6 14h12a4 4 0 0 0 .3-8 6 6 0 0 0-11.6-1A4.5 4.5 0 0 0 6 14m2 3-1 3m6-3-1 3m6-3-1 3",
  chevron: "m7 10 5 5 5-5",
  play: "m9 5 10 7-10 7z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 11a8 8 0 1 1 2 7M4 4v7h7",
  up: "M12 19V5m-6 6 6-6 6 6M4 21h16",
  down: "M12 4v14m-6-6 6 6 6-6M4 21h16",
  target: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v4m0 12v4M2 12h4m12 0h4",
  cube: "m12 2 9 5v10l-9 5-9-5V7zm0 10L3 7m9 5 9-5m-9 5v10",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3m0 3v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
};
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] ?? iconPaths.cube} />
    </svg>
  );
}
const initial = new DroneDynamics(new Weather()).telemetry();
const initialStats: WorldStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  physicsHz: 250,
  gpu: "Connecting WebGL2",
  loading: true,
  error: null,
};
const cameras: CameraMode[] = [
  "Overview",
  "Orbit",
  "Top down",
  "Ground",
  "Follow",
  "FPV",
];
const timeLabel = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const timeOfDay = (t: number) =>
  `${String(Math.floor(t)).padStart(2, "0")}:${String(Math.floor((t % 1) * 60)).padStart(2, "0")}`;
function MiniMap({ t }: { t: Telemetry }) {
  const pts = figureEight()
    .map(([x, z]) => `${(x + 22.5) * 4.5},${(z + 13.5) * 4.5}`)
    .join(" ");
  return (
    <svg
      className="mini-map"
      viewBox="-8 -8 219 138"
      aria-label="Live top-down flight position"
    >
      <rect
        x="0"
        y="0"
        width="202.5"
        height="121.5"
        rx="2"
        fill="#dde2d0"
        stroke="#b9c0ad"
        strokeWidth=".7"
      />
      <path
        d="M18 54V14h171v94H18V67"
        fill="none"
        stroke="#a1ab95"
        strokeWidth=".6"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="#657755"
        strokeDasharray="2 2"
        strokeWidth=".9"
      />
      <circle
        cx="11.25"
        cy="60.75"
        r="6"
        fill="none"
        stroke="#a1ab95"
        strokeWidth=".8"
      />
      <text x="11.25" y="63" textAnchor="middle" fontSize="6" fill="#526044">
        H
      </text>
      <circle
        cx={(t.position[0] + 22.5) * 4.5}
        cy={(t.position[2] + 13.5) * 4.5}
        r="7"
        fill="#e9efac"
        opacity=".6"
      />
      <circle
        cx={(t.position[0] + 22.5) * 4.5}
        cy={(t.position[2] + 13.5) * 4.5}
        r="2.8"
        fill="#344a2d"
        stroke="white"
        strokeWidth="1"
      />
    </svg>
  );
}
function Slider({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span>
        {label}
        <b>
          {value.toFixed(step < 1 ? 1 : 0)}
          <small> {unit}</small>
        </b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}
export default function App() {
  const mount = useRef<HTMLDivElement>(null),
    world = useRef<World | null>(null);
  const [t, setT] = useState(initial),
    [stats, setStats] = useState(initialStats),
    [camera, setCamera] = useState<CameraMode>("Overview"),
    [quality, setQuality] = useState<Quality>("High");
  const [preset, setPreset] = useState<Preset>("Clear skies"),
    [weather, setWeather] = useState<WeatherParams>({
      ...presets["Clear skies"],
    }),
    [weatherExpanded, setWeatherExpanded] = useState(false);
  const [labels, setLabels] = useState(false),
    [route, setRoute] = useState(false),
    [debug, setDebug] = useState(false),
    [tab, setTab] = useState("Flight desk"),
    [dialog, setDialog] = useState<"help" | "reference" | null>(null),
    [notice, setNotice] = useState("Ready when you are.");
  const [constructionError, setConstructionError] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!mount.current) return;
    let w: World;
    try {
      w = new World(mount.current, (telemetry, s) => {
        setT(telemetry);
        setStats(s);
      });
      world.current = w;
      setQuality(w.quality);
      if (w.quality === "Low")
        setNotice("Software rendering detected. Low graphics selected.");
      Object.assign(window, { __UAV__: w });
    } catch (e) {
      setConstructionError(String(e));
      return;
    }
    return () => {
      w.dispose();
      world.current = null;
      delete (window as unknown as Record<string, unknown>).__UAV__;
    };
  }, []);
  useEffect(() => {
    if (!dialog) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dialog]);
  function action(name: string) {
    const d = world.current?.drone;
    if (!d) return;
    switch (name) {
      case "arm":
        d.armed ? d.disarm() : d.arm();
        setNotice(
          d.armed ? "Motors armed. Select Take off." : "Motors disarmed.",
        );
        break;
      case "takeoff":
        d.takeoff();
        setNotice("Climbing to 5 m above the court.");
        break;
      case "land":
        d.land();
        setNotice("Descending for a controlled landing.");
        break;
      case "hold":
        d.hold();
        setNotice("Holding the current position.");
        break;
      case "mission":
        d.mission();
        setRoute(true);
        world.current?.setRoute(true);
        setNotice("Approaching M7, then flying the figure eight at 5 m.");
        break;
      case "mission-pause":
        d.toggleMissionPause();
        setNotice(
          d.missionPaused
            ? "Mission paused. Holding position."
            : "Mission resumed.",
        );
        break;
      case "pause":
        d.paused = !d.paused;
        setNotice(d.paused ? "Simulation paused." : "Simulation resumed.");
        break;
      case "reset":
        d.reset();
        setNotice("Aircraft reset to landing zone H.");
        break;
    }
    setT(d.telemetry());
  }
  function setView(c: CameraMode) {
    setCamera(c);
    world.current?.setCamera(c);
  }
  function changeWeather(p: Preset) {
    setPreset(p);
    world.current?.weather.setPreset(p);
    setWeather({ ...presets[p] });
    setNotice(`${p}. Environment transitions over a few seconds.`);
  }
  function param(k: keyof WeatherParams, v: number) {
    setWeather((w) => ({ ...w, [k]: v }));
    if (world.current) world.current.weather.target[k] = v;
  }
  const disabled = t.mode === "Crashed",
    rain = weather.rain > 0,
    activeMission = t.mode === "Figure eight";
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="UAV Arena home">
          <span className="brand-mark">
            <Icon name="drone" size={26} />
          </span>
          <span>
            UAV<span className="brand-light"> ARENA</span>
            <small>FLIGHT LABORATORY</small>
          </span>
        </a>
        <div className="header-divider" />
        <span className="project-name">
          Outdoor flight environment <span> / </span> Arena 01
        </span>
        <div className="header-right">
          <span className="local-badge">
            <i /> LOCAL SIMULATION
          </span>
          <button
            className="icon-button help-button"
            aria-label="Open controls help"
            onClick={() => setDialog("help")}
          >
            <Icon name="help" />
          </button>
          <button
            className="avatar"
            onClick={() => setDialog("help")}
            aria-label="About the flight laboratory"
          >
            FL
          </button>
        </div>
      </header>
      <aside className="sidebar">
        <div className="section-eyebrow">
          WORKSPACE <span>01</span>
        </div>
        <div className="side-tabs">
          {["Flight desk", "Airframe"].map((v) => (
            <button
              className={tab === v ? "active" : ""}
              key={v}
              onClick={() => setTab(v)}
            >
              {v === "Flight desk" ? (
                <Icon name="target" size={16} />
              ) : (
                <Icon name="drone" size={16} />
              )}{" "}
              {v}
            </button>
          ))}
        </div>
        {tab === "Flight desk" ? (
          <>
            <div className="aircraft-card">
              <div className="aircraft-title">
                <span className="aircraft-glyph">
                  <Icon name="drone" size={28} />
                </span>
                <div>
                  <h2>Quadrotor 15</h2>
                  <p>15 kg · X configuration</p>
                </div>
                <span className={`status-dot ${t.armed ? "armed" : ""}`} />
              </div>
              <div className="aircraft-meta">
                <span>FLIGHT STATE</span>
                <b>{t.mode}</b>
              </div>
            </div>
            <div className="panel-title">
              Flight controls<span>250 Hz</span>
            </div>
            <button
              className={`arm-button ${t.armed ? "is-armed" : ""}`}
              onClick={() => action("arm")}
              disabled={disabled}
            >
              <Icon name="lock" size={16} />
              {t.armed ? "Disarm motors" : "Arm motors"}
              <span>{t.armed ? "ON" : "OFF"}</span>
            </button>
            <div className="flight-grid">
              <button
                onClick={() => action("takeoff")}
                disabled={disabled || t.altitude > 1}
              >
                <Icon name="up" />
                Take off
              </button>
              <button
                onClick={() => action("land")}
                disabled={!t.armed || t.altitude < 0.1}
              >
                <Icon name="down" />
                Land
              </button>
              <button onClick={() => action("hold")} disabled={!t.armed}>
                <Icon name="target" />
                Hold
              </button>
              <button onClick={() => action("reset")}>
                <Icon name="reset" />
                Reset
              </button>
            </div>
            <div className="side-separator" />
            <div className="panel-title">
              Flight mission<span className="tiny-tag">AUTO</span>
            </div>
            <div className="mission-card">
              <div className="mission-name">
                <span className="infinity">∞</span>
                <div>
                  <h3>Figure eight</h3>
                  <p>Reference course · 5 m altitude</p>
                </div>
              </div>
              <MiniMap t={t} />
              <div className="mission-info">
                <span>
                  {routeLength.toFixed(1)} m <small>course</small>
                </span>
                <span>
                  2.1 m/s <small>target</small>
                </span>
              </div>
              <div className="mission-progress">
                <span
                  style={{ width: `${activeMission ? t.progress * 100 : 0}%` }}
                />
              </div>
              <button
                className="mission-button"
                disabled={disabled}
                onClick={() =>
                  action(activeMission ? "mission-pause" : "mission")
                }
              >
                <Icon
                  name={activeMission && !t.missionPaused ? "pause" : "play"}
                  size={15}
                />
                {activeMission
                  ? t.missionPaused
                    ? "Resume mission"
                    : "Pause mission"
                  : "Start mission"}
                <span>
                  {activeMission ? (
                    `${Math.round(t.progress * 100)}%`
                  ) : (
                    <Icon name="arrow" size={15} />
                  )}
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="airframe-spec">
            <Icon name="drone" size={50} />
            <h2>Quadrotor 15</h2>
            <p>Illustrative airframe parameters</p>
            {[
              ["Mass", "15 kg"],
              ["Motor span", "0.96 × 0.96 m"],
              ["Motor response", "45 ms"],
              ["Maximum rotor speed", "7,257 RPM"],
              ["Thrust coefficient", "0.00019 N/(rad/s)²"],
              ["Inertia X / Y / Z", "0.65 / 1.05 / 0.65 kg·m²"],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <b>{b}</b>
              </div>
            ))}
            <p className="model-note">
              6DOF rigid body · four independent motors · cascaded PID.
              Demonstration parameters, awaiting real-aircraft calibration.
            </p>
            <div className="state-detail">
              <span>World position X / Y / Z</span>
              <b>{t.position.map((n) => n.toFixed(2)).join(" / ")} m</b>
              <span>Body rates X / Y / Z</span>
              <b>{t.rates.map((n) => n.toFixed(2)).join(" / ")} rad/s</b>
              <span>Local wind X / Y / Z</span>
              <b>{t.wind.map((n) => n.toFixed(2)).join(" / ")} m/s</b>
            </div>
            <div className="motor-detail">
              {t.rpm.map((v, i) => (
                <p key={i}>
                  M{i + 1}
                  <b>{Math.round(v)} RPM</b>
                  <small>{t.thrust[i].toFixed(1)} N</small>
                </p>
              ))}
            </div>
          </div>
        )}
        <button
          className="mobile-mission mission-button"
          disabled={disabled}
          onClick={() => action(activeMission ? "mission-pause" : "mission")}
        >
          <Icon
            name={activeMission && !t.missionPaused ? "pause" : "play"}
            size={14}
          />
          {activeMission
            ? t.missionPaused
              ? "Resume mission"
              : "Pause mission"
            : "Start mission"}
        </button>
        <div className="side-bottom">
          <button
            className="reference-link"
            onClick={() => setDialog("reference")}
          >
            <Icon name="map" size={16} /> Reference plan{" "}
            <Icon name="arrow" size={15} />
          </button>
          <p>
            <span className="small-dot" /> Fixed-step dynamics <span>v0.1</span>
          </p>
        </div>
      </aside>
      <main className="stage">
        <div ref={mount} className="viewport" />
        <div className="scene-heading">
          <span className="eyebrow">THE COMPETITION FIELD</span>
          <h1>
            Arena 01<span> / </span>
            <small>45 × 27 m</small>
          </h1>
          <div className="scene-subtitle">
            <span className="small-dot" />
            Concrete court · natural grass perimeter
          </div>
        </div>
        <div className="viewport-tools">
          <div className="camera-tabs" role="group" aria-label="Camera views">
            {cameras.map((c) => (
              <button
                className={camera === c ? "active" : ""}
                key={c}
                onClick={() => setView(c)}
              >
                {c === "Overview" && <Icon name="cube" size={14} />} {c}
              </button>
            ))}
          </div>
          <button
            className="icon-button fullscreen-button"
            aria-label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else
                document.documentElement
                  .requestFullscreen()
                  .catch(() =>
                    setNotice("Fullscreen is unavailable in this browser."),
                  );
            }}
          >
            <Icon name="expand" size={17} />
          </button>
        </div>
        <div className="north-indicator">
          <svg viewBox="0 0 42 54" width="35" height="45">
            <text
              x="21"
              y="9"
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
            >
              −Z
            </text>
            <path
              d="m21 17 8 21-8-4-8 4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path d="m21 17 0 17-8 4z" fill="currentColor" opacity=".6" />
          </svg>
        </div>
        <section
          className={`weather-card ${weatherExpanded ? "expanded" : ""}`}
        >
          <button
            className="weather-heading"
            onClick={() => setWeatherExpanded(!weatherExpanded)}
            aria-expanded={weatherExpanded}
          >
            <span className="weather-icon">
              <Icon
                name={rain ? "rain" : weather.cloud > 0.6 ? "cloud" : "sun"}
                size={24}
              />
            </span>
            <div>
              <span>ENVIRONMENT</span>
              <h2>{preset}</h2>
            </div>
            <Icon name="chevron" size={16} />
          </button>
          <label className="select-label">
            <span className="sr-only">Weather preset</span>
            <select
              aria-label="Weather preset"
              value={preset}
              onChange={(e) => changeWeather(e.target.value as Preset)}
            >
              {Object.keys(presets).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <Icon name="chevron" size={13} />
          </label>
          <div className="weather-summary">
            <span title="Local wind at the aircraft, including gusts">
              <Icon name="wind" size={16} />
              <b>{Math.hypot(...t.wind).toFixed(1)}</b> m/s
            </span>
            <span>
              <Icon name="sun" size={15} />
              {timeOfDay(weather.timeOfDay)}
            </span>
          </div>
          {weatherExpanded && (
            <div className="weather-sliders">
              <Slider
                label="Wind speed"
                value={weather.wind}
                unit="m/s"
                min={0}
                max={15}
                step={0.1}
                onChange={(v) => param("wind", v)}
              />
              <Slider
                label="Wind towards · +X = 0°"
                value={weather.direction}
                unit="°"
                min={0}
                max={360}
                onChange={(v) => param("direction", v)}
              />
              <Slider
                label="Gust strength"
                value={weather.gust}
                unit="m/s"
                min={0}
                max={7}
                step={0.1}
                onChange={(v) => param("gust", v)}
              />
              <Slider
                label="Turbulence"
                value={weather.turbulence}
                unit=""
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => param("turbulence", v)}
              />
              <Slider
                label="Cloud cover"
                value={weather.cloud * 100}
                unit="%"
                min={0}
                max={100}
                onChange={(v) => param("cloud", v / 100)}
              />
              <Slider
                label="Rain intensity"
                value={weather.rain * 100}
                unit="%"
                min={0}
                max={100}
                onChange={(v) => param("rain", v / 100)}
              />
              <Slider
                label="Visibility"
                value={weather.visibility}
                unit="m"
                min={60}
                max={800}
                onChange={(v) => param("visibility", v)}
              />
              <Slider
                label="Time of day"
                value={weather.timeOfDay}
                unit="h"
                min={7}
                max={18}
                step={0.1}
                onChange={(v) => param("timeOfDay", v)}
              />
              <p className="weather-footnote">
                Wind acts on the airframe, grass and rain.
                <br />
                Rain intensity is normalized; visual effects only.
              </p>
            </div>
          )}
          <button
            className="tune-button"
            onClick={() => setWeatherExpanded(!weatherExpanded)}
          >
            <Icon name="settings" size={14} />
            {weatherExpanded
              ? "Close environment settings"
              : "Tune environment"}
            <span>{weatherExpanded ? "−" : "+"}</span>
          </button>
        </section>
        <div className="view-settings">
          <Toggle
            label="Flight path"
            checked={route}
            onChange={(v) => {
              setRoute(v);
              world.current?.setRoute(v);
            }}
          />
          <Toggle
            label="Markers"
            checked={labels}
            onChange={(v) => {
              setLabels(v);
              world.current?.setLabels(v);
            }}
          />
          <Toggle
            label="Colliders"
            checked={debug}
            onChange={(v) => {
              setDebug(v);
              world.current?.setDebug(v);
            }}
          />
          <label className="quality-select">
            <span>QUALITY</span>
            <select
              aria-label="Graphics quality"
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value as Quality);
                world.current?.setQuality(e.target.value as Quality);
              }}
            >
              {["Low", "Medium", "High", "Ultra"].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </label>
        </div>
        {camera === "Top down" && (
          <div
            className="scale-bar"
            style={{ width: world.current?.scale10mPixels ?? 100 }}
          >
            <span>10 m</span>
            <i />
          </div>
        )}
        <div className="scene-caption">
          <span>WEBGL 2.0</span>
          <span>LIVE 6DOF SIMULATION</span>
          <span>1 UNIT = 1 METER</span>
        </div>
        <div className="flight-toast" role="status" aria-live="polite">
          <span className="small-dot" />
          {notice}
        </div>
        <section
          className="telemetry-dock"
          aria-label="Live aircraft telemetry"
        >
          <div className="telemetry-live">
            <span>
              <i /> TELEMETRY
            </span>
            <b>{timeLabel(t.time)}</b>
            <small>
              {t.paused
                ? "PAUSED"
                : t.mode === "Crashed"
                  ? "CRASH DETECTED"
                  : t.armed
                    ? "MOTORS ACTIVE"
                    : "STANDING BY"}
            </small>
          </div>
          <div className="metric altitude">
            <span>
              ALTITUDE <Icon name="up" size={12} />
            </span>
            <div>
              {t.altitude.toFixed(2)}
              <small>m</small>
            </div>
            <p>above landing gear contact</p>
          </div>
          <div className="metric">
            <span>GROUND SPEED</span>
            <div>
              {t.groundSpeed.toFixed(2)}
              <small>m/s</small>
            </div>
            <p>
              V/S {t.verticalSpeed >= 0 ? "+" : ""}
              {t.verticalSpeed.toFixed(2)} m/s
            </p>
          </div>
          <div className="metric attitude">
            <span>ATTITUDE</span>
            <div>
              {t.roll.toFixed(1)}
              <small>° R</small>
              <i>/</i>
              {t.pitch.toFixed(1)}
              <small>° P</small>
            </div>
            <p>Yaw {t.yaw.toFixed(1)}°</p>
          </div>
          <div className="motor-metric">
            <span>
              MOTOR SPEED <small>RPM</small>
            </span>
            <div className="motor-bars">
              {t.rpm.map((v, i) => (
                <div key={i}>
                  <span>
                    <i
                      style={{ height: `${Math.max(3, (v / 7257) * 100)}%` }}
                    />
                  </span>
                  <b>{Math.round(v)}</b>
                  <small>M{i + 1}</small>
                </div>
              ))}
            </div>
          </div>
          <button
            className="pause-sim"
            onClick={() => action("pause")}
            aria-label={t.paused ? "Resume simulation" : "Pause simulation"}
          >
            <Icon name={t.paused ? "play" : "pause"} size={18} />
          </button>
        </section>
        {stats.loading && !constructionError && (
          <div className="loading-chip">
            <span className="spinner" />
            Loading surface materials…
          </div>
        )}
        {(stats.error || constructionError) && (
          <div className="error-message" role="alert">
            {constructionError
              ? `Unable to initialize WebGL: ${constructionError}`
              : stats.error}
          </div>
        )}
      </main>
      <footer className="statusbar">
        <span>
          <i /> {stats.fps} FPS <em>·</em> PHYSICS {stats.physicsHz} Hz{" "}
          <em>·</em> {stats.drawCalls} DRAW CALLS
          {stats.physicsHz > 0 && stats.physicsHz < 240 && (
            <strong className="fidelity-warning">SIMULATION SLOWED</strong>
          )}
        </span>
        <span className="keyboard-hint">
          W A S D <span>move</span> R / F <span>altitude</span> Q / E{" "}
          <span>yaw</span>
          <em>·</em> SPACE <span>pause</span>
        </span>
        <span>
          LOCAL WORLD <em> / </em> {t.position[0].toFixed(1)},{" "}
          {t.position[1].toFixed(1)}, {t.position[2].toFixed(1)} m
        </span>
      </footer>
      {dialog && (
        <div className="dialog-scrim" onClick={() => setDialog(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              dialog === "help" ? "Simulator controls" : "Arena reference plan"
            }
            className={`dialog ${dialog === "reference" ? "reference-dialog" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button dialog-close"
              autoFocus
              aria-label="Close dialog"
              onClick={() => setDialog(null)}
            >
              <Icon name="close" />
            </button>
            {dialog === "reference" ? (
              <>
                <span className="eyebrow">SOURCE GEOMETRY</span>
                <h2>The original competition plan</h2>
                <p>
                  Only the 45 × 27 m central court is reconstructed. Neck curves
                  and minor marker positions are estimates from this
                  dimension-calibrated trace.
                </p>
                <img
                  src="/assets/reference/arena-layout.png"
                  alt="Original UAV competition diagram, with 45m by 27m central arena, figure-eight circles and landing zones"
                />
                <p className="dialog-note">
                  V1 · white 5 cm　 V2 · white 10 cm　 V3 · dashed yellow 10 cm
                </p>
              </>
            ) : (
              <>
                <span className="eyebrow">FLIGHT LABORATORY</span>
                <h2>Your controls, at a glance.</h2>
                <p>
                  Arm the aircraft, then take off to a 5 m hold. Start the
                  mission to follow the reference figure eight, or fly manually
                  through the cascaded controller.
                </p>
                <div className="help-keys">
                  {[
                    ["W / S", "Forward / backward (world −Z / +Z)"],
                    ["A / D", "Left / right (world −X / +X)"],
                    ["R / F", "Climb / descend"],
                    ["Q / E", "Yaw left / right"],
                    ["Space", "Pause or resume the simulation"],
                    [
                      "Mouse drag / wheel",
                      "Orbit / zoom in Overview, Orbit or Ground",
                    ],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <kbd>{a}</kbd>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <p className="dialog-note">
                  15 kg illustrative airframe · ideal state telemetry ·
                  simplified foot-contact collisions. Wind applies aerodynamic
                  forces. Rain changes the environment visually. Not calibrated
                  to real flight logs.
                </p>
                <details>
                  <summary>Renderer details</summary>
                  <p>
                    {stats.gpu}
                    <br />
                    {Math.round(stats.triangles / 1000)}k triangles ·{" "}
                    {stats.drawCalls} draw calls
                    <br />
                    250 Hz simulation · {stats.fps} FPS observed
                  </p>
                </details>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
