import React, { useEffect, useRef, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';
import { Activity, Radio, Cpu } from 'lucide-react';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const SoundwaveOscilloscopeClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
        playClockSound('oscilloscope_blip', soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, timeOverride]);

  const activeDate = timeOverride || date;
  const zonedDate = getZonedDate(activeDate, timeZone || config.timeZone);

  const hours = zonedDate.getHours();
  const minutes = zonedDate.getMinutes();
  const seconds = zonedDate.getSeconds();
  const ms = zonedDate.getMilliseconds();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

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

    let phase = 0;
    let running = true;

    const phosphorColor = config.accentColor || '#10b981'; // Phosphor green default

    const render = () => {
      if (!running) return;
      phase += 0.04;

      // Dark CRT phosphor fade persistence
      ctx.fillStyle = 'rgba(2, 6, 12, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // CRT Calibration Grid (5x5 cm oscilloscope graticule)
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;

      const gridSize = isFullSize ? 40 : 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center crosshairs with tick marks
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();

      // Lissajous & Harmonograph Synthesis (frequencies derived from hours, minutes, seconds)
      ctx.save();
      ctx.shadowColor = phosphorColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = phosphorColor;
      ctx.lineWidth = 2;

      const centerX = width / 2;
      const centerY = height / 2;
      const radiusX = width * 0.38;
      const radiusY = height * 0.35;

      // Harmonic frequency ratios
      const freqA = (hours % 12 || 12) * 0.5;
      const freqB = (minutes || 1) * 0.2;
      const deltaPhase = phase + seconds * 0.1;

      ctx.beginPath();
      const samples = 360;
      for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const modulation = Math.sin(t * 8 + phase * 2) * 0.08 + 1;
        const x = centerX + radiusX * Math.sin(freqA * t + deltaPhase) * modulation;
        const y = centerY + radiusY * Math.sin(freqB * t) * modulation;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Electron beam bright spot indicator
      const leadT = phase % (Math.PI * 2);
      const leadX = centerX + radiusX * Math.sin(freqA * leadT + deltaPhase);
      const leadY = centerY + radiusY * Math.sin(freqB * leadT);

      ctx.beginPath();
      ctx.arc(leadX, leadY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [hours, minutes, seconds, config.accentColor, isFullSize]);

  return (
    <div
      id="soundwave-oscilloscope-clock"
      className="relative w-full h-full flex flex-col items-center justify-center p-4 select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor || '#020617',
        color: config.textColor || '#10b981',
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Oscilloscope CRT Chassis */}
      <div className={`relative ${isFullSize ? 'w-full max-w-4xl h-80 sm:h-96' : 'w-full h-64 sm:h-72'} rounded-3xl border-2 border-slate-800 bg-slate-950 p-2 shadow-2xl overflow-hidden`}>
        {/* Curved CRT Bezel */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* CRT Scanline Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 1px, transparent 1px, transparent 2px)'
            }}
          />

          {/* Curved Glass Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-white/5 pointer-events-none rounded-2xl" />

          {/* Top Telemetry Overlay */}
          <div className="absolute top-3 left-4 flex items-center space-x-3 text-xs font-mono text-emerald-400 bg-black/60 px-3 py-1 rounded-lg border border-emerald-500/20 backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span className="font-bold">OSCILLOSCOPE CH-1</span>
            <span className="text-[10px] text-emerald-600">| 10ms / DIV</span>
          </div>

          {/* Big Digital Readout in Phosphor Glow */}
          <div className="absolute bottom-3 left-4 flex flex-col bg-black/70 px-4 py-1.5 rounded-xl border border-emerald-500/30 backdrop-blur-md">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
              {timeStr}
            </span>
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-wider">
              FREQ: {hours}.{minutes} kHz • HARMONIC WAVEFORM
            </span>
          </div>

          {/* Dial Coordinates */}
          <div className="absolute top-3 right-4 text-[10px] font-mono text-emerald-600 text-right bg-black/60 px-2.5 py-1 rounded border border-emerald-500/20">
            <div>X: {(hours * 30).toFixed(0)}°</div>
            <div>Y: {(minutes * 6).toFixed(0)}°</div>
          </div>
        </div>
      </div>
    </div>
  );
};
