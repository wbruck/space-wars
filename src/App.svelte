<script>
  import Board from './lib/components/Board.svelte';
  import Dice from './lib/components/Dice.svelte';
  import HUD from './lib/components/HUD.svelte';
  import SetupScreen from './lib/components/SetupScreen.svelte';
  import GameOver from './lib/components/GameOver.svelte';
  import {
    board, playerPos, gamePhase, visited,
    selectedDirection, previewPath, animatingPath, animationStep,
    initGame, resetGame, selectDirection, executeMove,
  } from './lib/game/gameState.js';
  import { getAvailableDirections } from './lib/game/movement.js';

  // Subscribe to stores
  let boardData = $derived($board);
  let phase = $derived($gamePhase);
  let pos = $derived($playerPos);
  let visitedSet = $derived($visited);
  let selDir = $derived($selectedDirection);
  let preview = $derived($previewPath);
  let animPath = $derived($animatingPath);
  let animStep = $derived($animationStep);

  // Compute available directions reactively
  let availableDirs = $derived.by(() => {
    if (phase !== 'selectingDirection' || !boardData || !pos) return null;
    return getAvailableDirections(boardData.rays, pos, boardData.obstacles);
  });

  function handleStart(radius) {
    initGame(radius);
  }

  function handleDirectionSelect(direction) {
    selectDirection(direction);
  }

  function handleConfirmMove() {
    executeMove();
  }

  function handlePlayAgain() {
    resetGame();
  }
</script>

<main>
  <h1>Game Time</h1>

  {#if phase === 'setup'}
    <SetupScreen onStart={handleStart} />

  {:else if phase === 'won' || phase === 'lost'}
    <GameOver onPlayAgain={handlePlayAgain} />

  {:else if boardData}
    <Board
      radius={boardData.radius}
      startVertex={boardData.startVertex}
      targetVertex={boardData.targetVertex}
      obstacles={boardData.obstacles}
      playerPos={pos}
      visited={visitedSet}
      gamePhase={phase}
      availableDirections={availableDirs}
      previewPath={preview}
      selectedDirection={selDir}
      animatingPath={animPath}
      animationStep={animStep}
      onDirectionSelect={handleDirectionSelect}
      onConfirmMove={handleConfirmMove}
    />

    <Dice />

    <HUD />
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

  @media (prefers-color-scheme: dark) {
    h1 { color: #eee; }
  }
</style>
