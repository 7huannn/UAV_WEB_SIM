# UAV ARENA — PILOT VIEW REFINEMENT & VIETNAMESE USER EXPERIENCE REDESIGN

## ROLE & OBJECTIVE

You are a senior multidisciplinary engineering team consisting of:

- UAV Flight Simulation Engineer
- Three.js / WebGL Engineer
- UAV Practical Examination Specialist
- Senior UX/UI Product Designer
- Human–Computer Interaction and Accessibility Specialist
- Vietnamese Localization Specialist
- Software Verification Engineer

Your assignment is to refine the existing UAV ARENA practical examination training system, with two primary objectives:

1. **Correctly position the pilot at the center of the front long side of the examination field and refine the existing ground-based Pilot View.**
2. **Redesign the user-facing experience for Vietnamese learners, including older adults, first-time drone students, and people with limited technical knowledge.**

The application is intended to become a practical training tool for actual Vietnamese drone training centers.

**It must feel like professional educational and examination equipment, not a video game or an engineering demo.**

Do not prioritize visual decoration over usability, correctness, accessibility, operational clarity, or reliable flight training.

---

# 1. UNDERSTAND THE EXISTING PROJECT FIRST

Before making changes, inspect the complete repository and existing documentation, including:

- `UAV_ARENA_WEB_SIM_SPEC.md`
- `UAV_PRACTICAL_TRAINING_SPEC.md`
- `AGENT_HANDOFF_CONTEXT.md`
- `docs/IMPLEMENTATION_AND_VERIFICATION_REPORT.md`
- `docs/PILOT_STATION_AND_VLOS_DESIGN.md`
- `docs/CONTROLLER_INPUT_ARCHITECTURE.md`
- `docs/EXAMINATION_RULES_AND_SCORING.md`
- `docs/ASSUMPTIONS.md`
- `README.md`

Inspect the existing implementation, particularly:

- `src/training/pilot.ts`
- `src/training/input.ts`
- `src/training/profiles.ts`
- `src/training/Session.ts`
- `src/ui/TrainingDesk.tsx`
- `src/ui/App.tsx`
- `src/scene/World.ts`
- `src/weather/Weather.ts`
- Existing flight dynamics and mission modules
- Existing responsive CSS and browser tests

Review the original Vietnamese examination-field diagram, the supplied pilot-position illustration, and available screenshots.

The current application reportedly already includes:

- A provisional fixed Pilot VLOS camera
- Manual flight controls
- Controller calibration
- Training and mock examination workflows
- Instructor tools
- Figure Eight and Outer Circuit exercises
- Weather simulation
- Recording, telemetry, replay, and scoring
- Existing automated regression tests

**Do not recreate or duplicate these systems if they already exist.**

Inspect their actual behavior, identify shortcomings, and improve the existing implementation.

Run the existing tests and production build before modifications. Record the actual baseline, including any failures.

---

# 2. PILOT POSITION — CENTER OF THE FRONT FIELD EDGE

## 2.1 Intended position

Use the original examination-field geometry as the authoritative geometric reference.

The desired pilot position is:

**Near the midpoint of the front long side of the field, outside the V1 flight boundary, facing into the examination area.**

Important distinctions:

- The pilot must NOT stand in the geometric center of the flying area.
- The pilot must NOT stand at takeoff/landing point H.
- The pilot should stand on the front side of the field, approximately aligned with the longitudinal midpoint of that side.
- The position must remain outside the applicable flight boundary.
- The field's official dimensions and markings must remain unchanged.

The original field layout includes:

- A 45 × 27 m concrete court
- A 60 × 42 m simulated surrounding grass area
- V1/V2/V3 boundaries
- H, HA, and HB landing/holding markings
- M1–M5 course markers
- Figure-eight flight geometry
- Perimeter flight geometry

Do not move any existing course markers or alter calibrated field dimensions to accommodate the pilot.

## 2.2 Implementation

Inspect the current provisional Pilot Station configuration.

If the current pilot marker is already near the required location, refine that configuration rather than creating another station.

Derive the default pilot position from actual court geometry, including:

- Midpoint of the selected front long edge
- Outward-facing boundary normal
- Configurable setback distance outside V1
- Adequate visual clearance toward the central flight area

Do not guess an arbitrary world coordinate unrelated to the established coordinate system.

Do not hardcode screenshot pixel coordinates.

