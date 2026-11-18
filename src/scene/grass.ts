import * as T from "three";
import { seeded } from "./random";
export { seeded } from "./random";
import { grassTiles, tileSize } from "./grassTiles";
import type { Quality } from "./World";
export function makeGrass() {
  const group = new T.Group(),
    time = { value: 0 },
    wind = { value: new T.Vector3() },
    wet = { value: 0 };
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * 2.399,
      cos = Math.cos(angle),
      sin = Math.sin(angle),
      height = [0.085, 0.065, 0.1][blade],
      base = positions.length / 3;
    for (const [x, y, z] of [
      [-0.0015, 0, 0],
      [0.0015, 0, 0],
      [-0.001, 0.53, 0.012],
      [0.001, 0.53, 0.012],
      [0, 1, 0.04],
    ]) {
      positions.push(x * cos + z * sin, y * height, -x * sin + z * cos);
      uvs.push(x > 0 ? 1 : 0, y);
    }
    indices.push(...[0, 2, 1, 1, 2, 3, 2, 4, 3].map((i) => i + base));
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    color: "#b8c58a",
    roughness: 1,
    side: T.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = time;
    shader.uniforms.uGrassWind = wind;
    shader.uniforms.uWet = wet;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uGrassTime;uniform vec3 uGrassWind;varying float vBladeHeight;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
   vBladeHeight=uv.y;vec3 origin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   float wave=.65+.35*sin(origin.x*1.3+origin.z*.8+uGrassTime*2.);
   vec2 localWind=vec2(dot(normalize(instanceMatrix[0].xyz),uGrassWind),dot(normalize(instanceMatrix[2].xyz),uGrassWind));
   transformed.xz+=localWind*.006*uv.y*uv.y*wave;
   transformed.y*=1.-smoothstep(13.,23.,distance(cameraPosition,origin));
  `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vBladeHeight;uniform float uWet;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb*=mix(.55,1.1,vBladeHeight)*(1.-uWet*.2);",
      );
  };
  const meshes: T.InstancedMesh[] = [];
  for (const tile of grassTiles(tileSize * tileSize * 64, 1209)) {
    const mesh = new T.InstancedMesh(geo, material, tile.points.length);
    mesh.position.set(tile.x, 0, tile.z);
    const rand = seeded(Math.round(tile.x * 771 + tile.z * 31)),
      color = new T.Color();
    tile.points.forEach((matrix, i) => {
      mesh.setMatrixAt(i, matrix);
      color.setHSL(
        0.2 + rand() * 0.055,
        0.24 + rand() * 0.18,
        0.28 + rand() * 0.12,
      );
      if (rand() < 0.08) color.setHSL(0.13, 0.2, 0.37);
      mesh.setColorAt(i, color);
    });
    mesh.userData.capacity = tile.points.length;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    mesh.boundingSphere!.radius += 0.3;
    meshes.push(mesh);
    group.add(mesh);
  }
  let quality: Quality = "High";
  function setQuality(q: Quality) {
    quality = q;
    for (const m of meshes)
      m.count = Math.floor(
        m.userData.capacity *
          { Low: 12 / 64, Medium: 24 / 64, High: 40 / 64, Ultra: 1 }[q],
      );
  }
  setQuality(quality);
  return {
    group,
    meshes,
    time,
    wind,
    wet,
    setQuality,
    update(camera: T.Camera) {
      for (const mesh of meshes) {
        const distance = Math.hypot(
          camera.position.x - mesh.position.x,
          camera.position.y,
          camera.position.z - mesh.position.z,
        );
        mesh.visible = distance < 27;
      }
    },
  };
}
