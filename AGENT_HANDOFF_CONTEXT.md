# UAV ARENA — AGENT HANDOFF & LIVE PROJECT CONTEXT

## Latest implementation — in-map conditions and learning discovery (2026-11-18)

This section and `docs/FLIGHT_CONDITIONS_UX.md` supersede the historical UX/weather-navigation descriptions below. Current UI has a homepage hub, four manual exercise maps with automatic READY, saved-flight review, settings/calibration, and separate automatic demos. Instructor UI and physical checklists were removed in the preceding redesign; archived checklist fields still import.

Weather now belongs to the map’s compact **Điều kiện bay** disclosure. READY edits synchronize actual and recorded starting weather. Practice editing pauses without resetting; after explicit resume, target conditions blend through the existing engine and changes remain logged. Mock allows READY edits, then locks every weather setter after starting, including paused attempts. Demo edits work live and remain isolated from saved practice levels. Advanced presets/eight numeric weather parameters are retained inside the map panel; replay/finalized recordings remain protected.

Homepage **Tìm hiểu trước khi bay** links to criteria and automatic demonstrations. Settings no longer contains weather or discovery links. Current source, README and `docs/FLIGHT_CONDITIONS_UX.md` describe the implemented flow. New checks: `src/tests/conditions.test.ts`, `npm run test:conditions-browser`; current evidence: `docs/conditions-browser-evidence.json`, `docs/redesign-browser-evidence.json`, `docs/redesign-native-zoom-evidence.json`. Keep historical reports as historical evidence. Final verification: 39/39 Node tests, production build, 16 browser check groups and 54 screenshots across all three suites passed with zero app errors on the final build (`index-By_fCJN0.js`). The owned preview server was stopped at delivery. No commit/publication created.


Authoritative requirements: `UAV_ARENA_WEB_SIM_SPEC.md`, `docs/UAV_PRACTICAL_TRAINING_SPEC.md`, `docs/VIETNAMESE_UX_REQUEST.md`, and latest `docs/HUMAN_CENTERED_UX_REQUEST.md` (task-centered UX, fixed pilot optics and Training-only ground assistance supersede cosmetic refinement). Read these and this entire document before continuing. Source and actual test/browser evidence govern status. Updated 2026-11-18, Asia/Ho_Chi_Minh.

## 1. CURRENT SNAPSHOT

- Saved local v0.3.0 task-centered continuation. Vietnamese home highlights Luyện tập; preparation uses independently collapsible Bài bay / Thiết bị điều khiển / Điều kiện bay / Hướng dẫn / Cài đặt nâng cao, with optional assistance. Values/summaries survive collapse; guide optional. During flight, setup disappears and current task/checklist/status remain. A separate action dock keeps prepare/confirm/arm/start/pause/manual landing/postflight/save and distinct safety/cancel actions accessible. Desktop panel collapses/reopens; camera toolbar compact, secondary choices expand within layout instead of over aircraft. Narrow layouts use a fixed bottom action dock with measured content reserve/focus margin; body scroll enabled.
- One Pilot VLOS camera/Góc người lái. Same provisional front-edge midpoint/setback station(0,17m), eye(0,1.615,17). Revised static aim(-8,0), yaw≈−115.2°, pitch−5°, FOV55°, zoom1/model scale1. H shifts away from extreme left; far-right/high sectors require explicit head turns. No tracking, eye translation, dynamic zoom or aircraft enlargement. viewRevision2 migrates obsolete local optics while keeping valid placement/eye height; archived records unchanged.
- Native0–10 wind/rain sliders feed original Weather.target. Wind n→.9n m/s base/.4n gust/.07n turbulence, preserving direction; rain q=n/10 interpolates normalized rain/cloud/visibility/time. Independent changes/reset, readable numeric/descriptive output, large handles, separate instructor defaults and legacy convenience migration. All World weather setters reject candidate Mock before/during attempts. Advanced controls remain. No legal wind limit or calibrated rainfall claim.
- Training-only render assistance: thin dashed vertical yellow line and orange ground ring use actual displayed/interpolated aircraft pose and court0/turf−.035m surface, .025m optical offset; fade near landing. Hiện vị trí dưới máy bay toggle defaults on, optional saved preference. World setter and per-frame guards require Training/no Mock attempt/no replay. Mock, Instructor, review/reference never display it; transitions immediately hide it. No physics/score/trajectory/record mutation or shortcut activation.
- Court/route/airframe,250Hz force/PID/motor/contact model, wind equations, manual stabilized body-frame velocity/climb/yaw-rate, procedure/scoring/human-review and records/replay/historical imports remain unchanged. Both full courses still require manual takeoff/task/landing/disarm/postflight. Automatic reference missions remain separate from candidate evidence. Reference controls/help/status and calibration visible labels now Vietnamese; machine IDs/units/source text remain stable. No runtime dependency added.
- Final headless37/37 and build PASS. Current package `index-i8icxAy0.js`1,111.71KB /307.37KB gzip; CSS `index-Cfa4Oj_l.css`51.34KB /11.15KB gzip. Final48/48 browser checks PASS:18 training +9 UX +7 task/assistance +13 reference +1 native Chrome200% zoom, all exits0, zero page/console/request errors, all five JSON files identify this final bundle.68 current screenshots plus3 actual before images saved/reviewed. Native zoom includes all four preflight checkboxes operated by keyboard with focus above the fixed dock.
- Current design/evidence report: `docs/HUMAN_CENTERED_UX_IMPLEMENTATION.md`; issue inventory/alternatives/flow/research: `docs/HUMAN_CENTERED_UX_AUDIT.md`. Required original UX/settings/pilot/research docs, README/assumptions updated; previous reports marked historical. Before actual UI screenshots in `docs/task-ux-before/`; same-pose optics comparisons, guide/weather/accordion/zoom evidence in `docs/task-ux-screenshots/`. Scenario walkthroughs are automated, not human participant results.
- Same authoritative handoff/history and existing milestone backups preserved; no additional handoff backup, commit or publication created this iteration. Official equivalence/site survey/actual RC/aircraft/human/classroom-GPU/V2 exact contact/full photorealism acceptance remain unverified. Owned preview4175 stopped at delivery by Ctrl-C(exit143); unrelated services left alone. Explicit127.0.0.1 preview addresses select this repository; localhost resolved a different service during initial audit and is excluded.

