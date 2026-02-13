<script>
  import Board from './lib/components/Board.svelte';
  import { generateGrid } from './lib/game/hexGrid.js';

  let radius = $state(2);

  // Generate demo data for preview: pick a start, target, some obstacles
  let demo = $derived.by(() => {
    const grid = generateGrid(radius, 40);
    const ids = [...grid.vertices.keys()];

    // Pick start near one edge, target near the opposite
    const startVertex = ids[0];
    const targetVertex = ids[ids.length - 1];

    // Pick a few random obstacles (avoid start/target)
    const obstacleCount = Math.floor(ids.length * 0.1);
    const obstacles = new Set();
    const candidates = ids.filter(id => id !== startVertex && id !== targetVertex);
    for (let i = 0; i < obstacleCount && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      obstacles.add(candidates[idx]);
      candidates.splice(idx, 1);
    }

    return { startVertex, targetVertex, obstacles, playerPos: startVertex };
  });

  function setRadius(r) {
    radius = r;
  }
</script>

<main>
  <h1>Game Time</h1>
  <p>Hex Vertex Strategy Board Game</p>

  <div class="size-buttons">
    <button class:active={radius === 2} onclick={() => setRadius(2)}>Small (19 hexes)</button>
    <button class:active={radius === 3} onclick={() => setRadius(3)}>Medium (37 hexes)</button>
    <button class:active={radius === 4} onclick={() => setRadius(4)}>Large (61 hexes)</button>
  </div>

  <Board
    {radius}
    startVertex={demo.startVertex}
    targetVertex={demo.targetVertex}
    obstacles={demo.obstacles}
    playerPos={demo.playerPos}
  />
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

  @media (prefers-color-scheme: dark) {
    h1 { color: #eee; }
    p { color: #aaa; }
  }
</style>
