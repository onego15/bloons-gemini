export type TargetPriority = 'first' | 'last' | 'strong' | 'close';

export type DamageType = 'physical' | 'explosive' | 'magic' | 'ice' | 'alchemy';

export type TowerId =
  | 'archer'
  | 'bombard'
  | 'frost'
  | 'arcane'
  | 'barracks'
  | 'alchemist';

export type EnemyId =
  | 'red_puff'
  | 'blue_swift'
  | 'green_bouncer'
  | 'yellow_turbo'
  | 'pink_splitter'
  | 'pink_mini'
  | 'iron_shell'
  | 'sky_wyrm'
  | 'honey_queen'
  | 'crystal_guard'
  | 'king_behemoth';

export interface Point {
  x: number;
  y: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  cost: number;
  description: string;
  badge: string;
  branch?: 'A' | 'B';
  // Stat modifiers or overrides
  damageBonus?: number;
  rangeBonus?: number;
  fireRateMultiplier?: number; // < 1 means faster cooldown
  splashBonus?: number;
  pierceBonus?: number;
  critChanceBonus?: number;
  specialTag?: string;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  subtitle: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number; // seconds between shots
  damageType: DamageType;
  canTargetAir: boolean;
  splashRadius: number;
  pierce: number;
  projectileSpeed: number;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  hotkey: string;
  description: string;
  tier1: UpgradeDef;
  tier2: UpgradeDef;
  tier3A: UpgradeDef;
  tier3B: UpgradeDef;
}

export interface ActiveTower {
  uid: number;
  defId: TowerId;
  x: number;
  y: number;
  tier: 0 | 1 | 2 | 3;
  branch?: 'A' | 'B';
  totalInvested: number;
  priority: TargetPriority;
  angle: number;
  cooldownTimer: number;
  recoilAnim: number;
  buildAnim: number;
  upgradeAnim: number;
  totalDamageDealt: number;
  totalKills: number;
  totalGoldGenerated: number;
  onRunePad: boolean;
  // Aura buffs received from nearby Alchemist towers
  buffSpeedMult: number;
  buffDamageMult: number;
  buffRangeAdd: number;
  // For Arcane Tier 3B continuous laser beam
  beamTargetId: number | null;
  beamRampTime: number;
  // For Barracks
  rallyX: number;
  rallyY: number;
  soldierIds: number[];
  respawnTimers: number[];
}

export interface SoldierUnit {
  uid: number;
  parentTowerUid: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackCooldown: number;
  attackTimer: number;
  engagedEnemyId: number | null;
  variant: 'knight' | 'paladin' | 'valkyrie' | 'spell_knight';
  facing: number;
  animTime: number;
  swingAnim: number;
  isTemporary: boolean;
  lifeTimer: number;
  canThrowSpear: boolean;
  spearTimer: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  subtitle: string;
  maxHp: number;
  shield: number;
  speed: number; // pixels per second
  armor: number; // 0 to 0.75 physical damage reduction
  magicResist: number; // 0 to 0.5
  isFlying: boolean;
  isBoss: boolean;
  rewardGold: number;
  lifeCost: number;
  radius: number;
  colorBody: string;
  colorHighlight: string;
  colorOutline: string;
  spawnsOnDeath?: { id: EnemyId; count: number }[];
  healsNearby?: boolean;
  description: string;
}

export interface ActiveEnemy {
  uid: number;
  defId: EnemyId;
  pathIndex: number; // Which path on the map
  waypointIndex: number;
  distanceTraveled: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  armor: number;
  isFlying: boolean;
  isBoss: boolean;
  radius: number;
  // Visual & combat state
  hitFlash: number;
  squash: number;
  walkPhase: number;
  facingX: number;
  // Status effects
  slowTimer: number;
  slowFactor: number; // e.g. 0.45 means 45% slow
  freezeTimer: number;
  brittleTimer: number; // takes +25% damage
  burnTimer: number;
  burnDps: number;
  acidTimer: number; // armor shredded + DoT
  goldTouch: boolean; // drops 2x gold when killed
  shockTimer: number;
  // Barracks engagement
  blockedBySoldierId: number | null;
  meleeAttackTimer: number;
  // Special abilities (e.g. Honey Queen heal pulse)
  abilityTimer: number;
}

