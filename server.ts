import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { translations } from './src/i18n/translations';
import { Language } from './src/i18n/types';

dotenv.config();

const app = express();
// House convention is port 3000; the env override exists for local verification
// and container flexibility only (default unchanged).
const PORT = Number(process.env.PORT) || 3000;

// Supported language codes mirror src/i18n (nl is the default/fallback).
const SUPPORTED_LANG_CODES: Language[] = ['nl', 'en', 'de', 'fr', 'es'];

/**
 * Resolves the localized document <title> from a ?lang=/?l= query value.
 * Returns null when absent/unsupported so callers fall back to the static
 * default-language HTML.
 */
function localizedPageTitle(langValue: unknown): string | null {
  if (typeof langValue !== 'string') return null;
  const code = langValue.toLowerCase().trim().slice(0, 2) as Language;
  if (SUPPORTED_LANG_CODES.includes(code)) {
    return translations[code].pageTitle;
  }
  return null;
}

app.use(express.json({ limit: '10mb' }));

// In-memory store for community shared clocks
let communityClocksStore: any[] = [
  {
    id: 'preset-neon-cyber',
    name: 'Cyberpunk neon matrix',
    description: 'Futuristische neon klok met gepatenteerde gloeieffecten en cyber-stijl cijfers.',
    author: 'KlokkenStudio Team',
    category: 'Futuristisch',
    likes: 142,
    createdAt: new Date().toISOString(),
    config: {
      type: 'custom_ai',
      style: 'cyberpunk',
      bgColor: '#0d0221',
      accentColor: '#00f6ff',
      secondaryColor: '#ff0055',
      textColor: '#ffffff',
      fontFamily: 'monospace',
      showSeconds: true,
      glowEffect: true,
      particleEffect: 'matrix',
      discStyle: 'neon_rings',
      handStyle: 'laser_beam',
      soundType: 'digital_beep',
      customText: 'CYBER TıME'
    }
  },
  {
    id: 'preset-zen-minimal',
    name: 'Zen minimalist Japan',
    description: 'Rustgevende en elegante klok met zachte pastelverlopen en serene typografie.',
    author: 'Sora_Design',
    category: 'Minimalistisch',
    likes: 98,
    createdAt: new Date().toISOString(),
    config: {
      type: 'custom_ai',
      style: 'minimal',
      bgColor: '#fbf9f5',
      accentColor: '#d97706',
      secondaryColor: '#94a3b8',
      textColor: '#1e293b',
      fontFamily: 'serif',
      showSeconds: true,
      glowEffect: false,
      particleEffect: 'sakura',
      discStyle: 'clean',
      handStyle: 'needle',
      soundType: 'soft_tick',
      customText: '静けさ - SERENITY'
    }
  },
  {
    id: 'preset-steampunk-gear',
    name: 'Steampunk brass gearing',
    description: 'Klassieke koperen tandwielstijl met stoom-deeltjes en vintage Romeinse cijfers.',
    author: 'ClockworkMaster',
    category: 'Retro & Vintage',
    likes: 215,
    createdAt: new Date().toISOString(),
    config: {
      type: 'custom_ai',
      style: 'steampunk',
      bgColor: '#1c1917',
      accentColor: '#f59e0b',
      secondaryColor: '#78350f',
      textColor: '#fef3c7',
      fontFamily: 'serif',
      showSeconds: true,
      glowEffect: true,
      particleEffect: 'steam',
      discStyle: 'brass_gears',
      handStyle: 'ornate_brass',
      soundType: 'gear_click',
      customText: 'TEMPUS FUGIT'
    }
  }
];

