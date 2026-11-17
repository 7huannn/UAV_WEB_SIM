import * as T from "three";
import { Sky } from "three/addons/objects/Sky.js";
import type { Weather } from "../weather/Weather";
import { seeded } from "./grass";
const noise = `
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise3(p)*a;p=p*2.03+13.1;a*=.5;}return v;}
`;
export function makeAtmosphere(scene: T.Scene) {
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
      uSteps: { value: 14 },
      uCoverage: { value: 0.12 },
      uWind: { value: new T.Vector3() },
      uSun: { value: new T.Vector3() },
      uRain: { value: 0 },
    },
    vertexShader:
      "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader: `
    varying vec3 vWorld;uniform float uTime,uCoverage,uRain,uSteps;uniform vec3 uWind,uSun;${noise}
    void main(){vec3 rd=normalize(vWorld-cameraPosition);if(rd.y<.015)discard;
      float t0=max(0.,(65.-cameraPosition.y)/rd.y),t1=(100.-cameraPosition.y)/rd.y;
      float alpha=0.;vec3 col=vec3(0.);float stepSize=(t1-t0)/uSteps;float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      for(int i=0;i<24;i++){if(float(i)>=uSteps)break;
        float t=t0+(float(i)+jitter)*stepSize;vec3 p=cameraPosition+rd*t;p.xz+=uWind.xz*uTime*.35;
        float h=clamp((p.y-65.)/35.,0.,1.);float shape=smoothstep(0.,.2,h)*(1.-smoothstep(.65,1.,h));
        float n=fbm(p*.027);float density=smoothstep(.72-uCoverage*.45,.9-uCoverage*.32,n)*shape;
        float shade=clamp(fbm((p+uSun*8.)*.027)-n+.65,.2,1.);
        vec3 tint=mix(vec3(.53,.59,.63),vec3(1.05,1.04,1.0),shade)*(1.-uRain*.28);
        float a=1.-exp(-density*stepSize*.15);col+=(1.-alpha)*tint*a;alpha+=(1.-alpha)*a;
      }
      float horizon=smoothstep(.015,.16,rd.y);gl_FragColor=vec4(col/max(alpha,.001),alpha*horizon);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
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
  return {
    sky,
    sun,
    hemi,
    cloudMaterial,
    rain,
    update: (weather: Weather, time: number, camera: T.Camera) => {
      const w = weather.current,
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
      sun.intensity = (3.3 - w.cloud * 2.8) * (0.6 + elevation * 0.4);
      sun.color.setHSL(
        0.1 - elevation * 0.025,
        0.18 + (1 - elevation) * 0.25,
        0.88,
      );
      hemi.intensity = 1.0 + w.cloud * 0.5;
      hemi.color.set(w.cloud > 0.7 ? "#ccd6d8" : "#c0d9ed");
      const fog = scene.fog as T.FogExp2;
      fog.color.set(w.cloud > 0.7 ? "#a9b9bd" : "#cbdbe0");
      fog.density = (1 / Math.max(50, w.visibility)) * 0.75;
      const wind = weather.windAt(time);
      cloudMaterial.uniforms.uTime.value = time;
      cloudMaterial.uniforms.uCoverage.value = w.cloud;
      cloudMaterial.uniforms.uWind.value.copy(wind);
      cloudMaterial.uniforms.uSun.value.copy(sunDirection);
      cloudMaterial.uniforms.uRain.value = w.rain;
      rain.visible = w.rain > 0.015;
      if (rain.visible) {
        const count = Math.floor(rainCount * w.rain);
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
