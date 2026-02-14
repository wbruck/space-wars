<script>
  import Board from './lib/components/Board.svelte';
  import Dice from './lib/components/Dice.svelte';
  import HUD from './lib/components/HUD.svelte';
  import SetupScreen from './lib/components/SetupScreen.svelte';
  import GameOver from './lib/components/GameOver.svelte';
  import CombatScreen from './lib/components/CombatScreen.svelte';
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

  // Construct enemy render data from boardData
  let enemyRenderData = $derived.by(() => {
    if (!boardData || !boardData.enemies) return [];
    return boardData.enemies.map(enemy => {
      const affected = enemy.getAffectedVertices(null, boardData.rays);
      // Kill zone vertices are all affected vertices except the enemy's own vertex
      const killZoneVertices = affected.slice(1);
      return {
        vertexId: enemy.vertexId,
        direction: enemy.direction,
        range: enemy.range,
        killZoneVertices,
        destroyed: !!enemy.destroyed,
      };
    });
  });

  // Compute available directions reactively
  let availableDirs = $derived.by(() => {
    if (phase !== 'selectingDirection' || !boardData || !pos) return null;
    return getAvailableDirections(boardData.rays, pos, boardData.obstacles);
  });

  function handleStart(cols, rows, difficulty) {
    initGame(cols, rows, undefined, difficulty);
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

  {:else if phase === 'combat'}
    <CombatScreen />

  {:else if boardData}
    <Board
      cols={boardData.cols}
      rows={boardData.rows}
      startVertex={boardData.startVertex}
      targetVertex={boardData.targetVertex}
      obstacles={boardData.obstacles}
      blackholes={boardData.blackholeSet ?? new Set()}
      enemies={enemyRenderData}
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
    padding: 0.5rem;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  h1 {
    font-size: 1.5rem;
    color: #333;
    margin: 0.25rem 0;
  }

  @media (prefers-color-scheme: dark) {
    h1 { color: #eee; }
  }

  @media (min-width: 600px) {
    main {
      padding: 1rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.25rem;
    }
  }
</style>
