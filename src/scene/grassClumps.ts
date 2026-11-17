import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Quality } from "./World";
import { seeded } from "./grass";

// CC0 authored blade geometry preserves leaf folds, UVs and natural tuft structure.
export function makeGrassClumps(
  onReady: () => void,
  onError: (error: unknown) => void,
) {
  const group = new T.Group();
  const time = { value: 0 },
    wind = { value: new T.Vector3() },
    wet = { value: 0 };
  const meshes: T.InstancedMesh[] = [];
  let quality: Quality = "High",
    disposed = false;
  const state = { ready: false };
  function bend(shader: T.WebGLProgramParametersWithUniforms) {
    shader.uniforms.uClumpTime = time;
    shader.uniforms.uClumpWind = wind;
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
      float distanceToEye=length(origin.xz-cameraPosition.xz);
      transformed.y*=1.-smoothstep(3.,5.5,distanceToEye);
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
      m.count = { Low: 160, Medium: 450, High: 900, Ultra: 1200 }[q];
      m.castShadow = q === "High" || q === "Ultra";
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
        material.color.setRGB(1.35, 1.45, 1.2);
        material.alphaMap = alpha;
        material.depthWrite = true;
        material.roughness = 1;
        material.normalScale.set(0.7, 0.7);
        material.onBeforeCompile = bend;
        material.customProgramCacheKey = () => "grass-clump-pbr";
        const mesh = new T.InstancedMesh(
          source.geometry.clone(),
          material,
          1200,
        );
        const depth = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking,
          alphaMap: alpha,
          alphaTest: 0.45,
          side: T.DoubleSide,
        });
        depth.onBeforeCompile = bend;
        mesh.customDepthMaterial = depth;
        const rand = seeded(78 + meshes.length * 11),
          object = new T.Object3D(),
          color = new T.Color();
        for (let i = 0; i < 1200; i++) {
          object.position.set((rand() - 0.5) * 8, -0.034, (rand() - 0.5) * 8);
          object.rotation.set(0, rand() * Math.PI * 2, 0);
          const scale = 0.65 + rand() * 0.55;
          object.scale.set(scale * (0.85 + rand() * 0.3), scale, scale);
          object.updateMatrix();
          mesh.setMatrixAt(i, object.matrix);
          color.setRGB(
            0.8 + rand() * 0.3,
            0.85 + rand() * 0.25,
            0.8 + rand() * 0.25,
          );
          mesh.setColorAt(i, color);
        }
        mesh.frustumCulled = false;
        mesh.receiveShadow = true;
        meshes.push(mesh);
        group.add(mesh);
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
      t: number,
      windVector: T.Vector3,
      wetness: number,
    ) => {
      group.visible = state.ready && camera.position.y < 4;
      group.position.set(
        Math.round(camera.position.x / 2) * 2,
        0,
        Math.round(camera.position.z / 2) * 2,
      );
      time.value = t;
      wind.value.copy(windVector);
      wet.value = wetness;
    },
  };
}
