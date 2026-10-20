import { GameSaveData, StageSaveRecord } from './types';
import { MAP_LIST } from './data/maps';

const STORAGE_KEY = 'popcrown_td_save_v1';

function createDefaultSave(): GameSaveData {
  const stages: Record<string, StageSaveRecord> = {};
  for (const m of MAP_LIST) {
    stages[m.id] = { stars: 0, bestWave: 0, cleared: false };
  }
  return {
    stages,
    totalKillsAllTime: 0,
  };
}

export class SaveManager {
  private data: GameSaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): GameSaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw) as GameSaveData;
      const def = createDefaultSave();
      return {
        stages: { ...def.stages, ...(parsed.stages || {}) },
        totalKillsAllTime: parsed.totalKillsAllTime || 0,
      };
    } catch {
      return createDefaultSave();
    }
  }

  public save(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }

  public getStageRecord(mapId: string): StageSaveRecord {
    if (!this.data.stages[mapId]) {
      this.data.stages[mapId] = { stars: 0, bestWave: 0, cleared: false };
    }
    return this.data.stages[mapId];
  }

  public recordWaveProgress(mapId: string, wave: number): void {
    const rec = this.getStageRecord(mapId);
    if (wave > rec.bestWave) {
      rec.bestWave = wave;
      this.save();
    }
  }

  public recordStageClear(mapId: string, wave: number, remainingLives: number, maxLives: number): number {
    const rec = this.getStageRecord(mapId);
    rec.cleared = true;
    if (wave > rec.bestWave) rec.bestWave = wave;

    const ratio = remainingLives / Math.max(1, maxLives);
    const earnedStars = ratio >= 0.8 ? 3 : ratio >= 0.45 ? 2 : 1;
    if (earnedStars > rec.stars) {
      rec.stars = earnedStars;
    }
    this.save();
    return earnedStars;
  }

  public addKills(count: number): void {
    this.data.totalKillsAllTime += count;
    this.save();
  }

  public getTotalStars(): number {
    return Object.values(this.data.stages).reduce((sum, r) => sum + r.stars, 0);
  }

  public getTotalKills(): number {
    return this.data.totalKillsAllTime;
  }
}

export const saveManager = new SaveManager();
