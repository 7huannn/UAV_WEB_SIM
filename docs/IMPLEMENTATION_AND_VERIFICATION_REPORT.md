# Practical training implementation and verification report

Verified 2026-11-18. App v0.2.0. This is an implemented offline practice system with explicit validation boundaries, not an approved examination device, aircraft digital twin or official licence test.

## Delivered behavior

The existing flight laboratory now opens in Training. Navigation provides Training, Mock Examination, Instructor, Session Review, Controller Calibration, Examination Profiles, System Configuration and Reference missions. The original programmed Figure Eight/Outer Circuit demonstrations and reference desk remain available separately. They cannot produce candidate task credit. The original court geometry, local assets, weather model, force/motor/contact integrator and PID gains are preserved. No runtime dependency was added.

Pilot VLOS uses a fixed provisional eye west of H, explicit source/confidence/status, configurable eye/FOV before an attempt and head rotation without translation, tracking, orbit or zoom. H is the aircraft landing area, not the pilot station. Candidate scale/bearing/orientation use actual metre-scale geometry/quaternion. Mock examination locks the station/view and removes route, trace, label/debug and instructor aids. Operating mode and reference/reset shortcuts cannot change during a live attempt. Procedural status stays in the side panel; the duplicate scene status strip is hidden so it does not cover the aircraft at H.

Controller Calibration provides Browser Gamepad/USB-when-exposed input, provisional Mode 2 mapping, min/center/max, inversion, deadzones, normalized/raw diagnostics, connection/fault handling, up to 20 named mappings and explicit keyboard fallback. Hardware is unverified. Manual demand is body-frame horizontal velocity, climb velocity and yaw rate through the existing stabilizer/motor forces at 250 Hz; it is not attitude/rate or raw-throttle mode. There is no automatic takeoff/route/landing in an attempt. Neutral input/connection and grounded H conditions gate manual start. Focus/controller loss interrupts the attempt and captures a stabilized hold.

Versioned practice profiles support climb/hover, orientation/straight flight, complete Figure Eight, complete M1–M5 circuit and abnormal-response acknowledgement. The state machine requires preflight, arm/manual task observation, deliberate manual descent/disarm/stopped motors and postflight. Ordered gates require all route sections; endpoint/crossover/one-lobe/reverse shortcuts do not complete a course. Literal reference coordinates are locked into each attempt. V1 uses an illustrative rotated body footprint; V2 monitoring is approximate local route deviation, not exact fuselage/paint contact. Numeric tolerances and score deductions are TRAINING_ONLY. Metrics/events, human judgement, insufficient data and final review decisions remain distinct. No automatic official pass exists.

Offline recording captures 50 Hz simulation-time pose/quaternion, velocities/rates, motor speeds/thrust, input/raw axes, wind/weather/wetness, task, camera mode/pose/FOV, operating mode, state and violations. Metadata preserves software/geometry/reference/rules/aircraft/controller/station/seed provenance. IndexedDB checkpoints every ten simulated seconds; finalized attempts cannot be overwritten through the storage API. Interrupted checkpoints remain incomplete. Replay interpolates recorded states and optionally restores recorded camera/weather, without changing original samples or pretending to resimulate the aircraft. Instructor notes/practice assessments append separately. JSON with SHA-256 and annotations, CSV and readable report export are implemented. Imports validate size/schema, finite values, monotonic timestamps, quaternion, required weather/geometry/reference data and checksum before replay. Recording is bounded to 600 simulated seconds; imports to 100 MB/30,001 frames.

A future external flight-log manifest defines read-only provenance, coordinate/survey mapping and clock/configuration requirements. No aircraft transport, protocol commands, arming or takeoff integration exists.

## Source changes

