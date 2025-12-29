import { useMemo } from 'react';

const NODE_COUNT = 18;

type NodeConfig = {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
};

export function AnimatedBackground() {
  // Generate a stable set of "neurons" per session
  const nodes = useMemo<NodeConfig[]>(() => {
    return Array.from({ length: NODE_COUNT }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 220 + Math.random() * 260,
      duration: 30 + Math.random() * 30,
      delay: Math.random() * 20,
    }));
  }, []);

  return (
    <>
      {/* Local keyframes so we don't touch your global CSS/Tailwind config */}
      <style>{`
        @keyframes ccNeuronFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0.35;
          }
          25% {
            transform: translate3d(40px, -30px, 0) scale(1.1);
            opacity: 0.7;
          }
          50% {
            transform: translate3d(-60px, 20px, 0) scale(1.25);
            opacity: 0.95;
          }
          75% {
            transform: translate3d(30px, 50px, 0) scale(1.05);
            opacity: 0.6;
          }
          100% {
            transform: translate3d(-40px, -40px, 0) scale(0.85);
            opacity: 0.45;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
        {/* Soft global gradient wash */}
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,#22c55e1f,transparent_60%),radial-gradient(circle_at_bottom,#0ea5e91a,transparent_60%),radial-gradient(circle_at_left,#a855f71a,transparent_60%)]" />

        {/* "Neural" blobs wandering around */}
        <div className="absolute inset-[-20%] mix-blend-screen">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute rounded-full blur-3xl"
              style={{
                top: `${node.top}%`,
                left: `${node.left}%`,
                width: node.size,
                height: node.size,
                backgroundImage:
                  'radial-gradient(circle at 30% 10%, #22c55e, transparent 55%), radial-gradient(circle at 75% 80%, #0ea5e9, transparent 60%), radial-gradient(circle at 0% 80%, #a855f7, transparent 60%)',
                animation: `ccNeuronFloat ${node.duration}s ease-in-out ${node.delay}s infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Very subtle mesh overlay so it feels like circuitry */}
        <div className="absolute inset-0 opacity-[0.09] pointer-events-none bg-[radial-gradient(circle_at_0_0,rgba(148,163,184,0.35),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.35),transparent_55%)]" />
      </div>
    </>
  );
}
