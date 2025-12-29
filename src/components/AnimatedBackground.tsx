// src/components/AnimatedBackground.tsx
import { useEffect, useRef } from 'react';

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const NODE_COUNT = 70;
const MAX_SPEED = 0.25;
const CONNECT_DISTANCE = 220; // px

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener('resize', resize);

    // Seed nodes
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * MAX_SPEED,
        vy: (Math.random() - 0.5) * MAX_SPEED,
      });
    }

    const maxDistSq = CONNECT_DISTANCE * CONNECT_DISTANCE;

    const drawFrame = () => {
      // Soft gradient background similar to your reference GIF
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.3,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      grad.addColorStop(0, 'rgba(45, 212, 191, 0.12)');
      grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.10)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 1.0)'); // slate-950 base

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Update positions with gentle drift
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) {
          n.x = 0;
          n.vx *= -1;
        } else if (n.x > width) {
          n.x = width;
          n.vx *= -1;
        }

        if (n.y < 0) {
          n.y = 0;
          n.vy *= -1;
        } else if (n.y > height) {
          n.y = height;
          n.vy *= -1;
        }
      }

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= maxDistSq) {
            const t = 1 - distSq / maxDistSq; // 0..1
            const alpha = 0.16 * t;

            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw glowing nodes
      for (const n of nodes) {
        const nodeGrad = ctx.createRadialGradient(
          n.x,
          n.y,
          0,
          n.x,
          n.y,
          10
        );
        nodeGrad.addColorStop(0, 'rgba(45, 212, 191, 0.95)');
        nodeGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        nodeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

        ctx.fillStyle = nodeGrad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(190, 242, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(drawFrame);
    };

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      // One static frame for people who disable animation
      drawFrame();
    } else {
      rafRef.current = window.requestAnimationFrame(drawFrame);
    }

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(45,212,191,0.18), transparent 55%), ' +
          'radial-gradient(circle at 100% 100%, rgba(56,189,248,0.14), transparent 55%), ' +
          '#020617',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full opacity-80" />
    </div>
  );
}
