import { writable, get } from 'svelte/store';
import { generateGrid } from './hexGrid.js';

// --- Svelte stores ---

/** Board data: { vertices, adjacency, rays, hexCenters, size, radius, obstacles, startVertex, targetVertex } */
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
 * @param {number} radius - Board radius (2, 3, or 4)
 * @param {number} [seed] - Optional RNG seed for reproducible obstacle placement
 * @returns {object} The board data (also written to stores)
 */
export function initGame(radius, seed) {
  const grid = generateGrid(radius, 40);
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
    radius: grid.radius,
    obstacles,
    startVertex,
    targetVertex,
  };

  // Update all stores
  board.set(boardData);
  playerPos.set(startVertex);
  movementPool.set(radius * 10);
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

  const raw = Math.floor(Math.random() * 6) + 1;
  const pool = get(movementPool);
  const effective = Math.min(raw, pool);

  diceValue.set(effective);
  gamePhase.set('selectingDirection');

  return effective;
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
}
