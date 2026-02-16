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

/** Game phase: 'galaxy' | 'rolling' | 'selectingDirection' | 'moving' | 'combat' | 'engagementChoice' | 'won' | 'lost' | 'galaxyComplete' */
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

/** Pending engagement choice: null | { enemyId, approachAdvantage, preCombatPos, path, triggerIndex, zoneType, direction, originalDice } */
export const pendingEngagement = writable(null);

/** Whether the player is performing a stealth dive (avoided enemy, continuing movement) */
export const stealthDive = writable(false);

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
 * Pure function that determines the outcome of a move based on path computation results
 * and board state. Separates "what should happen" from side effects (animation, store updates).
 *
 * @param {string[]} path - The computed path vertices
 * @param {{ vertexIndex: number, enemyId: string, zoneType: string }|null} engageEnemy - Engagement info from computePath
 * @param {boolean} reachedTarget - Whether the path reaches the target
 * @param {boolean} hitBlackhole - Whether the path hits a black hole
 * @param {boolean} stoppedByObstacle - Whether movement was stopped by an obstacle
 * @param {number} currentPool - Current movement pool before this move
 * @param {string} targetVertex - The target vertex ID
 * @param {Map<string, Array>} rays - Ray map for trapped check
 * @param {Set<string>} obstacles - Obstacle set for trapped check
 * @param {number} moveDirection - Direction of movement (0-5)
 * @param {object} boardData - Board data for engagement lookups
 * @returns {{ finalPos: string, stepsConsumed: number, outcome: string, engageEnemy: object|null, engagement: object|null }}
 */
