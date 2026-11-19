# UAV ARENA current handoff — Phase 3 P3-v2 prototype rejected

Updated: 2026-11-19, Asia/Ho_Chi_Minh. Restore context in order: [MASTER_PLAN](MASTER_PLAN.md), [DESIGN_STANDARDS](DESIGN_STANDARDS.md), [ARCHITECTURE_DECISIONS](ARCHITECTURE_DECISIONS.md), this record, the complete [Phase 2 handoff](PHASE_2_HANDOFF.md), approved [P3-v1](PHASE_3_CONTRACT.md), approved [P3-v2 amendment](PHASE_3_REVISION_PROPOSAL.md), [interim Phase 3 handoff](PHASE_3_INTERIM_HANDOFF.md), and [proposed P3-v3](PHASE_3_ALTERNATIVE_PROPOSAL.md).

**Current authority:** Phases 1 and 2 are formally accepted. The user explicitly approved [P3-v1](PHASE_3_CONTRACT.md) and the bounded [P3-v2 amendment](PHASE_3_REVISION_PROPOSAL.md). The required test-only minimal prototype was built and compared before production selection. It failed the user's whole-scene visual condition and was not installed. **Stop further atmosphere implementation; [P3-v3](PHASE_3_ALTERNATIVE_PROPOSAL.md) requires explicit approval. Phase 3 is not visually accepted, and Phase 4 is unauthorized.** The original Phase 1 report below remains accepted history; older planning-only text is superseded by this paragraph.

## Current Phase 3 interim disposition

Read the [interim Phase 3 handoff](PHASE_3_INTERIM_HANDOFF.md) for changed sources, preserved hashes, 85 matched P2/P3-v1 frames, root-cause isolation and P3-A–L interim statuses. The P3-v2 [comparison board](evidence/phase-3/P3_V2_PROTOTYPE_BOARD.html) adds 85 isolated-prototype frames, low-sun pairs and actual-flight motion. The retained Three sky remains near-white at the horizon; the prototype removes one local band but fails heavy FPV continuity and whole-scene art direction. Repeated retained-build profiles show the original single P3-J measurement was not stable. Human aesthetic review of a final result and other gates remain pending. **Stop dependent sky/path work for P3-v3 approval; do not begin Phase 4.**

## 1. Authorization, phase and disposition

The user explicitly approved **P1-v1** on 2026-11-19 with **"I approve"**. Phase 1 was implemented and its scoped software/visual-regression gates passed. In the subsequent instruction on 2026-11-19, the user stated: **"I formally accept the Phase 1 implementation and its validated scope"**, including its explicitly documented limitations and deferred issues. **Phase 1 is now formally accepted.** This accepts the reported scope, not real-aircraft calibration, final sky/rain quality or unmeasured hardware performance.

