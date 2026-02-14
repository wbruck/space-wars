import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  board,
  playerPos,
  movementPool,
  diceValue,
  gamePhase,
  visited,
  movesMade,
  selectedDirection,
  previewPath,
  loseReason,
  combatState,
  initGame,
  resetGame,
  rollDice,
  selectDirection,
  executeMove,
} from './gameState.js';
import { getAvailableDirections, computePath, isTrapped } from './movement.js';
import { Enemy } from './boardObjects.js';

/**
 * Helper: execute a move and return a promise that resolves when animation completes.
 */
function executeMoveAsync() {
  return new Promise((resolve) => {
    executeMove(() => resolve());
  });
}

describe('Win condition: reaching the target vertex', () => {
  beforeEach(() => {
    resetGame();
  });

  it('sets gamePhase to won when player lands on target vertex', async () => {
    const boardData = initGame(5, 4, 42);
    const target = boardData.targetVertex;
    const rays = boardData.rays;

    // Find a vertex adjacent to the target (1 step away via some ray)
    let adjacentVertex = null;
    let directionToTarget = null;

    for (const [vid, vertexRays] of rays) {
      if (vid === target || boardData.obstacles.has(vid)) continue;
      for (const ray of vertexRays) {
        if (ray.vertices.length > 0 && ray.vertices[0] === target) {
          adjacentVertex = vid;
          directionToTarget = ray.direction;
          break;
        }
      }
      if (adjacentVertex) break;
    }

    // Must find an adjacent non-obstacle vertex
    expect(adjacentVertex).toBeTruthy();

    // Set up game state: player at adjacent vertex, dice = 1
    playerPos.set(adjacentVertex);
    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    // Select direction toward target
    selectDirection(directionToTarget);
    expect(get(previewPath)).toContain(target);

    // Execute move and wait for animation
    await executeMoveAsync();
    expect(get(gamePhase)).toBe('won');
    expect(get(playerPos)).toBe(target);
  });

  it('computePath stops at target when passing through it', () => {
    const boardData = initGame(5, 4, 42);
    const target = boardData.targetVertex;
    const rays = boardData.rays;

    // Find a vertex where target appears in a ray (at any position)
    let sourceVertex = null;
    let dir = null;
    let targetIdx = -1;

    for (const [vid, vertexRays] of rays) {
      if (vid === target || boardData.obstacles.has(vid)) continue;
      for (const ray of vertexRays) {
        const idx = ray.vertices.indexOf(target);
        if (idx >= 0) {
          // Check no obstacles before the target in this ray
          let blocked = false;
          for (let i = 0; i < idx; i++) {
            if (boardData.obstacles.has(ray.vertices[i])) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            sourceVertex = vid;
            dir = ray.direction;
            targetIdx = idx;
            break;
          }
        }
      }
      if (sourceVertex) break;
    }

    expect(sourceVertex).toBeTruthy();

    // Give more steps than needed to reach target
    const allRays = rays.get(sourceVertex);
    const result = computePath(allRays, dir, targetIdx + 5, boardData.obstacles, target);

    // Path should stop at target (not go past it)
    expect(result.reachedTarget).toBe(true);
    expect(result.path[result.path.length - 1]).toBe(target);
    expect(result.path.length).toBe(targetIdx + 1);
  });
});

describe('Lose condition: movement pool exhausted', () => {
  beforeEach(() => {
    resetGame();
  });

  it('sets gamePhase to lost when pool reaches 0 after move', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    // Find a direction with at least 1 step available
    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    const dir = available[0];

    // Set pool to exactly 1 so moving 1 step exhausts it
    movementPool.set(1);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBe(1);

    await executeMoveAsync();

    // After moving 1 step with pool=1, pool becomes 0
    expect(get(movementPool)).toBe(0);
    // If player didn't reach target, should be lost
    if (get(playerPos) !== boardData.targetVertex) {
      expect(get(gamePhase)).toBe('lost');
    }
  });

  it('sets gamePhase to lost when pool reaches 0 with multi-step move', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    // Find a direction and compute actual path length to set pool exactly
    const dir = available[0];
    const dirRays = rays.get(pos);

    // Preview with dice=6 to see max available steps
    movementPool.set(100);
    diceValue.set(6);
    gamePhase.set('selectingDirection');
    selectDirection(dir.direction);
    const actualPath = get(previewPath);
    const pathLen = actualPath.length;

    if (pathLen === 0) return;

    // Reset and set pool exactly to path length so it reaches 0
    resetGame();
    initGame(5, 4, 42);
    playerPos.set(pos);
    movementPool.set(pathLen);
    diceValue.set(pathLen);
    gamePhase.set('selectingDirection');

    // Update board to match
    board.set(boardData);

    selectDirection(dir.direction);

    await executeMoveAsync();

    expect(get(movementPool)).toBe(0);
    if (get(playerPos) !== boardData.targetVertex) {
      expect(get(gamePhase)).toBe('lost');
    }
  });
});

