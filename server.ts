import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { rateLimit } from 'express-rate-limit';

import { ClockConfig, ClockItem } from './src/types';
import { injectLocalizedTitle } from './server/titleLocalization';
import { sanitizeClockConfig, sanitizeCommunityClockInput } from './server/clockValidation';
import { CommunityClockStore } from './server/communityStore';
import { AuthStore, User } from './server/authStore';
import { AIProviderStore } from './server/aiProviderStore';
import { AIWaterfallEngine } from './server/aiWaterfallEngine';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
const PORT = Number(process.env.PORT) || 3000;

// Stores & Engines
const clockStore = new CommunityClockStore();
const authStore = new AuthStore();
const aiProviderStore = new AIProviderStore();
const aiWaterfallEngine = new AIWaterfallEngine(aiProviderStore);

// Extend Express Request type
interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
function extractUserFromReq(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return authStore.verifyToken(token);
  }
  return null;
}

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const user = extractUserFromReq(req);
  if (user) {
    req.user = user;
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = extractUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Niet geautoriseerd. Log in om door te gaan.' });
  }
  req.user = user;
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const user = extractUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Niet geautoriseerd. Log in als beheerder.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Toegang geweigerd. Alleen beheerders hebben toegang.' });
  }
  req.user = user;
  next();
}

app.use(authenticate);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

// Generation rate limiter (15 requests per 5 mins per IP)
const generateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Te veel generatieverzoeken. Probeer het later opnieuw.' }
});

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------

app.post('/api/auth/register', apiLimiter, (req, res) => {
  const { username, password, email } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' });
  }

  const result = authStore.register(username, password, email);
  if (result.error || !result.user) {
    return res.status(400).json({ error: result.error || 'Registratie mislukt.' });
  }

  const token = authStore.generateToken(result.user);
  res.json({ success: true, user: result.user, token });
});

app.post('/api/auth/login', apiLimiter, (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Vul een gebruikersnaam en wachtwoord in.' });
  }

  const result = authStore.login(username, password);
  if (result.error || !result.user || !result.token) {
    return res.status(401).json({ error: result.error || 'Inloggen mislukt.' });
  }

  res.json({ success: true, user: result.user, token: result.token });
});

app.get('/api/auth/me', (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Niet ingelogd.' });
  }
  res.json({ user: req.user });
});

// -------------------------------------------------------------
// CLOCK CUSTOMIZATION & AI GENERATION (WATERFALL ENGINE)
// -------------------------------------------------------------

app.post('/api/generate-clock', generateLimiter, async (req, res) => {
  const { prompt, currentConfig } = req.body ?? {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is vereist.' });
  }

  try {
    const result = await aiWaterfallEngine.generateClock(prompt, currentConfig);
    return res.json({
      success: true,
      clockConfig: result.clockConfig,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      isFallback: result.isFallback,
      waterfallStep: result.waterfallStep
    });
  } catch (error: unknown) {
    console.error('Waterfall generation error:', error);
    const msg =
      error instanceof Error ? error.message : 'Er is een fout opgetreden bij het ontwerpen van de klok.';
    return res.status(500).json({
      error: msg
    });
  }
});

// -------------------------------------------------------------
// PUBLIC & COMMUNITY CLOCK ROUTES
// -------------------------------------------------------------

app.get('/api/community-clocks', apiLimiter, (req, res) => {
  res.json({ clocks: clockStore.list() });
});

app.post('/api/community-clocks', apiLimiter, (req: AuthRequest, res) => {
  const input = sanitizeCommunityClockInput(req.body);
  if (!input) {
    return res.status(400).json({ error: 'Naam en klokinstellingen zijn verplicht.' });
  }

  const authorName = req.user ? req.user.username : (input.author || 'Anonieme Klokkenmaker');
  const newClock = clockStore.add({
    name: input.name,
    description: input.description || 'Aangepast klokontwerp gemaakt door gebruiker.',
    author: authorName,
    category: input.category || 'Custom AI',
    config: input.config
  });

  res.json({ success: true, clock: newClock });
});

