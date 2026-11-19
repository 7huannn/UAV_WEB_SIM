import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  simpleWeather, weatherAtLevels, validLevel,
  type WindLevel,
  type Condition,
} from "../training/weatherPresets";
import { Weather, presets, type Preset } from "../weather/Weather";
import { DroneDynamics, type Telemetry } from "../simulation/DroneDynamics";
import { aircraft, motorSpin } from "../simulation/parameters";
import { config } from "../arena/geometry";
import {
  makePaint,
  makeLabels,
  makeMarkerDots,
  updateLabels,
  ribbon,
} from "./paint";
import { makeGroundGuide, groundGuideAllowed } from "./groundGuide";
import { makeDrone } from "./drone";
import { makeGrass } from "./grass";
import { makeGrassClumps } from "./grassClumps";
import { makeAtmosphere } from "./atmosphere";
import { missions, type MissionId } from "../simulation/missions";
import {
  ControllerInput,
  validController,
  flightDemand,
} from "../training/input";
import {
  TrainingSession,
  type OperatingMode,
  type Attempt,
} from "../training/Session";
import {
  PILOT_STATION, frontPilotStation,
  applyPilotCamera,
  validFrontStation,
  type PilotStation,
} from "../training/pilot";
import { replayAt, replayEnvironment } from "../training/records";
import { type ProfileId } from "../training/profiles";
export type CameraMode =
  | "PILOT VLOS"
  | "Overview"
  | "Orbit"
  | "Top down"
  | "Ground"
  | "Follow"
  | "FPV";
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
  workspace = "Reference missions";
  presentationActive = true;
  input = new ControllerInput();
  session: TrainingSession | null = null;
  pilotStation: PilotStation = { ...PILOT_STATION };
  headYaw = PILOT_STATION.initialYaw!;
  headPitch = PILOT_STATION.initialPitch!;
  inputFocused = true;
  replay: {
    attempt: Attempt;
    time: number;
    playing: boolean;
    speed: number;
    recordedCamera?: boolean;
  } | null = null;
  private replayPaused: boolean | null = null;
  private trace = new T.Line(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: "#de7847" }),
  );
  private trainingReference = new T.Line(
    new T.BufferGeometry(),
    new T.LineDashedMaterial({ color: "#698f65", dashSize: 0.5, gapSize: 0.3 }),
  );
  private traceCount = -1;
  private traceArray = new Float32Array(100000 * 3);
  private pilotLabel: T.Sprite | null = null;
  scene = new T.Scene();
  renderer: T.WebGLRenderer;
  camera = new T.PerspectiveCamera(43, 1, 0.06, 1200);
  controls: OrbitControls;
  weather = new Weather();
  drone = new DroneDynamics(this.weather);
  presentationEnvironment = this.drone.simulation.snapshot();
  cameraMode: CameraMode = "Overview";
  quality: Quality = "High";
  labels: T.Group;
  markerDots: T.Group;
  route: T.Mesh;
  debug: T.Group;
  grass: ReturnType<typeof makeGrass>;
  clumps: ReturnType<typeof makeGrassClumps>;
  atmosphere: ReturnType<typeof makeAtmosphere>;
  airframe = makeDrone();
  concrete: T.MeshStandardMaterial;
  groundMaterial: T.MeshStandardMaterial;
  context: T.Group;
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
  groundGuide = makeGroundGuide();
  groundGuideEnabled = true;
  private frame = 0;
  private last = 0;
  private sample = 0;
  private samples = 0;
  private sampleTime = 0;
  private physicsSteps = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private environmentScene = new T.Scene();
  private pmrem: T.PMREMGenerator;
  private reflectedAtmosphere = { timeOfDay: 15.5, cloud: 0.12, rain: 0 };
  private lastReflectionTime = -Infinity;
  reflectionCaptures = 0;
  reflectionCaptureMaxMs = 0;
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
    try { this.groundGuideEnabled = localStorage.getItem("uav-ground-guide") !== "off"; } catch { /* optional preference */ }
    this.scene.add(this.groundGuide.group);
    try {
      const s = JSON.parse(localStorage.getItem("uav-pilot-station") ?? "null");
      if (s && validFrontStation(s)) this.pilotStation = s.viewRevision === 7 ? s : {
        ...s,
        verticalFov: PILOT_STATION.verticalFov,
        initialYaw: frontPilotStation(s.setback).initialYaw,
        initialPitch: PILOT_STATION.initialPitch,
        viewRevision: 7,
      };
      // Legacy local west station is superseded; archived attempt snapshots stay untouched.
    } catch {
      /* default provisional station */
    }
    try {
      const p = JSON.parse(localStorage.getItem("uav-controller") ?? "null");
      if (p && validController(p)) this.input.profile = p;
    } catch {
      /* default unverified mapping */
    }
    this.recenterPilot();
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
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.addEventListener("pointerdown", this.headStart);
    this.renderer.domElement.addEventListener("pointermove", this.headMove);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Sân mô phỏng UAV 3D. Ở góc người lái, nhấp để khóa chuột và nhìn quanh, nhấp lần nữa hoặc nhấn Escape để thả chuột.",
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
    this.controls.maxDistance = 160;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.target.set(0, 0, 0);
    this.atmosphere = makeAtmosphere(this.scene);
    this.atmosphere.update(this.drone.simulation.snapshot(), this.camera);
    this.environmentScene.add(
      this.atmosphere.sky.clone(),
      this.atmosphere.clouds.clone(),
    );
    this.pmrem = new T.PMREMGenerator(this.renderer);
    this.refreshEnvironment();
    this.reflectedAtmosphere = { ...this.drone.simulation.snapshot().current };
    this.scene.environmentIntensity = 0.06;
    const concreteMaps = this.loadMaps("concrete", 45 / 0.7, 27 / 0.7),
      grassMaps = this.loadMaps("grass", 60 / 2, 42 / 2);
    this.concrete = new T.MeshStandardMaterial({
      ...concreteMaps,
      color: "#edede7",
      roughness: 0.9,
      normalScale: new T.Vector2(0.16, 0.16),
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
        float gray=dot(diffuseColor.rgb,vec3(.299,.587,.114));
        diffuseColor.rgb=mix(vec3(.48,.485,.46),mix(vec3(gray),diffuseColor.rgb,.15),.58);
        vec3 broad=texture2D(map,vMapUv*.071+vec2(.27,.53)).rgb;
        float macro=(broad.r-.45)*.22+sin(vSurfacePos.x*.19+sin(vSurfacePos.y*.23))*sin(vSurfacePos.y*.17)*.045;
        diffuseColor.rgb*=1.+macro;diffuseColor.rgb*=1.-uWetness*.26;
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        float puddle=smoothstep(.72,.94,(sin(vSurfacePos.x*.77+sin(vSurfacePos.y*.9))*sin(vSurfacePos.y*.61)*.5+.5));
        roughnessFactor=mix(roughnessFactor,max(.28,.44-puddle*.13),uWetness);
      `,
      );
    };
    const court = new T.Mesh(new T.PlaneGeometry(44.99, 26.99), this.concrete);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    this.scene.add(court);
    const sideMat = new T.MeshStandardMaterial({
      color: "#b9b7ad",
      normalMap: concreteMaps.normalMap,
      normalScale: new T.Vector2(0.12, 0.12),
      roughness: 0.94,
    });
    const hiddenTop = new T.MeshBasicMaterial({ visible: false });
    const edge = new T.Mesh(new T.BoxGeometry(45, 0.03, 27), [
      sideMat,
      sideMat,
      hiddenTop,
      sideMat,
      sideMat,
      sideMat,
    ]);
    edge.position.y = -0.02;
    edge.receiveShadow = true;
    this.scene.add(edge);
    // Five-millimetre bevel: the overall concrete extent stays exactly 45×27m.
    const bevelPositions: number[] = [],
      bevelIndices: number[] = [];
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i],
        b = corners[(i + 1) % 4],
        base = bevelPositions.length / 3;
      bevelPositions.push(
        a[0] * 22.495,
        0,
        a[1] * 13.495,
        b[0] * 22.495,
        0,
        b[1] * 13.495,
        a[0] * 22.5,
        -0.005,
        a[1] * 13.5,
        b[0] * 22.5,
        -0.005,
        b[1] * 13.5,
      );
      bevelIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
    const bevelGeometry = new T.BufferGeometry();
    bevelGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(bevelPositions, 3),
    );
    bevelGeometry.setIndex(bevelIndices);
    bevelGeometry.computeVertexNormals();
    const bevel = new T.Mesh(
      bevelGeometry,
      new T.MeshStandardMaterial({
        color: "#bfc0b6",
        roughness: 0.94,
        side: T.DoubleSide,
      }),
    );
    bevel.receiveShadow = true;
    this.scene.add(bevel);
    this.groundMaterial = new T.MeshStandardMaterial({
      ...grassMaps,
      color: "#91b477",
      roughness: 1,
      normalScale: new T.Vector2(0.75, 0.75),
    });
    this.groundMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vTurfWorld;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvTurfWorld=(modelMatrix*vec4(position,1.)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vTurfWorld;",
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
        vec3 second=texture2D(map,vMapUv*.173+vec2(.41,.73)).rgb;
        diffuseColor.rgb=mix(diffuseColor.rgb,second*diffuse,.24);
        float variation=sin(vTurfWorld.x*.21+sin(vTurfWorld.z*.31))*sin(vTurfWorld.z*.17+1.7);
        diffuseColor.rgb*=.98+variation*.10;
      `,
        );
    };
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
    // Noninteractive visual context. Optical extinction, rather than camera-height
    // alpha, makes its far edge disappear; official ground remains 60×42m.
    this.context = new T.Group();
    this.context.name = "Visual context only · noninteractive";
    const contextMat = this.groundMaterial.clone();
    contextMat.transparent = false;
    for (const [w, h, x, z] of [
      [2000, 979, 0, -510.5],
      [2000, 979, 0, 510.5],
      [970, 42, -515, 0],
      [970, 42, 515, 0],
    ]) {
      const geo = new T.PlaneGeometry(w, h),
        uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          (geo.attributes.position.getX(i) + x + 30) / 60,
          (-geo.attributes.position.getY(i) + z + 21) / 42,
        );
      const mesh = new T.Mesh(geo, contextMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, -0.036, z);
      this.context.add(mesh);
    }
    this.scene.add(this.context);
    // A 9cm soil/contact band grounds the shallow edge without moving the court boundary.
    const soil = new T.MeshStandardMaterial({ color: "#6c7050", roughness: 1 });
    for (const [w, h, x, z] of [
      [45.18, 0.09, 0, -13.545],
      [45.18, 0.09, 0, 13.545],
      [0.09, 27, -22.545, 0],
      [0.09, 27, 22.545, 0],
    ]) {
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h), soil);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, -0.033, z);
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
    this.scene.add(this.grass.group);
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
    this.markerDots = makeMarkerDots();
    this.scene.add(this.markerDots);
    this.labels = makeLabels();
    this.labels.visible = false;
    this.scene.add(this.labels);
    this.route = ribbon(
      missions[this.drone.selectedMission].preview,
      0.055,
      "#56b7ae",
      false,
      0.035,
    );
    (this.route.material as T.MeshStandardMaterial).emissive.set("#549b91");
    (this.route.material as T.MeshStandardMaterial).emissiveIntensity = 0.3;
    this.route.visible = false;
    this.scene.add(this.route);
    this.trace.geometry.setAttribute(
      "position",
      new T.BufferAttribute(this.traceArray, 3),
    );
    this.trace.geometry.setDrawRange(0, 0);
    this.trace.frustumCulled = false;
    this.scene.add(this.trace);
    this.trainingReference.visible = false;
    this.scene.add(this.trainingReference);
    this.drone.resetGuard = () => !this.session?.active;
    this.drone.simulation.onResume = () => { this.last = 0; };
    this.drone.beforeStep = (dt) => this.flightInput(dt);
    this.drone.afterStep = () =>
      this.session?.sample(
        this.drone,
        this.weather,
        this.input,
        this.cameraMode,
        this.inputFocused,
        {
          position: this.camera.position.toArray(),
          orientation: this.camera.quaternion.toArray(),
          verticalFov: this.camera.fov,
        },
      );
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
    const ring = new T.Mesh(
      new T.RingGeometry(0.35, 0.48, 32),
      new T.MeshBasicMaterial({ color: 0x176b82, side: T.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.pilotMarker.add(
      ring,
      new T.ArrowHelper(
        new T.Vector3(1, 0, 0),
        new T.Vector3(0, 0.02, 0),
        2,
        0x176b82,
        0.45,
        0.25,
      ),
    );
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 640;
    labelCanvas.height = 96;
    const ctx = labelCanvas.getContext("2d")!;
    ctx.fillStyle = "#f8fffa";
    ctx.fillRect(0, 0, 640, 96);
    ctx.fillStyle = "#12475b";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PILOT — Vị trí người điều khiển", 320, 59);
    const label = new T.Sprite(
      new T.SpriteMaterial({
        map: new T.CanvasTexture(labelCanvas),
        depthTest: false,
      }),
    );
    label.scale.set(5.5, 0.52, 1);
    label.position.set(-2.5, 0.8, 0);
    this.pilotLabel = label;
    this.pilotMarker.add(label);
    this.scene.add(this.pilotMarker);
    this.pilotMarker.visible = false;
    this.updatePilotMarker();
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
  private refreshEnvironment() {
    const start = performance.now();
    const environment = this.pmrem.fromScene(
      this.environmentScene,
      0.04,
      0.1,
      1000,
    );
    this.scene.environment = environment.texture;
    this.environmentTarget?.dispose();
    this.environmentTarget = environment;
    this.reflectionCaptures++;
    this.reflectionCaptureMaxMs = Math.max(this.reflectionCaptureMaxMs, performance.now() - start);
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
    if (this.session?.strict && mode !== "PILOT VLOS") {
      this.session.event("AID_BLOCKED", `Camera ${mode}`);
      return false;
    }
    if (this.replay) this.replay.recordedCamera = false;
    if (mode !== "PILOT VLOS" && document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.cameraMode = mode;
    this.controls.enabled =
      mode === "Overview" || mode === "Orbit" || mode === "Ground";
    this.controls.minPolarAngle = mode === "Top down" ? 0 : 0.12;
    this.camera.fov = mode === "FPV" ? 85 : 45;
    this.camera.aspect = this.host.clientWidth / this.host.clientHeight || 1;
    this.camera.up.set(0, 1, 0);
    if (mode === "Overview" || mode === "Orbit" || mode === "Top down") {
      const direction =
        mode === "Top down"
          ? new T.Vector3(0, 1, 0.00001)
          : new T.Vector3(8, 46, 38).normalize();
      const right = new T.Vector3()
        .crossVectors(new T.Vector3(0, 1, 0), direction)
        .normalize();
      const up = new T.Vector3().crossVectors(direction, right).normalize();
      const tan = Math.tan(T.MathUtils.degToRad(this.camera.fov / 2));
      let distance = 0;
      // Fit court plus a useful turf margin in both axes, including portrait viewports.
      for (const x of [-25, 25])
        for (const z of [-16, 16]) {
          const v = new T.Vector3(x, 0, z),
            depth = v.dot(direction);
          distance = Math.max(
            distance,
            depth + Math.abs(v.dot(right)) / (tan * this.camera.aspect * 0.9),
            depth +
              Math.abs(v.dot(up)) /
                (tan *
                  (mode === "Top down" && this.host.clientWidth > 650
                    ? 0.55
                    : 0.75)),
          );
        }
      this.camera.position.copy(direction.multiplyScalar(distance));
      this.controls.target.set(0, 0, 0);
      if (mode === "Top down" && this.host.clientWidth > 650) {
        this.camera.position.z -= 3.4;
        this.controls.target.z = -3.4;
      }
      this.camera.lookAt(this.controls.target);
    }
    if (mode === "Ground") {
      this.camera.position.set(-22.9, 1.65, 5.6);
      this.controls.target.set(-13, -0.1, -1.5);
    }
    if (mode === "Follow") {
      this.camera.position
        .copy(this.drone.position)
        .add(new T.Vector3(3, 2.5, 4));
    }
    if (mode === "PILOT VLOS")
      applyPilotCamera(
        this.camera,
        this.pilotStation,
        this.headYaw,
        this.headPitch,
      );
    this.camera.updateProjectionMatrix();
    if (this.controls.enabled) this.controls.update();
    return true;
  }
  setQuality(q: Quality) {
    this.quality = q;
    const settings = {
      Low: [0.85, 25000, 1024],
      Medium: [1.2, 70000, 1024],
      High: [1.7, 130000, 2048],
      Ultra: [2, 220000, 4096],
    }[q];
    this.atmosphere.setQuality(q);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings[0]));
    this.grass.setQuality(q);
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
  setGroundGuide(show: boolean) {
    if (!groundGuideAllowed(this.workspace, this.session?.attempt.mode === "Mock Examination", !!this.replay)) return false;
    this.groundGuideEnabled = show;
    if (!show) this.groundGuide.group.visible = false;
    try { localStorage.setItem("uav-ground-guide", show ? "on" : "off"); } catch { /* optional preference */ }
    return true;
  }
  setLabels(v: boolean) {
    if (this.session?.strict && v) return false;
    this.labels.visible = v;
  }
  selectMission(id: MissionId) {
    if (this.session?.locked) return false;
    if (!this.drone.selectMission(id)) return false;
    this.route.geometry.dispose();
    const replacement = ribbon(
      missions[id].preview,
      0.055,
      "#56b7ae",
      false,
      0.035,
    );
    this.route.geometry = replacement.geometry;
    replacement.material.dispose();
    return true;
  }
  setRoute(v: boolean) {
    if (this.session?.strict && v) return false;
    this.route.visible = v;
    this.routeVisible = v;
  }
  setDebug(v: boolean) {
    if (this.session?.strict && v) return false;
    this.debug.visible = v;
  }
  setWorkspace(page: string) {
    if (
      this.session?.active &&
      page !== this.session.attempt.mode
    )
      return false;
    if (
      this.session?.active &&
      ["Training", "Mock Examination"].includes(page) &&
      page !== this.session.attempt.mode
    )
      return false;
    if (this.drone.missionActive && page !== "Reference missions") return false;
    if (page === "Reference missions" && this.replay) this.setReplay(null);
    if (this.session?.strict && page !== this.workspace) return false;
    if (this.session?.locked && page === "Reference missions") return false;
    if (!["Home", "Training", "Mock Examination", "Session Review", "Controller Calibration", "Examination Profiles", "System Configuration", "Reference missions"].includes(page)) return false;
    if (page !== "Session Review" && this.replay) this.setReplay(null);
    this.keys.clear();
    this.workspace = page;
    this.groundGuide.group.visible = false;
    this.pilotMarker.visible = false;
    if (!this.session?.strict) this.markerDots.visible = true;
    if (page === "Reference missions") {
      this.drone.manualOnly = false;
      this.setCamera("Overview");
    } else {
      this.drone.manualOnly = true;
      if (page === "Training" || page === "Mock Examination")
        this.setCamera("PILOT VLOS");
    }
    return true;
  }
  get canAdjustFlightConditions() {
    return (
      ["Training", "Mock Examination", "Reference missions"].includes(
        this.workspace,
      ) &&
      !this.replay &&
      (!this.session ||
        this.session.state === "READY" ||
        (this.workspace === "Training" &&
          ["ACTIVE", "TASK_COMPLETE", "LANDING", "PAUSED"].includes(
            this.session.state,
          ) &&
          !this.session.strict))
    );
  }
  private weatherChanged() {
    if (this.session?.state === "READY") {
      this.drone.simulation.initializeWeather();
      this.weather.windAt(this.drone.time, this.drone.position, this.drone.wind);
      this.session.attempt.initialWeather = { ...this.weather.current };
      this.session.attempt.environment = this.drone.simulation.snapshot();
    }
    if (this.session?.active)
      this.session.event("WEATHER_CHANGE", JSON.stringify(this.weather.target));
  }
  setWeatherPreset(p: Preset) {
    if (!this.canAdjustFlightConditions || !Object.hasOwn(presets, p)) return false;
    this.weather.setPreset(p);
    this.weatherChanged();
    return true;
  }
  setSimpleWeather(wind: WindLevel, condition: Condition) {
    if (!this.canAdjustFlightConditions) return false;
    this.weather.target = simpleWeather(wind, condition);
    this.weatherChanged();
    return true;
  }
  setWeatherLevels(wind?: number, rain?: number) {
    if (!this.canAdjustFlightConditions || (wind !== undefined && !validLevel(wind)) || (rain !== undefined && !validLevel(rain))) return false;
    this.weather.target = weatherAtLevels(this.weather.target, wind, rain);
    this.weatherChanged();
    return true;
  }
  setAdvancedWeather(key: keyof Weather["target"], value: number) {
    const bounds: Record<keyof Weather["target"], number[]> = {
      wind: [0, 15],
      direction: [0, 360],
      gust: [0, 7],
      turbulence: [0, 1],
      cloud: [0, 1],
      rain: [0, 1],
      visibility: [60, 800],
      timeOfDay: [7, 18],
    };
    if (
      !this.canAdjustFlightConditions ||
      !Object.hasOwn(bounds, key) ||
      !Number.isFinite(value) ||
      value < bounds[key][0] ||
      value > bounds[key][1]
    )
      return false;
    this.weather.target[key] = value;
    this.weatherChanged();
    return true;
  }
  recenterPilot() {
    this.headYaw = this.pilotStation.initialYaw ?? PILOT_STATION.initialYaw!;
    this.headPitch =
      this.pilotStation.initialPitch ?? PILOT_STATION.initialPitch!;
  }
  lookPilot(yaw: number, pitch: number) {
    this.headYaw = Math.atan2(Math.sin(this.headYaw + yaw), Math.cos(this.headYaw + yaw));
    this.headPitch = Math.max(-1.2, Math.min(1.2, this.headPitch + pitch));
  }
  pilotMarker = new T.Group();
  setPilotMarker(show: boolean) {
    if (
      this.session?.strict ||
      !["System Configuration", "Reference missions"].includes(
        this.workspace,
      )
    )
      return false;
    this.pilotMarker.visible = show;
    return true;
  }
  private updatePilotMarker() {
    const s = this.pilotStation;
    this.pilotMarker.position.set(s.x, s.groundY + 0.03, s.z);
    this.pilotMarker.rotation.y = -(s.initialYaw ?? -Math.PI / 2);
  }
  configureStation(station: PilotStation) {
    if (this.session?.locked || !validFrontStation(station)) return false;
    this.pilotStation = {
      ...station,
      verification: "PROVISIONAL",
      source:
        "Vị trí tạm đề xuất do người dùng cài đặt; cần khảo sát và xác nhận",
    };
    try {
      localStorage.setItem(
        "uav-pilot-station",
        JSON.stringify(this.pilotStation),
      );
    } catch {
      this.stats.error = "Pilot station could not be persisted";
    }
    this.recenterPilot();
    this.updatePilotMarker();
    if (this.cameraMode === "PILOT VLOS") this.setCamera("PILOT VLOS");
    return true;
  }
  beginAttempt(candidate: string, mode: OperatingMode, profile: ProfileId) {
    if (this.workspace !== mode) return false;
    if (
      this.session?.active ||
      this.drone.missionActive ||
      this.drone.armed ||
      this.drone.altitude > 0.12 ||
      Math.hypot(this.drone.position.x + 20, this.drone.position.z) > 0.6 ||
      this.replay
    )
      return false;
    if (profile in missions) this.selectMission(profile as MissionId);
    this.keys.clear();
    // Freeze the chosen simulation environment, including blend destination.
    this.drone.reset();
    this.session = new TrainingSession(
      candidate,
      mode,
      profile,
      this.drone,
      this.weather,
      this.input,
      this.pilotStation,
    );
    const task = this.session.attempt.profile.tasks.find(
      (t) => t.kind === "route",
    );
    this.trainingReference.geometry.dispose();
    this.trainingReference.geometry = new T.BufferGeometry().setFromPoints(
      (task ? this.session.attempt.referencePaths[task.id] : []).map(
        ([x, z]) => new T.Vector3(x, 5 + aircraft.gearHeight, z),
      ),
    );
    this.trainingReference.computeLineDistances();
    this.drone.manualOnly = true;
    this.drone.paused = true;
    this.recenterPilot();
    this.setLabels(false);
    this.setRoute(false);
    this.setDebug(false);
    this.markerDots.visible = mode !== "Mock Examination";
    this.pilotMarker.visible = false;
    this.groundGuide.group.visible = false;
    this.setCamera("PILOT VLOS");
    this.traceCount = -1;
    return true;
  }
  setReplay(attempt: Attempt | null) {
    if (this.session?.active || (attempt && !attempt.frames.length))
      return false;
    if (attempt && !this.replay) this.replayPaused = this.drone.paused;
    if (!attempt && this.replayPaused !== null) {
      this.drone.paused = this.replayPaused;
      this.replayPaused = null;
    }
    this.groundGuide.group.visible = false;
    this.replay = attempt
      ? {
          attempt,
          time: attempt.frames[0]?.time ?? 0,
          playing: false,
          speed: 1,
        }
      : null;
    if (attempt) this.drone.paused = true;
    if (!attempt) this.setCamera(this.cameraMode);
    this.traceCount = -1;
    return true;
  }
  private flightInput(dt: number) {
    if (this.replay) return;
    if (this.workspace === "Reference missions") {
      const key = (k: string) => Number(this.keys.has(k));
      this.drone.manual(new T.Vector3(key("KeyD") - key("KeyA"), key("KeyR") - key("KeyF"),
        key("KeyS") - key("KeyW")).multiplyScalar(2), (key("KeyQ") - key("KeyE")) * .7, dt);
      return;
    }
    const s = this.session;
    if (!s?.active || !["ACTIVE", "TASK_COMPLETE", "LANDING"].includes(s.state))
      return;
    if (!this.inputFocused || this.input.fault) return;
    const v = this.input.value,
      heading = new T.Euler().setFromQuaternion(
        this.drone.orientation,
        "YXZ",
      ).y;
    const demand = flightDemand(v, heading);
    this.drone.manual(
      new T.Vector3(...demand.worldVelocity),
      demand.yawRate,
      dt,
    );
  }
  private updateTrace() {
    const frames =
      this.replay?.attempt.frames ?? this.session?.attempt.frames ?? [];
    this.trace.visible =
      !this.session?.strict &&
      (this.workspace === "Session Review" ||
        (this.workspace === "Training" && this.routeVisible));
    this.trainingReference.visible =
      this.trace.visible &&
      this.session?.attempt.profile.tasks.some((t) => t.kind === "route") ===
        true;
    if (this.replay) {
      const task = this.replay.attempt.profile.tasks.find(
        (t) => t.kind === "route",
      );
      if (this.traceCount === -1) {
        this.trainingReference.geometry.dispose();
        this.trainingReference.geometry = new T.BufferGeometry().setFromPoints(
          (task ? this.replay.attempt.referencePaths[task.id] : []).map(
            ([x, z]) => new T.Vector3(x, 5 + aircraft.gearHeight, z),
          ),
        );
        this.trainingReference.computeLineDistances();
      }
      this.trainingReference.visible = this.trace.visible && !!task;
    }
    if (!this.trace.visible || frames.length === this.traceCount) return;
    const n = Math.min(frames.length, 100000);
    for (let i = 0; i < n; i++) this.traceArray.set(frames[i].position, i * 3);
    this.trace.geometry.attributes.position.needsUpdate = true;
    this.trace.geometry.setDrawRange(0, n);
    this.traceCount = frames.length;
  }
  private headStart = (e: PointerEvent) => {
    this.renderer.domElement.focus();
    if (this.cameraMode !== "PILOT VLOS" || e.button !== 0) return;
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    else {
      const lock = this.renderer.domElement.requestPointerLock();
      if (lock) void lock.catch(() => {});
    }
  };
  private headMove = (e: PointerEvent) => {
    if (this.cameraMode === "PILOT VLOS" && document.pointerLockElement === this.renderer.domElement)
      this.lookPilot(e.movementX * 0.003, -e.movementY * 0.003);
  };
  private keyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape" && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
      return;
    }
    if (
      e.code === "Space" &&
      (e.target as HTMLElement).closest("button,summary,a")
    )
      return;
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
      if (e.code === "Space" && !e.repeat) {
        if (this.session?.active) this.session.pause(this.drone);
        else this.drone.paused = !this.drone.paused;
      }
    }
  };
  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private clearKeys = () => {
    this.keys.clear();
    this.inputFocused = false;
    this.input.value = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
    if (
      this.session?.active &&
      ["ACTIVE", "LANDING", "TASK_COMPLETE"].includes(this.session.state)
    ) {
      this.drone.target.copy(this.drone.position);
      this.drone.targetVelocity.set(0, 0, 0);
      this.session.abort("Window focus lost", true);
    }
  };
  private visibility = () => {
    this.last = 0;
    this.drone.accumulator = 0;
    this.keys.clear();
    if (document.hidden) this.clearKeys();
  };
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.stats.error =
      "Mất kết nối đồ họa. Bài bay đã dừng; tải lại trang để khôi phục mô phỏng và kiểm tra bản lưu giữa chừng.";
    this.drone.paused = true;
    this.session?.abort("Graphics context lost", true);
    this.callbacks(this.drone.telemetry(), { ...this.stats });
  };
  private tick = (stamp: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const rawDt = this.last ? (stamp - this.last) / 1000 : 0;
    const dt = Math.min(rawDt, 0.1);
    this.last = stamp;
    if (document.hidden) return;
    const windowFocused = document.hasFocus();
    this.inputFocused =
      windowFocused &&
      !document.activeElement?.matches(
        "input:not([type=checkbox]):not([type=range]):not([type=button]),select,textarea,[contenteditable=true]",
      );
    this.input.poll(
      this.keys,
      this.inputFocused,
      typeof navigator.getGamepads === "function"
        ? navigator.getGamepads()
        : [],
      windowFocused,
    );
    // Keep device readiness live on setup screens without rendering an invisible 3D field.
    if (!this.presentationActive && !this.session?.active && !this.drone.missionActive && !this.replay) {
      if (stamp - this.sample > 150) {
        this.callbacks(this.drone.telemetry(), { ...this.stats });
        this.sample = stamp;
      }
      return;
    }
    const beforeTime = this.drone.time;
    this.drone.advance(rawDt);
    this.physicsSteps += (this.drone.time - beforeTime) / aircraft.fixedDt;
    if (this.replay?.playing) {
      this.replay.time = Math.min(
        this.replay.attempt.frames.at(-1)?.time ?? 0,
        this.replay.time + dt * this.replay.speed,
      );
      if (this.replay.time >= (this.replay.attempt.frames.at(-1)?.time ?? 0))
        this.replay.playing = false;
    }
    const playback = this.replay
      ? replayAt(this.replay.attempt.frames, this.replay.time)
      : null;
    const viewPosition = playback
      ? new T.Vector3().fromArray(playback.position)
      : this.drone.position;
    const viewOrientation = playback
      ? new T.Quaternion().fromArray(playback.orientation)
      : this.drone.orientation;
    const viewYaw = new T.Euler().setFromQuaternion(viewOrientation, "YXZ").y;
    const visualMotors = playback?.motors ?? this.drone.motors;
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
    if (playback) {
      model.position.fromArray(playback.position);
      model.quaternion.fromArray(playback.orientation);
    }
    this.groundGuide.update(model.position, this.groundGuideEnabled && groundGuideAllowed(this.workspace, this.session?.attempt.mode === "Mock Examination", !!this.replay));
    this.updateTrace();
    if (!this.drone.paused || this.replay?.playing) {
      if (this.loadedAirframe) {
        for (let i = 0; i < 4; i++) {
          const rotor = this.loadedAirframe.getObjectByName(`rotor-${i}`);
          if (rotor) rotor.rotation.y += motorSpin[i] * visualMotors[i] * dt;
          const blur = this.loadedAirframe.getObjectByName(
            `blur-${i}`,
          ) as T.Mesh<T.RingGeometry, T.MeshStandardMaterial>;
          if (blur)
            blur.material.opacity = Math.min(
              0.12,
              (visualMotors[i] / 760) * 0.12,
            );
        }
      } else this.airframe.update(visualMotors, dt);
    }
    if (this.cameraMode === "PILOT VLOS")
      applyPilotCamera(
        this.camera,
        this.pilotStation,
        this.headYaw,
        this.headPitch,
      );
    else if (this.cameraMode === "Follow") {
      const offset = new T.Vector3(3, 2.4, 4).applyAxisAngle(
        new T.Vector3(0, 1, 0),
        viewYaw,
      );
      const desired = viewPosition.clone().add(offset);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.lookAt(viewPosition.clone().add(new T.Vector3(0, 0.1, 0)));
    } else if (this.cameraMode === "FPV") {
      this.camera.position.copy(
        new T.Vector3(0, 0.04, -0.4)
          .applyQuaternion(viewOrientation)
          .add(viewPosition),
      );
      this.camera.quaternion.copy(viewOrientation);
    } else if (this.cameraMode === "Top down")
      this.camera.lookAt(this.controls.target);
    else {
      this.controls.update();
      if (this.camera.position.y < 0.2) this.camera.position.y = 0.2;
    }
    if (this.replay?.recordedCamera && playback?.cameraPose) {
      this.controls.enabled = false;
      this.camera.position.fromArray(playback.cameraPose.position);
      this.camera.quaternion.fromArray(playback.cameraPose.orientation);
      this.camera.fov = playback.cameraPose.verticalFov;
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    }
    const environment = this.replay
      ? replayEnvironment(this.replay.attempt, this.replay.time, playback)
      : this.drone.simulation.presentation(alpha);
    this.presentationEnvironment = environment;
    this.atmosphere.update(environment, this.camera);
    const current = environment.current,
      target = environment.target;
    const reflectionChanged =
      Math.abs(current.timeOfDay - this.reflectedAtmosphere.timeOfDay) >= 0.05 ||
      Math.abs(current.cloud - this.reflectedAtmosphere.cloud) >= 0.05 ||
      Math.abs(current.rain - this.reflectedAtmosphere.rain) >= 0.05;
    const settled =
      Math.abs(current.timeOfDay - target.timeOfDay) < 0.04 &&
      Math.abs(current.cloud - target.cloud) < 0.02 &&
      Math.abs(current.rain - target.rain) < 0.02;
    // PMREM shares the visible sky/cloud materials. Coalesce transitions in
    // simulation time, but capture completed READY edits and replay seeks now.
    if (reflectionChanged && (settled || environment.time < this.lastReflectionTime ||
        environment.time - this.lastReflectionTime >= 0.5)) {
      this.refreshEnvironment();
      this.reflectedAtmosphere = { ...current };
      this.lastReflectionTime = environment.time;
    }
    this.grass.update(this.camera, environment);
    this.clumps.update(this.camera, environment);
    this.concrete.userData.wet.value = environment.wetness;
    this.groundMaterial.color
      .set("#91b477")
      .multiplyScalar(1 - environment.wetness * 0.22);
    this.context.children.forEach((mesh) => {
      (
        mesh as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>
      ).material.color.copy(this.groundMaterial.color);
    });
    this.scene.environmentIntensity = 0.06 + 0.025 * environment.current.cloud;
    updateLabels(
      this.labels,
      this.camera,
      this.host.clientWidth,
      this.host.clientHeight,
      this.drone.missionActive ? this.drone.activeWaypoint : "",
    );
    for (const dot of this.markerDots.children) {
      const active =
        dot.userData.id === this.drone.activeWaypoint &&
        this.drone.missionActive;
      dot.scale.setScalar(active ? 1.7 : 1);
      (dot as T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>).material.color.set(
        active ? "#d2e96e" : "#4b7667",
      );
    }
    if (this.pilotMarker.visible && this.pilotLabel) {
      // Technical annotation keeps readable screen size; aircraft scale is untouched.
      const point = this.pilotLabel
        .getWorldPosition(new T.Vector3())
        .applyMatrix4(this.camera.matrixWorldInverse);
      const units =
        (2 * -point.z * Math.tan(T.MathUtils.degToRad(this.camera.fov / 2))) /
        Math.max(1, this.host.clientHeight);
      this.pilotLabel.visible = point.z < 0;
      this.pilotLabel.scale.set(320 * units, 48 * units, 1);
    }
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
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener("pointerdown", this.headStart);
    this.renderer.domElement.removeEventListener("pointermove", this.headMove);
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
        o instanceof T.Line ||
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
    this.atmosphere.dispose();
    this.atmosphere.sun.shadow.map?.dispose();
    this.environmentTarget?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
