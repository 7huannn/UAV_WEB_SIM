# Pilot-view and Vietnamese UX implementation report — v0.3.0

Date: 18-11-2026. Latest requirement: [VIETNAMESE_UX_REQUEST.md](VIETNAMESE_UX_REQUEST.md). This report describes implemented software and its evidence; representative-user, hardware and official examination acceptance remain separate.

## Implemented

The recommended pilot station is derived from the lower/front long edge of the original plan, midpoint plus outward normal and configurable setback. Default X=0,Z=17m is3.5m outside the45×27m V1 court, eye1.65m above turf. Initial bearing faces the central area; vertical FOV70° is provisional. H stays(-20,0), the aircraft takeoff/landing position. One existing PILOT VLOS camera, displayed Góc người lái, provides mouse/head buttons/recenter without eye translation, tracking or zoom. Optional Vietnamese PILOT marker/direction and diagram distinguish people from aircraft; strict mock prohibits the marker and other aids.

Vietnamese home has four task cards, an optional four-step guide with skip/return, familiar navigation and separate instructor/technical entry points. Candidate setup, checklists, states, tasks, actions, feedback, result decisions and readable report summary are Vietnamese. Existing profiles/record labels and machine identifiers are translated for display without rewriting evidence. Historical imports and controller libraries remain usable. The original reference engineering desk retains English technical content; its camera names/navigation are Vietnamese, and the demonstrations remain separate from manual attempts.

Simple wind presets and independent sky choices write the existing Weather.target. Values are documented in [settings inventory](SETTINGS_SIMPLIFICATION.md), copied from current physical scenarios plus a true zero-wind option. Detailed weather/calibration/projection/engineering controls remain under expandable settings. Instructor-selected mock defaults have separate storage keys; candidates cannot edit them in Mock, before or during preparation/flight. One shared World authorization check governs all weather setters. Preparation fixes the chosen target as initial actual weather and records it, avoiding an in-between blend value. Wetness remains the existing visual response.

Connection status offers USB/button instructions, explicit keyboard fallback and a simple response test. Device recognition never claims validated compatibility. Graphics labels map to existing presets; convenience preferences do not alter old attempts. Airborne emergency cutoff and cancelling a live attempt are distinct from pause/reset; relevant cancellation confirmation retains recordings. Main16px typography,44px principal targets, focus outlines, native keyboard controls, skip link, help focus containment, reduced motion and responsive stacking improve access. Status/errors provide Vietnamese action text. The camera toolbar occupies its own row and cannot cover the aircraft.

## Preserved and independently inspectable

`git diff` shows no edits to `src/arena/`, `src/simulation/`, `src/weather/`, `src/training/profiles.ts`, `src/training/input.ts` or `src/training/records.ts`. The only Session change is the captured software version. Court/route dimensions, H/HA/HB, M1–M5, V1/V2/V3, airframe assets, manual stabilized velocity commands,250Hz force integration/PID/motor/contact code, existing wind equations, procedures/evaluator/tolerances, scoring provenance, immutable storage, replay and both automatic missions are retained. No runtime dependency added.

Important limitation remains: manual sticks demand body-frame velocity/climb/yaw rate through the existing stabilizer, not attitude/rate or raw-throttle RC mode. No hidden automatic climb, path correction or landing was added. Full manual routes in tests use explicitly named synthetic software RC fixtures outside production, not human pilots or physical controllers.

## Files and decisions

- `src/training/pilot.ts`: edge-normal derivation, current placement validation, historical-station compatibility, fixed-eye projection.
- `src/training/weatherPresets.ts`: four wind/three sky mappings and plain weather summary.
- `src/scene/World.ts`: head controls/recenter, optional marker, common weather guard, safe workspace/input-key behavior, recorded starting weather. Rendering materials/environment unchanged.
- `src/ui/{App,TrainingDesk,LearnerControls}.tsx`, `vi.ts`, `vi.json`, `src/style.css`, `index.html`: home/guide/settings separation, localized UI/report, accessibility and responsive layout.
- `src/tests/training.test.ts`, `scripts/{ux-browser-check,training-browser-check,browser-check,visual-check}.mjs`: new checks and accessible-name/navigation updates to existing checks.
- `package.json`/lock: v0.3.0 and UX-browser command; dependency versions unchanged.
- Required research/design/settings/pilot/report documentation, README/assumptions, current evidence and the same authoritative handoff updated. One substantial-milestone snapshot: `HANDOFF_BEFORE_VIETNAMESE_UX.md`.

Current arena orientation is axis-aligned. The pilot edge helper handles arbitrary rotated edge vectors and reversed endpoints, but no global arena-rotation feature is claimed. A future surveyed transform must apply consistently to the court and course. No available project asset separately depicts the requested human station; front=lower/+Z is the documented interpretation of the user's text and upright plan.

## Verification