## 2. NEXT EXACT ACTIONS

1. Software iteration complete:37 headless/build and48 final browser checks pass,68 current screenshots +3 before images inspected, five evidence JSON files on the same final bundle. Use saved source, `docs/HUMAN_CENTERED_UX_IMPLEMENTATION.md` and README commands; do not repeat tests without a source change or unresolved concern. Owned preview is stopped. Historical17-view environment matrix remains separate, not rerun in this UX iteration.
2. Run the representative Vietnamese participant plan in `docs/VIETNAMESE_END_USER_UX_RESEARCH.md`: new/older learners, instructors/admin; measure finding actions, setup/report completion, errors/help/readability. Review terminology, actual display/keyboard/RC, additional browsers/OS zoom and assistive technology. Actual Chrome200% zoom has a software check; no participant study/WCAG audit has occurred.
3. Obtain authenticated current Vietnamese category-specific practical appendices/amendments and authority/instructor confirmation of station/side/setback, stabilization, tasks/tolerances/safety/records. Keep profiles TRAINING_ONLY. Follow `docs/REAL_WORLD_VALIDATION_PLAN.md` for survey/body envelope, real transmitter/adapter latency, aircraft calibration, display/VLOS transfer, classroom GPU and storage reliability.

No new commit/publication. External acceptance gates require evidence. Avoid resuming decorative cloud/grass work ahead of the requested training validation.

## 3. PHASE ACCEPTANCE

- [x] Existing calibrated court/paint/geometry, physics, reference missions, manual behavior, training procedure/scoring and recordings preserved.
- [x] Independent task groups/summaries, optional guide, compact live-flight panel, persistent action dock, collapsible sidebar and compact secondary camera controls.
- [x] Native wind/rain0–10 mapping/reset/persistence and separate instructor defaults; Vietnamese reference and learner controls.
- [x] Revised provisional static optics, before/after physical-pose captures and explicit head turns, with fixed eye/FOV/zoom/unit scale invariants.
- [x] Render-only ground projection/toggle/fade; Training/no replay/no Mock gating and transition/preference restrictions.
- [x]37 headless tests/build,48 final browser checks on one package, zero errors;68 current +3 before screenshots inspected. Native200% keyboard/checklist/focus and narrow fixed dock verified.
- [x] Same handoff/report/evidence/history updated; owned preview stopped(exit143), unrelated services untouched; no commit/publication.
- [ ] Representative-user/accessibility audit, official exam equivalence, surveyed station/exact V2 contact, real RC/aircraft, hardware performance and full photorealism acceptance. Not claimed.

