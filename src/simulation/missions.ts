import { config, figureEight, type Point } from "../arena/geometry";
export type MissionId = "figure-eight" | "outer-circuit";
export type MissionPhase =
  | "IDLE"
  | "ARMING"
  | "TAKEOFF"
  | "TRANSIT_TO_ROUTE"
  | "EXECUTING"
  | "RETURN_TO_H"
  | "LANDING"
  | "COMPLETED"
  | "PAUSED"
  | "ABORTED"
  | "FAILED";
export type Path = { points: Point[]; distances: number[]; length: number };
export function path(points: Point[]): Path {
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(
          points[i][0] - points[i - 1][0],
          points[i][1] - points[i - 1][1],
        ),
    );
  return { points, distances, length: distances.at(-1)! };
}
export function samplePath(p: Path, distance: number): Point {
  const d = Math.max(0, Math.min(p.length, distance));
  let lo = 1,
    hi = p.points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (p.distances[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const i = lo,
    t = (d - p.distances[i - 1]) / (p.distances[i] - p.distances[i - 1] || 1);
  return [
    p.points[i - 1][0] + (p.points[i][0] - p.points[i - 1][0]) * t,
    p.points[i - 1][1] + (p.points[i][1] - p.points[i - 1][1]) * t,
  ];
}
export const home: Point = [config.landingZones[0].x, config.landingZones[0].z];
const gate: Point = [config.corridors.center.minX, home[1]];
const marker = (id: string): Point => {
  const m = config.markers.find((m) => m.id === id)!;
  return [m.x, m.z];
};
// Rotate the existing analytical course to its westernmost point; geometry/direction unchanged.
const eight = figureEight().slice(0, -1);
const entry = eight.reduce(
  (best, p, i) => (p[0] < eight[best][0] ? i : best),
  0,
);
const lap = [...eight.slice(entry), ...eight.slice(0, entry), eight[entry]];
export type MissionLeg = {
  phase: "TRANSIT_TO_ROUTE" | "EXECUTING" | "RETURN_TO_H";
  waypoint: string;
  path: Path;
};
const leg = (
  phase: MissionLeg["phase"],
  waypoint: string,
  points: Point[],
): MissionLeg => ({ phase, waypoint, path: path(points) });
const definitions = {
  "figure-eight": {
    id: "figure-eight" as const,
    number: "01",
    name: "Figure Eight",
    description: "Complete both lobes, return to H and land.",
    altitude: config.figureEight.altitude,
    legs: [
      leg("TRANSIT_TO_ROUTE", "Entry", [home, lap[0]]),
      leg("EXECUTING", "Figure Eight", lap),
      leg("RETURN_TO_H", "H", [lap[0], home]),
    ],
  },
  "outer-circuit": {
    id: "outer-circuit" as const,
    number: "02",
    name: "Outer Circuit",
    description: "M1 → M2 → M3 → M4 → M5, return to H and land.",
    altitude: config.figureEight.altitude,
    legs: [
      leg("TRANSIT_TO_ROUTE", "Gate", [home, gate]),
      leg("TRANSIT_TO_ROUTE", "M1", [gate, marker("M1")]),
      ...["M2", "M3", "M4", "M5"].map((id, i) =>
        leg("EXECUTING", id, [marker(`M${i + 1}`), marker(id)]),
      ),
      leg("RETURN_TO_H", "Gate", [marker("M5"), gate]),
      leg("RETURN_TO_H", "H", [gate, home]),
    ],
  },
};
export const missions = Object.fromEntries(
  Object.entries(definitions).map(([id, m]) => [
    id,
    {
      ...m,
      length: m.legs.reduce((s, l) => s + l.path.length, 0),
      preview: m.legs.flatMap((l, i) =>
        i ? l.path.points.slice(1) : l.path.points,
      ),
    },
  ]),
) as {
  [K in MissionId]: (typeof definitions)[K] & {
    length: number;
    preview: Point[];
  };
};
export const missionIsActive = (phase: MissionPhase) =>
  !["IDLE", "COMPLETED", "ABORTED", "FAILED"].includes(phase);
