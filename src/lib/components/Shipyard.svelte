<script>
  import { playerShipStore, componentMarket, confirmShipBuild, removeComponent, installComponent, gamePhase } from '../game/gameState.js';

  let market = $derived($componentMarket);

  // Access store properties directly — avoids Svelte 5 $derived memoization
  // skipping updates when the same object reference is set back into the store.
  let totalPower = $derived($playerShipStore?.totalPower ?? 0);
  let powerLimit = $derived($playerShipStore?.powerLimit ?? 7);
  let remainingPower = $derived($playerShipStore?.remainingPower ?? 7);

  // Spread to create a new array reference so $derived detects the change
  let installedComponents = $derived.by(() => {
    const s = $playerShipStore;
    return s ? [...s.components] : [];
  });

  let hasWeapon = $derived($playerShipStore?.hasComponentType('weapon') ?? false);
  let hasEngine = $derived($playerShipStore?.hasComponentType('engine') ?? false);
  let hasBridge = $derived($playerShipStore?.hasComponentType('bridge') ?? false);
  let canConfirm = $derived(hasWeapon && hasEngine && hasBridge);

  let powerRatio = $derived(powerLimit > 0 ? totalPower / powerLimit : 0);

  // Color coding: Red = low (underpowered), Yellow = moderate, Green = nearly full (ready)
  let powerBarColor = $derived.by(() => {
    if (powerRatio >= 0.7) return 'power-high';
    if (powerRatio >= 0.4) return 'power-mid';
    return 'power-low';
  });

  function getBonusText(comp) {
    if (comp.powerCost >= 2) {
      if (comp.type === 'weapon') return '+1 Accuracy (hits 3+)';
      if (comp.type === 'engine') return '+1 Speed';
      if (comp.type === 'bridge') return '+1 Evasion';
    }
    return 'No bonus';
  }

  function typeLabel(comp) {
    if (comp.type === 'weapon') return 'Weapon';
    if (comp.type === 'engine') return 'Engine';
    if (comp.type === 'bridge') return 'Bridge';
    return comp.type;
  }

  function handleRemove(name) {
    removeComponent(name);
  }

  function handleInstall(index) {
    installComponent(index);
  }

  function isInstallDisabled(comp) {
    return comp.powerCost > remainingPower || (comp.type === 'bridge' && hasBridge);
  }

  function handleBack() {
    gamePhase.set('galaxy');
  }

  function handleConfirm() {
    confirmShipBuild();
  }
</script>

