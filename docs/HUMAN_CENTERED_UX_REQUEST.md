# MASTER PROMPT — UAV ARENA v0.3.0
## Human-Centered UX Redesign, Pilot VLOS Correction & Visual Flight Assistance

### 1. ROLE AND PRIMARY OBJECTIVE

Act as a Senior Product Designer, UX Researcher, Accessibility Specialist, and Senior React/Three.js Engineer.

You are continuing the existing **UAV ARENA v0.3.0** project, a browser-based UAV flight training and mock examination simulator.

Your mission is to transform the existing engineering-oriented interface into a genuinely intuitive, approachable, and user-friendly application.

**The highest priority is usability, not additional features or visual decoration.**

The application must accommodate:

- Complete beginners who have never used UAV training software.
- Older adults who may struggle with small text, complex navigation, or unfamiliar interfaces.
- Non-technical users with limited computer experience.
- Students learning UAV flight control for the first time.
- Instructors and experienced users requiring advanced functionality.

The interface must remain fully in **natural, clear Vietnamese**, including buttons, instructions, warnings, help text, task states, and reports.

The goal is not to eliminate capabilities. It is to expose the right capabilities at the right time, with minimal cognitive load.

### 2. STRICT PRIORITY ORDER

Implement changes in this order:

1. **Comprehensive human-centered UI/UX redesign.**
2. **Correction and improvement of the fixed pilot viewing perspective.**
3. **Training-only vertical ground-position indicator for the drone.**
4. **Regression testing, visual inspection, and documentation.**

Do not prioritize grass, clouds, photorealism, decorative animations, or unrelated engineering refinements.

---

# PRIORITY 1 — COMPLETE HUMAN-CENTERED UI/UX REDESIGN

## 3. AUDIT THE EXISTING INTERFACE

Before writing code:

Read the current project specifications, implementation reports, `AGENT_HANDOFF_CONTEXT.md`, existing UX research documents, relevant React components, CSS, and screenshots.

Inspect the actual application in a running browser.

The provided screenshots reveal several major usability problems:

- The left control sidebar contains too much information simultaneously.
- Users must scroll extensively to find important controls.
- Preparation, flight settings, controller configuration, instructions, and weather compete for attention.
- Critical flight controls are not consistently visible.
- The interface resembles an engineering configuration panel rather than a beginner-friendly training application.
- The 3D viewport is large but the useful visual area is poorly optimized.
- Camera control buttons occupy unnecessary vertical space.
- The primary next action is not always obvious.
- The current visual hierarchy does not adequately support older or non-technical users.

Perform a proper usability audit using:

- Nielsen's usability heuristics.
- Progressive disclosure.
- Recognition rather than recall.
- Hick's Law and cognitive-load reduction.
- Consistent interaction patterns.
- Error prevention and recovery.
- Accessibility and age-inclusive interface design.

**Do not treat this task as a cosmetic CSS refresh. Reconsider the information architecture and complete user journey.**

## 4. REDESIGN THE FIRST-TIME USER EXPERIENCE

A person opening UAV ARENA for the first time must immediately understand:

1. What can I do?
2. Where should I start?
3. What should I do next?

Design a simple workflow:

**Step 1 — Select a mode**

- Luyện tập
- Thi thử

**Step 2 — Prepare**

- Enter student identification.
- Select a flight exercise.
- Check the controller.
- Review or configure training conditions.

**Step 3 — Fly**

- Start the exercise.
- Observe the drone.
- Use accessible flight controls and guidance.

**Step 4 — Finish and review**

- Finish or safely cancel the attempt.
- Review results.
- Retry or return to the main menu.

Keep instructions contextual, short, and optional.

Do not force beginners to read lengthy documentation before they can interact with the application.

Each major screen should have one clearly identifiable primary action.

Use familiar Vietnamese terminology instead of technical identifiers whenever possible.

Preserve the distinction between safety-critical commands, such as motor cutoff or attempt cancellation, and ordinary controls such as pause, retry, or navigation.

## 5. REPLACE THE LONG SIDEBAR WITH COLLAPSIBLE TASK GROUPS

This is a mandatory design change.

The current long, scroll-heavy sidebar must be reorganized into independent collapsible sections.

Suggested groups:

**Bài bay**
- Student identification.
- Exercise selection.
- Short exercise objective.

**Thiết bị điều khiển**
- Keyboard or physical controller.
- Connection status.
- Controller response test.