app.post('/api/community-clocks/:id/like', apiLimiter, (req, res) => {
  const likes = clockStore.like(req.params.id);
  if (likes !== null) {
    return res.json({ success: true, likes });
  }
  res.status(404).json({ error: 'Klok niet gevonden.' });
});

// -------------------------------------------------------------
// ADMIN ROUTES: USER MANAGEMENT
// -------------------------------------------------------------

app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json({ users: authStore.listUsers() });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, password, email, role } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' });
  }

  const result = authStore.register(username, password, email, role === 'admin' ? 'admin' : 'user');
  if (result.error || !result.user) {
    return res.status(400).json({ error: result.error || 'Aanmaken mislukt.' });
  }

  res.json({ success: true, user: result.user });
});

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { role, isActive, email, password } = req.body ?? {};
  const updated = authStore.updateUser(req.params.id, { role, isActive, email, password });
  if (!updated) {
    return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
  }
  res.json({ success: true, user: updated });
});

app.delete('/api/admin/users/:id', requireAdmin, (req: AuthRequest, res) => {
  if (req.user && req.user.id === req.params.id) {
    return res.status(400).json({ error: 'Je kunt je eigen admin-account niet verwijderen.' });
  }
  const ok = authStore.deleteUser(req.params.id);
  if (!ok) {
    return res.status(400).json({ error: 'Gebruiker kon niet worden verwijderd (laatste admin?).' });
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// ADMIN ROUTES: AI PROVIDERS & WATERFALL CONFIGURATION
// -------------------------------------------------------------

app.get('/api/admin/ai-config', requireAdmin, (req, res) => {
  res.json(aiProviderStore.getConfig(true));
});

app.post('/api/admin/ai-providers', requireAdmin, (req, res) => {
  const { name, type, baseUrl, apiKey, customHeaders, isEnabled, availableModels } = req.body ?? {};
  if (!name || !type) {
    return res.status(400).json({ error: 'Naam en type provider zijn verplicht.' });
  }

  const provider = aiProviderStore.saveProvider({
    name,
    type,
    baseUrl,
    apiKey,
    customHeaders,
    isEnabled: isEnabled ?? true,
    availableModels: Array.isArray(availableModels) ? availableModels : []
  });

  res.json({ success: true, provider });
});

app.put('/api/admin/ai-providers/:id', requireAdmin, (req, res) => {
  const { name, type, baseUrl, apiKey, customHeaders, isEnabled, availableModels } = req.body ?? {};
  const provider = aiProviderStore.saveProvider({
    id: req.params.id,
    name,
    type,
    baseUrl,
    apiKey,
    customHeaders,
    isEnabled: isEnabled ?? true,
    availableModels: Array.isArray(availableModels) ? availableModels : []
  });

  res.json({ success: true, provider });
});

app.delete('/api/admin/ai-providers/:id', requireAdmin, (req, res) => {
  const ok = aiProviderStore.deleteProvider(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Provider niet gevonden.' });
  }
  res.json({ success: true });
});

app.post('/api/admin/ai-providers/:id/fetch-models', requireAdmin, async (req, res) => {
  const rawConfig = aiProviderStore.getRawConfig();
  const provider = rawConfig.providers.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider niet gevonden.' });
  }

  try {
    const models = await aiWaterfallEngine.fetchProviderModels(provider);
    // Update provider with fetched models
    provider.availableModels = models;
    aiProviderStore.saveProvider(provider);
    res.json({ success: true, models });
  } catch (err: any) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Kon modellen niet ophalen van provider.'
    });
  }
});

