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
  loseReason,
  combatState,
  selectedDirection,
  previewPath,
  animatingPath,
  animationStep,
  initGame,
  resetGame,
  hasValidPath,
  startCombat,
  resolveCombat,
  selectDirection,
  executeMove,
} from './gameState.js';
import { isCenterVertex } from './hexGrid.js';
import { Enemy } from './boardObjects.js';

describe('initGame', () => {
  beforeEach(() => {
    resetGame();
  });

  it('sets all stores correctly for 5x4 (small)', () => {
    initGame(5, 4, 42);

    expect(get(board)).not.toBeNull();
    expect(get(playerPos)).toBeTruthy();
    expect(get(movementPool)).toBe(45); // (5+4) * 5
    expect(get(diceValue)).toBeNull();
    expect(get(gamePhase)).toBe('rolling');
    expect(get(movesMade)).toBe(0);
  });

  it('sets all stores correctly for 7x6 (medium)', () => {
    initGame(7, 6, 42);

    expect(get(movementPool)).toBe(65); // (7+6) * 5
    expect(get(gamePhase)).toBe('rolling');
  });

  it('sets all stores correctly for 9x8 (large)', () => {
    initGame(9, 8, 42);

    expect(get(movementPool)).toBe(85); // (9+8) * 5
    expect(get(gamePhase)).toBe('rolling');
  });

  it('places start and target vertices that are not the same', () => {
    const boardData = initGame(5, 4, 42);

    expect(boardData.startVertex).not.toBe(boardData.targetVertex);
  });

  it('places start and target at reasonable distance apart (not adjacent)', () => {
    const boardData = initGame(5, 4, 42);
    const adj = boardData.adjacency.get(boardData.startVertex) || [];
    expect(adj).not.toContain(boardData.targetVertex);
  });

  it('player starts at the start vertex', () => {
    const boardData = initGame(5, 4, 42);

    expect(get(playerPos)).toBe(boardData.startVertex);
  });

  it('start vertex is in the visited set', () => {
    const boardData = initGame(5, 4, 42);

    expect(get(visited).has(boardData.startVertex)).toBe(true);
  });

  it('obstacles do not include start or target vertices', () => {
    const boardData = initGame(5, 4, 42);

    expect(boardData.obstacles.has(boardData.startVertex)).toBe(false);
    expect(boardData.obstacles.has(boardData.targetVertex)).toBe(false);
  });

  it('board data includes all grid fields plus game fields', () => {
    const boardData = initGame(5, 4, 42);

    expect(boardData).toHaveProperty('vertices');
    expect(boardData).toHaveProperty('adjacency');
    expect(boardData).toHaveProperty('rays');
    expect(boardData).toHaveProperty('hexCenters');
    expect(boardData).toHaveProperty('size');
    expect(boardData).toHaveProperty('cols');
    expect(boardData).toHaveProperty('rows');
    expect(boardData).toHaveProperty('obstacles');
    expect(boardData).toHaveProperty('startVertex');
    expect(boardData).toHaveProperty('targetVertex');
  });
});

describe('board object integration', () => {
  beforeEach(() => {
    resetGame();
  });

  it('boardData includes boardObjects and powerUps arrays', () => {
    const boardData = initGame(5, 4, 42);
    expect(Array.isArray(boardData.boardObjects)).toBe(true);
    expect(Array.isArray(boardData.powerUps)).toBe(true);
  });

  it('boardObjects contains obstacle and powerup instances', () => {
    const boardData = initGame(5, 4, 42);
    const types = boardData.boardObjects.map(o => o.type);
    expect(types).toContain('obstacle');
    expect(types).toContain('powerup');
  });

  it('obstacles Set matches obstacle and enemy vertex IDs in boardObjects', () => {
    const boardData = initGame(5, 4, 42);
    const blockingIds = boardData.boardObjects
      .filter(o => o.type === 'obstacle' || o.type === 'enemy')
      .map(o => o.vertexId);
    expect(new Set(blockingIds)).toEqual(boardData.obstacles);
  });

  it('different difficulty values produce different obstacle counts', () => {
    const easy = initGame(7, 6, 42, 1);
    resetGame();
    const hard = initGame(7, 6, 42, 10);
    expect(hard.obstacles.size).toBeGreaterThan(easy.obstacles.size);
  });

  it('different difficulty values produce different power-up counts', () => {
    const easy = initGame(7, 6, 42, 1);
    const easyPuCount = easy.powerUps.length;
    resetGame();
    const hard = initGame(7, 6, 42, 10);
    expect(easyPuCount).toBeGreaterThan(hard.powerUps.length);
  });

  it('default difficulty (no arg) matches difficulty 5', () => {
    const defaultD = initGame(5, 4, 42);
    const defaultObsCount = defaultD.obstacles.size;
    resetGame();
    const explicit5 = initGame(5, 4, 42, 5);
    expect(defaultObsCount).toBe(explicit5.obstacles.size);
  });
});

