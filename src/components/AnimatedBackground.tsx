// src/components/AnimatedBackground.tsx
import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let nodes: Node[] = [];
    let lastTime = 0;

    const DPR = window.devicePixelRatio || 1;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * DPR;
      canvas.height = innerHeight * DPR;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const count = Math.floor((innerWidth * innerHeight) / 26000); // ~60 on 1920x1080
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const maxDist = 180;
    const maxDistSq = maxDist * maxDist;

    const draw = (time: number) => {
      const dt = time - lastTime;
      if (dt < 33) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastTime = time;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Soft background
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.3,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      grad.addColorStop(0, 'rgba(34, 197, 235, 0.10)');
      grad.addColorStop(0.35, 'rgba(16, 185, 129, 0.08)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Update + draw network
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.20)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        n.x += n.vx;
        n.y += n.vy;

        if (n.x < -40) n.x = width + 40;
        if (n.x > width + 40) n.x = -40;
        if (n.y < -40) n.y = height + 40;
        if (n.y > height + 40) n.y = -40;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const alpha = 1 - distSq / maxDistSq;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      // Nodes on top
      ctx.globalAlpha = 1;
      for (const n of nodes) {
        const pulse =
          1 + 0.4 * Math.sin((time / 900) + (n.x + n.y) * 0.01);

        const radius = 1.1 * pulse;
        const glowRadius = 3.2 * pulse;

        const radial = ctx.createRadialGradient(
          n.x,
          n.y,
          0,
          n.x,
          n.y,
          glowRadius
        );
        radial.addColorStop(0, 'rgba(125, 211, 252, 0.9)');
        radial.addColorStop(0.4, 'rgba(56, 189, 248, 0.6)');
        radial.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 mix-blend-screen opacity-70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.12),transparent_60%)]" />
    </div>
  );
}
