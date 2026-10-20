import { TowerDefenseGame } from './game';
import { MAP_LIST, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './data/maps';
import { TOWER_LIST, TOWER_MAP, getTowerStats } from './data/towers';
import { ENEMY_LIST } from './data/enemies';
import { renderTowerPreviewCanvas, renderEnemyPreviewCanvas } from './renderer';
import { sound } from './audio';
import { saveManager } from './save';
import { TargetPriority } from './types';

const PRIORITY_NAMES: Record<TargetPriority, string> = {
  first: '先頭優先',
  strong: '高HP優先',
  close: '最寄り優先',
  last: '後方優先',
};

function initApp(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  // DOM Elements
  const elMapName = document.getElementById('hud-map-name')!;
  const elLives = document.getElementById('hud-lives')!;
  const elGold = document.getElementById('hud-gold')!;
  const elWave = document.getElementById('hud-wave')!;
  const elWavePreviewIcons = document.getElementById('wave-preview-icons')!;
  const btnStartWave = document.getElementById('btn-start-wave') as HTMLButtonElement;
  const btnSpeed = document.getElementById('btn-speed')!;
  const elSpeedLabel = document.getElementById('speed-label')!;
  const btnAutoWave = document.getElementById('btn-autowave')!;
  const elAutoWaveLabel = document.getElementById('autowave-label')!;
  const btnPause = document.getElementById('btn-pause')!;
  const btnSfx = document.getElementById('btn-sfx')!;
  const btnBgm = document.getElementById('btn-bgm')!;

  const elWaveBanner = document.getElementById('wave-banner')!;
  const elBannerTitle = document.getElementById('banner-title')!;
  const elBannerSub = document.getElementById('banner-subtitle')!;

  const elActionHint = document.getElementById('action-hint-banner')!;
  const elActionHintText = document.getElementById('action-hint-text')!;
  const btnCancelAction = document.getElementById('btn-cancel-action')!;

  // Inspector Elements
  const elInspector = document.getElementById('inspector-panel')!;
  const elInsIcon = document.getElementById('inspector-icon') as HTMLCanvasElement;
  const elInsName = document.getElementById('inspector-name')!;
  const elInsTier = document.getElementById('inspector-tier-badge')!;
  const elInsBuffs = document.getElementById('inspector-buffs')!;
  const elInsDmg = document.getElementById('ins-dmg')!;
  const elInsCd = document.getElementById('ins-cd')!;
  const elInsRng = document.getElementById('ins-rng')!;
  const elInsKills = document.getElementById('ins-kills')!;
  const btnPriority = document.getElementById('btn-priority')!;
  const elPriorityLabel = document.getElementById('priority-label')!;
  const btnRally = document.getElementById('btn-rally')!;
  const elInsUpgrades = document.getElementById('inspector-upgrades')!;
  const btnSellTower = document.getElementById('btn-sell-tower')!;
  const elSellRefund = document.getElementById('sell-refund')!;
  const btnCloseInspector = document.getElementById('btn-close-inspector')!;

  // Modals
  const modalStageSelect = document.getElementById('modal-stage-select')!;
  const elStageCardsContainer = document.getElementById('stage-cards-container')!;
  const btnStageSelect = document.getElementById('btn-stage-select')!;
  const btnCloseStageModal = document.getElementById('btn-close-stage-modal')!;

  const modalCodex = document.getElementById('modal-codex')!;
  const btnCodex = document.getElementById('btn-codex')!;
  const btnOpenCodexFromTitle = document.getElementById('btn-open-codex-from-title')!;
  const btnCloseCodex = document.getElementById('btn-close-codex')!;
  const tabCodexTowers = document.getElementById('tab-codex-towers')!;
  const tabCodexEnemies = document.getElementById('tab-codex-enemies')!;
  const elCodexContent = document.getElementById('codex-content')!;

  const modalGameEnd = document.getElementById('modal-game-end')!;
  const elEndBadge = document.getElementById('end-badge')!;
  const elEndTitle = document.getElementById('end-title')!;
  const elEndDesc = document.getElementById('end-desc')!;
  const elEndStats = document.getElementById('end-stats')!;
  const btnEndStageSelect = document.getElementById('btn-end-stage-select')!;
  const btnEndRetry = document.getElementById('btn-end-retry')!;
  const btnEndEndless = document.getElementById('btn-end-endless') as HTMLButtonElement;

  let bannerTimeout: number | null = null;
  let lastPreviewWaveNum = -1;

  const game = new TowerDefenseGame(canvas, {
    onUiUpdate: () => syncUI(),
    onWaveBanner: (title, sub) => {
      elBannerTitle.textContent = title;
      elBannerSub.textContent = sub;
      elWaveBanner.classList.remove('hidden');
      if (bannerTimeout) clearTimeout(bannerTimeout);
      bannerTimeout = window.setTimeout(() => {
        elWaveBanner.classList.add('hidden');
      }, 2800);
    },
    onGameEndModal: (type) => {
      modalGameEnd.classList.remove('hidden');
      const totalKills = game.towers.reduce((acc, t) => acc + t.totalKills, 0);
      const totalDmg = game.towers.reduce((acc, t) => acc + t.totalDamageDealt, 0);

      if (type === 'victory') {
        const starStr = '⭐'.repeat(game.lastEarnedStars || 3);
        elEndBadge.textContent = starStr;
        elEndTitle.textContent = 'STAGE CLEAR!';
        elEndDesc.textContent = `見事、「${game.currentMap.name}」の全15ウェーブを防衛し抜きました！（クリア記録が自動保存されました）`;
        btnEndEndless.classList.remove('hidden');
      } else {
        elEndBadge.textContent = '💔';
        elEndTitle.textContent = 'DEFENSE FAILED...';
        elEndDesc.textContent = `WAVE ${game.waveNumber} で王国のクリスタルが突破されました。タワーの配置やルーン台座・分岐進化を組み合わせて再挑戦しましょう！`;
        btnEndEndless.classList.add('hidden');
      }

      elEndStats.innerHTML = `
        <div>到達WAVE: <span style="color:#38bdf8">${game.waveNumber}</span></div>
        <div>総撃破数: <span style="color:#4ade80">${totalKills}体</span></div>
        <div>総ダメージ: <span style="color:#ffd43b">${totalDmg.toLocaleString()}</span></div>
      `;
    },
  });
  game.loadMap(MAP_LIST[0]);

  // Build Tower Shop Cards
  const elTowerShopList = document.getElementById('tower-shop-list')!;
  TOWER_LIST.forEach((tDef) => {
    const btn = document.createElement('button');
    btn.className = 'tower-shop-card';
    btn.id = `shop-card-${tDef.id}`;
    btn.title = `${tDef.name}: ${tDef.description}`;

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 56;
    iconCanvas.height = 56;
    renderTowerPreviewCanvas(iconCanvas, tDef.id, 0);

    const info = document.createElement('div');
    info.className = 'tsc-info';
    info.innerHTML = `
      <span class="tsc-name">${tDef.name}</span>
      <span class="tsc-sub">${tDef.subtitle}</span>
      <span class="tsc-cost">🪙 ${tDef.cost}G</span>
    `;

    const keyBadge = document.createElement('span');
    keyBadge.className = 'key-badge';
    keyBadge.textContent = tDef.hotkey;

    btn.appendChild(iconCanvas);
    btn.appendChild(info);
    btn.appendChild(keyBadge);

    btn.addEventListener('click', () => {
      game.selectTowerToBuild(tDef.id);
    });

    elTowerShopList.appendChild(btn);
  });

  // Build Stage Selection Cards
  function renderStageCards(): void {
    elStageCardsContainer.innerHTML = '';
    MAP_LIST.forEach((m) => {
      const rec = saveManager.getStageRecord(m.id);
      const clearBadge = rec.cleared
        ? `<span style="color:#ffd43b; font-weight:800;">🏆 クリア済 (${'★'.repeat(rec.stars)}${'☆'.repeat(3 - rec.stars)})</span>`
        : rec.bestWave > 0
        ? `<span style="color:#7dd3fc;">最高到達: WAVE ${rec.bestWave}</span>`
        : `<span style="color:#94a3b8;">未プレイ</span>`;

      const card = document.createElement('div');
      card.className = `stage-card ${game.currentMap.id === m.id ? 'active-stage' : ''}`;
      const stars = '★'.repeat(m.difficultyStars) + '☆'.repeat(3 - m.difficultyStars);
      card.innerHTML = `
        <div class="stage-theme-banner" style="background: linear-gradient(135deg, ${m.bgGradient[0]}, ${m.bgGradient[1]})">
          <span>${m.subtitle}</span>
          <span class="stage-diff">${stars} ${m.difficulty}</span>
        </div>
        <h3>${m.name}</h3>
        <div style="font-size:11.5px; margin-top:-4px;">${clearBadge}</div>
        <p>${m.description}</p>
        <div style="font-size:11.5px; color:#94a3b8; font-weight:700;">
          初期資金: <span style="color:#ffd43b">${m.startingGold}G</span> ／ 初期ライフ: <span style="color:#fda4af">❤️${m.startingLives}</span> ／ ルート数: <span style="color:#38bdf8">${m.paths.length}本</span>
        </div>
        <button class="stage-play-btn">このステージで出撃！</button>
      `;
      card.addEventListener('click', () => {
        sound.initOnUserGesture();
        game.loadMap(m);
        lastPreviewWaveNum = -1;
        syncUI();
        modalStageSelect.classList.add('hidden');
      });
      elStageCardsContainer.appendChild(card);
    });
  }

  // Build Codex Content
  function renderCodex(tab: 'towers' | 'enemies'): void {
    elCodexContent.innerHTML = '';
    if (tab === 'towers') {
      tabCodexTowers.classList.add('active');
      tabCodexEnemies.classList.remove('active');
      TOWER_LIST.forEach((t) => {
        const entry = document.createElement('div');
        entry.className = 'codex-entry';
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        renderTowerPreviewCanvas(c, t.id, 3, 'A');
        entry.innerHTML = `
          <div class="codex-entry-body">
            <h4>${t.name} <span style="font-size:12px; color:#fde047;">(${t.cost}G)</span></h4>
            <div class="codex-entry-sub">${t.subtitle} ｜ 射程:${t.range} / 対空:${t.canTargetAir ? '〇' : '×'}</div>
            <p>${t.description}</p>
            <div style="margin-top:6px; font-size:11px; color:#a5f3fc;">
              <strong>👑極A: ${t.tier3A.name}</strong> — ${t.tier3A.description}<br/>
              <strong>👑極B: ${t.tier3B.name}</strong> — ${t.tier3B.description}
            </div>
          </div>
        `;
        entry.prepend(c);
        elCodexContent.appendChild(entry);
      });
    } else {
      tabCodexEnemies.classList.add('active');
      tabCodexTowers.classList.remove('active');
      ENEMY_LIST.forEach((e) => {
        const entry = document.createElement('div');
        entry.className = 'codex-entry';
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        renderEnemyPreviewCanvas(c, e.id);
        entry.innerHTML = `
          <div class="codex-entry-body">
            <h4>${e.name} <span style="font-size:12px; color:#4ade80;">(+${e.rewardGold}G)</span></h4>
            <div class="codex-entry-sub">${e.subtitle} ｜ HP:${e.maxHp}${e.shield ? ` (+障壁${e.shield})` : ''} / 速度:${e.speed}</div>
            <p>${e.description}</p>
          </div>
        `;
        entry.prepend(c);
        elCodexContent.appendChild(entry);
      });
    }
  }

  function updateWavePreview(): void {
    const nextWave = game.getNextWaveDef();
    if (lastPreviewWaveNum === nextWave.waveNumber) return;
    lastPreviewWaveNum = nextWave.waveNumber;

    elWavePreviewIcons.innerHTML = '';
    // Aggregate counts by enemyId
    const counts = new Map<string, number>();
    for (const g of nextWave.groups) {
      counts.set(g.enemyId, (counts.get(g.enemyId) || 0) + g.count);
    }

    counts.forEach((cnt, enemyId) => {
      const chip = document.createElement('div');
      chip.className = 'preview-enemy-chip';
      const c = document.createElement('canvas');
      c.width = 28;
      c.height = 28;
      renderEnemyPreviewCanvas(c, enemyId);
      const span = document.createElement('span');
      span.textContent = `×${cnt}`;
      chip.appendChild(c);
      chip.appendChild(span);
      elWavePreviewIcons.appendChild(chip);
    });
  }

  function syncUI(): void {
    elMapName.textContent = game.currentMap.name;
    elLives.textContent = `${game.lives}`;
    elGold.textContent = `${game.gold}`;
    elWave.textContent = game.endlessMode
      ? `${game.waveNumber} (無限)`
      : `${game.waveNumber} / ${game.maxCampaignWaves}`;

    updateWavePreview();

    // Start Wave CTA Button state
    if (!game.isWaveActive) {
      btnStartWave.disabled = false;
      btnStartWave.innerHTML = `⚔️ WAVE ${game.waveNumber + 1} 開始 <span class="hotkey-hint">[SPACE]</span>`;
    } else if (game.canCallWaveEarly()) {
      btnStartWave.disabled = false;
      btnStartWave.innerHTML = `⚡ 次波を早期開始 (+15G) <span class="hotkey-hint">[SPACE]</span>`;
    } else {
      btnStartWave.disabled = true;
      btnStartWave.innerHTML = `🔥 WAVE ${game.waveNumber} 迎撃中...`;
    }

    // Tower Shop Cards affordability & active state
    TOWER_LIST.forEach((tDef) => {
      const card = document.getElementById(`shop-card-${tDef.id}`);
      if (!card) return;
      card.classList.toggle('unaffordable', game.gold < tDef.cost);
      card.classList.toggle('selected-to-build', game.placingTowerId === tDef.id);
    });

    // Action Mode Hint Banner
    if (game.placingTowerId) {
      const def = TOWER_MAP[game.placingTowerId];
      elActionHint.classList.remove('hidden');
      elActionHintText.textContent = `【${def.name}】を配置する場所をクリックしてください（青いルーン台座でボーナス！ / 右クリック・ESCで解除）`;
    } else if (game.settingRallyForUid !== null) {
      elActionHint.classList.remove('hidden');
      elActionHintText.textContent = `🚩 騎士たちが待機する道の上をクリックしてください`;
    } else if (game.activeSpellTargeting) {
      const spName = game.spells[game.activeSpellTargeting].name;
      elActionHint.classList.remove('hidden');
      elActionHintText.textContent = `✨【${spName}】を発動する目標地点をクリックしてください`;
    } else {
      elActionHint.classList.add('hidden');
    }

    // Sync Inspector Panel
    const selTower = game.towers.find((t) => t.uid === game.selectedTowerUid) || null;
    if (!selTower) {
      elInspector.classList.add('hidden');
    } else {
      elInspector.classList.remove('hidden');
      const def = TOWER_MAP[selTower.defId];
      const stats = getTowerStats(selTower);

      renderTowerPreviewCanvas(elInsIcon, selTower.defId, selTower.tier, selTower.branch);
      elInsName.textContent = def.name;

      if (selTower.tier === 0) elInsTier.textContent = 'Tier 0 基本形態';
      else if (selTower.tier === 1) elInsTier.textContent = `★ Tier 1：${def.tier1.name}`;
      else if (selTower.tier === 2) elInsTier.textContent = `★★ Tier 2：${def.tier2.name}`;
      else {
        const u3 = selTower.branch === 'B' ? def.tier3B : def.tier3A;
        elInsTier.textContent = `👑 究極形態：${u3.name}`;
      }

      // Buff chips
      elInsBuffs.innerHTML = '';
      if (selTower.onRunePad) {
        const chip = document.createElement('span');
        chip.className = 'buff-chip';
        chip.textContent = '✨ルーン台座 (+15%射程/+12%速度)';
        elInsBuffs.appendChild(chip);
      }
      if (selTower.buffSpeedMult > 1.01) {
        const chip = document.createElement('span');
        chip.className = 'buff-chip';
        chip.textContent = `🧪錬金バフ (速度+${Math.round((selTower.buffSpeedMult - 1) * 100)}%)`;
        elInsBuffs.appendChild(chip);
      }

      elInsDmg.textContent = `${stats.damage}`;
      elInsCd.textContent = selTower.defId === 'barracks' ? '兵士駐屯' : `${stats.cooldown.toFixed(2)}s`;
      elInsRng.textContent = `${stats.range}`;
      elInsKills.textContent = `${selTower.totalDamageDealt.toLocaleString()} / ${selTower.totalKills}体`;

      elPriorityLabel.textContent = PRIORITY_NAMES[selTower.priority];
      btnRally.classList.toggle('hidden', selTower.defId !== 'barracks');

      // Upgrades Section
      elInsUpgrades.innerHTML = '';
      if (selTower.tier === 0) {
        elInsUpgrades.appendChild(createUpgradeButton(def.tier1, undefined));
      } else if (selTower.tier === 1) {
        elInsUpgrades.appendChild(createUpgradeButton(def.tier2, undefined));
      } else if (selTower.tier === 2) {
        const branchTitle = document.createElement('div');
        branchTitle.style.fontSize = '11px';
        branchTitle.style.fontWeight = '800';
        branchTitle.style.color = '#ffd43b';
        branchTitle.textContent = '👑 Tier 3 究極進化を選択（どちらか1つ）:';
        elInsUpgrades.appendChild(branchTitle);
        elInsUpgrades.appendChild(createUpgradeButton(def.tier3A, 'A'));
        elInsUpgrades.appendChild(createUpgradeButton(def.tier3B, 'B'));
      } else {
        const maxBox = document.createElement('div');
        maxBox.className = 'max-tier-box';
        const u3 = selTower.branch === 'B' ? def.tier3B : def.tier3A;
        maxBox.innerHTML = `👑 <strong>${u3.name}</strong><br/><span style="font-size:11px; color:#e2e8f0; font-weight:500;">${u3.description}</span>`;
        elInsUpgrades.appendChild(maxBox);
      }

      const refund = Math.round(selTower.totalInvested * 0.75);
      elSellRefund.textContent = `+${refund}G`;
    }
  }

  function createUpgradeButton(
    u: typeof TOWER_LIST[0]['tier1'],
    branch?: 'A' | 'B'
  ): HTMLButtonElement {
    const canAfford = game.gold >= u.cost;
    const btn = document.createElement('button');
    btn.className = `upgrade-card ${canAfford ? '' : 'locked'} ${branch === 'B' ? 'branch-b' : ''}`;
    btn.innerHTML = `
      <div class="upg-top">
        <span class="upg-name">${branch ? `[極${branch}] ` : ''}${u.name}</span>
        <span class="upg-cost">🪙 ${u.cost}G</span>
      </div>
      <div class="upg-desc">${u.description}</div>
    `;
    btn.addEventListener('click', () => {
      game.upgradeSelectedTower(branch);
    });
    return btn;
  }

  function updateSpellCooldownUI(): void {
    (['meteor', 'chrono', 'reinforce'] as const).forEach((id) => {
      const sp = game.spells[id];
      const btn = document.getElementById(`spell-${id}`)!;
      const cdText = document.getElementById(`spell-${id}-cd`)!;
      const overlay = document.getElementById(`spell-${id}-overlay`)!;

      btn.classList.toggle('targeting', game.activeSpellTargeting === id);
      if (sp.cooldown > 0) {
        btn.classList.add('cooling');
        cdText.textContent = `${Math.ceil(sp.cooldown)}s`;
        cdText.style.color = '#fca5a5';
        overlay.style.height = `${(sp.cooldown / sp.maxCooldown) * 100}%`;
      } else {
        btn.classList.remove('cooling');
        cdText.textContent = 'READY';
        cdText.style.color = '#4ade80';
        overlay.style.height = '0%';
      }
    });
  }

  // Canvas Pointer Events
  function getLogicalCoords(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const pt = getLogicalCoords(e);
    game.updateMouseLogicalPos(pt.x, pt.y);
  });

  canvas.addEventListener('click', (e) => {
    const pt = getLogicalCoords(e);
    game.handleCanvasClick(pt.x, pt.y);
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    game.cancelCurrentAction();
  });

  // Top HUD Controls
  btnStartWave.addEventListener('click', () => {
    game.startNextWave();
  });

  btnSpeed.addEventListener('click', () => {
    game.gameSpeed = game.gameSpeed === 1 ? 2 : game.gameSpeed === 2 ? 3 : 1;
    elSpeedLabel.textContent = `${game.gameSpeed}x`;
    btnSpeed.classList.toggle('active', game.gameSpeed > 1);
  });

  btnAutoWave.addEventListener('click', () => {
    game.autoWave = !game.autoWave;
    elAutoWaveLabel.textContent = `自動:${game.autoWave ? 'ON' : 'OFF'}`;
    btnAutoWave.classList.toggle('active', game.autoWave);
  });

  btnPause.addEventListener('click', () => {
    game.isPaused = !game.isPaused;
    btnPause.textContent = game.isPaused ? '▶️' : '⏸️';
    btnPause.classList.toggle('active', game.isPaused);
  });

  btnSfx.addEventListener('click', () => {
    const on = sound.toggleSfx();
    btnSfx.textContent = on ? '🔊' : '🔇';
    btnSfx.classList.toggle('active', on);
  });

  btnBgm.addEventListener('click', () => {
    sound.initOnUserGesture();
    const on = sound.toggleBgm();
    btnBgm.classList.toggle('active', on);
  });

  // Inspector Buttons
  btnPriority.addEventListener('click', () => game.cycleTowerPriority());
  btnRally.addEventListener('click', () => game.startRallyPointMode());
  btnSellTower.addEventListener('click', () => game.sellSelectedTower());
  btnCloseInspector.addEventListener('click', () => {
    game.selectedTowerUid = null;
    syncUI();
  });
  btnCancelAction.addEventListener('click', () => game.cancelCurrentAction());

  // Spells
  document.getElementById('spell-meteor')!.addEventListener('click', () => game.triggerSpellButton('meteor'));
  document.getElementById('spell-chrono')!.addEventListener('click', () => game.triggerSpellButton('chrono'));
  document.getElementById('spell-reinforce')!.addEventListener('click', () => game.triggerSpellButton('reinforce'));

  // Modals
  btnStageSelect.addEventListener('click', () => {
    renderStageCards();
    modalStageSelect.classList.remove('hidden');
  });
  btnCloseStageModal.addEventListener('click', () => {
    sound.initOnUserGesture();
    modalStageSelect.classList.add('hidden');
  });

  btnCodex.addEventListener('click', () => {
    renderCodex('towers');
    modalCodex.classList.remove('hidden');
  });
  btnOpenCodexFromTitle.addEventListener('click', () => {
    renderCodex('towers');
    modalCodex.classList.remove('hidden');
  });
  btnCloseCodex.addEventListener('click', () => modalCodex.classList.add('hidden'));
  tabCodexTowers.addEventListener('click', () => renderCodex('towers'));
  tabCodexEnemies.addEventListener('click', () => renderCodex('enemies'));

  btnEndStageSelect.addEventListener('click', () => {
    modalGameEnd.classList.add('hidden');
    renderStageCards();
    modalStageSelect.classList.remove('hidden');
  });
  btnEndRetry.addEventListener('click', () => {
    modalGameEnd.classList.add('hidden');
    game.loadMap(game.currentMap);
  });
  btnEndEndless.addEventListener('click', () => {
    modalGameEnd.classList.add('hidden');
    game.endlessMode = true;
    game.startNextWave();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalCodex.classList.contains('hidden')) {
        modalCodex.classList.add('hidden');
        return;
      }
      game.cancelCurrentAction();
    } else if (e.code === 'Space') {
      if (modalStageSelect.classList.contains('hidden') && modalCodex.classList.contains('hidden')) {
        e.preventDefault();
        game.startNextWave();
      }
    } else if (e.key >= '1' && e.key <= '6') {
      const idx = parseInt(e.key, 10) - 1;
      if (TOWER_LIST[idx]) {
        game.selectTowerToBuild(TOWER_LIST[idx].id);
      }
    } else if (e.key.toLowerCase() === 'q') {
      game.triggerSpellButton('meteor');
    } else if (e.key.toLowerCase() === 'w') {
      game.triggerSpellButton('chrono');
    } else if (e.key.toLowerCase() === 'e') {
      game.triggerSpellButton('reinforce');
    } else if (e.key.toLowerCase() === 'r') {
      game.startRallyPointMode();
    }
  });

  // Initial UI render
  renderStageCards();
  syncUI();

  // Main Animation Loop
  let lastTime = performance.now();
  function loop(now: number): void {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    game.step(dt);
    updateSpellCooldownUI();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', initApp);