## 4. PROJECT MAP / DECISIONS

- `src/arena/arenaGeometry.json`: authoritative configurable digitization data; pixel-to-meter transform.
- `src/arena/geometry.ts`: route circle/tangent curves, arc-length sampling, helpers.
- `src/weather/Weather.ts`: shared current/target presets, blending and deterministic wind.
- `src/simulation/missions.ts`: two reusable finite mission definitions, clamped arc-length sampler, explicit transfers and returns.
- `src/simulation/{parameters,DroneDynamics}.ts`: all state, controller, motor dynamics and contacts, independent of render.
- `src/scene/World.ts`: Three.js lifecycle, PBR materials, ground, cameras, rendering/input.
- `src/scene/{paint,grass,grassClumps,grassTiles,random,atmosphere,drone}.ts`: accurate paint, compact labels, fixed vegetation tiles/LOD, stable sky/cloud/rain and retained airframe.
- `src/ui/{App,TrainingDesk,LearnerControls}.tsx`, `src/ui/{vi.ts,vi.json}`, `src/style.css`, `src/main.tsx`: Vietnamese home/guide/settings, original training tools, display translations and responsive styling.
- `src/scene/groundGuide.ts`: render-only vertical projection, landing fade and Training-only visibility predicate.
- `src/training/{pilot,weatherPresets}.ts`: derived provisional station/static optics and physical0–10 level mappings. Existing training input/profiles/session/records remain the training core.
- `scripts/{ux-browser-check,training-browser-check,task-ux-browser-check,native-zoom-browser-check}.mjs`: learner/training, assistance/optics and real Chrome Page zoom evidence.
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

## 6. REFINEMENT EVIDENCE (HISTORICAL)

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

- Current official Vietnamese practical appendix/category application, exact pilot station and scoring tolerances remain unverified. All implemented profiles/rules are engineering practice assumptions. Article28 distinguishes HạngA theoretical licensing and HạngB theory/practical; do not imply every VLOS licence uses this course.
- V2 monitoring uses local ordered route deviation rather than exact rotated fuselage/paint contact. V1 uses an illustrative fuselage rectangle. Low-resolution neck/marker estimates and transfer assumptions remain explicit. Human review required.
- No physical RC/adapter, actual aircraft logs/bench calibration, surveyed field, instructor cohort or perceptual skill-transfer study. Ideal state telemetry, simplified foot contact and visual-only rain remain model limits. Only position-stabilized velocity mode is supported.
- Replay is recorded-state interpolation with logged camera/weather, not complete atmospheric/rotor-phase or sensor resimulation. SHA256 is a local checksum, not an authenticated device signature; browser storage is not a certified institutional archive. Export backups and validate long-session/quota/recovery behavior on classroom hardware.
- Representative Vietnamese learners/older users/instructors have not tested this UX. Automated target-size/keyboard/screenshot checks are not a WCAG audit. Native terminology, additional browsers/OS zoom and assistive technology need human evaluation; Chrome200% has an automated software check. Reference visible controls/help are now Vietnamese; imported user/device text and technical machine IDs/units retain their original form.
- Global arena rotation is not implemented; the edge-normal helper handles rotated vectors but a surveyed arena transform must apply consistently to court/course/station. Front=lower/+Z is the documented provisional interpretation.
- Full photorealism remains open and was not this iteration's priority. Clouds/horizon/turf still show synthetic cues. SwiftShader only; no hardware60FPS acceptance.
- Future field telemetry boundary is read-only metadata/design. No live aircraft transport, command, arming or takeoff integration exists.

## 8. CONTINUITY RULES

Keep updating this same authoritative `AGENT_HANDOFF_CONTEXT.md`; preserve its history. Create backups only for major milestones/substantial rewrites, not every iteration. Major snapshots: `docs/HANDOFF_BEFORE_VIETNAMESE_UX.md`, `docs/HANDOFF_BEFORE_TRAINING.md`, and prior refinement backup. Do not create another handoff for routine retries.

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


### 2026-11-18 — Practical training implementation milestone (v0.2.0)