At the Phase 1 acceptance checkpoint, the user separately authorized **"Phase 2 planning and contract preparation"**, required reading/verifying the accepted foundation, and initially instructed **"Do not modify application code yet"**. That planning stage produced [P2-v1 in MASTER_PLAN](MASTER_PLAN.md#phase-2-implementation-contract--approved-p2-v1-scoped-gates-validated). The user subsequently approved P2-v1 implementation and formally accepted its scoped result; its actual evidence is in the [Phase 2 handoff](PHASE_2_HANDOFF.md). At the time of this earlier section, Phases 3–6 were unauthorized; the current Phase 3 planning authority is recorded above. Sections 2–8 below retain the accepted Phase 1 report/evidence; the continuation and planning record below is historical.

Baseline remains `main` at `aeeeccd617e39b0bff7c9aae717c6c7af0416946`; changes are uncommitted. Final production application script is `/assets/index-I7FYVFLg.js`, CSS `/assets/index-D9pGnXdO.css`. No dependency, aircraft parameter, field geometry, mission, scoring, input magnitude or camera-optics change. Do not switch branches or discard working-tree changes on resume.

History: initial planning established the four records and revalidated 39 baseline tests/typecheck. P1-v1 approval authorized only Phase 1. Formal result acceptance and Phase 2 planning authorization came afterward, as recorded above. Earlier handoff/browser/visual reports outside this evidence directory remain historical, with different builds and sometimes superseded UI descriptions.

## 2. Actual implementation and files changed

- [Simulation.ts](../../src/simulation/Simulation.ts): the one fixed-step scheduler owns integer ticks, elapsed/admitted/dropped time, pause, weather/wetness stepping and cloud transport. Snapshots, interpolation, validation and explicit environment restore are colocated here. Resume notifies the host to discard its wall-time baseline; there is no host clock inside environment data.
- [DroneDynamics.ts](../../src/simulation/DroneDynamics.ts): `advance()`/fixed `step()` delegate to the coordinator; `time` is derived/read-only. Input and completed-state hooks remain exactly once. Reset retains the original coordinator/callback bindings, selected mission/restrictions/guards, initializes the approved fresh environment, and resets aircraft state through the existing fresh-state pattern.
- [Weather.ts](../../src/weather/Weather.ts): one pure snapshot-capable wind sampler; shortest-arc angle transitions with a positive exact-half-turn tie. Existing scalar/7 s wetting/32 s drying response constants remain. Finite legacy towards angles normalize before trigonometry; new environment blocks require directions in the supported 0–360° interval.
- [World.ts](../../src/scene/World.ts): both command adapters integrate at fixed ticks; reference keeps world-frame keyboard semantics and training keeps body-frame demands. READY/start/reset synchronize environmental initialization/metadata. Live/replay choose a presentation snapshot; replay does not write into live Weather, and restores prior pause status. Resume invalidates the RAF baseline instead of admitting paused time.
- [atmosphere.ts](../../src/scene/atmosphere.ts): reads selected environment time/transport, removes render-accumulated cloud history, and samples current rain-volume bulk wind. Sky/cloud shapes, fog/light/exposure, rain primitives/count/opacity/height remain unchanged.
- [grass.ts](../../src/scene/grass.ts), [grassClumps.ts](../../src/scene/grassClumps.ts): stable tile-centre wind samples with per-tile material uniforms, shared geometry/programs, and matching visible/depth deformation. Existing blade response and LOD remain; no aircraft-position wind dependency or per-blade CPU field evaluation.
- [Session.ts](../../src/training/Session.ts), [records.ts](../../src/training/records.ts): versioned optional initial/frame environment blocks, consistency/bounds validation, adjacent-state interpolation, and immutable legacy adaptation. A bounded two-float64-per-frame prefix cache reconstructs old bulk transport independently of seek order.
- [Review.tsx](../../src/ui/Review.tsx): one concise Vietnamese approximate-environment notice for legacy replay. No product redesign.
- [environment.test.ts](../../src/tests/environment.test.ts): seven meaningful Phase 1 test groups. Existing conditions tests now assert initial environment/wetness agreement. Evaluator-only training fixtures use explicit clock restore instead of mutating aircraft time; their original assertions remain.
- `scripts/phase1-browser-check.mjs`, `phase1-motion-check.mjs`, `phase1-metrics.ts`: reproducible reference scenes, selected-time/live motion/replay checks, and bounded CPU/recording diagnostics. Existing conditions/redesign/native-zoom suites accept `UAV_EVIDENCE_DIR` so new captures do not overwrite historical evidence.
- README, assumptions, controller/conditions documentation, the four simulation records, and the top-level handoff pointer describe the changed facts. No unrelated UI/style, asset, configuration or package change.

## 3. Architecture decisions and compatibility

ADR-002 through ADR-006 are implemented under the approved contract. There is one live Weather/Simulation/aircraft path. Immutable presentation/record snapshots are derived data, not a second authoritative weather system. Old render-owned cloud integration, replay weather writes, aircraft-driven vegetation wind and reference per-frame demand integration were removed.

The existing controller and motor/force integration block were compared directly with baseline source and are unchanged except scheduling/time/hook ownership. Parameters, mission definitions, arena geometry, training profiles and input conversion files remain byte-identical. Public non-fixed `step(dt)` now rejects; fixed stepping advances Weather exactly once, correcting its previous bypass. Evaluator fixtures use validated explicit environment restore, never a second production clock.

New schema-1 optional `environment` has `version=1`, `model=sinusoidal-bulk-v1`, seed, completed tick/absolute time, current/target weather, wetness, and cloud X/Z transport. Frame `time` remains attempt-relative. Completed extensions require tick/time, seed and channel consistency, finite/bounded data and a supported version. Continuous fields interpolate; discrete fields hold preceding values. Interpolated presentation time lies between ticks and is not a completed state suitable for restore.

Cloud bulk transport retains the declared world reference (0,270,0) and legacy 0.3 scale. Rain retains a bulk sample at its current volume centre; individual trajectories are still RAIN-01. Vegetation tile approximation bounds follow the current sine-field gradients. These are explicit approximations with later owner phases, not claims of calibrated atmospheric physics.

Fresh H resets and READY conditions use current=target and wetness=normalized rain, equilibrium of the existing surface model, as approved. Ordinary continuation preserves history. Replay freezes the live coordinator and only reads separate presentation data; exit restores the previous pause status. Original sealed legacy payloads, checksums, annotations and exports are never adapted in place.

## 4. Tests and reproducible evidence

Evidence root: [evidence/phase-1](evidence/phase-1). Initial baseline state was captured before application edits; before images used Vite with unchanged baseline source. Final production regressions use explicit `127.0.0.1:4177`. Source/build identity and invariant checks are recorded in [source-manifest.json](evidence/phase-1/source-manifest.json).

Commands (already run; do not repeat without a new change, failure or unresolved concern):

```sh
TSX_DISABLE_CACHE=1 npm test
node_modules/.bin/tsc --noEmit --incremental false
npm run build
UAV_URL=http://127.0.0.1:4177 node scripts/phase1-browser-check.mjs after
UAV_URL=http://127.0.0.1:4177 node scripts/phase1-motion-check.mjs
UAV_URL=http://127.0.0.1:4177 UAV_EVIDENCE_DIR=docs/simulation/evidence/phase-1/regression node scripts/redesign-browser-check.mjs
UAV_URL=http://127.0.0.1:4177 UAV_EVIDENCE_DIR=docs/simulation/evidence/phase-1/regression node scripts/conditions-browser-check.mjs
UAV_URL=http://127.0.0.1:4177 UAV_EVIDENCE_DIR=docs/simulation/evidence/phase-1/regression node scripts/native-zoom-browser-check.mjs
git show aeeeccd617e39b0bff7c9aae717c6c7af0416946:src/simulation/DroneDynamics.ts > /tmp/uav-p1-baseline.ts
TSX_DISABLE_CACHE=1 node --import tsx scripts/phase1-metrics.ts /tmp/uav-p1-baseline.ts
```

Current headless result: **46 passed, 0 failed** ([tests.txt](evidence/phase-1/tests.txt)); all 39 original assertions/groups retained. Typecheck passed without diagnostics; production build passed ([build.txt](evidence/phase-1/build.txt)), with the existing large-chunk advisory. No new dependencies were installed. Chrome native canvas MediaRecorder supplied video; missing optional Playwright ffmpeg was not installed.

Evidence roles:

- [characterization.json](evidence/phase-1/characterization.json): pre-change 7,500-step calm/seeded-wind states. New tests match position/velocity/motors and quaternion geodesic error within 1e-8, without changing physical constants.
- [before/evidence.json](evidence/phase-1/before/evidence.json), [after/evidence.json](evidence/phase-1/after/evidence.json): matched clear/overcast/light/heavy rain, Ground/Overview/FPV and environmental motion captures; 16 before and 16 after frames. Synthetic FPV height fixtures are explicitly not flown trajectories. The supplementary profile-repeat.json is an intermediate measurement whose exact bundle was not logged; it is excluded from final acceptance.
- [motion/evidence.json](evidence/phase-1/motion/evidence.json), [motion.webm](evidence/phase-1/motion/motion.webm): 11 selected cloud times over ten simulated seconds; real RAF-driven Follow takeoff; four close-up Ultra vegetation motion frames; pause/resume, speed, camera, reset, backward/random seek and legacy immutability checks. [recording.json](evidence/phase-1/motion/recording.json) is the 500-frame synthetic manual recording used for seeking checks.
- [redesign-browser-evidence.json](evidence/phase-1/regression/redesign-browser-evidence.json), [conditions-browser-evidence.json](evidence/phase-1/regression/conditions-browser-evidence.json), [redesign-native-zoom-evidence.json](evidence/phase-1/regression/redesign-native-zoom-evidence.json): current training/recording/input/navigation, conditions/mock policy and actual native 200% zoom regression evidence. All three suites passed on the final production build: 16 grouped checks, 54 screenshots, zero errors. The conditions/native results record the final bundle explicitly; the redesign suite used the same unchanged production server/build.
- [costs.json](evidence/phase-1/costs.json): paired Node CPU kernel/scheduler diagnostic, 600-second recording size and legacy seeking/cache cost. The historical kernel is read into a temporary module; no branch switch or second product pipeline is created. It uses the unchanged current wind formula for the controlled valid-angle fixture. This is not a GPU or real-aircraft benchmark.

## 5. Acceptance and five-dimension gate

P1-A: one coordinator and exactly-once stepping; P1-B: baseline plant/force preservation; P1-C: real reference/training command adapters across 30/60/120 Hz/irregular admission and overload; P1-D: angular wrap/endpoints/ties; P1-E: local sampler/tile error bounds/anchoring; P1-F: reset/READY/pause/guards; P1-G: versioned and legacy recording/seek/live restoration. These software groups pass in the final headless log. Initial level +X wind drag remains **12.544 N at 8 m/s**, with zero direct aero angular acceleration in that fixture.

P1-H and P1-I include observed browser motion, same-build integration and bounded cost evidence. P1-H/P1-I pass for their approved software/regression scope: final-build observed sequences, 16 browser regression groups, six motion/replay groups, 114 PNGs including matched references, and measured bounded cost. This is not final atmospheric/rain aesthetic acceptance. Hardware capacity remains explicitly UNVERIFIED and is not a Phase 1 real-time guarantee.

Five dimensions:

- **Architecture:** one plant/field/coordinator and derived presentation data; obsolete competing responsibilities removed. Source review and numerical gates pass.
- **Physical correctness:** 39 baseline plus seven new groups pass; normal-advance trajectories preserved and no new forces/gains/models introduced. Real-aircraft calibration remains unverified.
- **Visual quality:** scoped regression review, not final aesthetic acceptance. Matched clear ground and overcast FPV preserve framing/tonal relationships; light/heavy rain retain their inherited streak style. Horizon whitening/flat clouds remain obvious and open for Phase 3. No new color/exposure trick was added. Final visual-art improvement is N/A to Phase 1; browser regression is required, not N/A.
- **Animation quality:** chronological cloud/vegetation/flight/seek sequences reviewed as sequences, not just still endpoints; timing/seek assertions complement observation. Cloud displacement is gradual at selected times; tile transforms remain anchored; no new reset/seek-history contamination observed in covered scenes. Old rain cycling, wind-change repositioning and camera dragging remain Phase 4 defects. Exact rotor phase is outside this phase's guarantee.
- **Performance and maintainability:** bounded per-tile work and record cache, shared shader programs/geometry, no new dependency. Node costs and browser wall timings are reported separately; missing GPU timestamps are null, not zero. Do not infer a speedup or hardware target from software rendering. Final cost values are in costs.json; refresh measurements only for a new source change, failure or unresolved concern.

## 6. Performance interpretation and limits

The before/after Low/1280×800 reference samples have 116 draw calls and 22,696 triangles, unchanged. The 40-frame baseline median/p95 were 117.5/122.8 ms; final matched sample median/p95 were 109.0/114.5 ms. Real-time factor was 0.819→0.875; these short software-renderer samples establish no hardware speedup or budget. Samples use Chrome 147 / ANGLE SwiftShader, DPR 1 with the existing quality pixel-ratio limit. They are wall-frame distributions, not separate GPU timers. An initial short development capture had p95 outliers during concurrent checks and was superseded by the final matched capture. The retained after/profile-repeat.json is an intermediate isolated measurement with no exact bundle logged, excluded from final acceptance. Use only the named baseline/final samples for the numbers above; do not combine unlike sample lengths/builds into a controlled speedup claim.

Recording capacity was exercised for 600 simulated seconds / 30,000 frames. The measured new record is 33,716,049 bytes versus 22,930,898 bytes without the extension, approximately 17.98 kB added per simulated second, below the 100 MB import limit. Legacy transport uses exactly 16 bytes per frame (480,000 bytes at that count), constructed once and queried independently of seek history. No unbounded transport/particle history was added. The paired Node medians were 1.323→1.493 microseconds/tick, adding about 0.042 ms per simulated second. Prefix construction took 10.03 ms; 1,000 varied seeks took 8.78 ms. These do not calibrate aircraft or precipitation.

Large-record serialization is a real cost: the 600-second JSON encoding took 198.6 ms in this Node workload. Observed process RSS was 484.8 MiB while holding the new attempt, encoded JSON, and a separate legacy clone; this is not a normalized peak or browser/GPU footprint. Existing checkpoint/export serialization remains a long-record frame-stall risk, increased data size is an explicit trade-off for inspectable replay state, and actual browser checkpoint latency/target-device memory need Phase 6 workload profiling. No new performance guarantee or hidden budget relaxation is claimed.

Hardware GPU/driver budgets, physical RC hardware, sensor fidelity, real-aircraft calibration, official examination equivalence and human skill-transfer acceptance remain unverified. See [REAL_WORLD_VALIDATION_PLAN](../REAL_WORLD_VALIDATION_PLAN.md). No universal 60 FPS or real-time 250 Hz claim.

## 7. Anti-patchwork review

1. **PASS:** one authoritative live environment/clock; snapshots are read-only inputs to rendering, not another evolving weather model.
2. **PASS:** one wind formula and aircraft kernel; direct/advance entry points delegate, and field consumers declare sample locations.
3. **PASS with declared limits:** no arbitrary new force/optical tuning. Existing 0.3 cloud approximation retained; numerical tolerances/input bounds documented.
4. **PASS:** no extra fog/opacity/camera correction hides a root defect; scoped inherited artifacts remain open.
5. **PASS in covered scenes:** cameras change projection, not authoritative environment. Current rain camera-relative defect remains explicitly RAIN-01.
6. **PASS within declared approximations:** local vegetation/aircraft and bulk rain/cloud samples use the same field/time; no fake aircraft disturbance.
7. **PASS:** ADR-002–006 follow approved P1-v1; no silent direction change or later-phase implementation.
8. **PASS in covered corrected paths:** cloud history/seek and resume timing corrected; no new observed discontinuities. Existing rain/rotor limits remain identified.
9. **PASS for regression:** current identity/material/light style retained; final scene aesthetics remain Phase 3/4 review, not claimed complete.
10. **PASS:** old cloud integration, replay mutation and per-frame command path retired rather than left alongside replacements.
11. **PASS:** record compatibility and meaningful tests included; later work consumes documented contracts, not temporary duplicate pipelines.
12. **PASS:** source, decisions, assumptions, test commands, captures, provenance, limits and next approval boundary are recorded here and in the other three records.

## 8. Deferred issues and next dependencies

- Phase 2: aerodynamic coefficient/force/moment/controller/saturation/convergence validation. Existing gains and simplified drag are preserved, not calibrated by Phase 1.
- Phase 3: ATM-01/02, LIGHT-01, WEATHER-01; horizon/extinction/light/reflection coherence and rain-slider solar-time decoupling. No art implementation occurred here.
- Phase 4: RAIN-01/02; real trajectories/placement/variation/optics/distant precipitation and perceived quality-level intensity. Current bulk sampling is a documented intermediate approximation, not completed rain realism.
- Phase 5: WIND-01/AERO-01/CONTACT-01 candidates; advanced fields/moments/inflow/wet contact require fidelity targets and justified data, not extra drama. Cloud transport scale/reference may be revisited in Phase 3/5 with a versioned decision.
- Phase 6: representative hardware budget/profiling and cumulative refinement. No permission to postpone earlier gates or erase software-renderer limits.
- Legacy original wind phase/cloud history and exact historical rotor phase are not recoverable from missing data. Preserve the approximate notice and immutable payload policy across later versions.

## 9. Exact continuation actions and approval boundary

1. Phase 1 is formally accepted with the limits in sections 3–8. All four records and current model/test/provenance paths were read during Phase 2 planning. Source hashes match accepted evidence; planning edits preserve application, scripts, tests, assets, configuration and all existing evidence.
2. Review the complete proposed P2-v1 in MASTER_PLAN, including P2-A–J targets and proposed ADR-008–010. **Stop for explicit contract approval.** This planning authorization permits no application/test/script/configuration changes or Phase 2 execution.
3. If explicitly approved later, re-read these records and verify working-tree/source hashes against the planning manifest; preserve/reconcile user edits. Then implement only P2-v1, run its gates, report results and stop for Phase 2 acceptance. Approval to implement is distinct from acceptance of its results and authorization for Phase 3.
4. If a required test fails or a new failure contradicts Phase 1, report the assumption/impact. Behavior-changing remedies need a concrete approved contract/ADR revision before dependent implementation. Do not alter gains, add forces or mask failure with visual motion. Complete unaffected authorized checks and preserve failure evidence.

At every future handoff retain: phase/contract/source identity; implementation vs validation vs approval status; files/architecture; test/visual/physics/performance evidence; limits/remaining issues; preserved decisions; next dependencies/actions; explicitly deferred work; and actual user approval reference. Evaluate all five dimensions and twelve anti-patchwork questions. Required failed/unobserved gates keep the affected phase incomplete.

## 10. Phase 2 planning verification and deliverable

Planning on 2026-11-19 verified `main`/HEAD `aeeeccd617e39b0bff7c9aae717c6c7af0416946` and preserved the 25 existing Git status entries. The 19 source hashes in [Phase 1 source-manifest.json](evidence/phase-1/source-manifest.json) match the working tree. The final Phase 1 bundle remains in `dist/index.html`. The [planning-state manifest](evidence/phase-2/planning-state.json) records the pre-planning status and hashes of the accepted non-governance files; final checks verify zero content changes to those files. Only the four governance records, top-level discovery pointer and this new documentation manifest change during planning. No application, test, script, configuration, dependency, asset or historical evidence change; no commit/push or server start.

Reviewed source includes the coordinator, complete aircraft/controller/contact kernel, parameters/mixer, shared wind formula, physical/mission/environment tests, input conversion, Session/record provenance and real-world validation plan. Contract preparation used primary references for drag/model structure/saturation, linked within MASTER_PLAN; none supplies calibrated coefficients for this UAV. P2-v1 defines physics accounting, optional nonintegrating diagnostics, invalid override rejection, analytical/numerical checks, disturbance/recovery fixtures, regression/motion/cost limits and the fail-before-retune boundary. It authorizes no code until explicitly approved.

Planning validation is limited to repository identity, content hashes, recorded test/evidence review, source/contract consistency, links and documentation whitespace. The accepted 46 tests/build/browser/motion results above remain Phase 1 evidence; they were not rerun or relabeled as Phase 2 passes. All P2-A–J runtime/visual/performance gates are **NOT RUN — pending contract approval and implementation**. Physical calibration remains UNVERIFIED. Existing art/animation/architecture/anti-patchwork standards remain in force without a new acceptance claim.

## Phase 1 delivery operational state (historical, preserved)

Phase 1 validation completed on 2026-11-19. At that delivery there was no commit/push, dependency install, visual redesign or Phase 2 work. Both owned local servers (Vite dev 4176 and production preview 4177) were stopped after validation; unrelated services were untouched. Application data in browser checks used disposable profiles; existing historical screenshots/evidence remain untouched. Subsequent Phase 2 work is documentation-only planning as recorded in section 10.
