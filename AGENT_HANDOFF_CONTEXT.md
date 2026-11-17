# UAV ARENA — AGENT HANDOFF & LIVE PROJECT CONTEXT

Authoritative requirements: `UAV_ARENA_WEB_SIM_SPEC.md`. Read that file and this entire document before continuing. Source and actual test/browser evidence govern status. Updated 2026-11-18, Asia/Ho_Chi_Minh.

## 1. CURRENT SNAPSHOT

- Workspace `/media/thuan/Workspace/project/uav`. Initial files: specification, template handoff and the user's original arena JPEG. `.git` is an empty read-only mounted directory, not a functioning Git repository; no commits/branch available. Do not initialize/overwrite it.
- Phase: functional A–E implementation and browser regression verified; Phase A/E visual acceptance remains OPEN. **Do not mark the complete specification DONE: photorealism and hardware GPU performance have not passed acceptance.**
- App: Vite8 / React19 / TypeScript / Three.js0.187, imperative Three.js world owned by a React component. R3F not required for the scene; avoided another state/reconciliation layer for a continuously running simulation.
- Reference FOUND: `assets/reference/arena-layout-original.jpeg`, rotated to `assets/reference/arena-layout.png` and copied into public assets for in-app viewing.
- Physics: standalone 250Hz 6DOF quaternion rigid body, 4 rotors, lag, quadratic thrust/reaction torque, inertia/gyroscopic term, body-relative wind drag, cascaded position/attitude/rate controller, bounded PID integrals, simplified 4-foot contacts. Illustrative15kg parameters, not calibrated.
- Modes: arm/disarm, takeoff, hold, manual, land, crash/reset, figure-eight approach/lap, pause/resume. Renderer frame gaps capped to100ms; hidden-tab time discarded.
- Weather: six presets, shared blend state, deterministic gust field, cloud/light/fog/rain/wet material and grass-wind visuals.
- Controls/UI: full local flight desk, six cameras, telemetry, map, weather sliders, overlay toggles, quality presets, help/reference dialogs. 13 production control checks verified with the final vegetation assets; portrait controls and cameras verified.
- Assets: six2K CC0 PBR maps, CC0 Grass Medium01 glTF +1K PBR/alpha maps, and an original detailed airframe exported to GLB. Asset provenance recorded; no runtime CDN.
- Tests: `npm test` PASS11/11; `npm run build` PASS.13 production browser checks PASS with zero JS/console/request errors. After the last paint-join change, targeted High aerial/top-down browser checks also PASS. Actual screenshots reviewed; full photorealism remains open.

## 2. NEXT EXACT ACTIONS

1. **Stabilize cloud image quality in `src/scene/atmosphere.ts`.** Current screen-jittered ray march removes banding but shows grain/wispy blobs. Use a stable3D noise volume and temporal or spatial filtering within an explicit GPU budget. Rebuild and capture `ground-concrete-detail.png` / `rain-overcast.png`; success requires cloud detail without grain, bands or flat-card appearance.
2. **Remove closeup vegetation patch cues in `src/scene/grassClumps.ts` and `src/scene/World.ts`.** Replace the8m camera-relative patch with world-anchored culled tiles/LOD and refine turf-to-tuft blending. Keep geometry strictly outside concrete. Run `node scripts/visual-check.mjs`; inspect grass, ground seam and camera movement before accepting realism. Check the finite-field backdrop/composition without adding out-of-scope facilities or infinite grass.
3. **Profile on a real hardware GPU and repeat acceptance.** Run `npm run dev` (use the printed port), then `UAV_HARDWARE=1 UAV_URL=<actual-url> npm run test:browser`; record actual GPU/device and30-frame profile. Current SwiftShader result is only~3.04FPS Low, so there is no60FPS or full photorealistic acceptance claim. Preserve neck/marker estimates in `docs/ASSUMPTIONS.md` until higher-resolution reference evidence exists.

Local QA servers5174(dev) and4175(preview) are stopped during this session's teardown. Port5173 belonged to a pre-existing service and was not touched. Restart with README commands; source and all runtime assets are local.

## 3. PHASE ACCEPTANCE

