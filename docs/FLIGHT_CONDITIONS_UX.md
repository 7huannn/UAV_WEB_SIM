# In-map conditions and homepage learning refinement

Implemented 2026-11-18. This refines the existing ivory/green identity, typography, homepage composition and contextual flight dock. No runtime dependency, weather equation, dynamics gain, field geometry, evaluator or recording schema changed.

## Interaction

**Điều kiện bay** is a compact dock disclosure showing current wind/rain levels. Opening it reveals two 0–10 sliders with descriptive Vietnamese labels, timing feedback, a calm/clear reset and optional **Tinh chỉnh môi trường**. That second disclosure retains all six scenarios and eight numerical weather controls. Camera and conditions disclosures share a native exclusive group. Escape or the close button dismisses conditions and returns keyboard focus to its trigger.

All four practice maps expose conditions while READY and during an attempt. Opening conditions during active practice pauses the simulation and clears held keyboard commands. Edits preserve the attempt, aircraft position, simulation time, seed and progress. The learner explicitly resumes; the panel then closes and the existing weather blending resumes. Changes are not deferred to another attempt.

Mock conditions are editable inside the map while READY. Starting the attempt locks all four World weather APIs and disables the sliders, including while paused. The panel remains available to inspect the fixed conditions and explains the lock. Reference demonstrations accept live changes before/during automatic flight without restarting the mission. Demonstration edits do not overwrite saved practice levels. Recorded-state replay remains read-only.

READY edits update both actual weather and `initialWeather`, without advancing the simulation. Started practice edits preserve original starting metadata and append `WEATHER_CHANGE` events containing the full target; per-frame recording continues to capture actual blended weather. Finalized records cannot be modified through weather APIs.

Wind retains the existing level mapping: base 0.9n m/s, gust 0.4n m/s and turbulence 0.07n. Rain retains the normalized intensity/cloud/visibility/time mapping. Existing two-second weather blending and wetness lag are unchanged. Rain still affects visuals rather than aerodynamic forces.

## Discovery and layout

The homepage’s beginner strip is now **Tìm hiểu trước khi bay**, with two lightweight learning links: **Bài bay và tiêu chí** and **Xem bay mẫu tự động**. The exercise reference returns directly home. Starting practice stays the primary action; educational links describe observation and understanding. Settings contains input, graphics, pilot-view configuration and technical overlays. Old weather cards, setup sliders and settings discovery links were removed.

Phone flight controls use one row above pause/emergency actions. Expanded panels scroll within viewport bounds and retain a sticky heading/close control. Short screens use a fixed panel below the header. A hit-test sweep verifies that other controls cannot cover the expanded panel. Demonstration controls reflow and telemetry stays clear of its control dock. Existing motion and reduced-motion support remain.

## Verification

- `npm test`: 39 passed, including a new renderer-free World/session policy test covering READY snapshots, all weather setters, practice changes, mock locking, invalid values, replay and final-record immutability.
- `npm run build`: passed. Existing Three.js bundle-size warning remains.
- `npm run test:conditions-browser`: focused map/conditions/navigation/recording checks; evidence and 21 screenshots in [conditions-browser-evidence.json](conditions-browser-evidence.json) and `conditions-screenshots/`.
- `npm run test:browser`: full flight, save, replay, legacy import, export, navigation, device recovery and responsive regression; evidence in [redesign-browser-evidence.json](redesign-browser-evidence.json).
- `npm run test:native-zoom-browser`: native Chrome 200% zoom, keyboard conditions editing, flight start and pause/resume; evidence in [redesign-native-zoom-evidence.json](redesign-native-zoom-evidence.json).

Screens are reviewed together across desktop, tablet, 390px phone and short landscape. Browser checks use synthetic input and software rendering; they do not establish physical-controller compatibility or participant usability results.

Final validation: all three browser suites passed against the final production build (`index-By_fCJN0.js`): 16 grouped checks, 54 screenshots, zero page/console/app-request errors. Preview responded HTTP 200; the owned server was stopped after verification. No commit or publication was created.

## Phase 1 environment lifecycle (2026-11-19)

The workflow/locks above remain intact. The approved Phase 1 coordinator now owns fixed-step weather/time/transport; READY edits synchronize versioned initial environment metadata and preview wetness (normalized rain, existing model equilibrium). Started edits retain the same blend/lag. Replay selects separate snapshots without mutating live Weather; resume invalidates the host wall-time baseline. The original rain-slider solar-time mapping remains WEATHER-01 for Phase 3. See [current phase handoff](simulation/PHASE_HANDOFF.md) for validation and remaining limits.