export interface Projectile {
  uid: number;
  sourceTowerUid: number;
  type:
    | 'arrow'
    | 'snipe_bolt'
    | 'bomb'
    | 'cluster_mini'
    | 'ice_shard'
    | 'glacial_lance'
    | 'arcane_bolt'
    | 'alch_flask'
    | 'valkyrie_spear'
    | 'meteor';
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetEnemyId: number | null;
  vx: number;
  vy: number;
  speed: number;
  progress: number; // 0..1 for parabolic arcs
  arcHeight: number;
  damage: number;
  damageType: DamageType;
  splashRadius: number;
  pierce: number;
  hitEnemyIds: Set<number>;
  crit: boolean;
  // Special effects on impact
  applySlow?: { factor: number; duration: number };
  applyFreeze?: number;
  applyBrittle?: number;
  applyAcid?: number;
  applyBurn?: { dps: number; duration: number };
  applyStun?: number;
  applyGoldTouch?: boolean;
  chainCount?: number;
  clusterCount?: number;
  spawnPuddle?: 'acid' | 'lava' | 'frost_aura';
  color: string;
  trailTimer: number;
}

export interface GroundHazard {
  uid: number;
  type: 'acid' | 'lava' | 'frost_aura';
  x: number;
  y: number;
  radius: number;
  duration: number;
  maxDuration: number;
  dps: number;
  tickTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  endSize: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  shape: 'circle' | 'spark' | 'star' | 'ring' | 'smoke' | 'leaf' | 'coin' | 'snowflake';
  rotation: number;
  vRot: number;
}

export interface LightningBolt {
  points: Point[];
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

export interface GroundDecal {
  x: number;
  y: number;
  radius: number;
  type: 'scorch' | 'frost_ring' | 'slime_splat' | 'holy_crest';
  color: string;
  life: number;
  maxLife: number;
}

export interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  type: 'petal' | 'ember' | 'snow' | 'firefly';
}

export interface StageSaveRecord {
  stars: number; // 0..3
  bestWave: number;
  cleared: boolean;
}

export interface GameSaveData {
  stages: Record<string, StageSaveRecord>;
  totalKillsAllTime: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  stroke: string;
  size: number;
  life: number;
  maxLife: number;
  scale: number;
}

export interface MapDecoration {
  type:
    | 'pine_tree'
    | 'oak_tree'
    | 'cherry_tree'
    | 'crystal_cluster'
    | 'rock'
    | 'flower_patch'
    | 'ruin_pillar'
    | 'mushroom'
    | 'lantern'
    | 'cactus_amber'
    | 'snow_pine';
  x: number;
  y: number;
  scale: number;
  variant: number;
}

export interface WaterFeature {
  type: 'river' | 'lake';
  points: Point[];
  width: number;
  color: string;
  bridgePoints?: { x: number; y: number; angle: number; width: number; length: number }[];
}

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  difficulty: '初級 (NORMAL)' | '中級 (HARD)' | '上級 (EXPERT)';
  difficultyStars: number;
  theme: 'emerald' | 'amber' | 'frost';
  description: string;
  startingGold: number;
  startingLives: number;
  bgGradient: [string, string];
  roadOuterColor: string;
  roadInnerColor: string;
  roadStoneColor: string;
  paths: Point[][]; // Supports 1 or 2 paths!
  runePads: Point[]; // Bonus tactical spots (+15% range, +12% attack speed)
  waterFeatures: WaterFeature[];
  decorations: MapDecoration[];
}

export interface WaveGroup {
  enemyId: EnemyId;
  count: number;
  interval: number; // seconds between spawns in this group
  delayBefore: number; // seconds delay before this group starts
  pathIndex?: number;
}

export interface WaveDef {
  waveNumber: number;
  title: string;
  groups: WaveGroup[];
  rewardGold: number;
}