### A — Environment

- [x] Working application source, correct meter-scale45×27 concrete and60×42 grass bounds.
- [x] Local licensed PBR maps and data-driven scene geometry.
- [x] Actual aerial, ground, grass and follow browser screenshots captured and inspected.
- [ ] Final photorealism acceptance still open: earlier blade/cloud issues improved; remaining realism limitations must be recorded.

### B — Reference

- [x] Original and upright plan stored; dimension calibration in `src/arena/arenaGeometry.json`.
- [x] 32×15,35×18,38×21 corridor interpretation traced against the image. V2 includes both corridor boundaries, circle/hourglass boundaries, not just a rectangle.
- [x] Circle radii4/5.5/7m, exact tangent-based figure eight, H/HA/HB, overlay markers. Neck Beziers approximate and documented.
- [x] Top-down screenshot compared with upright reference: main boundary, corridor rectangles, circles, crossing and H/HA/HB agree within documented trace assumptions.

### C — Weather

- [x] Shared physical/visual state; six presets; renderer and UI code.
- [x] Sunny/cloudy/rain browser screenshots captured.
- [x] Production browser weather selector/sliders, wetness, wind disturbance and rain verified.

### D — Dynamics

- [x] Headless tests: freefall/contact, symmetric thrust, takeoff/hover/move/land, wind compensation, deterministic replay, frame cadence/pause, autonomous lap, motor saturation/reaction/disarm lag, static friction, yaw sign and actual paint-mesh width/extent.
- [x] Four real motor speed states and original GLB.
- [x] Production browser takeoff/RPM, keyboard movement/yaw, follow/FPV, mission, pause, land/reset validated.
- [ ] Landing contact model remains simplified; model calibration requires external measurements.

### E — Delivery

- [x] Source, assumptions and asset license documents.
- [x] Build,11 headless tests,13 browser control checks, README, assets/assumptions documentation and screenshots.
- [x] 13 production browser controls/mobile checks PASS; see `docs/browser-evidence.json`.
- [ ] Hardware GPU benchmark and full photorealism acceptance unavailable/open.

## 4. PROJECT MAP / DECISIONS

- `src/arena/arenaGeometry.json`: authoritative configurable digitization data; pixel-to-meter transform.
- `src/arena/geometry.ts`: route circle/tangent curves, arc-length sampling, helpers.
- `src/weather/Weather.ts`: shared current/target presets, blending and deterministic wind.
- `src/simulation/{parameters,DroneDynamics}.ts`: all state, controller, motor dynamics and contacts, independent of render.
- `src/scene/World.ts`: Three.js lifecycle, PBR materials, ground, cameras, rendering/input.
- `src/scene/{paint,grass,grassClumps,atmosphere,drone}.ts`: paint ribbons, 220k-capacity instancing, sky/cloud/rain, original modeled drone.
- `src/ui/App.tsx`, `src/style.css`, `src/main.tsx`: local React UI and responsive styling.
- `scripts/{download-assets.py,export-drone.ts}`: reproducible local assets.
- `scripts/browser-check.mjs`: complete browser regression, optional capture selection,30-frame profile.
- `scripts/visual-check.mjs`: targeted High ground/grass captures; `UAV_PAINT_ONLY=1` selects top-down/aerial.
- `src/tests/simulation.test.ts`: native node:test via tsx loader, `--test-isolation=none` avoids restricted child-process behavior.
- `docs/ASSUMPTIONS.md`: geometry estimates, coordinate/airframe/contact conventions.
- `ASSET_LICENSES.md`: exact asset provenance and rights.

## 5. WORK LOG

### 2026-11-18 — Repository discovery and first implementation milestone

