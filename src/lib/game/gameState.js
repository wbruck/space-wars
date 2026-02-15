import { writable, get } from 'svelte/store';
import { generateGrid } from './hexGrid.js';
import { computePath, isTrapped } from './movement.js';
import { generateBoardObjects } from './boardObjects.js';
import { CombatEngine, PlayerShip, EnemyShip, getApproachAdvantage } from './combat.js';

// --- Svelte stores ---

/** Board data: { vertices, adjacency, rays, hexCenters, size, cols, rows, obstacles, startVertex, targetVertex } */
export const board = writable(null);

/** Current player vertex ID */
export const playerPos = writable(null);

/** Remaining movement points */
export const movementPool = writable(0);

/** Current dice roll (1-6 or null) */
export const diceValue = writable(null);

/** Game phase: 'galaxy' | 'rolling' | 'selectingDirection' | 'moving' | 'combat' | 'won' | 'lost' | 'galaxyComplete' */
export const gamePhase = writable('galaxy');

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

/** Combat state: null | { engine: CombatEngine, enemyId: string, approachAdvantage: object, preCombatPlayerPos: string, preCombatPath: string[], triggerVertexIndex: number } */
export const combatState = writable(null);

/** Galaxy state: null | Object[][] (3x3 grid of board objects) */
export const galaxyState = writable(null);

/** Current board position in galaxy: null | { row: number, col: number } */
export const currentBoardPos = writable(null);

