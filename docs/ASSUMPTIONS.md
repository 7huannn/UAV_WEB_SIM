# Geometry and model assumptions

The user-provided original is `assets/reference/arena-layout-original.jpeg`; the lossless upright derivative is `arena-layout.png`. Only the central competition rectangle is modeled. Pixel coordinates below refer to the upright 1220×862 image.

V1 corners are approximately (129,136) and (1159,754). Its explicitly printed dimensions give 22.8889 pixels/m on both axes. World X runs along 45m, Z increases down the plan, Y points up. Center is (644,445). Reference digitization accuracy is approximately ±0.10m (2–3px), not a survey.

- Concrete 45×27m. Grass 60×42m, 7.5m margins. Concrete top Y=0; turf Y=-0.035m is a design assumption.
- The outside corridor solid rectangle runs from pixels (220,205) to (1090,686): 38×21m, X=-18.5…19.5, Z=±10.5. Its left side opens into H. This is **one** V2 boundary, not the entire V2 geometry.
- The dashed perimeter route runs from (255,239) to (1056,651): 35×18m, X=-17…18, Z=±9. V3 is yellow, including the figure eight.
- The inside corridor rectangle runs from (289,274) to (1022,617): 32×15m, X=-15.5…16.5, Z=±7.5. Its left side has the same 3m entry opening. These solid corridor boundaries and the circle/hourglass boundaries use V2 paint.
- Lobe centers from (473,445) and (839,445): (-7.5,0) and (8.5,0). Inner/center/outer radii are the printed 4/5.5/7m. The figure-eight centerline uses exact common internal tangents and circle arcs, not a sinusoidal approximation.
- The hourglass outer-neck joins are estimated cubic curves from the visible trace. The diagram's small 2.7/1.65/3.3m leader labels are ambiguous at this image resolution; they are **not treated as verified neck dimensions**. Correct these control points if a higher resolution plan is supplied.
- H/HA/HB centers approximately X=-20m and Z=0/-9/+9m, radius1.5m. H has the printed 3×3m square. Letter orientation is normalized for readability.
- WP1–4 align with corners of the 32×15m boundary. M1 is near (-17,-1.5); M2–5 on outer-route corners; M7 at crossover. Engineering text and route arrows are optional overlays, not physical labels on the concrete. M markers use h=5m, interpreted as landing-gear altitude for the autonomous route.
- Dash/gap lengths 0.62/0.40m and symbol paint widths other than V1/2/3 are visual assumptions. V1 is 0.05m, V2 is 0.10m, V3 is 0.10m.

# Illustrative airframe

15kg, 0.96m motor-center span in each horizontal direction, 0.32m gear height, diagonal inertia (0.65,1.05,0.65)kg·m², maximum rotor speed760rad/s, thrust coefficient0.00019N/(rad/s)², reaction torque/thrust ratio0.025m and motor lag0.045s. These are an internally tested demonstration, **not calibrated to a specific UAV**. Body +Y is thrust; body +Z is rear, +X is right. Quaternion maps body to world. Angular velocity is in body coordinates. Rotor spins alternate; RPM is a magnitude, spin direction is separate.

Collision uses four landing-foot contacts with a finite concrete/turf height field, positional penetration correction, low restitution and friction. It is a simplified rigid-body ground-contact model; there is no deformable frame, blade contact or body mesh collider. Hard (>3m/s) or strongly tilted landings trigger crash/disarm. Rain affects visuals only; wind produces body-relative quadratic drag. Sensor readings are ideal simulated state, not noisy IMU/GPS. No sensor accuracy claims.

# Mission interpretation and transfers

Mission 01 rotates the existing analytical figure-eight point sequence to its westernmost point near (-13,0), preserving its radii, tangents, crossover and direction. It departs H through the existing entry at Z≈0, stops at that entry point, completes both lobes once, exits at the same point and returns through the gate to H. This transfer avoids cutting through a 4 m inner circle. The reference does not define a complete departure/return procedure, so these transfers are implementation assumptions, displayed only as an optional route overlay and never added to official paint.

Mission 02 uses the authoritative marker data: M1(-17,-1.5), M2(-17,-9), M3(18,-9), M4(18,9), M5(-17,9). H → gate(-17,0) → M1 is the departure; after M5 it continues up the left corridor to the gate and then H. M1–M5 order agrees with the visible outer arrows; no arrow/order conflict was found. These coordinates inherit the diagram's ±0.10 m digitization uncertainty. Neither mission follows V1.

Both start landed at H, arm, climb to 5 m gear altitude (body center 5.32 m), follow targets through the existing motor/PID/6DOF implementation, return, approach and land. Outer corners are exact marker targets with speed eased to zero; continuous forces round the physical turn without diagonal shortcuts. Planned horizontal lengths include transfers and return, but exclude vertical takeoff/landing. Progress stays below 100% until touchdown/disarm. Selection is locked while active; pause holds position while retaining phase, and Abort/Hold cancels into position hold. Reset is the explicit operation that restores H.

# Rendering approximations

The concrete edge is 3.5 cm above turf, with a 5 mm bevel inside the unchanged 45×27 m footprint. The main flat top spans 44.99×26.99 m and the bevel completes the outer 5 mm on each side. Collision remains the existing flat height-field approximation; the tiny bevel is visual only. A 9 cm soil/contact band lies outside concrete. Paint uses polygon offset with a 1.5–2 mm optical separation.

Vegetation uses three original CC0 Grass Medium 01 tuft variants in fixed 2 m tiles and original low-detail three-blade clusters in fixed 4 m tiles. Seeded transforms remain invariant under camera travel and quality reduction retains a deterministic prefix. Near tufts shrink into turf from 2.5–5.5 m, middle detail from 13–23 m. Renderer frustum culling and padded distance culling occur after geometric fade. No grass fragments are drawn on concrete or outside the 60×42 m field. A diffuse wrap term approximates leaf light scattering; this is not measured subsurface scattering. High omits tuft shadow casting; Ultra uses matching visible/depth wind and LOD deformation.

Clouds use three coherent height shells at 190/270/350 m, seeded filtered noise and an integrated world-space wind offset. They have no screen-space random jitter. This is a layered atmospheric approximation, not full volumetric scattering. Fog and ambient colors blend continuously; environment reflections refresh after weather/time transitions settle. Reflections do not update for every small gust or cloud displacement.

**Context scope tradeoff:** an optional, lightweight atmospheric ground matte surrounds the finite field, reusing local turf maps and fading into the horizon. It adds no colliders, facilities or vegetation instances, does not expand flight bounds and can be disabled with Context. It is visual background, not surveyed surrounding terrain. This explicitly removes the empty-white cutout without silently adding interactive/infinite terrain. A very flat horizon remains visible in low-angle views.

Full photorealism and 60 FPS on hardware remain unaccepted until supported by reviewed images and a real GPU benchmark. Current screenshots are real WebGL renders; software SwiftShader timings cannot establish hardware performance.
