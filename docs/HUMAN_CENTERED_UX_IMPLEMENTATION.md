# Task-centered UAV ARENA implementation — v0.3.0 continuation

18 November 2026. Requirement: [master prompt](HUMAN_CENTERED_UX_REQUEST.md). Decisions, issue inventory, alternatives and research: [UX audit](HUMAN_CENTERED_UX_AUDIT.md). This iteration implements a different preparation/flight journey in the existing app. It adds no runtime dependency and does not change the court, airframe, physics, input mode, evaluator, scoring or recording schema.

## What changed and why

The original1366×768 preparation panel showed1263px of content in596px, and stacked controls placed a976×423px canvas atY309. Preparation is now independent Bài bay, Thiết bị điều khiển, Điều kiện bay, Hướng dẫn and Cài đặt nâng cao task disclosures, plus an optional training-assistance disclosure. Only Bài bay opens initially. Collapsing preserves values and summaries; Tiếp tục: kiểm tra điều khiển opens the relevant next group. Optional guide remains skippable. Each disclosure supports native Enter/Space/Tab; no custom animation or automatic scroll on opening.

During a live attempt, preparation disappears and the panel shows current status, task/checklist and permitted assistance/help. Flight actions occupy a separate dock outside the scrolling panel: prepare/checklist confirmation → arm/start → pause/resume/manual landing → postflight/save. Emergency motor cutoff has distinct styling and confirmation in flight; cancellation retains incomplete evidence. Reset/retry remains separate. Panel collapse releases width while actions remain accessible. A compact camera toolbar shows left/right/recenter; additional head/camera choices expand in the toolbar instead of covering the aircraft. On smaller screens, canvas/configuration stack and the action dock stays fixed at the bottom. A ResizeObserver reserves the actual dock height in page content, focus targets have scroll margin, and the document can scroll at enlarged layouts. This fixes the native200% case where the former sticky grid item could scroll away. Mobile fidelity limitations remain explicit. Home highlights Luyện tập as the recommended starting action.

Main learner text/controls16px, primary targets44px, visible blue focus outlines, native inputs and reduced-motion styling remain. Reference-desk controls/help/status/mission/weather and calibration visible labels are now Vietnamese too. Machine identifiers, physical units, imported user text and technical provenance are retained; browser/OS/device-provided names may use their original language. No blanket WCAG conformance or translation of arbitrary imported text is claimed.

Wind and rain use native0–10 sliders with ticks, numeric/descriptive output, keyboard/touch semantics and reset. [Settings inventory](SETTINGS_SIMPLIFICATION.md) gives exact physical mappings, migration and separate instructor preferences. Changing wind preserves rain; changing rain preserves wind. Both feed the original shared Weather.target. The existing renderer already supports normalized continuous rain/count/opacity/wetness; no new rainfall physics or mm/hour validation is implied. Every World weather setter rejects candidate Mock changes before/during attempts and unauthorized live changes. Detailed scenarios/parameters/calibration remain available in their appropriate context.

## Fixed pilot perspective

The provisional front midpoint station remains(0,17m), eye(0,1.615,17). Static aim is(-8,0) horizontally, yaw≈−115.2°, pitch−5°, FOV55°, zoom1, aircraft scale1. H is easier to locate in the useful middle-left image and the view devotes more space to ground. The narrower sector deliberately requires head-right for the far-right course and head-up for higher flight. There is no aircraft tracking, translation, orbit, automatic zoom or size compensation in Pilot View. Settings lock at attempt preparation. Older local optics migrate to viewRevision2; archived station/camera metadata and checksums are not rewritten.

Before/after optics are compared at identical force-integrated poses in the new UI. This isolates camera geometry from increased canvas size; original UI images are also preserved. At H the changed heading reduces off-axis distortion: it does not universally enlarge aircraft pixels. At center the narrower optics increase nominal1m projection; per-pose metrics are in task evidence. People must still validate aircraft recognition, head movement, real display distance and FOV. See [pilot design](PILOT_STATION_AND_VLOS_DESIGN.md).

## Ground-position assistance

A thin dashed yellow line ends below the aircraft body and projects along world−Y to a small orange ring. It uses the same interpolated actual aircraft pose shown by the renderer, with courtY0/turfY−.035 and.025m surface offset. It updates without changing dynamics, score, path, input, metadata or frames. Opacity fades over body-ground height.5–.95m and is zero when landed (body gear height.32m). Geometry is two line vertices plus a32-segment ring, reused each frame; at most two extra draw calls while visible, not a hardware performance benchmark.

