import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { motorPositions, motorSpin } from "../simulation/parameters";
// Original modeled airframe: carbon tubes, machined motors, avionics, gear, optics.
export function makeDrone() {
  const group = new T.Group();
  group.name = "UAV-15 demonstrator";
  const carbon = new T.MeshStandardMaterial({
    color: "#242a29",
    roughness: 0.46,
    metalness: 0.28,
  });
  const shell = new T.MeshStandardMaterial({
    color: "#dbddd4",
    roughness: 0.36,
    metalness: 0.1,
  });
  const metal = new T.MeshStandardMaterial({
    color: "#737c7e",
    roughness: 0.3,
    metalness: 0.85,
  });
  const rubber = new T.MeshStandardMaterial({
    color: "#111615",
    roughness: 0.9,
  });
  const orange = new T.MeshStandardMaterial({
    color: "#d4ea73",
    roughness: 0.44,
    metalness: 0.12,
  });
  const add = (
    geo: T.BufferGeometry,
    mat: T.Material,
    pos: number[],
    parent: T.Group = group,
  ) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const tube = (a: T.Vector3, b: T.Vector3, r: number, mat: T.Material) => {
    const m = add(
      new T.CylinderGeometry(r, r, a.distanceTo(b), 12),
      mat,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
    );
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return m;
  };
  add(new RoundedBoxGeometry(0.48, 0.14, 0.64, 3, 0.04), carbon, [0, 0, 0]);
  add(new RoundedBoxGeometry(0.4, 0.105, 0.51, 4, 0.04), shell, [0, 0.105, 0]);
  add(
    new RoundedBoxGeometry(0.23, 0.08, 0.34, 3, 0.018),
    carbon,
    [0, 0.19, 0.02],
  );
  add(
    new RoundedBoxGeometry(0.08, 0.012, 0.28, 2, 0.005),
    orange,
    [0, 0.238, 0.02],
  );
  const rotors: T.Group[] = [];
  for (const [i, [x, z]] of motorPositions.entries()) {
    tube(
      new T.Vector3(x * 0.15, 0, z * 0.15),
      new T.Vector3(x, 0.025, z),
      0.035,
      carbon,
    );
    add(new T.CylinderGeometry(0.075, 0.065, 0.095, 32), metal, [x, 0.05, z]);
    add(
      new T.CylinderGeometry(0.071, 0.071, 0.035, 32),
      i < 2 ? orange : carbon,
      [x, 0.104, z],
    );
    for (let j = 0; j < 12; j++) {
      const angle = (j * Math.PI) / 6;
      add(new T.BoxGeometry(0.009, 0.045, 0.01), carbon, [
        x + Math.cos(angle) * 0.07,
        0.065,
        z + Math.sin(angle) * 0.07,
      ]);
    }
    const rotor = new T.Group();
    rotor.name = `rotor-${i}`;
    rotor.position.set(x, 0.14, z);
    group.add(rotor);
    for (const sign of [-1, 1]) {
      const shape = new T.Shape();
      shape.moveTo(0.03 * sign, -0.018);
      shape.bezierCurveTo(
        0.12 * sign,
        -0.058,
        0.25 * sign,
        -0.055,
        0.3 * sign,
        -0.018,
      );
      shape.bezierCurveTo(
        0.27 * sign,
        0.012,
        0.12 * sign,
        0.033,
        0.03 * sign,
        0.018,
      );
      shape.closePath();
      const blade = new T.Mesh(
        new T.ExtrudeGeometry(shape, {
          depth: 0.005,
          bevelEnabled: true,
          bevelSize: 0.001,
          bevelThickness: 0.001,
          bevelSegments: 1,
          steps: 1,
          curveSegments: 12,
        }),
        carbon,
      );
      blade.rotation.x = -Math.PI / 2;
      blade.castShadow = true;
      rotor.add(blade);
    }
    add(new T.CylinderGeometry(0.022, 0.022, 0.035, 20), metal, [x, 0.15, z]);
    const blur = new T.Mesh(
      new T.RingGeometry(0.07, 0.3, 64),
      new T.MeshStandardMaterial({
        color: "#adb6b0",
        transparent: true,
        opacity: 0,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    blur.rotation.x = -Math.PI / 2;
    blur.position.set(x, 0.14, z);
    blur.name = `blur-${i}`;
    group.add(blur);
    rotors.push(rotor);
  }
  for (const x of [-0.4, 0.4]) {
    for (const z of [-0.24, 0.24])
      tube(
        new T.Vector3(x * 0.6, -0.06, z),
        new T.Vector3(x, -0.29, z),
        0.015,
        carbon,
      );
    const skid = tube(
      new T.Vector3(x, -0.3, -0.35),
      new T.Vector3(x, -0.3, 0.35),
      0.02,
      rubber,
    );
    skid.name = "landing-skid";
  }
  add(new T.SphereGeometry(0.075, 24, 16), carbon, [0, -0.1, -0.28]);
  const lens = add(
    new T.CylinderGeometry(0.038, 0.041, 0.05, 32),
    new T.MeshStandardMaterial({
      color: "#183e47",
      metalness: 0.8,
      roughness: 0.1,
    }),
    [0, -0.105, -0.35],
  );
  lens.rotation.x = Math.PI / 2;
  tube(
    new T.Vector3(0.13, 0.2, 0.18),
    new T.Vector3(0.13, 0.4, 0.18),
    0.006,
    carbon,
  );
  add(
    new T.CylinderGeometry(0.043, 0.043, 0.016, 24),
    shell,
    [0.13, 0.4, 0.18],
  );
  for (const x of [-0.17, 0.17])
    for (const z of [-0.21, 0.21])
      add(new T.CylinderGeometry(0.009, 0.009, 0.008, 8), metal, [x, 0.162, z]);
  for (const x of [-0.22, 0.22])
    add(
      new T.SphereGeometry(0.012, 12, 8),
      new T.MeshStandardMaterial({
        color: x < 0 ? "#dd493e" : "#62db82",
        emissive: x < 0 ? "#dd493e" : "#62db82",
        emissiveIntensity: 2,
      }),
      [x, 0.03, -0.25],
    );
  // Merge the static frame by material, preserving independently spinning rotor groups.
  group.updateMatrixWorld(true);
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  for (const object of [...group.children]) {
    if (!(object instanceof T.Mesh) || object.name.startsWith("blur-"))
      continue;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const mat = object.material as T.Material;
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat)!.push(flat);
    group.remove(object);
    object.geometry.dispose();
    if (flat !== geometry) geometry.dispose();
  }
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const m = new T.Mesh(merged, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    geometries.forEach((g) => g.dispose());
  }
  return {
    group,
    rotors,
    update: (speeds: number[], dt: number) => {
      rotors.forEach((r, i) => {
        r.rotation.y += motorSpin[i] * speeds[i] * dt;
        const blur = group.getObjectByName(`blur-${i}`) as T.Mesh<
          T.RingGeometry,
          T.MeshStandardMaterial
        >;
        blur.material.opacity = Math.min(0.12, (speeds[i] / 760) * 0.12);
      });
    },
  };
}
