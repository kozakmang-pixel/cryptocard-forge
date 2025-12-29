// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <>
      {/* Local keyframes so we don't touch Tailwind config */}
      <style>{`
        @keyframes ccBgDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          25% {
            transform: translate3d(-4%, -3%, 0) scale(1.05);
          }
          50% {
            transform: translate3d(5%, 4%, 0) scale(1.08);
          }
          75% {
            transform: translate3d(-3%, 5%, 0) scale(1.04);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>

      {/* FULL-SCREEN BACKGROUND LAYER */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Base gradient – this should be VERY obvious */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 0% 0%, #22d3ee 0, transparent 55%),' +
              'radial-gradient(circle at 100% 0%, #38bdf8 0, transparent 55%),' +
              'radial-gradient(circle at 0% 100%, #6366f1 0, transparent 55%),' +
              'radial-gradient(circle at 100% 100%, #ec4899 0, transparent 55%),' +
              'linear-gradient(135deg, #020617 0%, #020617 40%, #020617 100%)',
            opacity: 0.85,
          }}
        />

        {/* Animated overlay to mimic the GIF movement */}
        <div
          className="absolute inset-[-20%]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.9) 0, transparent 55%),' +
              'radial-gradient(circle at 80% 10%, rgba(56,189,248,0.8) 0, transparent 55%),' +
              'radial-gradient(circle at 10% 90%, rgba(99,102,241,0.85) 0, transparent 55%),' +
              'radial-gradient(circle at 90% 100%, rgba(236,72,153,0.75) 0, transparent 55%)',
            mixBlendMode: 'screen',
            animation: 'ccBgDrift 30s ease-in-out infinite alternate',
            filter: 'blur(20px)',
          }}
        />

        {/* Soft dark vignette so content stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(15,23,42,0.0) 0, rgba(2,6,23,0.9) 60%, rgba(0,0,0,1) 100%)',
          }}
        />
      </div>
    </>
  );
}