export function resolveMovePath(path, engageEnemy, reachedTarget, hitBlackhole, stoppedByObstacle, currentPool, targetVertex, rays, obstacles, moveDirection, boardData) {
  if (path.length === 0) {
    return { finalPos: null, stepsConsumed: 0, outcome: 'noMove', engageEnemy: null, engagement: null };
  }

  const finalPos = path[path.length - 1];
  const stepsConsumed = path.length;

  // Engagement takes priority (detected during path computation)
  if (engageEnemy) {
    const enemyObj = boardData?.enemies?.find(e => e.id === engageEnemy.enemyId);
    const enemyFacing = enemyObj ? enemyObj.direction : 0;
    const approachAdvantage = getApproachAdvantage(engageEnemy.zoneType, moveDirection, enemyFacing);

    const engagement = {
      enemyId: engageEnemy.enemyId,
      zoneType: engageEnemy.zoneType,
      approachAdvantage,
      enemyObj,
    };

    if (engageEnemy.zoneType === 'proximity') {
      return { finalPos, stepsConsumed, outcome: 'engageProximity', engageEnemy, engagement };
    } else {
      return { finalPos, stepsConsumed, outcome: 'engageVision', engageEnemy, engagement };
    }
  }

  // Black hole — instant death
  if (hitBlackhole) {
    return { finalPos, stepsConsumed, outcome: 'blackhole', engageEnemy: null, engagement: null };
  }

  // Win condition — target reached
  if (reachedTarget || finalPos === targetVertex) {
    return { finalPos, stepsConsumed, outcome: 'win', engageEnemy: null, engagement: null };
  }

  // Pool exhaustion
  const newPool = currentPool - stepsConsumed;
  if (newPool <= 0) {
    return { finalPos, stepsConsumed, outcome: 'poolExhausted', engageEnemy: null, engagement: null };
  }

  // Trapped check
  if (isTrapped(rays, finalPos, obstacles)) {
    return { finalPos, stepsConsumed, outcome: 'trapped', engageEnemy: null, engagement: null };
  }

  // Normal move
  return { finalPos, stepsConsumed, outcome: 'move', engageEnemy: null, engagement: null };
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

  // Reset stealth dive indicator at start of new turn
  stealthDive.set(false);

  const raw = Math.floor(Math.random() * 6) + 1;
  const pool = get(movementPool);

  // Engine damage caps movement: roll 1-3 → 1 step, roll 4-6 → 2 steps
  const ship = get(playerShipStore);
  const engineCapped = (ship && ship.isEngineDestroyed) ? (raw <= 3 ? 1 : 2) : raw;
  const effective = Math.min(engineCapped, pool);

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
 * Apply the resolved outcome after animation completes.
 * Shared by executeMove() and declineEngagement() to avoid duplication.
 *
 * @param {object} resolved - Result from resolveMovePath()
 * @param {string[]} path - The movement path
 * @param {number} pool - Movement pool before this move
 * @param {string} preMovePos - Player position before the move
 * @param {number} moveDirection - Direction of movement (0-5)
 * @param {number} dice - Original dice value
 * @param {object} boardData - Board data
 * @param {function} [onAnimationComplete] - Callback
 */
function applyMoveOutcome(resolved, path, pool, preMovePos, moveDirection, dice, boardData, onAnimationComplete) {
  const { finalPos, stepsConsumed, outcome, engagement } = resolved;

  if (outcome === 'engageProximity') {
    // Clear animation state before entering choice
    animatingPath.set([]);
    animationStep.set(-1);

    pendingEngagement.set({
      enemyId: engagement.enemyId,
      approachAdvantage: engagement.approachAdvantage,
      preCombatPos: preMovePos,
      path,
      triggerIndex: path.length - 1,
      zoneType: engagement.zoneType,
      direction: moveDirection,
      originalDice: dice,
    });
    playerPos.set(finalPos);
    gamePhase.set('engagementChoice');
    if (onAnimationComplete) onAnimationComplete();
    return;
  }

  if (outcome === 'engageVision') {
    // Clear animation state before entering combat
    animatingPath.set([]);
    animationStep.set(-1);

    startCombat(engagement.enemyId, engagement.approachAdvantage, preMovePos, path, path.length - 1);
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
  const newPool = pool - stepsConsumed;
  movementPool.set(newPool);

  // Increment moves made
  movesMade.update((n) => n + 1);

  // Clear preview state
  selectedDirection.set(null);
  previewPath.set([]);
  animatingPath.set([]);
  animationStep.set(-1);

  if (outcome === 'blackhole') {
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

  if (outcome === 'win') {
    gamePhase.set('won');
    if (onAnimationComplete) onAnimationComplete();
    return;
  }

  if (outcome === 'poolExhausted') {
    loseReason.set('exhausted');
    gamePhase.set('lost');
    if (onAnimationComplete) onAnimationComplete();
    return;
  }

  if (outcome === 'trapped') {
    loseReason.set('trapped');
    gamePhase.set('lost');
    if (onAnimationComplete) onAnimationComplete();
    return;
  }

  // Back to rolling
  diceValue.set(null);
  gamePhase.set('rolling');
  if (onAnimationComplete) onAnimationComplete();
}

/**
 * Execute the currently previewed move.
 * Pre-determines the outcome using resolveMovePath(), then animates step-by-step.
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

  // Pre-determine the outcome using computePath's engageEnemy as single source of truth
  const steps = Math.min(dice, pool);
  const rays = boardData.rays.get(preMovePos);
  const pathResult = computePath(rays, moveDirection, steps, boardData.obstacles, boardData.targetVertex, boardData.blackholeSet, boardData.enemyZones, boardData.enemyZoneMap);
  const resolved = resolveMovePath(
    pathResult.path, pathResult.engageEnemy, pathResult.reachedTarget, pathResult.hitBlackhole,
    pathResult.stoppedByObstacle, pool, boardData.targetVertex,
    boardData.rays, boardData.obstacles, moveDirection, boardData
  );

  gamePhase.set('moving');
  animatingPath.set(path);
  animationStep.set(0);

  const stepDelay = 150;
  let step = 0;

  function advanceStep() {
    if (step >= path.length) {
      applyMoveOutcome(resolved, path, pool, preMovePos, moveDirection, dice, boardData, onAnimationComplete);
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
          for (const [zoneVertex, entries] of boardData.enemyZoneMap) {
            const filtered = entries.filter(e => e.enemyId !== combat.enemyId);
            if (filtered.length === 0) {
              boardData.enemyZoneMap.delete(zoneVertex);
              boardData.enemyZones.delete(zoneVertex);
            } else {
              boardData.enemyZoneMap.set(zoneVertex, filtered);
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

  // Check if a surviving enemy is disarmed (weapons destroyed) — remove vision zones, keep proximity only
  if (result !== 'playerWin' && boardData) {
    const enemyObj = boardData.enemies.find(e => e.id === combat.enemyId);
    if (enemyObj && enemyObj.combatShip && !enemyObj.combatShip.canAttack) {
      // Remove all zone vertices for this enemy
      if (boardData.enemyZoneMap) {
        for (const [zoneVertex, entries] of boardData.enemyZoneMap) {
          const filtered = entries.filter(e => e.enemyId !== combat.enemyId);
          if (filtered.length === 0) {
            boardData.enemyZoneMap.delete(zoneVertex);
            boardData.enemyZones.delete(zoneVertex);
          } else {
            boardData.enemyZoneMap.set(zoneVertex, filtered);
          }
        }
      }

      // Recompute proximity-only zones via BFS (depth <= 2) from enemy vertex
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
              boardData.enemyZones.add(nv);
              const existing = boardData.enemyZoneMap.get(nv) || [];
              if (!existing.some(e => e.enemyId === enemyObj.id)) {
                existing.push({ enemyId: enemyObj.id, zoneType: 'proximity' });
                boardData.enemyZoneMap.set(nv, existing);
              }
              nextFrontier.push(nv);
            }
          }
          frontier = nextFrontier;
        }
      }

      // Trigger reactivity
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
 * Confirm engagement: player chooses to fight the proximity enemy.
 * Proceeds to startCombat with the pending engagement data.
 */
export function confirmEngagement() {
  const pending = get(pendingEngagement);
  if (!pending) return;

  pendingEngagement.set(null);
  startCombat(pending.enemyId, pending.approachAdvantage, pending.preCombatPos, pending.path, pending.triggerIndex);
}

/**
 * Decline engagement: player chooses to avoid the proximity enemy.
 * Player performs a "stealth dive" — continues moving in the same direction
 * with effective movement = originalDice - 1, bypassing the avoided enemy's zones.
 * Remaining steps = max(0, (originalDice - 1) - stepsAlreadyTaken).
 *
 * Uses resolveMovePath() to pre-determine outcome, then animates.
 *
 * @param {function} [onAnimationComplete] - Callback after animation finishes
 */
export function declineEngagement(onAnimationComplete) {
  // Guard: if called directly as an onclick handler, the Event object is passed — ignore it
  if (onAnimationComplete && typeof onAnimationComplete !== 'function') onAnimationComplete = undefined;

  const pending = get(pendingEngagement);
  if (!pending) return;

  const boardData = get(board);
  const pool = get(movementPool);
  const initialSteps = pending.triggerIndex + 1;

  // Mark stealth dive active
  stealthDive.set(true);

  // Calculate remaining steps for stealth continuation
  const effectiveDice = pending.originalDice - 1;
  const remainingSteps = Math.max(0, effectiveDice - initialSteps);

  // Current position is where the player landed (set during executeMove)
  const currentPos = get(playerPos);

  if (remainingSteps > 0 && boardData && pending.direction != null) {
    // Get rays from current position and compute continuation path
    const rays = boardData.rays.get(currentPos);
    if (rays) {
      const continuationResult = computePath(
        rays, pending.direction, remainingSteps,
        boardData.obstacles, boardData.targetVertex,
        boardData.blackholeSet, boardData.enemyZones,
        boardData.enemyZoneMap, pending.enemyId
      );

      if (continuationResult.path.length > 0) {
        const contPath = continuationResult.path;
        const totalSteps = initialSteps + contPath.length;

        // Pre-determine outcome using resolveMovePath (single source of truth)
        const resolved = resolveMovePath(
          contPath, continuationResult.engageEnemy, continuationResult.reachedTarget,
          continuationResult.hitBlackhole, continuationResult.stoppedByObstacle,
          pool - initialSteps, boardData.targetVertex,
          boardData.rays, boardData.obstacles, pending.direction, boardData
        );

        // Animate the continuation path
        gamePhase.set('moving');
        animatingPath.set(contPath);
        animationStep.set(0);

        const stepDelay = 150;
        let step = 0;

        function advanceDiveStep() {
          if (step >= contPath.length) {
            // Animation complete — apply resolved outcome
            const finalPos = resolved.finalPos;

            // Update player position
            playerPos.set(finalPos);

            // Mark all path vertices as visited (initial + continuation)
            const vis = get(visited);
            const newVis = new Set(vis);
            for (const vid of pending.path) newVis.add(vid);
            for (const vid of contPath) newVis.add(vid);
            visited.set(newVis);

            // Deduct total steps from pool
            const newPool = pool - totalSteps;
            movementPool.set(newPool);

            // Increment moves made
            movesMade.update((n) => n + 1);

            // Clear state
            pendingEngagement.set(null);
            selectedDirection.set(null);
            previewPath.set([]);
            animatingPath.set([]);
            animationStep.set(-1);
            diceValue.set(null);

            // Apply outcome based on resolved result
            if (resolved.outcome === 'engageProximity') {
              pendingEngagement.set({
                enemyId: resolved.engagement.enemyId,
                approachAdvantage: resolved.engagement.approachAdvantage,
                preCombatPos: currentPos,
                path: contPath,
                triggerIndex: contPath.length - 1,
                zoneType: resolved.engagement.zoneType,
                direction: pending.direction,
                originalDice: effectiveDice,
              });
              gamePhase.set('engagementChoice');
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            if (resolved.outcome === 'engageVision') {
              startCombat(resolved.engagement.enemyId, resolved.engagement.approachAdvantage, currentPos, contPath, contPath.length - 1);
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            // Check hazard: legacy enemy zones
            if (boardData.enemyZones?.has(finalPos) && !boardData.enemyZoneMap) {
              loseReason.set('enemy');
              gamePhase.set('lost');
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            if (resolved.outcome === 'blackhole') {
              loseReason.set('blackhole');
              gamePhase.set('lost');
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            if (resolved.outcome === 'win') {
              gamePhase.set('won');
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            if (resolved.outcome === 'poolExhausted') {
              loseReason.set('exhausted');
              gamePhase.set('lost');
              if (onAnimationComplete) onAnimationComplete();
              return;
            }

            if (resolved.outcome === 'trapped') {
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
          setTimeout(advanceDiveStep, stepDelay);
        }

        // Start the continuation animation
        advanceDiveStep();
        return;
      }
    }
  }

  // Fallback: no remaining steps or no valid ray — player stays put, deduct initial steps only
  const vis = get(visited);
  const newVis = new Set(vis);
  for (const vid of pending.path) newVis.add(vid);
  visited.set(newVis);

  const newPool = pool - initialSteps;
  movementPool.set(newPool);
  movesMade.update((n) => n + 1);

  // Clear state
  pendingEngagement.set(null);
  selectedDirection.set(null);
  previewPath.set([]);
  animatingPath.set([]);
  animationStep.set(-1);
  diceValue.set(null);

  // Check lose condition: out of movement points
  if (newPool <= 0) {
    loseReason.set('exhausted');
    gamePhase.set('lost');
    return;
  }

  // Check trapped condition
  const pos = get(playerPos);
  if (boardData && isTrapped(boardData.rays, pos, boardData.obstacles)) {
    loseReason.set('trapped');
    gamePhase.set('lost');
    return;
  }

  // Back to rolling
  gamePhase.set('rolling');
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
  pendingEngagement.set(null);
  stealthDive.set(false);
}
