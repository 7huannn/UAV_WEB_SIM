# UAV ARENA — AGENT HANDOFF & LIVE PROJECT CONTEXT

Authoritative requirements: `UAV_ARENA_WEB_SIM_SPEC.md`. Read that file and this entire document before continuing. Source and actual test/browser evidence govern status. Updated 2026-11-18, Asia/Ho_Chi_Minh.

## 1. CURRENT SNAPSHOT

- Existing local Vite/React/TypeScript/Three.js app retained. No physics rewrite or new runtime dependency. Original specification/reference and prior history preserved; pre-refinement handoff archived in `docs/HANDOFF_BEFORE_REFINEMENT.md`.
- Court45×27m, simulated turf60×42m; calibrated V1/V2/V3, radii and H/HA/HB retained. No ancillary facilities. Top-down now truly vertical and framed below overlapping UI. Diagram's ambiguous neck/marker trace assumptions remain explicit.
- Two finite missions in `src/simulation/missions.ts`: Figure Eight (exact existing tangents/arcs, western entry, both lobes once, H return) and Outer Circuit (M1→M2→M3→M4→M5, left-corridor gate return). Both start landed at H, arm, take off, transit, execute, return, land and only then complete. Pause retains phase/progress; Abort/Hold cancels into hold. Selection locks during active missions.250Hz force/PID/motor/contact implementation preserved.
- Camera fit uses projected court bounds and viewport aspect. Ground view shows more surface; follow/FPV retained. Compact default marker dots; optional pixel-sized labels suppress overlap and emphasize active markers. Desktop/mobile mission selector, source-derived previews/lengths, phase, next waypoint and completion status added.
- Concrete: local PBR maps at multiple scales, restrained wet roughness,3.5cm shallow edge with5mm bevel,9cm soil/contact band and1.5–2mm paint optical separation. Overall footprint unchanged.
- Vegetation: deterministic2m near tuft tiles +4m middle blade-cluster tiles, world anchoring, geometric LOD fade and frustum/distance culling. No camera-relative patch. High avoids broad tuft shadow passes; Ultra uses matching wind/LOD depth shaders. Far turf uses multi-scale/macro variation.
- Atmosphere: replaced screen-jittered ray march with three stable filtered cloud shells and continuous integrated wind offset. Shared weather/physical wind retained; continuous ambient/fog colors and settled-transition sky/cloud reflection refresh. Optional finite visual Context matte replaces white field cutout; no added interactive terrain/colliders/facilities.
- Current checks:15 headless tests PASS; production build PASS (`index-CWunFRAi.js`). Full visual matrix PASS:17 primary views + temporal sequences, zero browser/asset errors. Final13/13 production browser control checks PASS against the same final bundle; all four graphics and six weather presets also pass, including Ultra vegetation shadow shaders.
- Full photorealism NOT accepted. Low-angle clouds still read as layered/flat; grass detail transitions and flat distant matte remain synthetic. Hardware GPU unavailable; software timing only. See current report/evidence for actual metrics.

## 2. NEXT EXACT ACTIONS

1. On an available real GPU, start the local app using its actual printed port and repeat `UAV_HARDWARE=1` browser/visual profiles. Record GPU/frame times and inspect the existing17-view matrix. This environment has no `/dev/dri`; `nvidia-smi` cannot communicate with a driver. Hardware60FPS remains unverified.
2. Improve the observed low-angle flat cloud structure and simple flat horizon matte while retaining deterministic cloud advection and the optional finite context scope. Compare `clouds-moving-*` as well as still images; do not equate stable frames with convincing volume.
3. Refine the observed turf/tuft shading and density transition at `grass-closeup`, `grass-mid-distance` and `grass-long-distance`, preserving fixed tiles and the measured triangle reduction. No camera-following patches, unrelated facilities or new physical terrain. Keep diagram estimates until better reference evidence exists.

Implementation,15 headless checks, final13 browser controls, full visual matrix, quality/weather checks and documentation are saved. No additional functional verification is pending. Full photorealistic acceptance remains open. Owned preview4175 is stopped at delivery; use README commands to restart. Current Git status is readable; source remains uncommitted, with no commit requested.

## 3. PHASE ACCEPTANCE

- [x] Original calibrated map/dimensions and accurate vertical reference view retained.
- [x] Two finite controller-driven missions, exact outer marker order, both figure-eight lobes, explicit H return and landing-only completion; headless and browser checks.
- [x] Six cameras, shared weather, manual controls and existing dynamics retained.
- [x] Camera framing, shallow ground/soil interface, restrained wet PBR and compact overlays implemented and captured.
- [x] Stable world-space vegetation LOD and cloud advection; frozen frames byte-identical; moving-camera transforms unchanged.
- [x]15 headless tests/build and full17-view visual/temporal matrix pass with zero errors.
- [x] Final13/13 production controls, all four graphics presets and all six weather presets; zero exceptions/assets.
- [ ] Full photorealistic visual acceptance and actual hardware60FPS benchmark.