Baseline before modifications: **32/32 headless, production build,18/18 training-browser and13/13 reference-browser PASS**, zero browser errors. Original bundle `index-Bk5P8NB2.js`. Baseline JSON retained as `ux-baseline-training-evidence.json` and `ux-baseline-reference-evidence.json`.

Final verification status is recorded below after final production runs. Production bundle `index-DQOBEUTa.js` (1,097.74KB /302.53KB gzip), CSS `index-DAkMPUwM.css` (44.87KB /10.16KB gzip). Strict TypeScript/Vite build passes with the expected large Three.js chunk warning. **35/35 headless tests pass**, including exact front midpoint/outward normal/rotated-edge reversal, fixed eye and inverse perspective, physical wind mappings, preserved historical import/checksum, and the existing flight/procedure/recording regressions.

Browser evidence files are `ux-browser-evidence.json`, `training-browser-evidence.json`, `browser-evidence.json`; they identify their production bundle. The final UX run passes9/9 checks with19 screenshots on this bundle, zero errors; full training/reference results are listed in the final verification entry below.

Intermediate verification found and repaired inherited `pointer-events:none` on the new head controls, stale English result identifiers and undersized notices, persistent panel scroll when a procedure step changed, and invalid empty setback input. Advanced weather now identifies a modified combination instead of falsely showing an unchanged base scenario. Navigation preserves custom practice conditions separately from mock/reference environments, with explicit restore tests. Technical PILOT text now keeps readable screen size without scaling the aircraft. The old test harness needed Vietnamese selectors and an explicit close-replay action before editing station settings; those were corrected, with successful reruns. One concurrent browser invocation exited143 before completion; its cause is unverified. Final browser runs are sequential; no application error is attributed to that exit.

## Screenshot interpretation

`docs/ux-screenshots/` covers Vietnamese home, controller fault/response, simple wind, collapsed/expanded advanced settings, station diagram/technical marker, fixed Pilot View, both reference exercises, two physical distance captures, strict mock, instructor, laptop, tablet and390px mobile. `docs/training-screenshots/` additionally covers both manual-input courses, complete debriefs, scoring, calibrated input and replay histories.

Distance/course capture fixtures advance the actual force integrator. They do not assign aircraft XYZ. A test-only deliberate mouse head turn occurs once at a capture, explicitly documented in the harness; production view never tracks automatically. Aircraft visibility/scale and camera invariants are inspected, not interpreted as proof of real VLOS acuity or real-time skill transfer. Synthetic course completion still yields human-review-required; high score on an aborted recording stays incomplete. English reference-desk technical text/native browser file-picker wording is not misrepresented as a fully translated legacy engineering console.

## Remaining acceptance and next actions

Representative Vietnamese people have **not** tested this iteration. Follow the concrete participant/task/timing/error/readability plan in [VIETNAMESE_END_USER_UX_RESEARCH.md](VIETNAMESE_END_USER_UX_RESEARCH.md). Review native terminology with instructors, include older learners with varied computer experience, test200% browser zoom/screen readers/actual keyboards and measure whether people find Start/Pause/Retry/Reports unaided. Automated controls/screenshots are not a WCAG audit or evidence of human usability.

Survey/authority-confirm the actual pilot side/setback/station, display geometry/FOV and permissible stabilization. Validate actual RC/adapter calibration, reconnect/faults and latency; benchmark the training center's GPU, long sessions and storage/export recovery. SwiftShader is software-only and does not establish60FPS or operational real-time fidelity. Exact V2 body/paint contact, current official rule applicability and photorealistic environment acceptance remain the earlier documented limitations. No official examination approval, legal wind threshold, real-aircraft command integration or hardware compatibility is claimed.

No Git commit or publication is authorized/created. Same `AGENT_HANDOFF_CONTEXT.md` remains authoritative, with previous history and milestone backups preserved. Owned preview service is stopped at final teardown; README contains restart commands.

## Screenshot review register

All19 UX PNGs were opened for visual inspection (the earlier18 plus the new technical-marker capture), then affected images were refreshed after corrections. Home: four clear choices and readable diacritics. Pilot/courses/distances: true fixed-eye perspective and actual aircraft scale; near/far outer-course horizontal distances9.04/30.22m with projected nominal1m vertical-segment heights41.98/14.39CSS px, not a measured airframe bounding box or human acuity result. Diagram/technical marker: front midpoint outside V1, distinct H, direction indicator, no course relocation. Mock/laptop: Vietnamese preflight and head look, no alternative camera or weather edit. Settings/wind/controller: collapsed/expanded disclosure, known/custom values, actionable USB error and keyboard alternative. Instructor/tablet/mobile: readable controls, no horizontal overflow; mobile is explicitly limited to appropriate configuration/review usage. Advanced panel content requires vertical scrolling; the legacy reference console retains dense English technical text.