Ensure the implementation continues to work if the court geometry or orientation is updated through the supported configuration.

The pilot position should be stored as a configurable station with:

- World position
- Eye height
- Initial view direction
- Field-edge association
- Setback distance
- Configuration provenance
- Verification status

Use a provisional recommended location until an actual examination-site survey or authoritative requirement confirms the proper position.

**Never claim this pilot position is legally required by Vietnamese examination regulations.**

## 2.3 Pilot Position visual marker

In technical/instructor views, show a clear optional marker:

`PILOT — Vị trí người điều khiển`

Requirements:

- Easy to recognize
- Distinct from H/HA/HB
- Does not obscure examination markings
- Can be toggled in Engineering Overlay
- Includes an optional viewing-direction indicator
- Does not appear as a distracting artificial marker in strict examination view

Provide a compact explanatory diagram with Vietnamese labels.

Make it immediately clear that:

- H = Drone takeoff/landing point
- PILOT = Human operating position

---

# 3. PILOT VIEW — REALISTIC GROUND-BASED OBSERVATION

The existing Pilot VLOS camera must become the primary candidate viewpoint.

## 3.1 Camera placement

The camera must represent a human standing at the configured pilot station.

Requirements:

- Default eye height approximately 1.65 m
- Configurable eye height, including approximately 1.6–1.7 m
- Camera world position remains fixed during a flight attempt
- Initial viewing direction points toward the useful central observation area
- The pilot can rotate their head/view direction
- The camera must not automatically follow the drone
- The camera must not translate with the drone
- The camera must not orbit around the aircraft
- No automatic zoom or artificial distance compensation
- Correct metre-scale perspective and distance-dependent apparent drone size

Preserve real drone position, heading, and orientation.

Do not exaggerate its size merely to improve visibility.

## 3.2 Realistic screen-based observation

Review how the Pilot View appears on actual displays.

Consider:

- Camera field of view
- Display aspect ratio
- Drone apparent size
- Camera orientation
- Viewing distance
- Screen resolution
- Target visibility against terrain and sky
- Orientation recognition
- Human visual limitations

Avoid claiming perceptual equivalence to real-world VLOS simply because the perspective geometry is correct.

Where useful, provide a clearly labeled display calibration guide.

A display calibration option may be available in Advanced Settings, but should not complicate basic training.

## 3.3 Pilot head movement

Allow the user to look around naturally while their physical pilot position remains fixed.

Provide simple controls for:

- Looking left/right
- Looking up/down
- Re-centering the view toward the initial observation direction

Consider a straightforward mouse-drag or equivalent head-look interaction.

Avoid confusing free-fly camera controls.

Strict examination mode must respect the defined viewing restrictions.

## 3.4 Camera selector

Keep existing camera functionality.

Display the candidate-facing mode using a clear Vietnamese label:

`Góc người lái`

Optionally include:

`Pilot View`

as a smaller English technical subtitle.

Other views may remain available for instructors or demonstrations:

- Overview
- Top-down
- Orbit
- Ground
- Follow
- FPV

Do not create duplicate Pilot VLOS / Pilot View camera systems.

Use a single underlying camera mode with consistent naming.

## 3.5 Training and examination behavior

Pilot View must work in:

- Manual training
- Manual mock examination
- Existing automatic reference demonstrations
- Instructor observation where appropriate

Keep the original programmed Figure Eight and Outer Circuit demonstrations.

However, automated reference demonstrations must remain separate from actual manual examination attempts.

In strict mock examination mode:

- Lock the candidate to the permitted Pilot View
- Disable unauthorized camera switching
- Hide instructor-only flight-path assistance
- Hide prohibited overlays
- Do not modify real aircraft dynamics or automate piloting

---

# 4. RESEARCH REAL END-USER NEEDS IN VIETNAM

This is a major part of the assignment.

Do not redesign the interface solely according to developer preferences.

Research the needs of the application's actual intended users.

## Target users

### Persona A — First-time Vietnamese trainee

Characteristics:

- Little UAV knowledge
- May never have used a flight simulator
- Does not understand terms such as PID, telemetry, deadzone, or quaternion
- Needs obvious instructions and safe practice

### Persona B — Older Vietnamese learner

Characteristics:

