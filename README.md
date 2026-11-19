# UAV Arena — Practical pilot training

A local, browser-native multirotor practical-training simulator with a Vietnamese-first learner interface (v0.3.0). The central court is **45 × 27 m concrete**, surrounded by **60 × 42 m natural turf**. Geometry is traced from the supplied diagram; ancillary facilities are excluded.

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

## Individual practice and test flights

The Vietnamese interface opens on a home hub with one primary **Bắt đầu luyện tập** action and secondary access to **Thi thử**, **Xem lại bài bay**, and **Cài đặt**. There is no instructor workspace or permanent destination menu. A contextual **Trang chủ** control returns home; a compact closed menu switches between idle tasks.

1. Choose one of four illustrated exercises, read its objectives, then select **Vào sân bay**. The foundations exercise is the default for first-time users. Input selection and an optional name are disclosed only when needed. Adjust weather inside the map after entering.
2. The simulator reports field loading and controller availability automatically. No physical pre-flight or post-flight checklist is required. **Bắt đầu bay** arms and starts the manual session together, retaining neutral-input, device-connection and starting-position checks. The simulation clock remains paused while reading the introductory controls.
3. W/S moves forward/backward relative to the aircraft, A/D sideways, J/K climbs/descends, Q/E turns. Release to hold the resulting target. The existing 250 Hz PID/motor/force model remains unchanged; this is a position-stabilized velocity mode, not direct motor throttle or attitude control.
4. The field fills the flight screen. The current objective, essential telemetry, pause/resume and emergency stop remain accessible. Camera/head-look and optional training aids are contextual. Space pauses; text entry, window blur and controller faults neutralize input and interrupt unsafe continuation. Looking around never moves the fixed pilot station or changes aircraft scale.
5. Complete the exercise, choose **Bắt đầu hạ cánh thủ công**, return to H, descend and **Tắt động cơ** on stable contact. Once propulsion stops, **Hoàn tất bài bay** opens the debrief. Aborted and interrupted flights receive distinct results and retain their records.
6. Leaving an active session pauses it and offers staying or saving before returning home. An unstarted session can return to exercise selection directly. Finished sessions offer replay, a fresh exercise, and JSON backup; failed local saves offer retry/export.
7. **Xem lại bài bay** lists local recordings and supports 3D playback, timeline scrubbing, speed, camera selection, telemetry plots, personal notes and JSON/CSV/Vietnamese report export. Original finalized recordings remain immutable. Legacy records, including their original checklist fields and annotations, still import unchanged.

**Thi thử** fixes the pilot view and selected profile and disables training aids. Choose conditions directly on the map before **Bắt đầu bay**; they lock for the entire started attempt, including pauses. Scores are practice feedback, not official examination results.

**Cài đặt** groups controls and graphics. Controller calibration and saved mappings remain available. Advanced settings retain pilot setback/eye height/FOV and technical overlays. All assets work locally, with no account, cloud service, remote fonts or new runtime dependencies. The UI respects reduced motion and supports keyboard navigation, focus restoration, responsive layouts and browser zoom.

Attempts checkpoint to IndexedDB every 10 simulated seconds, seal on completion/abort, and serialize writes to avoid stale checkpoints replacing final records. Recording is bounded to 600 simulated seconds; JSON imports are limited to 100 MB and validate schema, finite values, timestamps, quaternions and checksum. Export backups because browser storage can be cleared or quota-limited.

Fresh H resets and READY weather previews initialize current conditions and wetness consistently (wetness equals normalized rain in the existing surface model). Pause freezes environmental evolution; resume discards paused wall time. New recordings include versioned environment snapshots for deterministic seeking. Legacy imports remain unchanged and replay displays an approximate-environment notice because their original wind phase/cloud transport was not recorded. See the [current simulation handoff](docs/simulation/PHASE_HANDOFF.md) and [Phase 2 physics report](docs/simulation/PHASE_2_HANDOFF.md) for evidence and limits; later atmosphere/rain phases remain pending review.