/** Persistent player ship — damage carries across combats within a board */
export const playerShipStore = writable(null);

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
  let enemyZoneMap = new Map();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, difficulty, rng, grid.rays, grid.adjacency);
    obstacles = result.obstacleSet;
    boardObjects = [...result.obstacles, ...result.blackholes, ...result.enemies, ...result.powerUps];
    powerUps = result.powerUps;
    blackholes = result.blackholes;
    enemies = result.enemies;
    blackholeSet = result.blackholeSet;
    enemyZones = result.enemyZones;
    enemyZoneMap = result.enemyZoneMap;

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
      enemyZoneMap = new Map();
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
    enemyZoneMap,
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
  playerShipStore.set(new PlayerShip());

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

  const result = computePath(rays, direction, steps, boardData.obstacles, boardData.targetVertex, boardData.blackholeSet, boardData.enemyZones, boardData.enemyZoneMap);

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
  const moveDirection = get(selectedDirection);
  const preMovePos = get(playerPos);

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

      // Check engagement BEFORE other state changes — combat interrupts the move
      if (boardData.enemyZoneMap && boardData.enemyZoneMap.has(finalPos)) {
        const zoneInfo = boardData.enemyZoneMap.get(finalPos);
        const enemyId = zoneInfo.enemyId;
        const enemyObj = boardData.enemies.find(e => e.id === enemyId);
        const enemyFacing = enemyObj ? enemyObj.direction : 0;
        const approachAdvantage = getApproachAdvantage(zoneInfo.zoneType, moveDirection, enemyFacing);
        // Clear animation state before entering combat
        animatingPath.set([]);
        animationStep.set(-1);
        startCombat(enemyId, approachAdvantage, preMovePos, path, path.length - 1);
        if (onAnimationComplete) onAnimationComplete();
        return;
      }

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

      // Legacy: enemy kill zone instant-death (when enemyZoneMap is not available)
      if (boardData.enemyZones?.has(finalPos) && !boardData.enemyZoneMap) {
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
 * Start a combat encounter.
 * Creates a CombatEngine, populates combatState, and transitions to 'combat' phase.
 *
 * @param {string} enemyId - The enemy's board object ID
 * @param {{ firstAttacker: 'player'|'enemy', bonusAttacks: number }} approachAdvantage - Approach advantage result
 * @param {string} preCombatPos - Player's position before the move that triggered combat
 * @param {string[]} path - The movement path that triggered combat
 * @param {number} triggerIndex - Index in the path where combat was triggered
 */
export function startCombat(enemyId, approachAdvantage, preCombatPos, path, triggerIndex) {
  // Reuse persistent player ship (damage carries across combats)
  const playerShip = get(playerShipStore) || new PlayerShip();
  if (!get(playerShipStore)) {
    playerShipStore.set(playerShip);
  }

  // Reuse existing EnemyShip if enemy has one (damage persists between encounters)
  const boardData = get(board);
  const enemyObj = boardData?.enemies.find(e => e.id === enemyId);
  const enemyShip = enemyObj?.combatShip || new EnemyShip();

  // Store the EnemyShip on the enemy board object for damage persistence
  if (enemyObj && !enemyObj.combatShip) {
    enemyObj.combatShip = enemyShip;
  }

  const engine = new CombatEngine({ playerShip, enemyShip });

  engine.setFirstAttacker(approachAdvantage.firstAttacker);
  engine.bonusAttacks = approachAdvantage.bonusAttacks;
  engine.rollBonus = approachAdvantage.rollBonus || 0;

  combatState.set({
    engine,
    enemyId,
    approachAdvantage,
    preCombatPlayerPos: preCombatPos,
    preCombatPath: path,
    triggerVertexIndex: triggerIndex,
  });

  gamePhase.set('combat');
}

/**
 * Resolve a combat encounter and return to the board game.
 *
 * @param {string} result - Combat result: 'playerWin' | 'playerLose' | 'playerDestroyed' | 'enemyFled' | 'escaped'
 */
export function resolveCombat(result) {
  const combat = get(combatState);
  if (!combat) return;

  const boardData = get(board);

  if (result === 'playerDestroyed') {
    // Game over — player ship destroyed
    loseReason.set('enemy');
    gamePhase.set('lost');
    combatState.set(null);
    return;
  }

  if (result === 'playerWin') {
    // Remove the enemy from the board
    if (boardData) {
      // Find the enemy object to get its vertex
      const enemyObj = boardData.enemies.find(e => e.id === combat.enemyId);
      if (enemyObj) {
        // Remove from obstacles set (enemy's own vertex)
        boardData.obstacles.delete(enemyObj.vertexId);

        // Remove all zone vertices for this enemy (vision + proximity)
        if (boardData.enemyZoneMap) {
          for (const [zoneVertex, zoneInfo] of boardData.enemyZoneMap) {
            if (zoneInfo.enemyId === combat.enemyId) {
              boardData.enemyZoneMap.delete(zoneVertex);
              boardData.enemyZones.delete(zoneVertex);
            }
          }
        }

        // Mark enemy as destroyed (keep in array for visual rendering at reduced opacity)
        enemyObj.destroyed = true;

        // Remove from boardObjects array
        boardData.boardObjects = boardData.boardObjects.filter(o => o.id !== combat.enemyId);

        // Update the board store to trigger reactivity (spread to create new reference
        // so Svelte 5's $derived detects the change)
        board.set({ ...boardData });
      }
    }
  }

  // On enemyFled: reduce vision range and recompute zones
  if (result === 'enemyFled' && boardData) {
    const enemyObj = boardData.enemies.find(e => e.id === combat.enemyId);
    if (enemyObj) {
      // Reduce vision range to 1 (disarmed — can't shoot far)
      enemyObj.range = 1;

      // Remove all existing zones for this enemy
      if (boardData.enemyZoneMap) {
        for (const [zoneVertex, zoneInfo] of boardData.enemyZoneMap) {
          if (zoneInfo.enemyId === combat.enemyId) {
            boardData.enemyZoneMap.delete(zoneVertex);
            boardData.enemyZones.delete(zoneVertex);
          }
        }
      }

      // Recompute vision zone (range 1) from enemy's facing direction
      if (boardData.rays) {
        const vertexRays = boardData.rays.get(enemyObj.vertexId);
        if (vertexRays) {
          const facingRay = vertexRays.find(r => r.direction === enemyObj.direction);
          if (facingRay && facingRay.vertices.length > 0) {
            const visionVertex = facingRay.vertices[0];
            if (!boardData.obstacles.has(visionVertex) &&
                visionVertex !== boardData.startVertex &&
                visionVertex !== boardData.targetVertex) {
              boardData.enemyZones.add(visionVertex);
              boardData.enemyZoneMap.set(visionVertex, { enemyId: enemyObj.id, zoneType: 'vision' });
            }
          }
        }
      }

      // Recompute proximity zones via BFS (depth 2)
      if (boardData.adjacency) {
        const proxVisited = new Set();
        proxVisited.add(enemyObj.vertexId);
        let frontier = [enemyObj.vertexId];
        for (let depth = 0; depth < 2; depth++) {
          const nextFrontier = [];
          for (const fv of frontier) {
            const neighbors = boardData.adjacency.get(fv) || [];
            for (const nv of neighbors) {
              if (proxVisited.has(nv)) continue;
              proxVisited.add(nv);
              if (boardData.obstacles.has(nv)) continue;
              if (nv === boardData.startVertex || nv === boardData.targetVertex) continue;
              if (!boardData.enemyZones.has(nv)) {
                boardData.enemyZones.add(nv);
                boardData.enemyZoneMap.set(nv, { enemyId: enemyObj.id, zoneType: 'proximity' });
              }
              nextFrontier.push(nv);
            }
          }
          frontier = nextFrontier;
        }
      }

      board.set({ ...boardData });
    }
  }

  // Position depends on outcome
  if (result === 'playerWin' || result === 'enemyFled') {
    // Player stays at combat position; mark path as visited
    const combatVertex = combat.preCombatPath[combat.triggerVertexIndex];
    playerPos.set(combatVertex);

    const vis = get(visited);
    const newVis = new Set(vis);
    for (let i = 0; i <= combat.triggerVertexIndex; i++) {
      newVis.add(combat.preCombatPath[i]);
    }
    visited.set(newVis);
  } else {
    // playerLose: return to pre-combat position
    playerPos.set(combat.preCombatPlayerPos);
  }

  // Deduct steps used for all non-destroyed outcomes
  const stepsUsed = combat.triggerVertexIndex + 1;
  const pool = get(movementPool);
  const newPool = pool - stepsUsed;
  movementPool.set(newPool);

  if (newPool <= 0) {
    loseReason.set('exhausted');
    gamePhase.set('lost');
    combatState.set(null);
    return;
  }

  // Clear animation/preview state
  selectedDirection.set(null);
  previewPath.set([]);
  animatingPath.set([]);
  animationStep.set(-1);
  diceValue.set(null);

  // Back to rolling
  gamePhase.set('rolling');
  combatState.set(null);
}

/**
 * Reset game to setup phase.
 */
export function resetGame() {
  board.set(null);
  playerPos.set(null);
  movementPool.set(0);
  diceValue.set(null);
  gamePhase.set('galaxy');
  visited.set(new Set());
  movesMade.set(0);
  selectedDirection.set(null);
  previewPath.set([]);
  animatingPath.set([]);
  animationStep.set(-1);
  loseReason.set(null);
  combatState.set(null);
  playerShipStore.set(null);
  currentBoardPos.set(null);
}
