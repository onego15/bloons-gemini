import {
  ActiveEnemy,
  ActiveTower,
  AmbientMote,
  FloatingText,
  GroundDecal,
  GroundHazard,
  LightningBolt,
  MapDecoration,
  MapDef,
  Particle,
  Point,
  Projectile,
  SoldierUnit,
  TowerId,
} from './types';
import { ENEMY_MAP } from './data/enemies';
import { TOWER_MAP, getTowerStats } from './data/towers';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './data/maps';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private terrainCache: HTMLCanvasElement;
  private cachedMapId = '';

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.terrainCache = document.createElement('canvas');
    this.terrainCache.width = LOGICAL_WIDTH;
    this.terrainCache.height = LOGICAL_HEIGHT;
  }

  public invalidateMapCache(): void {
    this.cachedMapId = '';
  }

  private buildTerrainCache(map: MapDef): void {
    this.cachedMapId = map.id;
    const tctx = this.terrainCache.getContext('2d')!;
    tctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 1. Rich background gradient
    const grad = tctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    grad.addColorStop(0, map.bgGradient[0]);
    grad.addColorStop(1, map.bgGradient[1]);
    tctx.fillStyle = grad;
    tctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 2. Organic terrain elevation patches & grass tufts (deterministic pseudo-random)
    let seed = map.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 55; i++) {
      const px = rand() * LOGICAL_WIDTH;
      const py = rand() * LOGICAL_HEIGHT;
      const rx = 45 + rand() * 90;
      const ry = 28 + rand() * 55;
      tctx.fillStyle =
        map.theme === 'emerald'
          ? i % 2 === 0
            ? 'rgba(255, 255, 255, 0.045)'
            : 'rgba(20, 60, 15, 0.06)'
          : map.theme === 'amber'
          ? i % 2 === 0
            ? 'rgba(255, 220, 140, 0.055)'
            : 'rgba(80, 30, 5, 0.07)'
          : 'rgba(220, 240, 255, 0.06)';
      tctx.beginPath();
      tctx.ellipse(px, py, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      tctx.fill();
    }

    // Little grass blades / pebbles / snow sparkles
    for (let i = 0; i < 280; i++) {
      const gx = rand() * LOGICAL_WIDTH;
      const gy = rand() * LOGICAL_HEIGHT;
      if (map.theme === 'emerald') {
        tctx.strokeStyle = rand() > 0.5 ? 'rgba(30, 85, 25, 0.32)' : 'rgba(190, 245, 130, 0.32)';
        tctx.lineWidth = 2;
        tctx.beginPath();
        tctx.moveTo(gx, gy);
        tctx.lineTo(gx - 3.5, gy - 6.5);
        tctx.moveTo(gx, gy);
        tctx.lineTo(gx + 3.5, gy - 5.5);
        tctx.stroke();
      } else if (map.theme === 'amber') {
        tctx.fillStyle = rand() > 0.5 ? 'rgba(95, 45, 15, 0.25)' : 'rgba(255, 210, 130, 0.24)';
        tctx.beginPath();
        tctx.arc(gx, gy, 2 + rand() * 2.8, 0, Math.PI * 2);
        tctx.fill();
      } else {
        tctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        tctx.beginPath();
        tctx.arc(gx, gy, 1.5 + rand() * 2.2, 0, Math.PI * 2);
        tctx.fill();
      }
    }

    // 3. Water Features (Rivers & Lakes base)
    for (const wf of map.waterFeatures) {
      if (wf.type === 'river') {
        tctx.save();
        tctx.lineCap = 'round';
        tctx.lineJoin = 'round';
        // River bank shadow & lush border
        tctx.strokeStyle = map.theme === 'emerald' ? '#3f6a28' : '#334155';
        tctx.lineWidth = wf.width + 20;
        this.traceSmoothPath(tctx, wf.points);
        tctx.stroke();

        // Sandy / pebble bank
        tctx.strokeStyle = '#d4b483';
        tctx.lineWidth = wf.width + 10;
        this.traceSmoothPath(tctx, wf.points);
        tctx.stroke();

        // Deep water
        tctx.strokeStyle = '#0284c7';
        tctx.lineWidth = wf.width;
        this.traceSmoothPath(tctx, wf.points);
        tctx.stroke();

        // Inner bright water
        tctx.strokeStyle = wf.color;
        tctx.lineWidth = wf.width - 14;
        this.traceSmoothPath(tctx, wf.points);
        tctx.stroke();
        tctx.restore();
      } else if (wf.type === 'lake') {
        const c = wf.points[0];
        tctx.save();
        tctx.fillStyle = '#475569';
        tctx.beginPath();
        tctx.ellipse(c.x + 55, c.y, 138, 65, 0, 0, Math.PI * 2);
        tctx.fill();

        tctx.fillStyle = '#0284c7';
        tctx.beginPath();
        tctx.ellipse(c.x + 55, c.y, 130, 58, 0, 0, Math.PI * 2);
        tctx.fill();

        tctx.fillStyle = '#38bdf8';
        tctx.beginPath();
        tctx.ellipse(c.x + 55, c.y, 122, 51, 0, 0, Math.PI * 2);
        tctx.fill();

        tctx.fillStyle = '#bae6fd';
        tctx.beginPath();
        tctx.ellipse(c.x + 45, c.y - 6, 92, 34, 0, 0, Math.PI * 2);
        tctx.fill();
        tctx.restore();
      }
    }

    // 4. Multi-layered Roads
    for (const path of map.paths) {
      tctx.save();
      tctx.lineCap = 'round';
      tctx.lineJoin = 'round';

      // Soft outer ground shadow
      tctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      tctx.lineWidth = 62;
      tctx.beginPath();
      path.forEach((p, idx) => (idx === 0 ? tctx.moveTo(p.x, p.y + 4) : tctx.lineTo(p.x, p.y + 4)));
      tctx.stroke();

      // Road outer stone curb
      tctx.strokeStyle = map.roadOuterColor;
      tctx.lineWidth = 56;
      this.tracePolyline(tctx, path);
      tctx.stroke();

      // Middle cobblestone layer
      tctx.strokeStyle = map.roadStoneColor;
      tctx.lineWidth = 48;
      this.tracePolyline(tctx, path);
      tctx.stroke();

      // Inner dirt/sand path
      tctx.strokeStyle = map.roadInnerColor;
      tctx.lineWidth = 38;
      this.tracePolyline(tctx, path);
      tctx.stroke();

      // Subtle dual wagon wheel tracks
      tctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      tctx.lineWidth = 22;
      this.tracePolyline(tctx, path);
      tctx.stroke();

      tctx.strokeStyle = map.roadInnerColor;
      tctx.lineWidth = 12;
      this.tracePolyline(tctx, path);
      tctx.stroke();

      tctx.restore();
    }

    // Road cobblestones & border pebbles detail along segments
    for (const path of map.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.floor(dist / 24);
        for (let s = 0; s <= steps; s++) {
          const t = s / Math.max(1, steps);
          const x = a.x + (b.x - a.x) * t + (rand() - 0.5) * 24;
          const y = a.y + (b.y - a.y) * t + (rand() - 0.5) * 24;
          tctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.18)';
          tctx.beginPath();
          tctx.ellipse(x, y, 4 + rand() * 4.5, 2.8 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2);
          tctx.fill();
        }
      }
    }

    // 5. Bridges over rivers
    for (const wf of map.waterFeatures) {
      if (wf.bridgePoints) {
        for (const bp of wf.bridgePoints) {
          tctx.save();
          tctx.translate(bp.x, bp.y);
          tctx.rotate(bp.angle);
          // Bridge shadow
          tctx.fillStyle = 'rgba(0,0,0,0.38)';
          tctx.fillRect(-bp.length / 2, -bp.width / 2 + 6, bp.length, bp.width);
          // Planks
          const plankCount = 9;
          const plankW = bp.length / plankCount;
          for (let i = 0; i < plankCount; i++) {
            tctx.fillStyle = i % 2 === 0 ? '#8d5524' : '#7f4f24';
            tctx.fillRect(-bp.length / 2 + i * plankW, -bp.width / 2, plankW - 1.5, bp.width);
          }
          // Handrails
          tctx.fillStyle = '#582f0e';
          tctx.fillRect(-bp.length / 2 - 4, -bp.width / 2 - 5, bp.length + 8, 8);
          tctx.fillRect(-bp.length / 2 - 4, bp.width / 2 - 3, bp.length + 8, 8);
          // Gold post caps
          [-bp.length / 2, 0, bp.length / 2].forEach((px) => {
            tctx.fillStyle = '#fbbf24';
            tctx.strokeStyle = '#78350f';
            tctx.lineWidth = 1.5;
            tctx.beginPath();
            tctx.arc(px, -bp.width / 2 - 1, 5.5, 0, Math.PI * 2);
            tctx.fill();
            tctx.stroke();
            tctx.beginPath();
            tctx.arc(px, bp.width / 2 + 1, 5.5, 0, Math.PI * 2);
            tctx.fill();
            tctx.stroke();
          });
          tctx.restore();
        }
      }
    }
  }

  private tracePolyline(ctx: CanvasRenderingContext2D, pts: Point[]): void {
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
  }

  private traceSmoothPath(ctx: CanvasRenderingContext2D, pts: Point[]): void {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  public renderScene(state: {
    map: MapDef;
    time: number;
    towers: ActiveTower[];
    selectedTowerUid: number | null;
    hoveredTowerUid: number | null;
    placingTowerId: TowerId | null;
    settingRallyForUid: number | null;
    activeSpellTargeting: 'meteor' | 'reinforce' | null;
    mousePos: Point;
    canPlaceAtMouse: boolean;
    mouseOnRunePad: boolean;
    enemies: ActiveEnemy[];
    soldiers: SoldierUnit[];
    projectiles: Projectile[];
    hazards: GroundHazard[];
    decals: GroundDecal[];
    ambientMotes: AmbientMote[];
    lightnings: LightningBolt[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    shakeOffset: Point;
    chronoFreezeTimer: number;
  }): void {
    const { ctx } = this;
    const { map, time } = state;

    if (this.cachedMapId !== map.id) {
      this.buildTerrainCache(map);
    }

    ctx.save();
    ctx.translate(state.shakeOffset.x, state.shakeOffset.y);

    // 1. Draw static cached terrain
    ctx.drawImage(this.terrainCache, 0, 0);

    // 2. Animated water ripples
    this.renderWaterRipples(ctx, map, time);

    // 3. Rune Pads (Tactical Bonus Pads)
    for (const pad of map.runePads) {
      this.renderRunePad(ctx, pad.x, pad.y, time);
    }

    // 4. Persistent Ground Decals (Scorch craters, slime splats, frost rings)
    for (const dec of state.decals) {
      this.renderDecal(ctx, dec);
    }

    // 5. Entrance Warning Portals & Exit Sanctuary Castle Keep
    this.renderPathPortals(ctx, map, time);

    // 6. Ground Hazards (Acid puddles, Lava pools, Frost auras)
    for (const h of state.hazards) {
      this.renderHazard(ctx, h, time);
    }

    // 7. Frost Spire Tier 3A passive Blizzard Aura rings
    for (const t of state.towers) {
      if (t.defId === 'frost' && t.tier === 3 && t.branch === 'A') {
        const stats = getTowerStats(t);
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        const grad = ctx.createRadialGradient(t.x, t.y, 10, t.x, t.y, stats.range);
        grad.addColorStop(0, 'rgba(102, 217, 232, 0.04)');
        grad.addColorStop(0.8, 'rgba(102, 217, 232, 0.16)');
        grad.addColorStop(1, 'rgba(227, 250, 252, 0.32)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(165, 243, 252, ${0.4 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 8. Hovered Tower subtle range ring (when not currently selected)
    if (
      state.hoveredTowerUid !== null &&
      state.hoveredTowerUid !== state.selectedTowerUid &&
      !state.placingTowerId
    ) {
      const hovered = state.towers.find((t) => t.uid === state.hoveredTowerUid);
      if (hovered) {
        const stats = getTowerStats(hovered);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(hovered.x, hovered.y, stats.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 9. Selected Tower Range & Rally Line
    const selectedTower = state.towers.find((t) => t.uid === state.selectedTowerUid) || null;
    if (selectedTower) {
      const stats = getTowerStats(selectedTower);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(selectedTower.x, selectedTower.y, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      if (selectedTower.defId === 'barracks') {
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(selectedTower.x, selectedTower.y);
        ctx.lineTo(selectedTower.rallyX, selectedTower.rallyY);
        ctx.stroke();
        ctx.setLineDash([]);
        this.renderRallyFlag(ctx, selectedTower.rallyX, selectedTower.rallyY, time);
      }
      ctx.restore();
    }

    // 10. Decorations, Towers, Soldiers & Ground Enemies sorted by Y for 2.5D depth
    type Renderable =
      | { kind: 'deco'; y: number; deco: MapDecoration }
      | { kind: 'tower'; y: number; tower: ActiveTower }
      | { kind: 'soldier'; y: number; soldier: SoldierUnit }
      | { kind: 'enemy'; y: number; enemy: ActiveEnemy };

    const renderList: Renderable[] = [];
    for (const d of map.decorations) renderList.push({ kind: 'deco', y: d.y, deco: d });
    for (const t of state.towers) renderList.push({ kind: 'tower', y: t.y, tower: t });
    for (const s of state.soldiers) renderList.push({ kind: 'soldier', y: s.y, soldier: s });
    for (const e of state.enemies) {
      if (!e.isFlying) renderList.push({ kind: 'enemy', y: e.y, enemy: e });
    }

    renderList.sort((a, b) => a.y - b.y);

    for (const item of renderList) {
      if (item.kind === 'deco') {
        this.renderDecoration(ctx, item.deco, time);
      } else if (item.kind === 'tower') {
        this.renderTower(
          ctx,
          item.tower,
          time,
          item.tower.uid === state.selectedTowerUid,
          item.tower.uid === state.hoveredTowerUid
        );
      } else if (item.kind === 'soldier') {
        this.renderSoldier(ctx, item.soldier, time);
      } else if (item.kind === 'enemy') {
        this.renderEnemy(ctx, item.enemy, time);
      }
    }

    // 11. Flying Enemies (rendered above ground units and trees)
    for (const e of state.enemies) {
      if (e.isFlying) {
        this.renderEnemy(ctx, e, time);
      }
    }

    // 12. Continuous Arcane Void Sunbeam (Tier 3B)
    for (const t of state.towers) {
      if (t.defId === 'arcane' && t.tier === 3 && t.branch === 'B' && t.beamTargetId !== null) {
        const target = state.enemies.find((e) => e.uid === t.beamTargetId);
        if (target) {
          this.renderVoidBeam(ctx, t, target, time);
        }
      }
    }

    // 13. Projectiles
    for (const p of state.projectiles) {
      this.renderProjectile(ctx, p, time);
    }

    // 14. Chain Lightning Bolts
    for (const bolt of state.lightnings) {
      this.renderLightning(ctx, bolt);
    }

    // 15. Combat Particles
    for (const pt of state.particles) {
      this.renderParticle(ctx, pt);
    }

    // 16. Ambient World Motes (Falling cherry petals, glowing embers, snowflakes)
    for (const mote of state.ambientMotes) {
      this.renderAmbientMote(ctx, mote, time);
    }

    // 17. Placement Ghost / Rally Targeting / Spell Reticle
    if (state.placingTowerId) {
      this.renderPlacementGhost(
        ctx,
        state.placingTowerId,
        state.mousePos.x,
        state.mousePos.y,
        state.canPlaceAtMouse,
        state.mouseOnRunePad,
        time
      );
    } else if (state.settingRallyForUid !== null) {
      const barracks = state.towers.find((t) => t.uid === state.settingRallyForUid);
      if (barracks) {
        const stats = getTowerStats(barracks);
        const dist = Math.hypot(state.mousePos.x - barracks.x, state.mousePos.y - barracks.y);
        const valid = dist <= stats.range + 25;
        ctx.save();
        ctx.strokeStyle = valid ? '#ffd43b' : '#ff6b6b';
        ctx.fillStyle = valid ? 'rgba(255, 212, 59, 0.12)' : 'rgba(255, 107, 107, 0.12)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(barracks.x, barracks.y, stats.range + 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        this.renderRallyFlag(ctx, state.mousePos.x, state.mousePos.y, time);
        ctx.restore();
      }
    } else if (state.activeSpellTargeting) {
      this.renderSpellReticle(ctx, state.activeSpellTargeting, state.mousePos.x, state.mousePos.y, time);
    }

    // 18. Floating Combat Numbers & Popups
    for (const ft of state.floatingTexts) {
      this.renderFloatingText(ctx, ft);
    }

    // 19. Global Chrono Surge screen tint when active
    if (state.chronoFreezeTimer > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(103, 232, 249, ${Math.min(0.14, state.chronoFreezeTimer * 0.05)})`;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.55)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, LOGICAL_WIDTH - 8, LOGICAL_HEIGHT - 8);
      ctx.restore();
    }

    ctx.restore();
  }

  private renderDecal(ctx: CanvasRenderingContext2D, dec: GroundDecal): void {
    ctx.save();
    const alpha = Math.min(1, dec.life / dec.maxLife) * 0.48;
    ctx.globalAlpha = alpha;
    ctx.translate(dec.x, dec.y);

    if (dec.type === 'scorch') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, dec.radius, dec.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, dec.radius * 0.6, dec.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === 'slime_splat') {
      ctx.fillStyle = dec.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, dec.radius * 0.8, dec.radius * 0.52, 0, 0, Math.PI * 2);
      ctx.arc(-dec.radius * 0.6, -dec.radius * 0.2, 4, 0, Math.PI * 2);
      ctx.arc(dec.radius * 0.55, dec.radius * 0.25, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === 'frost_ring') {
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, dec.radius, dec.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (dec.type === 'holy_crest') {
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, dec.radius, dec.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderAmbientMote(ctx: CanvasRenderingContext2D, m: AmbientMote, time: number): void {
    ctx.save();
    ctx.globalAlpha = m.alpha * (0.65 + 0.35 * Math.sin(time * 3 + m.phase));
    ctx.translate(m.x, m.y);
    ctx.rotate(time * 1.5 + m.phase);
    ctx.fillStyle = m.color;

    if (m.type === 'petal') {
      ctx.beginPath();
      ctx.ellipse(0, 0, m.size * 1.4, m.size * 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderWaterRipples(ctx: CanvasRenderingContext2D, map: MapDef, time: number): void {
    for (const wf of map.waterFeatures) {
      if (wf.type === 'river') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.setLineDash([12, 26]);
        ctx.lineDashOffset = -time * 28;
        this.traceSmoothPath(ctx, wf.points);
        ctx.stroke();
        ctx.restore();
      } else if (wf.type === 'lake') {
        const c = wf.points[0];
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2;
        const rPulse = (time * 18) % 40;
        ctx.beginPath();
        ctx.ellipse(c.x + 55, c.y, 45 + rPulse, 18 + rPulse * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private renderRunePad(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    ctx.save();
    ctx.translate(x, y);

    // Outer arcane halo
    const glow = 0.5 + 0.35 * Math.sin(time * 3.2 + x);
    ctx.fillStyle = `rgba(56, 189, 248, ${glow * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(0, 2, 32, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone base shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 28, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    // Carved outer sanctuary ring
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, -1, 21, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing arcane symbol
    ctx.strokeStyle = `rgba(56, 189, 248, ${glow + 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -1, 15, 10.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating rune diamond
    ctx.save();
    ctx.scale(1, 0.72);
    ctx.rotate(time * 0.8);
    ctx.strokeStyle = `rgba(186, 230, 253, ${glow + 0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();

    ctx.restore();
  }

  private renderPathPortals(ctx: CanvasRenderingContext2D, map: MapDef, time: number): void {
    // Entry warning chevrons on each path start
    for (const path of map.paths) {
      if (path.length < 2) continue;
      const p0 = path[0];
      const p1 = path[1];
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const entryX = Math.max(36, Math.min(LOGICAL_WIDTH - 36, p0.x + Math.cos(angle) * 58));
      const entryY = Math.max(36, Math.min(LOGICAL_HEIGHT - 36, p0.y + Math.sin(angle) * 58));

      ctx.save();
      ctx.translate(entryX, entryY);
      ctx.rotate(angle);
      for (let i = 0; i < 3; i++) {
        const alpha = 0.35 + 0.5 * Math.sin(time * 5 - i * 1.1);
        ctx.strokeStyle = `rgba(255, 107, 107, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const ox = -16 + i * 12;
        ctx.moveTo(ox - 7, -10);
        ctx.lineTo(ox + 3, 0);
        ctx.lineTo(ox - 7, 10);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Exit Royal Crystal Sanctuary Keep at final point of path[0]
    const mainPath = map.paths[0];
    const lastPt = mainPath[mainPath.length - 1];
    const prevPt = mainPath[mainPath.length - 2];
    const angle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
    const gateX = Math.min(LOGICAL_WIDTH - 38, lastPt.x - Math.cos(angle) * 48);
    const gateY = Math.min(LOGICAL_HEIGHT - 38, lastPt.y - Math.sin(angle) * 48);

    ctx.save();
    ctx.translate(gateX, gateY);
    const hover = Math.sin(time * 3.5) * 4;

    // Sanctuary magic circle on ground
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Twin Royal Guard Turrets flanking the exit
    [-22, 22].forEach((py) => {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.fillRect(-9, py - 20, 18, 26);
      ctx.strokeRect(-9, py - 20, 18, 26);

      // Blue royal conical roof
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(-12, py - 20);
      ctx.lineTo(0, py - 32);
      ctx.lineTo(12, py - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold finial
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.arc(0, py - 33, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Floating Kingdom Heart Crystal
    ctx.translate(0, hover - 14);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner facet highlight
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderDecoration(ctx: CanvasRenderingContext2D, d: MapDecoration, time: number): void {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.scale, d.scale);
    const sway = Math.sin(time * 2.1 + d.x * 0.05) * 0.04;

    if (d.type === 'pine_tree' || d.type === 'snow_pine') {
      const isSnow = d.type === 'snow_pine';
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(sway);
      // Trunk
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(-5, -10, 10, 16);
      // 3 layered cones with dark outlines for crispness
      const colors = isSnow ? ['#1e3a5f', '#2b5876', '#e2e8f0'] : ['#1b4332', '#2d6a4f', '#40916c'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i];
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const w = 24 - i * 4;
        const yBase = -6 - i * 13;
        ctx.moveTo(0, yBase - 22);
        ctx.lineTo(w, yBase);
        ctx.lineTo(-w, yBase);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (d.type === 'oak_tree' || d.type === 'cherry_tree') {
      const isCherry = d.type === 'cherry_tree';
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(sway);
      // Trunk & branches
      ctx.fillStyle = '#6f4518';
      ctx.strokeStyle = '#3d230a';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-6, -15, 12, 21);
      ctx.strokeRect(-6, -15, 12, 21);

      const cDark = isCherry ? '#c2255c' : '#2b8a3e';
      const cMid = isCherry ? '#f783ac' : '#51cf66';
      const cLight = isCherry ? '#ffdeeb' : '#a9e34b';

      ctx.fillStyle = cDark;
      ctx.beginPath();
      ctx.arc(-13, -24, 15, 0, Math.PI * 2);
      ctx.arc(13, -24, 15, 0, Math.PI * 2);
      ctx.arc(0, -35, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cMid;
      ctx.beginPath();
      ctx.arc(-9, -27, 13, 0, Math.PI * 2);
      ctx.arc(10, -27, 13, 0, Math.PI * 2);
      ctx.arc(0, -37, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cLight;
      ctx.beginPath();
      ctx.arc(-5, -40, 8, 0, Math.PI * 2);
      ctx.arc(7, -30, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'crystal_cluster') {
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      const shards = [
        { x: -8, h: 24, w: 7, a: -0.25, c: '#38bdf8' },
        { x: 7, h: 22, w: 6, a: 0.28, c: '#818cf8' },
        { x: 0, h: 32, w: 8, a: 0.02, c: '#7dd3fc' },
      ];
      for (const s of shards) {
        ctx.save();
        ctx.translate(s.x, 0);
        ctx.rotate(s.a);
        ctx.fillStyle = s.c;
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s.w, 0);
        ctx.lineTo(-s.w * 0.6, -s.h * 0.7);
        ctx.lineTo(0, -s.h);
        ctx.lineTo(s.w * 0.6, -s.h * 0.7);
        ctx.lineTo(s.w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (d.type === 'rock') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.lineTo(-12, -12);
      ctx.lineTo(2, -16);
      ctx.lineTo(15, -8);
      ctx.lineTo(17, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.lineTo(2, -16);
      ctx.lineTo(8, -6);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
    } else if (d.type === 'ruin_pillar') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-10, -28, 20, 32);
      ctx.strokeRect(-10, -28, 20, 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-13, -32, 26, 6);
      ctx.fillRect(-13, 0, 26, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'mushroom') {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(-3, -8, 6, 10);
      ctx.fillStyle = '#fa5252';
      ctx.beginPath();
      ctx.arc(0, -9, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -13, 2, 0, Math.PI * 2);
      ctx.arc(4, -12, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'flower_patch') {
      const offsets = [
        { x: -8, y: -4, c: '#ffd43b' },
        { x: 6, y: -6, c: '#ff8787' },
        { x: 2, y: 4, c: '#74c0fc' },
      ];
      for (const f of offsets) {
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.type === 'lantern') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-5, -18, 10, 20);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-4, -14, 8, 7);
      const glow = 0.24 + 0.1 * Math.sin(time * 4 + d.x);
      ctx.fillStyle = `rgba(251, 191, 36, ${glow})`;
      ctx.beginPath();
      ctx.arc(0, -10, 19, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'cactus_amber') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b8a3e';
      ctx.strokeStyle = '#1b4332';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-5, -26, 10, 28);
      ctx.strokeRect(-5, -26, 10, 28);
      ctx.fillRect(-13, -18, 8, 5);
      ctx.fillRect(-13, -24, 5, 10);
      ctx.fillRect(5, -15, 8, 5);
      ctx.fillRect(8, -22, 5, 10);
    }

    ctx.restore();
  }

  public renderTower(
    ctx: CanvasRenderingContext2D,
    tower: ActiveTower,
    time: number,
    isSelected: boolean,
    isHovered = false
  ): void {
    ctx.save();
    ctx.translate(tower.x, tower.y);

    // Build / Upgrade pop scale animation
    let scale = isHovered && !isSelected ? 1.05 : 1;
    if (tower.buildAnim > 0) {
      scale = 1 + Math.sin(tower.buildAnim * Math.PI) * 0.28;
    } else if (tower.upgradeAnim > 0) {
      scale = 1 + Math.sin(tower.upgradeAnim * Math.PI) * 0.25;
    }
    ctx.scale(scale, scale);

    // Selection highlight ring
    if (isSelected) {
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 4, 29, 21, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Alchemist buff aura under tower
    if (tower.buffSpeedMult > 1.01) {
      ctx.strokeStyle = 'rgba(255, 212, 59, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 4, 26, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw the shared tower visual
    this.drawTowerArt(ctx, tower.defId, tower.tier, tower.branch, tower.angle, tower.recoilAnim, time);

    // Tier Badges (Stars / Ultimate Crown)
    if (tower.tier > 0) {
      ctx.save();
      ctx.translate(0, 22);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = tower.tier >= 3 ? '#ffd43b' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-21, -7, 42, 14, 7);
      ctx.fill();
      ctx.stroke();

      if (tower.tier < 3) {
        ctx.fillStyle = '#ffd43b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★'.repeat(tower.tier), 0, 0.5);
      } else {
        ctx.fillStyle = tower.branch === 'A' ? '#ff922b' : '#66d9e8';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tower.branch === 'A' ? '👑極A' : '👑極B', 0, 0.5);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  public drawTowerArt(
    ctx: CanvasRenderingContext2D,
    defId: TowerId,
    tier: number,
    branch: 'A' | 'B' | undefined,
    angle: number,
    recoil: number,
    time: number
  ): void {
    const def = TOWER_MAP[defId];

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 25, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Foundation Base Pedestal
    ctx.fillStyle = tier >= 3 ? '#f59f00' : tier >= 2 ? '#cbd5e1' : '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = def.colorPrimary;
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const recoilOffset = recoil * 5.5;

    if (defId === 'archer') {
      // Wooden watchtower cylinder with timber planks
      ctx.fillStyle = '#7f4f24';
      ctx.fillRect(-13, -19, 26, 18);
      ctx.strokeRect(-13, -19, 26, 18);

      // Balcony battlement rim
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#eab308' : def.colorSecondary;
      ctx.beginPath();
      ctx.ellipse(0, -19, 17, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating Archer / Turret on top
      ctx.save();
      ctx.translate(0, -22);
      ctx.rotate(angle);
      ctx.translate(-recoilOffset, 0);

      // Cloak & Ranger shoulders
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#ca8a04' : '#1b4332';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ranger Hooded Head
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#fde047' : '#2f9e44';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bow or Sniper Crossbow
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(8, 0, 11, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();

      if (tier >= 3 && branch === 'B') {
        // Triple arrow tips for Gatling Volley
        [-5, 0, 5].forEach((oy) => {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(2, oy);
          ctx.lineTo(19, oy);
          ctx.stroke();
        });
      } else {
        // Long Sniper barrel or arrow
        ctx.strokeStyle = tier >= 3 ? '#fde047' : '#ffffff';
        ctx.lineWidth = tier >= 3 ? 3.2 : 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tier >= 3 ? 24 : 20, 0);
        ctx.stroke();
      }

      // Muzzle flash on fire
      if (recoil > 0.6) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(20, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (defId === 'bombard') {
      // Heavy iron fortress dome
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -8, 16.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Magma core glow
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#ff4d6d' : '#ff922b';
      ctx.beginPath();
      ctx.arc(0, -10, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Cannon Barrel
      ctx.save();
      ctx.translate(0, -13);
      ctx.rotate(angle);
      ctx.translate(-recoilOffset * 1.35, 0);

      ctx.fillStyle = tier >= 3 && branch === 'B' ? '#1e293b' : '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      const bw = tier >= 3 && branch === 'B' ? 11.5 : 8.5;
      ctx.beginPath();
      ctx.roundRect(-6, -bw, 25, bw * 2, 4);
      ctx.fill();
      ctx.stroke();

      // Gold brass reinforcement rings
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(13, -bw - 1, 5, bw * 2 + 2);
      if (tier >= 2) {
        ctx.fillRect(3, -bw - 0.5, 3.5, bw * 2 + 1);
      }

      if (recoil > 0.5) {
        ctx.fillStyle = '#ff922b';
        ctx.beginPath();
        ctx.arc(23, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (defId === 'frost') {
      const floatY = Math.sin(time * 3.5) * 3;
      ctx.fillStyle = '#0c8599';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(0, -23);
      ctx.lineTo(13, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Floating Ice Crystal Core
      ctx.save();
      ctx.translate(0, -25 + floatY);
      ctx.fillStyle = '#66d9e8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Orbiting ice shards
      const shardCount = tier >= 3 ? 4 : tier >= 2 ? 3 : 2;
      for (let i = 0; i < shardCount; i++) {
        const a = time * 2.8 + (i * Math.PI * 2) / shardCount;
        const ox = Math.cos(a) * 16;
        const oy = Math.sin(a) * 7.5;
        ctx.fillStyle = '#e3fafc';
        ctx.beginPath();
        ctx.arc(ox, oy, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (defId === 'arcane') {
      // Arcane sanctum spire
      ctx.fillStyle = '#5f3dc4';
      ctx.fillRect(-11.5, -21, 23, 19);
      ctx.strokeRect(-11.5, -21, 23, 19);

      // Gold trim & rune window
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(-13.5, -23, 27, 4.5);
      ctx.fillStyle = '#e0aaff';
      ctx.fillRect(-3.5, -14, 7, 9);

      // Levitating Arcane Orb & Astrolabe Ring
      const hover = Math.sin(time * 4) * 3;
      ctx.save();
      ctx.translate(0, -31 + hover);

      if (tier >= 2) {
        ctx.save();
        ctx.rotate(time * 2.2);
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 6, 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = tier >= 3 && branch === 'B' ? '#f72585' : '#b197fc';
      ctx.strokeStyle = '#f3d9fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (defId === 'barracks') {
      // Castle Bastion fort
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-15, -19, 30, 18);
      ctx.strokeRect(-15, -19, 30, 18);

      // Royal roof
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#f59f00' : '#1971c2';
      ctx.beginPath();
      ctx.moveTo(-19, -19);
      ctx.lineTo(0, -33);
      ctx.lineTo(19, -19);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Arched wooden door
      ctx.fillStyle = '#582f0e';
      ctx.beginPath();
      ctx.arc(0, -1, 7.5, Math.PI, 0);
      ctx.fill();

      // Shield crest
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.arc(0, -19, 4.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (defId === 'alchemist') {
      // Golden Tree & Cauldron Workshop
      ctx.fillStyle = '#7f4f24';
      ctx.fillRect(-12, -16, 24, 15);
      ctx.strokeRect(-12, -16, 24, 15);

      // Bubbling Alchemy Cauldron on top
      ctx.fillStyle = '#2b2d42';
      ctx.beginPath();
      ctx.arc(0, -18, 12.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing green/gold brew inside cauldron
      ctx.fillStyle = tier >= 3 && branch === 'A' ? '#ffd43b' : '#80ed99';
      ctx.beginPath();
      ctx.ellipse(0, -21, 9.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rising bubbles
      const bY = (time * 12) % 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -22 - bY, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -20 - ((bY + 5) % 10), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderSoldier(ctx: CanvasRenderingContext2D, s: SoldierUnit, time: number): void {
    ctx.save();
    ctx.translate(s.x, s.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounce = s.engagedEnemyId === null ? Math.abs(Math.sin(time * 8 + s.uid)) * 3 : 0;
    ctx.translate(0, -bounce);

    const bodyColor =
      s.variant === 'paladin'
        ? '#ffd43b'
        : s.variant === 'valkyrie'
        ? '#f783ac'
        : s.variant === 'spell_knight'
        ? '#38bdf8'
        : '#339af0';

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet visor
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5, -13, 10, 4);

    // Plume on helmet
    ctx.fillStyle = s.variant === 'paladin' ? '#fa5252' : '#ffd43b';
    ctx.beginPath();
    ctx.arc(0, -18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Shield
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#f59f00';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-8 * s.facing, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sword / Spear swing animation
    ctx.save();
    ctx.translate(7 * s.facing, -8);
    const swingAngle = s.swingAnim > 0 ? Math.sin(s.swingAnim * Math.PI) * 1.2 * s.facing : 0;
    ctx.rotate(swingAngle);
    ctx.strokeStyle = s.variant === 'valkyrie' ? '#fde047' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8 * s.facing, -11);
    ctx.stroke();
    ctx.restore();

    // Soldier HP bar
    if (s.hp < s.maxHp) {
      const w = 22;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(-w / 2, -26, w, 4);
      ctx.fillStyle = '#51cf66';
      ctx.fillRect(-w / 2, -26, w * Math.max(0, s.hp / s.maxHp), 4);
    }

    ctx.restore();
  }

  public renderEnemy(ctx: CanvasRenderingContext2D, e: ActiveEnemy, time: number): void {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Shadow on ground
    const shadowY = e.isFlying ? 22 : 5;
    const shadowScale = e.isFlying ? 0.75 : 1.0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(
      0,
      shadowY,
      e.radius * 0.95 * shadowScale,
      e.radius * 0.52 * shadowScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Bounce / Flight offset
    const hop = e.isFlying
      ? Math.sin(time * 7 + e.walkPhase) * 5 - 14
      : -Math.abs(Math.sin(time * 6.5 + e.walkPhase)) * (e.isBoss ? 3 : 5);

    ctx.translate(0, hop);

    // Squash & stretch
    const sx = 1 + e.squash * 0.28;
    const sy = 1 - e.squash * 0.22;
    ctx.scale(sx, sy);

    this.drawEnemyArt(ctx, e.defId, e.radius, e.facingX, e.hitFlash > 0, e.goldTouch, time);

    // Status Effect Overlays
    if (e.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(102, 217, 232, 0.48)';
      ctx.strokeStyle = '#e3fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-e.radius - 3, -e.radius - 6, (e.radius + 3) * 2, (e.radius + 4) * 2, 6);
      ctx.fill();
      ctx.stroke();
    } else if (e.slowTimer > 0) {
      ctx.strokeStyle = '#66d9e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -e.radius * 0.3, e.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.acidTimer > 0) {
      ctx.fillStyle = '#80ed99';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.5, -e.radius, 3, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.6, -e.radius * 0.7, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.burnTimer > 0) {
      ctx.fillStyle = '#ff922b';
      ctx.beginPath();
      ctx.arc(0, -e.radius - 3, 4 + Math.sin(time * 18) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Energy Shield bubble
    if (e.shield > 0) {
      ctx.strokeStyle = 'rgba(114, 9, 183, 0.75)';
      ctx.fillStyle = 'rgba(224, 170, 255, 0.22)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -e.radius * 0.35, e.radius + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Health Bar & Shield Bar
    if (e.hp < e.maxHp || e.shield > 0 || e.isBoss) {
      ctx.save();
      ctx.translate(e.x, e.y + hop - e.radius - (e.isBoss ? 18 : 12));
      const barW = e.isBoss ? 68 : Math.max(24, e.radius * 1.8);
      const barH = e.isBoss ? 7 : 4.5;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-barW / 2 - 1, -1, barW + 2, barH + 2);

      const hpRatio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = e.isBoss
        ? '#ff4d6d'
        : hpRatio > 0.5
        ? '#51cf66'
        : hpRatio > 0.25
        ? '#fcc419'
        : '#ff6b6b';
      ctx.fillRect(-barW / 2, 0, barW * hpRatio, barH);

      if (e.maxShield > 0 && e.shield > 0) {
        const shRatio = Math.max(0, e.shield / e.maxShield);
        ctx.fillStyle = '#e0aaff';
        ctx.fillRect(-barW / 2, -4, barW * shRatio, 3);
      }
      ctx.restore();
    }
  }

  public drawEnemyArt(
    ctx: CanvasRenderingContext2D,
    defId: string,
    r: number,
    facingX: number,
    hitFlash: boolean,
    goldTouch: boolean,
    time: number
  ): void {
    const def = ENEMY_MAP[defId as keyof typeof ENEMY_MAP];
    const dir = facingX >= 0 ? 1 : -1;

    // Flying Wings
    if (def.isFlying) {
      const wingFlap = Math.sin(time * 18) * 0.45;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * r * 0.6, -r * 0.5);
        ctx.rotate(side * (0.4 + wingFlap));
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(side * 8, -2, 11, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    // Main Gummy/Slime Body
    ctx.fillStyle = hitFlash ? '#ffffff' : goldTouch ? '#ffd43b' : def.colorBody;
    ctx.strokeStyle = hitFlash ? '#ffffff' : def.colorOutline;
    ctx.lineWidth = def.isBoss ? 3.2 : 2.2;

    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r, Math.PI * 0.88, Math.PI * 0.12, false);
    ctx.quadraticCurveTo(r * 0.9, r * 0.35, 0, r * 0.35);
    ctx.quadraticCurveTo(
      -r * 0.9,
      r * 0.35,
      Math.cos(Math.PI * 0.88) * r,
      -r * 0.35 + Math.sin(Math.PI * 0.88) * r
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glossy Jelly Highlight
    if (!hitFlash) {
      ctx.fillStyle = def.colorHighlight;
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.72, r * 0.35, r * 0.18, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Special Armor Helmet for iron_shell
    if (defId === 'iron_shell') {
      ctx.fillStyle = '#adb5bd';
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.55, r * 0.95, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -r * 1.45);
      ctx.lineTo(0, -r * 1.9);
      ctx.lineTo(4, -r * 1.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Royal Crown for honey_queen or king_behemoth
    if (defId === 'honey_queen' || defId === 'king_behemoth') {
      ctx.fillStyle = '#ffd43b';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      const cw = r * 0.65;
      const cy = -r * 1.25;
      ctx.beginPath();
      ctx.moveTo(-cw, cy);
      ctx.lineTo(-cw * 0.8, cy - 10);
      ctx.lineTo(-cw * 0.3, cy - 4);
      ctx.lineTo(0, cy - 13);
      ctx.lineTo(cw * 0.3, cy - 4);
      ctx.lineTo(cw * 0.8, cy - 10);
      ctx.lineTo(cw, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Expressive Eyes
    const eyeOffsetX = dir * r * 0.18;
    const eyeY = -r * 0.32;
    const eyeSpread = r * 0.34;
    [-1, 1].forEach((side) => {
      const ex = eyeOffsetX + side * eyeSpread;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, eyeY, r * 0.24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(ex + dir * 1.5, eyeY, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderHazard(ctx: CanvasRenderingContext2D, h: GroundHazard, time: number): void {
    ctx.save();
    ctx.translate(h.x, h.y);
    const alpha = Math.min(1, h.duration / 0.8) * 0.55;
    if (h.type === 'acid') {
      ctx.fillStyle = `rgba(81, 207, 102, ${alpha})`;
      ctx.strokeStyle = `rgba(183, 244, 158, ${alpha + 0.2})`;
    } else if (h.type === 'lava') {
      ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
      ctx.strokeStyle = `rgba(255, 212, 59, ${alpha + 0.2})`;
    } else {
      ctx.fillStyle = `rgba(102, 217, 232, ${alpha})`;
      ctx.strokeStyle = `rgba(227, 250, 252, ${alpha + 0.2})`;
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.radius, h.radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const bx = Math.cos(time * 3 + i * 2.1) * h.radius * 0.5;
      const by = Math.sin(time * 4 + i * 2.1) * h.radius * 0.35;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderVoidBeam(
    ctx: CanvasRenderingContext2D,
    tower: ActiveTower,
    target: ActiveEnemy,
    time: number
  ): void {
    ctx.save();
    const startX = tower.x;
    const startY = tower.y - 30;
    const endX = target.x;
    const endY = target.y - target.radius * 0.4;

    const width = 4 + Math.min(8, tower.beamRampTime * 2.5) + Math.sin(time * 30) * 1.5;

    ctx.strokeStyle = 'rgba(247, 37, 133, 0.35)';
    ctx.lineWidth = width + 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = '#f72585';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, width * 0.4);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = '#f72585';
    ctx.beginPath();
    ctx.arc(endX, endY, width + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderProjectile(ctx: CanvasRenderingContext2D, p: Projectile, time: number): void {
    ctx.save();

    if (p.arcHeight > 0) {
      const gx = p.startX + (p.targetX - p.startX) * p.progress;
      const gy = p.startY + (p.targetY - p.startY) * p.progress;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(p.x, p.y);
    const angle = Math.atan2(p.vy, p.vx);

    if (p.type === 'arrow' || p.type === 'snipe_bolt' || p.type === 'valkyrie_spear') {
      ctx.rotate(angle);
      ctx.strokeStyle =
        p.type === 'snipe_bolt' || p.type === 'valkyrie_spear' ? '#ffd43b' : '#f8f9fa';
      ctx.lineWidth = p.type === 'snipe_bolt' ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(4, -4);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'glacial_lance') {
      ctx.rotate(angle);
      ctx.fillStyle = '#66d9e8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.type === 'bomb' || p.type === 'cluster_mini' || p.type === 'meteor') {
      const r = p.type === 'meteor' ? 13 : p.type === 'bomb' ? 8.5 : 6;
      ctx.fillStyle = p.type === 'meteor' ? '#ff4d6d' : '#212529';
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff922b';
      ctx.beginPath();
      ctx.arc(-r * 0.6, -r * 0.6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'alch_flask') {
      ctx.rotate(time * 10);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(-2.5, -7, 5, 4);
    } else {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderLightning(ctx: CanvasRenderingContext2D, bolt: LightningBolt): void {
    if (bolt.points.length < 2) return;
    ctx.save();
    const alpha = bolt.life / bolt.maxLife;
    ctx.strokeStyle = bolt.color;
    ctx.lineWidth = bolt.width * alpha + 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    bolt.points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, bolt.width * 0.45 * alpha);
    ctx.stroke();
    ctx.restore();
  }

  private renderParticle(ctx: CanvasRenderingContext2D, pt: Particle): void {
    ctx.save();
    const t = 1 - pt.life / pt.maxLife;
    const size = pt.size + (pt.endSize - pt.size) * t;
    const alpha = Math.max(0, (pt.life / pt.maxLife) * pt.alpha);
    ctx.globalAlpha = alpha;
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rotation);

    if (pt.shape === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, size), 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.shape === 'star') {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const rOuter = size;
        const rInner = size * 0.45;
        ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * rInner, Math.sin(a + Math.PI / 5) * rInner);
      }
      ctx.closePath();
      ctx.fill();
    } else if (pt.shape === 'spark') {
      ctx.fillStyle = pt.color;
      ctx.fillRect(-size, -size * 0.35, size * 2, size * 0.7);
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderRallyFlag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255, 212, 59, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8f9fa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(0, -20);
    ctx.stroke();

    const wave = Math.sin(time * 8) * 2;
    ctx.fillStyle = '#339af0';
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(15, -15 + wave);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private renderPlacementGhost(
    ctx: CanvasRenderingContext2D,
    towerId: TowerId,
    x: number,
    y: number,
    canPlace: boolean,
    onRunePad: boolean,
    time: number
  ): void {
    const def = TOWER_MAP[towerId];
    const effectiveRange = onRunePad ? Math.round(def.range * 1.15) : def.range;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = canPlace ? 'rgba(64, 192, 87, 0.16)' : 'rgba(250, 82, 82, 0.22)';
    ctx.strokeStyle = canPlace ? '#40c057' : '#fa5252';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, effectiveRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = canPlace ? 'rgba(64, 192, 87, 0.35)' : 'rgba(250, 82, 82, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    this.drawTowerArt(ctx, towerId, 0, undefined, 0, 0, time);
    ctx.globalAlpha = 1;

    if (onRunePad && canPlace) {
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('✨ルーン台座ボーナス (+射程/速度)', 0, -40);
      ctx.fillText('✨ルーン台座ボーナス (+射程/速度)', 0, -40);
    }

    ctx.restore();
  }

  private renderSpellReticle(
    ctx: CanvasRenderingContext2D,
    spell: 'meteor' | 'reinforce',
    x: number,
    y: number,
    time: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    const radius = spell === 'meteor' ? 115 : 48;
    const color = spell === 'meteor' ? '#ff4d6d' : '#38bdf8';

    ctx.fillStyle =
      spell === 'meteor' ? 'rgba(255, 77, 109, 0.18)' : 'rgba(56, 189, 248, 0.18)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(time * 2);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(radius - 8, 0);
      ctx.lineTo(radius + 8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText): void {
    ctx.save();
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.globalAlpha = alpha;
    ctx.translate(ft.x, ft.y);
    ctx.scale(ft.scale, ft.scale);
    ctx.font = `900 ${ft.size}px "Fredoka", "M PLUS Rounded 1c", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = ft.stroke;
    ctx.lineWidth = 4;
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }
}

export function renderTowerPreviewCanvas(
  canvas: HTMLCanvasElement,
  towerId: TowerId,
  tier = 0,
  branch?: 'A' | 'B'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h * 0.68);
  const scale = Math.min(w, h) / 56;
  ctx.scale(scale, scale);
  const dummyRenderer = new GameRenderer(ctx);
  dummyRenderer.drawTowerArt(ctx, towerId, tier, branch, -0.35, 0, 1.2);
  ctx.restore();
}

export function renderEnemyPreviewCanvas(canvas: HTMLCanvasElement, enemyId: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h * 0.64);
  const def = ENEMY_MAP[enemyId as keyof typeof ENEMY_MAP];
  const scale = Math.min(w, h) / (def?.isBoss ? 72 : 46);
  ctx.scale(scale, scale);
  const dummyRenderer = new GameRenderer(ctx);
  dummyRenderer.drawEnemyArt(ctx, enemyId, def ? def.radius : 14, 1, false, false, 1.0);
  ctx.restore();
}
