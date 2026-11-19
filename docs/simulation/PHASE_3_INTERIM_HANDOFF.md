# UAV ARENA Phase 3 interim handoff — P3-v1 blocked at sky/path architecture

Updated 2026-11-19, Asia/Ho_Chi_Minh. **This is an interim engineering handoff, not Phase 3 completion or visual acceptance.** The user approved P3-v1 and required a contract revision before any fundamental change outside it. The isolated sky/path mismatch now requires the [proposed P3-v2 amendment](PHASE_3_REVISION_PROPOSAL.md), which has **not** been approved. No Phase 4 work is authorized.

## Repository and preservation

Branch `main`, HEAD `aeeeccd617e39b0bff7c9aae717c6c7af0416946`; accepted Phase 1–2 work remains uncommitted and preserved. The [entry manifest](evidence/phase-3/planning-state.json) hashed 289 non-governance files before P3 edits. The [interim comparison](evidence/phase-3/interim-preservation.json) finds only the intended existing P3 owners changed: World, atmosphere, weatherPresets and conditions tests; all eight accepted Phase 2 source hashes still match. New P3 files are `src/scene/optics.ts`, two bounded browser scripts and this phase's evidence/docs. No aircraft plant, Simulation, Weather field, record schema, pilot optics, mission, controller, input, dependency or Phase 4 rain trajectory source was edited in P3.

## Implemented within P3-v1 so far

- Declared WMO-style 5% meteorological optical range, `beta=ln(20)/V`, `T(d)=exp(-beta*d)`. One installed Three fog fragment chunk replaces its Gaussian FogExp2 distance law for built-in fogged materials. The initial path color remains a separate constant and is **not yet coherent with sky radiance**. Pure analytic checks pass for 95/180/260/650 m; rendered neutral-target contrast has not been validated.
- Removed context turf's camera-height alpha fade and expanded the same noninteractive four-strip plane to ±1000 m, below the unchanged 60×42 m official grass. This removes the original hard 600 m termination in the first static comparison but exposes the sky/path color mismatch. No collision or mission geometry changed.
- Rain-level editing retains `timeOfDay`; named presets still choose their original solar time. Focused tests cover 0–10 edits, READY, started Training and Mock lock behavior. Existing wind/cloud/visibility numbers are unchanged.
- Reflection invalidation now observes *current* solar time, cloud and rain instead of target solar/cloud alone; coalesces captures during transitions and captures settled READY/replay changes. The current profile saw two total PMREM captures, at most 65.4 ms isolated, but the full transition/seek/30 s hold gate remains open.

The visible `Sky` shader, cloud shader/fade/color endpoints, sun/ambient mappings, material albedos/roughness, ACES exposure 0.95, rain streaks and camera controls remain the accepted P2 path. The diagnostic uniform probes of the existing sky were runtime-only and were not shipped.

## Actual validation and gate disposition

The accepted P2 bundle `/assets/index-C0vYNo8f.js` and first P3 optical/context bundle `/assets/index-BtHTRi_Z.js` have [85 matched frames each](evidence/phase-3/INTERIM_VISUAL_BOARD.md), across five weather presets and five cameras plus isolation variants, zero browser errors. These are paused synthetic-pose frames. The later PMREM build `/assets/index-jykLWC1k.js` passed a 60-warm/300-measured-frame SwiftShader profile. A one-line idempotent hot-reload guard and final started-scenario assertion followed; the current interim bundle is `/assets/index-D8eKH9VN.js`, with **57/57 tests and TypeScript/build passing**. The visual/profile evidence is explicitly tied to the earlier bundles; a complete final post-amendment build/test/browser run remains required.

- **P3-A:** PARTIAL — source hashes preserved except approved owners; 57/57 suite, typecheck/build. Full prior browser/motion suites and exact record-byte comparison not rerun yet.
- **P3-B:** PARTIAL — clear/overcast/heavy Ground, Pilot, FPV and Overview isolation captured; root cause identified in sky/path and context, but neutral PMREM/linear shader instrumentation incomplete.
- **P3-C:** PARTIAL — analytic 5% MOR checks pass; rendered neutral targets and shared sky/path radiance fail/not complete.
- **P3-D:** **FAIL** — clear Ground at x=640 drops from linear luminance 0.927 (sky y=230) to 0.596 (turf y=235); one adjacent row changes by about 19% versus the 5% limit. Pale band and greenish strip remain across weather.
- **P3-E:** UNVERIFIED — sun direction unchanged, but coherent color/material/neutral swatches and expert review not complete.
- **P3-F:** UNVERIFIED — cloud transport source unchanged, but ten-second and 60-second moving review not yet run.
- **P3-G:** PARTIAL — current-based PMREM invalidation and 65.4 ms observed maximum; full settled-change, hold and seek tests outstanding.
- **P3-H:** PASS for tested rain/solar independence; existing presets and numerical weather values preserved. Further browser transition evidence remains part of the final gate.
- **P3-I:** **NOT ACCEPTED** — the visual scene is not yet credible; no human aesthetic review of a final result has occurred. Current synthetic stills cannot substitute for required moving actual-flight segments.
- **P3-J:** **FAIL on one reference-software run** — [profile](evidence/phase-3/profile-partial.json) median/p95/p99 134.1/159.9/169.0 ms; P2 107.6/115.5/122.7 ms; ratios 1.25/1.38/1.38 exceed 1.20/1.20/1.25 caps. Draw calls 116 and triangles 22,696 match P2; this needs repeated component attribution, not an assumed bottleneck. No hardware-GPU claim.
- **P3-K:** PARTIAL — source audit finds no P3 physics/camera/rain-trajectory edit or duplicate weather owner; all prior tests pass. Full browser/motion suites and final anti-patchwork audit outstanding.
- **P3-L:** PARTIAL — Phase 4 can inherit the defined MOR coefficient and unchanged snapshot/time authority, but cannot inherit a sky/path/color contract until the shared model passes P3-C/D/I.

The twelve P3-v1 anti-patchwork questions are not collectively PASS. Ownership and Phase 1 transport are intact, but question 4 (shared sky/path/light/reflection state), question 3 (resolved horizon mechanism), question 10 (full cost budget), and question 12 (final limits/disposition) remain failed or incomplete. A clean final answer requires rerunning all twelve against the accepted visual implementation.

## Root cause, quality limitation and next approval boundary

The existing Preetham-based Three `Sky` mesh emits nearly white low-elevation radiance even when clouds/fog/context are isolated away. Its atmospheric optical depths and the scene's local ground transfer are independent; no exposed uniform probe found a parameter set that fixes the white band while preserving chromatic upper sky. The P3-v1 optical/context repair therefore cannot satisfy the horizon and art rubric. Raising fog, changing final exposure or adding per-camera filters would violate the user's aesthetic and anti-patchwork requirements. The [P3-v2 amendment](PHASE_3_REVISION_PROPOSAL.md) proposes a single shared sky/path radiance equation inside the existing renderer and a measured performance repair. **Await explicit approval before implementing that replacement.** Phase 3 is incomplete; Phase 4 rain must wait for accepted Phase 3 sky/path/depth, exposure, time and reflection contracts and the user's personal visual acceptance.