describe('Lose condition: player trapped', () => {
  beforeEach(() => {
    resetGame();
  });

  it('isTrapped returns true when all directions blocked', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    // Block all first vertices in all non-empty rays
    const allRays = rays.get(pos);
    const obstacles = new Set(boardData.obstacles);
    for (const ray of allRays) {
      if (ray.vertices.length > 0) {
        obstacles.add(ray.vertices[0]);
      }
    }

    expect(isTrapped(rays, pos, obstacles)).toBe(true);
  });

  it('isTrapped returns false when at least one direction is open', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    expect(isTrapped(boardData.rays, pos, boardData.obstacles)).toBe(false);
  });

  it('sets gamePhase to lost after move when player becomes trapped', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    // Pick a direction and find where we'd land
    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    expect(destRay.vertices.length).toBeGreaterThan(0);

    const destination = destRay.vertices[0];
    const destRays = rays.get(destination);

    // Block all directions from the destination to create a trap
    const augmentedObstacles = new Set(boardData.obstacles);
    for (const ray of destRays) {
      if (ray.vertices.length > 0) {
        augmentedObstacles.add(ray.vertices[0]);
      }
    }

    // Update board obstacles
    const newBoard = { ...boardData, obstacles: augmentedObstacles };
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);

    if (path.length === 0) return; // Direction blocked by new obstacles

    await executeMoveAsync();

    const finalPos = get(playerPos);
    if (finalPos !== boardData.targetVertex && get(movementPool) > 0) {
      if (isTrapped(newBoard.rays, finalPos, augmentedObstacles)) {
        expect(get(gamePhase)).toBe('lost');
      }
    }
  });

  it('rollDice detects trapped at start of turn and sets lost', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    // Block all directions from the start vertex
    const augmentedObstacles = new Set(boardData.obstacles);
    const allRays = rays.get(pos);
    for (const ray of allRays) {
      if (ray.vertices.length > 0) {
        augmentedObstacles.add(ray.vertices[0]);
      }
    }

    const newBoard = { ...boardData, obstacles: augmentedObstacles };
    board.set(newBoard);

    // Phase should be rolling after initGame
    expect(get(gamePhase)).toBe('rolling');

    // Try to roll - should detect trapped and set lost
    const result = rollDice();
    expect(result).toBeNull();
    expect(get(gamePhase)).toBe('lost');
  });
});

describe('Win/lose detection runs after every move', () => {
  beforeEach(() => {
    resetGame();
  });

  it('game continues (back to rolling) when no win/lose condition met', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    // Give plenty of movement pool
    movementPool.set(100);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(available[0].direction);

    await executeMoveAsync();

    const phase = get(gamePhase);
    // Should be back to rolling (not won or lost) since we have plenty of pool
    if (get(playerPos) !== boardData.targetVertex) {
      expect(phase).toBe('rolling');
      expect(get(movementPool)).toBe(99);
      expect(get(movesMade)).toBe(1);
    }
  });
});

describe('Hazard death: blackhole', () => {
  beforeEach(() => {
    resetGame();
  });

  it('sets gamePhase to lost when player lands on a blackhole', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    // Find a direction with at least 1 step that is not an obstacle
    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    const destination = destRay.vertices[0];

    // Inject the destination as a blackhole vertex
    const newBoard = {
      ...boardData,
      blackholeSet: new Set([destination]),
      enemyZones: new Set(),
    };
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBe(1);
    expect(path[0]).toBe(destination);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('blackhole');
    expect(get(playerPos)).toBe(destination);
  });

  it('blackhole on target vertex causes death, not win', async () => {
    const boardData = initGame(5, 4, 42);
    const target = boardData.targetVertex;
    const rays = boardData.rays;

    // Find a vertex adjacent to the target
    let adjacentVertex = null;
    let directionToTarget = null;

    for (const [vid, vertexRays] of rays) {
      if (vid === target || boardData.obstacles.has(vid)) continue;
      for (const ray of vertexRays) {
        if (ray.vertices.length > 0 && ray.vertices[0] === target) {
          adjacentVertex = vid;
          directionToTarget = ray.direction;
          break;
        }
      }
      if (adjacentVertex) break;
    }

    expect(adjacentVertex).toBeTruthy();

    // Make target a blackhole — should die, not win
    const newBoard = {
      ...boardData,
      blackholeSet: new Set([target]),
      enemyZones: new Set(),
    };
    board.set(newBoard);

    playerPos.set(adjacentVertex);
    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(directionToTarget);
    expect(get(previewPath)).toContain(target);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('blackhole');
  });
});

