// Local design engine: deterministic fallback when Gemini is rate-limited,
// depleted, or offline. Keyword matching is intentionally Dutch + English.

export interface FallbackClockConfig {
  name: string;
  description: string;
  style: string;
  bgColor: string;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  fontFamily: string;
  showSeconds: boolean;
  glowEffect: boolean;
  particleEffect: string;
  discStyle: string;
  handStyle: string;
  soundType: string;
  customText: string;
}

interface PartialConfig {
  bgColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  textColor?: string;
  style?: string;
  particleEffect?: string;
  discStyle?: string;
  handStyle?: string;
  soundType?: string;
  fontFamily?: string;
  glowEffect?: boolean;
  showSeconds?: boolean;
  customText?: string;
}

export function generateFallbackClockConfig(prompt: string, currentConfig?: unknown): FallbackClockConfig {
  const p = prompt.toLowerCase();
  const cur = (currentConfig ?? {}) as PartialConfig;

  let bgColor = cur.bgColor || '#0f172a';
  let accentColor = cur.accentColor || '#38bdf8';
  let secondaryColor = cur.secondaryColor || '#f43f5e';
  let textColor = cur.textColor || '#f8fafc';
  let style = cur.style || 'cyberpunk';
  let particleEffect = cur.particleEffect || 'stars';
  let discStyle = cur.discStyle || 'neon_rings';
  let handStyle = cur.handStyle || 'laser_beam';
  let soundType = cur.soundType || 'soft_tick';
  let fontFamily = cur.fontFamily || 'monospace';
  let glowEffect = cur.glowEffect ?? true;
  const showSeconds = cur.showSeconds ?? true;
  let customText = cur.customText || 'CUSTOM CLOCK';

  if (p.includes('oceaan') || p.includes('water') || p.includes('blauw') || p.includes('zee') || p.includes('bubbel')) {
    bgColor = '#0369a1';
    accentColor = '#38bdf8';
    secondaryColor = '#0284c7';
    textColor = '#e0f2fe';
    style = 'nature';
    particleEffect = 'bubbles';
    soundType = 'water_drop';
    discStyle = 'radar';
    customText = 'OCEAN TIME';
  } else if (p.includes('cyber') || p.includes('neon') || p.includes('matrix') || p.includes('future') || p.includes('futuristisch')) {
    bgColor = '#0d0221';
    accentColor = '#00f6ff';
    secondaryColor = '#ff0055';
    textColor = '#ffffff';
    style = 'cyberpunk';
    particleEffect = p.includes('matrix') ? 'matrix' : 'sparks';
    soundType = 'digital_beep';
    discStyle = 'neon_rings';
    handStyle = 'laser_beam';
    fontFamily = 'monospace';
    customText = 'NEON CYBER';
  } else if (p.includes('goud') || p.includes('steampunk') || p.includes('koper') || p.includes('tandwiel') || p.includes('hout')) {
    bgColor = '#1c1917';
    accentColor = '#f59e0b';
    secondaryColor = '#78350f';
    textColor = '#fef3c7';
    style = 'steampunk';
    particleEffect = 'steam';
    discStyle = 'brass_gears';
    handStyle = 'ornate_brass';
    soundType = 'gear_click';
    fontFamily = 'serif';
    customText = 'CHRONO GEAR';
  } else if (p.includes('ruimte') || p.includes('kosm') || p.includes('ster') || p.includes('galaxy')) {
    bgColor = '#030712';
    accentColor = '#a855f7';
    secondaryColor = '#38bdf8';
    textColor = '#f3e8ff';
    style = 'space';
    particleEffect = 'stars';
    discStyle = 'concentric';
    handStyle = 'glowing_arrow';
    customText = 'COSMIC TIME';
  } else if (p.includes('groen') || p.includes('natuur') || p.includes('vuurvlieg') || p.includes('bos')) {
    bgColor = '#052e16';
    accentColor = '#22c55e';
    secondaryColor = '#15803d';
    textColor = '#dcfce7';
    style = 'nature';
    particleEffect = 'fireflies';
    discStyle = 'clean';
    customText = 'NATURA';
  } else if (p.includes('rood') || p.includes('vuur') || p.includes('lava') || p.includes('vlam')) {
    bgColor = '#450a0a';
    accentColor = '#ef4444';
    secondaryColor = '#f97316';
    textColor = '#fef2f2';
    style = 'neon';
    particleEffect = 'sparks';
    customText = 'MAGMA CHRONO';
  } else if (p.includes('paars') || p.includes('magisch') || p.includes('geheim')) {
    bgColor = '#3b0764';
    accentColor = '#c084fc';
    secondaryColor = '#f43f5e';
    textColor = '#faf5ff';
    style = 'art_deco';
    particleEffect = 'stars';
    customText = 'MAGIC CLOCK';
  } else if (p.includes('zen') || p.includes('japan') || p.includes('minimal') || p.includes('wit')) {
    bgColor = '#f8fafc';
    accentColor = '#0f172a';
    secondaryColor = '#64748b';
    textColor = '#0f172a';
    style = 'minimal';
    particleEffect = 'sakura';
    discStyle = 'clean';
    handStyle = 'needle';
    fontFamily = 'sans-serif';
    glowEffect = false;
    customText = 'ZEN CHRONO';
  }

  const cleanWords = prompt.trim().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  const name = cleanWords ? cleanWords.charAt(0).toUpperCase() + cleanWords.slice(1) + ' Klok' : 'Aangepaste AI Klok';
  const description = `Uniek op maat gemaakt klokontwerp gebaseerd op "${prompt}".`;

  return {
    name,
    description,
    style,
    bgColor,
    accentColor,
    secondaryColor,
    textColor,
    fontFamily,
    showSeconds,
    glowEffect,
    particleEffect,
    discStyle,
    handStyle,
    soundType,
    customText
  };
}
