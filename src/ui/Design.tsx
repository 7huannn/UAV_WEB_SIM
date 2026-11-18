import type { ProfileId } from "../training/profiles";
import { missions } from "../simulation/missions";
const paths: Record<string, string> = {
  drone:
    "M8 8 4 4m12 4 4-4M8 16l-4 4m12-4 4 4M8 8h8v8H8zM2 4h4M4 2v4m14-2h4m-2-2v4M2 20h4m-2-2v4m14-2h4m-2-2v4",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  play: "m9 5 10 7-10 7z",
  pause: "M8 5v14M16 5v14",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  replay: "M3 10a9 9 0 1 1 1 8M3 3v7h7m2-3v5l3 2",
  target: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v4m0 12v4M2 12h4m12 0h4",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3m0 3v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  wind: "M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5",
  keyboard: "M3 6h18v13H3zM6 10h1m3 0h1m3 0h1m3 0h1M6 14h1m3 0h8",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.drone} />
    </svg>
  );
}
export const exerciseInfo: Record<
  ProfileId,
  {
    title: string;
    level: string;
    description: string;
    number: string;
  }
> = {
  foundations: {
    title: "Làm quen bầu trời",
    level: "Cơ bản",
    number: "01",
    description:
      "Cất cánh, giữ vị trí, đổi hướng và bay thẳng. Một khởi đầu vững vàng cho người mới.",
  },
  "figure-eight": {
    title: "Đường bay số 8",
    level: "Phối hợp",
    number: "02",
    description:
      "Nối hai vòng bay liền mạch. Luyện phối hợp hướng bay, tốc độ và độ cao.",
  },
  "outer-circuit": {
    title: "Chinh phục vòng sân",
    level: "Chính xác",
    number: "03",
    description:
      "Đi qua lần lượt các mốc M1–M5, trở về H và hạ cánh chính xác.",
  },
  abnormal: {
    title: "Bình tĩnh xử lý",
    level: "Tình huống",
    number: "04",
    description:
      "Giữ vị trí, nhận biết tình huống mất liên kết giả lập và thực hiện phương án trở về.",
  },
};
export const exerciseOrder: ProfileId[] = [
  "foundations",
  "figure-eight",
  "outer-circuit",
  "abnormal",
];
export function RouteArt({ profile }: { profile: ProfileId }) {
  const points =
    profile === "figure-eight" || profile === "outer-circuit"
      ? missions[profile].preview
      : [
          [-20, 0],
          [-13, 0],
          [-20, 0],
        ];
  return (
    <svg
      className="route-art"
      viewBox="-25 -17 50 34"
      role="img"
      aria-label={`Sơ đồ ${exerciseInfo[profile].title}`}
    >
      <rect
        x="-22.5"
        y="-13.5"
        width="45"
        height="27"
        rx=".6"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".18"
        strokeWidth=".2"
      />
      <path
        d="M-15-13.5v27M0-13.5v27M15-13.5v27M-22.5-7h45M-22.5 7h45"
        stroke="currentColor"
        strokeOpacity=".08"
        strokeWidth=".15"
      />
      {profile === "abnormal" ? (
        <>
          <circle
            cx="-10"
            cy="0"
            r="6"
            stroke="currentColor"
            strokeWidth=".5"
            fill="none"
          />
          <path
            d="M-20 0h10"
            stroke="currentColor"
            strokeDasharray="1 1"
            strokeWidth=".4"
          />
        </>
      ) : (
        <polyline
          points={points.map((p) => p.join(",")).join(" ")}
          stroke="currentColor"
          strokeWidth=".4"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      <circle cx="-20" cy="0" r="1.8" fill="var(--accent)" />
      <text
        x="-20"
        y=".7"
        textAnchor="middle"
        fontSize="2"
        fill="#192a25"
        fontWeight="700"
      >
        H
      </text>
      {
        <>
          <text
            x="0"
            y="-15"
            fontSize="1.5"
            textAnchor="middle"
            fill="currentColor"
            opacity=".6"
          >
            45 m
          </text>
          <text
            x="23.5"
            y="0"
            fontSize="1.5"
            fill="currentColor"
            opacity=".6"
            transform="rotate(90 23.5 0)"
          >
            27 m
          </text>
        </>
      }
    </svg>
  );
}
export function DroneArt() {
  return (
    <svg className="drone-art" viewBox="0 0 650 520" aria-hidden="true">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e7e9df" />
          <stop offset=".45" stopColor="#abb9aa" />
          <stop offset="1" stopColor="#526d60" />
        </linearGradient>
        <linearGradient id="arm" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#738b7d" />
          <stop offset="1" stopColor="#1c322b" />
        </linearGradient>
        <radialGradient id="rotor">
          <stop stopColor="#c4d9bb" stopOpacity=".1" />
          <stop offset=".88" stopColor="#c4d9bb" stopOpacity=".015" />
          <stop offset="1" stopColor="#c4d9bb" stopOpacity=".18" />
        </radialGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <g fill="none" stroke="#a5bd9b" strokeOpacity=".13">
        <ellipse cx="330" cy="285" rx="260" ry="145" />
        <ellipse cx="330" cy="285" rx="200" ry="108" />
        <path d="M40 285h570M330 90v380" strokeDasharray="3 9" />
      </g>
      <ellipse
        cx="330"
        cy="357"
        rx="173"
        ry="38"
        fill="#071b14"
        opacity=".6"
        filter="url(#shadow)"
      />
      <g
        className="airframe-illustration"
        transform="translate(325 240) rotate(-19)"
      >
        <g transform="scale(1 .63)">
          <path
            d="M-33-22-151-126M33-22 151-126M-33 22-151 126M33 22 151 126"
            stroke="#132a22"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M-33-22-151-126M33-22 151-126M-33 22-151 126M33 22 151 126"
            stroke="url(#arm)"
            strokeWidth="17"
            strokeLinecap="round"
          />
          {[
            [-153, -128],
            [153, -128],
            [-153, 128],
            [153, 128],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle
                r="88"
                fill="url(#rotor)"
                stroke="#c0d1b8"
                strokeOpacity=".2"
                strokeWidth="1"
              />
              <circle
                r="69"
                fill="none"
                stroke="#c0d1b8"
                strokeOpacity=".12"
                strokeDasharray="2 8"
              />
              <path
                d="M-76-8Q-25-24 0-6Q25-2 76 8Q25 24 0 6Q-25 2-76-8"
                fill="#99ae96"
                fillOpacity=".58"
                transform={`rotate(${i * 64})`}
              />
              <circle r="17" fill="#203d31" stroke="#718b76" strokeWidth="3" />
              <circle r="7" fill="#b5c7a7" />
              <circle cy="26" r="3" fill={i < 2 ? "#e0eab0" : "#d68d70"} />
            </g>
          ))}
        </g>
        <path
          d="M-37 38-55 85m92-47 18 47M-65 85h25m0 0h-25m95 0h35"
          fill="none"
          stroke="#1c3129"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="m-40-47 25-16h30l25 16 9 64-21 30h-56l-21-30z"
          fill="#243b31"
          stroke="#9bac96"
          strokeWidth="1"
        />
        <path
          d="m-35-52 22-14h26l22 14 5 58-17 24h-46L-40 6z"
          fill="url(#body)"
        />
        <path d="M-16-55h32L23 6h-46z" fill="#233c31" />
        <path
          d="M-9-46h18M-10-38h20M-11-30h22M-12-22h24"
          stroke="#718b74"
          strokeWidth="2"
        />
        <rect x="-9" y="0" width="18" height="5" rx="2" fill="#d9e8a4" />
        <path d="m-18 30 6 22h24l6-22" fill="#1c3028" />
        <rect x="-13" y="43" width="26" height="21" rx="7" fill="#516958" />
        <circle cy="53" r="8" fill="#122a22" stroke="#9cad96" strokeWidth="2" />
        <circle cx="-2" cy="51" r="2" fill="#b4cfb5" />
      </g>
      <g fill="#c7d6bf" fontFamily="monospace" fontSize="10" letterSpacing="1">
        <text x="45" y="88">
          UAV–15 / QUADCOPTER
        </text>
        <text x="443" y="433">
          SÂN BAY 01
        </text>
      </g>
      <g fill="none" stroke="#b3c7a8" strokeOpacity=".5">
        <path d="M47 104h52m-52 0v23M530 410h52v-23" />
        <path d="m365 330 57 55h100" strokeDasharray="3 4" />
      </g>
    </svg>
  );
}