- Read complete specification and handoff template before code. No prior app existed. Git status fails because `.git` is not usable; no existing code overwritten.
- Rotated the supplied plan for analysis and preserved original. V1 calibrated to1030×618px,22.8889px/m. 38/35/32 by21/18/15 rectangles have specific roles verified from plan; dimensions preserved. Neck leaders remain ambiguous.
- Created Vite/React/TS setup, installed pinned core dependencies, downloaded actual CC0 maps from Poly Haven and authored drone mesh/GLB.
- Implemented simulation, tests, render modules and UI.
- `npm test`: PASS7/7. An initial route-length bound was wrong; replaced it with the exact analytical circle/tangent length comparison. Flight/dynamics tests passed without gain tuning.
- Initial tsx CLI attempted an IPC socket forbidden in sandbox; use `node --import tsx --test --test-isolation=none ...` instead.
- Asset download/install required network sandbox escalation and completed. No permission blocked.
- Browser/screenshot evidence not yet collected; do not treat rendering code as visual acceptance.
- No Git commit possible in mounted repository state.

## 6. EVIDENCE

- `npm test` → PASS11/11, Node24.15.0, latest run~0.33s. Actual paint geometry checked: V1 bounding extent45×27m and a0.10m straight stroke. Previously narrowed miter corner was reproduced by the new failing test, then fixed.
- `npm run build` → PASS; latest final JS970.09KB (~263.11KB gzip), `index-C1KVXSr3.js`. Expected engine chunk-size warning, no errors.
- `UAV_URL=http://localhost:4175 UAV_CAPTURE_HIGH=1 UAV_CAPTURE_ONLY=aerial-clear,top-down-reference,drone-flight,overcast,rain-overcast,mobile-controls node scripts/browser-check.mjs` → PASS13/13, zero JS/console/request errors. `docs/browser-evidence.json` records the final vegetation build `index-BlaCnUXk.js`; the last paint-miter correction and a behavior-preserving PCF shadow constant cleanup postdate that complete regression.
- Browser takeoff altitude~5.0036m, shared rainy wetness~0.912, complete autonomous lap and physical landing/disarm verified. Long scenarios forward-step the same250Hz integrator; no XYZ flight animation.
  -30-frame steady Low profile: mean3.0407FPS, median333.3ms, p95350.1ms. Headless Chrome147, Linuxx86_64,16 logical cores exposed, ANGLE/Vulkan SwiftShader Subzero software renderer. **Not a hardware-GPU benchmark.**
- `UAV_URL=http://localhost:4175 node scripts/visual-check.mjs` → PASS, licensed clumps loaded; High ground/grass captures, zero errors. `docs/visual-evidence.json`.
- After the final paint change: `UAV_URL=http://localhost:4175 UAV_PAINT_ONLY=1 node scripts/visual-check.mjs` → PASS, refreshed aerial/top-down, zero errors. `docs/paint-evidence.json`.
- Eight actual PNG captures under `docs/screenshots/`: `aerial-clear`, `top-down-reference`, `ground-concrete-detail`, `grass-closeup`, `drone-flight`, `overcast`, `rain-overcast`, `mobile-controls`. All inspected; main layout compares to reference. Visual shortcomings remain explicit below.
- `node --import tsx scripts/export-drone.ts` → PASS, original GLB saved. CC0 maps/model download script completed; all runtime dependencies local.

## 7. OPEN ISSUES / LIMITATIONS

- Visual quality INSPECTED, but full photorealism NOT accepted. Close grass patch/texture cues, grainy clouds and the diorama-like field backdrop need refinement.
- Small neck dimensions and exact dash spacing ambiguous. Estimated curves/spacing documented, editable.
- Airframe/aerodynamics/inertia illustrative; no real UAV equivalence claim.
- Ground contact simplified four-foot height-field model; no deformable body/prop strike.
- Rain visual only; telemetry ideal simulator state, not noisy sensor data.
- Mobile flight/mission controls and390px responsive layout VERIFIED. `mobile-controls.png` inspected; whole field fits portrait view.
- External font import REMOVED. System fonts; all model/texture/reference assets local at runtime.

## 8. CONTINUITY RULES

Keep this snapshot/evidence and NEXT EXACT ACTIONS current after every milestone. Do not discard working source, invent completed tests or claim photorealism without inspecting screenshots. Only reconstruct the central court and compact grass/sky. Never add ancillary facilities. Never teleport aircraft to fake flight. Preserve the spec. Record current limitations before stopping.

### 2026-11-18 — Browser/render milestone and visual repair

