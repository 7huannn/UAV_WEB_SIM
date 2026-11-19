// Illustrative 15kg airframe. These are not calibrated flight-test parameters.
// arm is each body X/Z motor offset in m; dragArea is effective Cd*A in m².
// torqueRatio has units m; airDensity is fixed kg/m³. Do not infer measured geometry.
export const aircraft = {
  mass: 15,
  inertia: [0.65, 1.05, 0.65] as const,
  arm: 0.48,
  kThrust: 0.00019,
  torqueRatio: 0.025,
  maxOmega: 760,
  motorTimeConstant: 0.045,
  dragArea: [0.32, 0.55, 0.32] as const,
  airDensity: 1.225,
  gearHeight: 0.32,
  gravity: 9.80665,
  fixedDt: 1 / 250,
};
export const motorPositions = [
  [0.48, 0.48],
  [-0.48, 0.48],
  [-0.48, -0.48],
  [0.48, -0.48],
] as const;
export const motorSpin = [1, -1, 1, -1] as const;