The clear toggle **Hiện vị trí dưới máy bay** defaults on for basic Training. Runtime gating requires Training, no Mock attempt and no replay. Setter rejects other contexts; workspace/replay/attempt transitions hide it immediately and per-frame gating prevents saved/enabled-state leakage. Instructor, review, reference and Mock never show this aid. It is instructional assistance, never examination evidence. Existing route/label/debug/alternative-camera restrictions remain.

## Actual source and preservation

- `src/ui/TrainingDesk.tsx`: task groups, context-aware flight content, independent action dock, compact camera controls and calibration labels.
- `src/ui/LearnerControls.tsx`: native task disclosure, wind/rain sliders, summaries, safe preferences and legacy convenience migration.
- `src/training/{pilot,weatherPresets}.ts`: static optics and monotonic level mappings.
- `src/scene/groundGuide.ts`, `World.ts`: render-only projection/visibility, common weather guard and local optics migration. Guide resources share normal disposal.
- `src/ui/{App.tsx,vi.json}`, `src/style.css`: recommended home action, Vietnamese reference tools, responsive dock/panel/toolbar and accessibility styling.
- `src/tests/training.test.ts`, browser scripts: meaningful mapping/projection/compatibility checks and real production workflows. Package adds only a test command.

`git diff` shows no changes to `src/arena/`, `src/simulation/`, `src/weather/`, `src/training/input.ts`, `profiles.ts`, `Session.ts` or `records.ts`. Existing250Hz force/PID/motor/contact integration, body-frame stabilized velocity input, procedures/human review, immutable records/replay/historical import and both automatic demonstrations remain. No new RC attitude/rate/raw-throttle mode, physical aircraft command integration or certified result.

## Before/after evidence

Original actual UI: [home](task-ux-before/home.png), [preparation](task-ux-before/preparation.png), [preflight](task-ux-before/preflight.png). New workflow: [home](task-ux-screenshots/home.png), [expanded group](task-ux-screenshots/exercise-expanded.png), [collapsed groups](task-ux-screenshots/groups-collapsed.png), [wind/rain sliders](task-ux-screenshots/wind-rain-sliders.png), [collapsed panel](task-ux-screenshots/panel-collapsed.png), [pinned preflight actions](task-ux-screenshots/preflight-pinned-actions.png).

Pilot comparisons: `task-ux-screenshots/pilot-{before,after}-{home,takeoff,center,far-left,far-right,high-center}.png`; [explicit far-right look](task-ux-screenshots/pilot-far-right-head-turn.png), [high head-up](task-ux-screenshots/pilot-high-center-head-up.png), left/right/recenter captures. Synthetic velocity commands physically reach these poses through the existing force integrator; no aircraft XYZ assignments. These capture fixtures are not student evidence or human/RC validation.

Guide: [clear court](task-ux-screenshots/ground-guide-clear-court.png), [rain court](task-ux-screenshots/ground-guide-rain-court.png), [clear grass](task-ux-screenshots/ground-guide-clear-grass.png), [rain grass](task-ux-screenshots/ground-guide-rain-grass.png), [Mock with no assistance](task-ux-screenshots/mock-no-assistance.png). Responsive: tablet, mobile configuration/review and [200%-equivalent reflow](task-ux-screenshots/zoom-200-equivalent.png); actual native [200% sliders](task-ux-screenshots/native-zoom-200-sliders.png) and [preflight](task-ux-screenshots/native-zoom-200-preflight.png).

## Verification

Final suite totals are recorded below. Headless37/37 and production build pass; browser suites run sequentially on the final package. They cover task state preservation, contextual progression/device recovery, all slider levels/reset/persistence, fixed optics, physical guide alignment/landing/toggle, Mock API/preference leakage, replay immutability, actual keyboard input, both full synthetic-RC courses, exports, mobile and original reference missions.