- Potentially 50–70+ years old
- May have limited computer experience
- May have reduced visual acuity
- May prefer large buttons and readable Vietnamese instructions
- May need more time to understand unfamiliar interfaces
- Should not be forced to memorize numerous keyboard shortcuts

Do not assume all older users have the same limitations.

### Persona C — Instructor

Characteristics:

- Needs to choose exercises quickly
- Needs to monitor progress
- Needs understandable flight metrics
- Needs to review student errors
- May supervise multiple training sessions
- Should not need to configure low-level engineering parameters for normal teaching

### Persona D — Technical administrator

Characteristics:

- Needs controller mapping
- Needs device diagnostics
- Needs simulation configuration
- Needs access to detailed telemetry and advanced settings
- Must not expose these controls unnecessarily to students

## Research requirements

Study applicable evidence-based UX and accessibility practices, including:

- WCAG 2.2
- W3C guidance relevant to cognitive accessibility
- Usability guidance for older adult users
- Plain-language interface writing
- Error prevention and recovery
- Progressive disclosure
- Touch-target accessibility
- Keyboard interaction
- Readable typography
- Low cognitive-load workflows

Also review relevant real training systems and simulation applications.

Where external research is available, cite credible sources and distinguish observed findings from recommendations.

Do not fabricate user interviews, usability testing outcomes, or direct observations.

Create:

`docs/VIETNAMESE_END_USER_UX_RESEARCH.md`

This document should contain:

- User personas
- Common tasks
- Likely points of confusion
- Accessibility considerations
- Recommended interface conventions
- Sources and evidence
- Unverified assumptions
- A practical user-testing plan

The goal is **a simple, trustworthy Vietnamese training interface**, not a generic futuristic dashboard.

---

# 5. VIETNAMESE-FIRST INTERFACE

The primary language must be Vietnamese.

Do not require learners to understand English to operate normal training and mock examination workflows.

Use natural, understandable Vietnamese.

Avoid unnecessarily technical terminology.

Examples:

| Technical expression | Preferred Vietnamese user label |
|---|---|
| Training | Luyện tập |
| Mock Examination | Thi thử |
| Pilot View | Góc người lái |
| Instructor | Giảng viên |
| Session Review | Xem lại bài bay |
| Controller Calibration | Cài đặt tay điều khiển |
| Weather | Thời tiết |
| Wind Speed | Mức gió |
| Takeoff | Cất cánh |
| Landing | Hạ cánh |
| Emergency Stop | Dừng khẩn cấp |
| Flight Path | Đường bay |
| Figure Eight | Bay hình số 8 |
| Outer Circuit | Bay vòng ngoài |
| Start Exercise | Bắt đầu bài tập |
| Retry | Thử lại |
| Results | Kết quả |
| Advanced Settings | Cài đặt nâng cao |

Use consistent Vietnamese terminology everywhere.

Preserve commonly recognized technical abbreviations when helpful, but provide accessible explanations.

Avoid mixing English and Vietnamese randomly.

Avoid exposing code identifiers or raw internal state names to ordinary learners.

Use English only where needed for technical administration, documentation, or optional secondary labels.

Ensure correct rendering of Vietnamese diacritics.

---

# 6. REDESIGN THE APPLICATION AROUND SIMPLE USER TASKS

The default experience must focus on what a learner wants to accomplish.

Not on what the underlying engine can configure.

## 6.1 Simplified home screen

The initial interface should provide a small set of obvious actions:

1. `Luyện tập`
2. `Thi thử`
3. `Xem lại bài bay`
4. `Cài đặt`

Instructor tools should remain accessible through an appropriate instructor workflow or role.

Do not overwhelm the landing page with:

- Telemetry
- Raw physics parameters
- Renderer configuration
- Debug controls
- Technical input mappings
- Multiple simultaneous dashboards

The user should immediately understand where to begin.

## 6.2 Guided start flow

Create a short, optional guided setup for first-time users.

Example:

**Step 1 — Chọn chế độ**

- Luyện tập
- Thi thử

**Step 2 — Chọn bài bay**

- Cất cánh và giữ vị trí
- Bay hình số 8
- Bay vòng ngoài
- Other exercises supported by the selected profile

**Step 3 — Kiểm tra điều khiển**

- Tay điều khiển đã kết nối
- Chưa kết nối tay điều khiển
- Dùng bàn phím để luyện thử

**Step 4 — Bắt đầu**