// Helper to initialize Gemini SDK safely on request
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Helper fallback generator when Gemini API is rate-limited, depleted, or offline
function generateFallbackClockConfig(prompt: string, currentConfig?: any) {
  const p = prompt.toLowerCase();

  let bgColor = currentConfig?.bgColor || '#0f172a';
  let accentColor = currentConfig?.accentColor || '#38bdf8';
  let secondaryColor = currentConfig?.secondaryColor || '#f43f5e';
  let textColor = currentConfig?.textColor || '#f8fafc';
  let style = currentConfig?.style || 'cyberpunk';
  let particleEffect = currentConfig?.particleEffect || 'stars';
  let discStyle = currentConfig?.discStyle || 'neon_rings';
  let handStyle = currentConfig?.handStyle || 'laser_beam';
  let soundType = currentConfig?.soundType || 'soft_tick';
  let fontFamily = currentConfig?.fontFamily || 'monospace';
  let glowEffect = currentConfig?.glowEffect ?? true;
  let showSeconds = currentConfig?.showSeconds ?? true;
  let customText = currentConfig?.customText || 'CUSTOM CLOCK';

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

  const cleanWords = prompt.trim().replace(/[^\w\s]/gi, '').split(/\s+/).slice(0, 4).join(' ');
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

// API: Generate Custom Clock via Gemini AI
app.post('/api/generate-clock', async (req, res) => {
  const { prompt, currentConfig } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is vereist.' });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `Je bent een meester klokkenmaker en UI designer voor "KlokkenStudio".
De gebruiker vraagt om een aangepaste of geheel nieuwe klok (bijvoorbeeld: "Maak een gouden steampunk klok", "Een paarse neon cyberpunk klok", "Een zachte aquarium klok met bubbels", "Verander de achtergrond in diepblauw en maak de wijzers felgeel").

Analyseer het verzoek en genereer een JSON object met de gewenste visuele en functionele instellingen voor de klok.

Het JSON object moet de volgende velden bevatten:
- name: Korte pakkende naam voor het klokontwerp (in het Nederlands).
- description: Beschrijving van het ontwerp (1-2 zinnen in het Nederlands).
- style: Eén van ["cyberpunk", "steampunk", "minimal", "neon", "nature", "space", "retro_nixie", "art_deco", "digital_hud", "fluid"]
- bgColor: Hex kleurcode voor achtergrond (bijv. "#0d0221")
- accentColor: Hex kleurcode voor primaire elementen / wijzers (bijv. "#00f6ff")
- secondaryColor: Hex kleurcode voor secundaire details (bijv. "#ff0055")
- textColor: Hex kleurcode voor tekst / nummers (bijv. "#ffffff")
- fontFamily: Eén van ["sans-serif", "serif", "monospace", "cursive"]
- showSeconds: boolean (true/false)
- glowEffect: boolean (true/false)
- particleEffect: Eén van ["none", "matrix", "stars", "steam", "sakura", "bubbles", "fireflies", "sparks"]
- discStyle: Eén van ["clean", "neon_rings", "brass_gears", "radar", "concentric", "minimal_dots"]
- handStyle: Eén van ["needle", "laser_beam", "ornate_brass", "thick_modern", "glowing_arrow", "dot_markers"]
- soundType: Eén van ["none", "soft_tick", "digital_beep", "gear_click", "water_drop", "space_hum"]
- customText: Een korte optionele inscriptie of titel op de klokplaat (bijv. "CHRONOS", "01001", of leeg)
- clockTypeCategory: Eén van ["Roterende Schijven", "Binaire Klok", "Knikkerbaan", "Kleurenpalet", "Woordklok", "Custom AI Design"]`;

    const userMessage = currentConfig
      ? `Huidige instellingen van de klok: ${JSON.stringify(currentConfig)}.
Verzoek van gebruiker voor aanpassing: "${prompt}"`
      : `Verzoek voor een nieuw klokontwerp: "${prompt}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            style: { type: Type.STRING },
            bgColor: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            textColor: { type: Type.STRING },
            fontFamily: { type: Type.STRING },
            showSeconds: { type: Type.BOOLEAN },
            glowEffect: { type: Type.BOOLEAN },
            particleEffect: { type: Type.STRING },
            discStyle: { type: Type.STRING },
            handStyle: { type: Type.STRING },
            soundType: { type: Type.STRING },
            customText: { type: Type.STRING },
            clockTypeCategory: { type: Type.STRING }
          },
          required: [
            'name',
            'description',
            'style',
            'bgColor',
            'accentColor',
            'secondaryColor',
            'textColor',
            'fontFamily',
            'showSeconds',
            'glowEffect',
            'particleEffect',
            'discStyle',
            'handStyle',
            'soundType'
          ]
        }
      }
    });

    const resultText = response.text || '{}';
    const clockConfig = JSON.parse(resultText);

    return res.json({
      success: true,
      clockConfig
    });
  } catch (error: any) {
    console.log('Generating clock design using smart local design engine.');
    const fallbackConfig = generateFallbackClockConfig(prompt, currentConfig);
    return res.json({
      success: true,
      clockConfig: fallbackConfig,
      fallbackNotice: true
    });
  }
});

// API: Get Community Shared Clocks
app.get('/api/community-clocks', (req, res) => {
  res.json({ clocks: communityClocksStore });
});

// API: Share / Publish a new clock to community
app.post('/api/community-clocks', (req, res) => {
  const { name, description, author, category, config } = req.body;
  if (!name || !config) {
    return res.status(400).json({ error: 'Naam en klokinstellingen zijn verplicht.' });
  }

  const newClock = {
    id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    name,
    description: description || 'Aangepast klokontwerp gemaakt door gebruiker.',
    author: author || 'Anonieme Klokkenmaker',
    category: category || 'Custom AI',
    likes: 1,
    createdAt: new Date().toISOString(),
    config
  };

  communityClocksStore.unshift(newClock);
  res.json({ success: true, clock: newClock });
});

// API: Like / Upvote a community clock
app.post('/api/community-clocks/:id/like', (req, res) => {
  const { id } = req.params;
  const clock = communityClocksStore.find((c) => c.id === id);
  if (clock) {
    clock.likes += 1;
    return res.json({ success: true, likes: clock.likes });
  }
  res.status(404).json({ error: 'Klok niet gevonden.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // index:false routes every HTML request through the localized handler
    // below; hashed assets are still served statically.
    app.use(express.static(distPath, { index: false }));

    // Cache the SPA shell so the <title> can be localized per request (US3):
    // ?lang=/?l= with a supported code swaps in the translated title; anything
    // else is served untouched with the static default-language title.
    const indexPath = path.join(distPath, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    app.get('*', (req, res) => {
      let html = indexHtml;
      const langValue =
        req.query.lang !== undefined ? req.query.lang : req.query.l;
      if (Array.isArray(langValue)) {
        const first = langValue.find((v) => typeof v === 'string');
        if (typeof first === 'string') {
          html = injectLocalizedTitle(html, first);
        }
      } else if (typeof langValue === 'string' && langValue !== '') {
        html = injectLocalizedTitle(html, langValue);
      }
      res.send(html);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server gestart op http://localhost:${PORT}`);
  });
}

/**
 * Replaces the <title>…</title> element with the localized variant.
 * Unknown/absent language values leave the HTML unchanged (static nl default).
 */
function injectLocalizedTitle(html: string, langValue: string): string {
  const title = localizedPageTitle(langValue);
  if (!title) return html;
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}

startServer();
