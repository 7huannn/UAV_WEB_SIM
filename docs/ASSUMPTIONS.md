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

# Rendering approximations

Near-camera vegetation uses three original CC0 Poly Haven Grass Medium 01 tuft variants, scattered in an8m local patch. A small indirect diffuse wrap term approximates thin-leaf light scattering; it is not a full measured subsurface-scattering model. Alpha-to-coverage softens cutout edges. Wind deformation is applied to the visible and shadow meshes. Background blades and PBR turf remain outside this patch. The local patch and finite field can still be visible at low angles; photorealistic acceptance is not implied by using a licensed asset.
