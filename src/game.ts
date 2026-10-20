import {
  ActiveEnemy,
  ActiveTower,
  AmbientMote,
  EnemyId,
  FloatingText,
  GroundDecal,
  GroundHazard,
  LightningBolt,
  MapDef,
  Particle,
  Point,
  Projectile,
  SoldierUnit,
  TargetPriority,
  TowerId,
  WaveDef,
} from './types';
import { MAP_LIST, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './data/maps';
import { TOWER_MAP, getTowerStats } from './data/towers';
import { ENEMY_MAP } from './data/enemies';
import { CAMPAIGN_WAVES, generateEndlessWave } from './data/waves';
import { GameRenderer } from './renderer';
import { sound } from './audio';
import { saveManager } from './save';

export interface SpellState {
  id: 'meteor' | 'chrono' | 'reinforce';
  name: string;
  cooldown: number;
  maxCooldown: number;
  hotkey: string;
}

export class TowerDefenseGame {
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;

  public currentMap: MapDef = MAP_LIST[0];
  public gold = 360;
  public lives = 25;
  public maxLives = 25;
  public waveNumber = 0;
  public maxCampaignWaves = CAMPAIGN_WAVES.length;
  public isWaveActive = false;
  public endlessMode = false;
  public autoWave = false;
  public gameSpeed: 1 | 2 | 3 = 1;
  public isPaused = false;
  public gameOver = false;
  public victoryShown = false;
  public lastEarnedStars = 0;

  public towers: ActiveTower[] = [];
  public enemies: ActiveEnemy[] = [];
  public soldiers: SoldierUnit[] = [];
  public projectiles: Projectile[] = [];
  public hazards: GroundHazard[] = [];
  public decals: GroundDecal[] = [];
  public ambientMotes: AmbientMote[] = [];
  public lightnings: LightningBolt[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  public selectedTowerUid: number | null = null;
  public hoveredTowerUid: number | null = null;
  public placingTowerId: TowerId | null = null;
  public settingRallyForUid: number | null = null;
  public activeSpellTargeting: 'meteor' | 'reinforce' | null = null;

  public mousePos: Point = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 };
  public canPlaceAtMouse = false;
  public mouseOnRunePad = false;

  private uidCounter = 1;
  public elapsedTime = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  public chronoFreezeTimer = 0;
  public chronoSpeedBuffTimer = 0;

  private pendingSpawns: { time: number; enemyId: EnemyId; pathIndex: number }[] = [];
  private waveElapsed = 0;
  private pendingMeteors: { delay: number; x: number; y: number }[] = [];

  public spells: Record<'meteor' | 'chrono' | 'reinforce', SpellState> = {
    meteor: { id: 'meteor', name: 'メテオストライク', cooldown: 0, maxCooldown: 32, hotkey: 'Q' },
    chrono: { id: 'chrono', name: 'クロノ・サージ', cooldown: 0, maxCooldown: 28, hotkey: 'W' },
    reinforce: { id: 'reinforce', name: '精霊騎士召喚', cooldown: 0, maxCooldown: 18, hotkey: 'E' },
  };

  private onUiUpdate: () => void;
  private onWaveBanner: (title: string, sub: string) => void;
  private onGameEndModal: (type: 'victory' | 'gameover') => void;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: {
      onUiUpdate: () => void;
      onWaveBanner: (title: string, sub: string) => void;
      onGameEndModal: (type: 'victory' | 'gameover') => void;
    }
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.renderer = new GameRenderer(ctx);
    this.onUiUpdate = callbacks.onUiUpdate;
    this.onWaveBanner = callbacks.onWaveBanner;
    this.onGameEndModal = callbacks.onGameEndModal;
  }

  private nextUid(): number {
    return this.uidCounter++;
  }

  public loadMap(map: MapDef): void {
    this.currentMap = map;
    this.gold = map.startingGold;
    this.lives = map.startingLives;
    this.maxLives = map.startingLives;
    this.waveNumber = 0;
    this.isWaveActive = false;
    this.endlessMode = false;
    this.isPaused = false;
    this.gameOver = false;
    this.victoryShown = false;
    this.lastEarnedStars = 0;

    this.towers = [];
    this.enemies = [];
    this.soldiers = [];
    this.projectiles = [];
    this.hazards = [];
    this.decals = [];
    this.lightnings = [];
    this.particles = [];
    this.floatingTexts = [];
    this.pendingSpawns = [];
    this.pendingMeteors = [];

    this.selectedTowerUid = null;
    this.hoveredTowerUid = null;
    this.placingTowerId = null;
    this.settingRallyForUid = null;
    this.activeSpellTargeting = null;
    this.chronoFreezeTimer = 0;
    this.chronoSpeedBuffTimer = 0;

    this.spells.meteor.cooldown = 0;
    this.spells.chrono.cooldown = 0;
    this.spells.reinforce.cooldown = 0;

    this.initAmbientMotes(map);
    this.renderer.invalidateMapCache();
    this.onUiUpdate();
  }

  private initAmbientMotes(map: MapDef): void {
    this.ambientMotes = [];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const type =
        map.theme === 'emerald'
          ? i % 3 === 0
            ? 'firefly'
            : 'petal'
          : map.theme === 'amber'
          ? 'ember'
          : 'snow';
      const color =
        type === 'petal'
          ? '#ffdeeb'
          : type === 'firefly'
          ? '#fef08a'
          : type === 'ember'
          ? '#fb923c'
          : '#f8fafc';
      this.ambientMotes.push({
        x: Math.random() * LOGICAL_WIDTH,
        y: Math.random() * LOGICAL_HEIGHT,
        vx: type === 'ember' ? (Math.random() - 0.5) * 14 : 12 + Math.random() * 16,
        vy: type === 'ember' ? -15 - Math.random() * 18 : 10 + Math.random() * 16,
        size: type === 'petal' ? 3.5 : 2.5 + Math.random() * 1.5,
        alpha: 0.45 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        color,
        type,
      });
    }
  }

  private addDecal(
    x: number,
    y: number,
    radius: number,
    type: GroundDecal['type'],
    color: string,
    maxLife = 4.5
  ): void {
    if (this.decals.length > 36) {
      this.decals.shift();
    }
    this.decals.push({ x, y, radius, type, color, life: maxLife, maxLife });
  }

  public getNextWaveDef(): WaveDef {
    const nextNum = this.waveNumber + 1;
    if (nextNum <= CAMPAIGN_WAVES.length) {
      return CAMPAIGN_WAVES[nextNum - 1];
    }
    return generateEndlessWave(nextNum);
  }

  public startNextWave(): void {
    if (this.gameOver) return;
    sound.initOnUserGesture();

    if (this.isWaveActive && this.pendingSpawns.length === 0) {
      const bonus = 15;
      this.gold += bonus;
      this.addFloatingText(LOGICAL_WIDTH / 2, 70, `早期開始ボーナス +${bonus}G!`, '#ffd43b', 18);
    } else if (this.isWaveActive) {
      return;
    }

    this.waveNumber++;
    saveManager.recordWaveProgress(this.currentMap.id, this.waveNumber);

    const waveDef =
      this.waveNumber <= CAMPAIGN_WAVES.length
        ? CAMPAIGN_WAVES[this.waveNumber - 1]
        : generateEndlessWave(this.waveNumber);

    this.isWaveActive = true;
    this.waveElapsed = 0;

    let cursorTime = 0.2;
    const pathCount = this.currentMap.paths.length;
    let spawnCounter = 0;

    for (const g of waveDef.groups) {
      cursorTime += g.delayBefore;
      for (let i = 0; i < g.count; i++) {
        const pIdx = g.pathIndex !== undefined ? g.pathIndex % pathCount : spawnCounter % pathCount;
        this.pendingSpawns.push({
          time: cursorTime + i * g.interval,
          enemyId: g.enemyId,
          pathIndex: pIdx,
        });
        spawnCounter++;
      }
      cursorTime += g.count * g.interval;
    }

    this.pendingSpawns.sort((a, b) => a.time - b.time);
    sound.playWaveStart();
    this.onWaveBanner(`WAVE ${this.waveNumber}`, waveDef.title);
    this.onUiUpdate();
  }

  public canCallWaveEarly(): boolean {
    if (this.gameOver) return false;
    if (!this.isWaveActive) return true;
    return this.pendingSpawns.length === 0 && this.enemies.length > 0;
  }

  public updateMouseLogicalPos(x: number, y: number): void {
    let finalX = x;
    let finalY = y;
    let onRune = false;

    if (this.placingTowerId) {
      for (const pad of this.currentMap.runePads) {
        if (Math.hypot(x - pad.x, y - pad.y) <= 28) {
          finalX = pad.x;
          finalY = pad.y;
          onRune = true;
          break;
        }
      }
    }

    this.mousePos = { x: finalX, y: finalY };
    this.mouseOnRunePad = onRune;
    this.canPlaceAtMouse = this.placingTowerId
      ? this.checkCanPlaceTower(finalX, finalY)
      : false;

    const hovered = this.findTowerAt(x, y);
    this.hoveredTowerUid = hovered ? hovered.uid : null;
  }

  public checkCanPlaceTower(x: number, y: number): boolean {
    if (x < 36 || x > LOGICAL_WIDTH - 36 || y < 52 || y > LOGICAL_HEIGHT - 42) {
      return false;
    }

    for (const t of this.towers) {
      if (Math.hypot(x - t.x, y - t.y) < 44) return false;
    }

    for (const path of this.currentMap.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const dist = this.distToSegment({ x, y }, path[i], path[i + 1]);
        if (dist < 40) return false;
      }
    }

    for (const wf of this.currentMap.waterFeatures) {
      if (wf.type === 'river') {
        for (let i = 0; i < wf.points.length - 1; i++) {
          const dist = this.distToSegment({ x, y }, wf.points[i], wf.points[i + 1]);
          if (dist < wf.width / 2 + 18) return false;
        }
      } else if (wf.type === 'lake') {
        const c = wf.points[0];
        const dx = (x - (c.x + 55)) / 135;
        const dy = (y - c.y) / 62;
        if (dx * dx + dy * dy < 1.05) return false;
      }
    }

    return true;
  }

  private distToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  private findClosestPointOnPaths(x: number, y: number, maxRange: number): Point {
    let bestPt: Point = { x, y: y + 40 };
    let bestDist = Infinity;
    for (const path of this.currentMap.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const v = path[i];
        const w = path[i + 1];
        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        let t = l2 === 0 ? 0 : ((x - v.x) * (w.x - v.x) + (y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = v.x + t * (w.x - v.x);
        const py = v.y + t * (w.y - v.y);
        const d = Math.hypot(x - px, y - py);
        if (d < bestDist) {
          bestDist = d;
          bestPt = { x: px, y: py };
        }
      }
    }
    if (bestDist > maxRange) {
      const angle = Math.atan2(bestPt.y - y, bestPt.x - x);
      return {
        x: x + Math.cos(angle) * (maxRange * 0.8),
        y: y + Math.sin(angle) * (maxRange * 0.8),
      };
    }
    return bestPt;
  }

  public handleCanvasClick(x: number, y: number): void {
    sound.initOnUserGesture();
    this.updateMouseLogicalPos(x, y);

    if (this.activeSpellTargeting) {
      this.castTargetedSpell(this.activeSpellTargeting, this.mousePos.x, this.mousePos.y);
      this.activeSpellTargeting = null;
      this.onUiUpdate();
      return;
    }

    if (this.settingRallyForUid !== null) {
      const barracks = this.towers.find((t) => t.uid === this.settingRallyForUid);
      if (barracks) {
        const stats = getTowerStats(barracks);
        const dist = Math.hypot(x - barracks.x, y - barracks.y);
        if (dist <= stats.range + 25) {
          barracks.rallyX = x;
          barracks.rallyY = y;
          this.updateBarracksSoldiersHome(barracks);
          this.addFloatingText(x, y - 10, '集合地点変更!', '#ffd43b', 14);
          sound.playBuildOrUpgrade(false);
        } else {
          this.addFloatingText(x, y - 10, '射程外です', '#ff6b6b', 14);
        }
      }
      this.settingRallyForUid = null;
      this.onUiUpdate();
      return;
    }

    if (this.placingTowerId) {
      const def = TOWER_MAP[this.placingTowerId];
      if (this.canPlaceAtMouse && this.gold >= def.cost) {
        this.gold -= def.cost;
        const rallyPt = this.findClosestPointOnPaths(this.mousePos.x, this.mousePos.y, def.range);
        const newTower: ActiveTower = {
          uid: this.nextUid(),
          defId: this.placingTowerId,
          x: this.mousePos.x,
          y: this.mousePos.y,
          tier: 0,
          totalInvested: def.cost,
          priority: 'first',
          angle: 0,
          cooldownTimer: 0.1,
          recoilAnim: 0,
          buildAnim: 1,
          upgradeAnim: 0,
          totalDamageDealt: 0,
          totalKills: 0,
          totalGoldGenerated: 0,
          onRunePad: this.mouseOnRunePad,
          buffSpeedMult: 1,
          buffDamageMult: 1,
          buffRangeAdd: 0,
          beamTargetId: null,
          beamRampTime: 0,
          rallyX: rallyPt.x,
          rallyY: rallyPt.y,
          soldierIds: [],
          respawnTimers: [0, 0],
        };
        this.towers.push(newTower);
        if (newTower.defId === 'barracks') {
          this.syncBarracksSoldiers(newTower);
        }
        this.recalculateAuras();
        this.spawnBurstParticles(newTower.x, newTower.y, def.colorSecondary, 14, 'star');
        sound.playBuildOrUpgrade(false);
        this.selectedTowerUid = newTower.uid;
        this.placingTowerId = null;
        this.onUiUpdate();
      } else if (!this.canPlaceAtMouse) {
        const clickedTower = this.findTowerAt(x, y);
        if (clickedTower) {
          this.placingTowerId = null;
          this.selectedTowerUid = clickedTower.uid;
          this.onUiUpdate();
        } else {
          this.addFloatingText(x, y - 10, 'ここには配置できません', '#ff6b6b', 14);
        }
      }
      return;
    }

    const clicked = this.findTowerAt(x, y);
    this.selectedTowerUid = clicked ? clicked.uid : null;
    this.onUiUpdate();
  }

  public cancelCurrentAction(): void {
    this.placingTowerId = null;
    this.settingRallyForUid = null;
    this.activeSpellTargeting = null;
    this.selectedTowerUid = null;
    this.onUiUpdate();
  }

  private findTowerAt(x: number, y: number): ActiveTower | null {
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const t = this.towers[i];
      if (Math.hypot(x - t.x, y - t.y) <= 28) {
        return t;
      }
    }
    return null;
  }

  public selectTowerToBuild(id: TowerId): void {
    sound.initOnUserGesture();
    const def = TOWER_MAP[id];
    if (this.gold < def.cost) {
      this.addFloatingText(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 90,
        'ゴールドが足りません!',
        '#ff6b6b',
        16
      );
      return;
    }
    this.selectedTowerUid = null;
    this.settingRallyForUid = null;
    this.activeSpellTargeting = null;
    this.placingTowerId = this.placingTowerId === id ? null : id;
    this.updateMouseLogicalPos(this.mousePos.x, this.mousePos.y);
    this.onUiUpdate();
  }

  public upgradeSelectedTower(branch?: 'A' | 'B'): void {
    const tower = this.towers.find((t) => t.uid === this.selectedTowerUid);
    if (!tower) return;
    const def = TOWER_MAP[tower.defId];

    let upgrade = def.tier1;
    if (tower.tier === 0) upgrade = def.tier1;
    else if (tower.tier === 1) upgrade = def.tier2;
    else if (tower.tier === 2) upgrade = branch === 'B' ? def.tier3B : def.tier3A;
    else return;

    if (this.gold < upgrade.cost) {
      this.addFloatingText(tower.x, tower.y - 25, 'ゴールド不足!', '#ff6b6b', 15);
      return;
    }

    this.gold -= upgrade.cost;
    tower.totalInvested += upgrade.cost;
    tower.tier = (tower.tier + 1) as 1 | 2 | 3;
    if (tower.tier === 3) {
      tower.branch = branch || 'A';
    }
    tower.upgradeAnim = 1;

    if (tower.defId === 'barracks') {
      this.syncBarracksSoldiers(tower);
    }
    this.recalculateAuras();
    this.spawnBurstParticles(tower.x, tower.y - 10, '#ffd43b', 20, 'star');
    this.addFloatingText(tower.x, tower.y - 28, `${upgrade.name}!`, '#ffd43b', 15);
    sound.playBuildOrUpgrade(true);
    this.onUiUpdate();
  }

  public sellSelectedTower(): void {
    const idx = this.towers.findIndex((t) => t.uid === this.selectedTowerUid);
    if (idx === -1) return;
    const tower = this.towers[idx];
    const refund = Math.round(tower.totalInvested * 0.75);
    this.gold += refund;

    this.soldiers = this.soldiers.filter((s) => s.parentTowerUid !== tower.uid);
    this.towers.splice(idx, 1);
    this.selectedTowerUid = null;
    this.recalculateAuras();

    this.spawnBurstParticles(tower.x, tower.y, '#ffd43b', 16, 'circle');
    this.addFloatingText(tower.x, tower.y - 15, `売却 +${refund}G`, '#ffd43b', 16);
    sound.playSell();
    this.onUiUpdate();
  }

  public cycleTowerPriority(): void {
    const tower = this.towers.find((t) => t.uid === this.selectedTowerUid);
    if (!tower) return;
    const order: TargetPriority[] = ['first', 'strong', 'close', 'last'];
    const nextIdx = (order.indexOf(tower.priority) + 1) % order.length;
    tower.priority = order[nextIdx];
    this.onUiUpdate();
  }

  public startRallyPointMode(): void {
    const tower = this.towers.find((t) => t.uid === this.selectedTowerUid);
    if (!tower || tower.defId !== 'barracks') return;
    this.settingRallyForUid = tower.uid;
    this.placingTowerId = null;
    this.activeSpellTargeting = null;
    this.onUiUpdate();
  }

  public triggerSpellButton(spellId: 'meteor' | 'chrono' | 'reinforce'): void {
    sound.initOnUserGesture();
    const spell = this.spells[spellId];
    if (spell.cooldown > 0) return;

    this.placingTowerId = null;
    this.settingRallyForUid = null;

    if (spellId === 'chrono') {
      spell.cooldown = spell.maxCooldown;
      this.chronoFreezeTimer = 3.5;
      this.chronoSpeedBuffTimer = 6.0;
      this.recalculateAuras();
      for (const e of this.enemies) {
        e.freezeTimer = Math.max(e.freezeTimer, e.isBoss ? 1.6 : 3.5);
        this.spawnBurstParticles(e.x, e.y, '#66d9e8', 8, 'spark');
      }
      sound.playSpell('chrono');
      this.addFloatingText(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 40,
        '❄️ クロノ・サージ発動！(全敵氷結＆全塔加速)',
        '#66d9e8',
        22
      );
      this.onUiUpdate();
    } else {
      this.activeSpellTargeting = this.activeSpellTargeting === spellId ? null : spellId;
      this.onUiUpdate();
    }
  }

  private castTargetedSpell(spellId: 'meteor' | 'reinforce', x: number, y: number): void {
    const spell = this.spells[spellId];
    if (spell.cooldown > 0) return;
    spell.cooldown = spell.maxCooldown;

    if (spellId === 'meteor') {
      sound.playSpell('meteor');
      this.addFloatingText(x, y - 35, '☄️ メテオストライク!', '#ff4d6d', 20);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 + Math.random() * 0.5;
        const dist = i === 0 ? 0 : 25 + Math.random() * 55;
        this.pendingMeteors.push({
          delay: i * 0.14,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
        });
      }
    } else if (spellId === 'reinforce') {
      sound.playSpell('reinforce');
      this.addFloatingText(x, y - 30, '⚔️ 精霊騎士団 参上!', '#38bdf8', 18);
      for (let i = 0; i < 2; i++) {
        const ox = i === 0 ? -16 : 16;
        const knight: SoldierUnit = {
          uid: this.nextUid(),
          parentTowerUid: -1,
          x: x + ox,
          y: y,
          homeX: x + ox,
          homeY: y,
          hp: 260,
          maxHp: 260,
          damage: 32,
          attackCooldown: 0.75,
          attackTimer: 0,
          engagedEnemyId: null,
          variant: 'spell_knight',
          facing: 1,
          animTime: 0,
          swingAnim: 0,
          isTemporary: true,
          lifeTimer: 16,
          canThrowSpear: true,
          spearTimer: 0.5,
        };
        this.soldiers.push(knight);
        this.spawnBurstParticles(knight.x, knight.y, '#38bdf8', 14, 'star');
      }
    }
  }

  private recalculateAuras(): void {
    for (const t of this.towers) {
      t.buffSpeedMult = this.chronoSpeedBuffTimer > 0 ? 1.35 : 1.0;
      t.buffDamageMult = 1.0;
      t.buffRangeAdd = 0;
    }

    for (const alch of this.towers) {
      if (alch.defId === 'alchemist' && alch.tier >= 2) {
        const alchStats = getTowerStats(alch);
        const isOverdrive = alch.tier === 3 && alch.branch === 'B';
        const speedBonus = isOverdrive ? 0.35 : 0.18;
        const dmgBonus = isOverdrive ? 0.25 : 0.08;
        const rangeAdd = isOverdrive ? 26 : 16;

        for (const other of this.towers) {
          if (other.uid === alch.uid) continue;
          if (Math.hypot(other.x - alch.x, other.y - alch.y) <= alchStats.range) {
            other.buffSpeedMult = Math.max(
              other.buffSpeedMult,
              (this.chronoSpeedBuffTimer > 0 ? 1.35 : 1.0) + speedBonus
            );
            other.buffDamageMult = Math.max(other.buffDamageMult, 1.0 + dmgBonus);
            other.buffRangeAdd = Math.max(other.buffRangeAdd, rangeAdd);
          }
        }
      }
    }
  }

  private syncBarracksSoldiers(tower: ActiveTower): void {
    const desiredCount = tower.tier >= 2 ? 3 : 2;
    while (tower.respawnTimers.length < desiredCount) {
      tower.respawnTimers.push(0);
    }

    const stats = getTowerStats(tower);
    const isPaladin = tower.tier === 3 && tower.branch === 'A';
    const isValkyrie = tower.tier === 3 && tower.branch === 'B';
    const maxHp = isPaladin ? 360 : isValkyrie ? 260 : tower.tier >= 1 ? 210 : 130;
    const variant = isPaladin ? 'paladin' : isValkyrie ? 'valkyrie' : 'knight';

    const existing = this.soldiers.filter((s) => s.parentTowerUid === tower.uid);
    existing.forEach((s) => {
      s.maxHp = maxHp;
      s.hp = maxHp;
      s.damage = stats.damage;
      s.variant = variant;
      s.canThrowSpear = isValkyrie;
    });

    for (let i = existing.length; i < desiredCount; i++) {
      this.spawnSoldierForBarracks(tower, i, desiredCount);
    }
    this.updateBarracksSoldiersHome(tower);
  }

  private spawnSoldierForBarracks(tower: ActiveTower, slotIndex: number, totalSlots: number): void {
    const stats = getTowerStats(tower);
    const isPaladin = tower.tier === 3 && tower.branch === 'A';
    const isValkyrie = tower.tier === 3 && tower.branch === 'B';
    const maxHp = isPaladin ? 360 : isValkyrie ? 260 : tower.tier >= 1 ? 210 : 130;
    const variant = isPaladin ? 'paladin' : isValkyrie ? 'valkyrie' : 'knight';

    const angle = (slotIndex * Math.PI * 2) / totalSlots;
    const hx = tower.rallyX + Math.cos(angle) * 18;
    const hy = tower.rallyY + Math.sin(angle) * 12;

    const unit: SoldierUnit = {
      uid: this.nextUid(),
      parentTowerUid: tower.uid,
      x: tower.x,
      y: tower.y,
      homeX: hx,
      homeY: hy,
      hp: maxHp,
      maxHp,
      damage: stats.damage,
      attackCooldown: 0.85,
      attackTimer: 0,
      engagedEnemyId: null,
      variant,
      facing: 1,
      animTime: 0,
      swingAnim: 0,
      isTemporary: false,
      lifeTimer: 9999,
      canThrowSpear: isValkyrie,
      spearTimer: 0.6,
    };
    this.soldiers.push(unit);
    tower.soldierIds.push(unit.uid);
  }

  private updateBarracksSoldiersHome(tower: ActiveTower): void {
    const units = this.soldiers.filter((s) => s.parentTowerUid === tower.uid);
    units.forEach((u, idx) => {
      const angle = (idx * Math.PI * 2) / Math.max(1, units.length);
      u.homeX = tower.rallyX + Math.cos(angle) * 18;
      u.homeY = tower.rallyY + Math.sin(angle) * 12;
    });
  }

  public step(rawDt: number): void {
    this.elapsedTime += rawDt;

    // Update ambient world motes even when paused
    for (const m of this.ambientMotes) {
      m.x += m.vx * rawDt;
      m.y += m.vy * rawDt;
      if (m.x > LOGICAL_WIDTH + 10) m.x = -10;
      if (m.x < -10) m.x = LOGICAL_WIDTH + 10;
      if (m.y > LOGICAL_HEIGHT + 10) m.y = -10;
      if (m.y < -10) m.y = LOGICAL_HEIGHT + 10;
    }

    if (this.isPaused || this.gameOver) {
      this.render();
      return;
    }

    const dt = Math.min(0.05, rawDt) * this.gameSpeed;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - rawDt);
    }

    if (this.chronoFreezeTimer > 0) {
      this.chronoFreezeTimer = Math.max(0, this.chronoFreezeTimer - dt);
    }
    if (this.chronoSpeedBuffTimer > 0) {
      const prev = this.chronoSpeedBuffTimer;
      this.chronoSpeedBuffTimer = Math.max(0, this.chronoSpeedBuffTimer - dt);
      if (prev > 0 && this.chronoSpeedBuffTimer === 0) {
        this.recalculateAuras();
      }
    }

    let spellReadyChanged = false;
    for (const key of ['meteor', 'chrono', 'reinforce'] as const) {
      const sp = this.spells[key];
      if (sp.cooldown > 0) {
        sp.cooldown = Math.max(0, sp.cooldown - dt);
        if (sp.cooldown === 0) spellReadyChanged = true;
      }
    }
    if (spellReadyChanged) this.onUiUpdate();

    for (let i = this.pendingMeteors.length - 1; i >= 0; i--) {
      const m = this.pendingMeteors[i];
      m.delay -= dt;
      if (m.delay <= 0) {
        this.spawnMeteorProjectile(m.x, m.y);
        this.pendingMeteors.splice(i, 1);
      }
    }

    if (this.isWaveActive) {
      this.waveElapsed += dt;
      while (this.pendingSpawns.length > 0 && this.pendingSpawns[0].time <= this.waveElapsed) {
        const sp = this.pendingSpawns.shift()!;
        this.spawnEnemyOnPath(sp.enemyId, sp.pathIndex);
      }

      if (this.pendingSpawns.length === 0 && this.enemies.length === 0) {
        this.completeCurrentWave();
      }
    }

    this.updateHazards(dt);
    this.updateTowers(dt);
    this.updateSoldiers(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateVisualEffects(dt);

    this.render();
  }

  private completeCurrentWave(): void {
    this.isWaveActive = false;
    const waveDef =
      this.waveNumber <= CAMPAIGN_WAVES.length
        ? CAMPAIGN_WAVES[this.waveNumber - 1]
        : generateEndlessWave(this.waveNumber);

    let totalBonus = waveDef.rewardGold;

    for (const t of this.towers) {
      if (t.defId === 'alchemist') {
        const st = getTowerStats(t);
        if (st.waveGoldBonus > 0) {
          totalBonus += st.waveGoldBonus;
          t.totalGoldGenerated += st.waveGoldBonus;
          this.addFloatingText(t.x, t.y - 24, `+${st.waveGoldBonus}G 錬成!`, '#ffd43b', 15);
          this.spawnBurstParticles(t.x, t.y - 10, '#ffd43b', 10, 'star');
        }
      }
    }

    this.gold += totalBonus;
    this.addFloatingText(
      LOGICAL_WIDTH / 2,
      110,
      `WAVE ${this.waveNumber} クリア! +${totalBonus}G`,
      '#51cf66',
      22
    );
    sound.playBuildOrUpgrade(true);

    if (this.waveNumber >= this.maxCampaignWaves) {
      this.lastEarnedStars = saveManager.recordStageClear(
        this.currentMap.id,
        this.waveNumber,
        this.lives,
        this.maxLives
      );
    }

    if (this.waveNumber === this.maxCampaignWaves && !this.endlessMode && !this.victoryShown) {
      this.victoryShown = true;
      this.onGameEndModal('victory');
    } else if (this.autoWave && !this.gameOver) {
      setTimeout(() => {
        if (this.autoWave && !this.isWaveActive && !this.gameOver) {
          this.startNextWave();
        }
      }, 900);
    }

    this.onUiUpdate();
  }

  private spawnEnemyOnPath(enemyId: EnemyId, pathIndex: number): void {
    const def = ENEMY_MAP[enemyId];
    const path = this.currentMap.paths[pathIndex % this.currentMap.paths.length];
    const start = path[0];
    const hpScale = this.waveNumber > 15 ? 1 + (this.waveNumber - 15) * 0.22 : 1;

    const enemy: ActiveEnemy = {
      uid: this.nextUid(),
      defId: enemyId,
      pathIndex: pathIndex % this.currentMap.paths.length,
      waypointIndex: 0,
      distanceTraveled: 0,
      x: start.x,
      y: start.y,
      hp: Math.round(def.maxHp * hpScale),
      maxHp: Math.round(def.maxHp * hpScale),
      shield: Math.round(def.shield * hpScale),
      maxShield: Math.round(def.shield * hpScale),
      speed: def.speed,
      armor: def.armor,
      isFlying: def.isFlying,
      isBoss: def.isBoss,
      radius: def.radius,
      hitFlash: 0,
      squash: 0,
      walkPhase: Math.random() * Math.PI * 2,
      facingX: 1,
      slowTimer: 0,
      slowFactor: 0,
      freezeTimer: 0,
      brittleTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      acidTimer: 0,
      goldTouch: false,
      shockTimer: 0,
      blockedBySoldierId: null,
      meleeAttackTimer: 0,
      abilityTimer: 2.5,
    };
    this.enemies.push(enemy);
  }

  private spawnChildEnemy(parent: ActiveEnemy, childId: EnemyId, offsetDist: number): void {
    const def = ENEMY_MAP[childId];
    const child: ActiveEnemy = {
      uid: this.nextUid(),
      defId: childId,
      pathIndex: parent.pathIndex,
      waypointIndex: parent.waypointIndex,
      distanceTraveled: Math.max(0, parent.distanceTraveled + offsetDist),
      x: parent.x + (Math.random() - 0.5) * 18,
      y: parent.y + (Math.random() - 0.5) * 18,
      hp: def.maxHp,
      maxHp: def.maxHp,
      shield: def.shield,
      maxShield: def.shield,
      speed: def.speed,
      armor: def.armor,
      isFlying: def.isFlying,
      isBoss: def.isBoss,
      radius: def.radius,
      hitFlash: 0.12,
      squash: 0.35,
      walkPhase: Math.random() * Math.PI * 2,
      facingX: parent.facingX,
      slowTimer: parent.slowTimer * 0.5,
      slowFactor: parent.slowFactor,
      freezeTimer: 0,
      brittleTimer: parent.brittleTimer,
      burnTimer: 0,
      burnDps: 0,
      acidTimer: parent.acidTimer,
      goldTouch: parent.goldTouch,
      shockTimer: 0,
      blockedBySoldierId: null,
      meleeAttackTimer: 0,
      abilityTimer: 2.5,
    };
    this.enemies.push(child);
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.duration -= dt;
      h.tickTimer -= dt;
      if (h.tickTimer <= 0) {
        h.tickTimer = 0.35;
        for (const e of this.enemies) {
          if (e.isFlying && h.type !== 'frost_aura') continue;
          if (Math.hypot(e.x - h.x, e.y - h.y) <= h.radius + e.radius) {
            if (h.type === 'acid') {
              e.acidTimer = 3.0;
              this.applyDamageToEnemy(e, h.dps * 0.35, 'alchemy', null, false);
            } else if (h.type === 'lava') {
              e.burnTimer = 2.5;
              e.burnDps = Math.max(e.burnDps, h.dps);
              this.applyDamageToEnemy(e, h.dps * 0.35, 'explosive', null, false);
            }
          }
        }
      }
      if (h.duration <= 0) {
        this.hazards.splice(i, 1);
      }
    }
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      if (tower.buildAnim > 0) tower.buildAnim = Math.max(0, tower.buildAnim - dt * 3.5);
      if (tower.upgradeAnim > 0) tower.upgradeAnim = Math.max(0, tower.upgradeAnim - dt * 3.0);
      if (tower.recoilAnim > 0) tower.recoilAnim = Math.max(0, tower.recoilAnim - dt * 5.0);

      if (tower.defId === 'barracks') {
        const maxSoldiers = tower.tier >= 2 ? 3 : 2;
        const currentUnits = this.soldiers.filter((s) => s.parentTowerUid === tower.uid);
        if (currentUnits.length < maxSoldiers) {
          const respawnTime = tower.tier >= 2 ? 5.5 : 9.0;
          tower.cooldownTimer += dt;
          if (tower.cooldownTimer >= respawnTime) {
            tower.cooldownTimer = 0;
            this.spawnSoldierForBarracks(tower, currentUnits.length, maxSoldiers);
          }
        }
        continue;
      }

      const stats = getTowerStats(tower);

      if (stats.tags.has('void_beam')) {
        const target = this.findTargetForTower(tower, stats.range, stats.canTargetAir);
        if (target) {
          tower.beamTargetId = target.uid;
          tower.beamRampTime = Math.min(4.0, tower.beamRampTime + dt);
          tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
          tower.cooldownTimer -= dt;
          if (tower.cooldownTimer <= 0) {
            tower.cooldownTimer = 0.15;
            const rampMult = 1 + tower.beamRampTime * 0.5;
            const dmg = Math.round(stats.damage * 0.25 * rampMult);
            this.applyDamageToEnemy(target, dmg, 'magic', tower, rampMult >= 2.2);
          }
        } else {
          tower.beamTargetId = null;
          tower.beamRampTime = Math.max(0, tower.beamRampTime - dt * 2);
        }
        continue;
      }

      tower.cooldownTimer -= dt;
      if (tower.cooldownTimer <= 0) {
        const target = this.findTargetForTower(tower, stats.range, stats.canTargetAir);
        if (target) {
          tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
          tower.recoilAnim = 1;
          tower.cooldownTimer = stats.cooldown;
          this.fireTowerWeapon(tower, target, stats);
        }
      }
    }
  }

  private findTargetForTower(
    tower: ActiveTower,
    range: number,
    canTargetAir: boolean
  ): ActiveEnemy | null {
    const candidates = this.enemies.filter((e) => {
      if (e.isFlying && !canTargetAir) return false;
      return Math.hypot(e.x - tower.x, e.y - tower.y) <= range + e.radius * 0.5;
    });

    if (candidates.length === 0) return null;

    if (tower.priority === 'first') {
      candidates.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
    } else if (tower.priority === 'last') {
      candidates.sort((a, b) => a.distanceTraveled - b.distanceTraveled);
    } else if (tower.priority === 'strong') {
      candidates.sort((a, b) => b.hp + b.shield - (a.hp + a.shield));
    } else {
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y)
      );
    }

    return candidates[0];
  }

  private fireTowerWeapon(
    tower: ActiveTower,
    target: ActiveEnemy,
    stats: ReturnType<typeof getTowerStats>
  ): void {
    const def = TOWER_MAP[tower.defId];
    const isCrit = Math.random() < stats.critChance;
    const critMult = stats.tags.has('sniper_crit') ? 2.5 : 1.75;
    const finalDamage = Math.round(stats.damage * (isCrit ? critMult : 1));

    if (tower.defId === 'archer') {
      sound.playShoot('arrow');
      if (stats.tags.has('triple_shot')) {
        [-0.16, 0, 0.16].forEach((offsetAngle) => {
          const baseAngle = Math.atan2(target.y - tower.y, target.x - tower.x) + offsetAngle;
          this.spawnLinearProjectile(tower, {
            type: 'arrow',
            angle: baseAngle,
            speed: def.projectileSpeed,
            damage: finalDamage,
            damageType: 'physical',
            pierce: stats.pierce,
            crit: isCrit,
            color: '#74c69d',
          });
        });
      } else {
        const isSnipe = stats.tags.has('sniper_crit');
        const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        this.spawnLinearProjectile(tower, {
          type: isSnipe ? 'snipe_bolt' : 'arrow',
          angle,
          speed: isSnipe ? 920 : def.projectileSpeed,
          damage: finalDamage,
          damageType: isSnipe ? 'magic' : 'physical',
          pierce: stats.pierce,
          crit: isCrit,
          color: isSnipe ? '#ffd43b' : '#ffffff',
        });
      }
    } else if (tower.defId === 'bombard') {
      sound.playShoot('bomb');
      this.projectiles.push({
        uid: this.nextUid(),
        sourceTowerUid: tower.uid,
        type: 'bomb',
        x: tower.x,
        y: tower.y - 16,
        startX: tower.x,
        startY: tower.y - 16,
        targetX: target.x,
        targetY: target.y,
        targetEnemyId: null,
        vx: 0,
        vy: 0,
        speed: def.projectileSpeed,
        progress: 0,
        arcHeight: 68,
        damage: finalDamage,
        damageType: 'explosive',
        splashRadius: stats.splashRadius,
        pierce: 99,
        hitEnemyIds: new Set(),
        crit: isCrit,
        applyAcid: stats.tags.has('shred_armor') ? 5.0 : undefined,
        applyStun: stats.tags.has('mega_stun') ? 1.1 : undefined,
        clusterCount: stats.tags.has('cluster_volcano') ? 5 : undefined,
        color: '#ff922b',
        trailTimer: 0,
      });
    } else if (tower.defId === 'frost') {
      sound.playShoot('frost');
      const slowFactor = stats.tags.has('deep_chill') ? 0.5 : 0.35;
      const slowDur = stats.tags.has('deep_chill') ? 4.0 : 2.8;
      const brittleDur = stats.tags.has('brittle_debuff') ? 4.0 : 0;

      if (stats.tags.has('blizzard_nova')) {
        this.spawnBurstParticles(tower.x, tower.y, '#66d9e8', 22, 'snowflake');
        for (const e of this.enemies) {
          if (Math.hypot(e.x - tower.x, e.y - tower.y) <= stats.range + e.radius) {
            this.applyDamageToEnemy(e, finalDamage, 'ice', tower, isCrit);
            e.slowFactor = Math.max(e.slowFactor, 0.55);
            e.slowTimer = Math.max(e.slowTimer, 4.0);
            e.brittleTimer = Math.max(e.brittleTimer, 4.0);
            if (!e.isBoss || Math.random() < 0.35) {
              e.freezeTimer = Math.max(e.freezeTimer, e.isBoss ? 0.6 : 1.2);
            }
          }
        }
      } else if (stats.tags.has('glacial_lance')) {
        const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        this.spawnLinearProjectile(tower, {
          type: 'glacial_lance',
          angle,
          speed: 720,
          damage: finalDamage,
          damageType: 'ice',
          pierce: 12,
          crit: isCrit,
          color: '#66d9e8',
          applySlow: { factor: slowFactor, duration: slowDur },
          applyBrittle: brittleDur,
        });
      } else {
        this.projectiles.push({
          uid: this.nextUid(),
          sourceTowerUid: tower.uid,
          type: 'ice_shard',
          x: tower.x,
          y: tower.y - 20,
          startX: tower.x,
          startY: tower.y - 20,
          targetX: target.x,
          targetY: target.y,
          targetEnemyId: target.uid,
          vx: 0,
          vy: 0,
          speed: def.projectileSpeed,
          progress: 0,
          arcHeight: 0,
          damage: finalDamage,
          damageType: 'ice',
          splashRadius: stats.splashRadius,
          pierce: 1,
          hitEnemyIds: new Set(),
          crit: isCrit,
          applySlow: { factor: slowFactor, duration: slowDur },
          applyBrittle: brittleDur,
          color: '#66d9e8',
          trailTimer: 0,
        });
      }
    } else if (tower.defId === 'arcane') {
      sound.playShoot('arcane');
      if (stats.tags.has('storm_chain')) {
        this.castChainLightning(tower, target, finalDamage, 6, isCrit);
      } else {
        this.castChainLightning(tower, target, finalDamage, stats.pierce, isCrit);
      }
    } else if (tower.defId === 'alchemist') {
      sound.playShoot('alch');
      const count = stats.tags.has('overdrive_lab') ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const spreadX = i === 0 ? 0 : (Math.random() - 0.5) * 44;
        const spreadY = i === 0 ? 0 : (Math.random() - 0.5) * 44;
        this.projectiles.push({
          uid: this.nextUid(),
          sourceTowerUid: tower.uid,
          type: 'alch_flask',
          x: tower.x,
          y: tower.y - 18,
          startX: tower.x,
          startY: tower.y - 18,
          targetX: target.x + spreadX,
          targetY: target.y + spreadY,
          targetEnemyId: null,
          vx: 0,
          vy: 0,
          speed: def.projectileSpeed,
          progress: 0,
          arcHeight: 54,
          damage: finalDamage,
          damageType: 'alchemy',
          splashRadius: stats.splashRadius,
          pierce: 99,
          hitEnemyIds: new Set(),
          crit: isCrit,
          applyAcid: 4.5,
          applyGoldTouch: stats.tags.has('gold_cornucopia'),
          spawnPuddle: stats.tags.has('acid_puddle') ? 'acid' : undefined,
          color: stats.tags.has('gold_cornucopia') ? '#ffd43b' : '#80ed99',
          trailTimer: 0,
        });
      }
    }
  }

  private spawnLinearProjectile(
    tower: ActiveTower,
    opts: {
      type: Projectile['type'];
      angle: number;
      speed: number;
      damage: number;
      damageType: Projectile['damageType'];
      pierce: number;
      crit: boolean;
      color: string;
      applySlow?: { factor: number; duration: number };
      applyBrittle?: number;
    }
  ): void {
    this.projectiles.push({
      uid: this.nextUid(),
      sourceTowerUid: tower.uid,
      type: opts.type,
      x: tower.x,
      y: tower.y - 18,
      startX: tower.x,
      startY: tower.y - 18,
      targetX: tower.x + Math.cos(opts.angle) * 400,
      targetY: tower.y + Math.sin(opts.angle) * 400,
      targetEnemyId: null,
      vx: Math.cos(opts.angle) * opts.speed,
      vy: Math.sin(opts.angle) * opts.speed,
      speed: opts.speed,
      progress: 0,
      arcHeight: 0,
      damage: opts.damage,
      damageType: opts.damageType,
      splashRadius: 0,
      pierce: opts.pierce,
      hitEnemyIds: new Set(),
      crit: opts.crit,
      applySlow: opts.applySlow,
      applyBrittle: opts.applyBrittle,
      color: opts.color,
      trailTimer: 0,
    });
  }

  private castChainLightning(
    tower: ActiveTower,
    firstTarget: ActiveEnemy,
    damage: number,
    maxTargets: number,
    isCrit: boolean
  ): void {
    const visited = new Set<number>();
    const points: Point[] = [{ x: tower.x, y: tower.y - 28 }];
    let current: ActiveEnemy | null = firstTarget;
    let curDmg = damage;

    for (let i = 0; i < maxTargets && current; i++) {
      visited.add(current.uid);
      points.push({ x: current.x, y: current.y - current.radius * 0.4 });
      this.applyDamageToEnemy(current, Math.round(curDmg), 'magic', tower, isCrit && i === 0);
      current.shockTimer = 0.6;
      curDmg *= 0.85;

      let nextCandidate: ActiveEnemy | null = null;
      let bestDist = 115;
      for (const e of this.enemies) {
        if (visited.has(e.uid)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d < bestDist) {
          bestDist = d;
          nextCandidate = e;
        }
      }
      current = nextCandidate;
    }

    const jagged: Point[] = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const midX = (a.x + b.x) / 2 + (Math.random() - 0.5) * 18;
      const midY = (a.y + b.y) / 2 + (Math.random() - 0.5) * 18;
      jagged.push({ x: midX, y: midY }, b);
    }

    this.lightnings.push({
      points: jagged,
      color: maxTargets >= 5 ? '#74c0fc' : '#b197fc',
      life: 0.22,
      maxLife: 0.22,
      width: maxTargets >= 5 ? 5 : 3.5,
    });
  }

  private spawnMeteorProjectile(tx: number, ty: number): void {
    this.projectiles.push({
      uid: this.nextUid(),
      sourceTowerUid: -1,
      type: 'meteor',
      x: tx - 90,
      y: ty - 260,
      startX: tx - 90,
      startY: ty - 260,
      targetX: tx,
      targetY: ty,
      targetEnemyId: null,
      vx: 0,
      vy: 0,
      speed: 580,
      progress: 0,
      arcHeight: 0,
      damage: 185,
      damageType: 'explosive',
      splashRadius: 95,
      pierce: 99,
      hitEnemyIds: new Set(),
      crit: true,
      applyBurn: { dps: 28, duration: 4.0 },
      applyStun: 0.8,
      spawnPuddle: 'lava',
      color: '#ff4d6d',
      trailTimer: 0,
    });
  }

  private updateSoldiers(dt: number): void {
    for (let i = this.soldiers.length - 1; i >= 0; i--) {
      const s = this.soldiers[i];
      s.animTime += dt;
      if (s.swingAnim > 0) s.swingAnim = Math.max(0, s.swingAnim - dt * 3.5);

      if (s.isTemporary) {
        s.lifeTimer -= dt;
        if (s.lifeTimer <= 0 || s.hp <= 0) {
          this.releaseEnemyBlockedBy(s.uid);
          this.spawnBurstParticles(s.x, s.y, '#38bdf8', 8, 'star');
          this.soldiers.splice(i, 1);
          continue;
        }
      } else if (s.hp <= 0) {
        this.releaseEnemyBlockedBy(s.uid);
        this.spawnBurstParticles(s.x, s.y, '#adb5bd', 8, 'circle');
        this.soldiers.splice(i, 1);
        continue;
      }

      let engaged =
        s.engagedEnemyId !== null
          ? this.enemies.find((e) => e.uid === s.engagedEnemyId) || null
          : null;
      if (engaged && (engaged.isFlying || Math.hypot(engaged.x - s.x, engaged.y - s.y) > 75)) {
        engaged.blockedBySoldierId = null;
        engaged = null;
        s.engagedEnemyId = null;
      }

      if (!engaged) {
        for (const e of this.enemies) {
          if (e.isFlying) continue;
          if (e.blockedBySoldierId === null && Math.hypot(e.x - s.homeX, e.y - s.homeY) <= 68) {
            engaged = e;
            s.engagedEnemyId = e.uid;
            e.blockedBySoldierId = s.uid;
            break;
          }
        }
      }

      if (engaged) {
        const targetX = engaged.x - 14;
        const targetY = engaged.y;
        const dist = Math.hypot(targetX - s.x, targetY - s.y);
        s.facing = engaged.x >= s.x ? 1 : -1;

        if (dist > 8) {
          const step = Math.min(dist, 125 * dt);
          s.x += ((targetX - s.x) / dist) * step;
          s.y += ((targetY - s.y) / dist) * step;
        } else {
          s.attackTimer -= dt;
          if (s.attackTimer <= 0) {
            s.attackTimer = s.attackCooldown;
            s.swingAnim = 1;
            sound.playShoot('sword');
            const parentTower = this.towers.find((t) => t.uid === s.parentTowerUid) || null;
            this.applyDamageToEnemy(engaged, s.damage, 'physical', parentTower, false);

            if (s.variant === 'paladin') {
              s.hp = Math.min(s.maxHp, s.hp + 12);
              this.addDecal(s.x, s.y, 26, 'holy_crest', '#ffd43b', 1.8);
              this.spawnBurstParticles(engaged.x, engaged.y, '#ffd43b', 7, 'ring');
              for (const other of this.enemies) {
                if (
                  other.uid !== engaged.uid &&
                  !other.isFlying &&
                  Math.hypot(other.x - s.x, other.y - s.y) <= 52
                ) {
                  this.applyDamageToEnemy(
                    other,
                    Math.round(s.damage * 0.65),
                    'magic',
                    parentTower,
                    false
                  );
                }
              }
            }
          }
        }
      } else {
        const dist = Math.hypot(s.homeX - s.x, s.homeY - s.y);
        if (dist > 3) {
          s.facing = s.homeX >= s.x ? 1 : -1;
          const step = Math.min(dist, 110 * dt);
          s.x += ((s.homeX - s.x) / dist) * step;
          s.y += ((s.homeY - s.y) / dist) * step;
        }
        s.hp = Math.min(s.maxHp, s.hp + 18 * dt);

        if (s.canThrowSpear) {
          s.spearTimer -= dt;
          if (s.spearTimer <= 0) {
            const target = this.enemies.find((e) => Math.hypot(e.x - s.x, e.y - s.y) <= 165);
            if (target) {
              s.spearTimer = 1.05;
              s.swingAnim = 1;
              s.facing = target.x >= s.x ? 1 : -1;
              const angle = Math.atan2(target.y - s.y, target.x - s.x);
              this.projectiles.push({
                uid: this.nextUid(),
                sourceTowerUid: s.parentTowerUid,
                type: 'valkyrie_spear',
                x: s.x,
                y: s.y - 10,
                startX: s.x,
                startY: s.y - 10,
                targetX: target.x,
                targetY: target.y,
                targetEnemyId: null,
                vx: Math.cos(angle) * 560,
                vy: Math.sin(angle) * 560,
                speed: 560,
                progress: 0,
                arcHeight: 0,
                damage: Math.round(s.damage * 1.15),
                damageType: 'magic',
                splashRadius: 0,
                pierce: 2,
                hitEnemyIds: new Set(),
                crit: false,
                color: '#ffd43b',
                trailTimer: 0,
              });
            }
          }
        }
      }
    }
  }

  private releaseEnemyBlockedBy(soldierUid: number): void {
    for (const e of this.enemies) {
      if (e.blockedBySoldierId === soldierUid) {
        e.blockedBySoldierId = null;
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.arcHeight > 0 || p.type === 'meteor') {
        const totalDist = Math.max(20, Math.hypot(p.targetX - p.startX, p.targetY - p.startY));
        p.progress += (p.speed * dt) / totalDist;

        const prevX = p.x;
        const prevY = p.y;
        const baseX = p.startX + (p.targetX - p.startX) * p.progress;
        const baseY = p.startY + (p.targetY - p.startY) * p.progress;
        const arcOffset = Math.sin(p.progress * Math.PI) * p.arcHeight;

        p.x = baseX;
        p.y = baseY - arcOffset;
        p.vx = p.x - prevX;
        p.vy = p.y - prevY;

        p.trailTimer -= dt;
        if (p.trailTimer <= 0) {
          p.trailTimer = 0.03;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: p.type === 'meteor' ? 7 : 4,
            endSize: 0.5,
            color: p.type === 'meteor' ? '#ff922b' : p.color,
            alpha: 0.7,
            life: 0.25,
            maxLife: 0.25,
            gravity: 0,
            shape: 'circle',
            rotation: 0,
            vRot: 0,
          });
        }

        if (p.progress >= 1) {
          this.detonateAoEProjectile(p);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (p.targetEnemyId !== null) {
        const target = this.enemies.find((e) => e.uid === p.targetEnemyId);
        if (target) {
          p.targetX = target.x;
          p.targetY = target.y;
        }
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= p.speed * dt + 8) {
          p.x = p.targetX;
          p.y = p.targetY;
          this.detonateAoEProjectile(p);
          this.projectiles.splice(i, 1);
          continue;
        }
        p.vx = (dx / dist) * p.speed;
        p.vy = (dy / dist) * p.speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const sourceTower = this.towers.find((t) => t.uid === p.sourceTowerUid) || null;
      for (const e of this.enemies) {
        if (p.hitEnemyIds.has(e.uid)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + 9) {
          p.hitEnemyIds.add(e.uid);
          this.applyDamageToEnemy(e, p.damage, p.damageType, sourceTower, p.crit);
          if (p.applySlow) {
            e.slowFactor = Math.max(e.slowFactor, p.applySlow.factor);
            e.slowTimer = Math.max(e.slowTimer, p.applySlow.duration);
          }
          if (p.applyBrittle) {
            e.brittleTimer = Math.max(e.brittleTimer, p.applyBrittle);
          }
          this.spawnBurstParticles(p.x, p.y, p.color, 5, 'spark');
          p.pierce--;
          if (p.pierce <= 0) break;
        }
      }

      if (
        p.pierce <= 0 ||
        p.x < -50 ||
        p.x > LOGICAL_WIDTH + 50 ||
        p.y < -50 ||
        p.y > LOGICAL_HEIGHT + 50
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private detonateAoEProjectile(p: Projectile): void {
    const sourceTower = this.towers.find((t) => t.uid === p.sourceTowerUid) || null;
    const isBig = p.type === 'meteor' || (p.applyStun !== undefined && p.applyStun > 0);

    if (p.type === 'bomb' || p.type === 'cluster_mini' || p.type === 'meteor') {
      sound.playExplosion(isBig);
      this.addDecal(p.targetX, p.targetY, isBig ? 28 : 18, 'scorch', '#1e293b', 5.0);
      if (isBig) {
        this.triggerScreenShake(p.type === 'meteor' ? 6 : 3.5, 0.22);
      }
    } else if (p.type === 'ice_shard') {
      this.addDecal(p.targetX, p.targetY, 22, 'frost_ring', '#66d9e8', 2.5);
    }

    this.particles.push({
      x: p.targetX,
      y: p.targetY,
      vx: 0,
      vy: 0,
      size: 8,
      endSize: Math.max(36, p.splashRadius),
      color: p.color,
      alpha: 0.85,
      life: 0.28,
      maxLife: 0.28,
      gravity: 0,
      shape: 'ring',
      rotation: 0,
      vRot: 0,
    });
    this.spawnBurstParticles(p.targetX, p.targetY, p.color, isBig ? 18 : 11, 'circle');

    for (const e of this.enemies) {
      if (e.isFlying && p.type === 'bomb') continue;
      if (Math.hypot(e.x - p.targetX, e.y - p.targetY) <= p.splashRadius + e.radius) {
        this.applyDamageToEnemy(e, p.damage, p.damageType, sourceTower, p.crit);
        if (p.applySlow) {
          e.slowFactor = Math.max(e.slowFactor, p.applySlow.factor);
          e.slowTimer = Math.max(e.slowTimer, p.applySlow.duration);
        }
        if (p.applyBrittle) {
          e.brittleTimer = Math.max(e.brittleTimer, p.applyBrittle);
        }
        if (p.applyAcid) {
          e.acidTimer = Math.max(e.acidTimer, p.applyAcid);
        }
        if (p.applyBurn) {
          e.burnTimer = Math.max(e.burnTimer, p.applyBurn.duration);
          e.burnDps = Math.max(e.burnDps, p.applyBurn.dps);
        }
        if (p.applyStun) {
          e.freezeTimer = Math.max(e.freezeTimer, e.isBoss ? p.applyStun * 0.45 : p.applyStun);
        }
        if (p.applyGoldTouch) {
          e.goldTouch = true;
        }
      }
    }

    if (p.clusterCount && p.clusterCount > 0) {
      for (let c = 0; c < p.clusterCount; c++) {
        const angle = (c * Math.PI * 2) / p.clusterCount + Math.random() * 0.3;
        const dist = 42 + Math.random() * 24;
        this.projectiles.push({
          uid: this.nextUid(),
          sourceTowerUid: p.sourceTowerUid,
          type: 'cluster_mini',
          x: p.targetX,
          y: p.targetY,
          startX: p.targetX,
          startY: p.targetY,
          targetX: p.targetX + Math.cos(angle) * dist,
          targetY: p.targetY + Math.sin(angle) * dist,
          targetEnemyId: null,
          vx: 0,
          vy: 0,
          speed: 240,
          progress: 0,
          arcHeight: 34,
          damage: Math.round(p.damage * 0.45),
          damageType: 'explosive',
          splashRadius: 42,
          pierce: 99,
          hitEnemyIds: new Set(),
          crit: false,
          applyBurn: { dps: 16, duration: 3.0 },
          spawnPuddle: c === 0 ? 'lava' : undefined,
          color: '#ff4d6d',
          trailTimer: 0,
        });
      }
    }

    if (p.spawnPuddle) {
      this.hazards.push({
        uid: this.nextUid(),
        type: p.spawnPuddle,
        x: p.targetX,
        y: p.targetY,
        radius: p.spawnPuddle === 'lava' ? 46 : 42,
        duration: 3.6,
        maxDuration: 3.6,
        dps: p.spawnPuddle === 'lava' ? 24 : 18,
        tickTimer: 0.1,
      });
    }
  }

  private applyDamageToEnemy(
    enemy: ActiveEnemy,
    rawDamage: number,
    damageType: Projectile['damageType'],
    sourceTower: ActiveTower | null,
    isCrit: boolean
  ): void {
    if (enemy.hp <= 0) return;

    let dmg = rawDamage;

    if (damageType === 'physical' && enemy.acidTimer <= 0) {
      dmg *= 1 - enemy.armor;
    } else if (damageType === 'explosive' && enemy.acidTimer <= 0) {
      dmg *= 1 - enemy.armor * 0.25;
    }

    if (damageType === 'ice' && (enemy.shield > 0 || enemy.armor > 0.3)) {
      dmg *= 1.35;
    }

    if (enemy.brittleTimer > 0) {
      dmg *= 1.25;
    }

    dmg = Math.max(1, Math.round(dmg));

    if (enemy.shield > 0) {
      const shieldAbsorb = Math.min(enemy.shield, dmg);
      enemy.shield -= shieldAbsorb;
      dmg -= shieldAbsorb;
    }

    enemy.hp -= dmg;
    enemy.hitFlash = 0.11;
    enemy.squash = 0.32;

    if (sourceTower) {
      sourceTower.totalDamageDealt += dmg;
    }

    if (isCrit || dmg >= 45) {
      this.addFloatingText(
        enemy.x + (Math.random() - 0.5) * 14,
        enemy.y - enemy.radius - 8,
        isCrit ? `💥${dmg}!` : `${dmg}`,
        isCrit ? '#ffd43b' : '#ffffff',
        isCrit ? 15 : 12
      );
    }

    if (enemy.hp <= 0) {
      this.handleEnemyKilled(enemy, sourceTower);
    }
  }

  private handleEnemyKilled(enemy: ActiveEnemy, killerTower: ActiveTower | null): void {
    const def = ENEMY_MAP[enemy.defId];
    sound.playPop(enemy.isBoss);
    saveManager.addKills(1);

    if (enemy.blockedBySoldierId !== null) {
      const s = this.soldiers.find((u) => u.uid === enemy.blockedBySoldierId);
      if (s) s.engagedEnemyId = null;
    }

    const goldEarned = def.rewardGold * (enemy.goldTouch ? 2 : 1);
    this.gold += goldEarned;

    if (killerTower) {
      killerTower.totalKills++;
      if (enemy.goldTouch) {
        killerTower.totalGoldGenerated += def.rewardGold;
      }
    }

    this.addDecal(enemy.x, enemy.y + 4, enemy.radius * 0.9, 'slime_splat', def.colorBody, 3.5);
    this.spawnBurstParticles(enemy.x, enemy.y, def.colorBody, enemy.isBoss ? 34 : 12, 'circle');
    this.spawnBurstParticles(enemy.x, enemy.y, '#ffd43b', enemy.isBoss ? 14 : 4, 'star');

    if (enemy.goldTouch || def.rewardGold >= 14) {
      this.addFloatingText(enemy.x, enemy.y - 14, `+${goldEarned}G`, '#ffd43b', 14);
    }

    if (enemy.isBoss) {
      this.triggerScreenShake(7, 0.35);
    }

    if (def.spawnsOnDeath) {
      let idx = 0;
      for (const group of def.spawnsOnDeath) {
        for (let c = 0; c < group.count; c++) {
          this.spawnChildEnemy(enemy, group.id, -idx * 10);
          idx++;
        }
      }
    }

    const index = this.enemies.findIndex((e) => e.uid === enemy.uid);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
    this.onUiUpdate();
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const def = ENEMY_MAP[e.defId];

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.squash > 0) e.squash = Math.max(0, e.squash - dt * 2.8);
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.freezeTimer > 0) e.freezeTimer = Math.max(0, e.freezeTimer - dt);
      if (e.brittleTimer > 0) e.brittleTimer = Math.max(0, e.brittleTimer - dt);
      if (e.acidTimer > 0) e.acidTimer = Math.max(0, e.acidTimer - dt);
      if (e.shockTimer > 0) e.shockTimer = Math.max(0, e.shockTimer - dt);

      if (e.burnTimer > 0) {
        e.burnTimer = Math.max(0, e.burnTimer - dt);
        this.applyDamageToEnemy(e, e.burnDps * dt, 'explosive', null, false);
        if (e.hp <= 0) continue;
      }

      if (def.healsNearby) {
        e.abilityTimer -= dt;
        if (e.abilityTimer <= 0) {
          e.abilityTimer = 3.2;
          this.spawnBurstParticles(e.x, e.y, '#ffd43b', 8, 'ring');
          for (const ally of this.enemies) {
            if (Math.hypot(ally.x - e.x, ally.y - e.y) <= 95 && ally.hp < ally.maxHp) {
              ally.hp = Math.min(ally.maxHp, ally.hp + 28);
            }
          }
        }
      }

      if (e.freezeTimer > 0) continue;

      if (e.blockedBySoldierId !== null) {
        const soldier = this.soldiers.find((s) => s.uid === e.blockedBySoldierId);
        if (soldier && soldier.hp > 0) {
          e.meleeAttackTimer -= dt;
          if (e.meleeAttackTimer <= 0) {
            e.meleeAttackTimer = 1.0;
            e.squash = 0.25;
            soldier.hp -= e.isBoss ? 45 : 14;
          }
          continue;
        } else {
          e.blockedBySoldierId = null;
        }
      }

      const path = this.currentMap.paths[e.pathIndex];
      const nextWp = path[e.waypointIndex + 1];
      if (!nextWp) {
        this.lives = Math.max(0, this.lives - def.lifeCost);
        sound.playLifeLost();
        this.triggerScreenShake(5, 0.25);
        this.addFloatingText(e.x - 30, e.y - 20, `-${def.lifeCost} ❤️`, '#ff4d6d', 18);
        this.enemies.splice(i, 1);

        if (this.lives <= 0 && !this.gameOver) {
          this.gameOver = true;
          this.onGameEndModal('gameover');
        }
        this.onUiUpdate();
        continue;
      }

      const speedMult = e.slowTimer > 0 ? 1 - e.slowFactor : 1;
      const moveDist = e.speed * speedMult * dt;
      const dx = nextWp.x - e.x;
      const dy = nextWp.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) e.facingX = dx >= 0 ? 1 : -1;

      if (dist <= moveDist) {
        e.x = nextWp.x;
        e.y = nextWp.y;
        e.waypointIndex++;
      } else {
        e.x += (dx / dist) * moveDist;
        e.y += (dy / dist) * moveDist;
      }
      e.distanceTraveled += moveDist;
    }
  }

  private updateVisualEffects(dt: number): void {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].life -= dt;
      if (this.decals[i].life <= 0) this.decals.splice(i, 1);
    }

    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].life -= dt;
      if (this.lightnings[i].life <= 0) this.lightnings.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += pt.gravity * dt;
      pt.rotation += pt.vRot * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  public spawnBurstParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    shape: Particle['shape']
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 115;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: shape === 'ring' ? 10 : 4 + Math.random() * 4.5,
        endSize: shape === 'ring' ? 42 : 0.5,
        color,
        alpha: 0.95,
        life: 0.32 + Math.random() * 0.25,
        maxLife: 0.55,
        gravity: shape === 'ring' ? 0 : 160,
        shape,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
      });
    }
  }

  public addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size = 14
  ): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -38,
      text,
      color,
      stroke: '#0f172a',
      size,
      life: 0.95,
      maxLife: 0.95,
      scale: 1,
    });
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  public render(): void {
    const shakeOffset: Point =
      this.shakeTimer > 0
        ? {
            x: (Math.random() - 0.5) * 2 * this.shakeIntensity,
            y: (Math.random() - 0.5) * 2 * this.shakeIntensity,
          }
        : { x: 0, y: 0 };

    this.renderer.renderScene({
      map: this.currentMap,
      time: this.elapsedTime,
      towers: this.towers,
      selectedTowerUid: this.selectedTowerUid,
      hoveredTowerUid: this.hoveredTowerUid,
      placingTowerId: this.placingTowerId,
      settingRallyForUid: this.settingRallyForUid,
      activeSpellTargeting: this.activeSpellTargeting,
      mousePos: this.mousePos,
      canPlaceAtMouse: this.canPlaceAtMouse,
      mouseOnRunePad: this.mouseOnRunePad,
      enemies: this.enemies,
      soldiers: this.soldiers,
      projectiles: this.projectiles,
      hazards: this.hazards,
      decals: this.decals,
      ambientMotes: this.ambientMotes,
      lightnings: this.lightnings,
      particles: this.particles,
      floatingTexts: this.floatingTexts,
      shakeOffset,
      chronoFreezeTimer: this.chronoFreezeTimer,
    });
  }
}