- Read the new master request, original specifications/handoff/report/source/diagram. Baseline15 tests and build passed. Added six training modules/design boundaries and a reusable training workspace around the existing world; no new runtime dependency or physical model retuning.
- Added fixed Pilot VLOS/provisional station, controller calibration/named profiles, body-frame manual demands, core assistance/reset guards, procedure and complete-route task evaluation, mock restrictions, offline records/checkpoints/replay/exports and append-only human review. Original reference demonstrations remain separate.
- Researched official Vietnam and comparison sources; inspected signed decree/circular pages. No authenticated full current Vietnamese exam appendix found. All practice scoring remains TRAINING_ONLY; authority/hardware/human validation gaps documented instead of invented certification rules.
-32 headless checks and production build pass. New18-check Chrome workflow passes on `index-BZHHy9LS.js`;13 real images saved/reviewed. Includes actual keyboard input, mock API/UI locks, mode lock, offline save, camera/telemetry replay, unchanged hashes after annotations, export and malformed-import rejection, mobile, and two complete force-integrated courses from explicitly labelled synthetic RC inputs. No human-pilot or physical-controller equivalence claimed.
- Browser validation exposed and fixed active guidance-checkbox focus interruption and flex-compressed saved-attempt buttons. Import boundary validates required weather/geometry before replay; a malformed fixture is rejected. Source/build test syntax issues were corrected before the passing final build. One prior browser cleanup run ended with143 after writing all18 checks; final identical-workflow rerun exits0. Final regression/teardown still to be entered below.
- Same handoff updated, pre-training major snapshot saved once, earlier history/refinement artifacts retained. No Git commit created.


### 2026-11-18 — Practical training final verified handoff

- Final packaged build `index-Bk5P8NB2.js` PASS (1,050.16KB /287.53KB gzip; CSS34.59KB /8.29KB gzip).32 headless tests pass; no physics gains/parameters/integrator rewrite or new runtime dependency.
-18/18 training browser checks and13/13 preserved reference checks PASS, both exit0 on the same final bundle, zero page/console/request errors.13 training screenshots captured and inspected, including both complete synthetic-RC routes, fixed VLOS, strict mock, calibration, scoring/replay/telemetry and mobile.
- Visual review found the duplicate scene status strip covered the aircraft at H. It is now hidden in training views; procedural/replay status remains in the side panel. Training captures and18-check workflow rerun after this CSS-only correction; reference13-check regression also rerun on the final package.
- Full browser Figure Eight fixture has a0.738m landing error against the provisional0.6m training target; LANDING_POSITION warning retained and final outcome is HUMAN_REVIEW_REQUIRED, never pass. Outer fixture landing error0.543m. Both have zero missed route gates; synthetic test inputs are explicitly marked and do not establish human VLOS competence.
- Final Low reference30-frame mean7.004FPS, median116.7ms, p95250ms,115calls/22,696triangles; observed200 physics steps/wall second. SwiftShader only. No hardware60FPS, physical RC, surveyed station, calibrated aircraft or official exam equivalence claim.
- Seven requested engineering documents, source register, README/assumptions, example exported incomplete report and this same handoff saved. Pre-training snapshot retained once under `docs/HANDOFF_BEFORE_TRAINING.md`; previous history preserved. No commit created. `git diff --check` passes; owned preview4175 stopped at teardown.


### 2026-11-18 — Pilot-view and Vietnamese UX final milestone (v0.3.0)

