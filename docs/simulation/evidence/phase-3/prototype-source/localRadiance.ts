// Test-only P3-v2 prototype. This exact linear-light source term is used by
// the sky and by the built-in material fog path in the isolated build.
export const localPathGLSL = `
vec3 localPathRadiance(vec3 viewRay, vec3 sunRay, vec3 ambient, vec3 direct) {
  float mu = clamp(dot(normalize(viewRay), normalize(sunRay)), -1.0, 1.0);
  float rayleighPhase = 0.75 * (1.0 + mu * mu);
  const float g = 0.55;
  float miePhase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  float clarity = clamp(length(direct) / 3.0, 0.0, 1.0);
  vec3 molecular = ambient * vec3(0.23, 0.46, 0.80) * rayleighPhase * (0.15 + 0.55 * clarity);
  vec3 aerosol = ambient * (0.44 - 0.22 * clarity) + direct * (0.025 * miePhase);
  return molecular + aerosol;
}`;

export const localSkyFragment = `
varying vec3 vWorldPosition;
uniform vec3 uAmbient, uDirect, uSun;
uniform float uBeta;
${localPathGLSL}
void main() {
  vec3 ray = normalize(vWorldPosition - cameraPosition);
  float opticalDistance = 220.0 / max(ray.y, 0.01);
  float transmittance = exp(-uBeta * opticalDistance);
  vec3 radiance = localPathRadiance(ray, uSun, uAmbient, uDirect) * (1.0 - transmittance);
  float sunDisc = smoothstep(cos(0.0052), cos(0.0042), dot(ray, normalize(uSun)));
  radiance += uDirect * (8.0 * sunDisc * exp(-uBeta * 220.0 / max(uSun.y, 0.05)));
  gl_FragColor = vec4(radiance, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
