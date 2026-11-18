# Pilot station and VLOS design

## Source interpretation

The original upright Vietnamese plan is `assets/reference/arena-layout.png`. H (-20, 0) is the takeoff/landing area; HA (-20, -9) and HB (-20, +9) are additional marked landing areas. V1 encloses the concrete court. V2 encloses flight corridors and V3 marks the dashed route. Preparation and technical areas lie west of V1. Examiner, candidate waiting and emergency/PCCC areas are labelled south of V1. These labels do not identify a pilot operating station. No ancillary facilities were added to the scene.

`src/training/pilot.ts` defines `PILOT_STATION`: X=-25 m, Z=0 m, turf ground Y=-0.035 m, eye height 1.65 m, vertical FOV 60°. Eye XYZ is therefore (-25, 1.615, 0). Source: engineering assumption on west turf. Confidence LOW; verification PROVISIONAL. This is distinct from H and from the labelled examiner area. It is not a legal safety-distance recommendation. The true station needs authority confirmation and a site survey. System Configuration permits explicit station/eye/FOV changes before an attempt; each attempt locks a copy. Values are range/finite checked and persisted locally.

## Projection and head look

Pilot VLOS is a perspective camera at the fixed eye, metre-scale aircraft and original court coordinates. Zero head yaw looks east (+X), with a fixed initial upward head pitch of 0.2 rad; it never follows the aircraft. Drag rotates yaw/pitch (bounded ±π and ±1.2 rad) without translating. Initial head pose is a convenience, not an official station bearing. Wheel zoom and OrbitControls are disabled; zoom is reset to 1. Camera projection follows viewport aspect, not aircraft distance. No magnification, automatic centering, heading marker, nose/tail hint or chase behavior is presented as VLOS.

Horizontal FOV = 2 atan(aspect × tan(verticalFOV / 2)). Apparent angular size is 2 atan(objectSize / (2 × distance)); perspective screen size follows this relation. Tests verify half apparent size at twice distance, bearing signs, fixed eye under head rotation and no zoom. Orientation uses the same aircraft quaternion as dynamics; body -Z is the nose. The preserved asymmetric airframe/lens/navigation lights provide physical visual cues without an artificial direction arrow.

## Camera roles and restrictions

Training permits deliberate selection of ground/overview/top-down/follow/FPV aids. Reference missions retain all existing views and automatic demonstrations. Instructor/Session Review can inspect the plan, recorded 3D trajectory and reference at 5 m gear altitude. Ground is an orbitable inspection camera; it is never labelled Pilot VLOS.

Mock Examination locks Pilot VLOS from preflight through completion/termination. World-level camera, route, label, debug, station and workspace APIs reject prohibited changes. Original automatic mission/takeoff/landing methods reject calls under manual-only policy. Candidate UI hides engineering telemetry, minimap, reference route, candidate trace and other cameras. Allowed task instructions and procedural status remain visible. A prohibited camera reaching the evaluator invalidates the attempt. This is an honest local practice restriction, not a secure/proctored examination environment: browser developer tools and edited local software are outside its integrity boundary.

## Perceptual fidelity limits

A fixed geometrically correct camera does not establish human VLOS equivalence. Physical display width, pixel pitch, operating-system scaling, viewing distance, display latency, brightness/contrast, anti-aliasing, visual acuity, depth cues and real aircraft visibility must be measured. Match the monitor's visual angle to configured FOV, then test farthest-court nose/tail recognition with instructors. A larger aircraft icon or auto-zoom would invalidate this test; neither is used. Station and FOV remain provisional until reviewed. The browser footer reports actual frame/physics progress; SwiftShader slowdown is not acceptable evidence of real-time hardware fidelity.
