<script>
  import { combatState, gamePhase, resolveCombat } from '../game/gameState.js';

  let combat = $derived($combatState);
  let engine = $derived(combat?.engine);
  let advantage = $derived(combat?.approachAdvantage);

  // Local UI state
  let rolling = $state(false);
  let lastResult = $state(null);
  let showResult = $state(false);
  let combatEnded = $state(false);
  let endMessage = $state('');

  // Dice animation display
  let displayRoll = $state(null);

  // Track bonus attacks used
  let bonusUsed = $state(false);

  // Tick counter to force reactive updates after engine mutations
  let tick = $state(0);

  let isPlayerTurn = $derived.by(() => { tick; return engine?.isPlayerTurn ?? true; });
  let currentTurn = $derived.by(() => { tick; return engine?.currentTurn ?? 1; });
  let combatOver = $derived.by(() => { tick; return engine?.combatOver ?? false; });

  let playerComponents = $derived.by(() => { tick; return (engine?.playerShip?.components ?? []).map(c => ({ name: c.name, currentHp: c.currentHp, maxHp: c.maxHp, destroyed: c.destroyed })); });
  let enemyComponents = $derived.by(() => { tick; return (engine?.enemyShip?.components ?? []).map(c => ({ name: c.name, currentHp: c.currentHp, maxHp: c.maxHp, destroyed: c.destroyed })); });

  let activeEnemyComponents = $derived.by(() => {
    tick;
    return enemyComponents.filter(c => c.currentHp > 0);
  });

  let canAttack = $derived.by(() => { tick; return engine?.playerShip?.canAttack ?? true; });

  // Check if we have a bonus attack available
  let hasBonusAttack = $derived.by(() => {
    tick;
    return engine && engine.bonusAttacks > 0 && engine._playerAttackCount === 0;
  });

  let approachLabel = $derived.by(() => {
    if (!advantage) return '';
    switch (advantage.approachType) {
      case 'rear_ambush': return 'Rear Ambush';
      case 'vision': return 'Vision';
      case 'simple': return 'Simple';
      default: return '';
    }
  });

  let hasRollBonus = $derived.by(() => {
    return advantage && advantage.rollBonus > 0;
  });

  let playerAccuracy = $derived.by(() => {
    tick;
    const weapon = engine?.playerShip?.getComponentsByType?.('weapon')?.find(w => !w.destroyed);
    return weapon ? weapon.accuracy : 4;
  });

  let effectiveThreshold = $derived.by(() => {
    const bonus = engine?.rollBonus ?? 0;
    return Math.max(1, playerAccuracy - bonus);
  });

  function animateDiceAndExecute(executeFn) {
    rolling = true;
    lastResult = null;
    showResult = false;
    let frames = 0;
    const totalFrames = 8;
    const interval = setInterval(() => {
      displayRoll = Math.floor(Math.random() * 6) + 1;
      frames++;
      if (frames >= totalFrames) {
        clearInterval(interval);
        const result = executeFn();
        tick++;  // Force reactive update after engine mutation
        displayRoll = result.roll;
        lastResult = result;
        showResult = true;
        rolling = false;

        if (result.combatOver) {
          setTimeout(() => handleCombatEnd(result.result), 1000);
        }
      }
    }, 60);
  }

  function handleTargetClick(componentName) {
    if (!engine || !isPlayerTurn || rolling || combatOver || combatEnded || !canAttack) return;
    const comp = engine.enemyShip.getComponent(componentName);
    if (!comp || comp.destroyed) return;

    animateDiceAndExecute(() => engine.executePlayerAttack(componentName));
  }

  function handleEscape() {
    if (!engine || !isPlayerTurn || rolling || combatOver || combatEnded) return;
    const result = engine.escape();
    tick++;
    handleCombatEnd(result.result);
  }

  function executeEnemyTurn() {
    if (!engine || isPlayerTurn || rolling || combatOver || combatEnded) return;

    animateDiceAndExecute(() => engine.executeEnemyAttack());
  }

  // Auto-trigger enemy turn after a delay
  $effect(() => {
    if (engine && !isPlayerTurn && !rolling && !combatOver && !combatEnded) {
      const timer = setTimeout(executeEnemyTurn, 500);
      return () => clearTimeout(timer);
    }
  });

  function handleCombatEnd(result) {
    combatEnded = true;
    switch (result) {
      case 'playerWin':
        endMessage = 'Victory!';
        break;
      case 'playerDestroyed':
        endMessage = 'Destroyed!';
        break;
      case 'playerLose':
        endMessage = 'Retreat!';
        break;
      case 'enemyFled':
        endMessage = 'Enemy Retreat!';
        break;
      case 'escaped':
        endMessage = 'Escaped!';
        break;
      default:
        endMessage = 'Combat Over';
    }

    setTimeout(() => {
      resolveCombat(result);
      // Reset local state
      combatEnded = false;
      endMessage = '';
      lastResult = null;
      showResult = false;
      displayRoll = null;
      bonusUsed = false;
    }, 1500);
  }

  // DOT_LAYOUTS and DOT_COORDS reused from Dice.svelte pattern
  const DOT_LAYOUTS = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };

  const DOT_COORDS = {
    'top-left':     { cx: '25%', cy: '25%' },
    'top-right':    { cx: '75%', cy: '25%' },
    'mid-left':     { cx: '25%', cy: '50%' },
    'center':       { cx: '50%', cy: '50%' },
    'mid-right':    { cx: '75%', cy: '50%' },
    'bottom-left':  { cx: '25%', cy: '75%' },
    'bottom-right': { cx: '75%', cy: '75%' },
  };

  let dots = $derived(displayRoll ? DOT_LAYOUTS[displayRoll] || [] : []);