## 4. PROJECT MAP / DECISIONS

- `src/arena/arenaGeometry.json`: authoritative configurable digitization data; pixel-to-meter transform.
- `src/arena/geometry.ts`: route circle/tangent curves, arc-length sampling, helpers.
- `src/weather/Weather.ts`: shared current/target presets, blending and deterministic wind.
- `src/simulation/missions.ts`: two reusable finite mission definitions, clamped arc-length sampler, explicit transfers and returns.
- `src/simulation/{parameters,DroneDynamics}.ts`: all state, controller, motor dynamics and contacts, independent of render.
- `src/scene/World.ts`: Three.js lifecycle, PBR materials, ground, cameras, rendering/input.
- `src/scene/{paint,grass,grassClumps,grassTiles,random,atmosphere,drone}.ts`: accurate paint, compact labels, fixed vegetation tiles/LOD, stable sky/cloud/rain and retained airframe.
- `src/ui/App.tsx`, `src/style.css`, `src/main.tsx`: local React UI and responsive styling.
- `scripts/{download-assets.py,export-drone.ts}`: reproducible local assets.
- `scripts/browser-check.mjs`: complete browser regression, optional capture selection,30-frame profile.
- `scripts/visual-check.mjs`: full17-view environment/temporal/mission matrix using a fresh browser per section. Optional targeted sections/paint/quick modes retained.
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

- Baseline before refinement:11 headless tests/build PASS,13 live browser checks PASS. Low30-frame mean2.6707FPS (median383.2ms, p95399.9ms), SwiftShader. Fresh baseline aerial/top-down and previous8 screenshots retained under `docs/baseline-screenshots/`; evidence in `docs/baseline-{browser,paint}-evidence.json`.
- Current `npm test`: PASS15/15. Includes both complete finite missions, M1–M5 order, physical corridor containment, strict phase progression, pause/resume, H landing before completion, bounded per-step motion, deterministic tiles and preserved physics/paint checks.
- `npm run build`: PASS, main JS982.37KB /266.66KB gzip, `index-CWunFRAi.js`; expected Three.js engine chunk warning.
- `UAV_URL=http://localhost:4175 node scripts/visual-check.mjs`: PASS17 primary views plus cloud/grass/camera sequences. All three sections use the same final bundle; zero JS/console/request errors. `docs/visual-evidence.json` combines environment/temporal/mission evidence.
- Frozen raw frames byte-identical; cloud offsets advance with shared wind; vegetation tile/instance transforms identical across camera travel. Actual sequences in `docs/screenshots/{clouds-frozen-*,clouds-moving-*,grass-travel-*,grass-wind-*}.png`.
- Chrome147.0.7727.101 on Linux, ANGLE/Vulkan SwiftShader software renderer.1600×1000 browser viewport; High actual canvas1308×887.30-frame High Overview mean5.844FPS, median166.7ms, p95183.4ms;115 draw calls,22,696 triangles. High closeup mean1.238FPS, median800ms, p951383.2ms;95 calls,737,656 triangles. Low visual profile7.469FPS, median133.3ms, p95150.1ms, actual canvas1111×753;116calls/23,820triangles with route overlay visible.
- Prior High closeup~5.25M rendered triangles vs current~0.738M (about86% lower), including shadow passes. High now omits broad grass shadow casting; Ultra retains that detail with matching wind/depth LOD. Geometry/work reduction is measured; a60FPS hardware result is NOT established.
- Renderer memory counts were98 geometries/15 textures in High overview and103/19 in closeup. These are resource counts, not VRAM byte measurements.
- Final `UAV_URL=http://localhost:4175 UAV_CAPTURE_ONLY=none npm run test:browser`: PASS13/13, zero JS/console/request errors, same final bundle as visual matrix. Active Low30-frame mean7.5318FPS, median133.3ms, p95150.1ms,115calls/22,696triangles. Figure Eight lands at H with0.019m horizontal error; Outer Circuit0.027m; both disarmed/COMPLETED after contact, pause/resume verified.
- `UAV_VISUAL_SECTION=quality`: PASS all four graphics presets and six weather presets, zero errors. Ultra near grass2,598,234 triangles/167calls; shader validation, not a frame-rate benchmark. `docs/visual-quality-evidence.json`.
- All17 primary views and11 raw temporal images reviewed; extra Ultra shadow image reviewed. `docs/REFINEMENT_REPORT.md` contains the structured implementation/files/missions/visual/performance/tests/limits/next-actions report. `git diff --check` passes.
- First monolithic visual run lost Chrome late in grass animation after passing cloud checks. The isolated temporal rerun passed; the final full runner bounds browser lifetime/memory per section and passed. No application exception/asset error reproduced.

