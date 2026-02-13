import { writable, get } from 'svelte/store';
import { generateGrid } from './hexGrid.js';
import { computePath, isTrapped } from './movement.js';

// --- Svelte stores ---

/** Board data: { vertices, adjacency, rays, hexCenters, size, cols, rows, obstacles, startVertex, targetVertex } */
export const board = writable(null);

/** Current player vertex ID */
export const playerPos = writable(null);

/** Remaining movement points */
export const movementPool = writable(0);

/** Current dice roll (1-6 or null) */
export const diceValue = writable(null);

/** Game phase: 'setup' | 'rolling' | 'selectingDirection' | 'moving' | 'won' | 'lost' */
export const gamePhase = writable('setup');

/** Set of visited vertex IDs */
export const visited = writable(new Set());

/** Total moves made (for stats) */
export const movesMade = writable(0);

/** Currently selected direction index (0-5 or null) */
export const selectedDirection = writable(null);

/** Preview path: array of vertex IDs for the currently previewed direction */
export const previewPath = writable([]);

/** Animation state: array of vertex IDs being animated (step-by-step) */
export const animatingPath = writable([]);

/** Index of current animation step (-1 = not animating) */
export const animationStep = writable(-1);

// --- Helper functions ---

/**
 * Compute Euclidean distance between two vertices by their IDs.
 */
