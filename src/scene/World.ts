import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Weather } from "../weather/Weather";
import { DroneDynamics, type Telemetry } from "../simulation/DroneDynamics";
import { aircraft, motorSpin } from "../simulation/parameters";
import { figureEight, config } from "../arena/geometry";
import { makePaint, makeLabels, ribbon } from "./paint";
import { makeDrone } from "./drone";
import { makeGrass } from "./grass";
import { makeGrassClumps } from "./grassClumps";
import { makeAtmosphere } from "./atmosphere";
export type CameraMode =
  "Overview" | "Orbit" | "Top down" | "Ground" | "Follow" | "FPV";
export type Quality = "Low" | "Medium" | "High" | "Ultra";
export type WorldStats = {
  fps: number;
  drawCalls: number;
  triangles: number;
  physicsHz: number;
  gpu: string;
  loading: boolean;
  error: string | null;
};
export class World {
  scene = new T.Scene();
  renderer: T.WebGLRenderer;
  camera = new T.PerspectiveCamera(43, 1, 0.06, 1200);
  controls: OrbitControls;
  weather = new Weather();
  drone = new DroneDynamics(this.weather);
  cameraMode: CameraMode = "Overview";
  quality: Quality = "High";
  labels: T.Group;
  route: T.Mesh;
  debug: T.Group;
  grass: ReturnType<typeof makeGrass>;
  clumps: ReturnType<typeof makeGrassClumps>;
  atmosphere: ReturnType<typeof makeAtmosphere>;
  airframe = makeDrone();
  concrete: T.MeshStandardMaterial;
  groundMaterial: T.MeshStandardMaterial;
  stats: WorldStats = {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    physicsHz: 250,
    gpu: "WebGL2",
    loading: true,
    error: null,
  };
  keys = new Set<string>();
  routeVisible = false;
  private frame = 0;
  private last = 0;
  private sample = 0;
  private samples = 0;
  private sampleTime = 0;
  private physicsSteps = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private environmentTarget: T.WebGLRenderTarget | null = null;
  private textures: T.Texture[] = [];
  private texturesLoaded = 0;
  private loadedAirframe: T.Group | null = null;
  private callbacks: (t: Telemetry, s: WorldStats) => void;
  constructor(
    private host: HTMLElement,
    onUpdate: (t: Telemetry, s: WorldStats) => void,
  ) {
    this.callbacks = onUpdate;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.setClearColor("#cbdbe0");
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D UAV competition arena",
    );
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.onContextLost,
    );
    const gl = this.renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) this.stats.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 400;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.target.set(0, 0, 0);
    this.atmosphere = makeAtmosphere(this.scene);
    this.atmosphere.update(this.weather, 0, this.camera);
    const environmentScene = new T.Scene();
    environmentScene.add(this.atmosphere.sky.clone());
    const pmrem = new T.PMREMGenerator(this.renderer);
    const environment = pmrem.fromScene(environmentScene, 0.04, 0.1, 1000);
    this.scene.environment = environment.texture;
    this.scene.environmentIntensity = 0.06;
    this.environmentTarget = environment;
    pmrem.dispose();
    const concreteMaps = this.loadMaps("concrete", 45 / 1.5, 27 / 1.5),
      grassMaps = this.loadMaps("grass", 60 / 2, 42 / 2);
    this.concrete = new T.MeshStandardMaterial({
      ...concreteMaps,
      color: "#edede7",
      roughness: 0.9,
      normalScale: new T.Vector2(0.22, 0.22),
      metalness: 0,
    });
    const wet = { value: 0 };
    this.concrete.userData.wet = wet;
    this.concrete.onBeforeCompile = (shader) => {
      shader.uniforms.uWetness = wet;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vSurfacePos;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvSurfacePos=position;",
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vSurfacePos;uniform float uWetness;",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float gray=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=mix(vec3(gray),diffuseColor.rgb,.18)*1.32+vec3(.16,.155,.145);
        float macro=sin(vSurfacePos.x*.31+sin(vSurfacePos.y*.23))*sin(vSurfacePos.y*.43)*.035;
        diffuseColor.rgb*=1.+macro;diffuseColor.rgb*=1.-uWetness*.26;
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        float puddle=smoothstep(.72,.94,(sin(vSurfacePos.x*.77+sin(vSurfacePos.y*.9))*sin(vSurfacePos.y*.61)*.5+.5));
        roughnessFactor=mix(roughnessFactor,max(.08,.32-puddle*.22),uWetness);
      `,
      );
    };
    const court = new T.Mesh(new T.PlaneGeometry(45, 27), this.concrete);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    this.scene.add(court);
    const sideMat = new T.MeshStandardMaterial({
      color: "#9c9e92",
      roughness: 0.94,
    });
    const hiddenTop = new T.MeshBasicMaterial({ visible: false });
    const edge = new T.Mesh(new T.BoxGeometry(45, 0.035, 27), [
      sideMat,
      sideMat,
      hiddenTop,
      sideMat,
      sideMat,
      sideMat,
    ]);
    edge.position.y = -0.0175;
    edge.receiveShadow = true;
    this.scene.add(edge);
    this.groundMaterial = new T.MeshStandardMaterial({
      ...grassMaps,
      color: "#8eb95f",
      roughness: 1,
      normalScale: new T.Vector2(0.75, 0.75),
    });
    // Four strips ensure the grass surface and blades never cross the concrete.
    for (const [w, h, x, z] of [
      [60, 7.5, 0, -17.25],
      [60, 7.5, 0, 17.25],
      [7.5, 27, -26.25, 0],
      [7.5, 27, 26.25, 0],
    ]) {
      const geo = new T.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          (geo.attributes.position.getX(i) + x + 30) / 60,
          (-geo.attributes.position.getY(i) + z + 21) / 42,
        );
      }
      const mesh = new T.Mesh(geo, this.groundMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, -0.035, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    // Very restrained 6mm saw-cut joints, separate optical detail, no collider.
    const jointMat = new T.MeshStandardMaterial({
      color: "#787e74",
      roughness: 1,
      transparent: true,
      opacity: 0.2,
    });
    for (let x = -17.5; x < 22; x += 5) {
      const m = new T.Mesh(new T.PlaneGeometry(0.006, 27), jointMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.001, 0);
      this.scene.add(m);
    }
    for (let z = -8.5; z < 13; z += 5) {
      const m = new T.Mesh(new T.PlaneGeometry(45, 0.006), jointMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.001, z);
      this.scene.add(m);
    }
    this.scene.add(makePaint());
    this.grass = makeGrass();
    this.scene.add(this.grass.mesh);
    this.clumps = makeGrassClumps(
      () => {
        this.stats.loading = this.texturesLoaded < 6;
      },
      (error) => {
        this.stats.error = `Grass model could not load: ${String(error)}`;
        this.stats.loading = false;
      },
    );
    this.scene.add(this.clumps.group);
    this.labels = makeLabels();
    this.labels.visible = false;
    this.scene.add(this.labels);
    this.route = ribbon(figureEight(), 0.035, "#86d1c8", false, 5.32);
    (this.route.material as T.MeshStandardMaterial).emissive.set("#549b91");
    (this.route.material as T.MeshStandardMaterial).emissiveIntensity = 0.3;
    this.route.visible = false;
    this.scene.add(this.route);
    this.scene.add(this.airframe.group);
    new GLTFLoader().load(
      "/assets/models/uav-15.glb",
      (g) => {
        if (this.disposed) return;
        this.loadedAirframe = g.scene;
        this.loadedAirframe.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.scene.remove(this.airframe.group);
        this.scene.add(this.loadedAirframe);
      },
      undefined,
      () => {
        this.stats.error =
          "GLB unavailable: using the original procedural airframe.";
      },
    );
    this.debug = new T.Group();
    const collider = new T.Box3Helper(
      new T.Box3(
        new T.Vector3(-22.5, -0.04, -13.5),
        new T.Vector3(22.5, 0, 13.5),
      ),
      0xabe36e,
    );
    this.debug.add(collider);
    this.debug.visible = false;
    this.scene.add(this.debug);
    this.setCamera("Overview");
    if (/swiftshader|llvmpipe|software/i.test(this.stats.gpu))
      this.setQuality("Low");
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.clearKeys);
    document.addEventListener("visibilitychange", this.visibility);
    this.frame = requestAnimationFrame(this.tick);
  }
  private loadMaps(name: string, x: number, y: number) {
    const load = (suffix: string, srgb = false) => {
      const tex = new T.TextureLoader().load(
        `/assets/textures/${name}-${suffix}.jpg`,
        () => {
          this.texturesLoaded++;
          this.stats.loading =
            this.texturesLoaded < 6 || !this.clumps?.state.ready;
        },
        undefined,
        () => {
          this.stats.error = `Could not load ${name} ${suffix} texture`;
          this.stats.loading = false;
        },
      );
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(x, y);
      tex.anisotropy = Math.min(
        8,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      if (srgb) tex.colorSpace = T.SRGBColorSpace;
      this.textures.push(tex);
      return tex;
    };
    return {
      map: load("color", true),
      normalMap: load("normal"),
      roughnessMap: load("roughness"),
    };
  }
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    if (this.cameraMode === "Overview" || this.cameraMode === "Top down")
      this.setCamera(this.cameraMode);
    this.camera.updateProjectionMatrix();
  }
  setCamera(mode: CameraMode) {
    this.cameraMode = mode;
    const fit = Math.max(
      1,
      1.45 / (this.host.clientWidth / this.host.clientHeight || 1),
    );
    this.controls.enabled =
      mode === "Overview" || mode === "Orbit" || mode === "Ground";
    this.camera.fov = mode === "FPV" ? 85 : 43;
    this.camera.up.set(0, 1, 0);
    if (mode === "Overview" || mode === "Orbit") {
      this.camera.position.set(28, 47, 57).multiplyScalar(fit);
      this.controls.target.set(0, -4, 0);
    }
    if (mode === "Top down") {
      this.camera.position.set(0, 66, 0.001).multiplyScalar(fit);
      this.controls.target.set(0, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
    if (mode === "Ground") {
      this.camera.position.set(-24.2, 1.1, 8);
      this.controls.target.set(-13, 0.3, 0);
    }
    if (mode === "Follow") {
      this.camera.position
        .copy(this.drone.position)
        .add(new T.Vector3(3, 2.5, 4));
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  setQuality(q: Quality) {
    this.quality = q;
    const settings = {
      Low: [0.85, 25000, 1024],
      Medium: [1.2, 70000, 1024],
      High: [1.7, 130000, 2048],
      Ultra: [2, 220000, 4096],
    }[q];
    this.atmosphere.cloudMaterial.uniforms.uSteps.value = {
      Low: 6,
      Medium: 10,
      High: 14,
      Ultra: 24,
    }[q];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings[0]));
    this.grass.mesh.count = settings[1];
    this.clumps.setQuality(q);
    this.atmosphere.sun.shadow.mapSize.set(settings[2], settings[2]);
    this.atmosphere.sun.shadow.map?.dispose();
    this.atmosphere.sun.shadow.map = null;
    this.resize();
  }
  get scale10mPixels() {
    const a = new T.Vector3(-5, 0, 0).project(this.camera),
      b = new T.Vector3(5, 0, 0).project(this.camera);
    return (Math.abs(b.x - a.x) * this.host.clientWidth) / 2;
  }
  setLabels(v: boolean) {
    this.labels.visible = v;
  }
  setRoute(v: boolean) {
    this.route.visible = v;
    this.routeVisible = v;
  }
  setDebug(v: boolean) {
    this.debug.visible = v;
  }
  private keyDown = (e: KeyboardEvent) => {
    if (
      (e.target as HTMLElement).matches(
        "input,select,textarea,[contenteditable=true]",
      )
    )
      return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyQ",
        "KeyE",
        "KeyR",
        "KeyF",
        "Space",
      ].includes(e.code)
    ) {
      e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "Space" && !e.repeat)
        this.drone.paused = !this.drone.paused;
    }
  };
  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private clearKeys = () => {
    this.keys.clear();
  };
  private visibility = () => {
    this.last = 0;
    this.drone.accumulator = 0;
    this.keys.clear();
  };
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.stats.error =
      "Graphics context lost. Reload to restore the simulator.";
    this.drone.paused = true;
    this.callbacks(this.drone.telemetry(), { ...this.stats });
  };
  private tick = (stamp: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const rawDt = this.last ? (stamp - this.last) / 1000 : 0;
    const dt = Math.min(rawDt, 0.1);
    this.last = stamp;
    if (document.hidden) return;
    const key = (k: string) => (this.keys.has(k) ? 1 : 0);
    const command = new T.Vector3(
      key("KeyD") - key("KeyA"),
      key("KeyR") - key("KeyF"),
      key("KeyS") - key("KeyW"),
    ).multiplyScalar(2);
    if (!this.drone.paused)
      this.drone.manual(command, (key("KeyQ") - key("KeyE")) * 0.7, dt);
    const beforeTime = this.drone.time;
    this.drone.advance(rawDt);
    this.physicsSteps += (this.drone.time - beforeTime) / aircraft.fixedDt;
    const model = this.loadedAirframe ?? this.airframe.group;
    const alpha = this.drone.paused
      ? 1
      : this.drone.accumulator / aircraft.fixedDt;
    model.position.lerpVectors(
      this.drone.previousPosition,
      this.drone.position,
      alpha,
    );
    model.quaternion.slerpQuaternions(
      this.drone.previousOrientation,
      this.drone.orientation,
      alpha,
    );
    if (!this.drone.paused) {
      if (this.loadedAirframe) {
        for (let i = 0; i < 4; i++) {
          const rotor = this.loadedAirframe.getObjectByName(`rotor-${i}`);
          if (rotor)
            rotor.rotation.y += motorSpin[i] * this.drone.motors[i] * dt;
          const blur = this.loadedAirframe.getObjectByName(
            `blur-${i}`,
          ) as T.Mesh<T.RingGeometry, T.MeshStandardMaterial>;
          if (blur)
            blur.material.opacity = Math.min(
              0.12,
              (this.drone.motors[i] / 760) * 0.12,
            );
        }
      } else this.airframe.update(this.drone.motors, dt);
    }
    if (this.cameraMode === "Follow") {
      const offset = new T.Vector3(3, 2.4, 4).applyAxisAngle(
        new T.Vector3(0, 1, 0),
        this.drone.yaw,
      );
      const desired = this.drone.position.clone().add(offset);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.lookAt(
        this.drone.position.clone().add(new T.Vector3(0, 0.1, 0)),
      );
    } else if (this.cameraMode === "FPV") {
      this.camera.position.copy(
        new T.Vector3(0, 0.04, -0.4)
          .applyQuaternion(this.drone.orientation)
          .add(this.drone.position),
      );
      this.camera.quaternion.copy(this.drone.orientation);
    } else if (this.cameraMode === "Top down") this.camera.lookAt(0, 0, 0);
    else {
      this.controls.update();
      if (this.camera.position.y < 0.2) this.camera.position.y = 0.2;
    }
    this.atmosphere.update(this.weather, this.drone.time, this.camera);
    const bladeBudget = {
      Low: 25000,
      Medium: 70000,
      High: 130000,
      Ultra: 220000,
    }[this.quality];
    this.grass.mesh.count =
      this.camera.position.y < 8 ? Math.min(30000, bladeBudget) : bladeBudget;
    this.grass.time.value = this.drone.time;
    this.grass.wind.value.copy(this.drone.wind);
    this.grass.wet.value = this.weather.wetness;
    this.clumps.update(
      this.camera,
      this.drone.time,
      this.drone.wind,
      this.weather.wetness,
    );
    this.concrete.userData.wet.value = this.weather.wetness;
    this.groundMaterial.color
      .set("#8eb95f")
      .multiplyScalar(1 - this.weather.wetness * 0.22);
    this.renderer.render(this.scene, this.camera);
    this.samples++;
    this.sampleTime += rawDt;
    if (stamp - this.sample > 150) {
      this.stats.fps = this.sampleTime
        ? Math.round(this.samples / this.sampleTime)
        : 0;
      this.stats.drawCalls = this.renderer.info.render.calls;
      this.stats.triangles = this.renderer.info.render.triangles;
      this.stats.physicsHz = this.sampleTime
        ? Math.round(this.physicsSteps / this.sampleTime)
        : 0;
      this.callbacks(this.drone.telemetry(), { ...this.stats });
      this.sample = stamp;
      this.samples = 0;
      this.sampleTime = 0;
      this.physicsSteps = 0;
    }
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.clearKeys);
    document.removeEventListener("visibilitychange", this.visibility);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.onContextLost,
    );
    const geos = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    this.scene.traverse((o) => {
      if (
        o instanceof T.Mesh ||
        o instanceof T.LineSegments ||
        o instanceof T.Sprite
      ) {
        if (o.geometry) geos.add(o.geometry);
        const m = Array.isArray(o.material) ? o.material : [o.material];
        m.forEach((v: T.Material) => materials.add(v));
      }
    });
    geos.forEach((g) => g.dispose());
    materials.forEach((m) => {
      const map = (m as T.MeshStandardMaterial).map;
      if (map) map.dispose();
      m.dispose();
    });
    this.textures.forEach((t) => t.dispose());
    this.clumps.dispose();
    this.atmosphere.sun.shadow.map?.dispose();
    this.environmentTarget?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
