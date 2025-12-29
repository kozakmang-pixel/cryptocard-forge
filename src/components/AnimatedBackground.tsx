// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <>
      <style>{`
        /* Overall slow camera drift */
        @keyframes ccBgDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-3%, -2%, 0) scale(1.04);
          }
          100% {
            transform: translate3d(2%, 3%, 0) scale(1.02);
          }
        }

        /* Node pulsing */
        @keyframes ccNodePulse {
          0% {
            opacity: 0.25;
            r: 2.2;
          }
          50% {
            opacity: 0.95;
            r: 3.6;
          }
          100% {
            opacity: 0.3;
            r: 2.2;
          }
        }

        /* Background glow “bokeh” */
        @keyframes ccBokehDrift {
          0% {
            transform: translate3d(-10%, 0, 0);
          }
          50% {
            transform: translate3d(10%, -5%, 0);
          }
          100% {
            transform: translate3d(-8%, 4%, 0);
          }
        }

        .cc-net-lines {
          stroke: rgba(45, 212, 191, 0.4); /* teal/cyan lines */
          stroke-width: 0.7;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.55));
        }

        .cc-net-lines-bright {
          stroke: rgba(94, 234, 212, 0.8);
          stroke-width: 1;
        }

        .cc-node {
          fill: rgba(125, 211, 252, 0.9);
          filter:
            drop-shadow(0 0 4px rgba(56, 189, 248, 0.9))
            drop-shadow(0 0 10px rgba(34, 211, 238, 0.9));
          animation: ccNodePulse 4.5s ease-in-out infinite;
        }

        .cc-node-b {
          animation-duration: 5.3s;
          animation-delay: 1.1s;
        }

        .cc-node-c {
          animation-duration: 6.1s;
          animation-delay: 2.3s;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Deep teal base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, #020617 0, #020617 35%, #020617 100%)',
          }}
        />

        {/* Soft blurred color blobs to match the GIF glow */}
        <div
          className="absolute inset-[-20%]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 15%, rgba(56,189,248,0.65) 0, transparent 55%),' +
              'radial-gradient(circle at 80% 10%, rgba(34,211,238,0.7) 0, transparent 60%),' +
              'radial-gradient(circle at 25% 80%, rgba(59,130,246,0.65) 0, transparent 55%),' +
              'radial-gradient(circle at 90% 85%, rgba(45,212,191,0.5) 0, transparent 60%)',
            filter: 'blur(28px)',
            opacity: 0.9,
            mixBlendMode: 'screen',
            animation: 'ccBokehDrift 38s ease-in-out infinite alternate',
          }}
        />

        {/* Network layer */}
        <div
          className="absolute inset-0"
          style={{
            animation: 'ccBgDrift 45s ease-in-out infinite alternate',
          }}
        >
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            {/* Faint gradient overlay to keep edges darker */}
            <defs>
              <linearGradient id="ccDarkVignette" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(15,23,42,0.0)" />
                <stop offset="55%" stopColor="rgba(15,23,42,0.25)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.95)" />
              </linearGradient>
            </defs>

            <rect
              x="0"
              y="0"
              width="1600"
              height="900"
              fill="url(#ccDarkVignette)"
            />

            {/* Main polygon network */}
            <g>
              {/* Upper band */}
              <polyline
                className="cc-net-lines"
                points="80,140 260,110 440,160 610,120 770,150 930,110 1100,150 1280,120 1440,150"
              />
              <polyline
                className="cc-net-lines"
                points="120,210 300,180 470,230 640,190 810,230 980,190 1150,230 1320,200 1500,230"
              />
              <polyline
                className="cc-net-lines"
                points="60,260 240,250 420,280 590,260 760,295 940,260 1120,300 1290,270 1470,300"
              />

              {/* Middle band */}
              <polyline
                className="cc-net-lines-bright"
                points="100,380 280,340 460,390 640,360 820,400 1000,360 1180,410 1360,380 1520,420"
              />
              <polyline
                className="cc-net-lines"
                points="40,430 220,420 400,450 580,430 760,470 940,430 1120,470 1300,440 1480,470"
              />
              <polyline
                className="cc-net-lines"
                points="120,500 300,470 480,520 660,490 840,530 1020,495 1200,540 1380,510 1540,550"
              />

              {/* Lower band */}
              <polyline
                className="cc-net-lines"
                points="80,610 260,580 440,630 620,600 800,640 980,600 1160,650 1340,620 1500,660"
              />
              <polyline
                className="cc-net-lines"
                points="40,670 220,660 400,690 580,670 760,710 940,670 1120,710 1300,680 1480,720"
              />
              <polyline
                className="cc-net-lines-bright"
                points="120,740 300,710 480,760 660,730 840,770 1020,735 1200,780 1380,750 1540,790"
              />
            </g>

            {/* Nodes (glowing points) */}
            <g>
              {/* Top band nodes */}
              <circle className="cc-node" cx="80" cy="140" r="3" />
              <circle className="cc-node cc-node-b" cx="260" cy="110" r="3" />
              <circle className="cc-node cc-node-c" cx="440" cy="160" r="3" />
              <circle className="cc-node" cx="610" cy="120" r="3" />
              <circle className="cc-node cc-node-b" cx="770" cy="150" r="3" />
              <circle className="cc-node cc-node-c" cx="930" cy="110" r="3" />
              <circle className="cc-node" cx="1100" cy="150" r="3" />
              <circle className="cc-node cc-node-b" cx="1280" cy="120" r="3" />
              <circle className="cc-node cc-node-c" cx="1440" cy="150" r="3" />

              {/* Middle band nodes */}
              <circle className="cc-node cc-node-b" cx="100" cy="380" r="3" />
              <circle className="cc-node cc-node-c" cx="280" cy="340" r="3" />
              <circle className="cc-node" cx="460" cy="390" r="3" />
              <circle className="cc-node cc-node-b" cx="640" cy="360" r="3" />
              <circle className="cc-node cc-node-c" cx="820" cy="400" r="3" />
              <circle className="cc-node" cx="1000" cy="360" r="3" />
              <circle className="cc-node cc-node-b" cx="1180" cy="410" r="3" />
              <circle className="cc-node cc-node-c" cx="1360" cy="380" r="3" />
              <circle className="cc-node" cx="1520" cy="420" r="3" />

              {/* Lower band nodes */}
              <circle className="cc-node" cx="80" cy="610" r="3" />
              <circle className="cc-node cc-node-b" cx="260" cy="580" r="3" />
              <circle className="cc-node cc-node-c" cx="440" cy="630" r="3" />
              <circle className="cc-node" cx="620" cy="600" r="3" />
              <circle className="cc-node cc-node-b" cx="800" cy="640" r="3" />
              <circle className="cc-node cc-node-c" cx="980" cy="600" r="3" />
              <circle className="cc-node" cx="1160" cy="650" r="3" />
              <circle className="cc-node cc-node-b" cx="1340" cy="620" r="3" />
              <circle className="cc-node cc-node-c" cx="1500" cy="660" r="3" />
            </g>
          </svg>
        </div>

        {/* Slight overall darkening so UI stays crisp */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 10%, rgba(15,23,42,0.0) 0, rgba(15,23,42,0.2) 40%, rgba(2,6,23,0.9) 100%)',
          }}
        />
      </div>
    </>
  );
}
