// src/components/AnimatedBackground.tsx
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div
      className="
        pointer-events-none
        fixed inset-0 -z-10
        overflow-hidden
        bg-[#020016]
      "
    >
      {/* Base gradient wash */}
      <div
        className="absolute inset-[-20%] opacity-70"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(153,69,255,0.55) 0, transparent 55%),' +
            'radial-gradient(circle at 100% 0%, rgba(20,241,149,0.45) 0, transparent 55%),' +
            'radial-gradient(circle at 50% 100%, rgba(89,255,160,0.45) 0, transparent 60%)',
        }}
      />

      {/* Soft moving blobs – very lightweight */}
      <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#9945FF] blur-3xl opacity-45 motion-safe:animate-pulse" />
      <div className="absolute -right-16 top-1/4 h-64 w-64 rounded-full bg-[#14F195] blur-3xl opacity-40 motion-safe:animate-pulse" />
      <div className="absolute left-1/3 bottom-[-6rem] h-80 w-80 rounded-full bg-[#59FFA0] blur-3xl opacity-35 motion-safe:animate-pulse" />

      {/* Very subtle grid overlay so it feels “on-chain” */}
      <div className="absolute inset-0 opacity-[0.14] mix-blend-screen">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Vignette to keep edges dark and content readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, rgba(0,0,0,0.0) 0, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.8) 100%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
export { AnimatedBackground };