app.post('/api/admin/ai-providers/fetch-all-models', requireAdmin, async (req, res) => {
  const rawConfig = aiProviderStore.getRawConfig();
  const results: Record<string, { success: boolean; modelsCount: number; error?: string }> = {};

  for (const provider of rawConfig.providers) {
    if (!provider.isEnabled) continue;
    try {
      const models = await aiWaterfallEngine.fetchProviderModels(provider);
      provider.availableModels = models;
      aiProviderStore.saveProvider(provider);
      results[provider.id] = { success: true, modelsCount: models.length };
    } catch (err: any) {
      results[provider.id] = {
        success: false,
        modelsCount: 0,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  res.json({
    success: true,
    results,
    config: aiProviderStore.getConfig(true)
  });
});

app.post('/api/admin/ai-waterfall/simulate', requireAdmin, async (req, res) => {
  const { prompt, currentConfig } = req.body ?? {};
  const testPrompt = prompt && typeof prompt === 'string' ? prompt : 'Maak een futuristische neon cyberpunk klok';

  try {
    const result = await aiWaterfallEngine.simulateWaterfall(testPrompt, currentConfig);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Simulatiefout.'
    });
  }
});

app.post('/api/admin/ai-providers/test', requireAdmin, async (req, res) => {
  const { providerId, modelName, prompt } = req.body ?? {};
  if (!providerId || !modelName) {
    return res.status(400).json({ error: 'Provider ID en modelnaam zijn verplicht.' });
  }

  const result = await aiWaterfallEngine.testProvider(providerId, modelName, prompt);
  res.json(result);
});

app.put('/api/admin/ai-waterfall', requireAdmin, (req, res) => {
  const { waterfall, fallbackToLocalOnFailure } = req.body ?? {};
  if (!Array.isArray(waterfall)) {
    return res.status(400).json({ error: 'Waterfall stappenarray is verplicht.' });
  }

  const updatedConfig = aiProviderStore.updateWaterfall(waterfall, fallbackToLocalOnFailure);
  res.json({ success: true, config: updatedConfig });
});

app.get('/api/admin/generation-logs', requireAdmin, (req, res) => {
  res.json({ logs: aiProviderStore.getLogs() });
});

// -------------------------------------------------------------
// ADMIN ROUTES: CLOCK MANAGEMENT (UPDATE ALL CLOCKS)
// -------------------------------------------------------------

app.get('/api/admin/clocks', requireAdmin, (req, res) => {
  res.json({ clocks: clockStore.list() });
});

app.post('/api/admin/clocks', requireAdmin, (req: AuthRequest, res) => {
  const { name, description, author, category, type, config, isBuiltIn, likes } = req.body ?? {};
  if (!name || !config) {
    return res.status(400).json({ error: 'Naam en klokinstellingen zijn verplicht.' });
  }

  const newClock = clockStore.add({
    name,
    description: description || '',
    author: author || (req.user?.username ?? 'Admin'),
    category: category || 'Custom AI',
    type: type || 'custom_ai',
    config: sanitizeClockConfig(config),
    isBuiltIn: Boolean(isBuiltIn),
    likes: typeof likes === 'number' ? likes : 1
  });

  res.json({ success: true, clock: newClock });
});

app.put('/api/admin/clocks/:id', requireAdmin, (req, res) => {
  const { name, description, author, category, type, config, isBuiltIn, likes } = req.body ?? {};
  const sanitizedConfig = config ? sanitizeClockConfig(config) : undefined;

  const updated = clockStore.update(req.params.id, {
    name,
    description,
    author,
    category,
    type,
    config: sanitizedConfig,
    isBuiltIn,
    likes
  });

  if (!updated) {
    return res.status(404).json({ error: 'Klok niet gevonden.' });
  }

  res.json({ success: true, clock: updated });
});

app.delete('/api/admin/clocks/:id', requireAdmin, (req, res) => {
  const ok = clockStore.delete(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Klok niet gevonden.' });
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// STATIC / VITE SERVER ENTRY POINT
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

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
