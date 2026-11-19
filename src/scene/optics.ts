import * as T from "three";

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
  const chunk = T.ShaderChunk.fog_fragment;
  const gaussian = "fogDensity * fogDensity * vFogDepth * vFogDepth";
  if (chunk.includes("fogDensity * vFogDepth")) { installed = true; return; }
  if (!chunk.includes(gaussian)) throw new Error("Unsupported Three fog shader");
  T.ShaderChunk.fog_fragment = chunk.replace(gaussian, "fogDensity * vFogDepth");
  installed = true;
}