describe('obstacle placement validity', () => {
  it('a valid path exists from start to target (5x4)', () => {
    const boardData = initGame(5, 4, 42);
    const result = hasValidPath(
      boardData.adjacency,
      boardData.startVertex,
      boardData.targetVertex,
      boardData.obstacles
    );
    expect(result).toBe(true);
  });

  it('a valid path exists from start to target (7x6)', () => {
    const boardData = initGame(7, 6, 42);
    const result = hasValidPath(
      boardData.adjacency,
      boardData.startVertex,
      boardData.targetVertex,
      boardData.obstacles
    );
    expect(result).toBe(true);
  });

  it('a valid path exists from start to target (9x8)', () => {
    const boardData = initGame(9, 8, 42);
    const result = hasValidPath(
      boardData.adjacency,
      boardData.startVertex,
      boardData.targetVertex,
      boardData.obstacles
    );
    expect(result).toBe(true);
  });

  it('valid path exists with multiple seeds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const boardData = initGame(5, 4, seed);
      const result = hasValidPath(
        boardData.adjacency,
        boardData.startVertex,
        boardData.targetVertex,
        boardData.obstacles
      );
      expect(result).toBe(true);
    }
  });

  it('obstacles are roughly 10-15% of vertices', () => {
    const boardData = initGame(5, 4, 42);
    const totalVertices = boardData.vertices.size;
    const obstacleCount = boardData.obstacles.size;
    const pct = obstacleCount / totalVertices;
    expect(pct).toBeGreaterThan(0.05);
    expect(pct).toBeLessThan(0.20);
  });
});

describe('hasValidPath', () => {
  it('returns true when start equals target', () => {
    const adj = new Map([['a', ['b']], ['b', ['a']]]);
    expect(hasValidPath(adj, 'a', 'a', new Set())).toBe(true);
  });

  it('returns true for a simple connected graph', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['a', 'c']],
      ['c', ['b']],
    ]);
    expect(hasValidPath(adj, 'a', 'c', new Set())).toBe(true);
  });

  it('returns false when path is blocked by obstacles', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['a', 'c']],
      ['c', ['b']],
    ]);
    // Block the only path through 'b'
    expect(hasValidPath(adj, 'a', 'c', new Set(['b']))).toBe(false);
  });

  it('returns false for disconnected graph', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['a']],
      ['c', ['d']],
      ['d', ['c']],
    ]);
    expect(hasValidPath(adj, 'a', 'c', new Set())).toBe(false);
  });
});