- `npm run build` PASS after removing readonly modifiers from mutable weather parameter type. Vite reports a ~960KB main chunk warning (includes Three.js); no build errors.
- Local preview at `http://localhost:5174` (5173 already occupied). Server launched with required sandbox network permission. Browser connector inventory was empty and in-app browser unavailable. Per spec, used installed Chrome through Playwright; Chromium process also requires sandbox escalation here.
- Initial browser smoke PASS: real WebGL2 scene, all maps and GLB load with zero JS/console errors after adding favicon. Screenshot inspected at `docs/screenshots/aerial-clear.png`.
- Repaired concrete z-fighting caused by near-coplanar box top: sides-only slab rendering, separate true top. Corrected finite-field framing. Added low-intensity sky PMREM reflection to PBR materials.
- Merged static drone meshes by material; draw calls reduced from~239 to~87 in overview. Motor groups remain independent.
- Fixed FPS measurement to use actual wall frame duration rather than capped integration interval. Reports actual simulation progress and a slowdown flag. Software SwiftShader observed~1FPS at1600×1000 High; **no hardware GPU benchmark or60FPS claim**.
- Browser partial suite verified takeoff to5m, RPM, follow/FPV and cloudy/rain state before an exact-name automation selector timed out (`Tune environment` also includes a+). Selector corrected; full re-run pending.
- Inspected aerial, ground, grass and drone screenshots. Grass was too broad/sparse and clouds banded: visual QA **NOT PASSED**. Implemented thinner blades, additional camera-local density and jittered24-step cloud sampling; verification pending.
- Ground friction now includes a static/Coulomb limit rather than perpetual tiny drift at rest. All7 headless tests still pass.
- Removed external font import; no runtime CDN dependency. Added mobile mission control, telemetry body rates/local wind, top-down scale bar, and documented controls/model/geometry/assets in README and assumptions.
- Current next action: run updated `npm run test:browser` against5174; fix failures, inspect new closeups, then update acceptance/evidence sections from actual results.

### 2026-11-18 — Physics/contact and stability verification milestone

- `npm test` PASS10/10 after adding motor saturation/reaction-torque/disarm-lag and static ground-friction checks. The static-friction test exposed residual tangential displacement integrated before friction; contact now corrects only that removed displacement. This is contact resolution, not scripted flight motion.
- Added render interpolation between prior/current fixed-step rigid states; telemetry stays on actual integrated state. Physics Hz is now measured from actual step count and wall time.
- Geometry helper radii/centers and calibration now consume JSON values, including estimated neck half-width. Engineering marker overlay includes directional arrows.
- Refined thin curved/leaning blades, camera-local density and physical world-space wind bending; cloud sampling jitter removes banding. Added quality-scaled cloud steps, low-camera far-blade reduction, and automatic Low for detected software rasterizers.
- Browser long-view action timed out under dense software-rendered closeup. Increased test action allowance, removed navigation waits for local buttons and moved QA to a fixed production preview to avoid HMR contamination.
- `npm run build` PASS; latest production bundle966.23KB (~262KB gzip). Preview4175 started. Full production test running with High captures/Low between them.
- No Git commits: mounted `.git` still not a functioning writable repository.

### 2026-11-18 — Final physical-sign and browser-control review

- `npm test` PASS10/10. Rotor reaction torque now opposes visual rotor spin, with the yaw mixer sign changed consistently. Tests assert negative reaction for positive-spin rotor pairs and stable convergence to a positive commanded heading.
- Production full browser test reached and verified a complete in-court mission lap, then failed to locate `Pause mission` because the rendered accessible name also contains its progress percentage. Harness changed to a prefix match; remaining controls are being rechecked without redoing reviewed scene captures.
- Added real keyboard movement/yaw checks after clicking Take off (guards previously corrected so focused buttons do not swallow flight keys). Added responsive Overview/Top-down camera fitting for portrait screens.
- Latest production build PASS: main JS966.44KB, gzip262.04KB. All source modules formatted. No external runtime dependencies beyond shipped bundles/assets.
- Final High screenshots captured on the stable production build: aerial, top-down, ground, grass, drone, overcast, rain. Reviewed grass now has thin curved wind-bent blades and local density, but still visibly synthetic at close range; cloud noise and diorama-like finite-field backdrop remain visual limits. Full photorealism acceptance remains OPEN.

