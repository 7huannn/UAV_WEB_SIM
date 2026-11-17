import * as T from "three";
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeGrass(maxCount = 220000) {
  const pos: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let s = 0; s <= 5; s++) {
    const y = s / 5,
      w = (1 - y) ** 0.65 * 0.5;
    pos.push(-w, y, y * y * 0.6, w, y, y * y * 0.6);
    uv.push(0, y, 1, y);
    if (s) {
      const n = s * 2;
      indices.push(n - 2, n, n - 1, n - 1, n, n + 1);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const time = { value: 0 },
    wind = { value: new T.Vector3() },
    wet = { value: 0 };
  const material = new T.MeshStandardMaterial({
    color: "#d0dfa3",
    roughness: 0.95,
    side: T.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = time;
    shader.uniforms.uGrassWind = wind;
    shader.uniforms.uWet = wet;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nuniform float uGrassTime;uniform vec3 uGrassWind;varying float vBladeHeight;varying vec3 vGrassWorld;",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBladeHeight=uv.y;
      vGrassWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;
      vec3 origin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      float wave=sin(origin.x*.8+origin.z*.6+uGrassTime*2.0)*.5+.5;
      vec2 localWind=vec2(dot(normalize(instanceMatrix[0].xyz),uGrassWind),dot(normalize(instanceMatrix[2].xyz),uGrassWind));
      transformed.xz+=localWind*.006/vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[2].xyz))*pow(uv.y,2.0)*(0.6+wave*.4);
      float dist=distance(cameraPosition,origin);
      transformed.y*=1.0-smoothstep(30.0,65.0,dist)*.83;
    `,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vBladeHeight;varying vec3 vGrassWorld;uniform float uWet;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\n if(abs(vGrassWorld.x)<22.56&&abs(vGrassWorld.z)<13.56)discard;if(abs(vGrassWorld.x)>30.||abs(vGrassWorld.z)>21.)discard;diffuseColor.rgb*=mix(.38,.95,vBladeHeight)*(1.0-uWet*.2);",
      );
  };
  const mesh = new T.InstancedMesh(geo, material, maxCount);
  const rand = seeded(1209),
    o = new T.Object3D(),
    color = new T.Color();
  for (let i = 0; i < maxCount; i++) {
    let x: number, z: number;
    do {
      x = (rand() - 0.5) * 60;
      z = (rand() - 0.5) * 42;
    } while (Math.abs(x) < 22.56 && Math.abs(z) < 13.56);
    o.position.set(x, -0.033, z);
    o.rotation.set(
      (rand() - 0.5) * 0.45,
      rand() * Math.PI * 2,
      (rand() - 0.5) * 0.45,
    );
    o.scale.set(
      0.002 + rand() * 0.005,
      0.045 + rand() ** 2 * 0.13,
      0.055 + rand() * 0.085,
    );
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    const hue = 0.2 + rand() * 0.065;
    color.setHSL(hue, 0.35 + rand() * 0.25, 0.1 + rand() * 0.13);
    if (rand() < 0.05) color.setHSL(0.13, 0.27, 0.23);
    mesh.setColorAt(i, color);
  }
  mesh.count = Math.min(130000, maxCount);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  return { mesh, time, wind, wet };
}