describe('center dot support in game state', () => {
  beforeEach(() => {
    resetGame();
  });

  it('board vertices include both corner and center types', () => {
    const boardData = initGame(5, 4, 42);
    const vertices = [...boardData.vertices.values()];
    const corners = vertices.filter(v => v.type === 'corner');
    const centers = vertices.filter(v => v.type === 'center');

    expect(corners.length).toBeGreaterThan(0);
    expect(centers.length).toBeGreaterThan(0);
    expect(centers.length).toBe(20); // 5x4 = 20 hex centers
    expect(corners.length + centers.length).toBe(boardData.vertices.size);
  });

  it('center vertex IDs are distinguishable from corner IDs', () => {
    const boardData = initGame(5, 4, 42);
    for (const [id, v] of boardData.vertices) {
      if (v.type === 'center') {
        expect(isCenterVertex(id)).toBe(true);
      } else {
        expect(isCenterVertex(id)).toBe(false);
      }
    }
  });

  it('obstacles include center vertices', () => {
    // Run multiple seeds to ensure at least some center obstacles appear
    let totalCenterObstacles = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const boardData = initGame(5, 4, seed);
      for (const obsId of boardData.obstacles) {
        if (isCenterVertex(obsId)) totalCenterObstacles++;
      }
    }
    expect(totalCenterObstacles).toBeGreaterThan(0);
  });

  it('obstacle placement candidates include center vertices', () => {
    const boardData = initGame(5, 4, 42);
    const ids = [...boardData.vertices.keys()];
    const candidates = ids.filter(
      id => id !== boardData.startVertex && id !== boardData.targetVertex
    );
    const centerCandidates = candidates.filter(id => isCenterVertex(id));
    expect(centerCandidates.length).toBeGreaterThan(0);
  });

  it('BFS hasValidPath traverses center-to-corner adjacency', () => {
    // Build a small graph with center and corner vertices
    const adj = new Map([
      ['corner1', ['c:center1']],
      ['c:center1', ['corner1', 'corner2']],
      ['corner2', ['c:center1']],
    ]);
    // Path: corner1 -> c:center1 -> corner2
    expect(hasValidPath(adj, 'corner1', 'corner2', new Set())).toBe(true);
  });

  it('BFS respects obstacle on center vertex', () => {
    const adj = new Map([
      ['corner1', ['c:center1']],
      ['c:center1', ['corner1', 'corner2']],
      ['corner2', ['c:center1']],
    ]);
    // Block the center vertex; no path should exist
    expect(hasValidPath(adj, 'corner1', 'corner2', new Set(['c:center1']))).toBe(false);
  });

  it('BFS works on real board with center-corner adjacency', () => {
    const boardData = initGame(7, 6, 42);
    // Verify path exists (already guaranteed, but test the adjacency graph is correct)
    expect(
      hasValidPath(boardData.adjacency, boardData.startVertex, boardData.targetVertex, boardData.obstacles)
    ).toBe(true);

    // Also verify adjacency includes center-to-corner edges
    let centerWithNeighbors = 0;
    for (const [id, neighbors] of boardData.adjacency) {
      if (isCenterVertex(id) && neighbors.length > 0) {
        centerWithNeighbors++;
        // Every center neighbor should be a corner
        for (const nid of neighbors) {
          expect(isCenterVertex(nid)).toBe(false);
        }
      }
    }
    expect(centerWithNeighbors).toBeGreaterThan(0);
  });

  it('start and target are valid vertices in the expanded grid', () => {
    const boardData = initGame(5, 4, 42);
    expect(boardData.vertices.has(boardData.startVertex)).toBe(true);
    expect(boardData.vertices.has(boardData.targetVertex)).toBe(true);
  });

  it('movement pool is appropriate for boards with center dots (2 steps per hex)', () => {
    // Small: (5+4)*5 = 45, crossing ~4 hexes on diagonal = 8 steps
    const small = initGame(5, 4, 42);
    expect(get(movementPool)).toBe(45);

    resetGame();

    // Medium: (7+6)*5 = 65
    const medium = initGame(7, 6, 42);
    expect(get(movementPool)).toBe(65);

    resetGame();

    // Large: (9+8)*5 = 85
    const large = initGame(9, 8, 42);
    expect(get(movementPool)).toBe(85);
  });

  it('vertex count roughly doubles compared to corner-only graph', () => {
    const boardData = initGame(5, 4, 42);
    const corners = [...boardData.vertices.values()].filter(v => v.type === 'corner');
    const centers = [...boardData.vertices.values()].filter(v => v.type === 'center');
    // Centers = hex count (20 for 5x4), corners are larger but centers add significant density
    expect(boardData.vertices.size).toBe(corners.length + centers.length);
    expect(centers.length).toBe(20);
    // Total vertex count should be significantly more than just corners
    expect(boardData.vertices.size).toBeGreaterThan(corners.length);
  });
});

describe('resetGame', () => {
  it('resets all stores to initial values', () => {
    initGame(5, 4, 42);
    resetGame();

    expect(get(board)).toBeNull();
    expect(get(playerPos)).toBeNull();
    expect(get(movementPool)).toBe(0);
    expect(get(diceValue)).toBeNull();
    expect(get(gamePhase)).toBe('setup');
    expect(get(visited).size).toBe(0);
    expect(get(movesMade)).toBe(0);
  });

  it('resets combatState to null', () => {
    initGame(5, 4, 42);
    // Manually set combatState to simulate an active combat
    combatState.set({ engine: {}, enemyId: 'test' });
    resetGame();
    expect(get(combatState)).toBeNull();
  });
});

