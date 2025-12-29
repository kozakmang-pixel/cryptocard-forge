// src/components/AnimatedBackground.tsx
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <>
      {/* Local keyframes for the glowing blobs */}
      <style>
        {`
          @keyframes cc-orbit-1 {
            0%   { transform: translate3d(-10%, -10%, 0) scale(1); }
            33%  { transform: translate3d(10%, -5%, 0)  scale(1.1); }
            66%  { transform: translate3d(5%, 10%, 0)   scale(0.95); }
            100% { transform: translate3d(-10%, -10%, 0) scale(1); }
          }

          @keyframes cc-orbit-2 {
            0%   { transform: translate3d(10%, 20%, 0) scale(1); }
            33%  { transform: translate3d(-5%, 0%, 0)  scale(1.1); }
            66%  { transform: translate3d(-15%, -15%, 0) scale(0.9); }
            100% { transform: translate3d(10%, 20%, 0) scale(1); }
          }

          @keyframes cc-orbit-3 {
            0%   { transform: translate3d(0%, 10%, 0) scale(1); }
            50%  { transform: translate3d(5%, -10%, 0) scale(1.08); }
            100% { transform: translate3d(0%, 10%, 0) scale(1); }
          }

          .cc-orbit-1 {
            animation: cc-orbit-1 24s ease-in-out infinite alternate;
          }

          .cc-orbit-2 {
            animation: cc-orbit-2 32s ease-in-out infinite alternate;
          }

          .cc-orbit-3 {
            animation: cc-orbit-3 28s ease-in-out infinite alternate;
          }
        `}
      </style>

      <div
        className="
          pointer-events-none
          fixed inset-0
          z-0
          overflow-hidden
          bg-[#020015]
        "
      >
        {/* Base gradient wash */}
        <div
          className="absolute inset-[-25%] opacity-80"
          style={{
            background:
              'radial-gradient(circle at 0% 0%, rgba(153,69,255,0.55) 0, transparent 55%),' +
              'radial-gradient(circle at 100% 0%, rgba(20,241,149,0.45) 0, transparent 55%),' +
              'radial-gradient(circle at 50% 100%, rgba(89,255,160,0.45) 0, transparent 60%)',
          }}
        />

        {/* Big animated blobs */}
        <div
          className="
            cc-orbit-1
            absolute -left-32 top-[-6rem]
            w-[40rem] h-[40rem]
            rounded-full
            bg-[#9945FF]
            blur-3xl
            opacity-55
            mix-blend-screen
          "
        />
        <div
          className="
            cc-orbit-2
            absolute -right-40 top-[30%]
            w-[38rem] h-[38rem]
            rounded-full
            bg-[#14F195]
            blur-3xl
            opacity-45
            mix-blend-screen
          "
        />
        <div
          className="
            cc-orbit-3
            absolute left-1/3 bottom-[-10rem]
            w-[42rem] h-[42rem]
            rounded-full
            bg-[#59FFA0]
            blur-3xl
            opacity-40
            mix-blend-screen
          "
        />

        {/* Soft grid to make it feel “on-chain” */}
        <div className="absolute inset-0 opacity-[0.16] mix-blend-screen">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.09) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(255,255,255,0.09) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Vignette so content stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 20%, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.85) 100%)',
          }}
        />
      </div>
    </>
  );
};

export default AnimatedBackground;
export { AnimatedBackground };