- Latest user request retained verbatim in `docs/VIETNAMESE_UX_REQUEST.md`. Updated this same handoff; one substantial-milestone backup made before work, historical logs/backups preserved. No new runtime dependency, geometry/physics/weather-equation/controller/scoring/record-format rewrite.
- Derived front midpoint/outward station(default0,17m,3.5m setback), fixed eye1.615m/FOV70°, head buttons/drag/recenter, optional Vietnamese pilot marker/diagram. Legacy west-station imports/checksums preserved. Station/FOV remain provisional, not surveyed or official.
- Vietnamese home/guide/input/wind/sky/settings/instructor/mock/review/report implemented; advanced tools preserved. Common weather lock, separate practice/mock/reference conditions, custom-weather labels/navigation persistence, actionable controller faults, keyboard focus/help and responsive views verified. Original reference engineering content retains English.
- Baseline32 headless/build +18 training +13 reference checks passed before changes. Final35/35 headless/build PASS;9 UX +18 training +13 reference checks all exit0 with zero errors on `/assets/index-DQOBEUTa.js`.19 UX +13 training screenshots saved/inspected; route/debrief-named full-course captures show route replay, while JSON assertions establish completion/review decisions. Full historical17-view environment matrix not rerun.
- Intermediate checks found/repaired head-control pointer events, empty numeric setback failure, small marker/notice text, raw result labels, panel scroll, and custom-weather overwriting across navigation. Harness selectors/replay-close updated. One earlier concurrent browser invocation exited143 for unverified cause; final serial runs all exit0.
- Final Low reference30-frame mean7.143FPS, median149.9ms,p95166.7ms,115calls/22,696triangles; observed176physics steps/wall second on SwiftShader. No hardware60FPS/real-time or controlled performance comparison claim. Full manual fixtures remain explicitly synthetic, both HUMAN_REVIEW_REQUIRED, no official pass.
- Required research/design/settings/report/pilot documents, README/assumptions, VN example incomplete report and evidence saved. Research cites primary accessibility/training sources; no human interviews fabricated. User/RC/site/aircraft/authority/hardware acceptance remains open with concrete plans.
- Owned preview4175 terminated by Ctrl-C(exit130); unrelated services untouched. Final documentation/whitespace checks completed; no commit/publication created.


### 2026-11-18 — Task-centered UX, static pilot optics and ground-guide milestone

- Read latest `HUMAN_CENTERED_UX_REQUEST.md`, existing specifications/research/reports/components/styles, inspected running production browser and retained3 actual baseline images. Initial35 headless/build passed. Actual original laptop panel596px visible/1263px content; canvas976×423 atY309. Task disclosures, contextual current-flight panel, persistent separate action dock/collapsible sidebar and compact camera tools implemented; initial new canvas1006×506 atY165. No decorative environment work or runtime dependency.
- Added monotonic wind/rain0–10 sliders, independent physical mappings/reset/persistence, separate instructor conditions and common authorization. Natural Vietnamese display now includes reference tools/calibration while evidence identifiers remain unchanged. Static pilot aim(-8,0), pitch−5°, FOV55° at unchanged provisional eye improves initial H framing; far-right/high views use explicit head turns, no tracking/zoom/scale tricks. Same-pose before/after screenshots retain real force-integrated movement.
- Added reused dashed line/ring geometry from actual displayed aircraft pose to correct court/turf surface, fading at landing. Training/no Mock/no replay setter and per-frame guards prevent enabled-preference/workspace leakage; no physics/scoring/record writes. Mock, instructor/review/reference remain unaided by this feature.
- Final `index-i8icxAy0.js`1,111.71KB /307.37KB gzip; CSS `index-Cfa4Oj_l.css`51.34KB /11.15KB gzip; strict build and37 tests PASS.18 training +9 UX +7 task +13 reference +1 native zoom =48 browser checks PASS, all exits0/zero errors/same final bundle. Both full synthetic-RC courses remain human-review-required; immutable imports/replay/exports pass.
- Native Chrome Page zoom200% set through appearance settings in a disposable profile:683×384 CSS/DPR2 on1366×768, visual scale1. Four keyboard-operated preflight checkboxes retain focus above fixed bottom action dock. Visual inspection caught sticky-grid action loss at enlarged layouts; repaired with fixed narrow dock, measured reserve and focus margin/document scroll. Earlier head submenu overlap, undersized state/slider handles and old harness disclosure/label assumptions also repaired. Rotated-heading expectation and universal off-axis magnification assertion corrected without changing physics.
-68 current screenshots(32 task +4 native zoom +19 UX +13 training),3 original before images, five JSON evidence files reviewed/saved. Full-size key frames plus contact-sheet layout review; current manual-flight/native/checklist/guide/far/high/head-turn views inspected. Historical17-view environment matrix not rerun; materials/geometry/atmosphere untouched. Final reference30-frame Low mean6.546FPS, median150ms,p95216.7ms,115calls/22,696triangles,167observed physics steps/wall second on SwiftShader; no controlled performance/hardware60FPS claim.
- Audit/alternatives/journey, latest implementation report, research/settings/pilot/README/assumptions updated. No real participant, RC/aircraft/site/GPU/official examination validation invented. Same handoff and all previous history/backups retained; no additional handoff snapshot, commit or publication. Owned preview4175 stopped(exit143); unrelated services left alone. Final whitespace/link/evidence consistency checks pass.