- `src/training/pilot.ts`: provisional station, validation, fixed-eye projection and bearing.
- `src/training/input.ts`: calibration/mappings, normalization, keyboard/gamepad faults and body-frame demand conversion.
- `src/training/profiles.ts`: versioned practice tasks, checklists, rule values and provenance.
- `src/training/Session.ts`: legal procedure states, full ordered route/task evaluation, metrics/events and recordings.
- `src/training/records.ts`: import validation/checksums, offline storage, replay, annotations, exports and external read-only manifest.
- `src/ui/TrainingDesk.tsx`: workflow panels, calibration, profiles/configuration, instructor/replay/telemetry plots and exports.
- `src/scene/World.ts`: fixed-step input/record hooks, VLOS/role restrictions, actual trace/reference rendering and replay presentation.
- `src/simulation/DroneDynamics.ts`: manual-only/reset guards, explicit manual engagement, fixed-step hooks and manual ground-reaching descent. Core gains, parameters, motor equations and integrator unchanged.
- `src/ui/App.tsx`, `src/style.css`: workspace navigation and restrained candidate/instructor layouts; original desk retained.
- `src/tests/training.test.ts`, `scripts/training-browser-check.mjs`: native tests and actual Chrome workflow/screenshot evidence. Existing browser/visual runners explicitly select Reference missions for their original checks.
- Package v0.2.0 adds the training-browser script. README, assumptions and the same authoritative handoff updated; no commit created.

## Standards and design documents

1. [Initial gap analysis](REAL_WORLD_TRAINING_GAP_ANALYSIS.md)
2. [Examination standards source register](UAV_EXAMINATION_STANDARDS_RESEARCH.md)
3. [Pilot station and VLOS design](PILOT_STATION_AND_VLOS_DESIGN.md)
4. [Controller architecture](CONTROLLER_INPUT_ARCHITECTURE.md)
5. [Rules, tasks and scoring](EXAMINATION_RULES_AND_SCORING.md)
6. [Real-world validation plan](REAL_WORLD_VALIDATION_PLAN.md)
7. This implementation/verification report.

The latest user specification is preserved in `UAV_PRACTICAL_TRAINING_SPEC.md`. Vietnam sources include the signed decree/circular and a clearly distinguished official military press report of the newer decision; the authenticated full applicable examination appendix remains unverified. Decree articles distinguish aircraft mass classes and Hạng A/B licensing/training. No foreign scoring or drawing-only inference is silently treated as a Vietnamese official profile. Comparison sources cover Korea, Japan, CASA, UK CAA, EU and FAA with category/version/status distinctions.

## Verification

Baseline before edits: **15/15 headless tests and production build PASS**.

Final `npm test`: **32/32 PASS**. Includes all original physics/geometry/mission checks, projection/distance/bearing, calibration/deadzone/inversion/missing axes/focus/disconnect, body-frame nose/tail reversal, manual-only guards, physically integrated manual climb/descent, cadence independence, neutral/start/procedure/pause/abort/limits, orientation dwell, complete ordered routes and shortcut rejection, bounds/strict camera faults, timestamps/replay/export/checksum and malformed weather/geometry rejection. Ideal state interpolation is used only in explicitly labelled evaluator unit fixtures. Separate tests physically fly both complete courses with synthetic manual velocity inputs and never assign aircraft XYZ or invoke programmed missions.

Final `npm run build`: **PASS**. Main JS `index-Bk5P8NB2.js`, 1,050.16 KB / 287.53 KB gzip; expected Three.js chunk-size warning. No added runtime dependencies. Final CSS is34.59 KB /8.29 KB gzip; the packaged JS hash changes with its CSS dependency while application logic is unchanged.

`UAV_URL=http://localhost:4175 npm run test:training-browser`: **18/18 PASS**, zero page/console/request errors, thirteen real WebGL/UI screenshots. Covers fixed VLOS eye/zoom under head look, calibration persistence, actual keyboard input, mode/assistance/reset/station/navigation locks, procedure pause/abort, offline storage, recorded camera/telemetry replay, unchanged original hashes after appended review, three export formats, malformed import rejection, provisional configuration/focus loss, two full physical synthetic-RC flights and 390 px responsive layout. Evidence: [training-browser-evidence.json](training-browser-evidence.json).

`UAV_URL=http://localhost:4175 UAV_CAPTURE_ONLY=none npm run test:browser`: **13/13 PASS**, zero errors, same JS bundle. Preserves motor-driven takeoff/hover/manual/yaw, follow/FPV, shared weather/drag/wetness, both complete programmed missions/return/landing/pause, quality/labels/debug, global pause, reset, dialogs and mobile controls. Evidence: [browser-evidence.json](browser-evidence.json). Original environment/temporal visual matrix remains historical evidence from the prior unchanged material/vegetation/atmosphere implementation; it is not claimed as a new full photorealistic acceptance run.

