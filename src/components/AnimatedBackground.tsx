// src/components/AnimatedBackground.tsx
import React from 'react';

export function AnimatedBackground() {
  return (
    <>
      {/* Local keyframes so we don't touch Tailwind config */}
      <style>{`
        @keyframes ccBgShift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.9;
          }
          25% {
            transform: translate3d(-4%, -2%, 0) scale(1.03);
            opacity: 1;
          }
          50% {
            transform: translate3d(4%, 2%, 0) scale(1.06);
            opacity: 0.95;
          }
          75% {
            transform: translate3d(-3%, 3%, 0) scale(1.04);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.9;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#020617] overflow-hidden">
        {/* Big animated gradient blob layer – mimics the GIF */}
        <div
          className="absolute inset-[-20%] blur-3xl"
          style={{
            backgroundImage: `
              radial-gradient(circle at 0% 0%, rgba(94, 234, 212, 0.65) 0, transparent 55%),
              radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.55) 0, transparent 55%),
              radial-gradient(circle at 0% 100%, rgba(129, 140, 248, 0.55) 0, transparent 55%),
              radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.50) 0, transparent 55%)
            `,
            animation: 'ccBgShift 26s ease-in-out infinite alternate',
          }}
        />

        {/* Soft vignette so edges stay dark and readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0) 0, rgba(2, 6, 23, 0.9) 60%, rgba(0, 0, 0, 1) 100%)',
          }}
        />
      </div>
    </>
  );
}
