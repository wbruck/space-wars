<script>
  import { movementPool, diceValue, gamePhase, playerShip, stealthDive } from '../game/gameState.js';

  let pool = $derived($movementPool);
  let dice = $derived($diceValue);
  let phase = $derived($gamePhase);
  let ship = $derived($playerShip);
  let isDiving = $derived($stealthDive);
  let engineDamaged = $derived(ship?.isEngineDestroyed ?? false);

  let phaseLabel = $derived.by(() => {
    switch (phase) {
      case 'rolling': return 'Roll the dice';
      case 'selectingDirection': return 'Choose a direction';
      case 'moving': return 'Moving...';
      case 'won': return 'You won!';
      case 'lost': return 'Game over';
      default: return '';
    }
  });

  let isEndPhase = $derived(phase === 'won' || phase === 'lost');
</script>

<div class="hud" class:won={phase === 'won'} class:lost={phase === 'lost'}>
  <div class="hud-item">
    <span class="hud-label">Moves</span>
    <span class="hud-value">{pool}</span>
  </div>

  <div class="hud-item">
    <span class="hud-label">Rolled</span>
    <span class="hud-value">{dice != null ? dice : '—'}</span>
  </div>

  <div class="hud-item phase-item" class:end-phase={isEndPhase}>
    <span class="phase-text">{phaseLabel}</span>
  </div>

  {#if engineDamaged}
    <div class="hud-item">
      <span class="status-badge engine-damaged">Engine Damaged</span>
    </div>
  {/if}

  {#if isDiving}
    <div class="hud-item">
      <span class="status-badge stealth-dive">Stealth Drive, -1 movement</span>
    </div>
  {/if}
</div>

<style>
  .hud {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    margin-top: 0.5rem;
    padding: 0.4rem 0.75rem;
    flex-wrap: wrap;
  }

  .hud-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.95rem;
  }

  .hud-label {
    color: #888;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .hud-value {
    font-weight: 600;
    font-size: 1.1rem;
    color: #333;
  }

  .phase-item {
    font-style: italic;
  }

  .phase-text {
    color: #555;
    font-size: 0.95rem;
  }

  .end-phase .phase-text {
    font-weight: 600;
    font-style: normal;
    font-size: 1rem;
  }

  .won .end-phase .phase-text {
    color: #2e7d32;
  }

  .lost .end-phase .phase-text {
    color: #c62828;
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  .engine-damaged {
    background: #fff3e0;
    color: #e65100;
    border: 1px solid #ffcc80;
  }

  .stealth-dive {
    background: #e8eaf6;
    color: #283593;
    border: 1px solid #9fa8da;
    text-transform: none;
  }

  @media (prefers-color-scheme: dark) {
    .hud-label {
      color: #999;
    }
    .hud-value {
      color: #eee;
    }
    .phase-text {
      color: #bbb;
    }
    .won .end-phase .phase-text {
      color: #66bb6a;
    }
    .lost .end-phase .phase-text {
      color: #ef5350;
    }
    .engine-damaged {
      background: #3e2723;
      color: #ffab40;
      border-color: #6d4c41;
    }
    .stealth-dive {
      background: #1a237e;
      color: #82b1ff;
      border-color: #3949ab;
    }
  }

  @media (max-width: 400px) {
    .hud {
      gap: 0.6rem;
      padding: 0.3rem 0.5rem;
    }
    .hud-item {
      font-size: 0.85rem;
    }
    .hud-value {
      font-size: 1rem;
    }
  }
</style>