describe('Hazard death: enemy kill zone', () => {
  beforeEach(() => {
    resetGame();
  });

  it('triggers combat when player lands in enemy kill zone (US-034)', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    const destination = destRay.vertices[0];

    // Create an enemy and inject the destination as an enemy kill zone vertex
    const enemy = new Enemy('fake-enemy-vertex', 3, 2);
    const newBoard = {
      ...boardData,
      blackholeSet: new Set(),
      enemyZones: new Set([destination]),
      enemyZoneMap: new Map([[destination, enemy.id]]),
      enemies: [...boardData.enemies, enemy],
    };
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBe(1);
    expect(path[0]).toBe(destination);

    await executeMoveAsync();

    // Should trigger combat instead of instant death
    expect(get(gamePhase)).toBe('combat');
    expect(get(combatState)).not.toBeNull();
    expect(get(combatState).enemyId).toBe(enemy.id);
    expect(get(loseReason)).toBeNull();
  });

  it('sets gamePhase to lost when no enemyZoneMap (backward compat)', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    const destination = destRay.vertices[0];

    // Inject the destination as an enemy kill zone without enemyZoneMap
    const newBoard = {
      ...boardData,
      blackholeSet: new Set(),
      enemyZones: new Set([destination]),
    };
    delete newBoard.enemyZoneMap;
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBe(1);
    expect(path[0]).toBe(destination);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('enemy');
    expect(get(playerPos)).toBe(destination);
  });
});

describe('loseReason store', () => {
  beforeEach(() => {
    resetGame();
  });

  it('loseReason is null initially', () => {
    expect(get(loseReason)).toBeNull();
  });

  it('loseReason is null after initGame', () => {
    initGame(5, 4, 42);
    expect(get(loseReason)).toBeNull();
  });

  it('loseReason is reset to null by resetGame', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    const destination = destRay.vertices[0];

    // Trigger a blackhole death
    const newBoard = {
      ...boardData,
      blackholeSet: new Set([destination]),
      enemyZones: new Set(),
    };
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');
    selectDirection(dir.direction);
    await executeMoveAsync();

    expect(get(loseReason)).toBe('blackhole');

    resetGame();
    expect(get(loseReason)).toBeNull();
  });

  it('loseReason set to exhausted when pool runs out', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    const dir = available[0];

    // Set pool to exactly 1 so it exhausts
    movementPool.set(1);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBe(1);

    await executeMoveAsync();

    if (get(playerPos) !== boardData.targetVertex) {
      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('exhausted');
    }
  });

  it('loseReason set to trapped when rollDice detects trapped', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    // Block all directions from start
    const augmentedObstacles = new Set(boardData.obstacles);
    const allRays = rays.get(pos);
    for (const ray of allRays) {
      if (ray.vertices.length > 0) {
        augmentedObstacles.add(ray.vertices[0]);
      }
    }

    const newBoard = { ...boardData, obstacles: augmentedObstacles };
    board.set(newBoard);

    const result = rollDice();
    expect(result).toBeNull();
    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('trapped');
  });

  it('loseReason set to trapped when trapped after move', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    const dir = available[0];
    const destRay = rays.get(pos).find((r) => r.direction === dir.direction);
    const destination = destRay.vertices[0];
    const destRays = rays.get(destination);

    // Block all directions from destination to create a trap
    const augmentedObstacles = new Set(boardData.obstacles);
    for (const ray of destRays) {
      if (ray.vertices.length > 0) {
        augmentedObstacles.add(ray.vertices[0]);
      }
    }

    const newBoard = { ...boardData, obstacles: augmentedObstacles };
    board.set(newBoard);

    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);

    if (path.length === 0) return;

    await executeMoveAsync();

    const finalPos = get(playerPos);
    if (finalPos !== boardData.targetVertex && get(movementPool) > 0) {
      if (isTrapped(newBoard.rays, finalPos, augmentedObstacles)) {
        expect(get(gamePhase)).toBe('lost');
        expect(get(loseReason)).toBe('trapped');
      }
    }
  });

  it('existing win paths still work (loseReason stays null)', async () => {
    const boardData = initGame(5, 4, 42);
    const target = boardData.targetVertex;
    const rays = boardData.rays;

    let adjacentVertex = null;
    let directionToTarget = null;

    for (const [vid, vertexRays] of rays) {
      if (vid === target || boardData.obstacles.has(vid)) continue;
      for (const ray of vertexRays) {
        if (ray.vertices.length > 0 && ray.vertices[0] === target) {
          adjacentVertex = vid;
          directionToTarget = ray.direction;
          break;
        }
      }
      if (adjacentVertex) break;
    }

    expect(adjacentVertex).toBeTruthy();

    playerPos.set(adjacentVertex);
    movementPool.set(10);
    diceValue.set(1);
    gamePhase.set('selectingDirection');

    selectDirection(directionToTarget);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('won');
    expect(get(loseReason)).toBeNull();
  });
});