describe('combat state management', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  describe('startCombat', () => {
    it('transitions gamePhase to combat', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['v1', 'v2'], 1);

      expect(get(gamePhase)).toBe('combat');
    });

    it('populates combatState with engine and metadata', () => {
      const preCombatPos = get(playerPos);
      const advantage = { firstAttacker: 'player', bonusAttacks: 0 };
      const path = ['v1', 'v2', 'v3'];
      startCombat('enemy:v2', advantage, preCombatPos, path, 2);

      const state = get(combatState);
      expect(state).not.toBeNull();
      expect(state.engine).toBeDefined();
      expect(state.enemyId).toBe('enemy:v2');
      expect(state.approachAdvantage).toEqual(advantage);
      expect(state.preCombatPlayerPos).toBe(preCombatPos);
      expect(state.preCombatPath).toEqual(path);
      expect(state.triggerVertexIndex).toBe(2);
    });

    it('creates a CombatEngine with PlayerShip and EnemyShip', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, [], 0);

      const state = get(combatState);
      expect(state.engine.playerShip).toBeDefined();
      expect(state.engine.enemyShip).toBeDefined();
      expect(state.engine.playerShip.name).toBe('Player Ship');
      expect(state.engine.enemyShip.name).toBe('Enemy Ship');
    });

    it('sets first attacker based on approach advantage', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'enemy', bonusAttacks: 0 }, preCombatPos, [], 0);

      const state = get(combatState);
      expect(state.engine.isPlayerTurn).toBe(false);
    });

    it('sets bonus attacks from rear approach', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 1 }, preCombatPos, [], 0);

      const state = get(combatState);
      expect(state.engine.bonusAttacks).toBe(1);
    });

    it('stores preCombatPlayerPos for retreat', () => {
      const originalPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, originalPos, ['a', 'b'], 1);

      const state = get(combatState);
      expect(state.preCombatPlayerPos).toBe(originalPos);
    });
  });

  describe('resolveCombat — playerWin (Bridge destroyed)', () => {
    it('removes enemy from board and returns to rolling phase', () => {
      // Set up a board with a known enemy
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        // No enemies on this seed/difficulty, manually add one
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        boardData.boardObjects.push(enemy);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      // Start combat
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a', 'b'], 1);
      expect(get(gamePhase)).toBe('combat');

      // Resolve as playerWin
      resolveCombat('playerWin');

      expect(get(gamePhase)).toBe('rolling');
      expect(get(combatState)).toBeNull();

      // Enemy should be removed from board
      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeUndefined();
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(false);
    });

    it('restores player to pre-combat position', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) return; // skip if no enemies

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      // Simulate player moved somewhere during animation
      playerPos.set('fake-moved-pos');

      resolveCombat('playerWin');
      expect(get(playerPos)).toBe(preCombatPos);
    });
  });

  describe('resolveCombat — playerLose (timeout)', () => {
    it('keeps enemy on board and returns to rolling', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        boardData.boardObjects.push(enemy);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(3); // Simulate a dice roll of 3

      resolveCombat('playerLose');

      expect(get(gamePhase)).toBe('rolling');
      expect(get(combatState)).toBeNull();

      // Enemy should still be on board
      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(true);
    });

    it('deducts dice roll from movement pool', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(4);

      resolveCombat('playerLose');

      expect(get(movementPool)).toBe(poolBefore - 4);
    });

    it('restores player to pre-combat position on retreat', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      playerPos.set('some-other-pos');
      diceValue.set(2);

      resolveCombat('playerLose');

      expect(get(playerPos)).toBe(preCombatPos);
    });
  });

  describe('resolveCombat — enemyFled', () => {
    it('keeps enemy on board with damaged state', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        boardData.boardObjects.push(enemy);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(2);

      resolveCombat('enemyFled');

      expect(get(gamePhase)).toBe('rolling');
      expect(get(combatState)).toBeNull();

      // Enemy still on board
      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
    });

    it('deducts dice roll from pool on flee', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(5);

      resolveCombat('enemyFled');

      expect(get(movementPool)).toBe(poolBefore - 5);
    });
  });

  describe('resolveCombat — playerDestroyed', () => {
    it('transitions to lost phase with enemy loseReason', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      resolveCombat('playerDestroyed');

      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('enemy');
      expect(get(combatState)).toBeNull();
    });

    it('does not restore player position (game over)', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      // Move player somewhere else during combat
      playerPos.set('other-pos');

      resolveCombat('playerDestroyed');

      // Player stays where they were (not restored) since game is over
      expect(get(playerPos)).toBe('other-pos');
    });
  });

  describe('resolveCombat — pool exhaustion on retreat', () => {
    it('triggers game over if pool runs out after deduction', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) {
        const vertexIds = [...boardData.vertices.keys()];
        const enemyVertex = vertexIds.find(
          id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
        );
        const enemy = new Enemy(enemyVertex, 3, 0);
        enemies.push(enemy);
        boardData.obstacles.add(enemyVertex);
        board.set(boardData);
      }

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      // Set pool to exactly the dice value so deduction exhausts it
      movementPool.set(3);
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(3);

      resolveCombat('playerLose');

      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('exhausted');
    });
  });

  describe('resolveCombat with no active combat', () => {
    it('does nothing when combatState is null', () => {
      expect(get(combatState)).toBeNull();
      expect(get(gamePhase)).toBe('rolling');

      resolveCombat('playerWin');

      // Should remain unchanged
      expect(get(gamePhase)).toBe('rolling');
    });
  });

  describe('combat phase clears preview state', () => {
    it('clears selectedDirection, previewPath, animatingPath on resolve', () => {
      const preCombatPos = get(playerPos);
      startCombat('enemy:v1', { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      // Simulate stale preview state
      selectedDirection.set(2);
      previewPath.set(['a', 'b']);
      animatingPath.set(['a', 'b']);
      animationStep.set(1);

      resolveCombat('playerWin');

      expect(get(selectedDirection)).toBeNull();
      expect(get(previewPath)).toEqual([]);
      expect(get(animatingPath)).toEqual([]);
      expect(get(animationStep)).toBe(-1);
      expect(get(diceValue)).toBeNull();
    });
  });
});

