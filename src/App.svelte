<script>
  import Board from './lib/components/Board.svelte';
  import Dice from './lib/components/Dice.svelte';
  import { board, playerPos, movementPool, diceValue, gamePhase, visited, movesMade, initGame, resetGame } from './lib/game/gameState.js';

  let selectedRadius = $state(2);

  // Subscribe to stores
  let boardData = $derived($board);
  let phase = $derived($gamePhase);
  let pos = $derived($playerPos);
  let pool = $derived($movementPool);
  let dice = $derived($diceValue);
  let visitedSet = $derived($visited);

  function startGame() {
    initGame(selectedRadius);
  }
</script>

<main>
  <h1>Game Time</h1>

  {#if phase === 'setup'}
    <p>Hex Vertex Strategy Board Game</p>

    <div class="size-buttons">
      <button class:active={selectedRadius === 2} onclick={() => selectedRadius = 2}>Small (19 hexes)</button>
      <button class:active={selectedRadius === 3} onclick={() => selectedRadius = 3}>Medium (37 hexes)</button>
      <button class:active={selectedRadius === 4} onclick={() => selectedRadius = 4}>Large (61 hexes)</button>
    </div>

    <button class="start-btn" onclick={startGame}>Start Game</button>

  {:else if boardData}
    <Board
      radius={boardData.radius}
      startVertex={boardData.startVertex}
      targetVertex={boardData.targetVertex}
      obstacles={boardData.obstacles}
      playerPos={pos}
      visited={visitedSet}
    />

    <Dice />

    <div class="hud-placeholder">
      <span>Moves: {pool}</span>
      {#if dice != null}
        <span>Rolled: {dice}</span>
      {/if}
      <span class="phase-label">
        {#if phase === 'rolling'}Roll the dice
        {:else if phase === 'selectingDirection'}Choose a direction
        {:else if phase === 'moving'}Moving...
        {:else if phase === 'won'}You won!
        {:else if phase === 'lost'}Game over
        {/if}
      </span>
    </div>
  {/if}
</main>

<style>
  main {
    text-align: center;
    padding: 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    font-size: 2rem;
    color: #333;
    margin-bottom: 0.25rem;
  }

  p {
    color: #666;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .size-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .size-buttons button {
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
  }

  .size-buttons button.active {
    border-color: #4caf50;
    color: #4caf50;
  }

  .start-btn {
    padding: 0.6rem 2rem;
    font-size: 1.1rem;
    background: #4caf50;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .start-btn:hover {
    background: #388e3c;
  }

  .hud-placeholder {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: #555;
    flex-wrap: wrap;
  }

  .phase-label {
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    h1 { color: #eee; }
    p { color: #aaa; }
    .hud-placeholder { color: #bbb; }
  }
</style>
