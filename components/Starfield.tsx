'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
}

/**
 * Lightweight 2D canvas starfield backdrop for the hero. Deliberately not
 * Three.js — a few hundred drifting dots doesn't need a WebGL context, and
 * keeping it off the GPU budget the globe already uses keeps the hero smooth
 * on lower-end hardware. Collapses to a static frame under reduced motion.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: Star[] = [];
    let animationFrame: number;
    let width = 0;
    let height = 0;

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = canvasEl.offsetWidth;
      height = canvasEl.offsetHeight;
      canvasEl.width = width * window.devicePixelRatio;
      canvasEl.height = height * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);

      const count = Math.floor((width * height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.2,
        speed: Math.random() * 0.15 + 0.02,
        opacity: Math.random() * 0.6 + 0.2,
      }));
    }

    function drawFrame(animate: boolean) {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = '#22d3ee';
      for (const star of stars) {
        ctx!.globalAlpha = star.opacity;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx!.fill();
        if (animate) {
          star.y += star.speed;
          if (star.y > height) star.y = 0;
        }
      }
      ctx!.globalAlpha = 1;
      if (animate) {
        animationFrame = requestAnimationFrame(() => drawFrame(true));
      }
    }

    resize();
    drawFrame(!reduceMotion); // reduced motion: draw exactly one static frame, no rAF loop
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
