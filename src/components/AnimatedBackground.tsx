// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <>
      <style>{`
        /* ====== ANIMATION KEYFRAMES ====== */

        /* Slow aurora drift */
        @keyframes ccAuroraDriftA {
          0%   { transform: translate3d(-10%, -5%, 0) rotate(-2deg) scale(1.05); }
          50%  { transform: translate3d(6%, 4%, 0) rotate(1deg) scale(1.08); }
          100% { transform: translate3d(-4%, 2%, 0) rotate(-1deg) scale(1.03); }
        }

        @keyframes ccAuroraDriftB {
          0%   { transform: translate3d(8%, 6%, 0) rotate(3deg) scale(1.05); }
          50%  { transform: translate3d(-6%, -4%, 0) rotate(-1deg) scale(1.09); }
          100% { transform: translate3d(3%, -2%, 0) rotate(2deg) scale(1.04); }
        }

        /* Faint moving diagonal “scanline” grid */
        @keyframes ccGridSlide {
          0%   { transform: translate3d(-10%, 0, 0); opacity: 0.28; }
          50%  { transform: translate3d(0%, -5%, 0); opacity: 0.38; }
          100% { transform: translate3d(10%, 0, 0); opacity: 0.28; }
        }

        /* Tiny spark pulses on intersections */
        @keyframes ccSparkPulse {
          0%   { opacity: 0.25; transform: scale(0.7); }
          50%  { opacity: 1;    transform: scale(1.2); }
          100% { opacity: 0.25; transform: scale(0.8); }
        }

        /* Noise shimmer */
        @keyframes ccNoiseDrift {
          0%   { transform: translate3d(0, 0, 0); opacity: 0.12; }
          50%  { transform: translate3d(-2%, 2%, 0); opacity: 0.18; }
          100% { transform: translate3d(1%, -2%, 0); opacity: 0.12; }
        }

        /* ====== CUSTOM CLASSES ====== */

        .cc-bg-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .cc-bg-base {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 0%, rgba(15,23,42,0.8) 0, transparent 55%),
            radial-gradient(circle at 85% 0%, rgba(15,23,42,0.85) 0, transparent 55%),
            radial-gradient(circle at 50% 110%, rgba(15,23,42,1) 0, #020617 65%);
        }

        .cc-bg-aurora-a {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(circle at 10% 20%, rgba(45,212,191,0.32) 0, transparent 55%),
            radial-gradient(circle at 60% 0%, rgba(56,189,248,0.38) 0, transparent 60%),
            radial-gradient(circle at 90% 40%, rgba(129,140,248,0.30) 0, transparent 60%);
          filter: blur(38px);
          opacity: 0.9;
          mix-blend-mode: screen;
          animation: ccAuroraDriftA 42s ease-in-out infinite alternate;
        }

        .cc-bg-aurora-b {
          position: absolute;
          inset: -25%;
          background:
            radial-gradient(circle at 0% 80%, rgba(8,47,73,0.9) 0, transparent 60%),
            radial-gradient(circle at 70% 90%, rgba(56,189,248,0.22) 0, transparent 65%),
            radial-gradient(circle at 40% 40%, rgba(59,130,246,0.28) 0, transparent 55%);
          filter: blur(42px);
          opacity: 0.85;
          mix-blend-mode: screen;
          animation: ccAuroraDriftB 48s ease-in-out infinite alternate;
        }

        .cc-bg-grid-wrap {
          position: absolute;
          inset: -10%;
          opacity: 0.35;
          mix-blend-mode: screen;
          animation: ccGridSlide 50s linear infinite alternate;
        }

        .cc-bg-grid-line {
          stroke: rgba(56,189,248,0.22);
          stroke-width: 0.7;
          stroke-linecap: round;
          filter:
            drop-shadow(0 0 6px rgba(34,211,238,0.4))
            drop-shadow(0 0 14px rgba(45,212,191,0.55));
        }

        .cc-bg-grid-line-strong {
          stroke: rgba(56,189,248,0.55);
          stroke-width: 0.9;
        }

        .cc-bg-node {
          fill: rgba(191,219,254,0.95);
          filter:
            drop-shadow(0 0 4px rgba(191,219,254,0.95))
            drop-shadow(0 0 12px rgba(59,130,246,0.9));
          animation: ccSparkPulse 6s ease-in-out infinite;
        }

        .cc-bg-node-b { animation-duration: 7.5s; animation-delay: 1.4s; }
        .cc-bg-node-c { animation-duration: 9s;   animation-delay: 2.3s; }

        .cc-bg-noise {
          position: absolute;
          inset: -10%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='noStitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
          opacity: 0.14;
          animation: ccNoiseDrift 40s linear infinite alternate;
        }

        .cc-bg-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(15,23,42,0.0) 0, rgba(15,23,42,0.3) 45%, rgba(2,6,23,0.96) 100%);
        }
      `}</style>

      <div className="cc-bg-root">
        {/* Base deep space */}
        <div className="cc-bg-base" />

        {/* Neon aurora layers */}
        <div className="cc-bg-aurora-a" />
        <div className="cc-bg-aurora-b" />

        {/* Geometric plexus grid */}
        <div className="cc-bg-grid-wrap">
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <g>
              {/* Main diagonal bands */}
              <polyline
                className="cc-bg-grid-line cc-bg-grid-line-strong"
                points="0,260 260,210 520,260 780,210 1040,260 1300,210 1600,260"
              />
              <polyline
                className="cc-bg-grid-line cc-bg-grid-line-strong"
                points="0,420 220,380 440,430 660,390 880,440 1100,400 1320,450 1600,410"
              />
              <polyline
                className="cc-bg-grid-line cc-bg-grid-line-strong"
                points="0,600 260,560 520,610 780,570 1040,620 1300,580 1600,630"
              />

              {/* Cross-link triangles for a more "crypto" geometric feel */}
              <polyline
                className="cc-bg-grid-line"
                points="220,380 360,290 520,260 660,290 780,210 940,260 1100,210 1240,300 1320,450"
              />
              <polyline
                className="cc-bg-grid-line"
                points="260,560 360,430 520,390 660,430 820,390 980,430 1140,400 1300,450 1440,600"
              />
              <polyline
                className="cc-bg-grid-line"
                points="100,700 260,560 440,610 620,560 800,610 980,570 1160,620 1340,580 1500,640"
              />
            </g>

            {/* Spark nodes on key intersections */}
            <g>
              <circle className="cc-bg-node" cx="260" cy="210" r="2.7" />
              <circle className="cc-bg-node cc-bg-node-b" cx="520" cy="260" r="2.7" />
              <circle className="cc-bg-node cc-bg-node-c" cx="780" cy="210" r="2.7" />
              <circle className="cc-bg-node" cx="1040" cy="260" r="2.7" />
              <circle className="cc-bg-node cc-bg-node-b" cx="1300" cy="210" r="2.7" />

              <circle className="cc-bg-node" cx="220" cy="380" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-b" cx="440" cy="430" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-c" cx="660" cy="390" r="2.5" />
              <circle className="cc-bg-node" cx="880" cy="440" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-b" cx="1100" cy="400" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-c" cx="1320" cy="450" r="2.5" />

              <circle className="cc-bg-node" cx="260" cy="560" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-b" cx="520" cy="610" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-c" cx="780" cy="570" r="2.5" />
              <circle className="cc-bg-node" cx="1040" cy="620" r="2.5" />
              <circle className="cc-bg-node cc-bg-node-b" cx="1300" cy="580" r="2.5" />

              <circle className="cc-bg-node cc-bg-node-c" cx="360" cy="290" r="2.3" />
              <circle className="cc-bg-node" cx="660" cy="290" r="2.3" />
              <circle className="cc-bg-node cc-bg-node-b" cx="940" cy="260" r="2.3" />
              <circle className="cc-bg-node cc-bg-node-c" cx="1240" cy="300" r="2.3" />

              <circle className="cc-bg-node" cx="360" cy="430" r="2.3" />
              <circle className="cc-bg-node cc-bg-node-b" cx="820" cy="390" r="2.3" />
              <circle className="cc-bg-node cc-bg-node-c" cx="980" cy="430" r="2.3" />
              <circle className="cc-bg-node" cx="1140" cy="400" r="2.3" />

              <circle className="cc-bg-node cc-bg-node-b" cx="440" cy="610" r="2.3" />
              <circle className="cc-bg-node cc-bg-node-c" cx="800" cy="610" r="2.3" />
              <circle className="cc-bg-node" cx="1160" cy="620" r="2.3" />
            </g>
          </svg>
        </div>

        {/* Soft noise & vignette for a polished look */}
        <div className="cc-bg-noise" />
        <div className="cc-bg-vignette" />
      </div>
    </>
  );
}
