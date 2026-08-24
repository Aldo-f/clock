import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { rateLimit } from 'express-rate-limit';

import { ClockConfig } from './src/types';
import { injectLocalizedTitle } from './server/titleLocalization';
import { generateFallbackClockConfig } from './server/fallbackGenerator';
import { sanitizeClockConfig, sanitizeCommunityClockInput } from './server/clockValidation';
import { CommunityClockStore } from './server/communityStore';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
// House convention is port 3000; the env override exists for local verification
// and container flexibility only (default unchanged).
const PORT = Number(process.env.PORT) || 3000;

const store = new CommunityClockStore();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

// Each call costs Gemini quota — keep the burn rate bounded.
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Te veel generatieverzoeken. Probeer het later opnieuw.' }
});

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

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// API: Generate Custom Clock via Gemini AI
app.post('/api/generate-clock', generateLimiter, async (req, res) => {
  const { prompt, currentConfig } = req.body ?? {};

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
    const raw = JSON.parse(resultText);

    // Never trust model output blindly: coerce every field to the shared contract.
    const clockConfig: ClockConfig & { name: string; description: string } = {
      ...sanitizeClockConfig(raw),
      name: trimmed(raw?.name, 80) || 'Aangepaste AI Klok',
      description: trimmed(raw?.description, 200) || 'Aangepast klokontwerp.'
    };

    return res.json({
      success: true,
      clockConfig
    });
  } catch (error: unknown) {
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
app.get('/api/community-clocks', apiLimiter, (req, res) => {
  res.json({ clocks: store.list() });
});

// API: Share / Publish a new clock to community
app.post('/api/community-clocks', apiLimiter, (req, res) => {
  const input = sanitizeCommunityClockInput(req.body);
  if (!input) {
    return res.status(400).json({ error: 'Naam en klokinstellingen zijn verplicht.' });
  }

  const newClock = store.add({
    name: input.name,
    description: input.description || 'Aangepast klokontwerp gemaakt door gebruiker.',
    author: input.author || 'Anonieme Klokkenmaker',
    category: input.category || 'Custom AI',
    config: input.config
  });

  res.json({ success: true, clock: newClock });
});

// API: Like / Upvote a community clock
app.post('/api/community-clocks/:id/like', apiLimiter, (req, res) => {
  const likes = store.like(req.params.id);
  if (likes !== null) {
    return res.json({ success: true, likes });
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

startServer();