Intermediate checks corrected a rotated-edge heading expectation, accordion state assumptions in the old harness and a missing React-frame wait after input-source changes. The old training harness also needed to open the newly collapsed assistance group. A camera comparison initially assumed every off-axis object must grow when narrowing FOV; that assertion was removed in favor of per-pose optical-depth/position measurements. Native200% visual inspection found the checklist could scroll past the action dock; a fixed narrow-layout dock with measured reserve/focus margin replaces the sticky grid item. Important state text and slider handles were enlarged. Visual review also found the open head submenu could cover high aircraft; secondary camera choices now remain in the layout row, and high/far sectors have explicit-turn screenshots. These findings are not hidden as passing initial tests.

200% is verified twice: a683×384 CSS/DPR2 reflow emulation and actual Chrome Page zoom set to200% through chrome://settings/appearance in a disposable profile. Native measurement is683×384 CSS pixels/DPR2 on a1366×768 viewport, visualViewport.scale1 (not pinch zoom). Native keyboard entry, accordion, slider and prepare/preflight work without horizontal overflow; action targets remain44px/16px. Native screenshots use direct CDP viewport capture because Playwright full-page clipping mishandles native zoom. This is not a screen-reader/OS-wide accessibility audit. Scenario walkthroughs are automated software checks; no actual beginner/older participant was interviewed or tested.

## Remaining validation

Run the [representative participant plan](VIETNAMESE_END_USER_UX_RESEARCH.md) with new/older learners/instructors/admin, measuring discovery, errors, reading and help. Verify additional browsers/OS zoom, assistive technology and actual classroom display/keyboard/RC. Survey/confirm pilot station/FOV/stabilization and current official Vietnamese category-specific practical rules. Classroom GPU/latency/long sessions/storage recovery and real-aircraft calibration remain unverified. Exact V2 body/paint contact is still approximate; rainfall is visual; full photorealism acceptance remains open. No official exam equivalence, hardware60FPS or measured skill-transfer claim.

Same authoritative handoff/history/backups maintained. No unnecessary new handoff, commit or publication. Final owned preview teardown is recorded below.


## Final verified delivery

**37/37 headless tests, production build and48/48 browser checks PASS**, all browser processes exit0 with zero page/console/request errors. Breakdown:18 preserved training +9 UX +7 task/assistance +13 reference +1 native Chrome200% zoom. All five evidence JSON files identify **`/assets/index-i8icxAy0.js`**. Final JS1,111.71KB /307.37KB gzip, CSS `index-Cfa4Oj_l.css`51.34KB /11.15KB gzip; expected Three.js large-chunk warning only. No new runtime dependency.

Evidence: `training-browser-evidence.json`, `ux-browser-evidence.json`, `task-ux-browser-evidence.json`, `native-zoom-browser-evidence.json`, `browser-evidence.json`. Commands: `npm test`, `npm run build`, then `UAV_URL=http://127.0.0.1:4175 npm run test:training-browser`, `test:ux-browser`, `test:task-ux-browser`, `test:native-zoom-browser`, and `UAV_CAPTURE_ONLY=none npm run test:browser` with the same UAV_URL. Native zoom's final focused rerun also checks all four preflight checkboxes with Space, visible focus above the fixed bar, and enabled confirmation.

**68 current screenshots**(32 task +4 native zoom +19 UX +13 training) and **3 actual before images** retained. Key images inspected at full size; remaining layouts/poses reviewed through contact sheets. Current guide/clear/rain/court/grass, Mock, native zoom/checklist/focus and both complete-course results were revisited. A missing aircraft in unturned far-right/high-center/recenter captures is the documented fixed-view limitation; corresponding explicit-turn captures show it. Reference-distance snapshots use deliberate one-off QA head turns, not production tracking.

Final reference Low performance sample:30frames, mean6.546FPS, median150ms,p95216.7ms,115draw calls/22,696triangles;167observed physics steps/wall second, Chrome147 SwiftShader. This software renderer sample is not a controlled comparison, hardware60FPS result or real-time training acceptance. Full old17-view environment matrix not rerun. Both full force-integrated synthetic-RC manual courses retain HUMAN_REVIEW_REQUIRED; example Vietnamese partial-attempt report remains explicitly incomplete despite high practice score.

Final `git diff --check`, required artifact/link checks and bundle/error consistency checks pass. Same authoritative `AGENT_HANDOFF_CONTEXT.md` and earlier history/backups maintained, no new handoff document. Owned preview4175 stopped by Ctrl-C(exit143); unrelated services untouched. No commit or publication created. External human/hardware/site/regulatory acceptance remains open as described above.
