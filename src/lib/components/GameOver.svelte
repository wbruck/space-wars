<script>
  import { gamePhase, movementPool, movesMade, board } from '../game/gameState.js';

  let { onPlayAgain } = $props();

  let phase = $derived($gamePhase);
  let pool = $derived($movementPool);
  let moves = $derived($movesMade);
  let boardData = $derived($board);

  let isWin = $derived(phase === 'won');

  let boardSizeLabel = $derived.by(() => {
    if (!boardData) return '';
    const hexes = boardData.cols * boardData.rows;
    if (hexes <= 20) return `Small (${hexes} hexes)`;
    if (hexes <= 42) return `Medium (${hexes} hexes)`;
    return `Large (${hexes} hexes)`;
  });
</script>

<div class="game-over">
  <h2 class:win={isWin} class:lose={!isWin}>
    {isWin ? 'You Won!' : 'Game Over'}
  </h2>

  <p class="message">
    {isWin
      ? 'You reached the target vertex!'
      : 'You ran out of moves or got trapped.'}
  </p>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">Moves made</span>
      <span class="stat-value">{moves}</span>
    </div>
    {#if isWin}
      <div class="stat">
        <span class="stat-label">Points remaining</span>
        <span class="stat-value">{pool}</span>
      </div>
    {/if}
    <div class="stat">
      <span class="stat-label">Board size</span>
      <span class="stat-value">{boardSizeLabel}</span>
    </div>
  </div>

  <button class="play-again-btn" onclick={onPlayAgain}>Play Again</button>
</div>

<style>
  .game-over {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  h2 {
    font-size: 1.8rem;
    margin: 0;
  }

  h2.win {
    color: #2e7d32;
  }

  h2.lose {
    color: #c62828;
  }

  .message {
    color: #666;
    font-size: 1rem;
    margin: 0;
  }

  .stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
    margin: 0.5rem 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .stat-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #888;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }

  .play-again-btn {
    padding: 0.75rem 2.5rem;
    font-size: 1.2rem;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 0.25rem;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .play-again-btn:hover {
    background: #1565c0;
  }

  .play-again-btn:active {
    background: #0d47a1;
  }

  @media (prefers-color-scheme: dark) {
    h2.win { color: #66bb6a; }
    h2.lose { color: #ef5350; }
    .message { color: #aaa; }
    .stat-label { color: #999; }
    .stat-value { color: #eee; }
  }
</style>
