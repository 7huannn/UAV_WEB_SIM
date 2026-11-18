# MASTER IMPLEMENTATION PROMPT
## UAV ARENA — Real-World UAV Practical Examination Training System

### 0. ROLE & MISSION

You are acting as a multidisciplinary engineering team consisting of:

- Senior UAV Flight Simulation Engineer
- UAV Flight Training & Practical Examination Specialist
- Flight Dynamics and Control Systems Engineer
- Three.js / WebGL Simulation Engineer
- Human Factors & VLOS Training Specialist
- Software QA / Verification Engineer
- Technical Research & Documentation Engineer

Your mission is to transform the existing **UAV ARENA** project into a serious, technically defensible UAV practical examination training system.

**This is NOT a drone game, arcade simulator, cinematic demonstration, or visual showcase.**

The goal is a system that can genuinely support pilots and instructors preparing for real-world multirotor UAV practical examinations.

It must reproduce the essential training conditions: pilot position, realistic ground-based observation, manual controller inputs, flight procedures, course geometry, operational constraints, performance evaluation, and instructor review.

The ultimate product should be suitable for classroom and offline flight-training environments, with a future path toward field telemetry and real-world flight assessment support.

Do not claim regulatory certification, official exam equivalence, hardware compatibility, or flight-dynamics fidelity without supporting evidence.

---

# PHASE 0 — REPOSITORY DISCOVERY & BASELINE

Before making changes:

1. Read the entire repository structure.
2. Read `UAV_ARENA_WEB_SIM_SPEC.md`.
3. Read the complete `AGENT_HANDOFF_CONTEXT.md`.
4. Read `docs/REFINEMENT_REPORT.md`, if present.
5. Review `README.md`, `docs/ASSUMPTIONS.md`, existing tests, assets, licenses, and supporting documentation.
6. Inspect the actual implementation of:
   - Arena geometry and reference-plan calibration
   - Flight dynamics and PID controllers
   - Motor and contact simulation
   - Manual flight input
   - Automatic missions
   - Camera systems
   - User interface
   - Weather and wind
   - Rendering and performance
   - Browser verification
   - Existing test suites

Inspect the original Vietnamese examination-field diagram, not only the generated Three.js scene.

Treat its marked dimensions, H/HA/HB, M1–M5, flight curves, designated areas and annotations as primary project references, subject to the accuracy of the source diagram.

Do not silently change previously calibrated geometry.

Run existing tests and the production build to establish a baseline.

Preserve all working source code and existing successful behavior unless a specific, documented requirement necessitates a change.

Produce a gap analysis identifying:

- What already works
- What is physically plausible but unverified
- What is only a visual approximation
- What is missing
- What must be redesigned
- What should remain unchanged
- Which features cannot be accurately implemented without further evidence or hardware

Create:

`docs/REAL_WORLD_TRAINING_GAP_ANALYSIS.md`

Do not stop after producing the analysis. Use its findings to guide implementation.

---

# PHASE 1 — RESEARCH ACTUAL UAV EXAMINATION PROCEDURES

Before designing examination mechanics, investigate how real multirotor UAV practical examinations are administered.

## Primary target: Vietnam

Use current official Vietnamese regulatory and examination documents wherever available.

Verify:

- Applicable UAV pilot qualification categories
- Examination requirements
- Practical test procedures
- Equipment requirements
- Pilot and examiner positions
- VLOS requirements
- Preflight procedures
- Takeoff and landing exercises
- Hovering and positioning requirements
- Figure-eight exercises
- Rectangular or perimeter flight exercises
- Emergency and abnormal procedures
- Evaluation criteria
- Permitted deviations and tolerances
- Pass/fail rules
- Required evidence and records

Determine whether each rule applies to the specific aircraft, certificate category, operating mode, and examination type being simulated.

**Never assume that the provided field diagram alone defines an entire official examination.**

## International comparison

Research relevant practical assessment approaches from:

1. South Korea — multirotor pilot practical tests
2. Japan — unmanned aircraft operator practical skill assessments
3. Australia — RePL practical competency assessment
4. United Kingdom — GVC practical flight assessment
5. EU/EASA — applicable practical competency assessments
6. United States — FAA Part 107, including the distinction between knowledge testing and practical flight assessment

