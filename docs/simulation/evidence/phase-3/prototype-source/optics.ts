import * as T from "three";
import { localPathGLSL } from "./localRadiance";

// WMO meteorological optical range: a dark target retains 5% contrast at V.
export const MOR_CONTRAST = 0.05;
export function extinctionForVisibility(visibilityMetres: number) {
  return -Math.log(MOR_CONTRAST) / Math.max(1, visibilityMetres);
}
export function transmittance(distanceMetres: number, visibilityMetres: number) {
  return Math.exp(-extinctionForVisibility(visibilityMetres) * Math.max(0, distanceMetres));
}

// Three's FogExp2 is Gaussian in distance. The scene uses Beer–Lambert
// extinction instead; install one common fragment chunk for all fogged
// built-in materials before any of them compile.
let installed = false;
export function installBeerLambertFog() {
  if (installed) return;
  // Three normally composites fog after tone mapping and output transfer.
  // The prototype moves the same built-in fog hook into linear light.
  for (const shader of Object.values(T.ShaderLib)) {
    if (!shader.fragmentShader.includes("#include <fog_fragment>")) continue;
    shader.fragmentShader = shader.fragmentShader.replace(
      /#include <tonemapping_fragment>\s*#include <colorspace_fragment>\s*#include <fog_fragment>/,
      "#include <fog_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>",
    );
  }
  T.ShaderChunk.fog_pars_vertex = T.ShaderChunk.fog_pars_vertex.replace(
    "varying float vFogDepth;", "varying float vFogDepth; varying vec3 vFogRay;");
  T.ShaderChunk.fog_vertex = T.ShaderChunk.fog_vertex.replace(
    "vFogDepth = - mvPosition.z;",
    "vFogDepth = length(mvPosition.xyz); vFogRay = normalize(-mvPosition.xyz);");
  T.ShaderChunk.fog_pars_fragment = T.ShaderChunk.fog_pars_fragment.replace(
    "varying float vFogDepth;", `varying float vFogDepth; varying vec3 vFogRay;\n${localPathGLSL}`);
  T.ShaderChunk.fog_fragment = T.ShaderChunk.fog_fragment.replace(
    /float fogFactor = 1\.0 - exp\( - fogDensity \* fogDensity \* vFogDepth \* vFogDepth \);/,
    `float fogFactor = 1.0 - exp(-fogDensity * vFogDepth);`);
  T.ShaderChunk.fog_fragment = T.ShaderChunk.fog_fragment.replace(
    "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );",
    `vec3 skySun = vec3(0.0, 1.0, 0.0); vec3 skyDirect = vec3(0.0);\n#if defined(STANDARD) && NUM_DIR_LIGHTS > 0\n      skySun = directionalLights[0].direction; skyDirect = directionalLights[0].color;\n#endif\n      vec3 linearAmbient = sRGBTransferEOTF(vec4(fogColor, 1.0)).rgb;\n      vec3 path = localPathRadiance(vFogRay, skySun, linearAmbient, skyDirect);\n      gl_FragColor.rgb = mix(gl_FragColor.rgb, path, fogFactor);`);
  installed = true;
}
