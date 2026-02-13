<script>
  import { movementPool, diceValue, gamePhase } from '../game/gameState.js';

  let pool = $derived($movementPool);
  let dice = $derived($diceValue);
  let phase = $derived($gamePhase);

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
