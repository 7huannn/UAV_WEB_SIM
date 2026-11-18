import * as T from "three";
import {
  circle,
  config,
  outerEight,
  figureEight,
  rectangle,
  type Point,
} from "../arena/geometry";
export function ribbon(
  points: Point[],
  width: number,
  color: string,
  dashed = false,
  height = 0.0015,
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
  m.position.set(x, 0.002, z);
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
  g.add(ribbon(figureEight(), 0.1, yellow, true, 0.002));
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
export function makeLabels() {
  const g = new T.Group();
  for (const m of config.markers) {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 72;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(248,250,239,.94)";
    ctx.beginPath();
    ctx.roundRect(1, 1, 238, 70, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(82,105,67,.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "500 32px monospace";
    ctx.fillStyle = "#344b38";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(m.id + (m.id.startsWith("M") ? " · 5m" : ""), 120, 38);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false }),
    );
    sprite.position.set(m.x, 0.32, m.z);
    sprite.userData.id = m.id;
    g.add(sprite);
  }
  return g;
}
export function makeMarkerDots() {
  const group = new T.Group();
  for (const m of config.markers) {
    const dot = new T.Mesh(
      new T.RingGeometry(0.055, 0.1, 20),
      new T.MeshBasicMaterial({
        color: "#4b7667",
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(m.x, 0.015, m.z);
    dot.userData.id = m.id;
    group.add(dot);
  }
  return group;
}
export function updateLabels(
  group: T.Group,
  camera: T.PerspectiveCamera,
  width: number,
  height: number,
  active: string,
) {
  const rectangles: number[][] = [];
  const sorted = [...group.children].sort(
    (a, b) =>
      Number(b.userData.id === active) - Number(a.userData.id === active),
  );
  for (const object of sorted) {
    const sprite = object as T.Sprite,
      distance = camera.position.distanceTo(sprite.position),
      p = sprite.position.clone().project(camera);
    const w = sprite.userData.id === active ? 78 : 66,
      h = 22,
      x = ((p.x + 1) * width) / 2,
      y = ((1 - p.y) * height) / 2;
    sprite.visible =
      distance < 140 &&
      p.z < 1 &&
      p.z > -1 &&
      x > w / 2 &&
      x < width - w / 2 &&
      y > h &&
      y < height - h;
    const rect = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    if (
      rectangles.some(
        (r) =>
          rect[0] < r[2] + 5 &&
          rect[2] > r[0] - 5 &&
          rect[1] < r[3] + 4 &&
          rect[3] > r[1] - 4,
      )
    )
      sprite.visible = false;
    if (sprite.visible) rectangles.push(rect);
    const units =
      (2 * distance * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) / height;
    sprite.scale.set(w * units, h * units, 1);
    sprite.material.color.set(
      sprite.userData.id === active ? "#def1bc" : "#ffffff",
    );
  }
}
