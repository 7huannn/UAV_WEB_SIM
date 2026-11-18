# UAV Arena refinement report

Verified 18 November 2026. Build `/assets/index-CWunFRAi.js`. Functional mission acceptance passes; **full photorealism and the hardware 60 FPS target remain open**.

## 1. Summary

The existing app now has two finite missions. Both arm and take off at H, fly through the existing motor/PID/6DOF controller, return to H and land before completing. Court dimensions, official paint, route radii, the original airframe and physics parameters remain intact.

Overview framing now fits projected court bounds for each aspect ratio. Top-down is vertical and avoids the weather panel. Ground view exposes more surface. Concrete has finer PBR detail, broader variation, a shallow 3.5 cm edge, 5 mm bevel, narrow soil interface and restrained wet roughness. Paint sits closer to the surface.

Grass is world anchored, with deterministic near tuft tiles, simpler middle-distance blade tiles and matching multi-scale far turf. Culling and smooth height fades replace the moving local patch. Stable filtered cloud shells replace the jittered ray march. Shared weather drives advection, vegetation, rain and lighting; reflection maps refresh after weather/time transitions settle. An optional visual Context matte removes the blank cutout while leaving the simulated field at 60 × 42 m.

Compact marker dots and overlap-managed engineering labels replace large dark boxes. Desktop/mobile mission selection changes the preview, highlighted route, planned length, next waypoint and progress without rebuilding the flight desk.

## 2. File changes

- `src/simulation/missions.ts`: reusable mission definitions, source-derived marker coordinates, arc-length paths and explicit departure/return legs.
- `src/simulation/DroneDynamics.ts`: finite mission target scheduler, phase/progress state, pause/resume and landing completion hooks. The motor mixer, PID gains, rigid-body integrator and contact resolution are preserved.
- `src/scene/World.ts`: aspect-aware camera fitting, ground/PBR/bevel/context integration, route selection, reflection refresh and quality integration.
- `src/scene/paint.ts`: retained official marking geometry, smaller optical paint height, compact dots and screen-sized label overlap/priority handling.
- `src/scene/grass.ts`, `grassClumps.ts`, `grassTiles.ts`, `random.ts`: deterministic world tiles, near/middle detail, LOD fades, frustum culling, shared wind and matching Ultra shadow deformation.
- `src/scene/atmosphere.ts`: seeded filtered cloud layers, continuous wind advection, continuous fog/ambient blending and quality-scaled rain.
- `src/ui/App.tsx`, `src/style.css`: mission selector, accurate previews/lengths/phases, abort control, optional Context and mobile layout.
- `src/tests/{missions,grass,simulation}.test.ts`: finite-mission/vegetation checks and preserved physics/paint regression tests.
- `scripts/browser-check.mjs`, `scripts/visual-check.mjs`: both complete browser missions; full view/temporal matrix, profiles and isolated graphics/weather shader checks.
- README, assumptions, licenses and handoff updated. Prior images/evidence and the preceding handoff are preserved under `docs/baseline-*` and `docs/HANDOFF_BEFORE_REFINEMENT.md`.

No new runtime dependencies or external assets were downloaded.

## 3. Mission verification

**Mission 01 — Figure Eight:** approximately 88.5 m horizontal plan, including the transfers and return. The original 74.5 m analytical circle/tangent course is rotated to its westernmost entry; both lobes retain their original shape and direction. It returns through the existing H gate. The browser recorded Entry → Figure Eight → H, then LANDING → COMPLETED with motors disarmed. Final horizontal H error was 0.019 m; gear altitude was 0.0014 m at physical contact.

**Mission 02 — Outer Circuit:** 112.0 m horizontal plan. Actual tested order was Gate → M1 → M2 → M3 → M4 → M5 → Gate → H. It follows the perimeter corridor and returns along the left side rather than cutting diagonally. Final H error was 0.027 m; gear altitude was 0.0024 m at contact, with motors disarmed and phase COMPLETED.

Both browser runs paused during execution, held progress, resumed, reached the H approach above 4.5 m and remained below 100% until landing. Selection was disabled while active. Headless tests verify both lobe extrema, exact marker ordering, actual outer-corridor containment, strict lifecycle order and bounded per-step displacement. Tests forward-step the same 250 Hz force integrator; they do not assign aircraft XYZ to fake flight.

The departure/return procedures are documented assumptions. They are optional route overlays, not additional official paint. No conflict was found between the requested M1–M5 order and the visible outer arrows.

## 4. Visual results

The following are actual High-quality Chrome captures under `docs/screenshots/`, reviewed against the original diagram and saved baseline images:

- `aerial-clear.png`, `overview-partly-cloudy.png`, `overcast.png`, `rain-overcast.png`: whole-court framing, a continuous visual setting and coherent weather changes replace the blank cutout. Rain darkens the surface without turning it into a mirror.
- `top-down-reference.png`: vertical map comparison; the calibrated 45 × 27 m footprint, V1/V2/V3, circles/crossover and H/HA/HB remain aligned with the source within the documented trace assumptions.
- `ground-concrete-detail.png`, `concrete-grass-transition.png`: more useful surface framing, finer aggregate, shallow edge/bevel and soil/turf contact instead of an ungrounded texture plane.
- `grass-closeup.png`, `grass-mid-distance.png`, `grass-long-distance.png`: world-space near/middle/far detail replaces the camera-following patch. Geometry cost is substantially lower. The turf/tuft shading and density transition can still look synthetic.
- `figure-eight-preview.png`, `outer-circuit-preview.png`: distinct source-derived plans, transfer/return overlays and computed lengths.
- `compact-engineering-labels.png`: small light labels suppress overlaps; active markers take priority. Hidden lower-priority labels are intentional when screen rectangles collide.
- `return-to-h-approach.png`, `drone-flight.png`, `fpv-flight.png`: live controller-driven aircraft state during H return; follow/FPV transforms preserved.
- `mobile-controls.png`: the whole court, all camera tabs, mission selector and flight controls fit a 390 × 844 viewport without horizontal overflow.
- `ultra-grass-depth.png`: Ultra's matching wind/LOD shadow shader compiles and renders.