function vertexDistance(vertices, id1, id2) {
  const v1 = vertices.get(id1);
  const v2 = vertices.get(id2);
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * BFS to check if a path exists from start to target, avoiding obstacles.
 * @param {Map<string, string[]>} adjacency
 * @param {string} start
 * @param {string} target
 * @param {Set<string>} obstacles
 * @returns {boolean}
 */
export function hasValidPath(adjacency, start, target, obstacles) {
  if (start === target) return true;
  const visited = new Set();
  const queue = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (neighbor === target) return true;
      if (!visited.has(neighbor) && !obstacles.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

/**
 * Simple seeded random for reproducible tests. Uses xorshift32.
 */
function makeRng(seed) {
  let s = seed | 0;
  if (s === 0) s = 1;
  return function () {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

/**
 * Initialize a new game.
 *
 * @param {number} cols - Number of hex columns
 * @param {number} rows - Number of hex rows
 * @param {number} [seed] - Optional RNG seed for reproducible obstacle placement
 * @returns {object} The board data (also written to stores)
 */
export function initGame(cols, rows, seed) {
  const grid = generateGrid(cols, rows, 40);
  const ids = [...grid.vertices.keys()];
  const rng = seed != null ? makeRng(seed) : Math.random.bind(Math);

  // Pick start and target at reasonable distance apart.
  // Strategy: pick two vertices near opposite edges of the board.
  // Sort by distance from origin, pick start from the far edge on one side
  // and target from the far edge on the other.
  const center = { x: 0, y: 0 };
  const sortedByDist = ids
    .map(id => {
      const v = grid.vertices.get(id);
      const d = Math.sqrt(v.x * v.x + v.y * v.y);
      return { id, d, x: v.x, y: v.y };
    })
    .sort((a, b) => b.d - a.d);

  // Pick start as the vertex farthest in one direction
  const startVertex = sortedByDist[0].id;
  const startV = grid.vertices.get(startVertex);

  // Pick target as the vertex farthest from start
  let bestTargetDist = -1;
  let targetVertex = null;
  for (const { id } of sortedByDist) {
    if (id === startVertex) continue;
    const dist = vertexDistance(grid.vertices, startVertex, id);
    if (dist > bestTargetDist) {
      bestTargetDist = dist;
      targetVertex = id;
    }
  }

  // Place random obstacles (about 10-15% of non-start/target vertices)
  const obstacleCount = Math.floor(ids.length * 0.12);
  const candidates = ids.filter(id => id !== startVertex && id !== targetVertex);

  let obstacles = new Set();
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    obstacles = new Set();
    const pool = [...candidates];

    for (let i = 0; i < obstacleCount && pool.length > 0; i++) {
      const idx = Math.floor(rng() * pool.length);
      obstacles.add(pool[idx]);
      pool.splice(idx, 1);
    }

    // Verify path exists
    if (hasValidPath(grid.adjacency, startVertex, targetVertex, obstacles)) {
      break;
    }
    // If last attempt still fails, use empty obstacles
    if (attempt === maxAttempts - 1) {
      obstacles = new Set();
    }
  }

  const boardData = {
    vertices: grid.vertices,
    adjacency: grid.adjacency,
    rays: grid.rays,
    hexCenters: grid.hexCenters,
    size: grid.size,
    cols: grid.cols,
    rows: grid.rows,
    obstacles,
    startVertex,
    targetVertex,
  };

  // Update all stores
  board.set(boardData);
  playerPos.set(startVertex);
  movementPool.set((cols + rows) * 5);
  diceValue.set(null);
  gamePhase.set('rolling');
  visited.set(new Set([startVertex]));
  movesMade.set(0);

  return boardData;
}

/**
 * Roll the dice (1-6), cap to remaining movement pool, store result,
 * and transition to selectingDirection phase.
 * Only works during the 'rolling' phase.
 *
 * @returns {number|null} The effective dice value (capped to pool), or null if not in rolling phase.
 */
export function rollDice() {
  const phase = get(gamePhase);
  if (phase !== 'rolling') return null;

  // Check trapped condition before rolling
  const boardData = get(board);
  const pos = get(playerPos);
  if (boardData && pos && isTrapped(boardData.rays, pos, boardData.obstacles)) {
    gamePhase.set('lost');
    return null;
  }

  const raw = Math.floor(Math.random() * 6) + 1;
  const pool = get(movementPool);
  const effective = Math.min(raw, pool);

  diceValue.set(effective);
  gamePhase.set('selectingDirection');

  return effective;
}

/**
 * Preview a direction: compute the path and store it for display.
 * Only works during selectingDirection phase.
 *
 * @param {number} direction - Direction index (0-5)
 * @returns {{ path: string[], reachedTarget: boolean }|null}
 */
export function selectDirection(direction) {
  const phase = get(gamePhase);
  if (phase !== 'selectingDirection') return null;

  const boardData = get(board);
  const pos = get(playerPos);
  const dice = get(diceValue);
  const pool = get(movementPool);

  if (!boardData || !pos || dice == null) return null;

  const steps = Math.min(dice, pool);
  const rays = boardData.rays.get(pos);
  if (!rays) return null;

  const result = computePath(rays, direction, steps, boardData.obstacles, boardData.targetVertex);

  selectedDirection.set(direction);
  previewPath.set(result.path);

  return result;
}

/**
 * Execute the currently previewed move.
 * Animates the player step-by-step, then updates state.
 * Only works during selectingDirection phase with a preview set.
 *
 * @param {function} [onAnimationComplete] - Callback after animation finishes
 * @returns {boolean} Whether the move was initiated
 */
export function executeMove(onAnimationComplete) {
  const phase = get(gamePhase);
  if (phase !== 'selectingDirection') return false;

  const path = get(previewPath);
  if (path.length === 0) return false;

  const boardData = get(board);
  const dice = get(diceValue);
  const pool = get(movementPool);

  gamePhase.set('moving');
  animatingPath.set(path);
  animationStep.set(0);

  const stepDelay = 150;
  let step = 0;

  function advanceStep() {
    if (step >= path.length) {
      // Animation complete
      const finalPos = path[path.length - 1];
      const stepsUsed = path.length;

      // Update player position
      playerPos.set(finalPos);

      // Mark all path vertices as visited
      const vis = get(visited);
      const newVis = new Set(vis);
      for (const vid of path) {
        newVis.add(vid);
      }
      visited.set(newVis);

      // Deduct movement pool
      const newPool = pool - stepsUsed;
      movementPool.set(newPool);

      // Increment moves made
      movesMade.update((n) => n + 1);

      // Clear preview state
      selectedDirection.set(null);
      previewPath.set([]);
      animatingPath.set([]);
      animationStep.set(-1);

      // Check win condition (target reached during path)
      if (finalPos === boardData.targetVertex) {
        gamePhase.set('won');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check lose condition: out of movement points
      if (newPool <= 0) {
        gamePhase.set('lost');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check trapped condition
      if (isTrapped(boardData.rays, finalPos, boardData.obstacles)) {
        gamePhase.set('lost');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Back to rolling
      diceValue.set(null);
      gamePhase.set('rolling');
      if (onAnimationComplete) onAnimationComplete();
      return;
    }

    // Advance animation step
    animationStep.set(step);
    step++;
    setTimeout(advanceStep, stepDelay);
  }

  // Start the animation
  advanceStep();
  return true;
}

/**
 * Reset game to setup phase.
 */
export function resetGame() {
  board.set(null);
  playerPos.set(null);
  movementPool.set(0);
  diceValue.set(null);
  gamePhase.set('setup');
  visited.set(new Set());
  movesMade.set(0);
  selectedDirection.set(null);
  previewPath.set([]);
  animatingPath.set([]);
  animationStep.set(-1);
}
