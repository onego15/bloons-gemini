import { TowerDef, TowerId, ActiveTower } from '../types';

export const TOWER_LIST: TowerDef[] = [
  {
    id: 'archer',
    name: 'シルヴァン弓兵塔',
    subtitle: '高速単体・対空スナイパー',
    cost: 100,
    damage: 18,
    range: 165,
    cooldown: 0.58,
    damageType: 'physical',
    canTargetAir: true,
    splashRadius: 0,
    pierce: 1,
    projectileSpeed: 640,
    colorPrimary: '#2f9e44',
    colorSecondary: '#74c69d',
    colorAccent: '#ffd166',
    hotkey: '1',
    description:
      '森の精霊弓兵が素早く矢を放つ基本タワー。地上・飛行の両方を狙え、コストパフォーマンスに優れる。',
    tier1: {
      id: 'archer_t1',
      name: '鋭利な風切り羽',
      cost: 75,
      description: '攻撃力+8、矢が敵を1体貫通(計2体ヒット)するようになる。',
      badge: '貫通+1',
      damageBonus: 8,
      pierceBonus: 1,
    },
    tier2: {
      id: 'archer_t2',
      name: '双弦の連射弓',
      cost: 130,
      description: '攻撃速度+30%、射程+25、クリティカル率15%を獲得。',
      badge: '連射強化',
      damageBonus: 6,
      rangeBonus: 25,
      fireRateMultiplier: 0.72,
      critChanceBonus: 0.15,
    },
    tier3A: {
      id: 'archer_t3a',
      name: '鷹の目スナイパー',
      cost: 270,
      branch: 'A',
      description:
        '【極大射程・装甲貫通】超高速の狙撃矢を放ち、40%の確率で2.5倍クリティカル！物理装甲も無視する。',
      badge: '★必殺狙撃',
      damageBonus: 48,
      rangeBonus: 95,
      fireRateMultiplier: 1.05,
      critChanceBonus: 0.25,
      pierceBonus: 1,
      specialTag: 'sniper_crit',
    },
    tier3B: {
      id: 'archer_t3b',
      name: '疾風の三連ガトリング',
      cost: 260,
      branch: 'B',
      description:
        '【超連射・3方向同時発射】一度に3本の矢を扇状に超高速連射し、群がる敵を瞬く間に蜂の巣にする！',
      badge: '★3連射弾幕',
      damageBonus: 8,
      rangeBonus: 15,
      fireRateMultiplier: 0.56,
      specialTag: 'triple_shot',
    },
  },
  {
    id: 'bombard',
    name: '紅蓮ボンバード砲',
    subtitle: '範囲爆撃・対アーマー破砕',
    cost: 140,
    damage: 34,
    range: 150,
    cooldown: 1.45,
    damageType: 'explosive',
    canTargetAir: false,
    splashRadius: 58,
    pierce: 99,
    projectileSpeed: 340,
    colorPrimary: '#e8590c',
    colorSecondary: '#ff922b',
    colorAccent: '#ffe066',
    hotkey: '2',
    description:
      '放物線を描く榴弾を発射し、着弾地点の地上敵を一網打尽にする重砲塔。密集した敵や装甲持ちに絶大な効果。',
    tier1: {
      id: 'bombard_t1',
      name: '黒色火薬増量',
      cost: 95,
      description: '爆発ダメージ+16、爆発範囲+16px拡大。',
      badge: '爆風拡大',
      damageBonus: 16,
      splashBonus: 16,
    },
    tier2: {
      id: 'bombard_t2',
      name: '破砕榴弾＆連装填',
      cost: 160,
      description: '発射速度+25%、射程+20、着弾時に敵の物理装甲を5秒間融解させる。',
      badge: '装甲破砕',
      damageBonus: 18,
      rangeBonus: 20,
      fireRateMultiplier: 0.78,
      specialTag: 'shred_armor',
    },
    tier3A: {
      id: 'bombard_t3a',
      name: 'クラスター火山砲',
      cost: 310,
      branch: 'A',
      description:
        '【分裂爆弾＋マグマ地帯】着弾時に5個の小型マグマ爆弾が周囲に飛び散り、燃焼ダメージを与える！',
      badge: '★分裂マグマ',
      damageBonus: 28,
      splashBonus: 14,
      specialTag: 'cluster_volcano',
    },
    tier3B: {
      id: 'bombard_t3b',
      name: '巨神メガシージ砲',
      cost: 320,
      branch: 'B',
      description:
        '【超広範囲＋気絶スタン】巨大な震撃砲弾を放ち、広範囲の敵を1.1秒間スタン(完全停止)させる！',
      badge: '★衝撃波スタン',
      damageBonus: 65,
      rangeBonus: 35,
      splashBonus: 32,
      specialTag: 'mega_stun',
    },
  },
  {
    id: 'frost',
    name: '氷晶フロストスピア',
    subtitle: '減速デバフ・氷結コントロール',
    cost: 120,
    damage: 14,
    range: 145,
    cooldown: 0.95,
    damageType: 'ice',
    canTargetAir: true,
    splashRadius: 48,
    pierce: 99,
    projectileSpeed: 480,
    colorPrimary: '#1098ad',
    colorSecondary: '#66d9e8',
    colorAccent: '#e3fafc',
    hotkey: '3',
    description:
      '冷気の結晶弾で周囲の敵を35%減速させる氷の魔導塔。高速な敵の足止めや他タワーとのコンボに不可欠。',
    tier1: {
      id: 'frost_t1',
      name: '万年氷のコア',
      cost: 85,
      description: '減速効果が35%→50%に強化され、持続時間が4秒に延長。射程+15。',
      badge: '強鈍足50%',
      damageBonus: 8,
      rangeBonus: 15,
      specialTag: 'deep_chill',
    },
    tier2: {
      id: 'frost_t2',
      name: '砕氷のプリズム',
      cost: 145,
      description:
        '冷気を浴びた敵を「脆弱化」させ、あらゆる攻撃から受けるダメージを+25%増加させる！',
      badge: '被ダメ+25%',
      damageBonus: 10,
      rangeBonus: 15,
      fireRateMultiplier: 0.82,
      specialTag: 'brittle_debuff',
    },
    tier3A: {
      id: 'frost_t3a',
      name: '絶対零度ブリザード',
      cost: 280,
      branch: 'A',
      description:
        '【全方位吹雪パルス】射程内の全敵を同時に攻撃する吹雪を放ち、敵を1.2秒間「完全氷結」させる！',
      badge: '★全体氷結',
      damageBonus: 20,
      rangeBonus: 20,
      fireRateMultiplier: 0.9,
      specialTag: 'blizzard_nova',
    },
    tier3B: {
      id: 'frost_t3b',
      name: '氷槍グレイシャルランス',
      cost: 275,
      branch: 'B',
      description:
        '【直線無限貫通】射程線上を貫く巨大な氷の槍を高速発射し、シールドや重装甲の敵に2倍ダメージ！',
      badge: '★直線氷槍',
      damageBonus: 46,
      rangeBonus: 45,
      fireRateMultiplier: 0.75,
      specialTag: 'glacial_lance',
    },
  },
  {
    id: 'arcane',
    name: '星霊アルカナ魔導塔',
    subtitle: '装甲無視・連鎖ライトニング',
    cost: 160,
    damage: 28,
    range: 160,
    cooldown: 0.88,
    damageType: 'magic',
    canTargetAir: true,
    splashRadius: 0,
    pierce: 2,
    projectileSpeed: 560,
    colorPrimary: '#7950f2',
    colorSecondary: '#b197fc',
    colorAccent: '#f3d9fa',
    hotkey: '4',
    description:
      '物理装甲を完全に無視する星霊魔法を放ち、近くの敵もう1体へ連鎖する高火力魔導タワー。',
    tier1: {
      id: 'arcane_t1',
      name: 'エーテル魔力増幅',
      cost: 110,
      description: '魔法ダメージ+14、連鎖数が2体→3体に増加。',
      badge: '3体連鎖',
      damageBonus: 14,
      pierceBonus: 1,
    },
    tier2: {
      id: 'arcane_t2',
      name: '紫電の共鳴クリスタル',
      cost: 175,
      description: '詠唱速度+25%、射程+20、命中した敵に感電ショックを与える。',
      badge: '高速詠唱',
      damageBonus: 14,
      rangeBonus: 20,
      fireRateMultiplier: 0.76,
    },
    tier3A: {
      id: 'arcane_t3a',
      name: '天雷ストームウィーバー',
      cost: 330,
      branch: 'A',
      description:
        '【6体瞬時チェイン雷撃】最大6体の敵を瞬時に駆け巡る稲妻を放ち、群れも強敵も一気に焼き尽くす！',
      badge: '★6連鎖雷撃',
      damageBonus: 28,
      rangeBonus: 25,
      pierceBonus: 3,
      specialTag: 'storm_chain',
    },
    tier3B: {
      id: 'arcane_t3b',
      name: '虚空のサンビーム神殿',
      cost: 350,
      branch: 'B',
      description:
        '【継続照射プリズムレーザー】単体の敵を極太ビームで継続照射し、照射時間に応じて威力が最大3倍に上昇！対ボス決戦兵器。',
      badge: '★収束レーザー',
      damageBonus: 36,
      rangeBonus: 30,
      specialTag: 'void_beam',
    },
  },
  {
    id: 'barracks',
    name: '聖騎士ガーディアン砦',
    subtitle: '兵士召喚・進路ブロッキング',
    cost: 130,
    damage: 16,
    range: 145,
    cooldown: 1.0,
    damageType: 'physical',
    canTargetAir: false,
    splashRadius: 0,
    pierce: 1,
    projectileSpeed: 0,
    colorPrimary: '#1971c2',
    colorSecondary: '#74c0fc',
    colorAccent: '#ffd43b',
    hotkey: '5',
    description:
      '道の上に2名の精霊騎士を派遣し、敵の進行を直接食い止めて近接戦を行う駐屯所！集合地点を自由に変更可能。',
    tier1: {
      id: 'barracks_t1',
      name: 'ミスリル重装鎧',
      cost: 90,
      description: '騎士の最大HP+80、攻撃力+9、非戦闘時のHP自動回復を獲得。',
      badge: '騎士強化',
      damageBonus: 9,
    },
    tier2: {
      id: 'barracks_t2',
      name: '三人小隊＆戦乙女の祝福',
      cost: 155,
      description: '派遣される騎士が2名→3名に増員！さらに再出撃時間が10秒→6秒に短縮。',
      badge: '騎士3名体制',
      damageBonus: 10,
      rangeBonus: 20,
      specialTag: 'three_soldiers',
    },
    tier3A: {
      id: 'barracks_t3a',
      name: '聖堂パラディン騎士団',
      cost: 290,
      branch: 'A',
      description:
        '【超高耐久＋範囲聖光斬】騎士が聖堂パラディンに進化！戦闘中も自己回復し、周囲の敵を薙ぎ払うホーリーストライクを発動！',
      badge: '★聖堂騎士団',
      damageBonus: 22,
      specialTag: 'paladin_order',
    },
    tier3B: {
      id: 'barracks_t3b',
      name: '天空の槍ヴァルキリー',
      cost: 285,
      branch: 'B',
      description:
        '【地上阻止＋対空雷槍投擲】戦乙女ヴァルキリー3名を配備！地上敵を止めつつ、飛行する敵や遠距離の敵に光の槍を投擲する！',
      badge: '★対空戦乙女',
      damageBonus: 20,
      rangeBonus: 30,
      specialTag: 'valkyrie_spear',
    },
  },
  {
    id: 'alchemist',
    name: '黄金樹のアルケミスト',
    subtitle: '周囲バフ・装甲融解・資金生成',
    cost: 150,
    damage: 20,
    range: 145,
    cooldown: 1.25,
    damageType: 'alchemy',
    canTargetAir: true,
    splashRadius: 50,
    pierce: 99,
    projectileSpeed: 420,
    colorPrimary: '#f08c00',
    colorSecondary: '#ffd43b',
    colorAccent: '#b2f2bb',
    hotkey: '6',
    description:
      '敵の装甲を溶かす錬金ポーションを投げつつ、毎ウェーブ終了時にボーナス資金(+25G)を生み出す支援＆攻撃タワー。',
    tier1: {
      id: 'alchemist_t1',
      name: '強酸メルトポーション',
      cost: 95,
      description: '着弾地点に3.5秒間「強酸の水たまり」を生成し、通過する敵の装甲を0にして継続ダメージ！',
      badge: '強酸エリア',
      damageBonus: 10,
      splashBonus: 10,
      specialTag: 'acid_puddle',
    },
    tier2: {
      id: 'alchemist_t2',
      name: '賢者の黄金枝オーラ',
      cost: 165,
      description:
        '射程内の味方タワー全員の攻撃速度+18%・射程+12%！さらに毎ウェーブ報酬が+45Gに増加。',
      badge: '周囲バフ+資金',
      damageBonus: 10,
      rangeBonus: 18,
      fireRateMultiplier: 0.85,
      specialTag: 'aura_buff',
    },
    tier3A: {
      id: 'alchemist_t3a',
      name: '黄金の豊穣神殿',
      cost: 300,
      branch: 'A',
      description:
        '【敵を黄金化＋毎ウェーブ+100G】ポーションが当たった敵を「黄金化(撃破時ゴールド2倍)」し、莫大な富をもたらす！',
      badge: '★黄金錬成',
      damageBonus: 18,
      rangeBonus: 15,
      specialTag: 'gold_cornucopia',
    },
    tier3B: {
      id: 'alchemist_t3b',
      name: '狂乱オーバードライブ工房',
      cost: 315,
      branch: 'B',
      description:
        '【超強化バフ＋3連フラスコ】周囲の味方タワーの攻撃速度+35%・攻撃力+25%！自身も爆発フラスコを3連投する！',
      badge: '★超覚醒バフ',
      damageBonus: 24,
      rangeBonus: 25,
      fireRateMultiplier: 0.72,
      specialTag: 'overdrive_lab',
    },
  },
];

