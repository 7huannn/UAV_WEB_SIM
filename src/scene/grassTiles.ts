import * as T from "three";
import { seeded } from "./random";
export const tileSize = 4;
export type GrassTile = { x: number; z: number; points: T.Matrix4[] };
// Global coordinates and tile-specific seeds never depend on the camera.
export function grassTiles(
  count: number,
  seed: number,
  size = tileSize,
): GrassTile[] {
  const tiles: GrassTile[] = [];
  for (let z = -21; z < 21; z += size)
    for (let x = -30; x < 30; x += size) {
      const width = Math.min(size, 30 - x),
        depth = Math.min(size, 21 - z);
      if (x >= -22.6 && x + width <= 22.6 && z >= -13.6 && z + depth <= 13.6)
        continue;
      const rand = seeded(seed + (x + 30) * 731 + (z + 21) * 197),
        object = new T.Object3D(),
        points: T.Matrix4[] = [];
      for (let i = 0; i < count; i++) {
        const px = x + rand() * width,
          pz = z + rand() * depth;
        // Keep full tuft crowns outside concrete, including wind bend and authored blade spread.
        if (Math.abs(px) < 22.68 && Math.abs(pz) < 13.68) continue;
        object.position.set(px - (x + width / 2), -0.034, pz - (z + depth / 2));
        object.rotation.set(0, rand() * Math.PI * 2, 0);
        object.scale.setScalar(0.7 + rand() * 0.55);
        object.updateMatrix();
        points.push(object.matrix.clone());
      }
      if (points.length)
        tiles.push({ x: x + width / 2, z: z + depth / 2, points });
    }
  return tiles;
}
