# UAV Arena — Flight laboratory

A local, browser-native 3D UAV competition simulator. The central court is **45 × 27 m concrete**, surrounded by **60 × 42 m natural turf**. Geometry is traced from the supplied diagram; ancillary facilities are excluded.

## Run

Requires Node.js 22.12+ (verified with 24.15.0), npm and a WebGL2-capable browser.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. It starts at `http://localhost:5173` and selects the next port if occupied. All textures, the original drone GLB and the reference image ship locally. The app needs no account, API key, remote CDN or simulation backend.

```sh
npm run build       # strict TypeScript check + production assets in dist/
npm run preview     # serve the production build locally
npm test            # native Node geometry/physics checks, no browser needed
```

## Fly

1. Arm motors, then **Take off** for a controlled climb to a 5 m landing-gear altitude. Take off also arms automatically when disarmed.
2. **Hold** captures the current position. **Land** descends and disarms on contact. Disarming in flight removes thrust; it does not freeze the aircraft.
3. **Start mission** approaches the central crossing M7, then follows the diagram's circle/tangent figure-eight at 2.1 m/s. Pause mission holds position. Start/Resume and Hold provide mission continuation/cancellation.
4. WASD command world-frame horizontal velocity (W=−Z, D=+X); R/F climb/descend; Q/E change yaw. Commands go through the controller and rotor dynamics. Release keys to hold the resulting position. Space pauses the entire simulation.
5. Reset returns the aircraft to landing zone H. A hard or severely tilted landing triggers crash/disarm; Reset recovers.

Mouse drag/scroll orbit and zoom in Overview, Orbit and Ground. Follow tracks the aircraft; FPV follows its full attitude. Top down includes a 10 m scale bar for reference checks. Flight path, engineering markers and collider overlays can be toggled. The model tab exposes RPM, individual thrusts, world position, body rates and local wind.

## Environment and graphics

Six blendable presets: clear skies, partly cloudy, overcast, light rain, heavy rain and wind/gusts. Expand the environment card to adjust wind, direction, gusts, turbulence, cloud cover, rain, visibility and time of day. **Direction is wind towards**, measured from world +X towards +Z. Rain intensity is normalized 0–1, not measured mm/h. Rain affects visuals only.

The same deterministic wind field drives body-relative drag, grass bending, rain slant and cloud movement. Sunlight, sky scattering, ray-marched cloud density, fog, PBR roughness and surface wetness respond to weather. Concrete uses actual 2K albedo/normal/roughness maps with restrained joints and macro variation. Turf combines PBR ground with curved instanced background blades and licensed Poly Haven tuft geometry near the camera. The tufts retain authored leaf folds, 1K diffuse/normal/roughness/alpha maps, instancing, wind bending and alpha-tested shadows; density and shadow casting follow quality settings. The original detailed airframe is exported to a local GLB, with named independently spinning rotors and static meshes merged by material.

Low/Medium/High/Ultra use 25k/70k/130k/220k grass blades, pixel-ratio caps and 1K/1K/2K/4K shadow maps. Detected software renderers default to Low. Camera-local tuft instances add density near the viewer, with far blades reduced at low camera heights. Cloud ray-march steps also scale with quality. These are selectable quality limits, **not universal FPS promises**. The footer reports measured frame rate, actual simulated steps per wall second and draw calls. Severe frame stalls cap catch-up to 100 ms per frame; simulated time slows and the footer reports it. Hidden-tab time is discarded instead of causing a catch-up burst.

## Physics and coordinate convention

- Meters, seconds, kilograms, radians; X follows the 45 m edge, Z the 27 m edge, Y points up. Court center(0,0,0); concrete topY=0, turfY=−0.035.
- Quaternion maps body coordinates to world. Body+Y is rotor thrust, +X is right and+Z is rear. Angular velocity is body-frame; rendered FPV looks body−Z.
- 250 Hz semi-implicit force/velocity/position integration and normalized quaternion integration, independent of renderer cadence. Each motor has lag, quadratic rotor-speed thrust, bounds and alternating reaction torque.
- Cascaded position/velocity→attitude→body-rate PID with output limits and bounded integrals. Gravity, diagonal inertia, gyroscopic torque, rotational damping and body-frame quadratic drag are applied before integration.
- Four landing-foot contacts against finite concrete/turf heights, penetration correction, low restitution and Coulomb friction. Paint, blades and rain have no colliders.
- 15 kg demonstrator parameters are in `src/simulation/parameters.ts`. **Not calibrated to a real aircraft**; no digital-twin, sensor-fidelity or engineering-validation claim.

## Reference and assumptions

The upright reference is `assets/reference/arena-layout.png`. Original JPEG is preserved. `src/arena/arenaGeometry.json` holds dimensions, line widths, boundaries, lobe centers, landing areas and markers. `docs/ASSUMPTIONS.md` records calibration, estimated neck curves/dash spacing, model and collision limitations. V2 is the collection of white corridor boundaries, not a single 38×21 m rectangle. V1 is white 5 cm; V2 white 10 cm; V3 dashed yellow 10 cm. Diagram labels are optional overlays, not oversized painted annotations.

See [ASSET_LICENSES.md](ASSET_LICENSES.md) for CC0 sources and provenance. To restore downloaded maps or regenerate the original airframe:

```sh
python scripts/download-assets.py
node --import tsx scripts/export-drone.ts
```

## Verification

Headless tests cover dimension calibration, analytic route length/containment, true paint-mesh widths and mitered V1 extent, freefall/collision, balanced thrust, controlled takeoff/hover/movement/landing, motor bounds, wind compensation, seeded replay, fixed-clock cadence, pause and a complete mission lap.

Browser checks use installed Chrome and Playwright:

```sh
# Start the dev server first. Set the URL to its actual port.
UAV_URL=http://localhost:5174 npm run test:browser
# Optional: CHROME_PATH=/path/to/chrome, or UAV_HARDWARE=1 to omit forced SwiftShader.
```

`node scripts/visual-check.mjs` refreshes the ground and grass High-quality views after material/vegetation changes.

The recorded 30-frame software-renderer profile averaged 3.04 FPS on Low at 1600×1000 (Chrome 147/ANGLE SwiftShader). This is a software fallback limit, not a hardware GPU result. Full photorealistic visual acceptance remains open.

The browser test saves actual rendered screenshots in `docs/screenshots/` and writes `docs/browser-evidence.json`. Long scenarios forward-step the **same force-based 250 Hz integrator** to avoid waiting for slow software-renderer wall time. The test never assigns XYZ to fake flight. A screenshot proves a render occurred; photorealistic acceptance still needs visual judgment.

## Known limits

The reference is a low-resolution drawing: small neck dimensions, exact dash spacing and minor marker placement remain estimates. Ground contact is a simplified height-field/foot model, not full body/propeller collision. Telemetry is ideal simulation state, not noisy sensors. Wetness uses PBR environment reflection/specular response, not planar ray tracing. Clouds use a bounded ray-march approximation. Near-camera tufts fade to the ground/blade layer with distance; the finite patch and texture detail can still be apparent in closeups. The finite field deliberately has no surrounding buildings or landscape.

This is an implemented simulator undergoing visual acceptance, **not a claim that every photorealism criterion is met**. Check the latest `AGENT_HANDOFF_CONTEXT.md` for actual build/browser evidence, remaining gaps and exact next actions.
