import * as T from "three";
import {
  circle,
  config,
  outerEight,
  figureEight,
  sampleRoute,
  rectangle,
  type Point,
} from "../arena/geometry";
export function ribbon(
  points: Point[],
  width: number,
  color: string,
  dashed = false,
  height = 0.007,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let distance = 0;
  const last = points.length - 1,
    closed =
      last > 1 &&
      points[0][0] === points[last][0] &&
      points[0][1] === points[last][1];
  for (let i = 0; i < points.length; i++) {
    const point = points[i],
      previous = points[i ? i - 1 : closed ? last - 1 : 0],
      next = points[i < last ? i + 1 : closed ? 1 : last];
    let ax = point[0] - previous[0],
      az = point[1] - previous[1],
      bx = next[0] - point[0],
      bz = next[1] - point[1];
    if (Math.hypot(ax, az) < 1e-9) {
      ax = bx;
      az = bz;
    }
    if (Math.hypot(bx, bz) < 1e-9) {
      bx = ax;
      bz = az;
    }
    const al = Math.hypot(ax, az) || 1,
      bl = Math.hypot(bx, bz) || 1;
    const n1x = -az / al,
      n1z = ax / al,
      n2x = -bz / bl,
      n2z = bx / bl;
    let mx = n1x + n2x,
      mz = n1z + n2z;
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-9) {
      mx = n2x;
      mz = n2z;
    } else {
      mx /= ml;
      mz /= ml;
    }
    // Miter scale preserves perpendicular stroke width through corners; cap acute spikes.
    const halfWidth = (width * 0.5) / Math.max(0.25, mx * n2x + mz * n2z);
    if (i)
      distance += Math.hypot(
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      );
    for (const side of [-1, 1]) {
      positions.push(
        points[i][0] + mx * halfWidth * side,
        height,
        points[i][1] + mz * halfWidth * side,
      );
      uvs.push(distance, side * 0.5 + 0.5);
    }
    if (i) {
      const n = i * 2;
      indices.push(n - 2, n - 1, n, n - 1, n + 1, n);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({
    color,
    roughness: 0.86,
    metalness: 0,
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  mat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <common>",
      "#include <common>\n varying vec2 vPaintUv;",
    );
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\n varying vec2 vPaintUv;",
      )
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n vPaintUv=uv;");
    s.fragmentShader = s.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>\n ${dashed ? "if(mod(vPaintUv.x,1.02)>.62) discard;" : ""}\n float grain=fract(sin(dot(vPaintUv*120.0,vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=0.90+0.1*grain;`,
    );
  };
  mat.customProgramCacheKey = () => (dashed ? "paint-dash" : "paint-solid");
  const mesh = new T.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
function letter(text: string, x: number, z: number, size = 1.1) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f5f4e9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 160px Arial";
  ctx.fillText(text, 256, 128);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.9,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const m = new T.Mesh(new T.PlaneGeometry(size * 2, size), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.01, z);
  m.receiveShadow = true;
  return m;
}
export function makePaint() {
  const g = new T.Group(),
    white = "#ebece2",
    yellow = "#ddbb45";
  // Inset center of V1 by half width so its outer edge defines exactly 45×27m.
  g.add(
    ribbon(
      rectangle({ minX: -22.475, maxX: 22.475, minZ: -13.475, maxZ: 13.475 }),
      config.paint.v1Width,
      white,
    ),
  );
  for (const b of [config.corridors.outer, config.corridors.inner]) {
    const pts: Point[] = [
      [b.minX, -1.5],
      [b.minX, b.minZ],
      [b.maxX, b.minZ],
      [b.maxX, b.maxZ],
      [b.minX, b.maxZ],
      [b.minX, 1.5],
    ];
    g.add(ribbon(pts, 0.1, white));
  }
  g.add(ribbon(rectangle(config.corridors.center), 0.1, yellow, true));
  g.add(ribbon(outerEight(), 0.1, white));
  for (const c of config.figureEight.centers)
    g.add(
      ribbon(circle(c[0], c[1], config.figureEight.innerRadius), 0.1, white),
    );
  g.add(ribbon(figureEight(), 0.1, yellow, true, 0.009));
  g.add(
    ribbon(
      [
        [-18.5, -1.5],
        [-15.5, -1.5],
      ],
      0.1,
      white,
    ),
  );
  g.add(
    ribbon(
      [
        [-18.5, 1.5],
        [-15.5, 1.5],
      ],
      0.1,
      white,
    ),
  );
  for (const p of config.landingZones) {
    g.add(ribbon(circle(p.x, p.z, p.radius), 0.06, white));
    g.add(letter(p.id, p.x, p.z, p.id === "H" ? 1.4 : 0.95));
  }
  g.add(
    ribbon(
      rectangle({ minX: -21.5, maxX: -18.5, minZ: -1.5, maxZ: 1.5 }),
      0.05,
      white,
    ),
  );
  return g;
}
function directionArrow(x: number, z: number, dx: number, dz: number) {
  const l = Math.hypot(dx, dz);
  dx /= l;
  dz /= l;
  const shape: Point[] = [
    [-0.55, -0.06],
    [0.04, -0.06],
    [0.04, -0.23],
    [0.55, 0],
    [0.04, 0.23],
    [0.04, 0.06],
    [-0.55, 0.06],
    [-0.55, -0.06],
  ];
  return ribbon(
    shape.map(([a, b]) => [x + a * dx - b * dz, z + a * dz + b * dx]),
    0.025,
    "#e8efde",
    false,
    0.025,
  );
}
export function makeLabels() {
  const g = new T.Group();
  for (const m of config.markers) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 100;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(20,33,29,.88)";
    ctx.roundRect(0, 0, 256, 100, 18);
    ctx.fill();
    ctx.font = "500 38px monospace";
    ctx.fillStyle = "#e8f4d2";
    ctx.textAlign = "center";
    ctx.fillText(m.id + (m.id.startsWith("M") ? " · 5m" : ""), 128, 63);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(
      new T.SpriteMaterial({ map: tex, depthTest: false }),
    );
    s.position.set(m.x, 0.5, m.z);
    s.scale.set(2.6, 1, 1);
    g.add(s);
  }
  for (const distance of [8, 24, 45, 63]) {
    const a = sampleRoute(distance),
      b = sampleRoute(distance + 0.2);
    g.add(directionArrow(a[0], a[1], b[0] - a[0], b[1] - a[1]));
  }
  for (const [x, z, dx, dz] of [
    [-8, -9, 1, 0],
    [8, -9, 1, 0],
    [18, -3, 0, 1],
    [9, 9, -1, 0],
    [-9, 9, -1, 0],
    [-17, 4, 0, -1],
  ])
    g.add(directionArrow(x, z, dx, dz));
  return g;
}