- Display a short safety/instruction summary
- Enter the selected workflow

Where appropriate, remember non-sensitive preferences locally.

Returning users should be able to skip the guide.

Do not force experienced instructors through unnecessary introductory steps.

---

# 7. SIMPLIFY WEATHER SETTINGS

Weather configuration is a specific priority.

The existing simulation may support:

- Wind vectors
- Wind direction
- Wind strength
- Weather presets
- Rain and cloud parameters
- Environmental transitions

However, ordinary learners should not have to adjust raw numerical parameters or multiple sliders.

## 7.1 Simple wind presets

Replace the default complex wind configuration with a clearly labeled preset selector.

Example Vietnamese interface:

**Mức gió**

- `Không gió`
- `Gió nhẹ`
- `Gió trung bình`
- `Gió mạnh`

Show the selected wind condition clearly.

Each preset must map to explicitly documented physical simulation values.

The exact numeric values must be derived from the existing weather model and reviewed for consistency.

Do not invent official Vietnamese examination wind thresholds.

These are training presets unless supported by verified standards.

Avoid representing an unsafe wind condition as suitable for actual flight merely because it is available in the simulator.

## 7.2 Optional weather conditions

Provide a simple secondary choice when appropriate:

**Điều kiện thời tiết**

- Trời quang
- Nhiều mây
- Mưa

Use the existing weather engine rather than introducing a second inconsistent implementation.

Preserve advanced weather capabilities internally.

## 7.3 Advanced weather settings

Place detailed controls in an expandable advanced section.

Examples:

- Exact wind velocity
- Wind direction
- Gust configuration
- Rain intensity
- Environment blending
- Detailed weather parameters

Label this section:

`Cài đặt nâng cao`

Make it primarily relevant to instructors and technical administrators.

Basic users should never need to open this section to complete normal training.

## 7.4 Examination integrity

In mock examination mode, environmental conditions must be determined by the chosen assessment profile or authorized instructor configuration.

A candidate must not be able to change wind conditions during an active attempt to improve their score.

Store the chosen conditions in the attempt record.

Show a simple Vietnamese weather summary before the attempt begins.

---

# 8. SIMPLIFY OTHER SETTINGS

Audit every existing setting and classify it into one of three groups.

## Group A — Essential learner settings

Immediately visible when needed:

- Training mode
- Exercise selection
- Input device
- Pilot View
- Simple wind condition
- Start / pause / retry
- Sound and instruction preferences where available

## Group B — Instructor settings

Visible within Instructor Mode:

- Exercise configuration
- Training assistance
- Assessment profile
- Scoring review
- Student reports
- Session replay
- Environmental setup
- Pilot station configuration before an attempt

## Group C — Advanced technical settings

Hidden from normal learner workflows:

- Controller axis mapping
- Calibration details
- Graphics quality internals
- Physics diagnostics
- Raw telemetry
- Engine parameters
- Engineering overlays
- Camera projection adjustments
- Debug information

Preserve advanced functionality.

Do not remove important capabilities merely to make the interface look simpler.

Instead, progressively reveal controls when they are needed.

Provide safe, understandable defaults.

## 8.1 Controller configuration

Normal learners should see:

- `Tay điều khiển đã kết nối`
- `Chưa tìm thấy tay điều khiển`
- `Kiểm tra tay điều khiển`
- `Dùng bàn phím`

A simple controller test should indicate whether the sticks are responding correctly.

Detailed axis numbers, normalization, deadzones, and raw input values should remain in advanced calibration.

Make connection and calibration failures actionable in Vietnamese.

Do not label a controller compatible unless it has actually been recognized and its controls validated.

## 8.2 Graphics settings

Normal users should not encounter technical renderer terminology by default.

Use simple labels such as:

- `Ưu tiên mượt`
- `Cân bằng`
- `Ưu tiên hình ảnh`

Map these to the existing graphics presets without hiding meaningful limitations.

Keep detailed graphics settings available to technical users.

Avoid unnecessary automatic quality changes during a strict assessment unless they are deterministic, documented, and do not affect recorded flight behavior.

## 8.3 Settings persistence

Persist user preferences locally where appropriate.

Separate:

- User convenience preferences
- Instructor-defined assessment settings
- Controller calibration
- Verified attempt configuration

Changing ordinary UI preferences must not silently modify historical examination evidence.

---

# 9. ACCESSIBILITY AND READABILITY

