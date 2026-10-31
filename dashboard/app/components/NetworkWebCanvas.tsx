"use client";

import { useEffect, useRef } from "react";

interface NetworkWebCanvasProps {
  className?: string;
  isBackground?: boolean;
  onCanvasClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  hue: number; // 180 = cyan, 210 = blue, 270 = purple
  pulse: number;
  pulseSpeed: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  color: string;
}

export default function NetworkWebCanvas({
  className = "",
  isBackground = false,
  onCanvasClick
}: NetworkWebCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null; isOver: boolean }>({
    x: null,
    y: null,
    isOver: false
  });
  const shockwavesRef = useRef<Shockwave[]>([]);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Density: roughly 1 node per 9500 pixels (min 45, max 130)
    const nodeCount = isBackground
      ? Math.max(35, Math.min(80, Math.floor((width * height) / 16000)))
      : Math.max(50, Math.min(140, Math.floor((width * height) / 9500)));

    const DIST_MAX = isBackground ? 100 : 130;
    const MOUSE_DIST = 175;

    const particles: Particle[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const hueChoice = Math.random();
      const hue = hueChoice > 0.6 ? 186 : hueChoice > 0.2 ? 210 : 260; // cyan, neon blue, violet
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isBackground ? 0.35 : 0.6),
        vy: (Math.random() - 0.5) * (isBackground ? 0.35 : 0.6),
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.5 + 0.45,
        hue,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX !== undefined && clientY !== undefined) {
        mouseRef.current.x = clientX - rect.left;
        mouseRef.current.y = clientY - rect.top;
        mouseRef.current.isOver = true;
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.isOver = false;
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Add a shockwave ring
      shockwavesRef.current.push({
        x,
        y,
        radius: 5,
        maxRadius: Math.max(width, height) * 0.35,
        alpha: 1,
        speed: 6.5
      });

      // Add burst sparks (OpenFlow signal pulses)
      const sparkColors = ["#00f0ff", "#38bdf8", "#818cf8", "#f59e0b"];
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 2;
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          life: Math.random() * 30 + 35,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)]
        });
      }

      // Nudge nearby particles slightly outward
      for (const p of particles) {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180 * 2.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchstart", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave);
    canvas.addEventListener("click", handlePointerDown);

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep space radial glow behind center and mouse
      if (!isBackground) {
        const ambientGlow = ctx.createRadialGradient(
          width / 2,
          height * 0.45,
          10,
          width / 2,
          height * 0.45,
          width * 0.6
        );
        ambientGlow.addColorStop(0, "rgba(14, 34, 69, 0.45)");
        ambientGlow.addColorStop(0.5, "rgba(7, 18, 38, 0.25)");
        ambientGlow.addColorStop(1, "rgba(2, 6, 15, 0)");
        ctx.fillStyle = ambientGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Draw subtle bottom horizon wave mesh (reminiscent of reference image 1)
      const waveY = height * 0.88;
      const waveCols = 32;
      const colStep = width / waveCols;

      ctx.beginPath();
      for (let c = 0; c <= waveCols; c++) {
        const wx = c * colStep;
        const wy =
          waveY +
          Math.sin(c * 0.35 + time * 1.2) * 16 +
          Math.cos(c * 0.2 - time * 0.9) * 10;
        if (c === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Horizon grid dots
      for (let c = 0; c <= waveCols; c += 2) {
        const wx = c * colStep;
        const wy =
          waveY +
          Math.sin(c * 0.35 + time * 1.2) * 16 +
          Math.cos(c * 0.2 - time * 0.9) * 10;
        ctx.beginPath();
        ctx.arc(wx, wy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
        ctx.fill();
      }

      // Secondary wave layer for 3D depth
      ctx.beginPath();
      for (let c = 0; c <= waveCols; c++) {
        const wx = c * colStep;
        const wy =
          waveY +
          24 +
          Math.sin(c * 0.45 + time * 1.5 + 1.2) * 20;
        if (c === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = "rgba(30, 58, 138, 0.2)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 2. Update and draw particles
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseActive = mouseRef.current.isOver && mx !== null && my !== null;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          // Drag to avoid runaway speed from clicks
          p.vx *= 0.992;
          p.vy *= 0.992;

          // Gentle bounce at boundaries
          if (p.x <= 0) {
            p.x = 0;
            p.vx = Math.abs(p.vx);
          } else if (p.x >= width) {
            p.x = width;
            p.vx = -Math.abs(p.vx);
          }
          if (p.y <= 0) {
            p.y = 0;
            p.vy = Math.abs(p.vy);
          } else if (p.y >= height) {
            p.y = height;
            p.vy = -Math.abs(p.vy);
          }

          p.pulse += p.pulseSpeed;
        }

        // Mouse gentle attraction & distance check
        if (mouseActive) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_DIST) {
            const pull = (1 - d / MOUSE_DIST) * 0.02;
            p.vx += dx * pull;
            p.vy += dy * pull;

            // Connect to mouse with electric cyan/amber line
            const mouseAlpha = (1 - d / MOUSE_DIST) * (isBackground ? 0.4 : 0.75);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(0, 240, 255, ${mouseAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // 3. Pairwise inter-node constellation connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < DIST_MAX) {
            const alpha = (1 - dist / DIST_MAX) * (isBackground ? 0.22 : 0.42);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // 4. Draw particle nodes with luminous glow
      for (const p of particles) {
        const currentAlpha =
          p.baseAlpha * (0.8 + Math.sin(p.pulse) * 0.2) * (isBackground ? 0.6 : 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        // Core dot
        ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, ${currentAlpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${currentAlpha * 0.8})`;
        ctx.shadowBlur = isBackground ? 4 : 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Draw mouse aura if hovering
      if (mouseActive) {
        const aura = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
        aura.addColorStop(0, "rgba(0, 240, 255, 0.25)");
        aura.addColorStop(0.4, "rgba(56, 189, 248, 0.08)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(mx, my, 80, 0, Math.PI * 2);
        ctx.fill();

        // Little center crosshair dot
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Animate shockwaves from user clicks
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += sw.speed;
        sw.alpha = 1 - sw.radius / sw.maxRadius;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha * 0.65})`;
        ctx.lineWidth = Math.max(1, (1 - sw.radius / sw.maxRadius) * 3);
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // 7. Animate sparks (data transmission bursts)
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= 1;
        s.alpha = Math.max(0, s.life / 40);

        if (s.life <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchstart", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      canvas.removeEventListener("click", handlePointerDown);
    };
  }, [isBackground]);

  return (
    <canvas
      ref={canvasRef}
      className={`network-canvas ${className}`}
      onClick={onCanvasClick}
      style={{
        position: isBackground ? "fixed" : "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: isBackground ? "none" : "auto",
        zIndex: isBackground ? 0 : 1
      }}
    />
  );
}
