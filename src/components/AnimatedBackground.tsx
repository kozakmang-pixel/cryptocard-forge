// src/components/AnimatedBackground.tsx
import React, { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

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

    const NODE_COUNT = 90;
    const MAX_LINK_DISTANCE = 180;
    const nodes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      pulseOffset: number;
    }[] = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const draw = (time: number) => {
      const t = time / 1000;

      ctx.clearRect(0, 0, width, height);

      // Background glow
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        0,
        width * 0.5,
        height * 0.6,
        Math.max(width, height)
      );
      grad.addColorStop(0, 'rgba(15, 118, 110, 0.35)');
      grad.addColorStop(0.4, 'rgba(59, 130, 246, 0.12)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Slight hazy bokeh blobs
      for (let i = 0; i < 24; i++) {
        const bx = (Math.sin(t * 0.15 + i) * 0.5 + 0.5) * width;
        const by = (Math.cos(t * 0.12 + i * 1.3) * 0.5 + 0.5) * height;
        const r = 80 + Math.sin(t * 0.7 + i) * 30;

        const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        g2.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
        g2.addColorStop(0.4, 'rgba(56, 189, 248, 0.18)');
        g2.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update node positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -50) node.x = width + 50;
        if (node.x > width + 50) node.x = -50;
        if (node.y < -50) node.y = height + 50;
        if (node.y > height + 50) node.y = -50;
      }

      // Draw links
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_LINK_DISTANCE) continue;

          const alpha = 1 - dist / MAX_LINK_DISTANCE;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const baseRadius = 2.1;
        const pulse = (Math.sin(t * 3 + node.pulseOffset) + 1) * 0.9;
        const r = baseRadius + pulse * 0.9;

        // Outer glow
        const glowRadius = r * 6;
        const g = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          glowRadius
        );
        g.addColorStop(0, 'rgba(45, 212, 191, 0.9)');
        g.addColorStop(0.4, 'rgba(59, 130, 246, 0.6)');
        g.addColorStop(1, 'rgba(15, 23, 42, 0)');

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.fillStyle = 'rgba(240, 253, 250, 0.96)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#020617]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