Distinguish official examination requirements from commercial training exercises and informal simulator demonstrations.

For every meaningful requirement, record:

- Country and issuing authority
- Official source
- Document/version/effective date
- Exact requirement or appropriately paraphrased description
- Applicable examination category
- Whether it is mandatory, recommended, or merely illustrative
- Implication for UAV ARENA

Create:

`docs/UAV_EXAMINATION_STANDARDS_RESEARCH.md`

Use actual source evidence. Do not fabricate regulations, coordinates, scoring tolerances, or procedural details.

If authoritative information is unavailable, mark the requirement **UNVERIFIED**.

Do not automatically import foreign examination rules into the Vietnamese examination profile.

---

# PHASE 2 — DEFINE THE REAL PILOT STATION

This is a CRITICAL requirement.

The pilot's position is not the same as the drone's takeoff point.

Currently, the application contains overview, aerial, top-down and drone-oriented cameras. These are useful for demonstration, but they do not accurately represent what a pilot sees during a VLOS practical examination.

## 2.1 Determine the pilot's actual position

Study the supplied examination-field diagram.

Identify:

- Takeoff/landing location H
- HA and HB locations
- Flight boundaries
- Safety boundaries
- Candidate waiting area
- Preparation area
- Examiner area
- Technical area
- Designated pilot operating station, if documented

IMPORTANT:

Do not assume the pilot stands at H.

Do not assume the examiner area is the pilot station.

Do not infer a legally authoritative pilot location from visual convenience.

If no pilot station is explicitly provided, create a configurable `PILOT_STATION` with a clearly labeled provisional position.

Store its coordinate source, assumptions, confidence level, and verification status.

A provisional position may support training and development, but must not be labeled an official examination position.

## 2.2 Implement Pilot VLOS Camera

Introduce a new camera mode:

`PILOT VLOS`

Requirements:

- Fixed world-space observation position
- Configurable eye height
- Accurate field geometry and drone scale
- Appropriate horizontal and vertical viewing angles
- Realistic distance-dependent apparent drone size
- Correct pilot-to-drone relative bearing
- Correct drone nose/tail orientation
- Ground-based depth and perspective
- Natural head-look rotation without translating the pilot station
- No camera orbiting around the drone
- No camera tracking that artificially keeps the drone centered
- No automatic third-person chase view
- No hidden target-position assistance during examination
- No unrealistic magnification presented as unaided VLOS

Consider screen size, resolution, field of view, and viewing distance. Document how these affect perceptual fidelity, especially small drone visibility at a distance.

The simulator should reproduce the challenge of maintaining orientation when the drone faces toward or away from the pilot.

The simulator must not give the candidate visual information that would be unavailable in the intended real-world examination.

## 2.3 Separate camera purposes

Keep existing cameras but assign explicit roles:

- Pilot VLOS: candidate training and examination
- Overview: instructor monitoring
- Top-down: geometry inspection and replay
- Orbit: free technical inspection
- Ground: environmental inspection
- Follow: demonstration/debugging
- FPV: specific FPV training or technical analysis only

Examination profiles must control which views are allowed.

In strict VLOS examination mode, disallow switching to aerial, orbit, follow or FPV during the attempt.

---

# PHASE 3 — REAL MANUAL RC FLIGHT CONTROL

The candidate must actually pilot the simulated aircraft.

Automatic missions are NOT a substitute for manual practical examination.

## 3.1 Input architecture

Implement a clean controller abstraction supporting:

- USB/HID-compatible controller input where accessible through the browser
- Browser Gamepad API
- Controller axis calibration
- Per-axis inversion
- Deadzone calibration
- Input normalization
- Controller connection/disconnection detection
- Controller profiles
- Keyboard fallback for development and accessibility
- Input diagnostics and test screen

Support:

- Throttle
- Yaw
- Pitch
- Roll

Support configurable stick layouts, including Mode 2.

Do not assume that every physical RC transmitter is automatically exposed through the browser as a standard gamepad.

Document tested devices and limitations.

If a real RC device is unavailable in the execution environment, implement the architecture and test mappings using simulated gamepad input, while explicitly reporting that physical hardware compatibility remains unverified.

