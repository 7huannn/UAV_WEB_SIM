import config from "./arenaGeometry.json";
export { config };
export type Point = [number, number];
export const fromPixel = (x: number, y: number): Point => {
  const [left, top, right, bottom] = config.reference.pixelBounds;
  return [
    ((x - left) / (right - left) - 0.5) * config.concrete.length,
    ((y - top) / (bottom - top) - 0.5) * config.concrete.width,
  ];
};
export const insideCourt = (x: number, z: number, margin = 0) =>
  Math.abs(x) <= config.concrete.length / 2 - margin &&
  Math.abs(z) <= config.concrete.width / 2 - margin;
export function circle(
  cx: number,
  cz: number,
  r: number,
  from = 0,
  to = Math.PI * 2,
  steps = 160,
): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
}
function line(a: Point, b: Point, n = 40): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / n,
    a[1] + ((b[1] - a[1]) * i) / n,
  ]);
}
function bezier(a: Point, b: Point, c: Point, d: Point): Point[] {
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40,
      s = 1 - t;
    return [
      s * s * s * a[0] +
        3 * s * s * t * b[0] +
        3 * s * t * t * c[0] +
        t * t * t * d[0],
      s * s * s * a[1] +
        3 * s * s * t * b[1] +
        3 * s * t * t * c[1] +
        t * t * t * d[1],
    ];
  });
}
export function outerEight(): Point[] {
  const f = config.figureEight,
    r = f.outerRadius,
    a = Math.PI / 4;
  const [lc, rc] = f.centers,
    midX = (lc[0] + rc[0]) / 2,
    midZ = (lc[1] + rc[1]) / 2;
  const controlZ = (f.neckHalfWidth - r * Math.sin(a) * 0.25) / 0.75;
  const l = circle(lc[0], lc[1], r, a, 2 * Math.PI - a);
  const rr = circle(rc[0], rc[1], r, Math.PI + a, 3 * Math.PI - a);
  const top = bezier(
    l.at(-1)!,
    [midX - 1.3, midZ - controlZ],
    [midX + 1.3, midZ - controlZ],
    rr[0],
  );
  const bottom = bezier(
    rr.at(-1)!,
    [midX + 1.3, midZ + controlZ],
    [midX - 1.3, midZ + controlZ],
    l[0],
  );
  return [...l, ...top.slice(1), ...rr.slice(1), ...bottom.slice(1)];
}
// Exact common internal tangents; centers remain horizontally aligned as in the source plan.
export function figureEight(): Point[] {
  const f = config.figureEight,
    [lc, rc] = f.centers,
    r = f.routeRadius;
  const theta = Math.acos(r / ((rc[0] - lc[0]) / 2));
  const cross: Point = [(lc[0] + rc[0]) / 2, (lc[1] + rc[1]) / 2];
  const right = circle(rc[0], rc[1], r, Math.PI - theta, -Math.PI + theta, 220);
  const left = circle(lc[0], lc[1], r, theta, 2 * Math.PI - theta, 220);
  return [
    ...line(cross, right[0]),
    ...right.slice(1),
    ...line(right.at(-1)!, left[0]).slice(1),
    ...left.slice(1),
    ...line(left.at(-1)!, cross).slice(1),
  ];
}
export const route = figureEight();
export const routeDistances = route.map((_, i) =>
  i
    ? Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1])
    : 0,
);
for (let i = 1; i < routeDistances.length; i++)
  routeDistances[i] += routeDistances[i - 1];
export const routeLength = routeDistances.at(-1)!;
export function sampleRoute(distance: number): Point {
  const d = ((distance % routeLength) + routeLength) % routeLength;
  let i = 1;
  while (i < route.length - 1 && routeDistances[i] < d) i++;
  const t =
    (d - routeDistances[i - 1]) /
    (routeDistances[i] - routeDistances[i - 1] || 1);
  return [
    route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t,
    route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t,
  ];
}
export function rectangle(b: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}): Point[] {
  return [
    [b.minX, b.minZ],
    [b.maxX, b.minZ],
    [b.maxX, b.maxZ],
    [b.minX, b.maxZ],
    [b.minX, b.minZ],
  ];
}