<div class="shipyard-screen">
  <div class="header-row">
    <button class="back-btn" onclick={handleBack}>Back</button>
    <h2 class="title">Shipyard</h2>
  </div>

  <!-- Power bar -->
  <div class="power-section">
    <div class="power-label">Power: {totalPower} / {powerLimit}</div>
    <div class="power-bar-container">
      <div
        class="power-bar {powerBarColor}"
        style="width: {powerRatio * 100}%"
      ></div>
    </div>
  </div>

  <!-- Installed Components -->
  <div class="section">
    <h3 class="section-title">Installed Components</h3>
    {#if installedComponents.length === 0}
      <div class="empty-message">No components installed</div>
    {:else}
      <div class="component-list">
        {#each installedComponents as comp}
          <div class="component-row">
            <div class="comp-info">
              <span class="comp-name">{comp.name}</span>
              <span class="comp-type">{typeLabel(comp)}</span>
              <span class="comp-power">P{comp.powerCost}</span>
              <span class="comp-hp">{comp.currentHp}/{comp.maxHp} HP</span>
              <span class="comp-bonus">{getBonusText(comp)}</span>
            </div>
            <button
              class="remove-btn"
              onclick={() => handleRemove(comp.name)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Available Components -->
  <div class="section">
    <h3 class="section-title">Available Components</h3>
    {#if market.length === 0}
      <div class="empty-message">No components available</div>
    {:else}
      <div class="component-list">
        {#each market as comp, index}
          <div class="component-row">
            <div class="comp-info">
              <span class="comp-name">{comp.name}</span>
              <span class="comp-type">{typeLabel(comp)}</span>
              <span class="comp-power">P{comp.powerCost}</span>
              <span class="comp-hp">{comp.currentHp}/{comp.maxHp} HP</span>
              <span class="comp-bonus">{getBonusText(comp)}</span>
            </div>
            <button
              class="install-btn"
              disabled={isInstallDisabled(comp)}
              onclick={() => handleInstall(index)}
            >
              Install
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Confirm Build -->
  <button
    class="confirm-btn"
    disabled={!canConfirm}
    onclick={handleConfirm}
  >
    Confirm Build
  </button>
  {#if !canConfirm}
    <div class="confirm-hint">Requires at least 1 weapon, 1 engine, and 1 bridge</div>
  {/if}
</div>

<style>
  .shipyard-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 480px;
    margin: 0 auto;
    padding: 0.75rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .header-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .back-btn {
    padding: 0.35rem 0.7rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #666;
    border-radius: 6px;
    background: #f5f5f5;
    color: #333;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: #e0e0e0;
    transform: scale(1.03);
  }

  .back-btn:active {
    transform: scale(0.97);
  }

  .title {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .power-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .power-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #555;
    text-align: center;
  }

  .power-bar-container {
    width: 100%;
    height: 12px;
    background: #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
  }

  .power-bar {
    height: 100%;
    border-radius: 6px;
    transition: width 0.3s, background 0.3s;
  }

  .power-bar.power-low { background: #f44336; }
  .power-bar.power-mid { background: #ff9800; }
  .power-bar.power-high { background: #4caf50; }

  .section {
    width: 100%;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .empty-message {
    font-size: 0.85rem;
    color: #888;
    text-align: center;
    padding: 0.5rem;
  }

  .component-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .component-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.6rem;
    background: #f5f9ff;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  .comp-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .comp-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: #333;
  }

  .comp-type {
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    background: #e3f2fd;
    color: #1565c0;
    font-weight: 500;
    text-transform: uppercase;
  }

  .comp-power {
    font-size: 0.7rem;
    font-weight: 600;
    color: #ff9800;
  }

  .comp-hp {
    font-size: 0.75rem;
    color: #555;
  }

  .comp-bonus {
    font-size: 0.7rem;
    color: #888;
    font-style: italic;
  }

  .remove-btn {
    padding: 0.35rem 0.7rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #e53935;
    border-radius: 6px;
    background: #ffebee;
    color: #c62828;
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background: #ffcdd2;
    transform: scale(1.03);
  }

  .remove-btn:active {
    transform: scale(0.97);
  }

  .install-btn {
    padding: 0.35rem 0.7rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #1976d2;
    border-radius: 6px;
    background: #e3f2fd;
    color: #0d47a1;
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }

  .install-btn:hover:not(:disabled) {
    background: #bbdefb;
    transform: scale(1.03);
  }

  .install-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .install-btn:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: #999;
    background: #eee;
    color: #999;
  }

  .confirm-btn {
    padding: 0.75rem 2rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #4caf50;
    border-radius: 8px;
    background: #e8f5e9;
    color: #2e7d32;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .confirm-btn:hover:not(:disabled) {
    background: #c8e6c9;
    transform: scale(1.03);
  }

  .confirm-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .confirm-btn:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: #999;
    background: #eee;
    color: #999;
  }

  .confirm-hint {
    font-size: 0.75rem;
    color: #888;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .title { color: #eee; }
    .back-btn { background: #333; border-color: #666; color: #ccc; }
    .back-btn:hover { background: #444; }
    .power-label { color: #bbb; }
    .power-bar-container { background: #444; }
    .section-title { color: #aaa; }
    .empty-message { color: #777; }
    .component-row { background: #1a1a2e; border-color: #444; }
    .comp-name { color: #e0e0e0; }
    .comp-type { background: #0d47a1; color: #90caf9; }
    .comp-power { color: #ffb74d; }
    .comp-hp { color: #bbb; }
    .comp-bonus { color: #999; }
    .remove-btn { background: #3a1b1b; border-color: #e53935; color: #ef9a9a; }
    .remove-btn:hover { background: #4a2020; }
    .install-btn { background: #1a2a3a; border-color: #1976d2; color: #90caf9; }
    .install-btn:hover:not(:disabled) { background: #1a3a5a; }
    .install-btn:disabled { background: #333; border-color: #555; color: #666; }
    .confirm-btn { background: #1b3a1b; border-color: #4caf50; color: #a5d6a7; }
    .confirm-btn:hover:not(:disabled) { background: #2e5a2e; }
    .confirm-btn:disabled { background: #333; border-color: #555; color: #666; }
    .confirm-hint { color: #777; }
  }

  @media (min-width: 600px) {
    .shipyard-screen {
      max-width: 520px;
      padding: 1rem;
    }

    .title {
      font-size: 1.75rem;
    }
  }
</style>
