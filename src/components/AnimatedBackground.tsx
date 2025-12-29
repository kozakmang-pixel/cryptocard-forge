// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <>
      <style>{`
        /* Slow camera drift / parallax */
        @keyframes ccPlexusDriftFar {
          0% { transform: translate3d(-3%, -2%, 0) scale(1.02); }
          50% { transform: translate3d(2%, 3%, 0) scale(1.05); }
          100% { transform: translate3d(-1%, 1%, 0) scale(1.02); }
        }

        @keyframes ccPlexusDriftMid {
          0% { transform: translate3d(2%, 1%, 0) scale(1); }
          50% { transform: translate3d(-2%, -3%, 0) scale(1.03); }
          100% { transform: translate3d(3%, 2%, 0) scale(1.01); }
        }

        @keyframes ccPlexusDriftNear {
          0% { transform: translate3d(0, 0, 0) scale(1.02); }
          50% { transform: translate3d(-1%, -2%, 0) scale(1.06); }
          100% { transform: translate3d(1%, 1%, 0) scale(1.03); }
        }

        /* Node pulsing (bright points) */
        @keyframes ccPlexusNodePulse {
          0%   { opacity: 0.25; r: 1.8; }
          50%  { opacity: 1;    r: 3.4; }
          100% { opacity: 0.3;  r: 1.8; }
        }

        /* Big background glow blobs */
        @keyframes ccPlexusBokehDrift {
          0%   { transform: translate3d(-6%, 0, 0) scale(1); }
          50%  { transform: translate3d(6%, -4%, 0) scale(1.05); }
          100% { transform: translate3d(-3%, 3%, 0) scale(1.02); }
        }

        .cc-plex-line-far {
          stroke: rgba(56, 189, 248, 0.22);
          stroke-width: 0.6;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.4));
        }

        .cc-plex-line-mid {
          stroke: rgba(34, 211, 238, 0.45);
          stroke-width: 0.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter:
            drop-shadow(0 0 6px rgba(34, 211, 238, 0.7))
            drop-shadow(0 0 10px rgba(45, 212, 191, 0.8));
        }

        .cc-plex-line-near {
          stroke: rgba(125, 211, 252, 0.75);
          stroke-width: 1;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter:
            drop-shadow(0 0 8px rgba(125, 211, 252, 0.9))
            drop-shadow(0 0 16px rgba(56, 189, 248, 0.9));
        }

        .cc-plex-node {
          fill: rgba(191, 219, 254, 0.95);
          filter:
            drop-shadow(0 0 4px rgba(191, 219, 254, 1))
            drop-shadow(0 0 14px rgba(59, 130, 246, 0.9));
          animation: ccPlexusNodePulse 4.8s ease-in-out infinite;
        }

        .cc-plex-node-b {
          animation-duration: 5.6s;
          animation-delay: 1.2s;
        }

        .cc-plex-node-c {
          animation-duration: 6.4s;
          animation-delay: 2.1s;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Deep teal base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, #020617 0, #020617 40%, #020617 100%)',
          }}
        />

        {/* Soft bokeh glows behind the network */}
        <div
          className="absolute inset-[-20%]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, rgba(56,189,248,0.65) 0, transparent 55%),' +
              'radial-gradient(circle at 70% 10%, rgba(34,211,238,0.7) 0, transparent 60%),' +
              'radial-gradient(circle at 35% 70%, rgba(59,130,246,0.65) 0, transparent 55%),' +
              'radial-gradient(circle at 85% 75%, rgba(45,212,191,0.55) 0, transparent 60%)',
            filter: 'blur(30px)',
            opacity: 0.9,
            mixBlendMode: 'screen',
            animation: 'ccPlexusBokehDrift 40s ease-in-out infinite alternate',
          }}
        />

        {/* FAR layer – faint background mesh */}
        <div
          className="absolute inset-0"
          style={{ animation: 'ccPlexusDriftFar 60s linear infinite alternate' }}
        >
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <g>
              <polyline
                className="cc-plex-line-far"
                points="0,180 180,120 360,200 540,130 720,210 900,150 1080,210 1260,140 1440,210 1600,160"
              />
              <polyline
                className="cc-plex-line-far"
                points="0,260 200,230 380,290 560,240 740,310 920,250 1100,320 1280,270 1480,320 1600,280"
              />
              <polyline
                className="cc-plex-line-far"
                points="0,340 190,330 380,360 570,340 760,380 950,340 1140,390 1330,350 1520,400 1600,380"
              />
              <polyline
                className="cc-plex-line-far"
                points="0,520 200,500 380,540 560,510 740,560 920,520 1100,570 1280,530 1480,580 1600,560"
              />
              <polyline
                className="cc-plex-line-far"
                points="0,620 200,610 390,640 580,620 770,660 960,620 1150,670 1340,640 1520,690 1600,670"
              />
            </g>
          </svg>
        </div>

        {/* MID layer – main plexus web like your GIF */}
        <div
          className="absolute inset-0"
          style={{ animation: 'ccPlexusDriftMid 50s ease-in-out infinite alternate' }}
        >
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <g>
              {/* Central dense cluster */}
              <polyline
                className="cc-plex-line-mid"
                points="600,380 720,320 840,360 960,310 1080,360 960,420 840,400 720,440 600,380"
              />
              <polyline
                className="cc-plex-line-mid"
                points="720,320 780,250 900,260 960,310 1020,260 1140,300 1080,360"
              />
              <polyline
                className="cc-plex-line-mid"
                points="720,440 780,500 900,520 1020,480 1080,430 1140,480 1080,540 960,560 840,540 720,500 660,450 600,380"
              />
              <polyline
                className="cc-plex-line-mid"
                points="540,330 600,380 540,430 460,460 380,430 340,360 420,320 540,330"
              />
              <polyline
                className="cc-plex-line-mid"
                points="1080,360 1200,330 1300,360 1360,420 1300,480 1200,510 1140,480 1080,430"
              />

              {/* Additional crossing webs to fill screen */}
              <polyline
                className="cc-plex-line-mid"
                points="160,260 260,220 360,260 460,220 560,260 660,220 760,260 860,230 960,260"
              />
              <polyline
                className="cc-plex-line-mid"
                points="260,220 300,160 420,150 520,170 560,220"
              />
              <polyline
                className="cc-plex-line-mid"
                points="220,480 340,450 460,480 580,460 700,500 820,470 940,510 1060,480 1180,520"
              />
              <polyline
                className="cc-plex-line-mid"
                points="300,640 420,610 540,650 660,620 780,660 900,630 1020,670 1140,640 1260,680 1380,650"
              />
            </g>

            {/* Nodes in mid layer */}
            <g>
              {/* Central cluster nodes */}
              <circle className="cc-plex-node" cx="720" cy="320" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="840" cy="360" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="960" cy="310" r="2.6" />
              <circle className="cc-plex-node" cx="1080" cy="360" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="960" cy="420" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="840" cy="400" r="2.6" />
              <circle className="cc-plex-node" cx="720" cy="440" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="780" cy="500" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="900" cy="520" r="2.6" />
              <circle className="cc-plex-node" cx="1020" cy="480" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="1080" cy="430" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1140" cy="480" r="2.6" />
              <circle className="cc-plex-node" cx="600" cy="380" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="540" cy="330" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="460" cy="460" r="2.6" />
              <circle className="cc-plex-node" cx="340" cy="360" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-b" cx="1200" cy="330" r="2.6" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1300" cy="360" r="2.6" />
              <circle className="cc-plex-node" cx="1360" cy="420" r="2.6" />

              {/* Spread-out nodes to match GIF density */}
              <circle className="cc-plex-node" cx="260" cy="220" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="360" cy="260" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="460" cy="220" r="2.1" />
              <circle className="cc-plex-node" cx="560" cy="260" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="660" cy="220" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="760" cy="260" r="2.1" />
              <circle className="cc-plex-node" cx="860" cy="230" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="220" cy="480" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="340" cy="450" r="2.1" />
              <circle className="cc-plex-node" cx="460" cy="480" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="580" cy="460" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="700" cy="500" r="2.1" />
              <circle className="cc-plex-node" cx="820" cy="470" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="940" cy="510" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1060" cy="480" r="2.1" />
              <circle className="cc-plex-node" cx="1180" cy="520" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="300" cy="640" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="420" cy="610" r="2.1" />
              <circle className="cc-plex-node" cx="540" cy="650" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="660" cy="620" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="780" cy="660" r="2.1" />
              <circle className="cc-plex-node" cx="900" cy="630" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-b" cx="1020" cy="670" r="2.1" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1140" cy="640" r="2.1" />
              <circle className="cc-plex-node" cx="1260" cy="680" r="2.1" />
            </g>
          </svg>
        </div>

        {/* NEAR layer – a few sharper lines in front to sell the depth */}
        <div
          className="absolute inset-0"
          style={{ animation: 'ccPlexusDriftNear 55s ease-in-out infinite alternate' }}
        >
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <g>
              <polyline
                className="cc-plex-line-near"
                points="200,520 380,580 560,540 740,590 920,560 1100,600 1280,570 1460,620"
              />
              <polyline
                className="cc-plex-line-near"
                points="260,420 420,460 580,420 740,450 900,430 1060,460 1220,440 1380,470"
              />
              <polyline
                className="cc-plex-line-near"
                points="300,300 480,340 660,310 840,340 1020,320 1200,350 1380,330"
              />
            </g>

            <g>
              <circle className="cc-plex-node" cx="260" cy="420" r="2.8" />
              <circle className="cc-plex-node cc-plex-node-b" cx="420" cy="460" r="2.8" />
              <circle className="cc-plex-node cc-plex-node-c" cx="580" cy="420" r="2.8" />
              <circle className="cc-plex-node" cx="740" cy="450" r="2.8" />
              <circle className="cc-plex-node cc-plex-node-b" cx="900" cy="430" r="2.8" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1060" cy="460" r="2.8" />
              <circle className="cc-plex-node" cx="1220" cy="440" r="2.8" />

              <circle className="cc-plex-node cc-plex-node-b" cx="200" cy="520" r="3" />
              <circle className="cc-plex-node cc-plex-node-c" cx="380" cy="580" r="3" />
              <circle className="cc-plex-node" cx="560" cy="540" r="3" />
              <circle className="cc-plex-node cc-plex-node-b" cx="740" cy="590" r="3" />
              <circle className="cc-plex-node cc-plex-node-c" cx="920" cy="560" r="3" />
              <circle className="cc-plex-node" cx="1100" cy="600" r="3" />
              <circle className="cc-plex-node cc-plex-node-b" cx="1280" cy="570" r="3" />
              <circle className="cc-plex-node cc-plex-node-c" cx="1460" cy="620" r="3" />
            </g>
          </svg>
        </div>

        {/* Dark vignette so foreground UI stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 10%, rgba(15,23,42,0.0) 0, rgba(15,23,42,0.2) 40%, rgba(3,7,18,0.95) 100%)',
          }}
        />
      </div>
    </>
  );
}
