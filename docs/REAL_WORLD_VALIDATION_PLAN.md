# Real-world validation plan

Implementation tests establish software behavior, not skill transfer or authority approval. The following evidence is still required before an institutional or official training claim.

## 1. Authority and syllabus review

Obtain the authenticated current Vietnamese decision, category-specific practical appendix, amendments and approved local procedures. Have the responsible authority/instructor map the 10–25 kg diagram to actual aircraft/licence/operation category; confirm station/examiner locations, VLOS conditions, permissible stabilization mode, manoeuvre order/direction/height, line-contact definition, time limits, tolerances, safety terminations, human judgement and records requirements. Record source/version/effective date and signoff for every rule. Keep all current profiles training-only until resolved.

## 2. Site and geometry

Survey V1/V2/V3, H/HA/HB, marker centers, altitude datum, slope and actual pilot eye station. Compare measured points against the calibrated trace and its ±0.1 m uncertainty. Resolve the low-resolution neck dimensions. Measure the aircraft body envelope separately from arms/props/gear. Validate full body/corridor intersections at worst-case yaw/tilt before treating the approximate monitor as line-infringement scoring. Preserve old geometry/profile versions with old attempts.

## 3. Aircraft model

Collect mass/payload/CG/inertia estimates, thrust/RPM/power curves, motor response, drag and contact/landing behavior. Compare controlled hover, velocity steps, yaw response, stopping distance, climb/descent and gust recovery with instrumented real logs under equivalent conditions. Fit parameters with declared uncertainties, then validate against held-out flights. Characterize sensors/estimation/flight-controller modes and latency. The current ideal-state 15 kg model is an illustrative baseline; it is not an approved type model or digital twin.

## 4. Input hardware

On each proposed transmitter/USB adapter, document device/firmware/driver/OS/browser, axis order/polarity, throttle convention, center noise, endpoint range, calibration repeatability, deadzone and latency. Verify left/right/nose-in reversal and all channels on a stationary safe simulator bench. Unplug, reconnect, lose focus and hide the tab during controlled practice; confirm neutral/hold plus incomplete evidence, never an unnoticed keyboard substitution. Test saved-profile identification against a different device. No physical controller was available here.

## 5. Human VLOS and display

Measure monitor dimensions/resolution/scaling, viewing distance, input-to-photon latency, FOV and physical visual angle. With qualified instructors, compare near/far apparent aircraft size and nose/tail recognition to the real aircraft from the surveyed station. Assess head-look, peripheral context, depth judgement and stopping/landing judgement. Use randomized heading/position trials and record false recognition rates; do not increase aircraft scale or silently auto-track to improve results. Define acceptable fidelity with the training organisation. No trained human cohort/field transfer study has been conducted.

## 6. Performance and reliability

Run the production build on actual classroom PCs/GPUs, record model/browser/GPU/driver/resolution/quality, median/p95/p99 frame times, input/display latency, dropped simulation time and long-session thermal behavior. A 250 Hz fixed simulation step does not mean 250 real steps per wall second on a slow renderer. Test heavy weather, all cameras, 30-minute sessions, storage quota/error, reload recovery, export/import and offline asset availability. SwiftShader screenshots prove rendering paths only; no hardware 60 FPS result is available.

## 7. Assessment validity

Use human-flown complete courses, both directions only where prescribed, novice/intermediate/expert cohorts and independent assessors. Compare task/gate coverage, body/V2 infringements, altitude/speed/heading metrics, procedural omissions and abnormal responses against manual observations and measured field logs. Evaluate disagreement, false pass/false fail, repeatability and guidance effects. Separate numerical monitoring from examiner decisions. Review every source of insufficient data. No official pass threshold should be activated solely because software tests pass.

## 8. Evidence and future field data

Export and archive sealed JSON, CSV, readable report, source profile, human notes and software version. Test checksum rejection and unchanged original hashes after review. Establish institutional access, backup, privacy and retention controls separately; local browser storage is not a legally certified archive.

A future read-only importer must require aircraft ID/configuration, source-file hash/signature status, units/frame (ENU/NED/local), a surveyed world transform, time offset/uncertainty and calibration provenance. Verify transform orientation/handedness/scale, clock synchronization and sampling gaps before overlaying logs. Evaluate recorded reference comparisons with uncertainty bands. `ExternalLogManifest` documents that boundary; no flight protocol/aircraft command transmission exists. Live MAVLink/serial/arming/takeoff control is outside this implementation.

## Acceptance record

For each gate above, save test conditions, responsible reviewer, source/version, raw evidence, measured result, limitations and disposition (verified / failed / insufficient). Until authority, hardware, model and human validation gates are satisfied, describe the product as offline simulation-based practice with human review, never certified examination equivalence.
