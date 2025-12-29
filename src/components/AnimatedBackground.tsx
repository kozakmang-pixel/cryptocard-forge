// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
      {/* Soft moving gradient blob layer */}
      <div
        className="absolute -inset-[25%] opacity-80"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(45,212,191,0.28), transparent 55%),' +
            'radial-gradient(circle at 100% 0%, rgba(56,189,248,0.28), transparent 55%),' +
            'radial-gradient(circle at 0% 100%, rgba(244,114,182,0.28), transparent 55%),' +
            'radial-gradient(circle at 100% 100%, rgba(129,140,248,0.32), transparent 55%)',
          filter: 'blur(40px)',
          animation: 'spin 40s linear infinite',
          transformOrigin: '50% 50%',
        }}
      />

      {/* Subtle vertical glow stripes, mimicking the gif feel */}
      <div className="absolute inset-0">
        <div
          className="absolute -left-1/3 top-0 h-full w-2/3 opacity-40"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(56,189,248,0.35) 40%, rgba(16,185,129,0.5) 70%, rgba(15,23,42,0) 100%)',
            filter: 'blur(24px)',
            animation: 'pulseSlow 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-1/3 top-0 h-full w-2/3 opacity-35"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(244,114,182,0.45) 35%, rgba(129,140,248,0.45) 75%, rgba(15,23,42,0) 100%)',
            filter: 'blur(28px)',
            animation: 'pulseSlow 16s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Dark overlay to keep foreground readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      {/* Local keyframes for smooth, cheap animations */}
      <style>
        {`
          @keyframes pulseSlow {
            0%, 100% { transform: translateY(0px); opacity: 0.35; }
            50% { transform: translateY(-32px); opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );
}

export default AnimatedBackground;