## 3.2 Flight-control behavior

Preserve the existing flight dynamics as the starting point.

Review:

- 250 Hz simulation stepping
- Rigid-body equations
- Motor response
- PID behavior
- Thrust and torque
- Inertia
- Gravity
- Aerodynamic drag
- Wind response
- Ground contact
- Arming/disarming

Do not rewrite or retune these systems merely to make the aircraft easier to fly.

Identify and document which parameters are physically measured, estimated, illustrative, or uncalibrated.

Implement clearly defined flight modes appropriate to the intended training profile, for example position-stabilized and attitude-oriented modes when supported by the existing dynamics.

Do not label a mode as equivalent to a real flight controller without verification.

## 3.3 Manual examination control

When a candidate enters examination mode:

- Disable automatic mission execution
- Do not teleport the drone
- Do not correct the candidate's route automatically
- Do not silently restore altitude
- Do not silently rotate the drone toward waypoints
- Do not automatically complete maneuver transitions
- Do not provide hidden flight assistance beyond the declared flight-control mode

The candidate must perform the actual flight inputs.

Record the controls and aircraft state continuously for analysis.

---

# PHASE 4 — EXAMINATION SCENARIOS

Preserve the existing mission definitions in:

`src/simulation/missions.ts`

Use them as reference trajectories or demonstrations where appropriate.

Do not delete the existing Figure Eight or Outer Circuit missions.

However, separate:

**REFERENCE MISSION** — a programmed trajectory used for demonstration and comparison.

**MANUAL TRAINING TASK** — a candidate manually performs the maneuver with instructional feedback.

**EXAMINATION TASK** — a candidate manually performs the maneuver under a controlled assessment procedure.

## 4.1 Exercise architecture

Implement reusable examination-task definitions supporting, subject to verified examination requirements:

- Preflight checklist
- Arm and takeoff
- Controlled climb
- Hovering
- Position holding
- Orientation control
- Straight flight
- Figure-eight flight
- Perimeter/rectangular course
- Return to H
- Controlled descent
- Landing
- Disarming
- Postflight checks
- Abnormal and emergency procedures

Do not assume every exercise belongs to every national examination.

Each examination profile must define its own applicable tasks.

## 4.2 Figure Eight

Use the calibrated course geometry and original field diagram.

The candidate must manually navigate the complete figure-eight course.

Record:

- Actual 3D trajectory
- Reference 3D trajectory
- Flight direction
- Progress around both lobes
- Intersection crossing
- Lateral deviation
- Altitude deviation
- Flight speed
- Nose orientation
- Missed sections
- Boundary violations
- Completion state

Do not declare success solely because the drone crosses a waypoint or comes near the final position.

Verify the complete maneuver and the required direction/order.

## 4.3 Outer Circuit

Use M1 → M2 → M3 → M4 → M5 and the associated calibrated flight corridor, where applicable to the selected examination profile.

Measure real candidate progress and deviations.

Preserve the distinction between official painted markings, reference flight paths, and assumed transition paths.

## 4.4 Examination state machine

Create a clear examination state machine, such as:

`NOT_STARTED → PREFLIGHT → READY → ACTIVE → TASK_COMPLETE → LANDING → POSTFLIGHT → FINISHED`

Include appropriate exceptional states:

`PAUSED`, `ABORTED`, `DISQUALIFIED`, `INCOMPLETE`

Only allow transitions consistent with the examination profile.

A physically landed drone is not automatically equivalent to a passed examination.

---

# PHASE 5 — INSTRUCTOR, TRAINING & EXAM MODES

Implement three distinct operating modes.

## MODE A — Training

For students practicing skills.

Features:

- Pilot VLOS view
- Manual RC control
- Selectable exercises
- Reference route guidance if enabled
- Optional instructor feedback
- Altitude and positioning guidance
- Error indicators
- Repetition and practice

All assistance must be clearly visible and configurable.

## MODE B — Examination

For realistic mock practical assessments.

Features:

- Locked examination profile
- Defined pilot station
- Required manual flight
- Restricted camera permissions
- Defined start and completion conditions
- Examination checklist
- Event recording
- Scoring
- Examiner review
- Automatic error detection where reliable
- No unauthorized training overlays or hidden corrections