Design for real Vietnamese training-center users.

## Typography

- Readable Vietnamese text
- Appropriate font size for older users
- Clear hierarchy
- Sufficient contrast
- Avoid tiny labels
- Avoid dense technical paragraphs in the main interface

Use approximately 16 px or larger for ordinary body text where practical, with larger headings and important controls.

## Interaction

- Large, obvious buttons
- Comfortable pointer/touch targets
- Visible focus states
- Full keyboard navigation for ordinary UI workflows
- Clear disabled states
- Consistent button positions
- No reliance on color alone
- No essential information available only on hover

Use WCAG 2.2 accessibility guidance as a baseline, with generous targets appropriate for the audience.

## Feedback

Prefer clear Vietnamese messages such as:

`Chưa kết nối tay điều khiển. Vui lòng kiểm tra cáp USB hoặc chọn chế độ bàn phím.`

Avoid messages such as:

`HID mapping invalid`

Every important error should explain:

- What happened
- What it means
- What the user can do next

## Safety and destructive actions

Clearly distinguish:

- Tạm dừng
- Kết thúc bài tập
- Hủy bài thi
- Dừng khẩn cấp
- Đặt lại mô phỏng

Do not use ambiguous buttons or silently discard an examination attempt.

Preserve records when a candidate aborts an attempt.

Use confirmation only for genuinely consequential actions.

## Avoid interface overload

Do not display all available information simultaneously.

A candidate should not be forced to understand telemetry plots or raw motor data while learning basic hover control.

Provide brief, contextual explanations instead.

---

# 10. TRAINING AND MOCK EXAMINATION USER EXPERIENCE

## Training Mode

The learner should see:

- Current exercise
- Pilot View
- Current task instructions
- Basic controller/connection status
- Essential safety/status information
- Optional training feedback
- Simple pause/retry controls

Avoid unnecessary diagnostic panels.

Training assistance may be enabled, but it must be clearly identified as assistance.

## Mock Examination Mode

Prioritize:

- Examination instructions
- Candidate view
- Relevant preflight and procedural state
- Clear task start/end conditions
- Controller connection/fault status
- Appropriate status and safety notifications

Do not expose instructor-only telemetry or artificial route guidance to the candidate during an assessment when prohibited by the selected profile.

Keep examination conditions locked during an active attempt.

Use Vietnamese language consistently.

## Instructor Mode

Allow instructors to access:

- Overview/top-down camera
- Candidate path
- Reference route
- Recorded telemetry
- Errors and violations
- Replay
- Scoring
- Human review
- Exportable reports

Make the information understandable to an instructor without requiring knowledge of the internal source code.

Do not change established scoring limits merely to make the interface easier.

---

# 11. UX DESIGN SYSTEM

Create a small, consistent visual design system appropriate for educational simulation software.

The design should communicate:

- Reliability
- Clarity
- Professionalism
- Calmness
- Safety
- Accessibility

Avoid:

- Gaming-style visual effects
- Excessive gradients
- Flashing controls
- Unnecessary animations
- Tiny technical labels
- Too many competing panels
- Excessive icons without labels
- Important functionality hidden behind obscure gestures

Prefer:

- Clearly labeled navigation
- Consistent spacing
- Readable typography
- Restrained color use
- Clear status indicators
- Simple settings cards
- Logical task progression
- Familiar Vietnamese controls

The application should look professionally designed, but **usability is more important than appearance**.

Preserve existing Three.js rendering functionality and the calibrated examination field.

Do not redesign the 3D environment unnecessarily.

---

# 12. RESPONSIVE LAYOUT AND REAL TRAINING ENVIRONMENTS

Test the application on practical screen sizes.

At minimum:

- Desktop 1920 × 1080
- Laptop 1366 × 768
- Tablet-sized display
- Mobile 390 px width

Prioritize desktop and laptop usability, since these are likely deployment environments for the complete simulator.

Mobile should remain usable for appropriate configuration/review workflows, without claiming full equivalence to a desktop or real RC training station.

Ensure:

- Main controls remain visible
- Vietnamese text does not overflow
- Critical dialogs fit smaller screens
- No important buttons are covered
- Navigation remains understandable
- Pilot View remains correctly projected
- UI scaling does not incorrectly alter flight geometry or apparent aircraft scale

