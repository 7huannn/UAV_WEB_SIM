import * as T from "three";
import { sampleWind } from "../weather/Weather";
import type { EnvironmentSnapshot } from "../simulation/Simulation";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Quality } from "./World";
import { seeded } from "./random";
import { grassTiles } from "./grassTiles";

// CC0 authored blade geometry preserves leaf folds, UVs and natural tuft structure.
export function makeGrassClumps(
  onReady: () => void,
  onError: (error: unknown) => void,
) {
  const group = new T.Group();
  const time = { value: 0 },
    wet = { value: 0 };
  const meshes: T.InstancedMesh[] = [];
  let quality: Quality = "High",
    disposed = false;
  const state = { ready: false };
  function bend(shader: T.WebGLProgramParametersWithUniforms, tileWind: { value: T.Vector3 }) {
    shader.uniforms.uClumpTime = time;
    shader.uniforms.uClumpWind = tileWind;
    shader.uniforms.uClumpWet = wet;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nuniform float uClumpTime;uniform vec3 uClumpWind;varying vec3 vClumpWorld;",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 origin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      float height=clamp(position.y/.18,0.,1.);
      vec2 localWind=vec2(dot(normalize(instanceMatrix[0].xyz),uClumpWind),dot(normalize(instanceMatrix[2].xyz),uClumpWind));
      float wave=.65+.35*sin(origin.x*1.3+origin.z*.8+uClumpTime*2.);
      transformed.xz+=localWind*.008*height*height*wave;
      float distanceToEye=distance(origin,cameraPosition);
      transformed.y*=1.-smoothstep(2.5,5.5,distanceToEye);
      vClumpWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vClumpWorld;uniform float uClumpWet;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      `#include <alphatest_fragment>
      if(abs(vClumpWorld.x)<22.53&&abs(vClumpWorld.z)<13.53)discard;
      if(abs(vClumpWorld.x)>30.||abs(vClumpWorld.z)>21.)discard;
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      "#include <lights_fragment_end>\n reflectedLight.indirectDiffuse+=diffuseColor.rgb*.22;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\n diffuseColor.rgb*=1.-uClumpWet*.2;",
    );
  }
  function setQuality(q: Quality) {
    quality = q;
    for (const m of meshes) {
      m.count = Math.floor(
        m.userData.capacity *
          { Low: 0.35, Medium: 0.6, High: 0.8, Ultra: 1 }[q],
      );
      m.castShadow = q === "Ultra";
    }
  }
  Promise.all([
    new GLTFLoader().loadAsync("/assets/models/grass-medium-01/model.gltf"),
    new T.TextureLoader().loadAsync(
      "/assets/models/grass-medium-01/textures/alpha.jpg",
    ),
  ])
    .then(([gltf, alpha]) => {
      alpha.flipY = false;
      alpha.anisotropy = 8;
      for (const name of ["small_a", "small_b", "mid_b"]) {
        const source = gltf.scene.getObjectByName(
          `grass_medium_01_${name}_LOD0`,
        ) as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
        if (!source) throw new Error(`Missing grass variant ${name}`);
        const material = source.material.clone();
        material.transparent = false;
        material.alphaTest = 0.45;
        material.alphaToCoverage = true;
        material.color.setRGB(1.3, 1.4, 1.15);
        material.alphaMap = alpha;
        material.depthWrite = true;
        material.roughness = 1;
        material.normalScale.set(0.7, 0.7);
        material.customProgramCacheKey = () => "grass-clump-pbr";
        const geometry = source.geometry.clone();
        const depth = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking,
          alphaMap: alpha,
          alphaTest: 0.45,
          side: T.DoubleSide,
        });
        for (const tile of grassTiles(
          28,
          78 + meshes.length * 11 + name.length * 19,
          2,
        )) {
          const tileWind = { value: new T.Vector3() }, tileMaterial = material.clone(), tileDepth = depth.clone();
          tileMaterial.onBeforeCompile = shader => bend(shader, tileWind);
          tileMaterial.customProgramCacheKey = () => "grass-clump-pbr-tile-v1";
          tileDepth.onBeforeCompile = shader => bend(shader, tileWind);
          tileDepth.customProgramCacheKey = () => "grass-clump-depth-tile-v1";
          const mesh = new T.InstancedMesh(
            geometry,
            tileMaterial,
            tile.points.length,
          );
          mesh.position.set(tile.x, 0, tile.z);
          mesh.userData.capacity = tile.points.length;
          const rand = seeded(Math.round(tile.x * 231 + tile.z * 97)),
            color = new T.Color();
          tile.points.forEach((matrix, i) => {
            mesh.setMatrixAt(i, matrix);
            color.setRGB(
              0.86 + rand() * 0.2,
              0.88 + rand() * 0.18,
              0.8 + rand() * 0.18,
            );
            mesh.setColorAt(i, color);
          });
          mesh.receiveShadow = true;
          mesh.userData.wind = tileWind.value;
          mesh.customDepthMaterial = tileDepth;
          mesh.computeBoundingSphere();
          mesh.boundingSphere!.radius += 0.4;
          meshes.push(mesh);
          group.add(mesh);
        }
      }
      // Selected geometries are cloned; the layout/unused variants need no GPU resources.
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      setQuality(quality);
      state.ready = true;
      if (disposed) {
        dispose();
        return;
      }
      onReady();
    })
    .catch(onError);
  function dispose() {
    disposed = true;
    const textures = new Set<T.Texture>();
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      const mat = mesh.material as T.MeshStandardMaterial;
      for (const key of [
        "map",
        "normalMap",
        "roughnessMap",
        "metalnessMap",
        "alphaMap",
        "aoMap",
      ] as const) {
        if (mat[key]) textures.add(mat[key]);
      }
      mat.dispose();
      mesh.customDepthMaterial?.dispose();
    }
    textures.forEach((t) => t.dispose());
  }
  return {
    group,
    state,
    setQuality,
    dispose,
    update: (
      camera: T.Camera,
      environment: EnvironmentSnapshot,
    ) => {
      group.visible = state.ready && camera.position.y < 6;
      for (const mesh of meshes) {
        sampleWind(environment.current, environment.seed, environment.time, mesh.position, mesh.userData.wind);
        const distance = Math.hypot(
          camera.position.x - mesh.position.x,
          camera.position.y,
          camera.position.z - mesh.position.z,
        );
        mesh.visible = distance < 7.1;
        // Ultra shadows use the same wind/LOD shader, fading before tile culling.
        mesh.castShadow = quality === "Ultra";
      }
      time.value = environment.time;
      wet.value = environment.wetness;
    },
  };
}