## Reference demonstrations

Open **Trang chủ → Tìm hiểu trước khi bay → Xem bay mẫu tự động** to observe the preserved figure-eight or M1–M5 automatic course. Select a mission and camera, then start, pause/resume or stop the demonstration. **Đặt lại về H** recovers the aircraft. Automatic flight stays separate from manual task evaluation and never counts as learner performance.

Overview, Orbit and Ground support orbit/zoom; Follow tracks the aircraft, FPV follows its attitude, and Top down provides an overhead view. The fixed pilot station remains at the existing provisional location and field geometry is unchanged.

## Environment and graphics

Six blendable presets: clear skies, partly cloudy, overcast, light rain, heavy rain and wind/gusts. Open **Điều kiện bay** in the map’s control dock for 0–10 wind/rain levels. Practice flights pause while editing; changes blend through the existing weather model after resuming, preserving position and progress. Demonstration conditions can change live. **Tinh chỉnh môi trường** retains all presets and numerical wind, direction, gusts, turbulence, cloud cover, rain, visibility and time controls. Starting-weather metadata updates while READY; later changes are logged without overwriting the original starting conditions. **Direction is wind towards**, measured from world +X towards +Z. Rain intensity is normalized 0–1, not measured mm/h. Rain affects visuals only.

One shared deterministic wind sampler drives body-relative drag at the aircraft, vegetation at fixed tile centres, and declared bulk samples for rain/clouds. A fixed-step coordinator owns environmental time and cloud transport; render calls do not accumulate weather history. Sunlight, sky scattering, three stable cloud-height layers, continuous fog/ambient colors, PBR roughness and surface wetness respond to weather. Cloud structures use a seeded filtered noise atlas with no screen-space jitter or per-frame regeneration. Sky/cloud reflections refresh once a weather/time transition settles, rather than on every frame.

Concrete retains the local 2K albedo/normal/roughness maps, now sampled at micro/mid/macro scales. Its shallow 3.5 cm edge includes a 5 mm bevel and narrow soil/contact band; paint sits 1.5–2 mm above the surface with polygon offset. Wet roughness is restrained to avoid a mirror finish.

Turf uses deterministic **world-anchored tiles**: authored Poly Haven tufts in 2 m tiles fade over 2.5–5.5 m; simple three-blade clusters in 4 m tiles fade over 13–23 m; multi-scale PBR turf covers the far field. All representations share weather wind and wetness. Instance transforms never move with the camera. Tile visibility and renderer frustum culling bound work. High avoids broad grass shadow passes; Ultra uses matching wind/LOD depth shaders for tuft shadows. The original airframe GLB and independently spinning rotors are preserved.

Low/Medium/High/Ultra vary pixel ratio, grass density, 1K/1K/2K/4K shadow maps, cloud noise detail and rain particle budgets. All use the same local textures. Software renderers default to Low. The reference/technical view reports measured FPS, actual simulated steps per wall second and draw calls; learners see a plain-language slowdown notice. Frame stalls cap catch-up to 100 ms; hidden-tab time is discarded. These presets are quality limits, not universal FPS promises.

## Physics and coordinate convention

- Meters, seconds, kilograms, radians; X follows the 45 m edge, Z the 27 m edge, Y points up. Court center(0,0,0); concrete topY=0, turfY=−0.035.
- Quaternion maps body coordinates to world. Body+Y is rotor thrust, +X is right and+Z is rear. Angular velocity is body-frame; rendered FPV looks body−Z.
- 250 Hz semi-implicit force/velocity/position integration and normalized quaternion integration under one fixed-step coordinator, independent of renderer batching for equal admitted simulation time. Each motor has lag, quadratic rotor-speed thrust, bounds and alternating reaction torque.
- Cascaded position/velocity→attitude→body-rate PID with output limits and bounded integrals. Gravity, diagonal inertia, gyroscopic torque, rotational damping and body-frame quadratic drag are applied before integration.
- Four landing-foot contacts against finite concrete/turf heights, penetration correction, low restitution and Coulomb friction. Paint, blades and rain have no colliders.
- 15 kg demonstrator parameters are in `src/simulation/parameters.ts`. Phase 2 documented their units, frames and motor/drag/moment accounting, tested numerical and closed-loop responses, and added optional diagnostics outside saved attempts. The physical coefficients/gains remain illustrative. **Not calibrated to a real aircraft**; no digital-twin, sensor-fidelity or engineering-validation claim.

