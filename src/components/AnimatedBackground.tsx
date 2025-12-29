// src/components/AnimatedBackground.tsx
import React, { useEffect, useRef } from 'react';

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let running = true;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // --- Network + blob data structures ---

    const nodeCount = 80;
    const maxSpeed = 0.05; // px per ms
    const linkDistance = 180;

    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
    };

    type Blob = {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      baseAlpha: number;
    };

    const nodes: Node[] = [];
    const blobs: Blob[] = [];
    const { innerWidth, innerHeight } = window;

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * maxSpeed,
        vy: (Math.random() - 0.5) * maxSpeed,
      });
    }

    // A few large glowing blobs in background
    const blobCount = 7;
    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        radius: 220 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01,
        baseAlpha: 0.15 + Math.random() * 0.25,
      });
    }

    let lastTime = performance.now();

    const drawBackground = (width: number, height: number) => {
      // Deep teal / navy gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#020410');
      gradient.addColorStop(0.4, '#02081c');
      gradient.addColorStop(1, '#010612');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const drawBlobs = (width: number, height: number, time: number) => {
      for (const blob of blobs) {
        // Soft drifting
        blob.x += blob.vx * (time / 16);
        blob.y += blob.vy * (time / 16);

        // Wrap around edges
        if (blob.x < -blob.radius) blob.x = width + blob.radius;
        if (blob.x > width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = height + blob.radius;
        if (blob.y > height + blob.radius) blob.y = -blob.radius;

        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );

        // Teal / aqua glow similar to the gif
        gradient.addColorStop(0, `rgba(45, 255, 210, ${blob.baseAlpha + 0.1})`);
        gradient.addColorStop(0.5, `rgba(45, 255, 210, ${blob.baseAlpha})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(blob.x - blob.radius, blob.y - blob.radius, blob.radius * 2, blob.radius * 2);
      }
    };

    const drawNetwork = (width: number, height: number, dt: number) => {
      // Move nodes
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;

        // Soft wrap to keep motion smooth
        if (n.x < -50) n.x = width + 50;
        if (n.x > width + 50) n.x = -50;
        if (n.y < -50) n.y = height + 50;
        if (n.y > height + 50) n.y = -50;
      }

      // Draw connections
      ctx.lineWidth = 0.6;
      ctx.shadowBlur = 0;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const t = 1 - dist / linkDistance; // 0..1
            const alpha = 0.04 + t * 0.16;
            ctx.strokeStyle = `rgba(76, 255, 214, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw glowing nodes
      ctx.shadowColor = 'rgba(120, 255, 230, 0.9)';
      ctx.shadowBlur = 8;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(158, 255, 245, 0.95)';
        ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const drawVignette = (width: number, height: number) => {
      const vignette = ctx.createRadialGradient(
        width / 2,
        height * 0.25,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.4, 'rgba(0,0,0,0.2)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    const render = (time: number) => {
      if (!running) return;
      const now = time;
      const dt = now - lastTime;
      lastTime = now;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Base gradient
      drawBackground(width, height);

      // Soft teal blobs (bokeh)
      drawBlobs(width, height, dt);

      // Network
      drawNetwork(width, height, dt);

      // Vignette for readability
      drawVignette(width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
};

export default AnimatedBackground;
export { AnimatedBackground };
