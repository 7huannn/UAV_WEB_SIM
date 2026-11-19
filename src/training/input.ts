export const channels = ["throttle", "yaw", "pitch", "roll"] as const;
export type Channel = (typeof channels)[number];
export type RC = Record<Channel, number>;
export const neutral = (): RC => ({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });
export type AxisCalibration = {
  axis: number;
  min: number;
  center: number;
  max: number;
  inverted: boolean;
  deadzone: number;
};
export type ControllerProfile = {
  version: 1;
  name: string;
  axes: Record<Channel, AxisCalibration>;
  hardwareVerified: boolean;
};
export const mode2 = (): ControllerProfile => ({
  version: 1,
  name: "Mode 2 · browser gamepad (verify axes)",
  hardwareVerified: false,
  axes: {
    throttle: {
      axis: 1,
      min: -1,
      center: 0,
      max: 1,
      inverted: true,
      deadzone: 0.06,
    },
    yaw: {
      axis: 0,
      min: -1,
      center: 0,
      max: 1,
      inverted: false,
      deadzone: 0.06,
    },
    pitch: {
      axis: 3,
      min: -1,
      center: 0,
      max: 1,
      inverted: true,
      deadzone: 0.06,
    },
    roll: {
      axis: 2,
      min: -1,
      center: 0,
      max: 1,
      inverted: false,
      deadzone: 0.06,
    },
  },
});
export function validController(p: ControllerProfile) {
  return (
    p?.version === 1 &&
    typeof p.name === "string" &&
    channels.every((k) => {
      const a = p.axes?.[k];
      return (
        a &&
        Number.isInteger(a.axis) &&
        a.axis >= 0 &&
        a.axis < 32 &&
        [a.min, a.center, a.max, a.deadzone].every(Number.isFinite) &&
        a.min < a.center &&
        a.center < a.max &&
        a.min >= -1 &&
        a.max <= 1 &&
        a.deadzone >= 0 &&
        a.deadzone < 0.5 &&
        typeof a.inverted === "boolean"
      );
    })
  );
}
export function normalizeAxis(raw: number, c: AxisCalibration) {
  if (!Number.isFinite(raw) || !c || !(c.min < c.center && c.center < c.max))
    return 0;
  const n = Math.max(
    -1,
    Math.min(
      1,
      (raw - c.center) / (raw < c.center ? c.center - c.min : c.max - c.center),
    ),
  );
  const value =
    Math.abs(n) <= c.deadzone
      ? 0
      : (Math.sign(n) * (Math.abs(n) - c.deadzone)) / (1 - c.deadzone);
  return c.inverted ? -value : value;
}
export function mapAxes(axes: readonly number[], p: ControllerProfile): RC {
  if (
    !validController(p) ||
    channels.some((k) => !Number.isFinite(axes[p.axes[k].axis]))
  )
    return neutral();
  return Object.fromEntries(
    channels.map((k) => [k, normalizeAxis(axes[p.axes[k].axis], p.axes[k])]),
  ) as RC;
}
export function keyboardRC(keys: Set<string>): RC {
  const pair = (positive: string, negative: string) =>
    Number(keys.has(positive)) - Number(keys.has(negative));
  return {
    throttle: pair("KeyJ", "KeyK"),
    yaw: pair("KeyE", "KeyQ"),
    pitch: pair("KeyW", "KeyS"),
    roll: pair("KeyD", "KeyA"),
  };
}
export class ControllerInput {
  private selectedSource: "Keyboard" | "Gamepad" = "Keyboard";
  get source() {
    return this.selectedSource;
  }
  set source(source: "Keyboard" | "Gamepad") {
    if (source === this.selectedSource) return;
    this.selectedSource = source;
    this.connected = source === "Keyboard";
    this.device =
      source === "Keyboard"
        ? "Keyboard fallback"
        : "No browser gamepad exposed";
    this.raw = [];
    this.buttons = [];
    this.value = neutral();
    this.fault = source === "Gamepad" ? "Controller disconnected" : "";
  }
  profile = mode2();
  index = 0;
  connected = false;
  device = "Keyboard fallback";
  raw: number[] = [];
  buttons: number[] = [];
  value = neutral();
  fault = "";
  poll(
    keys: Set<string>,
    focused: boolean,
    pads: readonly (Gamepad | null)[] = [],
    windowFocused = focused,
  ) {
    this.fault = "";
    if (this.source === "Gamepad") {
      const pad = pads[this.index];
      this.connected = !!pad?.connected;
      this.device = pad?.id ?? "No browser gamepad exposed";
      this.raw = pad ? [...pad.axes] : [];
      this.buttons = pad ? pad.buttons.map((b) => b.value) : [];
      if (!this.connected) this.fault = "Controller disconnected";
      else if (
        !validController(this.profile) ||
        channels.some(
          (k) => !Number.isFinite(this.raw[this.profile.axes[k].axis]),
        )
      )
        this.fault = "Invalid calibration or unavailable axis";
      this.value =
        focused && !this.fault ? mapAxes(this.raw, this.profile) : neutral();
    } else {
      this.connected = true;
      this.device = "Keyboard fallback";
      this.value = focused ? keyboardRC(keys) : neutral();
    }
    if (!focused) {
      this.value = neutral();
      if (!windowFocused) this.fault = "Input focus lost";
    }
    return this.value;
  }
}

export function flightDemand(rc: RC, heading: number) {
  const bounded = (v: number) =>
    Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  const roll = bounded(rc.roll) * 2,
    forward = bounded(rc.pitch) * 2;
  return {
    worldVelocity: [
      roll * Math.cos(heading) - forward * Math.sin(heading),
      bounded(rc.throttle) * 2,
      -roll * Math.sin(heading) - forward * Math.cos(heading),
    ] as [number, number, number],
    yawRate: -bounded(rc.yaw) * 0.7,
  };
}