**Điều kiện bay**
- Wind strength.
- Rain intensity.
- Other environmental options.

**Hướng dẫn**
- Current step.
- Next action.
- Contextual help.

**Cài đặt nâng cao**
- Detailed weather.
- Calibration and technical settings.
- Instructor or engineering controls where appropriate.

Requirements:

- Every section can be expanded and collapsed.
- Closing a section must not erase its values.
- By default, only contextually relevant groups should be expanded.
- Completed groups should display compact summaries.
- Users must be able to reopen any permitted group.
- Keep primary controls accessible without scrolling through unrelated settings.
- Avoid sudden scrolling, unexpected layout jumps, or disruptive animations.
- Provide a clear expanded/collapsed state and keyboard-accessible controls.

During flight, replace the preparation-heavy sidebar with a compact flight-focused interface.

Show only information needed to fly, understand current status, access permitted assistance, or perform safety-critical actions.

Advanced functionality must remain available in the correct context.

## 6. IMPROVE THE OVERALL SCREEN LAYOUT

The **3D flight viewport must be the visual centerpiece**.

On desktop:

- Allow the sidebar to collapse and reopen.
- Allocate screen space according to flight-related importance.
- Avoid stacked navigation bars and oversized camera-control toolbars.
- Keep essential controls in predictable positions.
- Group secondary actions instead of displaying every button permanently.
- Avoid unnecessary blank space.
- Ensure the 3D scene remains usable even when settings are visible.

Camera controls should be compact, understandable, and accessible.

For example:

- Nhìn trái
- Nhìn phải
- Nhìn thẳng

These may be grouped into a small toolbar rather than occupying a large separate row.

On smaller screens:

- Use responsive layouts appropriate to the task.
- Prioritize preparation, observation, and review.
- Do not imply that a mobile touchscreen provides equivalent physical RC control.

Evaluate multiple plausible layout arrangements, then select and implement the most usable one.

Do not simply reproduce the existing arrangement with different colors.

## 7. IMPLEMENT INTUITIVE 10-LEVEL WEATHER SLIDERS

Replace rigid weather-strength selections with continuous-feeling, discrete-step sliders.

### Wind strength

Provide an accessible slider with:

- Level 0: no wind.
- Levels 1 through 10: progressively stronger wind.
- Clear value indication.
- Short Vietnamese descriptive labels.
- Actual simulated wind speed in m/s where appropriate.

Example:

**Gió: 4/10 — Trung bình**

The slider must affect the real weather model, not merely change a displayed number.

Define and document a clear monotonic mapping from slider values to `Weather.target`, using existing physical weather parameters and a justified range.

Do not invent official legal or operational wind limits.

### Rain intensity

Provide a similar slider:

- Level 0: no rain.
- Levels 1 through 10: increasing rainfall intensity.
- Clear visual and textual feedback.

Integrate the control with the existing weather system.

If the current renderer only supports discrete rain states, extend or interpolate the environmental model appropriately, while clearly documenting simulation limitations.

Do not claim physically validated rainfall intensity without supporting evidence.

### Interaction requirements

- Mouse, keyboard, and touch support.
- Visible tick marks or easily understood increments.
- Large, accessible handles.
- Readable numeric values.
- Clear default/reset action.
- Appropriate screen-reader labels.
- Saved settings where applicable.

**Mock Examination rules must remain unchanged:** candidates must not modify instructor-defined weather settings before or during a locked examination attempt.

Advanced weather configuration must remain accessible to authorized users.

---

# PRIORITY 2 — FIX THE PILOT VLOS VIEW

## 8. IDENTIFY THE CURRENT VIEWING PROBLEM

The screenshots show an unsatisfactory pilot perspective:

- The runway/court occupies the lower part of the viewport.
- A large amount of sky contributes little useful information.
- The drone at home position H appears very small and close to the left edge.
- Some important flight regions are difficult to observe comfortably.
- The initial view does not provide beginners with a sufficiently understandable spatial reference.

This is a camera geometry and perspective-design issue, not simply a graphics-quality problem.

## 9. RE-EVALUATE PILOT STATION AND CAMERA GEOMETRY

The current provisional configuration includes:

- Station position: X=0, Z=17m.
- Eye height: approximately 1.65m.
- Vertical FOV: approximately 70 degrees.
- Fixed observer position outside the field.

These values are provisional and must not be treated as officially surveyed requirements.