Mark results as **SIMULATED / PRACTICE EXAMINATION**, unless an authorized examination framework independently validates the system.

## MODE C — Instructor / Debrief

For an instructor or evaluator.

Features:

- Overview camera
- Top-down tracking
- Reference trajectory
- Candidate trajectory
- Flight telemetry
- RC inputs
- Timeline
- Pause and replay
- Task events
- Error review
- Manual evaluator annotations

The instructor must be able to inspect failures without affecting the original examination record.

Design the interface so candidate and instructor responsibilities remain distinct.

---

# PHASE 6 — EVIDENCE-BASED SCORING

Implement a structured evaluation engine.

Potential metrics:

- Takeoff accuracy
- Hover stability
- Position deviation
- Altitude deviation
- Heading deviation
- Path adherence
- Speed control
- Boundary violations
- Task order
- Missing required maneuvers
- Landing accuracy
- Emergency-procedure execution
- Time and task completion
- Manual examiner observations

IMPORTANT:

Never invent official pass/fail limits.

Use a versioned examination-rule configuration.

Every numerical tolerance must be traceable to:

1. A verified official standard, or
2. An explicitly labeled training-only engineering configuration.

Where the official standard requires human judgment, implement an instructor scoring or confirmation mechanism rather than pretending to calculate an objective result automatically.

Results must distinguish:

- Automatically measured metrics
- Rule-triggered violations
- Instructor judgments
- Unverified metrics
- Insufficient data
- Final assessment decision

Do not equate a smooth-looking trajectory with compliance.

---

# PHASE 7 — TELEMETRY, REPLAY & REPORTING

Implement reliable session recording.

Record at suitable resolution:

- Simulation timestamp
- Actual simulation step information
- Position and altitude
- Orientation
- Linear and angular velocity
- Motor states where available
- RC axis inputs
- Flight mode
- Wind/environment state
- Task state
- Camera/examination mode
- Rule violations
- Instructor annotations

Maintain deterministic or reproducible replay where technically achievable.

Preserve original attempt evidence when adding later annotations.

Generate an examination report containing:

- Attempt ID
- Examination profile and ruleset version
- Candidate/session identifier
- Aircraft/simulation configuration
- Controller configuration
- Pilot station configuration
- Applicable examination tasks
- Metrics
- Violations
- Instructor findings
- Final practice-assessment result
- Source of scoring limits
- Known measurement limitations

Support useful local export formats such as JSON and CSV, and a readable report.

Implement practical local storage and offline behavior without requiring a cloud service.

Never fabricate missing telemetry or claim that simulated flight data originated from real aircraft hardware.

---

# PHASE 8 — REAL-WORLD FIELD USE ARCHITECTURE

Design the system for future use at actual UAV training grounds.

This does not mean immediately connecting to or commanding a real aircraft.

Define an extensible integration boundary for:

- External telemetry import
- Real flight logs
- Coordinate system mapping
- Surveyed field calibration
- Time synchronization
- Aircraft configuration
- Flight-path comparison
- Instructor assessment

Consider relevant telemetry and flight-controller ecosystems, but select integration protocols only after confirming the target hardware.

Initially prioritize **read-only telemetry analysis and imported flight logs**.

Do not implement autonomous real-aircraft command transmission, arming, takeoff or mission execution as an incidental part of this simulator upgrade.

Any future real-aircraft control integration requires its own safety review, authorization, hardware validation, communication safeguards and operational procedures.

The current deliverable must be useful offline, even without an attached drone.

---

# PHASE 9 — UI/UX RESTRUCTURING

Redesign the application around the workflow of a training center, not a game.

The primary navigation should expose:

1. Training
2. Mock Examination
3. Instructor
4. Session Review
5. Controller Calibration
6. Examination Profiles
7. System Configuration

Candidate-facing examination UI should be restrained and should not reveal prohibited navigation or scoring aids during an attempt.

Instructor-facing UI can show richer telemetry and inspection controls.

Clearly identify:

- Training mode versus examination mode
- Pilot VLOS versus non-pilot cameras
- Real controller versus simulated input
- Verified examination rules versus provisional rules
- Simulated aircraft versus imported real-flight telemetry
- Passed tests versus unverified hardware behavior

Ensure desktop usability and sensible responsive behavior.

Prioritize functional clarity, instrument readability and predictable controls.

Do not spend substantial implementation effort on decorative animation, photorealistic clouds, grass or cinematic effects while core training functionality is incomplete.

---

# PHASE 10 — VERIFICATION & VALIDATION

Do not consider a feature complete simply because code exists.

Implement tests for:

## Geometry

- Original field dimensions
- H/HA/HB positions
- M1–M5 coordinates
- Course boundaries
- Figure-eight route geometry
- Pilot station configuration
- World-coordinate consistency

## Camera

- Correct pilot station eye position
- Correct ground-based orientation
- Correct distance-dependent apparent aircraft size
- No unauthorized camera translation
- No camera switching in strict examination mode
- Correct pilot/drone relative bearing

## Controller

- Axis normalization
- Calibration
- Axis inversion
- Deadzones
- Controller disconnection handling
- Correct pitch/roll/yaw/throttle behavior
- No unintended commands while UI inputs are focused

## Flight

- Existing physics regressions
- Manual takeoff
- Position holding
- Orientation response
- Wind disturbance
- Landing/contact
- No teleportation
- No unauthorized autopilot assistance

## Examination

- Correct task sequencing
- Candidate-driven route execution
- Boundary detection
- Route completion criteria
- Invalid transitions
- Abort/pause rules
- Score traceability
- Human-review requirements
- Record integrity

## Reporting

- Correct telemetry timestamps
- Session metadata
- Rule/version provenance
- Replay consistency
- Data export integrity
- No fabricated measurements

Run existing headless tests, build verification and browser regression tests.

Expand the browser suite to cover the new workflows.

Capture meaningful evidence from:

- Pilot VLOS view
- Training mode
- Mock examination mode
- Instructor view
- Figure-eight manual attempt
- Outer circuit manual attempt
- Scoring/report interface
- Controller calibration
- Replay and telemetry visualization

If a physical USB RC transmitter, real GPU, real aircraft or surveyed field is not available, explicitly state which tests are impossible and what remains unverified.

Do not report simulated input tests as successful real-controller hardware tests.

Do not claim 60 FPS without actual GPU performance measurements.

---

# PHASE 11 — DOCUMENTATION & DELIVERABLES

Update the existing repository documentation.

Required deliverables:

1. `docs/REAL_WORLD_TRAINING_GAP_ANALYSIS.md`
2. `docs/UAV_EXAMINATION_STANDARDS_RESEARCH.md`
3. `docs/PILOT_STATION_AND_VLOS_DESIGN.md`
4. `docs/CONTROLLER_INPUT_ARCHITECTURE.md`
5. `docs/EXAMINATION_RULES_AND_SCORING.md`
6. `docs/REAL_WORLD_VALIDATION_PLAN.md`
7. `docs/IMPLEMENTATION_AND_VERIFICATION_REPORT.md`

Update existing README, assumptions, tests and other documentation where necessary.

Keep the exact filenames above unless a strong repository convention justifies a different location.

Every report must distinguish:

- Implemented
- Tested
- Partially implemented
- Blocked by external evidence
- Blocked by hardware
- Planned
- Not implemented

Provide instructions for running the application locally, connecting compatible RC hardware, configuring the pilot station, conducting a mock exam, reviewing a recorded attempt and exporting the results.

---

# HANDOFF & VERSION-CONTINUITY RULES

Maintain:

`AGENT_HANDOFF_CONTEXT.md`

as the single authoritative handoff.

Do not replace it with an unrelated summary or erase historical information.

After major implementation milestones, update:

- Current verified state
- Files changed
- Architectural decisions
- Tests actually executed
- Evidence
- Unresolved problems
- Known limitations
- Exact next actions

Create separate handoff backups only for major milestones or substantial rewrites.

Preserve existing backup documents.

Use Git to track ordinary source revisions when possible.

Do not create commits unless explicitly authorized.

Never remove working code, tests, evidence or original reference materials merely for convenience.