If a full simulator workflow is unsuitable for small screens, communicate this clearly rather than pretending all form factors provide equivalent training fidelity.

---

# 13. PRESERVE ENGINEERING AND EXAMINATION INTEGRITY

The UX redesign must not break existing functionality.

Preserve:

- Original arena geometry
- V1/V2/V3 markings
- H/HA/HB
- M1–M5
- Figure Eight
- Outer Circuit
- Existing flight dynamics
- Motor/PID/contact systems
- Manual flight behavior
- Wind and weather physics
- Existing role restrictions
- Examination state machine
- Scoring provenance
- Recording and replay
- Controller calibration data
- Existing session evidence
- Original automated reference missions

Do not change aircraft physics merely to improve user convenience.

Do not insert hidden auto-hover, route correction, heading correction, or auto-landing logic.

Do not convert manual practical examinations into automatic demonstrations.

If existing manual controls represent body-frame velocity commands rather than attitude or raw-throttle RC behavior, preserve and accurately document that limitation. Do not mislabel the control mode as fully equivalent to real aircraft hardware.

No invented regulations.

No invented official pass/fail thresholds.

No claims of officially approved Vietnamese examination equivalence.

No unnecessary new runtime dependencies.

---

# 14. IMPLEMENTATION PLAN

Execute in verifiable stages.

## Stage A — Audit

- Inspect current Pilot Station and Pilot VLOS
- Inspect existing UX and settings
- Identify duplicate or confusing functionality
- Review the current Vietnamese terminology
- Review screenshots and actual browser behavior
- Establish baseline tests
- Document the UX problems and intended corrections

## Stage B — Pilot Position and Camera

- Refine pilot station to the midpoint of the front long edge outside V1
- Preserve original court geometry
- Validate coordinate transformation
- Validate pilot-to-H relationship
- Refine initial camera direction
- Verify fixed-eye behavior
- Verify head-look
- Verify drone apparent scale
- Verify examination restrictions
- Update pilot station diagram and documentation

## Stage C — Vietnamese UX Simplification

- Implement Vietnamese-first labels
- Simplify navigation
- Create an obvious learner starting point
- Create a simple training setup flow
- Simplify weather and wind presets
- Simplify controller selection
- Organize normal and advanced settings
- Improve accessibility
- Improve error and help messages

## Stage D — Instructor and Examination Refinement

- Preserve role separation
- Improve task instructions
- Improve candidate feedback
- Improve instructor usability
- Improve reporting terminology
- Verify examination settings cannot be modified by unauthorized users

## Stage E — Browser Verification

Run all existing tests, then test the new features against the production build.

Test:

- Pilot station centered correctly
- Pilot stays outside V1
- No geometric field changes
- Fixed ground-based viewpoint
- Correct eye height
- Correct view direction
- Head rotation without translation
- No camera follow/zoom in strict VLOS
- Training and reference mission compatibility
- No unauthorized camera change during examination
- Vietnamese labels and help
- Simple wind preset mapping
- Advanced weather controls
- Controller setup usability
- Settings persistence
- Keyboard navigation
- Responsive UI
- Session recording/replay regression
- Existing examination and physics regressions

Do not consider visual changes complete until actual browser screenshots have been inspected.

---

# 15. REQUIRED SCREENSHOT EVIDENCE

Capture and review actual application screenshots, including:

1. Pilot station diagram showing the center-front position
2. Pilot View looking toward the field
3. Drone visible at different field distances
4. Pilot View during Figure Eight
5. Pilot View during Outer Circuit
6. Vietnamese training home screen
7. Simplified wind selector
8. Advanced settings collapsed
9. Advanced settings expanded
10. Simplified controller connection screen
11. Mock examination interface
12. Instructor dashboard
13. Laptop viewport
14. Mobile/responsive layout

Check:

- Aircraft visibility
- Perspective
- Field orientation
- Text readability
- Vietnamese diacritics
- Button sizes
- Information hierarchy
- UI overlap
- Confusing terminology
- Unexpected camera behavior

Correct discovered defects and recapture affected screenshots.

Do not invent evidence or treat code inspection alone as visual verification.

---

# 16. REAL USER VALIDATION PLAN

A successful automated browser test does not prove that a nontechnical Vietnamese learner can use the application.

Create a realistic usability validation plan.

Suggested participants, when available:

- First-time drone learner
- Older learner
- Experienced instructor
- Technical administrator