export const TOWER_MAP: Record<TowerId, TowerDef> = Object.fromEntries(
  TOWER_LIST.map((t) => [t.id, t])
) as Record<TowerId, TowerDef>;

export interface ComputedTowerStats {
  damage: number;
  range: number;
  cooldown: number;
  splashRadius: number;
  pierce: number;
  critChance: number;
  canTargetAir: boolean;
  tags: Set<string>;
  waveGoldBonus: number;
}

export function getTowerStats(tower: ActiveTower): ComputedTowerStats {
  const def = TOWER_MAP[tower.defId];
  let damage = def.damage;
  let range = def.range;
  let cooldown = def.cooldown;
  let splashRadius = def.splashRadius;
  let pierce = def.pierce;
  let critChance = 0.05;
  let canTargetAir = def.canTargetAir;
  const tags = new Set<string>();
  let waveGoldBonus = tower.defId === 'alchemist' ? 25 : 0;

  const applyUpgrade = (u: typeof def.tier1) => {
    if (u.damageBonus) damage += u.damageBonus;
    if (u.rangeBonus) range += u.rangeBonus;
    if (u.fireRateMultiplier) cooldown *= u.fireRateMultiplier;
    if (u.splashBonus) splashRadius += u.splashBonus;
    if (u.pierceBonus) pierce += u.pierceBonus;
    if (u.critChanceBonus) critChance += u.critChanceBonus;
    if (u.specialTag) tags.add(u.specialTag);
  };

  if (tower.tier >= 1) applyUpgrade(def.tier1);
  if (tower.tier >= 2) {
    applyUpgrade(def.tier2);
    if (tower.defId === 'alchemist') waveGoldBonus = 45;
  }
  if (tower.tier >= 3) {
    if (tower.branch === 'B') {
      applyUpgrade(def.tier3B);
    } else {
      applyUpgrade(def.tier3A);
    }
    if (tower.defId === 'alchemist' && tower.branch === 'A') {
      waveGoldBonus = 100;
    } else if (tower.defId === 'alchemist' && tower.branch === 'B') {
      waveGoldBonus = 55;
    }
    if (tower.defId === 'barracks' && tower.branch === 'B') {
      canTargetAir = true;
    }
  }

  // Apply Rune Pad bonus (+15% range, +12% attack speed)
  if (tower.onRunePad) {
    range = Math.round(range * 1.15);
    cooldown *= 0.88;
  }

  // Apply Alchemist Aura buffs
  damage = Math.round(damage * tower.buffDamageMult);
  range = Math.round(range + tower.buffRangeAdd);
  cooldown = cooldown / tower.buffSpeedMult;

  return {
    damage,
    range,
    cooldown: Math.max(0.12, cooldown),
    splashRadius,
    pierce,
    critChance,
    canTargetAir,
    tags,
    waveGoldBonus,
  };
}
