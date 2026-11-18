# Vietnamese UX redesign specification — v0.3.0

Authoritative request: [VIETNAMESE_UX_REQUEST.md](VIETNAMESE_UX_REQUEST.md). Evidence, user assumptions and pending participant study: [UX research](VIETNAMESE_END_USER_UX_RESEARCH.md).

## Audit and intended correction

v0.2 passed 32 headless, 18 training-browser and 13 reference-browser checks before modification; build passed with expected Three.js chunk warning. Its west station did not match the newly requested front-long-edge midpoint. Learners encountered eight English workspace names, raw state names, small labels, calibration and numerical weather controls early. Existing physics, procedural evaluation, storage and reference missions already worked; they were reused.

## Task structure

Home exposes four labelled cards: Luyện tập, Thi thử, Xem lại bài bay, Cài đặt. Main navigation provides these destinations, Trang chủ and Giảng viên. Công cụ khác preserves calibration, versioned profiles and reference demonstrations. This is workflow separation on a local simulator, not authenticated role-based institutional security.

The optional first-use guide shows mode → exercise → controller → start summary, with Back/Next/Skip controls. Returning users can skip or reopen it. Underlying checklist/ready/arm/start/task/landing/postflight transitions are unchanged. Preparing an attempt freezes the chosen shared weather target into the current state and initial record, avoiding an ambiguous partially blended starting condition. Manual control remains stabilized body-frame velocity/climb/yaw-rate, with no automatic climb, path correction or landing.

During an attempt, setup disappears. Vietnamese procedure/task labels, input status and essential training metrics remain in the side panel. Mock hides metrics/guidance and allows only Pilot View. Head look has mouse drag and explicit buttons. The toolbar occupies its own layout row, never a floating obstruction over the aircraft. Training aid cameras require opening Góc quan sát hỗ trợ. Reference demonstrations remain separate and cannot award candidate credit.

## Design system

System Arial/sans-serif renders Vietnamese without remote fonts. Main body, fields, summaries and buttons use 16 px; headings 19–36 px; secondary provenance/status may use 12–15 px. Main targets are at least 44 px. Restrained dark-green text on pale surfaces; state always has a text label. Blue 3 px focus outlines, native form semantics, keyboard-accessible details/selects/buttons, skip link, help focus containment/Escape/return, reduced-motion preference. No new runtime dependencies or decorative 3D work.

Consequential cancellation/airborne emergency cutoff asks confirmation. Pausing is immediate and distinct; reset is disabled while an attempt is live. Aborted evidence remains saved. Input failure explains USB/button exposure, mapping or focus recovery in Vietnamese. Device recognition does not assert compatibility.

## Settings and records

See [settings inventory](SETTINGS_SIMPLIFICATION.md). Convenience preferences, instructor assessment choices, controller calibration and captured attempt metadata have separate keys/objects. Display labels translate existing identifiers, profiles and archived snapshots without rewriting them. Exported readable reports lead with Vietnamese results; technical appendix retains original event codes and evidence limits. JSON/CSV identifiers remain stable for machine use. Historical station snapshots remain readable; obsolete local west-station preference is superseded by the new derived default, never by editing recordings.

## Responsive behavior

1920×1080/1366×768 prioritize a large fixed-eye canvas plus scrolling learner/instructor panel. 1024×768 keeps configuration usable. At 390 px, controls and panel stack with a finite view area; home explicitly says small screens suit configuration/review and do not establish full training fidelity. Resizing updates perspective aspect, never aircraft or field scale. No responsive overlay may obscure essential buttons or produce horizontal page overflow.

## Acceptance boundaries

Automated workflows and reviewed production PNGs establish software behavior only. Native Vietnamese vocabulary, older-learner usability, actual display acuity/orientation recognition, assistive-technology coverage, surveyed station and RC/GPU performance need representative people/hardware. No WCAG certification, legal station requirement, official examination equivalence or real-world transfer result is claimed.
