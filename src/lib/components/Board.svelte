<script>
  import { generateGrid, isCenterVertex } from '../game/hexGrid.js';
  import { getAvailableDirections } from '../game/movement.js';

  /**
   * Board component props:
   * @prop {number} cols - Number of hex columns
   * @prop {number} rows - Number of hex rows
   * @prop {string|null} startVertex - Vertex ID for start position
   * @prop {string|null} targetVertex - Vertex ID for target position
   * @prop {Set<string>} obstacles - Set of obstacle vertex IDs
   * @prop {string|null} playerPos - Current player vertex ID
   * @prop {Set<string>} visited - Set of visited vertex IDs
   * @prop {string} gamePhase - Current game phase
   * @prop {Array<{direction: number, vertices: string[]}>|null} availableDirections - Available directions from current position
   * @prop {string[]} previewPath - Path vertices for current preview
   * @prop {number|null} selectedDirection - Currently selected direction
   * @prop {string[]} animatingPath - Path being animated
   * @prop {number} animationStep - Current animation step index (-1 = not animating)
   * @prop {function} onDirectionSelect - Callback when a direction is tapped
   * @prop {function} onConfirmMove - Callback when move is confirmed
   */
  let {
    cols = 5,
    rows = 4,
    startVertex = null,
    targetVertex = null,
    obstacles = new Set(),
    blackholes = new Set(),
    enemies = [],
    playerPos = null,
    visited = new Set(),
    gamePhase = 'setup',
    availableDirections = null,
    previewPath = [],
    selectedDirection = null,
    animatingPath = [],
    animationStep = -1,
    onDirectionSelect = () => {},
    onConfirmMove = () => {},
  } = $props();

  const HEX_SIZE = 40;

  let grid = $derived(generateGrid(cols, rows, HEX_SIZE));

  // Compute SVG viewBox from vertex positions
  let viewBox = $derived.by(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of grid.vertices.values()) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    const pad = HEX_SIZE * 1.5;
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
  // Separate corner-corner edges from hub-spoke (center↔corner) edges
  let cornerEdges = $derived.by(() => {
    const edgeList = [];
    for (const [vid, neighbors] of grid.adjacency) {
      if (isCenterVertex(vid)) continue;
      const v = grid.vertices.get(vid);
      for (const nid of neighbors) {
        if (vid < nid && !isCenterVertex(nid)) {
          const n = grid.vertices.get(nid);
          edgeList.push({ x1: v.x, y1: v.y, x2: n.x, y2: n.y });
        }
      }
    }
    return edgeList;
  });

  let hubSpokeEdges = $derived.by(() => {
    const edgeList = [];
    for (const [vid, neighbors] of grid.adjacency) {
      if (!isCenterVertex(vid)) continue;
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

  // Enemy-related derived sets
  let enemyVertexSet = $derived(new Set(enemies.map(e => e.vertexId)));
  let killZoneSet = $derived(new Set(enemies.flatMap(e => e.killZoneVertices)));

  // Preview path set for quick lookup
  let previewSet = $derived(new Set(previewPath));

  // Animated path vertices that have been "stepped through"
  let animatedSet = $derived.by(() => {
    if (animationStep < 0 || animatingPath.length === 0) return new Set();
    const s = new Set();
    for (let i = 0; i <= Math.min(animationStep, animatingPath.length - 1); i++) {
      s.add(animatingPath[i]);
    }
    return s;
  });

  // Current animated player position (during animation)
  let animatedPlayerPos = $derived.by(() => {
    if (animationStep >= 0 && animatingPath.length > 0) {
      const idx = Math.min(animationStep, animatingPath.length - 1);
      return animatingPath[idx];
    }
    return playerPos;
  });

  // Direction arrow indicators: compute arrow endpoints from player position
  let directionArrows = $derived.by(() => {
    if (gamePhase !== 'selectingDirection' || !availableDirections || !playerPos) return [];
    const pv = grid.vertices.get(playerPos);
    if (!pv) return [];

    const arrowLen = HEX_SIZE * 1.0;
    return availableDirections.map((dir) => {
      const angle = (Math.PI / 3) * dir.direction;
      const tx = pv.x + arrowLen * Math.cos(angle);
      const ty = pv.y + arrowLen * Math.sin(angle);
      return {
        direction: dir.direction,
        x1: pv.x,
        y1: pv.y,
        x2: tx,
        y2: ty,
        isSelected: selectedDirection === dir.direction,
      };
    });
  });

  // Check if a vertex is in an active state (not default)
  function isActiveVertex(v) {
    return v.id === targetVertex ||
      v.id === startVertex ||
      enemyVertexSet.has(v.id) ||
      killZoneSet.has(v.id) ||
      obstacles.has(v.id) ||
      blackholes.has(v.id) ||
      animatedSet.has(v.id) ||
      previewSet.has(v.id) ||
      visited.has(v.id);
  }

  // Determine vertex fill color
  // Center vertices: transparent (hollow ring) in default state, same colors when active
  function vertexColor(v) {
    if (v.id === targetVertex) return '#e8a735';
    if (v.id === startVertex) return '#4caf50';
    if (enemyVertexSet.has(v.id)) return '#c62828';
    if (blackholes.has(v.id)) return '#1a0033';
    if (killZoneSet.has(v.id)) return 'rgba(198,40,40,0.25)';
    if (obstacles.has(v.id)) return '#444';
    if (animatedSet.has(v.id)) return '#90caf9';
    if (previewSet.has(v.id)) return '#64b5f6';
    if (visited.has(v.id)) return '#b0c4de';
    if (v.type === 'center') return 'transparent';
    return '#888';
  }

  function handleArrowClick(direction) {
    if (gamePhase !== 'selectingDirection') return;
    if (selectedDirection === direction) {
      // Second tap on same direction = confirm
      onConfirmMove();
    } else {
      onDirectionSelect(direction);
    }
  }

  // Vertex radius for rendering (sized for touch targets)
  const VERTEX_R = 8;
  const PLAYER_R = 11;
  const ARROW_HIT_R = 18;
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

  <!-- Hub-spoke edges (center↔corner) — thinner/lighter -->
  {#each hubSpokeEdges as e}
    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="hub-spoke-line" />
  {/each}

  <!-- Corner-to-corner edges -->
  {#each cornerEdges as e}
    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="edge-line" />
  {/each}

  <!-- Preview path highlight (draw lines along the preview) -->
  {#if previewPath.length > 0 && playerPos && grid.vertices.has(playerPos)}
    {@const start = grid.vertices.get(playerPos)}
    {#each previewPath as vid, i}
      {@const prev = i === 0 ? start : grid.vertices.get(previewPath[i - 1])}
      {@const curr = grid.vertices.get(vid)}
      {#if prev && curr}
        <line
          x1={prev.x} y1={prev.y}
          x2={curr.x} y2={curr.y}
          class="preview-line"
        />
      {/if}
    {/each}
  {/if}

  <!-- Enemy kill zone overlay (rendered before vertices so it appears behind) -->
  {#each enemies as enemy}
    {#each enemy.killZoneVertices as kzVid}
      {@const kzv = grid.vertices.get(kzVid)}
      {#if kzv}
        <circle
          cx={kzv.x}
          cy={kzv.y}
          r={VERTEX_R + 3}
          class="kill-zone-overlay"
        />
      {/if}
    {/each}
  {/each}

  <!-- Vertices -->
  {#each vertexList as v}
    <circle
      cx={v.x}
      cy={v.y}
      r={VERTEX_R}
      fill={vertexColor(v)}
      class="vertex"
      class:center-vertex={v.type === 'center'}
      class:center-active={v.type === 'center' && isActiveVertex(v)}
      class:blackhole={blackholes.has(v.id)}
      class:enemy={enemyVertexSet.has(v.id)}
      class:kill-zone={killZoneSet.has(v.id)}
      class:obstacle={obstacles.has(v.id)}
      class:preview={previewSet.has(v.id)}
      class:animated={animatedSet.has(v.id)}
    />
    <!-- X marker for obstacles (not blackholes or enemies) -->
    {#if obstacles.has(v.id) && !enemyVertexSet.has(v.id)}
      <line
        x1={v.x - 5} y1={v.y - 5}
        x2={v.x + 5} y2={v.y + 5}
        class="obstacle-x"
      />
      <line
        x1={v.x + 5} y1={v.y - 5}
        x2={v.x - 5} y2={v.y + 5}
        class="obstacle-x"
      />
    {/if}
    <!-- Blackhole concentric ring indicator -->
    {#if blackholes.has(v.id)}
      <circle
        cx={v.x}
        cy={v.y}
        r={5}
        class="blackhole-ring"
      />
      <circle
        cx={v.x}
        cy={v.y}
        r={2}
        class="blackhole-core"
      />
    {/if}
  {/each}

  <!-- Enemy direction indicators -->
  {#each enemies as enemy}
    {@const ev = grid.vertices.get(enemy.vertexId)}
    {#if ev}
      {@const angle = (Math.PI / 3) * enemy.direction}
      {@const arrowLen = VERTEX_R + 6}
      {@const headLen = 6}
      {@const tx = ev.x + arrowLen * Math.cos(angle)}
      {@const ty = ev.y + arrowLen * Math.sin(angle)}
      <line
        x1={ev.x} y1={ev.y}
        x2={tx} y2={ty}
        class="enemy-direction"
      />
      <polygon
        points="{tx},{ty} {tx - headLen * Math.cos(angle - 0.4)},{ty - headLen * Math.sin(angle - 0.4)} {tx - headLen * Math.cos(angle + 0.4)},{ty - headLen * Math.sin(angle + 0.4)}"
        class="enemy-arrow-head"
      />
    {/if}
  {/each}

  <!-- Direction arrows (shown during selectingDirection phase) -->
  {#each directionArrows as arrow}
    <!-- Visible arrow line -->
    <line
      x1={arrow.x1} y1={arrow.y1}
      x2={arrow.x2} y2={arrow.y2}
      class="direction-arrow"
      class:selected={arrow.isSelected}
    />
    <!-- Arrowhead -->
    {@const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1)}
    {@const headLen = 8}
    <polygon
      points="{arrow.x2},{arrow.y2} {arrow.x2 - headLen * Math.cos(angle - 0.4)},{arrow.y2 - headLen * Math.sin(angle - 0.4)} {arrow.x2 - headLen * Math.cos(angle + 0.4)},{arrow.y2 - headLen * Math.sin(angle + 0.4)}"
      class="arrow-head"
      class:selected={arrow.isSelected}
    />
    <!-- Invisible larger hit area for tapping -->
    <circle
      cx={arrow.x2}
      cy={arrow.y2}
      r={ARROW_HIT_R}
      class="arrow-hit-area"
      role="button"
      tabindex="0"
      aria-label={`Move direction ${arrow.direction}`}
      onclick={() => handleArrowClick(arrow.direction)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleArrowClick(arrow.direction); }}
    />
  {/each}

  <!-- Player token (drawn last to be on top) -->
  {#if animatedPlayerPos && grid.vertices.has(animatedPlayerPos)}
    {@const pv = grid.vertices.get(animatedPlayerPos)}
    <circle
      cx={pv.x}
      cy={pv.y}
      r={PLAYER_R}
      class="player-token"
    />
  {/if}
</svg>

{#if gamePhase === 'selectingDirection' && selectedDirection != null}
  <button class="confirm-btn" onclick={onConfirmMove}>
    Confirm Move
  </button>
{/if}

<style>
  .board-svg {
    width: 100%;
    max-width: 600px;
    height: auto;
    display: block;
    margin: 0 auto;
    touch-action: manipulation;
  }

  .hex-outline {
    fill: none;
    stroke: #ddd;
    stroke-width: 0.5;
  }

  .hub-spoke-line {
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

  .vertex.center-vertex {
    stroke: #999;
    stroke-width: 1;
  }

  .vertex.center-active {
    stroke-width: 0.5;
  }

  .vertex.obstacle {
    cursor: default;
  }

  .vertex.preview {
    stroke: #1976d2;
    stroke-width: 1.5;
  }

  .vertex.animated {
    stroke: #1565c0;
    stroke-width: 1.5;
  }

  .obstacle-x {
    stroke: #fff;
    stroke-width: 1.5;
    stroke-linecap: round;
    pointer-events: none;
  }

  .vertex.enemy {
    stroke: #b71c1c;
    stroke-width: 1.5;
    cursor: default;
  }

  .vertex.kill-zone {
    stroke: #c62828;
    stroke-width: 1;
  }

  .kill-zone-overlay {
    fill: rgba(198, 40, 40, 0.25);
    stroke: none;
    pointer-events: none;
  }

  .enemy-direction {
    stroke: #c62828;
    stroke-width: 2;
    stroke-linecap: round;
    pointer-events: none;
  }

  .enemy-arrow-head {
    fill: #c62828;
    pointer-events: none;
  }

  .vertex.blackhole {
    stroke: #7b1fa2;
    stroke-width: 1.5;
    cursor: default;
  }

  .blackhole-ring {
    fill: none;
    stroke: #9c27b0;
    stroke-width: 1;
    pointer-events: none;
  }

  .blackhole-core {
    fill: #9c27b0;
    pointer-events: none;
  }

  .preview-line {
    stroke: #64b5f6;
    stroke-width: 2.5;
    stroke-dasharray: 4 3;
    stroke-linecap: round;
    pointer-events: none;
    opacity: 0.7;
  }

  .direction-arrow {
    stroke: #ff9800;
    stroke-width: 2.5;
    stroke-linecap: round;
    pointer-events: none;
  }

  .direction-arrow.selected {
    stroke: #f44336;
    stroke-width: 3;
  }

  .arrow-head {
    fill: #ff9800;
    pointer-events: none;
  }

  .arrow-head.selected {
    fill: #f44336;
  }

  .arrow-hit-area {
    fill: transparent;
    cursor: pointer;
    touch-action: manipulation;
  }

  .player-token {
    fill: #2196f3;
    stroke: #0d47a1;
    stroke-width: 1.5;
  }

  .confirm-btn {
    display: block;
    margin: 0.5rem auto;
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
    background: #f44336;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    min-height: 44px;
    min-width: 120px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .confirm-btn:hover {
    background: #d32f2f;
  }

  .confirm-btn:active {
    background: #b71c1c;
  }

  @media (prefers-color-scheme: dark) {
    .hex-outline {
      stroke: #444;
    }
    .hub-spoke-line {
      stroke: #444;
    }
    .edge-line {
      stroke: #555;
    }
    .vertex {
      stroke: #999;
    }
    .vertex.center-vertex {
      stroke: #777;
    }
    .vertex.enemy {
      stroke: #ef5350;
    }
    .kill-zone-overlay {
      fill: rgba(239, 83, 80, 0.3);
    }
    .enemy-direction {
      stroke: #ef5350;
    }
    .enemy-arrow-head {
      fill: #ef5350;
    }
    .vertex.blackhole {
      stroke: #ce93d8;
    }
    .blackhole-ring {
      stroke: #ce93d8;
    }
    .blackhole-core {
      fill: #ce93d8;
    }
  }
</style>
