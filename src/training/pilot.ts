import { PerspectiveCamera, Vector3 } from "three";
import { config } from "../arena/geometry";
export type PilotStation = {
  x: number;
  z: number;
  groundY: number;
  eyeHeight: number;
  verticalFov: number;
  source: string;
  confidence: string;
  verification: "PROVISIONAL";
  // Optional only for importing untouched v0.2 recordings.
  edge?: "front-long-edge";
  setback?: number;
  initialYaw?: number;
  initialPitch?: number;
  viewRevision?: number;
};
// Edge/centre vectors use the same world coordinates as the court; this also
// handles a rotated edge when a surveyed transform is supplied by the caller.
export function stationFromEdge(
  a: [number, number],
  b: [number, number],
  center: [number, number],
  setback: number,
  groundY: number,
): PilotStation {
  const mx = (a[0] + b[0]) / 2,
    mz = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  if (!(length > 0 && Number.isFinite(setback) && setback > 0))
    throw new Error("Invalid pilot edge/setback");
  let nx = -dz / length,
    nz = dx / length;
  if (nx * (mx - center[0]) + nz * (mz - center[1]) < 0) {
    nx = -nx;
    nz = -nz;
  }
  const x = mx + nx * setback,
    z = mz + nz * setback;
  return {
    x,
    z,
    groundY,
    eyeHeight: 1.65,
    verticalFov: 55,
    edge: "front-long-edge",
    viewRevision: 2,
    setback,
    initialYaw: Math.atan2(center[1] + 8 * nx - z, center[0] - 8 * nz - x),
    initialPitch: -5 * Math.PI / 180,
    source:
      "Giả định kỹ thuật: trung điểm cạnh dài phía trước (+Z), lùi ngoài V1; chưa có khảo sát hiện trường",
    confidence: "Cần giảng viên và đơn vị có thẩm quyền xác nhận",
    verification: "PROVISIONAL",
  };
}
export function frontPilotStation(setback = 3.5) {
  const c = config.concrete;
  return stationFromEdge(
    [-c.length / 2, c.width / 2],
    [c.length / 2, c.width / 2],
    [0, 0],
    setback,
    config.grass.height,
  );
}
export const PILOT_STATION = frontPilotStation();
export function validStation(s: PilotStation) {
  return (
    !!s &&
    [s.x, s.z, s.groundY, s.eyeHeight, s.verticalFov].every(Number.isFinite) &&
    Math.abs(s.x) <= config.grass.length / 2 &&
    Math.abs(s.z) <= config.grass.width / 2 &&
    s.eyeHeight >= 1 &&
    s.eyeHeight <= 2.2 &&
    s.verticalFov >= 35 &&
    s.verticalFov <= 80 &&
    (s.initialYaw === undefined || Number.isFinite(s.initialYaw)) &&
    (s.initialPitch === undefined ||
      (Number.isFinite(s.initialPitch) && Math.abs(s.initialPitch) <= 1.2)) &&
    (s.setback === undefined ||
      (Number.isFinite(s.setback) && s.setback > config.paint.v1Width / 2))
  );
}
export function validFrontStation(s: PilotStation) {
  if (
    !validStation(s) ||
    s.edge !== "front-long-edge" ||
    s.setback === undefined
  )
    return false;
  const expected = frontPilotStation(s.setback);
  return Math.abs(s.x - expected.x) < 1e-6 && Math.abs(s.z - expected.z) < 1e-6;
}
export function applyPilotCamera(
  camera: PerspectiveCamera,
  s: PilotStation,
  yaw = s.initialYaw ?? 0,
  pitch = s.initialPitch ?? 0,
) {
  camera.position.set(s.x, s.groundY + s.eyeHeight, s.z);
  camera.fov = s.verticalFov;
  camera.zoom = 1;
  camera.up.set(0, 1, 0);
  camera.lookAt(
    camera.position
      .clone()
      .add(
        new Vector3(
          Math.cos(pitch) * Math.cos(yaw),
          Math.sin(pitch),
          Math.cos(pitch) * Math.sin(yaw),
        ),
      ),
  );
  camera.updateProjectionMatrix();
}
export function pilotBearing(s: PilotStation, position: number[]) {
  return Math.atan2(position[2] - s.z, position[0] - s.x);
}