## 7. OPEN ISSUES / LIMITATIONS

- Full photorealism remains OPEN. Clouds are temporally stable but still visibly layered/flat near the horizon; the distant matte is deliberately simple and flat. Near/middle/far turf shading and geometry density can still look synthetic. Do not represent these as fully accepted.
- Only software SwiftShader accessible. Heavy closeups remain slow; there is no measured hardware60FPS claim. Actual GPU test and thermal/frame-time stability remain necessary.
- Optional Context is visual-only and finite; official flight/ground bounds remain unchanged. It is not surveyed surrounding terrain.
- The diagram's neck curves, dash spacing and minor marker positions remain estimates pending higher resolution reference evidence. Transfers/return procedures are documented implementation assumptions, not official paint.
- Physics/airframe remains illustrative and uncalibrated. Contact uses the existing simplified four-foot height field; the5mm bevel is visual. Rain visual only, telemetry ideal state.
- All runtime assets local. No new asset downloads/dependencies this iteration. Original CC0 licenses and retained GLB unchanged.

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

### 2026-11-18 — Refinement iteration, geometry/mission milestone

- Re-read the refinement request, specification, handoff, assets, geometry, simulation and rendering modules; inspected the reference and all eight previous screenshots. Baseline tests11/11, build and13 live-browser checks pass. Fresh baseline aerial/top-down captures and evidence preserved under `docs/baseline-*`.
- Added `simulation/missions.ts`: two finite data-driven missions, authoritative M1–M5 coordinates, a full analytical figure-eight rotated to western entry, explicit unpainted transfers and return to H.
- `DroneDynamics` now schedules targets through ARMING/TAKEOFF/TRANSIT/EXECUTING/RETURN/LANDING/COMPLETED; pause retains phase/progress, external controls abort, starting away from landed H is rejected. Core motor/force/PID/contact integrator preserved.14 headless checks pass, including both physical complete missions and bounded per-step displacement. UI selector/preview/progress added; browser verification pending.
- Current work: camera fit, shallow court/soil integration, world-space vegetation tiles, stable cloud layers. No new visual acceptance claim yet.


### 2026-11-18 — Refinement visual/temporal validation milestone

- Baseline was actually rebuilt/tested and run in Chrome before changes;8 baseline images preserved and reference inspected.
-15 headless tests/build PASS; final production bundle `index-CWunFRAi.js`. Full visual matrix PASS17 requested/extra views plus11 raw temporal frames, zero application or request errors. Frozen frames identical; world vegetation matrices unchanged with camera movement.
- Inspected map, weather, ground/transition/grass and temporal views. Main framing, compact labels and background integration improved; surface/sky still synthetic at low angles. Full photorealism stays OPEN.
- High closeup rendered triangle count~0.738M vs previous~5.25M; High overview22.7k. Shared weather and settled reflection updates tested across recorded weather states. No hardware device/driver available.
- README, assumptions and licensing updated for finite missions, world-space vegetation and optional visual context. Final control and quality-preset checks still in progress at this checkpoint.


### 2026-11-18 — Refinement final verified handoff

- Final production build PASS, same `index-CWunFRAi.js`;15/15 headless checks and `git diff --check` PASS. No physics gains, motor parameters or core integrator changes.
- Final13/13 browser control checks PASS, both complete missions physically return/land at H, zero browser/console/request errors. Final Low active-simulation mean7.5318FPS on SwiftShader; this is not hardware performance.
- Full visual matrix PASS17 primary captures +11 raw temporal frames. Separate Ultra/all-quality/all-weather check PASS. All images reviewed; stable clouds and grass anchoring proven in sampled frames, but flat cloud silhouettes/horizon and remaining grass shading cues keep full photorealism OPEN.
- Structured `docs/REFINEMENT_REPORT.md`, README, assumptions, asset licenses and current handoff updated; historical work log and baseline evidence preserved. The optional visual Context scope tradeoff is explicit.
- Current Git status is functional/readable after continuation; work remains uncommitted. Earlier inaccessible-Git statements above describe prior sessions, not the current state.
- Owned production preview4175 stopped at final teardown; no unrelated service stopped.