---

# ENGINEERING RULES

These rules are mandatory.

1. **Evidence before claims.** Never label a feature verified without appropriate test evidence.
2. **Regulatory traceability.** Never invent examination rules, scoring thresholds, or authoritative pilot positions.
3. **Manual control authenticity.** Never disguise automated route-following as manual piloting.
4. **Physical consistency.** Preserve coordinate systems, dynamics, contact behavior, and real flight progression.
5. **No unnecessary rewrites.** Reuse proven code and extend existing abstractions.
6. **Separate training from examination.** Training assistance must not leak into strict examination mode.
7. **Preserve existing functionality.** Existing missions, weather, cameras, UI functionality and geometry must continue working unless intentionally superseded.
8. **No fake hardware validation.** State hardware and rendering limitations accurately.
9. **Real-world safety.** Treat simulated performance as training evidence, not proof of safe real-aircraft operation.
10. **Scope discipline.** Prioritize training accuracy over cosmetic graphics work.
11. **Reproducibility.** Document settings, rules, test environments and results.
12. **Operational usability.** Design for instructors and candidates, not only software developers.

---

# EXECUTION PRIORITY

Follow this order:

**P0 — Foundational authenticity**

- Repository and standards analysis
- Pilot station model
- Pilot VLOS camera
- RC input and calibration architecture
- Genuine manual flight in training and examination workflows

**P1 — Practical examination system**

- Versioned examination profiles
- Manual examination task engine
- Instructor controls
- Evidence-based scoring
- Attempt recording
- Replay and reporting

**P2 — Real-world deployment readiness**

- Hardware compatibility validation
- External flight-log import architecture
- Field-coordinate calibration design
- Performance evaluation on actual GPU hardware
- Usability and instructor validation
- Nonessential graphics improvements

Implement in small, verifiable milestones.

After each milestone, run the relevant tests, fix regressions, update evidence and revise the handoff.

Do not stop at architectural proposals when implementation is feasible in the available repository.

If an official requirement cannot be verified, implement a clearly labeled, configurable training-only assumption where safe and useful. Do not silently promote the assumption into an official examination rule.

---

# FINAL ACCEPTANCE CRITERIA

The upgrade must not be represented as completed unless the following core behaviors are verifiable:

- A candidate can occupy a fixed ground-based Pilot VLOS viewpoint.
- The candidate can manually control the simulated drone.
- The aircraft responds through the actual simulation dynamics.
- A supported controller or documented fallback can produce real manual inputs.
- The candidate can perform Figure Eight and Outer Circuit exercises without automatic route execution.
- Examination mode limits cameras and assistance appropriately.
- The system records actual attempted flight paths and control inputs.
- Task completion and violations are evaluated from candidate performance.
- Scoring rules and limits have documented provenance.
- An instructor can inspect and review an attempted flight.
- Reports accurately reflect simulation evidence.
- Existing working functionality remains regression-tested.
- All unverified official requirements and physical fidelity limitations remain explicit.

Real-world validation using an actual RC transmitter, appropriate UAV equipment, qualified instructors and surveyed examination site remains a separate acceptance stage.

A fully working browser simulation is not itself evidence of official examination equivalence.

---

# START NOW

Begin by reading the repository, original examination-field reference, specification, complete handoff and existing verification evidence.

Then:

1. Establish and document the current baseline.
2. Research and verify the applicable examination requirements.
3. Identify unresolved pilot-position and scoring assumptions.
4. Produce the gap analysis and implementation architecture.
5. Implement the highest-priority foundational features.
6. Continue through examination workflows, scoring, recording and instructor review where feasible.
7. Run tests and inspect actual behavior.
8. Fix confirmed defects.
9. Update documentation and the authoritative handoff.
10. Produce a final implementation report describing precisely what works and what remains unverified.

Do not ask for confirmation on routine architectural decisions or minor implementation details. Make documented conservative choices and proceed.

For information that cannot be established reliably, preserve the uncertainty and use configurable provisional values rather than inventing authoritative facts.

**Primary objective: turn UAV ARENA into a credible, testable, evidence-based practical UAV pilot training simulator, with a clear and safe path toward real-world training-center use.**