<script>
  import { generateGrid } from '../game/hexGrid.js';

  /**
   * Board component props:
   * @prop {number} radius - Board radius (2, 3, or 4)
   * @prop {string|null} startVertex - Vertex ID for start position
   * @prop {string|null} targetVertex - Vertex ID for target position
   * @prop {Set<string>} obstacles - Set of obstacle vertex IDs
   * @prop {string|null} playerPos - Current player vertex ID
   * @prop {Set<string>} visited - Set of visited vertex IDs
   */
  let {
    radius = 2,
    startVertex = null,
    targetVertex = null,
    obstacles = new Set(),
    playerPos = null,
    visited = new Set(),
  } = $props();

  const HEX_SIZE = 40;

  let grid = $derived(generateGrid(radius, HEX_SIZE));

  // Compute SVG viewBox from vertex positions
  let viewBox = $derived.by(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of grid.vertices.values()) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    const pad = HEX_SIZE * 1.2;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  });

  // Build hex outline paths (flat-top hexagons)
  let hexPaths = $derived.by(() => {
    return grid.hexCenters.map(({ x: cx, y: cy }) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = cx + HEX_SIZE * Math.cos(angle);
        const py = cy + HEX_SIZE * Math.sin(angle);
        points.push(`${px},${py}`);
      }
      return points.join(' ');
    });
  });

  // Build edges (deduplicated: only draw edge if v1.id < v2.id)
  let edges = $derived.by(() => {
    const edgeList = [];
    for (const [vid, neighbors] of grid.adjacency) {
      const v = grid.vertices.get(vid);
      for (const nid of neighbors) {
        if (vid < nid) {
          const n = grid.vertices.get(nid);
          edgeList.push({ x1: v.x, y1: v.y, x2: n.x, y2: n.y });
        }
      }
    }
    return edgeList;
  });

  // All vertices as array
  let vertexList = $derived([...grid.vertices.values()]);

  // Determine vertex fill color
  function vertexColor(v) {
    if (v.id === targetVertex) return '#e8a735';
    if (v.id === startVertex) return '#4caf50';
    if (obstacles.has(v.id)) return '#444';
    if (visited.has(v.id)) return '#b0c4de';
    return '#888';
  }

  // Vertex radius for rendering
  const VERTEX_R = 6;
  const PLAYER_R = 9;
</script>

<svg
  class="board-svg"
  viewBox={viewBox}
  xmlns="http://www.w3.org/2000/svg"
  preserveAspectRatio="xMidYMid meet"
>
  <!-- Hex outlines as light guide lines -->
  {#each hexPaths as points}
    <polygon {points} class="hex-outline" />
  {/each}

  <!-- Edges between adjacent vertices -->
  {#each edges as e}
    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="edge-line" />
  {/each}

  <!-- Vertices -->
  {#each vertexList as v}
    <circle
      cx={v.x}
      cy={v.y}
      r={VERTEX_R}
      fill={vertexColor(v)}
      class="vertex"
      class:obstacle={obstacles.has(v.id)}
    />
    <!-- X marker for obstacles -->
    {#if obstacles.has(v.id)}
      <line
        x1={v.x - 4} y1={v.y - 4}
        x2={v.x + 4} y2={v.y + 4}
        class="obstacle-x"
      />
      <line
        x1={v.x + 4} y1={v.y - 4}
        x2={v.x - 4} y2={v.y + 4}
        class="obstacle-x"
      />
    {/if}
  {/each}

  <!-- Player token (drawn last to be on top) -->
  {#if playerPos && grid.vertices.has(playerPos)}
    {@const pv = grid.vertices.get(playerPos)}
    <circle
      cx={pv.x}
      cy={pv.y}
      r={PLAYER_R}
      class="player-token"
    />
  {/if}
</svg>

<style>
  .board-svg {
    width: 100%;
    max-width: 600px;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  .hex-outline {
    fill: none;
    stroke: #ddd;
    stroke-width: 0.5;
  }

  .edge-line {
    stroke: #ccc;
    stroke-width: 1;
  }

  .vertex {
    stroke: #555;
    stroke-width: 0.5;
    cursor: pointer;
  }

  .vertex.obstacle {
    cursor: default;
  }

  .obstacle-x {
    stroke: #fff;
    stroke-width: 1.5;
    stroke-linecap: round;
    pointer-events: none;
  }

  .player-token {
    fill: #2196f3;
    stroke: #0d47a1;
    stroke-width: 1.5;
  }

  @media (prefers-color-scheme: dark) {
    .hex-outline {
      stroke: #444;
    }
    .edge-line {
      stroke: #555;
    }
    .vertex {
      stroke: #999;
    }
  }
</style>
