import { PerspectiveCamera, Vector3 } from "three";
export type PilotStation = {
  x: number;
  z: number;
  groundY: number;
  eyeHeight: number;
  verticalFov: number;
  source: string;
  confidence: string;
  verification: "PROVISIONAL";
};
export const PILOT_STATION: PilotStation = {
  x: -25,
  z: 0,
  groundY: -0.035,
  eyeHeight: 1.65,
  verticalFov: 60,
  source:
    "Engineering assumption: west turf, distinct from H and examiner area; diagram has no pilot station",
  confidence: "Low; requires authority and surveyed-site confirmation",
  verification: "PROVISIONAL",
};
export function validStation(s: PilotStation) {
  return (
    [s.x, s.z, s.groundY, s.eyeHeight, s.verticalFov].every(Number.isFinite) &&
    Math.abs(s.x) <= 30 &&
    Math.abs(s.z) <= 21 &&
    s.eyeHeight >= 1 &&
    s.eyeHeight <= 2.2 &&
    s.verticalFov >= 35 &&
    s.verticalFov <= 80
  );
}
export function applyPilotCamera(
  camera: PerspectiveCamera,
  s: PilotStation,
  yaw = 0,
  pitch = 0,
) {
  camera.position.set(s.x, s.groundY + s.eyeHeight, s.z);
  camera.fov = s.verticalFov;
  camera.zoom = 1;
  camera.up.set(0, 1, 0);
  // Zero head angle looks east (+X). Rotation alone; never track the aircraft.
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
