<script>
  import { shipConfirmed, enterShipyard } from '../game/gameState.js';

  let { galaxy, onSelectBoard, onReset } = $props();

  let confirmed = $derived($shipConfirmed);
  let confirmingReset = $state(false);
  let resetTimer = $state(null);

  function handleReset() {
    if (confirmingReset) {
      clearTimeout(resetTimer);
      confirmingReset = false;
      resetTimer = null;
      onReset();
    } else {
      confirmingReset = true;
      resetTimer = setTimeout(() => {
        confirmingReset = false;
        resetTimer = null;
      }, 3000);
    }
  }

  function handleSelect(row, col) {
    const board = galaxy[row][col];
    if (board.status !== 'unlocked' || !confirmed) return;
    onSelectBoard(row, col);
  }

  function handleKeydown(event, row, col) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(row, col);
    }
  }

  function sizeLabel(size) {
    return size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large';
  }
</script>

<div class="galaxy-screen">
  <h2 class="title">Galaxy Selection</h2>

  <button
    class="shipyard-btn"
    onclick={() => enterShipyard()}
  >
    Shipyard
  </button>

  {#if !confirmed}
    <div class="gate-message">Confirm your ship build first</div>
  {/if}

  <div class="grid" class:gated={!confirmed}>
    {#each galaxy as row, rowIdx}
      {#each row as board, colIdx}
        {#if board.status === 'unlocked' && confirmed}
          <div
            class="cell status-unlocked selectable"
            role="button"
            tabindex="0"
            onclick={() => handleSelect(rowIdx, colIdx)}
            onkeydown={(e) => handleKeydown(e, rowIdx, colIdx)}
          >
            <span class="cell-size">{sizeLabel(board.size)}</span>
            <span class="cell-difficulty">Diff {board.difficulty}</span>
            <span class="cell-status">Ready</span>
          </div>
        {:else}
          <div class="cell status-{board.status}">
            <span class="cell-size">{sizeLabel(board.size)}</span>
            <span class="cell-difficulty">Diff {board.difficulty}</span>
            <span class="cell-status">
              {#if board.status === 'won'}
                Won
              {:else if board.status === 'lost'}
                Lost
              {:else if board.status === 'unlocked'}
                Ready
              {:else}
                Locked
              {/if}
            </span>
          </div>
        {/if}
      {/each}
    {/each}
  </div>

  <button
    class="reset-btn"
    class:confirming={confirmingReset}
    onclick={handleReset}
  >
    {confirmingReset ? 'Are you sure?' : 'Reset Galaxy'}
  </button>
</div>

<style>
  .galaxy-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .title {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .shipyard-btn {
    padding: 0.65rem 1.5rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #ff9800;
    border-radius: 8px;
    background: #fff3e0;
    color: #e65100;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .shipyard-btn:hover {
    background: #ffe0b2;
    transform: scale(1.03);
  }

  .shipyard-btn:active {
    transform: scale(0.97);
  }

  .shipyard-btn:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .gate-message {
    font-size: 0.85rem;
    color: #ff9800;
    font-weight: 600;
    text-align: center;
  }

  .grid.gated {
    opacity: 0.4;
    pointer-events: none;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 0.5rem;
    width: 100%;
    max-width: 360px;
  }

  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.75rem 0.5rem;
    border-radius: 8px;
    border: 2px solid #444;
    min-height: 80px;
    min-width: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: border-color 0.15s, background 0.15s;
  }

  .cell-size {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .cell-difficulty {
    font-size: 0.75rem;
    color: #888;
  }

  .cell-status {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Status styles */
  .status-locked {
    background: #2a2a2a;
    border-color: #444;
    color: #666;
    opacity: 0.5;
    cursor: default;
  }

  .status-unlocked {
    background: #1a1a2e;
    border-color: #4fc3f7;
    color: #e0e0e0;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(79, 195, 247, 0.3);
  }

  .status-unlocked:hover {
    border-color: #81d4fa;
    box-shadow: 0 0 14px rgba(79, 195, 247, 0.5);
  }

  .status-unlocked:focus-visible {
    outline: 2px solid #4fc3f7;
    outline-offset: 2px;
  }

  .status-won {
    background: #1b3a1b;
    border-color: #4caf50;
    color: #a5d6a7;
    cursor: default;
  }

  .status-lost {
    background: #3a1b1b;
    border-color: #e53935;
    color: #ef9a9a;
    cursor: default;
  }

  @media (prefers-color-scheme: light) {
    .title { color: #333; }

    .status-locked {
      background: #e0e0e0;
      border-color: #bbb;
      color: #999;
    }

    .status-unlocked {
      background: #e3f2fd;
      border-color: #1976d2;
      color: #333;
      box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
    }

    .status-unlocked:hover {
      border-color: #42a5f5;
      box-shadow: 0 0 14px rgba(25, 118, 210, 0.5);
    }

    .status-won {
      background: #e8f5e9;
      border-color: #4caf50;
      color: #2e7d32;
    }

    .status-lost {
      background: #ffebee;
      border-color: #e53935;
      color: #c62828;
    }
  }

  .reset-btn {
    padding: 0.5rem 1.25rem;
    min-height: 44px;
    border: 2px solid #b71c1c;
    border-radius: 8px;
    background: transparent;
    color: #c62828;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
  }

  .reset-btn:hover {
    background: rgba(183, 28, 28, 0.1);
  }

  .reset-btn:active {
    transform: scale(0.97);
  }

  .reset-btn:focus-visible {
    outline: 2px solid #b71c1c;
    outline-offset: 2px;
  }

  .reset-btn.confirming {
    border-color: #e53935;
    color: #e53935;
    background: rgba(229, 57, 53, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    .title { color: #eee; }
    .shipyard-btn { background: #3a2a1a; border-color: #ff9800; color: #ffb74d; }
    .shipyard-btn:hover { background: #4a3a2a; }
    .gate-message { color: #ffb74d; }
    .reset-btn { border-color: #c62828; color: #ef5350; }
    .reset-btn:hover { background: rgba(229, 57, 53, 0.15); }
    .reset-btn.confirming { border-color: #ef5350; color: #ef5350; background: rgba(229, 57, 53, 0.2); }
  }

  @media (min-width: 600px) {
    .grid {
      max-width: 420px;
      gap: 0.75rem;
    }

    .cell {
      min-height: 100px;
      padding: 1rem;
    }

    .cell-size {
      font-size: 1rem;
    }

    .cell-difficulty {
      font-size: 0.85rem;
    }
  }
</style>
