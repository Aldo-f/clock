import fs from 'fs';
import path from 'path';
import { ClockItem, ClockType } from '../src/types';

interface StoredCommunityClock extends ClockItem {
  likes: number;
  createdAt: string;
}

const STORE_PATH =
  process.env.COMMUNITY_STORE_PATH || path.join(process.cwd(), 'data', 'community-clocks.json');

function seedStore(): StoredCommunityClock[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'preset-neon-cyber',
      name: 'Cyberpunk neon matrix',
      description: 'Futuristische neon klok met gepatenteerde gloeieffecten en cyber-stijl cijfers.',
      author: 'KlokkenStudio Team',
      category: 'Futuristisch',
      likes: 142,
      createdAt: now,
      type: 'custom_ai',
      config: {
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
      createdAt: now,
      type: 'custom_ai',
      config: {
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
      createdAt: now,
      type: 'custom_ai',
      config: {
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
}

function isStoredClock(value: unknown): value is StoredCommunityClock {
  const v = value as Record<string, unknown>;
  return (
    typeof v?.id === 'string' &&
    typeof v?.name === 'string' &&
    typeof v?.likes === 'number' &&
    typeof v?.config === 'object' &&
    v.config !== null
  );
}

export class CommunityClockStore {
  private clocks: StoredCommunityClock[];
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private filePath: string = STORE_PATH) {
    this.clocks = this.load();
  }

  private load(): StoredCommunityClock[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed: unknown = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(parsed)) {
          return parsed.filter(isStoredClock);
        }
      }
    } catch (e) {
      console.warn('Community store unreadable, reseeding:', e instanceof Error ? e.message : e);
    }
    return seedStore();
  }

  list(): StoredCommunityClock[] {
    return this.clocks;
  }

  add(clock: Omit<StoredCommunityClock, 'id' | 'likes' | 'createdAt' | 'type'> & { id?: string; type?: ClockType; likes?: number; isBuiltIn?: boolean }): StoredCommunityClock {
    const stored: StoredCommunityClock = {
      ...clock,
      type: clock.type || 'custom_ai',
      id: clock.id || ('comm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      likes: clock.likes ?? 1,
      createdAt: new Date().toISOString()
    };
    this.clocks.unshift(stored);
    this.scheduleSave();
    return stored;
  }

  get(id: string): StoredCommunityClock | undefined {
    return this.clocks.find(c => c.id === id);
  }

  update(id: string, updates: Partial<StoredCommunityClock>): StoredCommunityClock | null {
    const index = this.clocks.findIndex(c => c.id === id);
    if (index === -1) {
      // If not found, add it as an override/new item
      if (updates.name && updates.config) {
        return this.add({
          id,
          name: updates.name,
          description: updates.description || '',
          author: updates.author || 'Admin',
          category: updates.category || 'Custom AI',
          config: updates.config,
          type: updates.type || 'custom_ai',
          likes: updates.likes ?? 1,
          isBuiltIn: updates.isBuiltIn
        });
      }
      return null;
    }

    const current = this.clocks[index];
    const updated: StoredCommunityClock = {
      ...current,
      ...updates,
      id: current.id, // preserve ID
      config: updates.config ? { ...current.config, ...updates.config } : current.config
    };

    this.clocks[index] = updated;
    this.scheduleSave();
    return updated;
  }

  delete(id: string): boolean {
    const index = this.clocks.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.clocks.splice(index, 1);
    this.scheduleSave();
    return true;
  }

  like(id: string): number | null {
    const clock = this.clocks.find((c) => c.id === id);
    if (!clock) return null;
    clock.likes += 1;
    this.scheduleSave();
    return clock.likes;
  }

  /** Writes pending changes immediately; used on shutdown and by tests. */
  flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.save();
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 500);
    this.saveTimer.unref?.();
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.clocks, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      console.error('Community store save failed:', e instanceof Error ? e.message : e);
    }
  }
}
