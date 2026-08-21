import React, { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  type: string; // 'none' | 'matrix' | 'stars' | 'steam' | 'sakura' | 'bubbles' | 'fireflies' | 'sparks'
  accentColor?: string;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ type, accentColor = '#38bdf8' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (type === 'none' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 300);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Particles array initialization based on type
    const particles: any[] = [];
    const count = type === 'stars' ? 50 : type === 'matrix' ? 30 : 25;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: type === 'steam' || type === 'bubbles' ? -Math.random() * 1.5 - 0.5 : (Math.random() - 0.5) * 0.8,
        alpha: Math.random() * 0.8 + 0.2,
        char: type === 'matrix' ? String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)) : ''
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (type === 'matrix') {
        ctx.font = '12px monospace';
        ctx.fillStyle = accentColor;
        particles.forEach((p) => {
          p.y += p.speedY < 0 ? -p.speedY * 2 + 1 : p.speedY + 2;
          if (p.y > height) {
            p.y = 0;
            p.x = Math.random() * width;
          }
          if (Math.random() < 0.05) {
            p.char = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
          }
          ctx.globalAlpha = p.alpha;
          ctx.fillText(p.char, p.x, p.y);
        });
      } else if (type === 'stars' || type === 'fireflies' || type === 'sparks') {
        particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          p.alpha += (Math.random() - 0.5) * 0.04;
          if (p.alpha < 0.1) p.alpha = 0.1;
          if (p.alpha > 0.9) p.alpha = 0.9;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = accentColor;
          ctx.fill();
        });
      } else if (type === 'steam' || type === 'bubbles') {
        particles.forEach((p) => {
          p.y += p.speedY;
          p.x += Math.sin(p.y * 0.05) * 0.5;
          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, type === 'bubbles' ? p.size * 2 : p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = type === 'steam' ? p.alpha * 0.25 : p.alpha * 0.4;
          ctx.fill();
          if (type === 'bubbles') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type, accentColor]);

  if (type === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none rounded-xl w-full h-full"
    />
  );
};
