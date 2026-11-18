import {
  missions,
  path,
  type MissionId,
  type Path,
} from "../simulation/missions";
import { samplePath } from "../simulation/missions";
export type TaskKind =
  "takeoff" | "hover" | "orientation" | "route" | "abnormal";
export type Task = {
  id: string;
  label: string;
  kind: TaskKind;
  seconds?: number;
  route?: MissionId | "straight";
};
export const rules = {
  version: "training-rules-1.0.0",
  status: "TRAINING_ONLY",
  source: "Engineering assumptions; no verified Vietnamese scoring tolerance",
  altitude: 5,
  altitudeTolerance: 0.6,
  lateralTolerance: 1,
  maxSpeed: 3,
  hoverSpeed: 0.35,
  hoverRadius: 0.6,
  hoverSeconds: 5,
  takeoffSeconds: 2,
  orientationSeconds: 2,
  headingToleranceDegrees: 15,
  routeSpacing: 0.5,
  gateRadius: 0.65,
  maxAltitude: 12,
  maxSeconds: 600,
  homeRadius: 0.6,
  startAltitude: 0.12,
  neutralInputTolerance: 0.08,
  touchdownAltitude: 0.08,
  touchdownSpeed: 0.2,
  penaltyPerSecond: 1,
};
const common: Task[] = [
  {
    id: "takeoff",
    label: "Manual climb to 5 m; settle for 2 s",
    kind: "takeoff",
    seconds: 2,
  },
  { id: "hover", label: "Hold over H for 5 s", kind: "hover", seconds: 5 },
];
export const profiles = {
  "figure-eight": {
    id: "figure-eight",
    version: "1.0.0",
    name: "Full Figure Eight",
    tasks: [
      ...common,
      {
        id: "route",
        label: "H → western entry → both lobes in order → H",
        kind: "route",
        route: "figure-eight",
      },
    ] as Task[],
  },
  "outer-circuit": {
    id: "outer-circuit",
    version: "1.0.0",
    name: "Outer Circuit · M1–M5",
    tasks: [
      ...common,
      {
        id: "route",
        label: "H → gate → M1 → M2 → M3 → M4 → M5 → gate → H",
        kind: "route",
        route: "outer-circuit",
      },
    ] as Task[],
  },
  foundations: {
    id: "foundations",
    version: "1.0.0",
    name: "Hover, orientation & straight flight",
    tasks: [
      ...common,
      {
        id: "orientation",
        label:
          "Hold headings 0°, +90°, 180°, −90° (includes nose/tail toward pilot)",
        kind: "orientation",
        seconds: 2,
      },
      {
        id: "straight",
        label: "Straight flight H → west entry → H",
        kind: "route",
        route: "straight",
      },
    ] as Task[],
  },
  abnormal: {
    id: "abnormal",
    version: "1.0.0",
    name: "Abnormal response practice",
    tasks: [
      ...common,
      {
        id: "abnormal",
        label:
          "Acknowledge simulated lost-link briefing; hold and state recovery plan",
        kind: "abnormal",
      },
    ] as Task[],
  },
};
export type ProfileId = keyof typeof profiles;
export const preflight = [
  "Airspace, field boundaries and people checked",
  "Aircraft, propellers, battery and control mode checked",
  "Controller axes and neutral response checked",
  "Wind, emergency plan and provisional pilot station briefed",
];
export const postflight = [
  "Aircraft disarmed and propulsion stopped",
  "Aircraft condition and occurrence report reviewed",
];
export function taskPath(route: Task["route"]): Path {
  return route === "straight"
    ? path([
        [-20, 0],
        [-13, 0],
        [-20, 0],
      ])
    : path(missions[route ?? "figure-eight"].preview);
}
export function routeGates(p: Path) {
  const points = [];
  for (let d = 0; d < p.length; d += rules.routeSpacing)
    points.push({ distance: d, point: samplePath(p, d) });
  points.push({ distance: p.length, point: samplePath(p, p.length) });
  return points;
}
