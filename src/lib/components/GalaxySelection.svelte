<script>
  let { galaxy, onSelectBoard } = $props();

  function handleSelect(row, col) {
    const board = galaxy[row][col];
    if (board.status !== 'unlocked') return;
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

  <div class="grid">
    {#each galaxy as row, rowIdx}
      {#each row as board, colIdx}
        {@const selectable = board.status === 'unlocked'}
        <div
          class="cell status-{board.status}"
          class:selectable
          role={selectable ? 'button' : undefined}
          tabindex={selectable ? 0 : undefined}
          onclick={() => handleSelect(rowIdx, colIdx)}
          onkeydown={(e) => handleKeydown(e, rowIdx, colIdx)}
        >
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
      {/each}
    {/each}
  </div>
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

  @media (prefers-color-scheme: dark) {
    .title { color: #eee; }
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
