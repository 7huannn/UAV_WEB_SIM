import * as T from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { sampleWind } from "../weather/Weather";
import { cloudReference, type EnvironmentSnapshot } from "../simulation/Simulation";
import { seeded } from "./grass";
import { extinctionForVisibility, installBeerLambertFog } from "./optics";
// Deterministic periodic value-noise atlas, filtered/mipmapped by the GPU.
function cloudNoise() {
  const size = 256,
    data = new Uint8Array(size * size),
    rand = seeded(617);
  const values = Array.from({ length: size * size }, () => rand() * 255);
  for (let i = 0; i < data.length; i++) data[i] = values[i];
  const texture = new T.DataTexture(data, size, size, T.RedFormat);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
export function makeAtmosphere(scene: T.Scene) {
  installBeerLambertFog();
  const sky = new Sky();
  sky.scale.setScalar(900);
  sky.material.uniforms.turbidity.value = 3;
  sky.material.uniforms.rayleigh.value = 1.6;
  sky.material.uniforms.mieCoefficient.value = 0.006;
  if (sky.material.uniforms.cloudCoverage)
    sky.material.uniforms.cloudCoverage.value = 0;
  sky.renderOrder = -20;
  scene.add(sky);
  const cloudMaterial = new T.ShaderMaterial({
    side: T.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSteps: { value: 5 },
      uCoverage: { value: 0.12 },
      uWind: { value: new T.Vector3() },
      uSun: { value: new T.Vector3() },
      uRain: { value: 0 },
    },
    vertexShader:
      "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader: `
    varying vec3 vWorld;uniform float uCoverage,uRain,uSteps;uniform vec3 uSun;
    uniform sampler2D uNoise;uniform vec2 uOffset;
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      vec2 uv=(i+.5)/256.;
      return mix(mix(texture2D(uNoise,uv).r,texture2D(uNoise,uv+vec2(1./256.,0)).r,f.x),mix(texture2D(uNoise,uv+vec2(0,1./256.)).r,texture2D(uNoise,uv+vec2(1./256.)).r,f.x),f.y);
    }
    float mass(vec2 p){float n=0.,a=.54;for(int i=0;i<5;i++){if(float(i)>=uSteps)break;n+=noise(p)*a;p=p*2.02+vec2(17.3,9.1);a*=.49;}return n;}
    void main(){
      vec3 rd=normalize(vWorld-cameraPosition);if(rd.y<.008)discard;
      float alpha=0.;vec3 color=vec3(0.);
      float threshold=mix(.76,.12,uCoverage);
      // Three coherent height shells suggest billowing depth without a screen-space ray march.
      for(int layer=0;layer<3;layer++){
        float h=float(layer),altitude=190.+h*80.;
        vec2 p=(cameraPosition.xz+rd.xz*(altitude-cameraPosition.y)/max(rd.y,.008)-uOffset)*.0017;
        float n=mass(p);
        float density=smoothstep(threshold+.015*h,threshold+.13+.02*h,n);
        float lighting=mass(p+uSun.xz*.24)-n;
        float edge=1.-smoothstep(threshold,threshold+.16,n);
        vec3 bottom=vec3(.62,.68,.72),top=vec3(1.9,1.87,1.78);
        vec3 col=mix(bottom,top,clamp(.32+h*.23+lighting*3.+edge*.25,0.,1.));
        col*=1.-uRain*.36;
        float a=density*.78;
        color+=(1.-alpha)*col*a;alpha+=(1.-alpha)*a;
      }
      color/=max(alpha,.001);
      color=mix(vec3(.78,.83,.86)*(1.-uRain*.18),color,smoothstep(.01,.17,rd.y));
      alpha*=smoothstep(.008,.055,rd.y)*smoothstep(0.,.08,uCoverage);
      gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  cloudMaterial.uniforms.uNoise = { value: cloudNoise() };
  cloudMaterial.uniforms.uOffset = { value: new T.Vector2() };
  const clouds = new T.Mesh(new T.SphereGeometry(700, 32, 16), cloudMaterial);
  clouds.renderOrder = -10;
  scene.add(clouds);
  const sun = new T.DirectionalLight("#fff0d9", 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -38,
    right: 38,
    top: 32,
    bottom: -32,
    near: 1,
    far: 160,
  });
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2;
  scene.add(sun);
  const hemi = new T.HemisphereLight("#c5def0", "#7c7658", 2.0);
  scene.add(hemi);
  const rainCount = 7000,
    positions = new Float32Array(rainCount * 6),
    seeds = new Float32Array(rainCount * 3),
    rand = seeded(182);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
  const rainGeo = new T.BufferGeometry();
  rainGeo.setAttribute("position", new T.BufferAttribute(positions, 3));
  const rainMat = new T.LineBasicMaterial({
    color: "#d4e4e8",
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const rain = new T.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);
  scene.fog = new T.FogExp2("#c5d6da", 0.0018);
  const sunDirection = new T.Vector3();
  const clearAmbient = new T.Color("#c0d9ed"),
    overcastAmbient = new T.Color("#ccd6d8");
  const clearFog = new T.Color("#cbdbe0"),
    overcastFog = new T.Color("#a9b9bd");
  const wind = new T.Vector3(), rainCentre = new T.Vector3();
  let rainBudget = 3500;
  return {
    sky,
    clouds,
    sun,
    hemi,
    cloudMaterial,
    rain,
    setQuality: (quality: string) => {
      cloudMaterial.uniforms.uSteps.value =
        { Low: 3, Medium: 4, High: 5, Ultra: 5 }[quality] ?? 5;
      rainBudget =
        { Low: 1600, Medium: 3000, High: 5000, Ultra: 7000 }[quality] ?? 5000;
    },
    dispose: () => {
      cloudMaterial.uniforms.uNoise.value.dispose();
    },
    update: (environment: EnvironmentSnapshot, camera: T.Camera) => {
      const time = environment.time;
      const w = environment.current,
        elevation = Math.max(
          0.08,
          Math.sin(((w.timeOfDay - 6) / 12) * Math.PI),
        );
      const az = (w.timeOfDay - 12) * 0.15 - 0.7;
      sunDirection
        .set(Math.sin(az) * 0.7, elevation, Math.cos(az) * 0.8)
        .normalize();
      sun.position.copy(sunDirection).multiplyScalar(65);
      sky.material.uniforms.sunPosition.value.copy(sunDirection);
      sky.material.uniforms.turbidity.value = 3 + w.cloud * 6;
      sky.material.uniforms.rayleigh.value = 1.6 - w.cloud * 0.8;
      sun.intensity =
        (3.1 * (1 - Math.pow(w.cloud, 1.7)) + 0.12) * (0.6 + elevation * 0.4);
      sun.color.setHSL(
        0.1 - elevation * 0.025,
        0.18 + (1 - elevation) * 0.25,
        0.88,
      );
      hemi.intensity = 1.25 + w.cloud * 0.6;
      hemi.color
        .copy(clearAmbient)
        .lerp(overcastAmbient, T.MathUtils.smoothstep(w.cloud, 0.35, 0.95));
      const fog = scene.fog as T.FogExp2;
      fog.color
        .copy(clearFog)
        .lerp(overcastFog, T.MathUtils.smoothstep(w.cloud, 0.35, 0.95));
      fog.density = extinctionForVisibility(w.visibility);
      cloudMaterial.uniforms.uOffset.value.fromArray(environment.cloudOffset);
      sampleWind(w, environment.seed, time, cloudReference, wind);
      cloudMaterial.uniforms.uTime.value = time;
      cloudMaterial.uniforms.uCoverage.value = w.cloud;
      cloudMaterial.uniforms.uWind.value.copy(wind);
      cloudMaterial.uniforms.uSun.value.copy(sunDirection);
      cloudMaterial.uniforms.uRain.value = w.rain;
      rain.visible = w.rain > 0.015;
      if (rain.visible) {
        // P1 bulk sample follows the current volume centre; trajectories remain RAIN-01 (Phase 4).
        rainCentre.set(camera.position.x * 0.35, 15, camera.position.z * 0.35);
        sampleWind(w, environment.seed, time, rainCentre, wind);
        const count = Math.floor(rainBudget * w.rain);
        rainGeo.setDrawRange(0, count * 2);
        rainMat.opacity = 0.16 + w.rain * 0.22;
        for (let i = 0; i < count; i++) {
          const a = i * 6,
            s = i * 3;
          const phase = (seeds[s + 1] * 30 - time * 18) % 30;
          const y = (phase + 30) % 30;
          const x =
            ((seeds[s] * 68 + (wind.x * (30 - y)) / 18) % 68) -
            34 +
            camera.position.x * 0.35;
          const z =
            ((seeds[s + 2] * 48 + (wind.z * (30 - y)) / 18) % 48) -
            24 +
            camera.position.z * 0.35;
          positions[a] = x;
          positions[a + 1] = y;
          positions[a + 2] = z;
          positions[a + 3] = x - wind.x * 0.017;
          positions[a + 4] = y + 0.3;
          positions[a + 5] = z - wind.z * 0.017;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
