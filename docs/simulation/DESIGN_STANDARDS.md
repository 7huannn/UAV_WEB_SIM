# UAV ARENA visual, motion and interaction standards

Updated: 2026-11-19, Asia/Ho_Chi_Minh. Program direction: [MASTER_PLAN](MASTER_PLAN.md). Decisions: [ARCHITECTURE_DECISIONS](ARCHITECTURE_DECISIONS.md). Delivery status: [PHASE_HANDOFF](PHASE_HANDOFF.md).

**This is the persistent art-direction and review standard, not a claim that the current scene meets it.** Phases 1 and 2 were formally accepted within their documented scope. The user approved [P3-v1](PHASE_3_CONTRACT.md) and the narrow [P3-v2 amendment](PHASE_3_REVISION_PROPOSAL.md) on 2026-11-19. The test-only [P3-v2 comparison board](evidence/phase-3/P3_V2_PROTOTYPE_BOARD.html) shows an improved clear Ground seam but fails the full-composition standard: a heavy-weather FPV step, weak low-sun color, flat sky/depth and repeated cloud strips remain. The [P3-v3 alternative](PHASE_3_ALTERNATIVE_PROPOSAL.md) is proposed, not approved. No human Phase 3 aesthetic acceptance has occurred.

## Accepted Phase 2 preservation and Phase 3 implementation boundary

