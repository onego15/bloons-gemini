import { WaveDef, EnemyId } from '../types';

export const CAMPAIGN_WAVES: WaveDef[] = [
  {
    waveNumber: 1,
    title: '第1波：森の小さな斥候たち',
    rewardGold: 45,
    groups: [
      { enemyId: 'red_puff', count: 10, interval: 0.85, delayBefore: 0 },
    ],
  },
  {
    waveNumber: 2,
    title: '第2波：青い疾風と2層スライム',
    rewardGold: 55,
    groups: [
      { enemyId: 'red_puff', count: 6, interval: 0.7, delayBefore: 0 },
      { enemyId: 'blue_swift', count: 7, interval: 0.95, delayBefore: 2.0 },
    ],
  },
  {
    waveNumber: 3,
    title: '第3波：弾む緑の行進',
    rewardGold: 65,
    groups: [
      { enemyId: 'blue_swift', count: 8, interval: 0.75, delayBefore: 0 },
      { enemyId: 'green_bouncer', count: 6, interval: 1.05, delayBefore: 2.5 },
    ],
  },
  {
    waveNumber: 4,
    title: '第4波：分裂マザー・ゼリー襲来',
    rewardGold: 75,
    groups: [
      { enemyId: 'green_bouncer', count: 6, interval: 0.85, delayBefore: 0 },
      { enemyId: 'pink_splitter', count: 5, interval: 1.4, delayBefore: 2.0 },
      { enemyId: 'blue_swift', count: 8, interval: 0.55, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 5,
    title: '第5波：鋼鉄の甲殻ゴーレム部隊',
    rewardGold: 85,
    groups: [
      { enemyId: 'iron_shell', count: 5, interval: 1.6, delayBefore: 0 },
      { enemyId: 'yellow_turbo', count: 6, interval: 0.8, delayBefore: 2.2 },
    ],
  },
  {
    waveNumber: 6,
    title: '第6波：蒼穹のクラウド・ワイバーン',
    rewardGold: 95,
    groups: [
      { enemyId: 'sky_wyrm', count: 8, interval: 1.0, delayBefore: 0 },
      { enemyId: 'green_bouncer', count: 8, interval: 0.7, delayBefore: 2.0 },
      { enemyId: 'pink_splitter', count: 4, interval: 1.2, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 7,
    title: '第7波：電撃ターボ・ラッシュ！',
    rewardGold: 105,
    groups: [
      { enemyId: 'yellow_turbo', count: 12, interval: 0.55, delayBefore: 0 },
      { enemyId: 'iron_shell', count: 5, interval: 1.3, delayBefore: 2.0 },
      { enemyId: 'yellow_turbo', count: 8, interval: 0.5, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 8,
    title: '第8波：甘き癒やしのハニー・シャーマン',
    rewardGold: 115,
    groups: [
      { enemyId: 'iron_shell', count: 4, interval: 1.2, delayBefore: 0 },
      { enemyId: 'honey_queen', count: 3, interval: 2.2, delayBefore: 1.0 },
      { enemyId: 'pink_splitter', count: 7, interval: 1.0, delayBefore: 1.5 },
      { enemyId: 'sky_wyrm', count: 6, interval: 0.9, delayBefore: 2.0 },
    ],
  },
  {
    waveNumber: 9,
    title: '第9波：魔力障壁クリスタル・ガーディアン',
    rewardGold: 125,
    groups: [
      { enemyId: 'crystal_guard', count: 4, interval: 2.0, delayBefore: 0 },
      { enemyId: 'yellow_turbo', count: 10, interval: 0.6, delayBefore: 1.5 },
      { enemyId: 'honey_queen', count: 2, interval: 2.5, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 10,
    title: '第10波：【中ボス】大魔王グミ・ベヒーモス顕現！',
    rewardGold: 165,
    groups: [
      { enemyId: 'iron_shell', count: 4, interval: 1.1, delayBefore: 0 },
      { enemyId: 'king_behemoth', count: 1, interval: 3.0, delayBefore: 2.0 },
      { enemyId: 'sky_wyrm', count: 6, interval: 0.9, delayBefore: 3.0 },
    ],
  },
  {
    waveNumber: 11,
    title: '第11波：空陸挟撃の嵐',
    rewardGold: 140,
    groups: [
      { enemyId: 'sky_wyrm', count: 12, interval: 0.65, delayBefore: 0 },
      { enemyId: 'pink_splitter', count: 10, interval: 0.8, delayBefore: 1.5 },
      { enemyId: 'crystal_guard', count: 4, interval: 1.6, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 12,
    title: '第12波：不死身の黄金護衛団',
    rewardGold: 155,
    groups: [
      { enemyId: 'crystal_guard', count: 5, interval: 1.5, delayBefore: 0 },
      { enemyId: 'honey_queen', count: 5, interval: 1.6, delayBefore: 1.0 },
      { enemyId: 'iron_shell', count: 8, interval: 0.9, delayBefore: 1.5 },
      { enemyId: 'yellow_turbo', count: 14, interval: 0.45, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 13,
    title: '第13波：超高速パフ・スタンピード',
    rewardGold: 170,
    groups: [
      { enemyId: 'yellow_turbo', count: 20, interval: 0.35, delayBefore: 0 },
      { enemyId: 'pink_splitter', count: 12, interval: 0.65, delayBefore: 1.5 },
      { enemyId: 'sky_wyrm', count: 14, interval: 0.55, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 14,
    title: '第14波：魔王親衛隊の総進撃',
    rewardGold: 190,
    groups: [
      { enemyId: 'crystal_guard', count: 7, interval: 1.3, delayBefore: 0 },
      { enemyId: 'honey_queen', count: 5, interval: 1.5, delayBefore: 1.2 },
      { enemyId: 'king_behemoth', count: 1, interval: 4.0, delayBefore: 2.0 },
      { enemyId: 'iron_shell', count: 10, interval: 0.8, delayBefore: 2.0 },
    ],
  },
  {
    waveNumber: 15,
    title: '最終第15波：【決戦】双頭のグミ・ベヒーモス大侵攻！',
    rewardGold: 300,
    groups: [
      { enemyId: 'crystal_guard', count: 6, interval: 1.1, delayBefore: 0 },
      { enemyId: 'king_behemoth', count: 1, interval: 5.0, delayBefore: 1.5 },
      { enemyId: 'sky_wyrm', count: 12, interval: 0.55, delayBefore: 2.0 },
      { enemyId: 'honey_queen', count: 4, interval: 1.4, delayBefore: 1.5 },
      { enemyId: 'king_behemoth', count: 1, interval: 5.0, delayBefore: 3.5 },
      { enemyId: 'yellow_turbo', count: 16, interval: 0.38, delayBefore: 1.5 },
    ],
  },
];

export function generateEndlessWave(waveNumber: number): WaveDef {
  const scale = waveNumber - 14;
  const pool: EnemyId[] = [
    'yellow_turbo',
    'pink_splitter',
    'iron_shell',
    'sky_wyrm',
    'honey_queen',
    'crystal_guard',
  ];
  const bossCount = Math.min(5, 1 + Math.floor(scale / 2));

  return {
    waveNumber,
    title: `無限モード 第${waveNumber}波：混沌のオーバーロード`,
    rewardGold: 180 + scale * 20,
    groups: [
      {
        enemyId: pool[waveNumber % pool.length],
        count: 12 + scale * 3,
        interval: Math.max(0.24, 0.55 - scale * 0.02),
        delayBefore: 0,
      },
      {
        enemyId: 'crystal_guard',
        count: 5 + scale * 2,
        interval: 0.9,
        delayBefore: 1.5,
      },
      {
        enemyId: 'king_behemoth',
        count: bossCount,
        interval: Math.max(2.2, 4.5 - scale * 0.2),
        delayBefore: 2.5,
      },
      {
        enemyId: 'sky_wyrm',
        count: 10 + scale * 2,
        interval: 0.45,
        delayBefore: 1.5,
      },
    ],
  };
}