describe('engagement trigger in executeMove (US-034)', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  /**
   * Helper: execute a move and return a promise that resolves when animation completes.
   */
  function executeMoveAsync() {
    return new Promise((resolve) => {
      executeMove(() => resolve());
    });
  }

  /**
   * Set up enemy and zone on a specific path vertex for testing engagement.
   * Returns { enemy, zoneVertex, direction, path } of the set-up scenario.
   */
  function setupEnemyOnPath() {
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    // Find a ray with at least 3 vertices so we can place an enemy zone at vertex 1
    const longRay = rays.find((r) => {
      if (r.vertices.length < 3) return false;
      // First vertex must not be an obstacle
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1]);
    });
    if (!longRay) return null;

    const zoneVertex = longRay.vertices[1];
    const enemyVertex = 'fake-enemy-vertex';
    const enemyDirection = 2;
    const enemy = new Enemy(enemyVertex, 3, enemyDirection);

    // Add the enemy to board data
    boardData.enemies.push(enemy);
    boardData.enemyZones.add(zoneVertex);
    boardData.enemyZoneMap.set(zoneVertex, enemy.id);
    board.set(boardData);

    return { enemy, zoneVertex, direction: longRay.direction, enemyDirection };
  }

  it('triggers combat instead of instant death when path enters enemy zone', async () => {
    const setup = setupEnemyOnPath();
    if (!setup) return; // skip if no suitable ray

    const poolBefore = get(movementPool);

    // Set up for move
    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);
    const path = get(previewPath);
    expect(path).toContain(setup.zoneVertex);

    await executeMoveAsync();

    // Should be in combat phase, not lost
    expect(get(gamePhase)).toBe('combat');
    expect(get(combatState)).not.toBeNull();
    expect(get(loseReason)).toBeNull();
  });

  it('identifies the correct enemy in engagement', async () => {
    const setup = setupEnemyOnPath();
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const state = get(combatState);
    expect(state.enemyId).toBe(setup.enemy.id);
  });

  it('calculates approach advantage from movement direction and enemy facing', async () => {
    const setup = setupEnemyOnPath();
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const state = get(combatState);
    expect(state.approachAdvantage).toBeDefined();
    expect(state.approachAdvantage).toHaveProperty('firstAttacker');
    expect(state.approachAdvantage).toHaveProperty('bonusAttacks');
  });

  it('does not deduct movement pool on engagement (combat handles it)', async () => {
    const setup = setupEnemyOnPath();
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);
    const poolBefore = get(movementPool);

    await executeMoveAsync();

    // Pool should NOT be deducted yet (combat resolution handles deduction)
    expect(get(movementPool)).toBe(poolBefore);
  });

  it('stores preCombatPlayerPos as position before the move', async () => {
    const setup = setupEnemyOnPath();
    if (!setup) return;

    const posBeforeMove = get(playerPos);
    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const state = get(combatState);
    expect(state.preCombatPlayerPos).toBe(posBeforeMove);
  });

  it('backward compatible: instant death when enemyZoneMap is absent', async () => {
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    const longRay = rays.find((r) => {
      if (r.vertices.length < 3) return false;
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1]);
    });
    if (!longRay) return;

    const zoneVertex = longRay.vertices[1];

    // Add enemy zone without enemyZoneMap
    boardData.enemyZones.add(zoneVertex);
    delete boardData.enemyZoneMap;
    board.set(boardData);

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(longRay.direction);

    await executeMoveAsync();

    // Should be instant death (old behavior)
    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('enemy');
  });

  it('existing tests without enemy zones still pass (no engagement)', async () => {
    // Clear all enemy zones to simulate a board without enemies
    boardData.enemyZones = new Set();
    boardData.enemyZoneMap = new Map();
    boardData.enemies = [];
    board.set(boardData);

    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    const dir = rays.find((r) => {
      if (r.vertices.length < 2) return false;
      return !boardData.obstacles.has(r.vertices[0]);
    });
    if (!dir) return;

    movementPool.set(20);
    diceValue.set(2);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);

    await executeMoveAsync();

    // Should be in rolling phase (normal move, no combat)
    expect(get(gamePhase)).toBe('rolling');
    expect(get(combatState)).toBeNull();
  });
});

