# Task-centered UX audit and implementation plan

18 November 2026. Request: [master prompt](HUMAN_CENTERED_UX_REQUEST.md). Baseline: v0.3.0,35 headless tests/build pass. Actual repository preview inspected at http://127.0.0.1:4175; localhost resolved a different service and is excluded from evidence. At1366×768 the preparation panel has596px visible/1263px content and the canvas is976×423px, starting atY309. Before screenshots: `task-ux-before/`.

## Problems, impact, correction and verification

- Preparation fields, device, wind, explanation and help appear together. Beginners must choose among unrelated controls; older readers scroll to find start. Replace with independent Bài bay / Thiết bị điều khiển / Điều kiện bay / Hướng dẫn / Cài đặt nâng cao disclosures, compact summaries and a pinned next action. Verify close/reopen retains values and keyboard toggles work.
- Flight pause/cancel/motor commands sit below task details. Error recovery is harder under pressure. Use a compact status/task panel and a separate persistent action dock; distinguish ordinary pause from emergency stop/cancel. Verify at laptop size and200% zoom.
- Header plus navigation plus stacked camera rows consumes309px before the scene. Reduce header/navigation and camera controls; allow panel collapse; keep head turns explicit. Verify actual canvas bounds before/after and no overlapping aircraft/UI.
- Four wind presets/one rain state restrict graduated practice. Use0–10 native sliders, numeric/physical summaries/reset and separate instructor defaults; retain all detailed controls. Verify monotonic physical mappings and every Mock setter guard.
- Center-facing70° vertical FOV places H near the left edge and allocates excessive sky. Keep station at front midpoint but evaluate55° FOV, a static heading toward the western half and−5° pitch. H and center should be understandable initially; right extremity requires an explicit head turn. Compare real screenshots at H/takeoff/center/extremes/heights with unchanged airframe scale/zoom/eye.
- Airborne position is difficult to relate to the ground. Optional dashed vertical guide/ground ring in Training only, actual displayed aircraft pose and actual court/turf surface. Verify projection, land fade, camera alignment, rain/court/grass visibility and no Mock/replay/instructor leakage.

## Alternatives and chosen journey

Considered full-screen wizard (clear sequential flow but revisiting a setting interrupts preparation), bottom settings drawer (more scene width but poor long-form/zoom reading), and task accordions plus collapsible side panel/pinned action dock. Choose the third: familiar independent sections, persistent state and predictable flight actions. Native details/summary provides disclosure semantics and Enter/Space without a custom accordion framework. No automatic scroll on opening sections. Setup guide opens relevant groups but can be skipped; no required long manual.

Journey: Home → Luyện tập or Thi thử → Bài bay → device check → conditions(summary only in Mock) → prepare/checklist → arm/start → current task/manual landing/postflight → result → retry/review/home. In-flight setup is hidden; safety actions remain reachable. Instructor/calibration/reference/replay stay separate from student evidence. Local instructor workflow is not authentication.

## Research basis and verification limits

[Nielsen's own heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) support visible state, familiar terminology, error prevention/recovery, recognition and reducing competing information. [W3C accordion guidance](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) describes keyboard-operated show/hide sections. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) informs enlarged-text reflow. Existing [Vietnamese UX research](VIETNAMESE_END_USER_UX_RESEARCH.md) supplies age-inclusive/accessibility sources and a real participant plan. Hick/cognitive-load principles are design hypotheses here, not measured user decision-time results.

Scenario walkthroughs will exercise first-time keyboard preparation, device failure/recovery, weather reset, finding pause/cancel/retry, reopening a group and reviewing an incomplete report. Automated walkthroughs and screenshot inspection are software evaluations, not human usability testing or WCAG certification. Physical station/FOV, RC hardware, classroom GPU, skill transfer and official examination equivalence remain unverified.
