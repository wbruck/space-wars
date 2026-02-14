import { writable, get } from 'svelte/store';
import { generateGrid } from './hexGrid.js';
import { computePath, isTrapped } from './movement.js';
import { generateBoardObjects } from './boardObjects.js';

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

/** Reason for losing: 'blackhole' | 'enemy' | 'trapped' | 'exhausted' | null */
export const loseReason = writable(null);

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
 * @param {number} [difficulty=5] - Difficulty level 1-10
 * @returns {object} The board data (also written to stores)
 */
export function initGame(cols, rows, seed, difficulty = 5) {
  const grid = generateGrid(cols, rows, 40);
  const ids = [...grid.vertices.keys()];
  const rng = seed != null ? makeRng(seed) : Math.random.bind(Math);

  // Pick start and target at reasonable distance apart.
  const sortedByDist = ids
    .map(id => {
      const v = grid.vertices.get(id);
      const d = Math.sqrt(v.x * v.x + v.y * v.y);
      return { id, d, x: v.x, y: v.y };
    })
    .sort((a, b) => b.d - a.d);

  const startVertex = sortedByDist[0].id;

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

  // Place board objects using difficulty-scaled algorithm
  let obstacles = new Set();
  let boardObjects = [];
  let powerUps = [];
  const maxAttempts = 20;

  let blackholes = [];
  let enemies = [];
  let blackholeSet = new Set();
  let enemyZones = new Set();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, difficulty, rng, grid.rays);
    obstacles = result.obstacleSet;
    boardObjects = [...result.obstacles, ...result.blackholes, ...result.enemies, ...result.powerUps];
    powerUps = result.powerUps;
    blackholes = result.blackholes;
    enemies = result.enemies;
    blackholeSet = result.blackholeSet;
    enemyZones = result.enemyZones;

    if (hasValidPath(grid.adjacency, startVertex, targetVertex, obstacles)) {
      break;
    }
    if (attempt === maxAttempts - 1) {
      obstacles = new Set();
      boardObjects = [];
      powerUps = [];
      blackholes = [];
      enemies = [];
      blackholeSet = new Set();
      enemyZones = new Set();
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
    boardObjects,
    powerUps,
    blackholes,
    enemies,
    blackholeSet,
    enemyZones,
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
    loseReason.set('trapped');
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

  const result = computePath(rays, direction, steps, boardData.obstacles, boardData.targetVertex, boardData.blackholeSet, boardData.enemyZones);

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

      // Check hazard death: blackhole
      if (boardData.blackholeSet?.has(finalPos)) {
        loseReason.set('blackhole');
        gamePhase.set('lost');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check hazard death: enemy kill zone
      if (boardData.enemyZones?.has(finalPos)) {
        loseReason.set('enemy');
        gamePhase.set('lost');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check win condition (target reached during path)
      if (finalPos === boardData.targetVertex) {
        gamePhase.set('won');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check lose condition: out of movement points
      if (newPool <= 0) {
        loseReason.set('exhausted');
        gamePhase.set('lost');
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

      // Check trapped condition
      if (isTrapped(boardData.rays, finalPos, boardData.obstacles)) {
        loseReason.set('trapped');
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
  loseReason.set(null);
}
