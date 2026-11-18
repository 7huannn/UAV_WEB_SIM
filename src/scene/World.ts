import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Weather } from "../weather/Weather";
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
import { makeDrone } from "./drone";
import { makeGrass } from "./grass";
import { makeGrassClumps } from "./grassClumps";
import { makeAtmosphere } from "./atmosphere";
import { missions, type MissionId } from "../simulation/missions";
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
  private environmentKey = "15.50:0.12";
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
    this.controls.maxDistance = 160;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.target.set(0, 0, 0);
    this.atmosphere = makeAtmosphere(this.scene);
    this.atmosphere.update(this.weather, 0, this.camera);
    this.environmentScene.add(
      this.atmosphere.sky.clone(),
      this.atmosphere.clouds.clone(),
    );
    this.pmrem = new T.PMREMGenerator(this.renderer);
    this.refreshEnvironment();
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
    // Optional atmospheric context matte. No collider/vegetation; official ground remains 60×42m.
    this.context = new T.Group();
    this.context.name = "Visual context only · noninteractive";
    const contextMat = this.groundMaterial.clone();
    contextMat.transparent = true;
    contextMat.depthWrite = false;
    contextMat.onBeforeCompile = (shader) => {
      this.groundMaterial.onBeforeCompile(shader, this.renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        gl_FragColor.a*=1.-smoothstep(35.+cameraPosition.y*4.,200.+cameraPosition.y*4.,length(vTurfWorld.xz-cameraPosition.xz));
      `,
      );
    };
    for (const [w, h, x, z] of [
      [600, 279, 0, -160.5],
      [600, 279, 0, 160.5],
      [270, 42, -165, 0],
      [270, 42, 165, 0],
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
  private refreshEnvironment() {
    const environment = this.pmrem.fromScene(
      this.environmentScene,
      0.04,
      0.1,
      1000,
    );
    this.scene.environment = environment.texture;
    this.environmentTarget?.dispose();
    this.environmentTarget = environment;
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
  setLabels(v: boolean) {
    this.labels.visible = v;
  }
  selectMission(id: MissionId) {
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
    } else if (this.cameraMode === "Top down")
      this.camera.lookAt(this.controls.target);
    else {
      this.controls.update();
      if (this.camera.position.y < 0.2) this.camera.position.y = 0.2;
    }
    this.atmosphere.update(this.weather, this.drone.time, this.camera);
    const current = this.weather.current,
      target = this.weather.target;
    const environmentKey = `${target.timeOfDay.toFixed(2)}:${target.cloud.toFixed(2)}`;
    // Refresh reflections once a weather/time transition settles, never every frame.
    if (
      environmentKey !== this.environmentKey &&
      Math.abs(current.cloud - target.cloud) < 0.02 &&
      Math.abs(current.timeOfDay - target.timeOfDay) < 0.04
    ) {
      this.refreshEnvironment();
      this.environmentKey = environmentKey;
    }
    this.grass.update(this.camera);
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
      .set("#91b477")
      .multiplyScalar(1 - this.weather.wetness * 0.22);
    this.context.children.forEach((mesh) => {
      (
        mesh as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>
      ).material.color.copy(this.groundMaterial.color);
    });
    this.scene.environmentIntensity = 0.06 + 0.025 * this.weather.current.cloud;
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
    this.atmosphere.dispose();
    this.atmosphere.sun.shadow.map?.dispose();
    this.environmentTarget?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