`git diff --check`: PASS at delivery. All thirteen training images visually inspected. Initial guidance-checkbox focus interruption and compressed saved-attempt buttons were found in browser tests and corrected. A malformed replay-weather/geometry fixture is rejected before rendering. One intermediate browser cleanup exited143 after writing its successful checks; the final rerun exits0. No application exception was reproduced.

## Full-flight browser evidence and interpretation

Synthetic software RC fixtures are explicitly named in candidate metadata, events and limitations. They use reference-guided **test code outside the production app** to submit stick demands through the actual World/manual/PID/motor path. They establish software/physics/procedure integration, not human VLOS competence or real RC compatibility.

- Figure Eight: every gate observed; maximum fixed-step displacement 0.00651 m, route completion around73.64 simulated seconds, max lateral0.380 m, max altitude error0.0252 m and max speed1.627 m/s. Manual descent/disarm/postflight then yielded HUMAN_REVIEW_REQUIRED. Landing error0.738 m exceeds the assumed0.6 m training target and produces a LANDING_POSITION event. This warning is retained; the practice score is a timed-exceedance metric and is **not an automatic pass**.
- Outer Circuit: every gate observed; maximum fixed-step displacement0.00638 m, route completion around92.22 simulated seconds, max lateral0.367 m, max altitude error0.0252 m and max speed1.595 m/s. Manual descent/disarm/postflight yielded HUMAN_REVIEW_REQUIRED; landing error0.543 m.
- Partial keyboard attempts remain ABORTED/INCOMPLETE with unvisited gates and no claimed completion. [Example exported readable report](training-example-report.txt) intentionally shows an aborted attempt with a high numerical practice score and an incomplete decision.

Neither software-generated full flight is presented as a passed real examination. The application exposes measurements and retained events for instructor judgement.

## Screenshots

Under `docs/training-screenshots/`: `pilot-vlos`, `controller-calibration`, `manual-figure-eight-attempt`, `manual-outer-circuit-attempt`, `mock-examination`, `replay-telemetry`, `replay-telemetry-history`, `scoring-report`, `instructor`, `examination-profiles`, `complete-figure-eight-debrief`, `complete-outer-circuit-debrief`, `mobile-calibration` (PNG).

The fixed-eye view shows actual aircraft scale. Hover screenshots use deliberate head rotation rather than tracking or zoom. Training guidance is visibly optional; mock view has it removed. Full-course debriefs show both actual lobes or perimeter against the reference. Telemetry plots show altitude, speed, lateral deviation and RC history; all raw samples remain in JSON/CSV. Mobile has no horizontal overflow. Material/sky realism remains approximate.

## Performance and validation limits

Chrome147.0.7727.101 on Linux, ANGLE/Vulkan **SwiftShader software renderer**, Low quality. Preserved reference-mode30-frame sample: mean7.004 FPS, median116.7 ms and p95250.0 ms;115 calls/22,696 triangles. Observed physics progress200 steps per wall second in that sample; the footer reports slowdown. New viewport/navigation dimensions differ from prior runs, so this is not an isolated optimization comparison. Synthetic fast-forward flight tests are not real-time performance benchmarks.

Physical RC hardware/adapter/latency, actual GPU60FPS, calibrated aircraft/sensors, surveyed pilot station/V2 body contact, human orientation perception and real-world skill transfer remain unverified. Exact official Vietnamese category-specific procedure/tolerances need authority evidence. Abnormal-response acknowledgement and checklists do not automatically evaluate real oral judgement, equipment or people/airspace. V2 exact contact and monitor/display fidelity remain limitations. Browser checksums/storage are not device-signed, proctored or legally certified records. Large/quota-limited/extended classroom sessions still need field validation. Full photorealistic acceptance remains open; this iteration prioritized training functionality.

## Handoff and teardown

Continue updating `AGENT_HANDOFF_CONTEXT.md` as the single authoritative handoff. Its history is preserved; `HANDOFF_BEFORE_TRAINING.md` is a one-time major-milestone backup, alongside the prior refinement backup. Do not create a new handoff every iteration. No Git commit was requested or created. Owned preview4175 stopped at delivery; README provides restart commands. No publishing/cloud deployment or real-aircraft command integration was performed.
