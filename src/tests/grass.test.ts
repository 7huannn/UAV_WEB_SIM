import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { grassTiles } from "../scene/grassTiles";

test("world-space vegetation seeds reproduce fixed tiles, keep density prefixes and exclude the court", () => {
  const low = grassTiles(20, 42, 2),
    repeat = grassTiles(20, 42, 2),
    high = grassTiles(40, 42, 2);
  assert.deepEqual(low, repeat);
  const dense = new Map(high.map((t) => [`${t.x},${t.z}`, t]));
  for (const tile of low) {
    assert.deepEqual(
      tile.points,
      dense.get(`${tile.x},${tile.z}`)!.points.slice(0, tile.points.length),
    );
    for (const matrix of tile.points) {
      const p = new Vector3().setFromMatrixPosition(matrix);
      p.x += tile.x;
      p.z += tile.z;
      assert.ok(Math.abs(p.x) <= 30 && Math.abs(p.z) <= 21);
      assert.ok(Math.abs(p.x) >= 22.68 || Math.abs(p.z) >= 13.68);
    }
  }
});
