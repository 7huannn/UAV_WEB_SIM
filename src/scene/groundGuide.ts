import * as T from "three";
import { config } from "../arena/geometry";

export function projectedGround(x: number, z: number) {
  return Math.abs(x) <= config.concrete.length / 2 && Math.abs(z) <= config.concrete.width / 2
    ? config.concrete.height : config.grass.height;
}
export function groundGuideAllowed(workspace: string, mock: boolean, replay: boolean) {
  return workspace === "Training" && !mock && !replay;
}
// Render-only assistance. No world/aircraft state, evaluator or recordings are written.
export function makeGroundGuide() {
  const group = new T.Group();
  group.name = "training-ground-position-guide";
  const points = new Float32Array(6);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(points, 3));
  const lineMaterial = new T.LineDashedMaterial({ color: "#f6ad24", dashSize: .18, gapSize: .13, transparent: true, opacity: .9, depthWrite: false, fog: false });
  const line = new T.Line(geometry, lineMaterial);
  const ringMaterial = new T.MeshBasicMaterial({ color: "#b86a00", transparent: true, opacity: .85, depthWrite: false, side: T.DoubleSide, fog: false });
  const ring = new T.Mesh(new T.RingGeometry(.24, .32, 32), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  group.add(line, ring);
  group.visible = false;
  return { group, update(position: T.Vector3, allowed: boolean) {
    const surface = projectedGround(position.x, position.z);
    const height = position.y - surface;
    // Fade near touchdown; body centre is above gear contact.
    const opacity = T.MathUtils.clamp((height - .5) / .45, 0, 1);
    group.visible = allowed && opacity > 0;
    if (!group.visible) return;
    const ground = surface + .025;
    points.set([position.x, position.y - .16, position.z, position.x, ground, position.z]);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
    line.computeLineDistances();
    ring.position.set(position.x, ground, position.z);
    lineMaterial.opacity = opacity * .9;
    ringMaterial.opacity = opacity * .85;
  }};
}