The approved [P2-v1 contract](MASTER_PLAN.md#phase-2-implementation-contract--approved-p2-v1-scoped-gates-validated) carries these standards forward unchanged. Implementation uses the existing physical pose and interpolation, fixed pilot station/FOV/unit scale, camera policies, UI identity, exposure/color management, lighting/materials, atmospheric/vegetation sampling and environment snapshots. Diagnostic values belong in evidence, not learner controls. No aircraft wobble, trajectory easing, camera movement, wind animation or extra force may manufacture disturbance response or hide motor saturation.

P2-I was checked with matched frozen-pose/environment stills plus actual force-integrated calm/wind/command/recovery/landing sequences in Pilot VLOS, Follow and FPV; see [PHASE_2_HANDOFF](PHASE_2_HANDOFF.md). Synthetic analytical fixtures and actual simulated flight are labeled separately, as are simulation and wall time. Technical consistency is not aesthetic acceptance, and a plausible flight animation is not physical calibration. P2-J adds scoped diagnostic CPU/storage constraints; representative hardware capacity remains unverified. Inherited horizon/rain/rotor-phase limitations remain recorded under their existing owner phases. Any proposed change to appearance, optics, animation policy or physics direction requires a contract/ADR revision before implementation.

For Phase 3, judge the **combined** sky, horizon, terrain, cloud, illumination, material and reflection image at the same weather/solar state, including moving camera and actual flight. Photographic references teach optical and cloud behavior without importing their geography or color grading. Isolate the current white band and context edge before changing technique. A technical seam metric cannot waive an expert finding that the scene looks artificial; the P3-v1 review rubric and required scene matrix specify both evidence types. Phase 4 rain must inherit the accepted Phase 3 atmosphere's linear-light/extinction/time contract, not compensate for its defects.

## Identity and visual hierarchy

Premium professional simulation means restrained, natural, readable and technically credible. Preserve the existing Vietnamese-first learner workflow and ivory/green interface identity; improve the simulated world as one environment. No arbitrary cinematic filter, bloom/glow, exaggerated saturation, decorative particle noise, or aircraft animation that obscures physical behaviour.

The aircraft and task-critical field markings must be readable at their true perspective scale. Environmental richness supports depth, orientation and weather perception without competing with those subjects. Maintain the fixed pilot station, world scale, explicit head-look and recorded optics; never enlarge the aircraft, silently zoom/track, relocate the pilot, or disable weather degradation merely to improve recognition. If realistic weather reduces visibility, represent that honestly and document the supported training conditions.

Current optics and training policy are in [pilot design](../PILOT_STATION_AND_VLOS_DESIGN.md), [conditions workflow](../FLIGHT_CONDITIONS_UX.md), and current source. Older screenshots show historical interfaces; they are artifact evidence, not authoritative future layouts.

## Color and tonal behaviour

- Sky, terrain, clouds, precipitation and aircraft must share one illumination condition. Use natural relationships: clear sky has chromatic depth, cloud shadows are related to ambient light, rain has restrained contrast, and distant surfaces lose contrast through extinction rather than turning uniformly white at an unrelated cutoff.
- Preserve one documented color-management/output pipeline. Track texture color/data spaces and shader output conventions. Avoid compensating for color-space or lighting errors with albedo darkening or global grading.
- Exposure is explicit and stable for fixed comparison scenes. Retain current fixed exposure through Phase 1. Any later exposure/adaptation change requires a controlled range, simulation/presentation time policy, and tests demonstrating that near objects and horizon remain coherent. No per-camera exposure fix for a shared atmospheric defect.
- Clear, overcast, rain and low-sun conditions have distinct but related tones. Heavy rain may reduce contrast and direct light; it must not become a uniform bright veil or a black cinematic storm. Low sun can warm direct illumination while ambient remains cooler; unrelated color temperatures must not coexist without a reason.
- Solar time is separate from precipitation. Changing only rain must not move the sun once WEATHER-01 is resolved in Phase 3. Complete presets may deliberately choose both and must be labeled as scenarios.
- Assess luminance/chroma and aircraft/background contrast in recorded image regions, together with expert review. Do not invent universal RGB thresholds for beauty or reduce the standard to matching one image histogram.

## Lighting and reflections

Sun direction is common to visible sky, direct light, cloud shading and shadows. Cloud occlusion/overcast response must agree with direct and ambient illumination; cloud cover is not automatically aerosol concentration. State approximations where cloud-shadow detail is omitted.

Ambient illumination, ground bounce and sky reflections must be compatible with current weather. Material-specific lighting cheats cannot conceal a missing common lighting model. Existing approximations may remain until their phase replaces them, with limitations recorded.

Environment maps may update at a lower frequency than rendering, but their invalidation inputs and temporal lag must be explicit. Significant cloud/rain/solar radiance changes must eventually appear in reflections without repeated expensive captures every frame. Do not sharpen wetness into mirror-like reflections to imply fidelity the renderer does not supply.

## Atmosphere, depth and horizon

Use the same defined visibility/extinction semantics for aircraft, terrain and weather presentation, with documented approximations for distant clouds. Sky horizon radiance and terrain in-scattering should meet perceptually; fog color cannot be an unrelated pale constant chosen to conceal a terrain edge.

Near field, middle distance, distant context, horizon and sky must provide a believable progression across eye heights and view directions. Distant context may be inexpensive and noninteractive, but must not imply expanded flight bounds or surveyed facilities. Prefer coherent optical transition and legitimate silhouettes over extra fog or a decorative skyline.

Unacceptable: broad empty white bands caused by unrelated fades; visible rectangular context edges; clouds disappearing into a sharp horizon strip; sky/ground seams exposed by camera rotation; different distance logic that fixes one camera and breaks another. Natural haze and low cloud are acceptable when the scenario and light justify them. Do not force a crisp blue horizon during genuine poor visibility.

Phase 3 must compare scattering, fog and context contributions with diagnostic isolation, then review the combined scene. Diagnostic toggles are not a new product interface and cannot remain competing production pipelines.

## Materials and surface state

Retain recognizable concrete, paint, turf, airframe, metal and rubber responses under changing light. Albedo describes material, not a substitute for illumination. Surface microdetail must have appropriate world scale and avoid distant moiré or obvious tiling.

Wetness darkening, roughness and reflections should evolve from shared surface state; adjacent surfaces cannot imply unrelated weather histories. Preserve the existing 7 s wetting / 32 s drying model in Phase 1 and label it as an artistic surface response, not measured hydrology. Fresh-run initialization was approved in P1-v1 and implemented; see PHASE_HANDOFF for its evidence. Later changes need evidence and a decision record.

No unexplained puddles, exaggerated glossy turf, mirror concrete, glowing paint, or view-specific material patches. Physical wet friction is separate from visual wetness and requires its own justified model. Rain and visual grass are not colliders.

## Rain quality

Final rain acceptance requires all of the following, not simply a particle budget:

- Stable world placement or a documented camera-local recycling method that preserves nearby world trajectories under camera motion. No fractional camera dragging.
- Continuous falling paths consistent with shared local wind and a declared fall-speed/drop model. Changing wind changes velocity continuously according to that model; it does not recompute existing positions from instantaneous wind times drop age.
- Bounded variation in drop/streak size, brightness, speed and distribution with stable seeded identities. Variation must describe precipitation, not random per-frame shimmer.
- Streak appearance follows documented exposure and projection assumptions. Near and distant rain cannot have identical screen weight; no uniform bright line curtain or excessive transparency accumulation.
- Light rain differs perceptually from moderate/heavy rain through a coherent optical distribution and atmospheric state. It cannot be merely a thinner set of identical dominant white marks.
- Nearby streaks, distant precipitation and visibility describe compatible conditions without double-counting extinction. Occlusion respects scene depth; soft intersection/splash effects are optional and cannot hide trajectory errors.
- Ground, elevated overview, Follow and FPV views retain appropriate rain coverage. Camera altitude/rotation cannot expose a fixed rain ceiling, empty volume, or sudden spawn boundary.
- Quality levels preserve comparable perceived intensity. Lower sample counts require a justified optical approximation; fewer particles cannot mean a different weather scenario. Physics and environmental trajectories remain quality independent.
- Long sequences show no obvious synchronized recycling or short exact loop. Recycling occurs outside relevant visibility or with spatial continuity, not arbitrary opacity masks over teleports.

Phase 4 chooses the rendering technique through comparative motion/optical/cost evidence. Instancing is a candidate, not a mandate. More particles, longer streaks and increased opacity are not quality metrics.

## Clouds and vegetation

Cloud distribution/evolution is deterministic for an environment snapshot, independent of render count or seek history. Advection reference heights and any scaled bulk transport are declared. Higher cloud winds may differ from surface wind only through a documented field/approximation. No ad hoc wind parameter just for cloud drama.

Cloud depth, lighting, sun occlusion and horizon treatment should read as one atmosphere. Layered clouds remain acceptable within measured constraints; full volumetrics are optional. Avoid flat repeated bands, obvious texture stamps, screen-space jitter, synchronized resets, and abrupt coverage threshold pops.

Vegetation stays world anchored. Sample relevant local wind; moving the aircraft must not bend all grass differently. Spatial phase variation may describe blade/tuft response without changing authoritative wind. Visible and shadow deformation use compatible motion/LOD. Do not synchronize the whole field, move instance transforms with camera travel, or use drone downwash unless an explicit model is later authorized.

## Motion and time conventions

Physical trajectory comes only from the aircraft plant. Render interpolation follows completed physical states; do not add ease, overshoot or wobble. Camera smoothing belongs to presentation and must not feed forces, inputs, scoring or recorded aircraft position.

- **Simulation time:** wind phase, environmental transport, weather/wetness progression, physical aircraft and any modelled environmental evolution advance with admitted fixed ticks. Preserve the existing 2 s weather response in Phase 1; use shortest-arc wind direction with a deterministic 180° tie.
- **Presentation time:** live rendering interpolates completed states; replay uses selected recorded time. Identical selected time/environment yields the same environmental presentation regardless of wall speed or seek order. Interpolation rules must be defined per field, not applied indiscriminately to angles/discrete modes.
- **UI/camera time:** controls and explicit head-look may remain interactive while physical/environmental time is paused. Camera motion changes projection and visibility, not particle world coordinates or environmental history. Any smoothing reset on camera switch must be intentional, not a teleport of world objects.
- **Pause/resume:** freeze simulation phenomena and preserve their state; discard paused wall duration. Pending weather edits do not evolve until resumed unless a documented READY initialization is being applied.
- **Reset/fresh run:** use the approved shared initial-state contract. Clear/reset the correct phase/transport state once. No unexplained cloud or rain history inherited from another run.
- **Replay:** seeking is state selection/reconstruction, never integration from the last visited timestamp. New records need sufficient state; old records declare missing historical environmental phases. Do not present approximate legacy reconstruction as exact.
- **Transitions:** define units, response times and continuity in the owning model. Keep existing physical response constants unless the phase explicitly changes them. Presets describe destinations, not unexplained jumps; unrelated generic UI easing is prohibited.

The current rain trajectory/placement defects and rotor absolute-phase approximation are tracked limitations, not exceptions to the final standard. Phase-specific gates must name inherited issues and prove that modified paths add no new artifacts. They cannot claim final motion acceptance prematurely.

## Cameras and interaction

Review ground/Pilot VLOS, overview/Orbit/Top down, Follow and FPV. Match FOV, aspect, near/far planes, pose and resolution in comparisons. Preserve perspective and unit airframe scale. Rain, terrain, shadows, clouds and depth must survive camera switches without hidden per-mode fixes.

Continue the current input interruption, neutral-start, mock lock, replay-read-only and conditions-panel policies. Do not restore obsolete instructor/checklist workflows from historical documents. Important controls remain readable and accessible without placing technical implementation details in learner flows. Any new legacy-replay limitation notice should be concise Vietnamese product language; technical provenance remains inspectable.

## Repeatable validation scenes and capture protocol

These are proposed fixtures, not captures performed during planning. Implement a minimal reusable capture recipe during the relevant approved phase; record exact parameters rather than relying on saved local preferences.

For every comparison log source commit/diff or build identifier, environment seed/model/version, initial wetness/transport, elapsed/selected time, weather current/target, aircraft pose/mode, camera pose/quaternion/FOV, viewport, DPR, quality, GPU/browser, and renderer/exposure settings. Label synthetic aircraft poses and physical flights separately. Use seed 42 for the common reference, an explicit epoch, and the same starting conditions on both sides. Current presets in [Weather.ts](../../src/weather/Weather.ts) define baseline values; do not silently drift fixtures with edited presets.

Common weather fixtures: Clear skies, Overcast, Light rain, Heavy rain; add Partly cloudy for cloud motion. Test calm (`wind=gust=turbulence=0`) and strong existing wind (`wind=9`, `gust=4`, `turbulence=0.7`, declared direction). Overrides affect only their stated fields. Low-sun comparison uses explicit solar time 17.5 within the current supported daytime range; no night capability is implied.

Common viewpoints:

- Ground reference: current Ground camera position (−22.9, 1.65, 5.6), target (−13, −0.1, −1.5), recording the resolved FOV/aspect. Pilot reference uses current derived station/head pose and 55° vertical FOV without tracking.
- Elevated overview: current `World.setCamera('Overview')` framing at the recorded viewport; log its resolved pose, since aspect changes the fitted height. Include Top down for rain/coverage diagnosis.
- FPV: a clearly labeled synthetic hover fixture with body centre (0, 5.32, 0), identity orientation, and the existing FPV mount/FOV. Also capture actual force-integrated flight; a positioned fixture is not evidence of flown behaviour.

Required coverage for affected visual phases:

1. Static clear/calm ground and pilot views: horizon, materials, aircraft/paint hierarchy.
2. Static overcast ground/overview/FPV: cloud depth, direct/ambient balance, visibility.
3. Light and heavy rain at all three principal heights/views, in calm and strong wind: streak weight, coverage, distant precipitation and readability. Avoid selecting only favourable combinations.
4. Frozen environmental time with camera translation, orbit, head rotation and altitude changes: world anchoring, stable projection and no hidden state mutation.
5. Continuous cloud/vegetation/rain motion for at least 10 simulated seconds, exceeding multiple current rain cycles; include a 60 simulated second repetition/continuity check for Phase 4. Inspect the sequence, not only endpoints.
6. Clear→rain→clear, calm→strong, and 359°→1° transitions, with pause/edit/resume. Follow until response has settled and record current/target differences; a wall-time delay is not proof under slowdown.
7. Moving aircraft under the real integrator, with static pilot and Follow/FPV views: physical trajectory and environmental consistency.
8. Reset twice, replay forward/backward/random seek and speed changes, then return to live: temporal state and absence of history contamination.
9. Low-sun clear/overcast/rain, supported quality levels, and portrait/landscape camera aspects: no camera-specific optical patch.

Use matched stills plus timestamped image sequences or video at stated simulation intervals. Record dropped wall time/real-time factor; software rendering may be slow while selected-time sequences remain valid for artifact review. Add genuinely live moving observation to assess interaction and cadence. Keep phase evidence under `docs/simulation/evidence/phase-N/` once captures are authorized. Do not overwrite historical baseline screenshots. Existing `scripts/visual-check.mjs` is useful historical infrastructure but must be checked against current UI/selectors and the new timing contract.

## Review and measurable evidence

For each scene, identify observed artifact, source mechanism, before/after frame/time, severity, remedy or owner phase, and reviewer disposition. Evaluate natural color, coherent lighting, depth, world placement, motion continuity, readable aircraft, composition and restraint. Compilation, console silence or an automated screenshot diff alone cannot establish beauty or motion quality.

Use quantitative checks where they answer a question: contrast versus known target distance for visibility, projected streak direction versus local wind/drop velocity, matched-region optical coverage across quality levels, transport/phase equality at repeated seeks, and CPU/GPU cost by component. Phase 3/4 contracts must propose concrete baselines/thresholds for these measures before implementation. Do not invent camera-independent brightness or precipitation thresholds now without observing a baseline.

Performance records include device/browser/GPU/driver, build, viewport/DPR/quality, weather/camera/aircraft workload, warm-up, sample duration/count, median/p95/p99 CPU and frame times, GPU timing availability, draw calls/triangles, memory, admitted/dropped simulation time and real-time factor. Report CPU/GPU timing separately; missing GPU timings are not zero. Use bounded particles/tiles/updates, reuse storage, and make optical quality reductions explainable. Cross-device budgets remain pending representative-device selection and approval; there is no universal 60 FPS claim.

## Quality gate and evolution

Each phase reports architecture, physics, visual, motion and performance/maintainability with PASS/FAIL/UNVERIFIED/N/A and supporting evidence. N/A needs a reason. Phase 1 has no art redesign but its changed environmental motion still requires browser observation. If a required scene or moving review cannot be observed, the relevant gate stays UNVERIFIED; do not call the phase complete.

Preserve these standards across sessions. A proposed change records evidence, reason, visual/physical/performance consequences and an ADR before adoption; user approval is required for changes to agreed direction. Temporary approximations carry issue/decision ID, scope, known limits, removal/revisit condition and target phase. Existing aesthetic defects remain open until their own gates pass; no quantity of technical tests waives them.
