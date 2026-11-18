# Real-world training gap analysis

Assessment date: 2026-11-18. Baseline: 15/15 tests and production build pass. Read the original specification, current handoff/refinement report, source implementation, tests, asset provenance and upright Vietnamese plan. This document describes the starting point; implementation evidence is recorded separately in IMPLEMENTATION_AND_VERIFICATION_REPORT.md.

## Preserve

The calibrated 45 × 27 m concrete court, 60 × 42 m finite turf, V1/V2/V3 paint, H/HA/HB, M markers, analytical figure eight and M1–M5 perimeter remain authoritative project geometry. Do not replace them with an invented exam course. The existing finite reference missions work through the 250 Hz force/motor/PID/contact model, including return, pause and landing. Preserve them as demonstrations, separate from candidate performance.

## Plausible but unverified

Gravity, motor lag, rotor reaction torque, body drag, quaternion dynamics and cascaded stabilization are implemented and numerically tested. The illustrative 15 kg airframe has no measured inertia, propulsion bench data, sensor model or flight-log calibration. Four-foot height-field contact is simplified. Actual RC latency, human orientation recognition, display perceptual scale, hardware GPU performance and real-world skill transfer are unverified.

## Visual approximations

Local PBR materials, layered clouds, finite grass LOD, atmospheric backdrop and rain remain visual approximations. Rain does not affect propulsion. The context matte is not surveyed terrain. Photorealistic acceptance is still open and is not a prerequisite for implementing honest training workflows.

## Missing at baseline / redesign required

The baseline camera can orbit, chase or view from above; it has no fixed pilot station. Keyboard commands are world-frame velocity targets and require automated takeoff. There is no RC normalization/calibration, candidate task evaluator, procedural state machine, restricted mock examination, attempt recording, debrief replay, exports, persistence or append-only instructor review. A landed automated mission is not candidate competence evidence. These require new training modules and explicit role boundaries while preserving reference behavior.

## Evidence boundaries

The plan identifies H, HA/HB, preparation/technical areas, examiner and candidate waiting areas, emergency/PCCC and flight corridors. It does not identify a pilot station. Its 10–25 kg title and 5 m marker labels are drawing evidence, not proof of a complete official licence syllabus. Neck dimensions and digitized positions retain the recorded uncertainty. Pilot coordinates, numeric performance tolerances, scoring deductions, route transfers and checklist timing must remain engineering assumptions until the applicable Vietnamese authority confirms them.

No physical controller, aircraft, surveyed site, certified instructor, measured monitor/viewing geometry or hardware GPU is available here. Software tests can establish mappings, locks, progression and recording integrity; they cannot establish hardware compatibility, certified fidelity or official examination equivalence. Field telemetry must remain read-only, with explicit frame/clock/survey provenance before comparison.

## Implementation priorities

1. Source-backed standards register; provisional station and fixed VLOS with API-enforced camera/aid restrictions.
2. Calibrated Gamepad/keyboard input into the existing fixed-step controller, without route automation in manual attempts.
3. Versioned training-only tasks, complete ordered route evaluation, procedure states and human-review outcomes.
4. Offline immutable attempt snapshots, replay, annotations and JSON/CSV/readable exports; instructor and candidate UI separation.
5. Automated and real-browser checks plus explicit hardware/authority validation plan.