</script>

<div class="combat-screen">
  {#if combatEnded}
    <div class="end-overlay">
      <div class="end-message"
        class:victory={endMessage === 'Victory!'}
        class:destroyed={endMessage === 'Destroyed!'}
        class:retreat={endMessage === 'Retreat!'}
        class:enemy-retreat={endMessage === 'Enemy Retreat!'}
        class:escaped={endMessage === 'Escaped!'}
      >{endMessage}</div>
    </div>
  {/if}

  <div class="combat-header">
    <div class="turn-info">Turn {currentTurn}</div>
    <div class="approach-info">
      <div class="approach-badge" class:rear_ambush={approachLabel === 'Rear Ambush'} class:vision={approachLabel === 'Vision'} class:simple={approachLabel === 'Simple'}>
        {approachLabel} Approach
      </div>
      <div class="hit-threshold">
        Hits on {effectiveThreshold}+
        {#if hasRollBonus} (base {playerAccuracy}+ with +{advantage.rollBonus} bonus){/if}
      </div>
    </div>
    <div class="turn-indicator" class:player-turn={isPlayerTurn} class:enemy-turn={!isPlayerTurn}>
      {#if isPlayerTurn}
        {#if hasBonusAttack}
          Bonus Attack!
        {:else}
          Your Turn
        {/if}
      {:else}
        Enemy Turn
      {/if}
    </div>
  </div>

  <div class="ships-container">
    <!-- Player Ship -->
    <div class="ship-panel player-panel">
      <h3 class="ship-title">Your Ship</h3>
      <div class="components-list">
        {#each playerComponents as comp}
          <div class="component-row" class:destroyed={comp.destroyed}>
            <span class="comp-name">{comp.name}</span>
            <div class="hp-bar-container">
              <div class="hp-bar" style="width: {(comp.currentHp / comp.maxHp) * 100}%"
                class:hp-full={comp.currentHp === comp.maxHp}
                class:hp-damaged={comp.currentHp > 0 && comp.currentHp < comp.maxHp}
                class:hp-dead={comp.currentHp <= 0}
              ></div>
            </div>
            <span class="hp-text">{comp.currentHp}/{comp.maxHp}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Dice display -->
    <div class="dice-area">
      {#if displayRoll}
        <div class="combat-die" class:rolling class:hit={showResult && lastResult?.isHit} class:miss={showResult && !lastResult?.isHit}>
          <svg viewBox="0 0 100 100" class="die-svg">
            {#each dots as pos}
              <circle cx={DOT_COORDS[pos].cx} cy={DOT_COORDS[pos].cy} r="10" class="die-dot" />
            {/each}
          </svg>
        </div>
      {:else}
        <div class="combat-die empty">
          <span class="die-prompt">Choose target</span>
        </div>
      {/if}
    </div>

    <!-- Enemy Ship -->
    <div class="ship-panel enemy-panel">
      <h3 class="ship-title">Enemy Ship</h3>
      <div class="components-list">
        {#each enemyComponents as comp}
          <div class="component-row" class:destroyed={comp.destroyed}>
            <span class="comp-name">{comp.name}</span>
            <div class="hp-bar-container">
              <div class="hp-bar" style="width: {(comp.currentHp / comp.maxHp) * 100}%"
                class:hp-full={comp.currentHp === comp.maxHp}
                class:hp-damaged={comp.currentHp > 0 && comp.currentHp < comp.maxHp}
                class:hp-dead={comp.currentHp <= 0}
              ></div>
            </div>
            <span class="hp-text">{comp.currentHp}/{comp.maxHp}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Target buttons (player's turn only) -->
  <div class="target-buttons">
    {#each enemyComponents as comp}
      <button
        class="target-btn"
        class:destroyed={comp.destroyed}
        disabled={comp.destroyed || !isPlayerTurn || rolling || combatOver || combatEnded || !canAttack}
        onclick={() => handleTargetClick(comp.name)}
      >
        Target {comp.name}
      </button>
    {/each}
  </div>

  <!-- Escape button -->
  <div class="escape-row">
    <button
      class="escape-btn"
      disabled={!isPlayerTurn || rolling || combatOver || combatEnded}
      onclick={handleEscape}
    >
      Escape
    </button>
  </div>

  <!-- Attack outcome text (fixed-height to prevent layout shift) -->
  <div class="outcome-area">
    {#if !canAttack && isPlayerTurn && !combatOver && !combatEnded && !showResult}
      <div class="weapons-offline">Weapons destroyed – Escape to retreat!</div>
    {:else if showResult && lastResult}
      <div class="roll-result" class:hit={lastResult.isHit} class:miss={!lastResult.isHit}>
        {#if lastResult.roll === 0}
          Auto-Miss!
        {:else if lastResult.isHit}
          Hit!{#if hasRollBonus} (+1){/if}{#if lastResult.destroyed} Destroyed!{/if}
        {:else}
          Miss!{#if hasRollBonus} (+1){/if}
        {/if}
      </div>
      {#if lastResult.targetComponent}
        <div class="target-label">
          {lastResult.isHit ? 'Hit' : 'Targeted'}: {lastResult.targetComponent}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .combat-screen {
    position: relative;
    max-width: 480px;
    margin: 0 auto;
    padding: 0.75rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .end-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10;
    border-radius: 12px;
  }

  .end-message {
    font-size: 2.5rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .end-message.victory { color: #4caf50; }
  .end-message.destroyed { color: #f44336; }
  .end-message.retreat { color: #ff9800; }
  .end-message.enemy-retreat { color: #ff9800; }
  .end-message.escaped { color: #f9a825; }

  .combat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .turn-info {
    font-size: 0.9rem;
    font-weight: 600;
    color: #555;
  }

  .approach-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .approach-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .hit-threshold {
    font-size: 0.65rem;
    color: #888;
    font-weight: 500;
  }

  .approach-badge.rear_ambush { background: #e8f5e9; color: #2e7d32; }
  .approach-badge.vision { background: #fce4ec; color: #c62828; }
  .approach-badge.simple { background: #e3f2fd; color: #1565c0; }

  .turn-indicator {
    font-size: 0.95rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
  }

  .turn-indicator.player-turn { background: #e3f2fd; color: #1565c0; }
  .turn-indicator.enemy-turn { background: #fce4ec; color: #c62828; }

  .ships-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .ship-panel {
    flex: 1;
    padding: 0.5rem;
    border-radius: 8px;
    border: 2px solid #ddd;
    min-width: 0;
  }

  .player-panel { border-color: #90caf9; background: #f5f9ff; }
  .enemy-panel { border-color: #ef9a9a; background: #fff5f5; }

  .ship-title {
    font-size: 0.8rem;
    margin: 0 0 0.4rem 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #666;
  }

  .components-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .component-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
  }

  .component-row.destroyed {
    opacity: 0.4;
    text-decoration: line-through;
  }

  .comp-name {
    width: 3.5rem;
    font-weight: 500;
    font-size: 0.7rem;
    color: #444;
    flex-shrink: 0;
  }

  .hp-bar-container {
    flex: 1;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    min-width: 30px;
  }

  .hp-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }

  .hp-bar.hp-full { background: #4caf50; }
  .hp-bar.hp-damaged { background: #ff9800; }
  .hp-bar.hp-dead { background: #f44336; }

  .hp-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: #555;
    width: 1.8rem;
    text-align: right;
    flex-shrink: 0;
  }

  .dice-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    min-width: 70px;
    flex-shrink: 0;
  }

  .combat-die {
    width: 60px;
    height: 60px;
    border-radius: 10px;
    border: 2px solid #888;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .combat-die.rolling {
    animation: shake 0.1s linear infinite;
  }

  .combat-die.hit { border-color: #4caf50; }
  .combat-die.miss { border-color: #f44336; }

  .combat-die.empty {
    border-style: dashed;
    border-color: #ccc;
  }

  @keyframes shake {
    0% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
    100% { transform: rotate(-3deg); }
  }

  .die-svg {
    width: 80%;
    height: 80%;
  }

  .die-dot {
    fill: #333;
  }

  .die-prompt {
    font-size: 0.6rem;
    color: #aaa;
    text-align: center;
  }

  .roll-result {
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
  }

  .roll-result.hit { color: #2e7d32; }
  .roll-result.miss { color: #c62828; }

  .target-label {
    font-size: 0.65rem;
    color: #777;
    text-align: center;
  }

  .target-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .outcome-area {
    min-height: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    margin-top: 0.5rem;
  }

  .weapons-offline {
    font-size: 0.85rem;
    font-weight: 700;
    color: #f57f17;
    text-align: center;
  }

  .target-btn {
    padding: 0.6rem 1rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #1565c0;
    border-radius: 8px;
    background: #e3f2fd;
    color: #1565c0;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .target-btn:hover:not(:disabled) {
    background: #bbdefb;
    transform: scale(1.03);
  }

  .target-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .target-btn:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: #999;
    background: #eee;
    color: #999;
  }

  .target-btn.destroyed {
    text-decoration: line-through;
  }

  .escape-row {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .escape-btn {
    padding: 0.6rem 1.5rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #f9a825;
    border-radius: 8px;
    background: #fff8e1;
    color: #f57f17;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .escape-btn:hover:not(:disabled) {
    background: #ffecb3;
    transform: scale(1.03);
  }

  .escape-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .escape-btn:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: #999;
    background: #eee;
    color: #999;
  }

  @media (prefers-color-scheme: dark) {
    .hit-threshold { color: #999; }
    .turn-info { color: #bbb; }
    .approach-badge.rear_ambush { background: #1b5e20; color: #a5d6a7; }
    .approach-badge.vision { background: #b71c1c; color: #ef9a9a; }
    .approach-badge.simple { background: #0d47a1; color: #90caf9; }
    .turn-indicator.player-turn { background: #0d47a1; color: #90caf9; }
    .turn-indicator.enemy-turn { background: #b71c1c; color: #ef9a9a; }
    .player-panel { border-color: #1565c0; background: #0d1b2a; }
    .enemy-panel { border-color: #c62828; background: #2a0d0d; }
    .ship-title { color: #aaa; }
    .comp-name { color: #ccc; }
    .hp-bar-container { background: #444; }
    .hp-text { color: #bbb; }
    .combat-die { background: #333; border-color: #666; }
    .combat-die.empty { border-color: #555; }
    .die-dot { fill: #eee; }
    .die-prompt { color: #888; }
    .target-label { color: #999; }
    .roll-result.hit { color: #66bb6a; }
    .roll-result.miss { color: #ef5350; }
    .target-btn { background: #0d47a1; border-color: #1565c0; color: #90caf9; }
    .target-btn:hover:not(:disabled) { background: #1565c0; }
    .target-btn:disabled { background: #333; border-color: #555; color: #666; }
    .escape-btn { background: #4a3800; border-color: #f9a825; color: #fdd835; }
    .escape-btn:hover:not(:disabled) { background: #5c4a00; }
    .escape-btn:disabled { background: #333; border-color: #555; color: #666; }
    .weapons-offline { color: #fdd835; }
    .end-overlay { background: rgba(0, 0, 0, 0.8); }
  }
</style>