Analyze:

1. Pilot station position relative to the entire court.
2. The takeoff/landing position H.
3. Important exercise areas and course endpoints.
4. Eye height and field-of-view.
5. Camera heading and pitch.
6. Visibility of the drone at near, central, and distant positions.
7. Expected drone apparent size.
8. Left/right head rotation requirements.

Develop a better-supported camera configuration.

The initial view should:

- Present a more useful portion of the flight area.
- Minimize unnecessary sky without eliminating legitimate flight visibility.
- Keep important starting references easier to locate.
- Make the beginning of a flight understandable.
- Provide a natural standing-observer perspective.

**Never solve the issue by attaching the camera to the drone, automatically tracking its movement, dynamically zooming toward it, artificially enlarging the drone, or changing the court geometry.**

Pilot VLOS must remain a fixed-eye viewpoint with explicit head rotation.

If the entire course cannot reasonably fit into one human-like view, preserve the physical limitation and provide intuitive head-turn controls.

Do not distort the simulation merely to make every aircraft position simultaneously visible.

If the station is moved, document the geometric justification and keep it provisional pending real-world instructor or site confirmation.

## 10. VERIFY THE PILOT VIEW VISUALLY

Capture actual browser screenshots at:

- Drone resting at H.
- Initial manual takeoff.
- Drone at the center of the court.
- Drone near the far-left boundary.
- Drone near the far-right boundary.
- Multiple flight altitudes.
- Left and right head rotations.
- Recentered initial view.

Compare before and after images.

Evaluate whether a beginner can identify the drone and understand its approximate relationship to the court.

Mathematical camera correctness alone is not sufficient.

---

# PRIORITY 3 — DRONE-TO-GROUND POSITION INDICATOR

## 11. INTRODUCE A TRAINING-ONLY VISUAL ALTITUDE REFERENCE

Add a simple visual guide that projects vertically from the drone toward the ground.

The purpose is to help beginners understand the drone's horizontal location relative to the court while it is airborne.

### Required appearance

When the drone is flying in **Luyện tập**:

- Display a thin vertical line from the drone down toward the ground.
- Draw a subtle marker or small circle at the projected ground position.
- Update both elements continuously as the aircraft moves.
- Reflect actual altitude through the line's length.
- Reduce or remove the indicator as the drone lands.
- Use a sufficiently visible but unobtrusive style.

A subtle orange/yellow line, possibly dashed, may work well.

Test visibility against the court surface, grass, clear weather, and rain.

The line should clearly look like a visual training guide rather than a physical cable attached to the aircraft.

### Technical requirements

- Derive the indicator from the actual simulated aircraft position.
- Project vertically using the correct world coordinate system.
- Respect the displayed ground surface.
- Avoid z-fighting, flickering, or depth artifacts.
- Do not obscure the drone itself.
- Avoid noticeable performance degradation.
- Preserve correct alignment during camera rotation and aircraft movement.
- Do not modify aircraft physics, scoring, trajectories, or recordings.

### Training-mode controls

Provide a clear toggle, such as:

**Hiện vị trí dưới máy bay**

For basic beginner training, the indicator may be enabled by default.

The user must be able to disable it.

### Mock Examination restrictions

In strict Mock Examination:

- Never display the vertical guide.
- Never display the projected ground marker.
- Prevent activation through shortcuts, saved preferences, hidden UI states, or workspace transitions.
- Preserve existing assistance restrictions.

Replay and instructor views should only show the indicator where explicitly permitted.

This feature is instructional assistance, not examination evidence.

---

# PRIORITY 4 — QUALITY, ACCESSIBILITY & TESTING

## 12. DESIGN FOR OLDER AND NON-TECHNICAL USERS

Apply these minimum interface requirements:

- Main body typography preferably 16px or larger.
- Important touch targets at least 44×44px.
- High legibility and appropriate color contrast.
- No excessive small, faint, or abbreviated labels.
- Clear action-oriented Vietnamese text.
- Consistent primary and secondary button styles.
- Predictable navigation.
- Helpful recovery messages.
- Full keyboard operation.
- Visible focus indicators.
- Screen-reader-compatible control semantics.
- Proper behavior at 200% browser zoom.
- Reduced-motion support where applicable.

Avoid making critical status dependent only on color.

Test with realistic beginner tasks, not just component-level assertions.

## 13. PRESERVE EXISTING FUNCTIONALITY

