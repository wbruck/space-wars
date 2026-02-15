<script>
  import Board from './lib/components/Board.svelte';
  import Dice from './lib/components/Dice.svelte';
  import HUD from './lib/components/HUD.svelte';
  import GameOver from './lib/components/GameOver.svelte';
  import CombatScreen from './lib/components/CombatScreen.svelte';
  import GalaxySelection from './lib/components/GalaxySelection.svelte';
  import GalaxyComplete from './lib/components/GalaxyComplete.svelte';
  import EngagementModal from './lib/components/EngagementModal.svelte';
  import {
    board, playerPos, gamePhase, visited,
    selectedDirection, previewPath, animatingPath, animationStep,
    galaxyState, currentBoardPos,
    initGame, resetGame, selectDirection, executeMove,
  } from './lib/game/gameState.js';
  import { getAvailableDirections } from './lib/game/movement.js';
  import { generateGalaxy, loadGalaxy, saveGalaxy, unlockAdjacentBoards, isGalaxyComplete } from './lib/game/galaxy.js';
  import { onMount } from 'svelte';

  // Subscribe to stores
  let boardData = $derived($board);
  let phase = $derived($gamePhase);
  let pos = $derived($playerPos);
  let visitedSet = $derived($visited);
  let selDir = $derived($selectedDirection);
  let preview = $derived($previewPath);
  let animPath = $derived($animatingPath);
  let animStep = $derived($animationStep);
  let galaxy = $derived($galaxyState);

  // On mount, load or generate galaxy
  onMount(() => {
    const saved = loadGalaxy();
    if (saved) {
      galaxyState.set(saved);
    } else {
      galaxyState.set(generateGalaxy());
    }
  });

  // Construct enemy render data from boardData
  let enemyRenderData = $derived.by(() => {
    if (!boardData || !boardData.enemies) return [];
    return boardData.enemies.map(enemy => {
      const affected = enemy.getAffectedVertices(null, boardData.rays, boardData.obstacles);
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

  function handleSelectBoard(row, col) {
    const boardInfo = galaxy[row][col];
    currentBoardPos.set({ row, col });
    initGame(boardInfo.cols, boardInfo.rows, boardInfo.seed, boardInfo.difficulty);
  }

  function handleDirectionSelect(direction) {
    selectDirection(direction);
  }

  function handleConfirmMove() {
    executeMove();
  }

  function handleContinue() {
    const boardPos = $currentBoardPos;
    const currentPhase = $gamePhase;

    if (boardPos && galaxy) {
      const { row, col } = boardPos;
      const updatedGalaxy = galaxy.map(r => r.map(b => ({ ...b })));

      // Update board status based on win/loss
      updatedGalaxy[row][col].status = currentPhase === 'won' ? 'won' : 'lost';

      // If won, unlock adjacent boards
      if (currentPhase === 'won') {
        unlockAdjacentBoards(updatedGalaxy, row, col);
      }

      // Save and update store
      saveGalaxy(updatedGalaxy);
      galaxyState.set(updatedGalaxy);

      // Check completion
      if (isGalaxyComplete(updatedGalaxy)) {
        currentBoardPos.set(null);
        board.set(null);
        gamePhase.set('galaxyComplete');
        return;
      }
    }

    resetGame();
  }
</script>

<main>
  <h1>Game Time</h1>

  {#if phase === 'galaxyComplete' && galaxy}
    <GalaxyComplete {galaxy} />

  {:else if phase === 'galaxy' && galaxy}
    <GalaxySelection {galaxy} onSelectBoard={handleSelectBoard} />

  {:else if phase === 'won' || phase === 'lost'}
    <GameOver onPlayAgain={handleContinue} />

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

    {#if phase === 'engagementChoice'}
      <EngagementModal />
    {/if}
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