## Reference and assumptions

The upright reference is `assets/reference/arena-layout.png`. Original JPEG is preserved. `src/arena/arenaGeometry.json` holds dimensions, line widths, boundaries, lobe centers, landing areas and markers. `docs/ASSUMPTIONS.md` records calibration, estimated neck curves/dash spacing, model and collision limitations. V2 is the collection of white corridor boundaries, not a single 38×21 m rectangle. V1 is white 5 cm; V2 white 10 cm; V3 dashed yellow 10 cm. Diagram labels are optional overlays, not oversized painted annotations.

See [ASSET_LICENSES.md](ASSET_LICENSES.md) for CC0 sources and provenance. To restore downloaded maps or regenerate the original airframe:

```sh
python scripts/download-assets.py
node --import tsx scripts/export-drone.ts
```

## Verification

Headless tests cover calibrated dimensions, actual paint widths, analytical figure-eight length, motor/force/contact behavior, deterministic wind, clock cadence, and both complete finite missions. Mission checks include exact M1–M5 ordering, physical corridor containment, phase order, pause/resume, return to H, landing before completion and bounded integrated displacement. Vegetation checks cover reproducible world tiles and stable density prefixes.

Browser validation uses installed Chrome and Playwright:

```sh
# Start a dev/preview server and use its printed port.
UAV_URL=http://127.0.0.1:4175 npm run test:browser
UAV_URL=http://127.0.0.1:4175 npm run test:native-zoom-browser
UAV_URL=http://127.0.0.1:4175 npm run test:conditions-browser
# Optional: CHROME_PATH=/path/to/chrome
```

The current browser suite is `scripts/redesign-browser-check.mjs`; earlier `test:training-browser`, `test:task-ux-browser` and `test:ux-browser` commands alias that suite. It covers navigation, exercise selection, automatic readiness, real keyboard input, pause/resume, full force-integrated course completion and manual landing, final save, replay/scrub/speed/camera, annotations, legacy/invalid imports, exports, settings/calibration, device recovery, safe exit, responsive layouts and reduced motion. Native zoom has its own disposable-profile Chrome check.

The focused conditions suite checks all four practice maps, recording integrity, physical weather blending, mock locks, demo isolation and responsive panels. Its evidence is in `docs/conditions-browser-evidence.json` and `docs/conditions-screenshots/`.

Redesign screenshots/evidence are in `docs/redesign-screenshots/`, `docs/redesign-browser-evidence.json` and `docs/redesign-native-zoom-evidence.json`. Earlier screenshots and selector-bound scripts remain as historical references. Synthetic flight inputs establish software behavior, not human skill or physical RC compatibility. Hardware performance, screen-reader validation and participant usability testing remain unverified.

## Known limits

The reference is a low-resolution drawing: small neck dimensions, exact dash spacing and minor marker placement remain estimates. Ground contact is a simplified height-field/foot model, not full body/propeller collision. Telemetry is ideal simulation state, not noisy sensors. Wetness uses PBR environment reflection/specular response, not planar ray tracing. Clouds use a stable layered approximation and still lack fully convincing volumetric billows at low angles. Grass is world anchored, but closeups still expose texture/geometry differences; full photorealistic acceptance remains open. The optional visual context matte has no facilities, colliders or vegetation instances outside the official field. Hardware GPU performance is unverified.

This is an implemented simulator undergoing visual acceptance, **not a claim that every photorealism criterion is met**. Check the latest `AGENT_HANDOFF_CONTEXT.md` for actual build/browser evidence, remaining gaps and exact next actions.