Do not compromise verified systems.

Preserve:

- Existing court geometry and dimensions.
- H/HA/HB and M1–M5.
- V1/V2/V3.
- Both automatic reference missions.
- The 250Hz force/PID/motor/contact simulation.
- Manual flight control behavior.
- Training task evaluation.
- Strict Mock Examination restrictions.
- Scoring and human-review requirements.
- Recording, replay, exports, and historical imports.
- Controller calibration and keyboard fallback.

Do not silently introduce full RC attitude/rate or raw-throttle behavior.

Existing automated reference flights must remain separate from actual student performance evidence.

## 14. IMPLEMENTATION PHASES

### Phase A — UX research and audit

Review the current application, source code, screenshots, and documentation.

Produce a concise issue inventory showing:

- Current problem.
- Impact on beginners or older users.
- Proposed correction.
- Verification method.

Design the new information architecture and user flow.

### Phase B — Implement the redesigned UI

Modify the actual React components and CSS.

Implement:

- Improved navigation.
- Collapsible task groups.
- Clear primary actions.
- Context-aware control visibility.
- Compact flight-mode layout.
- Responsive behavior.
- Wind and rainfall sliders.
- Accessibility improvements.

### Phase C — Correct pilot viewing geometry

Calculate and evaluate observer placement, heading, pitch, and FOV.

Apply justified changes.

Capture and inspect real screenshots.

Ensure the fixed-eye restriction remains intact.

### Phase D — Implement the ground-position guide

Add the 3D indicator and marker.

Implement the training-only toggle and mock restrictions.

Verify alignment and visibility across flight states.

### Phase E — Regression and usability verification

Run the existing headless tests, production build, training-browser checks, UX-browser checks, and reference-browser checks.

Add tests for:

- Accordion state preservation.
- Contextual navigation.
- Slider values and weather mapping.
- Weather restrictions in Mock.
- Pilot view invariants.
- Drone-to-ground projection accuracy.
- Training-only assistance.
- No leakage of assistance into Mock.
- Recording/replay compatibility.
- Keyboard navigation and responsive layout.

Inspect browser screenshots manually.

Test at desktop, tablet, mobile configuration/review layouts, and 200% zoom.

Perform scenario-based walkthroughs for beginners and older adults.

Do not falsely claim that automated walkthroughs constitute real human usability testing.

---

# 15. DEFINITION OF DONE

Do not declare completion merely because the build passes.

The work is acceptable only when:

1. A first-time user has a clear, understandable route from opening the app to starting a flight.
2. Important controls are discoverable without searching through lengthy panels.
3. Task groups expand and collapse reliably.
4. Primary flight actions remain accessible when needed.
5. The 10-level weather sliders genuinely update simulation conditions.
6. Mock weather restrictions are preserved.
7. The pilot perspective is visibly improved and geometrically justified.
8. The drone-to-ground indicator follows the real simulated aircraft in Training.
9. The indicator is completely disabled in strict Mock Examination.
10. Existing physics, examination procedures, recordings, and reference missions continue to pass regression testing.
11. The interface is meaningfully more usable at large text sizes and with keyboard navigation.
12. Visual before/after evidence supports the UX improvements.

## 16. REQUIRED FINAL DELIVERABLES

Provide:

- Summary of UX issues identified and corrected.
- Actual source-code changes.
- Updated UI architecture and user flow.
- Before/after screenshots of key application screens.
- Screenshots demonstrating collapsed and expanded sections.
- Wind and rain slider screenshots.
- Pilot-view comparisons at representative drone positions.
- Ground-position guide screenshots during flight.
- Proof of assistance restrictions in Mock Examination.
- Test/build/browser results.
- Remaining usability, physical validation, and official regulatory limitations.

Update the existing authoritative `AGENT_HANDOFF_CONTEXT.md` while preserving prior history.

Do not create unnecessary additional handoff documents.

Do not commit or publish without explicit authorization.

---

# FINAL PRODUCT PRINCIPLE

**Build for humans first, not for developers.**

A good training application should not require users to understand its internal engineering structure.

UAV ARENA must feel welcoming, understandable, and reliable, even to someone opening it for the first time.

Simplicity does not mean removing functionality.

Simplicity means presenting the right functionality, at the right moment, in the right place.

**Implement these improvements in the working application, test them in a real browser, inspect the results visually, and report only what can be supported by actual evidence.**