describe('combat board integration (US-036)', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  /**
   * Helper: add an enemy to the board with kill zone
   */
  function addEnemyToBoard(vertexId, direction) {
    const enemy = new Enemy(vertexId || findFreeVertex(), 3, direction || 0);
    boardData.enemies.push(enemy);
    boardData.obstacles.add(enemy.vertexId);
    boardData.boardObjects.push(enemy);

    // Compute kill zone
    const affected = enemy.getAffectedVertices(null, boardData.rays);
    for (let i = 1; i < affected.length; i++) {
      boardData.enemyZones.add(affected[i]);
      boardData.enemyZoneMap.set(affected[i], enemy.id);
    }

    board.set(boardData);
    return enemy;
  }

  function findFreeVertex() {
    return [...boardData.vertices.keys()].find(
      id => id !== boardData.startVertex && id !== boardData.targetVertex && !boardData.obstacles.has(id)
    );
  }

  describe('playerWin removes enemy from all board collections', () => {
    it('removes enemy vertex from obstacles set', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(false);
    });

    it('removes kill zone vertices from enemyZones', () => {
      const enemy = addEnemyToBoard();
      const affected = enemy.getAffectedVertices(null, boardData.rays);
      const killZones = affected.slice(1);
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      for (const zv of killZones) {
        expect(updatedBoard.enemyZones.has(zv)).toBe(false);
      }
    });

    it('removes kill zone vertices from enemyZoneMap', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      for (const [, eid] of updatedBoard.enemyZoneMap) {
        expect(eid).not.toBe(enemy.id);
      }
    });

    it('removes enemy from enemies array', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeUndefined();
    });

    it('removes enemy from boardObjects array', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      expect(updatedBoard.boardObjects.find(o => o.id === enemy.id)).toBeUndefined();
    });

    it('restores player to pre-combat position after win', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a', 'b'], 1);
      resolveCombat('playerWin');

      expect(get(playerPos)).toBe(preCombatPos);
      expect(get(gamePhase)).toBe('rolling');
    });

    it('removing enemy may open new valid paths', () => {
      // Place an enemy that blocks the only path
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // Verify the enemy's vertex was in obstacles before
      expect(boardData.obstacles.has(enemy.vertexId)).toBe(true);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      // The enemy's vertex is no longer an obstacle
      const updatedBoard = get(board);
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(false);
    });
  });

  describe('playerLose/enemyFled keeps enemy on board', () => {
    it('enemy stays in enemies array on playerLose', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(3);
      resolveCombat('playerLose');

      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(true);
    });

    it('enemy stays in enemies array on enemyFled', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(2);
      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
    });

    it('deducts dice roll from movement pool on retreat', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(4);
      resolveCombat('playerLose');

      expect(get(movementPool)).toBe(poolBefore - 4);
    });

    it('player does not move on retreat (stays at pre-combat pos)', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(3);
      resolveCombat('playerLose');

      expect(get(playerPos)).toBe(preCombatPos);
    });
  });

  describe('enemy damage persistence between encounters', () => {
    it('enemy ship damage persists across multiple combats', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // First combat — damage the enemy's Weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state1 = get(combatState);
      state1.engine.enemyShip.getComponent('Weapons').takeDamage(1);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Second combat — enemy should retain damaged Weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state2 = get(combatState);
      const weapons = state2.engine.enemyShip.getComponent('Weapons');
      expect(weapons.destroyed).toBe(true);
      expect(weapons.currentHp).toBe(0);
      diceValue.set(2);
      resolveCombat('playerLose');
    });

    it('fresh enemies have full HP in first encounter', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);

      const weapons = state.engine.enemyShip.getComponent('Weapons');
      const engines = state.engine.enemyShip.getComponent('Engines');
      const bridge = state.engine.enemyShip.getComponent('Bridge');

      expect(weapons.currentHp).toBe(1);
      expect(engines.currentHp).toBe(1);
      expect(bridge.currentHp).toBe(1);

      diceValue.set(2);
      resolveCombat('playerLose');
    });
  });

  describe('playerDestroyed ends game immediately', () => {
    it('sets gamePhase to lost with enemy loseReason', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerDestroyed');

      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('enemy');
    });

    it('does NOT restore player position (game over, no retreat)', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      // Simulate player being at engagement vertex
      playerPos.set('engagement-vertex');

      resolveCombat('playerDestroyed');

      // Player stays where the game ended, not restored to pre-combat
      expect(get(playerPos)).not.toBe(preCombatPos);
    });

    it('does NOT deduct from movement pool (game is over)', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      diceValue.set(5);
      resolveCombat('playerDestroyed');

      expect(get(movementPool)).toBe(poolBefore);
    });
  });

  describe('full combat flow end-to-end', () => {
    it('win → enemy removed → player resumes at pre-combat pos in rolling phase', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const enemyId = enemy.id;
      const enemyVertexId = enemy.vertexId;

      // Start combat
      startCombat(enemyId, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['v1', 'v2'], 1);
      expect(get(gamePhase)).toBe('combat');

      // Simulate combat — destroy bridge
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Bridge').takeDamage(1);

      // Resolve as win
      resolveCombat('playerWin');

      // Verify full board cleanup
      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemyId)).toBeUndefined();
      expect(updatedBoard.obstacles.has(enemyVertexId)).toBe(false);
      expect(updatedBoard.boardObjects.find(o => o.id === enemyId)).toBeUndefined();

      // Verify game state
      expect(get(gamePhase)).toBe('rolling');
      expect(get(playerPos)).toBe(preCombatPos);
      expect(get(combatState)).toBeNull();
      expect(get(diceValue)).toBeNull();
    });

    it('lose → enemy stays → player retreats → turn wasted', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['v1'], 0);
      diceValue.set(4);

      resolveCombat('playerLose');

      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
      expect(get(gamePhase)).toBe('rolling');
      expect(get(playerPos)).toBe(preCombatPos);
      expect(get(movementPool)).toBe(poolBefore - 4);
    });

    it('destroyed → game over with enemy reason', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['v1'], 0);

      resolveCombat('playerDestroyed');

      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('enemy');
      expect(get(combatState)).toBeNull();
    });
  });
});