Suggested tasks:

1. Open the application and start training without assistance.
2. Select the Figure Eight exercise.
3. Choose a light wind condition.
4. Connect or select an input method.
5. Locate the Pilot View.
6. Start, pause, and retry a training attempt.
7. Understand a controller connection error.
8. Enter mock examination mode.
9. Finish or abort an attempt appropriately.
10. Find and understand the resulting report.

Measure or observe:

- Task completion
- Time to complete
- Errors
- Assistance required
- Comprehension of terminology
- Confusing controls
- Readability issues
- Overall usability feedback

If actual participants are unavailable, create the test plan and mark usability validation as pending.

Do not fabricate human testing results.

---

# 17. DOCUMENTATION AND HANDOFF

Produce or update:

- `docs/PILOT_STATION_AND_VLOS_DESIGN.md`
- `docs/VIETNAMESE_END_USER_UX_RESEARCH.md`
- `docs/UX_REDESIGN_SPEC.md`
- `docs/SETTINGS_SIMPLIFICATION.md`
- `docs/UX_IMPLEMENTATION_REPORT.md`
- `README.md`
- Existing tests and evidence records
- `AGENT_HANDOFF_CONTEXT.md`

Keep `AGENT_HANDOFF_CONTEXT.md` as the single authoritative handoff.

Preserve its history.

Do not create a new handoff for every minor change.

Create a separate backup only for a substantial milestone or rewrite.

Record:

- Actual changes
- Files modified
- Decisions and assumptions
- Tests executed
- Screenshots reviewed
- Remaining limitations
- Hardware-dependent validation
- User-research limitations
- Exact next actions

Do not make Git commits unless explicitly authorized.

---

# 18. ACCEPTANCE CRITERIA

This iteration is not considered complete until:

- The recommended pilot position is correctly derived from the front long field edge and stays outside V1.
- H, HA, HB, V1/V2/V3, M1–M5, and calibrated flight geometry remain unchanged.
- Pilot View uses a fixed ground-based eye position.
- Head-look functions without camera translation or tracking.
- Pilot View works during manual training and existing reference missions.
- Strict examination camera restrictions remain enforced.
- The main learner interface is Vietnamese-first.
- Core navigation is understandable without technical knowledge.
- Weather selection uses simple wind presets.
- Advanced weather and engineering controls remain available but are not forced on ordinary learners.
- Controller setup is understandable for nontechnical users.
- Important controls are readable and accessible.
- Training, mock examination, and instructor workflows remain distinct.
- Previously implemented scoring, logging, replay, and examination logic remain intact.
- Existing physics, browser, and regression tests pass, or any remaining failures are explicitly disclosed.
- Actual production-browser screenshots demonstrate the implemented changes.
- Human usability testing requirements and unresolved assumptions are documented.

Do not claim verified real-world usability without testing with representative users.

Do not claim official examination certification.

Do not claim real RC or hardware performance validation without actual hardware testing.

---

# FINAL EXECUTION INSTRUCTIONS

Begin immediately.

1. Read the complete repository and authoritative handoff.
2. Inspect the original court diagram and current pilot station implementation.
3. Establish the existing test/build baseline.
4. Audit the current interface from the perspective of a Vietnamese beginner and an older learner.
5. Research evidence-based accessibility and usability practices.
6. Refine the Pilot Position and Pilot View.
7. Implement a Vietnamese-first, simplified user interface.
8. Replace unnecessarily complicated normal-user weather configuration with easy wind presets.
9. Organize advanced settings without removing functionality.
10. Preserve manual flight, examination, reference missions, physics, and recording.
11. Run automated tests and actual production-browser verification.
12. Inspect screenshots and fix confirmed UX/rendering problems.
13. Update documentation and the authoritative handoff.
14. Deliver a concise report of implemented features, verified behavior, remaining limitations, and next actions.

Do not stop after writing a design document when implementation is feasible.

Do not ask for confirmation on routine engineering details.

Make conservative, documented decisions where requirements are incomplete.

**The final product should allow a Vietnamese learner, including someone with minimal computer experience, to open UAV ARENA, understand what to do, select a practical flight exercise, use the correct Pilot View, control the simulated aircraft, and review their practice results with minimal confusion.**

**The central design principle is: professional UAV training functionality underneath, simplicity and clarity for the learner on the surface.**