### 2026-11-18 — Complete browser regression and licensed vegetation milestone

- Production browser controls PASS13/13 with zero JS/console/network failures. Covers keyboard movement/yaw after button focus, motor-based takeoff/hover, FPV/follow, shared weather/wetness/drag, a complete in-court lap, mission/global pause, markers/collider/quality, landing/contact disarm, reset, reference/help and390px mobile layout.
- Actual mobile screenshot inspected: portrait camera fits the whole field, visible arm/mission/takeoff/land/hold/reset controls, no DOM horizontal overflow.
- Added CC0 Grass Medium01 by Rico Cilliers / Rob Tuytel (Poly Haven), exact source/licenses documented.1K glTF, geometry, three packed PBR maps and alpha mask downloaded under `public/assets/models/grass-medium-01`. Source includes all17 original variants; three selected tuft meshes are instanced near camera.
- `src/scene/grassClumps.ts`: authored tufts, per-instance variation, matching visible/shadow wind bend, alpha-tested/alpha-to-coverage leaf edges, small diffuse wrap approximation, grass/court bounds, distance fade and quality-scaled instance count/shadows. This replaces the provisional near-camera procedural patch; far curved blades remain.
- `scripts/visual-check.mjs` PASS: both real High-quality ground/grass captures, asset loaded, zero JS/shader/console errors. `docs/visual-evidence.json`: software renderer~1FPS,5.25M rendered triangles (including shadow work) in closeup. Not a hardware benchmark.
- Visual review: leaf geometry/texture structure improved and broad triangle blades removed. Closeup still shows finite patch/ground texture and noise/aliasing; **not accepted as fully photorealistic**.
- `npm test` remains PASS10/10. `npm run build` PASS, latest JS969.81KB (262.95KB gzip). Final30-frame Low-render profile and affected scene screenshots plus full control regression currently running against this production build.
- Updated reproducible asset script and `ASSET_LICENSES.md`, `README.md`, `docs/ASSUMPTIONS.md`.

### 2026-11-18 — Session handoff / final verified state

- Complete production regression PASS13/13 after the licensed vegetation addition, zero errors. Final measured Low profile3.0407FPS on software SwiftShader,30 sampled intervals; hardware performance unverified.
- Added a direct paint-mesh geometry test, which initially FAILED because averaged corner normals narrowed V1's outer extent. Replaced with bounded miter joins and correct closed-path normals. `npm test` now PASS11/11; `npm run build` PASS,970.09KB JS (263.11KB gzip).
- Targeted browser check after this last change PASS: refreshed actual aerial/top-down, no rendering errors. The other control paths are unchanged from the13-check production pass. Source/build evidence IDs are distinguished in §6.
- All8 screenshots visually reviewed; app geometry, scope, materials, weather, cameras, controls and real motor-driven dynamics are implemented. Original coarse triangle grass was replaced; current licensed-tuftenvironment remains visibly synthetic in closest views and clouds remain noisy. **Full photorealistic acceptance is NOT claimed.**
- Current snapshot, acceptance checklist, evidence, source map, assumptions/licenses and three exact next visual/performance actions updated. No feature is represented as a calibrated physical twin.
- Owned dev/preview servers stopped during teardown; existing5173 service left alone. Repository remains a nonfunctional read-only `.git` mount; all source/assets are saved, no commit possible.

### Teardown note

- Vite development logs exposed a Three.js0.187 deprecation: `PCFSoftShadowMap` already fell back to `PCFShadowMap` in all captures. Source now chooses `PCFShadowMap` directly, preserving the tested rendering behavior and removing that warning. Final `npm run build` PASS: `index-C1KVXSr3.js`,970.09KB /263.11KB gzip. No further application changes followed.
- Owned server sessions terminated successfully (dev exit143, preview exit130). Source,8 PNGs,3 evidence JSON files, README, licenses, assumptions and this handoff are saved. No Git repository was available for a commit.
