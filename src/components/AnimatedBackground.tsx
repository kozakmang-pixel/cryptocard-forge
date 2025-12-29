// src/components/AnimatedBackground.tsx
import React from 'react';

const NODES = [
  { id: 1, x: 5, y: 10 },
  { id: 2, x: 18, y: 8 },
  { id: 3, x: 30, y: 12 },
  { id: 4, x: 43, y: 9 },
  { id: 5, x: 57, y: 11 },
  { id: 6, x: 70, y: 7 },
  { id: 7, x: 84, y: 10 },
  { id: 8, x: 95, y: 13 },

  { id: 9, x: 10, y: 30 },
  { id: 10, x: 24, y: 27 },
  { id: 11, x: 38, y: 31 },
  { id: 12, x: 52, y: 28 },
  { id: 13, x: 66, y: 32 },
  { id: 14, x: 80, y: 29 },
  { id: 15, x: 92, y: 33 },

  { id: 16, x: 6, y: 50 },
  { id: 17, x: 20, y: 47 },
  { id: 18, x: 34, y: 52 },
  { id: 19, x: 48, y: 48 },
  { id: 20, x: 62, y: 53 },
  { id: 21, x: 76, y: 49 },
  { id: 22, x: 90, y: 52 },

  { id: 23, x: 12, y: 70 },
  { id: 24, x: 26, y: 67 },
  { id: 25, x: 40, y: 72 },
  { id: 26, x: 54, y: 69 },
  { id: 27, x: 68, y: 73 },
  { id: 28, x: 82, y: 68 },
  { id: 29, x: 94, y: 72 },
];

const LINKS = [
  // top band
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],

  // mid band
  [9, 10],
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],
  [14, 15],

  // lower bands
  [16, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [20, 21],
  [21, 22],
  [23, 24],
  [24, 25],
  [25, 26],
  [26, 27],
  [27, 28],
  [28, 29],

  // vertical / diagonal connections
  [1, 9],
  [2, 10],
  [3, 11],
  [4, 12],
  [5, 13],
  [6, 14],
  [7, 15],

  [9, 16],
  [10, 17],
  [11, 18],
  [12, 19],
  [13, 20],
  [14, 21],
  [15, 22],

  [16, 23],
  [17, 24],
  [18, 25],
  [19, 26],
  [20, 27],
  [21, 28],
  [22, 29],
] as const;

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
      {/* Local styles for animations / network look */}
      <style>{`
        @keyframes cc-bg-pan {
          0% {
            transform: translate3d(0, 0, 0) scale(1.1);
          }
          50% {
            transform: translate3d(-30px, -20px, 0) scale(1.15);
          }
          100% {
            transform: translate3d(20px, 25px, 0) scale(1.1);
          }
        }

        @keyframes cc-node-pulse {
          0% {
            r: 1.4;
            opacity: 0.3;
          }
          40% {
            r: 2.3;
            opacity: 1;
          }
          100% {
            r: 1.4;
            opacity: 0.35;
          }
        }

        @keyframes cc-glow-flicker {
          0% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0.45;
          }
        }

        .cc-bg-network {
          animation: cc-bg-pan 36s ease-in-out infinite alternate;
        }

        .cc-node {
          fill: #2dd4bf;
          filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.9));
          animation: cc-node-pulse 4.5s ease-in-out infinite alternate;
        }

        .cc-node--accent {
          fill: #22d3ee;
          filter: drop-shadow(0 0 10px rgba(45, 212, 191, 0.9));
          animation-duration: 6s;
        }

        .cc-link {
          stroke: rgba(56, 189, 248, 0.4);
          stroke-width: 0.5;
        }

        .cc-link--secondary {
          stroke: rgba(45, 212, 191, 0.28);
        }

        .cc-glow {
          animation: cc-glow-flicker 9s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Base soft gradient to match the GIF color palette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,#22d3ee22,transparent_55%),radial-gradient(circle_at_85%_90%,#22c55e22,transparent_55%),radial-gradient(circle_at_50%_50%,#0f172a,transparent_70%)]" />

      {/* Network SVG layer */}
      <svg
        viewBox="0 0 100 80"
        preserveAspectRatio="xMidYMid slice"
        className="cc-bg-network absolute -left-[10%] -top-[10%] w-[120%] h-[120%] opacity-80"
      >
        <defs>
          <radialGradient id="cc-node-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="1" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
          </radialGradient>

          <linearGradient id="cc-link-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.15" />
          </linearGradient>

          <filter id="cc-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.14  0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 0.8 0"
            />
          </filter>
        </defs>

        {/* Large soft glow to mimic bokeh background */}
        <circle
          className="cc-glow"
          cx="20"
          cy="10"
          r="18"
          fill="url(#cc-node-gradient)"
          filter="url(#cc-soft-glow)"
          opacity={0.55}
        />
        <circle
          className="cc-glow"
          cx="80"
          cy="72"
          r="20"
          fill="url(#cc-node-gradient)"
          filter="url(#cc-soft-glow)"
          opacity={0.45}
        />
        <circle
          className="cc-glow"
          cx="55"
          cy="40"
          r="22"
          fill="url(#cc-node-gradient)"
          filter="url(#cc-soft-glow)"
          opacity={0.35}
        />

        {/* Links */}
        <g stroke="url(#cc-link-gradient)" strokeLinecap="round">
          {LINKS.map(([fromId, toId], idx) => {
            const from = NODES.find((n) => n.id === fromId)!;
            const to = NODES.find((n) => n.id === toId)!;
            const secondary = idx % 3 === 0;
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={secondary ? 'cc-link cc-link--secondary' : 'cc-link'}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {NODES.map((node, index) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={index % 5 === 0 ? 1.6 : 1.1}
              className={index % 7 === 0 ? 'cc-node cc-node--accent' : 'cc-node'}
              style={{ animationDelay: `${(index % 10) * 0.35}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Foreground vignette so panels pop and edges stay dark */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,rgba(15,23,42,0.8)),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.95),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.95),transparent_55%)] mix-blend-multiply opacity-100" />
    </div>
  );
}

export default AnimatedBackground;
