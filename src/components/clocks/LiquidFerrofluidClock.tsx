import React, { useEffect, useRef, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';
import { Sparkles, Magnet } from 'lucide-react';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  alpha: number;
}

// 5x7 digit font bitmap representation
const DIGIT_PATTERNS: Record<string, number[][]> = {
  '0': [
    [1, 1, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 1, 1]
  ],
  '1': [
    [0, 1, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1]
  ],
  '2': [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1]
  ],
  '3': [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1]
  ],
  '4': [
    [1, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1]
  ],
  '5': [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1]
  ],
  '6': [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
  ],
  '7': [
    [1, 1, 1],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0]
  ],
  '8': [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
  ],
  '9': [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1]
  ],
  ':': [
    [0],
    [1],
    [0],
    [1],
    [0]
  ]
};

export const LiquidFerrofluidClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    if (timeOverride) {
      setDate(timeOverride);
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      setDate(now);
      if (soundEnabled) {
        playClockSound('water_drop', soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, timeOverride]);

  const activeDate = timeOverride || date;
  const zonedDate = getZonedDate(activeDate, timeZone || config.timeZone);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = config.showSeconds
    ? `${pad(zonedDate.getHours())}:${pad(zonedDate.getMinutes())}:${pad(zonedDate.getSeconds())}`
    : `${pad(zonedDate.getHours())}:${pad(zonedDate.getMinutes())}`;

  // Generate target points for current time string
  const getTargetPoints = (width: number, height: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const charSpacing = isFullSize ? 42 : 28;
    const dotSpacing = isFullSize ? 10 : 7;

    const totalWidth = timeStr.length * charSpacing;
    const startX = (width - totalWidth) / 2;
    const startY = height / 2 - (5 * dotSpacing) / 2;

    let curX = startX;
    for (let charIndex = 0; charIndex < timeStr.length; charIndex++) {
      const char = timeStr[charIndex];
      const pattern = DIGIT_PATTERNS[char] || DIGIT_PATTERNS['0'];
      const charW = pattern[0].length;

      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < charW; c++) {
          if (pattern[r][c] === 1) {
            points.push({
              x: curX + c * dotSpacing,
              y: startY + r * dotSpacing
            });
          }
        }
      }
      curX += char === ':' ? charSpacing * 0.5 : charSpacing;
    }
    return points;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const targetPoints = getTargetPoints(width, height);
    const particleCount = Math.max(targetPoints.length, 250);

    // Initialize particles if needed
    if (particlesRef.current.length === 0 || particlesRef.current.length !== particleCount) {
      const parts: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        const target = targetPoints[i % targetPoints.length] || { x: width / 2, y: height / 2 };
        parts.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          targetX: target.x,
          targetY: target.y,
          size: Math.random() * 3.5 + 2.5,
          color: config.accentColor || '#38bdf8',
          alpha: Math.random() * 0.5 + 0.5
        });
      }
      particlesRef.current = parts;
    } else {
      // Update targets
      particlesRef.current.forEach((p, i) => {
        const target = targetPoints[i % targetPoints.length] || { x: width / 2, y: height / 2 };
        p.targetX = target.x;
        p.targetY = target.y;
      });
    }

    let running = true;
    const render = () => {
      if (!running) return;

      // Dark liquid trails effect with semi-transparent background clearing
      ctx.fillStyle = 'rgba(5, 7, 15, 0.28)';
      ctx.fillRect(0, 0, width, height);

      const mouse = mousePosRef.current;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Magnetic attraction to target point
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const force = dist * 0.05;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;

        // Mouse magnetic repel/attract
        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 100) {
            const mforce = (100 - mdist) * 0.08;
            const mangle = Math.atan2(mdy, mdx);
            p.vx -= Math.cos(mangle) * mforce;
            p.vy -= Math.sin(mangle) * mforce;
          }
        }

        // Fluid friction damping
        p.vx *= 0.84;
        p.vy *= 0.84;

        p.x += p.vx;
        p.y += p.vy;

        // Draw glowing liquid ferrofluid droplet
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = config.accentColor || '#38bdf8';
        ctx.shadowColor = config.accentColor || '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Inner bright droplet core
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [timeStr, config.accentColor, isFullSize]);

  return (
    <div
      id="liquid-ferrofluid-clock"
      className="relative w-full h-full flex flex-col items-center justify-center p-4 select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor || '#030712',
        color: config.textColor || '#f8fafc',
        fontFamily: config.fontFamily || 'monospace'
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mousePosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true
        };
      }}
      onMouseLeave={() => {
        mousePosRef.current.active = false;
      }}
    >
      {/* Canvas Layer */}
      <div className={`relative ${isFullSize ? 'w-full max-w-4xl h-80 sm:h-96' : 'w-full h-64 sm:h-72'} rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950/60`}>
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Ambient Top Glow */}
        <div
          className="absolute top-0 left-1/4 right-1/4 h-24 blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: config.accentColor || '#38bdf8' }}
        />

        {/* Floating Controls Overlay */}
        <div className="absolute top-3 left-4 flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <Magnet className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
          <span>MAGNETIC FERROFLUID</span>
        </div>

        <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-500">
          HOVER MOUSE TO INTERACT WITH FLUID FIELD
        </div>
      </div>
    </div>
  );
};