Temporal images `clouds-frozen-a/b`, `clouds-moving-0/1/2`, `grass-travel-0/1/2` and `grass-wind-0/1/2` were compared. Frozen raw WebGL frames are byte-identical. Clouds move slowly through an integrated world-wind offset; vegetation instance transforms do not change as the camera crosses tile boundaries. No random screen jitter or camera-local vegetation jump was observed in these samples. This is sampled temporal evidence, not an exhaustive guarantee at every camera speed/device.

The clouds still read as flat layers near the horizon, the distant matte is visibly simple, and the closest grass views retain game-like texture/geometry cues. **These images do not establish full photorealistic acceptance.**

## 5. Performance

Browser: Chrome 147.0.7727.101, Linux x86_64, 16 logical cores exposed. Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver). Browser viewport1600 × 1000. No hardware GPU was accessible: `/dev/dri` is absent and `nvidia-smi` could not communicate with a driver.

- Final active-simulation Low Overview, 30 frame intervals: mean **7.53 FPS**, median **133.3 ms**, p95 **150.1 ms**.Actual canvas1111 × 753,115 draw calls and22,696 rendered triangles. The baseline was2.67 FPS with383.2 ms median/399.9 ms p95. Camera/material/LOD work changed between runs, so this is a whole-scene comparison, not an isolated GPU microbenchmark.
- High Overview, 30 intervals:5.84 FPS,166.7 ms median,183.4 ms p95. Actual canvas1308 × 887,115 calls,22,696 triangles.
- High grass closeup, 30 intervals:1.24 FPS,800.0 ms median,1383.2 ms p95;95 calls,737,656 triangles. The prior High closeup was about5.25 million rendered triangles including shadow passes: approximately86% less geometry work. High now omits broad grass shadow casting; Ultra retains that detail.
- Ultra near-grass shader check:2,598,234 rendered triangles/167 calls; no FPS claim from this single capture.
- Renderer resource counts:98 geometries/15 textures in High overview;103/19 in closeup. These are counts, not measured VRAM bytes.

SwiftShader is a software fallback. Heavy closeups remain slow, actual fixed-step progress can fall below250 steps per wall second, and **60 FPS on a suitable hardware GPU has not been measured**. The footer correctly reports simulation slowdown. No thermal or extended hardware frame-time benchmark was possible.

## 6. Tests

- `npm test`: **15/15 PASS**. Existing physics/paint checks remain; the old endless-lap test is replaced by complete finite-mission tests, and deterministic tile checks are added.
- `npm run build`: **PASS**. Main JS982.37 KB /266.66 KB gzip; expected Three.js engine chunk-size warning.
- `UAV_URL=http://localhost:4175 UAV_CAPTURE_ONLY=none npm run test:browser`: **13/13 PASS**, zero JS/console/request errors, final bundle matches visual evidence. Captures are maintained by the separate full visual matrix.
- `UAV_URL=http://localhost:4175 node scripts/visual-check.mjs`: **PASS**,17 primary views plus11 temporal images and two programmatic stability checks.
- `UAV_VISUAL_SECTION=quality`: **PASS**, all four graphics presets including Ultra near-grass shadow deformation, and all six weather presets.
- `git diff --check`: checked at final delivery.

The first monolithic visual run lost Chrome late in grass animation, after its cloud checks. The cause was not established. Isolated temporal reruns and the final full matrix using a fresh browser per section passed; no application error was reproduced. Hardware performance and full photorealism remain untested/unaccepted, as described above.

Evidence: `docs/browser-evidence.json`, `docs/visual-evidence.json`, `docs/visual-{environment,temporal,missions,quality}-evidence.json`.

## 7. Remaining limitations

- Layered cloud silhouettes, flat horizon context and near/far turf integration still require a stronger realism pass. Temporal stability is improved; visual volume is not fully solved.
- Hardware GPU frame budget remains unverified; software closeups are slow.
- The original low-resolution diagram leaves neck controls, dash spacing and minor marker positions approximate. Departure/return procedures are implementation assumptions.
- Context is an optional finite visual matte, not surveyed surrounding terrain or additional interactive ground. It adds no facilities, vegetation instances or colliders beyond the official field.
- The airframe parameters remain illustrative, telemetry ideal, collision a simplified four-foot height field, and rain visual only. The tiny bevel has no separate collision geometry. These are retained model limits.

## 8. Next recommended actions

1. Repeat the same browser/visual profiles on an actual hardware GPU, record its name and frame times, then tune the measured bottleneck. Do not infer hardware60FPS from SwiftShader.
2. Improve the observed low-angle cloud shape/volume and horizon coherence while retaining stable advection and the current bounded vegetation work. Compare the saved temporal sequences as well as still images.
3. Refine tuft/turf shading and transition density at the saved near/middle viewpoints, preserving world anchoring and avoiding a return to millions of unnecessary shadow-pass triangles. Use a higher-resolution official plan only if one becomes available for the remaining geometry estimates.
