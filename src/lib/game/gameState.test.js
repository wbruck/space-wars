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
  playerShipStore,
  pendingEngagement,
  selectedDirection,
  previewPath,
  animatingPath,
  animationStep,
  componentMarket,
  shipConfirmed,
  initGame,
  resetGame,
  hasValidPath,
  startCombat,
  resolveCombat,
  confirmEngagement,
  declineEngagement,
  selectDirection,
  executeMove,
  resolveMovePath,
  generateComponentMarket,
  initGalaxySession,
  enterShipyard,
  confirmShipBuild,
  installComponent,
  removeComponent,
  resetBoardState,
} from './gameState.js';
import { isCenterVertex } from './hexGrid.js';
import { Enemy } from './boardObjects.js';
import { WeaponComponent, EngineComponent, BridgeComponent, PlayerShip } from './combat.js';

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
    expect(get(gamePhase)).toBe('galaxy');
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

      // Enemy should be marked destroyed but still in array for rendering
      const updatedBoard = get(board);
      const defeatedEnemy = updatedBoard.enemies.find(e => e.id === enemy.id);
      expect(defeatedEnemy).toBeDefined();
      expect(defeatedEnemy.destroyed).toBe(true);
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(false);
    });

    it('moves player to combat vertex on win', () => {
      const enemies = boardData.enemies;
      if (enemies.length === 0) return; // skip if no enemies

      const enemy = enemies[0];
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      // Simulate player moved somewhere during animation
      playerPos.set('fake-moved-pos');

      resolveCombat('playerWin');
      expect(get(playerPos)).toBe('a');
    });

    it('retains enemyObj.combatShip after playerWin for future salvage (US-007)', () => {
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

      // combatShip should now be set on the enemy object
      expect(enemy.combatShip).toBeDefined();
      const combatShipRef = enemy.combatShip;

      // Damage the bridge to simulate a real playerWin scenario
      enemy.combatShip.getComponent('Bridge').takeDamage(10);

      resolveCombat('playerWin');

      // combatShip must be retained (NOT nulled) — all components intact for salvage
      expect(enemy.combatShip).toBe(combatShipRef);
      expect(enemy.combatShip.components.length).toBe(3);
      // Non-destroyed components retain their HP
      expect(enemy.combatShip.getComponent('Weapons').destroyed).toBe(false);
      expect(enemy.combatShip.getComponent('Engines').destroyed).toBe(false);
      // Bridge is destroyed
      expect(enemy.combatShip.getComponent('Bridge').destroyed).toBe(true);
      // Salvageable components work
      expect(enemy.combatShip.getSalvageableComponents().length).toBe(2);
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

    it('deducts steps used from movement pool', () => {
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

      resolveCombat('playerLose');

      // stepsUsed = triggerVertexIndex + 1 = 1
      expect(get(movementPool)).toBe(poolBefore - 1);
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

    it('deducts steps used from pool on flee', () => {
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

      resolveCombat('enemyFled');

      // stepsUsed = triggerVertexIndex + 1 = 1
      expect(get(movementPool)).toBe(poolBefore - 1);
    });
  });

  describe('resolveCombat — escaped (US-040)', () => {
    it('returns player to pre-combat position', () => {
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

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a', 'b'], 1);
      playerPos.set('some-combat-pos');

      resolveCombat('escaped');

      expect(get(playerPos)).toBe(preCombatPos);
    });

    it('deducts steps used from movement pool', () => {
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

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a', 'b', 'c'], 2);

      resolveCombat('escaped');

      // stepsUsed = triggerVertexIndex + 1 = 3
      expect(get(movementPool)).toBe(poolBefore - 3);
    });

    it('returns to rolling phase after escape', () => {
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

      resolveCombat('escaped');

      expect(get(gamePhase)).toBe('rolling');
      expect(get(combatState)).toBeNull();
    });

    it('triggers game over if pool runs out after escape deduction', () => {
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

      movementPool.set(1);
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      resolveCombat('escaped');

      expect(get(gamePhase)).toBe('lost');
      expect(get(loseReason)).toBe('exhausted');
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

      // Set pool to exactly the steps used so deduction exhausts it
      movementPool.set(1);
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

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
    // Also ensure no existing enemy zones on the first 2 vertices (avoid hitting a real enemy first)
    const longRay = rays.find((r) => {
      if (r.vertices.length < 3) return false;
      // First two vertices must not be an obstacle or existing enemy zone
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1])
        && !boardData.enemyZones.has(r.vertices[0]) && !boardData.enemyZones.has(r.vertices[1])
        && !boardData.enemyZoneMap.has(r.vertices[0]) && !boardData.enemyZoneMap.has(r.vertices[1]);
    });
    if (!longRay) return null;

    const zoneVertex = longRay.vertices[1];
    const enemyVertex = 'fake-enemy-vertex';
    const enemyDirection = 2;
    const enemy = new Enemy(enemyVertex, 3, enemyDirection);

    // Add the enemy to board data
    boardData.enemies.push(enemy);
    boardData.enemyZones.add(zoneVertex);
    const existing = boardData.enemyZoneMap.get(zoneVertex) || [];
    existing.push({ enemyId: enemy.id, zoneType: 'vision' });
    boardData.enemyZoneMap.set(zoneVertex, existing);
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

describe('engagement choice for proximity zones (US-043)', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  function executeMoveAsync() {
    return new Promise((resolve) => {
      executeMove(() => resolve());
    });
  }

  /**
   * Set up an enemy zone on a path vertex with a specific zoneType.
   */
  function setupEnemyOnPathWithZoneType(zoneType) {
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    const longRay = rays.find((r) => {
      if (r.vertices.length < 3) return false;
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1])
        && !boardData.enemyZoneMap.has(r.vertices[0]) && !boardData.enemyZoneMap.has(r.vertices[1]);
    });
    if (!longRay) return null;

    const zoneVertex = longRay.vertices[1];
    const enemyVertex = 'fake-enemy-vertex-043';
    const enemyDirection = 2;
    const enemy = new Enemy(enemyVertex, 3, enemyDirection);

    boardData.enemies.push(enemy);
    boardData.enemyZones.add(zoneVertex);
    const existingZone = boardData.enemyZoneMap.get(zoneVertex) || [];
    existingZone.push({ enemyId: enemy.id, zoneType });
    boardData.enemyZoneMap.set(zoneVertex, existingZone);
    board.set(boardData);

    return { enemy, zoneVertex, direction: longRay.direction, enemyDirection };
  }

  it('proximity zone triggers engagementChoice phase instead of combat', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);
    const path = get(previewPath);
    expect(path).toContain(setup.zoneVertex);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('engagementChoice');
    expect(get(pendingEngagement)).not.toBeNull();
    expect(get(pendingEngagement).enemyId).toBe(setup.enemy.id);
    expect(get(pendingEngagement).zoneType).toBe('proximity');
    expect(get(combatState)).toBeNull();
  });

  it('vision zone auto-starts combat with no choice', async () => {
    const setup = setupEnemyOnPathWithZoneType('vision');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('combat');
    expect(get(combatState)).not.toBeNull();
    expect(get(pendingEngagement)).toBeNull();
  });

  it('confirmEngagement starts combat from pending data', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('engagementChoice');

    confirmEngagement();

    expect(get(gamePhase)).toBe('combat');
    expect(get(combatState)).not.toBeNull();
    expect(get(combatState).enemyId).toBe(setup.enemy.id);
    expect(get(pendingEngagement)).toBeNull();
  });

  it('declineEngagement skips combat and returns to rolling', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    expect(get(gamePhase)).toBe('engagementChoice');
    const poolBefore = get(movementPool);

    declineEngagement();

    expect(get(gamePhase)).toBe('rolling');
    expect(get(combatState)).toBeNull();
    expect(get(pendingEngagement)).toBeNull();
    // Player stays at current position (the zone vertex)
    expect(get(playerPos)).toBe(setup.zoneVertex);
  });

  it('declineEngagement deducts steps from movement pool', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const pending = get(pendingEngagement);
    const expectedSteps = pending.triggerIndex + 1;

    declineEngagement();

    expect(get(movementPool)).toBe(20 - expectedSteps);
  });

  it('declineEngagement triggers game over if pool runs out', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    // Set pool to exactly the steps that will be used
    movementPool.set(2);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const pending = get(pendingEngagement);
    // Set pool to exactly triggerIndex + 1 so it runs out
    movementPool.set(pending.triggerIndex + 1);

    declineEngagement();

    expect(get(gamePhase)).toBe('lost');
    expect(get(loseReason)).toBe('exhausted');
  });

  it('declineEngagement marks path vertices as visited', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);
    const path = get(previewPath);

    await executeMoveAsync();

    declineEngagement();

    const vis = get(visited);
    for (const vid of path) {
      expect(vis.has(vid)).toBe(true);
    }
  });

  it('pendingEngagement stores approach advantage', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    const pending = get(pendingEngagement);
    expect(pending.approachAdvantage).toBeDefined();
    expect(pending.approachAdvantage).toHaveProperty('firstAttacker');
    expect(pending.approachAdvantage).toHaveProperty('bonusAttacks');
  });

  it('resetGame clears pendingEngagement', async () => {
    const setup = setupEnemyOnPathWithZoneType('proximity');
    if (!setup) return;

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(setup.direction);

    await executeMoveAsync();

    expect(get(pendingEngagement)).not.toBeNull();

    resetGame();

    expect(get(pendingEngagement)).toBeNull();
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

    // Compute kill zone (respecting obstacles)
    const affected = enemy.getAffectedVertices(null, boardData.rays, boardData.obstacles);
    for (let i = 1; i < affected.length; i++) {
      boardData.enemyZones.add(affected[i]);
      const existing = boardData.enemyZoneMap.get(affected[i]) || [];
      existing.push({ enemyId: enemy.id, zoneType: 'vision' });
      boardData.enemyZoneMap.set(affected[i], existing);
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
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        for (const zoneInfo of entries) {
          expect(zoneInfo.enemyId).not.toBe(enemy.id);
        }
      }
    });

    it('marks enemy as destroyed in enemies array', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      const defeatedEnemy = updatedBoard.enemies.find(e => e.id === enemy.id);
      expect(defeatedEnemy).toBeDefined();
      expect(defeatedEnemy.destroyed).toBe(true);
    });

    it('removes enemy from boardObjects array', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      const updatedBoard = get(board);
      expect(updatedBoard.boardObjects.find(o => o.id === enemy.id)).toBeUndefined();
    });

    it('moves player to combat vertex after win', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a', 'b'], 1);
      resolveCombat('playerWin');

      // Player stays at combat vertex (path[triggerVertexIndex] = 'b')
      expect(get(playerPos)).toBe('b');
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

    it('disarmed enemy has vision zones removed on enemyFled', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      // Destroy enemy weapons so they're disarmed (triggers zone removal)
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);
      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      // Vision zones should be removed for disarmed enemy
      let visionCount = 0;
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') visionCount++;
        }
      }
      expect(visionCount).toBe(0);
    });

    it('preserves enemy direction after enemyFled', () => {
      const enemy = addEnemyToBoard(undefined, 3);
      expect(enemy.direction).toBe(3);
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      const fledEnemy = updatedBoard.enemies.find(e => e.id === enemy.id);
      expect(fledEnemy.direction).toBe(3);
    });

    it('disarmed enemy vision zones fully removed after enemyFled', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // Count original vision zones
      const origVisionZones = [];
      for (const [v, entries] of boardData.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            origVisionZones.push(v);
          }
        }
      }
      expect(origVisionZones.length).toBeGreaterThan(1); // originally range=3

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      // Destroy enemy weapons so they're disarmed
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);
      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      const newVisionZones = [];
      for (const [v, entries] of updatedBoard.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            newVisionZones.push(v);
          }
        }
      }
      expect(newVisionZones.length).toBe(0);
    });

    it('disarmed enemy retains proximity zones after enemyFled', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      // Destroy enemy weapons so they're disarmed
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);
      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      // Should have some proximity zones around the enemy
      let hasProximity = false;
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'proximity') {
            hasProximity = true;
            break;
          }
        }
        if (hasProximity) break;
      }
      expect(hasProximity).toBe(true);
    });

    it('deducts steps used from movement pool on retreat', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerLose');

      // stepsUsed = triggerVertexIndex + 1 = 1
      expect(get(movementPool)).toBe(poolBefore - 1);
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

  describe('adjacent enemy zone preservation (Bug 3 regression)', () => {
    it('destroying one adjacent enemy preserves second enemy zones', () => {
      // Add two enemies
      const enemy1 = addEnemyToBoard();
      const enemy2 = addEnemyToBoard();

      // Record enemy2's zones before destroying enemy1
      const enemy2ZonesBefore = [];
      for (const [v, entries] of boardData.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy2.id) {
            enemy2ZonesBefore.push(v);
          }
        }
      }

      const preCombatPos = get(playerPos);
      startCombat(enemy1.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      // enemy2's zones should still be present
      const updatedBoard = get(board);
      for (const zv of enemy2ZonesBefore) {
        const entries = updatedBoard.enemyZoneMap.get(zv);
        expect(entries).toBeDefined();
        const entry = entries.find(e => e.enemyId === enemy2.id);
        expect(entry).toBeDefined();
      }
    });

    it('second enemy engageable after first destroyed', () => {
      const enemy1 = addEnemyToBoard();
      const enemy2 = addEnemyToBoard();

      const preCombatPos = get(playerPos);

      // Destroy enemy1
      startCombat(enemy1.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      resolveCombat('playerWin');

      // enemy2 should still have zones in the enemyZones set
      const updatedBoard = get(board);
      let enemy2HasZones = false;
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        if (entries.some(e => e.enemyId === enemy2.id)) {
          enemy2HasZones = true;
          break;
        }
      }
      expect(enemy2HasZones).toBe(true);

      // enemy2 zones should also be in the enemyZones set
      for (const [zv, entries] of updatedBoard.enemyZoneMap) {
        if (entries.some(e => e.enemyId === enemy2.id)) {
          expect(updatedBoard.enemyZones.has(zv)).toBe(true);
        }
      }
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
    it('win → enemy removed → player stays at combat vertex in rolling phase', () => {
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
      const defeatedEnemy = updatedBoard.enemies.find(e => e.id === enemyId);
      expect(defeatedEnemy).toBeDefined();
      expect(defeatedEnemy.destroyed).toBe(true);
      expect(updatedBoard.obstacles.has(enemyVertexId)).toBe(false);
      expect(updatedBoard.boardObjects.find(o => o.id === enemyId)).toBeUndefined();

      // Verify game state — player at combat vertex (path[1] = 'v2')
      expect(get(gamePhase)).toBe('rolling');
      expect(get(playerPos)).toBe('v2');
      expect(get(combatState)).toBeNull();
      expect(get(diceValue)).toBeNull();
    });

    it('lose → enemy stays → player retreats → steps deducted', () => {
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const poolBefore = get(movementPool);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['v1'], 0);

      resolveCombat('playerLose');

      const updatedBoard = get(board);
      expect(updatedBoard.enemies.find(e => e.id === enemy.id)).toBeDefined();
      expect(get(gamePhase)).toBe('rolling');
      expect(get(playerPos)).toBe(preCombatPos);
      // stepsUsed = triggerVertexIndex + 1 = 1
      expect(get(movementPool)).toBe(poolBefore - 1);
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

  describe('player ship health persistence (US-039)', () => {
    /** Equip the player ship with standard components for combat tests */
    function equipStandardLoadout() {
      const ship = get(playerShipStore);
      ship.addComponent(new WeaponComponent('Weapons', 4, 2));
      ship.addComponent(new EngineComponent('Engines', 4, 2));
      ship.addComponent(new BridgeComponent('Bridge', 3, 2));
      playerShipStore.set(ship);
    }

    it('initGame creates an empty PlayerShip when none exists', () => {
      const ship = get(playerShipStore);
      expect(ship).not.toBeNull();
      expect(ship.name).toBe('Player Ship');
      expect(ship.components).toHaveLength(0);
      expect(ship.powerLimit).toBe(7);
    });

    it('startCombat reuses the persistent PlayerShip instance', () => {
      equipStandardLoadout();
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);
      const shipBefore = get(playerShipStore);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      const state = get(combatState);
      expect(state.engine.playerShip).toBe(shipBefore);

      diceValue.set(2);
      resolveCombat('playerLose');
    });

    it('player ship damage persists across multiple combat encounters', () => {
      equipStandardLoadout();
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // First combat — damage player's Weapons (4 HP → 3 HP)
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state1 = get(combatState);
      state1.engine.playerShip.getComponent('Weapons').takeDamage(1);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Second combat — player should retain damaged Weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state2 = get(combatState);
      const weapons = state2.engine.playerShip.getComponent('Weapons');
      expect(weapons.currentHp).toBe(3);
      expect(weapons.destroyed).toBe(false);

      diceValue.set(2);
      resolveCombat('playerLose');
    });

    it('player ship damage accumulates across encounters', () => {
      equipStandardLoadout();
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // First combat — damage Engines (4 HP → 2 HP)
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      get(combatState).engine.playerShip.getComponent('Engines').takeDamage(2);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Second combat — damage Engines again (2 HP → 0 HP)
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      get(combatState).engine.playerShip.getComponent('Engines').takeDamage(2);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Verify Engines are now destroyed
      const ship = get(playerShipStore);
      expect(ship.getComponent('Engines').currentHp).toBe(0);
      expect(ship.getComponent('Engines').destroyed).toBe(true);
    });

    it('initGame preserves existing player ship', () => {
      equipStandardLoadout();
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // Damage the player ship
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.playerShip.getComponent('Weapons').takeDamage(4);
      state.engine.playerShip.getComponent('Engines').takeDamage(1);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Verify damage exists
      const damagedShip = get(playerShipStore);
      expect(damagedShip.getComponent('Weapons').currentHp).toBe(0);

      // Start a new game — ship is preserved since it already exists
      initGame(5, 4, 99);

      const sameShip = get(playerShipStore);
      expect(sameShip).toBe(damagedShip);
      expect(sameShip.getComponent('Weapons').currentHp).toBe(0);
    });

    it('resetGame clears the player ship store', () => {
      // Verify ship exists
      expect(get(playerShipStore)).not.toBeNull();

      resetGame();

      expect(get(playerShipStore)).toBeNull();
    });

    it('undamaged components retain full HP between encounters', () => {
      equipStandardLoadout();
      const enemy = addEnemyToBoard();
      const preCombatPos = get(playerPos);

      // First combat — damage only Weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      get(combatState).engine.playerShip.getComponent('Weapons').takeDamage(1);
      diceValue.set(2);
      resolveCombat('playerLose');

      // Second combat — Engines and Bridge should still be at full HP
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      expect(state.engine.playerShip.getComponent('Engines').currentHp).toBe(4);
      expect(state.engine.playerShip.getComponent('Bridge').currentHp).toBe(3);
      expect(state.engine.playerShip.getComponent('Weapons').currentHp).toBe(3);

      diceValue.set(2);
      resolveCombat('playerLose');
    });
  });

  describe('disarmed enemy vision ray removal (US-045)', () => {
    /**
     * Helper: add an enemy to the board with full zone setup (vision + proximity).
     */
    function addEnemyWithZones(vertexId, direction) {
      const vId = vertexId || findFreeVertex();
      const enemy = new Enemy(vId, 3, direction || 0, 3);
      boardData.enemies.push(enemy);
      boardData.obstacles.add(enemy.vertexId);
      boardData.boardObjects.push(enemy);

      // Compute vision zone from rays (respecting obstacles)
      const affected = enemy.getAffectedVertices(null, boardData.rays, boardData.obstacles);
      for (let i = 1; i < affected.length; i++) {
        boardData.enemyZones.add(affected[i]);
        const existing = boardData.enemyZoneMap.get(affected[i]) || [];
        existing.push({ enemyId: enemy.id, zoneType: 'vision' });
        boardData.enemyZoneMap.set(affected[i], existing);
      }

      // Compute proximity zone via BFS (depth <= 2)
      const proxVisited = new Set();
      proxVisited.add(enemy.vertexId);
      let frontier = [enemy.vertexId];
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
            const existingZone = boardData.enemyZoneMap.get(nv) || [];
            if (!existingZone.some(e => e.enemyId === enemy.id)) {
              existingZone.push({ enemyId: enemy.id, zoneType: 'proximity' });
              boardData.enemyZoneMap.set(nv, existingZone);
            }
            nextFrontier.push(nv);
          }
        }
        frontier = nextFrontier;
      }

      board.set(boardData);
      return enemy;
    }

    it('disarmed enemy has no vision zone after combat resolve', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Record vision zone vertices before combat
      const visionZonesBefore = [];
      for (const [zv, entries] of boardData.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            visionZonesBefore.push(zv);
          }
        }
      }
      expect(visionZonesBefore.length).toBeGreaterThan(0);

      // Start combat and destroy enemy weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);

      // Resolve as enemyFled (enemy flees when weapons destroyed + engines intact)
      resolveCombat('enemyFled');

      // Vision zones should be removed
      const updatedBoard = get(board);
      for (const zv of visionZonesBefore) {
        const entries = updatedBoard.enemyZoneMap.get(zv);
        if (entries) {
          const entry = entries.find(e => e.enemyId === enemy.id);
          if (entry) {
            expect(entry.zoneType).not.toBe('vision');
          }
        }
      }
    });

    it('disarmed enemy still has proximity zone after combat resolve', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Start combat and destroy enemy weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);

      resolveCombat('enemyFled');

      // Proximity zones should still exist for this enemy
      const updatedBoard = get(board);
      let proximityCount = 0;
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'proximity') {
            proximityCount++;
          }
        }
      }
      expect(proximityCount).toBeGreaterThan(0);
    });

    it('disarmed enemy remains on the board (not destroyed)', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);

      resolveCombat('enemyFled');

      const updatedBoard = get(board);
      const enemyOnBoard = updatedBoard.enemies.find(e => e.id === enemy.id);
      expect(enemyOnBoard).toBeDefined();
      expect(enemyOnBoard.destroyed).toBeFalsy();
      expect(updatedBoard.obstacles.has(enemy.vertexId)).toBe(true);
    });

    it('getAffectedVertices returns only own vertex for disarmed enemy (no vision ray for rendering)', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Confirm vision ray exists before disarming
      const affectedBefore = enemy.getAffectedVertices(null, boardData.rays);
      expect(affectedBefore.length).toBeGreaterThan(1);

      // Start combat and destroy enemy weapons
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);

      resolveCombat('enemyFled');

      // After disarming, getAffectedVertices should only return own vertex
      const affectedAfter = enemy.getAffectedVertices(null, boardData.rays);
      expect(affectedAfter).toEqual([enemy.vertexId]);
    });

    it('re-engagement with disarmed enemy works via proximity zone', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Disarm the enemy
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state1 = get(combatState);
      state1.engine.enemyShip.getComponent('Weapons').takeDamage(1);
      resolveCombat('enemyFled');

      // Re-engage — start combat again with the same enemy
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, get(playerPos), ['b'], 0);
      const state2 = get(combatState);

      // Enemy should still have combatShip with destroyed weapons
      expect(state2.engine.enemyShip.canAttack).toBe(false);
      expect(state2.engine.enemyShip.getComponent('Weapons').destroyed).toBe(true);

      diceValue.set(2);
      resolveCombat('playerLose');
    });

    it('enemy with functional weapons retains vision zones after combat', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Record vision zones before
      const visionZonesBefore = [];
      for (const [zv, entries] of boardData.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            visionZonesBefore.push(zv);
          }
        }
      }

      // Start combat but do NOT destroy weapons — resolve as playerLose (timeout)
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);

      resolveCombat('playerLose');

      // Vision zones should still exist for this enemy
      const updatedBoard = get(board);
      for (const zv of visionZonesBefore) {
        const entries = updatedBoard.enemyZoneMap.get(zv);
        expect(entries).toBeDefined();
        const entry = entries.find(e => e.enemyId === enemy.id);
        expect(entry).toBeDefined();
        expect(entry.zoneType).toBe('vision');
      }
    });

    it('escaped from disarmed enemy still removes vision zones', () => {
      const enemy = addEnemyWithZones();
      const preCombatPos = get(playerPos);

      // Record vision zone count before
      let visionCountBefore = 0;
      for (const [, entries] of boardData.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            visionCountBefore++;
          }
        }
      }
      expect(visionCountBefore).toBeGreaterThan(0);

      // Start combat, destroy weapons, then escape
      startCombat(enemy.id, { firstAttacker: 'player', bonusAttacks: 0 }, preCombatPos, ['a'], 0);
      const state = get(combatState);
      state.engine.enemyShip.getComponent('Weapons').takeDamage(1);

      resolveCombat('escaped');

      // Vision zones should be removed
      const updatedBoard = get(board);
      let visionCountAfter = 0;
      for (const [, entries] of updatedBoard.enemyZoneMap) {
        for (const info of entries) {
          if (info.enemyId === enemy.id && info.zoneType === 'vision') {
            visionCountAfter++;
          }
        }
      }
      expect(visionCountAfter).toBe(0);
    });
  });
});

describe('resolveMovePath (pure function)', () => {
  it('returns noMove for empty path', () => {
    const result = resolveMovePath([], null, false, false, false, 10, 'target', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('noMove');
    expect(result.finalPos).toBeNull();
    expect(result.stepsConsumed).toBe(0);
  });

  it('returns move for normal movement', () => {
    // Set up rays so isTrapped returns false
    const rays = new Map([['B', [{ direction: 0, vertices: ['C'] }]]]);
    const result = resolveMovePath(['A', 'B'], null, false, false, false, 10, 'target', rays, new Set(), 0, {});
    expect(result.outcome).toBe('move');
    expect(result.finalPos).toBe('B');
    expect(result.stepsConsumed).toBe(2);
  });

  it('returns win when reachedTarget is true', () => {
    const result = resolveMovePath(['A', 'target'], null, true, false, false, 10, 'target', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('win');
    expect(result.finalPos).toBe('target');
  });

  it('returns win when finalPos equals target', () => {
    const result = resolveMovePath(['target'], null, false, false, false, 10, 'target', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('win');
    expect(result.finalPos).toBe('target');
  });

  it('returns blackhole when hitBlackhole is true', () => {
    const result = resolveMovePath(['A', 'B'], null, false, true, false, 10, 'target', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('blackhole');
    expect(result.finalPos).toBe('B');
  });

  it('returns poolExhausted when pool runs out', () => {
    const result = resolveMovePath(['A', 'B'], null, false, false, false, 2, 'target', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('poolExhausted');
  });

  it('returns trapped when no directions available', () => {
    // Empty rays = trapped
    const rays = new Map([['B', []]]);
    const result = resolveMovePath(['A', 'B'], null, false, false, false, 10, 'target', rays, new Set(), 0, {});
    expect(result.outcome).toBe('trapped');
  });

  it('returns engageVision for vision zone engagement', () => {
    const engageEnemy = { vertexIndex: 1, enemyId: 'enemy:v1', zoneType: 'vision' };
    const boardData = { enemies: [{ id: 'enemy:v1', direction: 2 }] };
    const result = resolveMovePath(['A', 'B'], engageEnemy, false, false, false, 10, 'target', new Map(), new Set(), 0, boardData);
    expect(result.outcome).toBe('engageVision');
    expect(result.engagement.enemyId).toBe('enemy:v1');
    expect(result.engagement.approachAdvantage).toBeDefined();
  });

  it('returns engageProximity for proximity zone engagement', () => {
    const engageEnemy = { vertexIndex: 1, enemyId: 'enemy:v1', zoneType: 'proximity' };
    const boardData = { enemies: [{ id: 'enemy:v1', direction: 2 }] };
    const result = resolveMovePath(['A', 'B'], engageEnemy, false, false, false, 10, 'target', new Map(), new Set(), 0, boardData);
    expect(result.outcome).toBe('engageProximity');
    expect(result.engagement.enemyId).toBe('enemy:v1');
    expect(result.engagement.zoneType).toBe('proximity');
  });

  it('engagement takes priority over other outcomes', () => {
    // Even if target is reached, engagement should fire first
    const engageEnemy = { vertexIndex: 0, enemyId: 'enemy:v1', zoneType: 'vision' };
    const boardData = { enemies: [{ id: 'enemy:v1', direction: 0 }] };
    const result = resolveMovePath(['target'], engageEnemy, true, false, false, 10, 'target', new Map(), new Set(), 0, boardData);
    expect(result.outcome).toBe('engageVision');
  });

  it('blackhole takes priority over win', () => {
    const result = resolveMovePath(['A'], null, true, true, false, 10, 'A', new Map(), new Set(), 0, {});
    expect(result.outcome).toBe('blackhole');
  });
});

describe('vision zones blocked by obstacles', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(7, 6, 42, 5);
  });

  it('enemy vision zone does not extend through obstacles on the board', () => {
    // Find an enemy with a vision zone
    const enemy = boardData.enemies.find(e => {
      const affected = e.getAffectedVertices(null, boardData.rays, boardData.obstacles);
      return affected.length > 1; // has vision zone vertices
    });
    if (!enemy) return; // skip if no enemy has vision zone (all blocked)

    // Get the vision ray vertices
    const vertexRays = boardData.rays.get(enemy.vertexId);
    const facingRay = vertexRays?.find(r => r.direction === enemy.direction);
    if (!facingRay || facingRay.vertices.length === 0) return;

    // Check that no vision zone vertex is behind an obstacle
    let sawObstacle = false;
    for (let i = 0; i < facingRay.vertices.length && i < enemy.visionRange; i++) {
      const vid = facingRay.vertices[i];
      if (boardData.obstacles.has(vid)) {
        sawObstacle = true;
        continue;
      }
      if (sawObstacle) {
        // This vertex is behind an obstacle — should NOT have a vision zone entry for this enemy
        const entries = boardData.enemyZoneMap.get(vid);
        const hasVision = entries && entries.some(e => e.enemyId === enemy.id && e.zoneType === 'vision');
        expect(hasVision).toBeFalsy();
      }
    }
  });

  it('vision zone stops before obstacle vertex', () => {
    // Create a controlled scenario with a mock obstacle in the ray
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    const longRay = rays?.find(r => r.vertices.length >= 4 && !boardData.obstacles.has(r.vertices[0]));
    if (!longRay) return;

    // Place an obstacle at index 2 in the ray
    const obstacleVertex = longRay.vertices[2];
    boardData.obstacles.add(obstacleVertex);

    // Create enemy at pos facing in the longRay direction
    const enemy = new Enemy(pos, 3, longRay.direction, 5);
    const affected = enemy.getAffectedVertices(null, boardData.rays, boardData.obstacles);

    // Vision zone should include vertices 0, 1 but NOT 2 (obstacle) or beyond
    expect(affected).toContain(pos); // own vertex
    expect(affected).toContain(longRay.vertices[0]);
    expect(affected).toContain(longRay.vertices[1]);
    expect(affected).not.toContain(obstacleVertex);
    if (longRay.vertices.length > 3) {
      expect(affected).not.toContain(longRay.vertices[3]);
    }

    // Clean up
    boardData.obstacles.delete(obstacleVertex);
  });
});

describe('engagement uses computePath as single source of truth', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  function executeMoveAsync() {
    return new Promise((resolve) => {
      executeMove(() => resolve());
    });
  }

  it('engagement detected during path computation triggers correctly', async () => {
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    const longRay = rays?.find(r => {
      if (r.vertices.length < 3) return false;
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1])
        && !boardData.enemyZoneMap.has(r.vertices[0]) && !boardData.enemyZoneMap.has(r.vertices[1]);
    });
    if (!longRay) return;

    const zoneVertex = longRay.vertices[1];
    const enemy = new Enemy('test-enemy-vertex', 3, 2);
    boardData.enemies.push(enemy);
    boardData.enemyZones.add(zoneVertex);
    const existingEntries = boardData.enemyZoneMap.get(zoneVertex) || [];
    existingEntries.push({ enemyId: enemy.id, zoneType: 'vision' });
    boardData.enemyZoneMap.set(zoneVertex, existingEntries);
    board.set(boardData);

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');
    selectDirection(longRay.direction);

    await executeMoveAsync();

    // Should trigger combat via computePath's engageEnemy, not checkEngagement
    expect(get(gamePhase)).toBe('combat');
    expect(get(combatState)).not.toBeNull();
    expect(get(combatState).enemyId).toBe(enemy.id);
  });
});

describe('stealth dive excludeEnemyId bypass', () => {
  let boardData;

  beforeEach(() => {
    resetGame();
    boardData = initGame(5, 4, 42, 5);
  });

  function executeMoveAsync() {
    return new Promise((resolve) => {
      executeMove(() => resolve());
    });
  }

  it('declineEngagement bypasses the declined enemy zone during continuation', async () => {
    const pos = get(playerPos);
    const rays = boardData.rays.get(pos);
    // Find a ray with enough vertices
    const longRay = rays?.find(r => {
      if (r.vertices.length < 4) return false;
      return !boardData.obstacles.has(r.vertices[0]) && !boardData.obstacles.has(r.vertices[1])
        && !boardData.obstacles.has(r.vertices[2])
        && !boardData.enemyZoneMap.has(r.vertices[0]) && !boardData.enemyZoneMap.has(r.vertices[1]);
    });
    if (!longRay) return;

    // Place enemy with proximity zone at vertex 1
    const zoneVertex = longRay.vertices[1];
    const enemy = new Enemy('stealth-test-enemy', 3, 2);
    boardData.enemies.push(enemy);
    boardData.enemyZones.add(zoneVertex);
    const e1 = boardData.enemyZoneMap.get(zoneVertex) || [];
    e1.push({ enemyId: enemy.id, zoneType: 'proximity' });
    boardData.enemyZoneMap.set(zoneVertex, e1);
    // Also place the same enemy's zone at vertex 2 (to test bypass)
    boardData.enemyZones.add(longRay.vertices[2]);
    const e2 = boardData.enemyZoneMap.get(longRay.vertices[2]) || [];
    e2.push({ enemyId: enemy.id, zoneType: 'proximity' });
    boardData.enemyZoneMap.set(longRay.vertices[2], e2);
    board.set(boardData);

    movementPool.set(20);
    diceValue.set(4);
    gamePhase.set('selectingDirection');
    selectDirection(longRay.direction);

    await executeMoveAsync();

    // Should be in engagementChoice (proximity zone hit)
    expect(get(gamePhase)).toBe('engagementChoice');

    // Decline — should perform stealth dive and bypass this enemy's zones
    await new Promise(resolve => {
      declineEngagement(resolve);
    });

    // Should NOT be in engagementChoice again (bypassed same enemy)
    // Should be in rolling or another valid state
    const phase = get(gamePhase);
    expect(phase).not.toBe('engagementChoice');
  });
});

describe('generateComponentMarket', () => {
  function makeRng(seed) {
    let s = seed | 0;
    if (s === 0) s = 1;
    return function () {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  it('generates 5 or 6 components', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    expect(market.length).toBeGreaterThanOrEqual(5);
    expect(market.length).toBeLessThanOrEqual(6);
  });

  it('guarantees at least 1 weapon, 1 engine, and exactly 2 bridges', () => {
    // Test with multiple seeds to ensure guarantee holds
    for (const seed of [1, 42, 100, 999, 12345]) {
      const rng = makeRng(seed);
      const market = generateComponentMarket(rng);
      const types = market.map(c => c.type);
      expect(types).toContain('weapon');
      expect(types).toContain('engine');
      const bridges = market.filter(c => c.type === 'bridge');
      expect(bridges).toHaveLength(2);
    }
  });

  it('generates exactly one power-1 bridge and one power-2 bridge', () => {
    for (const seed of [1, 42, 100, 999, 12345]) {
      const rng = makeRng(seed);
      const market = generateComponentMarket(rng);
      const bridges = market.filter(c => c.type === 'bridge');
      const powers = bridges.map(b => b.powerCost).sort();
      expect(powers).toEqual([1, 2]);
    }
  });

  it('assigns powerCost 1 or 2 to each component', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    for (const comp of market) {
      expect([1, 2]).toContain(comp.powerCost);
    }
  });

  it('creates correct component types (WeaponComponent, EngineComponent, BridgeComponent)', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    for (const comp of market) {
      if (comp.type === 'weapon') {
        expect(comp).toBeInstanceOf(WeaponComponent);
      } else if (comp.type === 'engine') {
        expect(comp).toBeInstanceOf(EngineComponent);
      } else if (comp.type === 'bridge') {
        expect(comp).toBeInstanceOf(BridgeComponent);
      }
    }
  });

  it('is deterministic with the same seed', () => {
    const market1 = generateComponentMarket(makeRng(42));
    const market2 = generateComponentMarket(makeRng(42));
    expect(market1.length).toBe(market2.length);
    for (let i = 0; i < market1.length; i++) {
      expect(market1[i].type).toBe(market2[i].type);
      expect(market1[i].powerCost).toBe(market2[i].powerCost);
      expect(market1[i].maxHp).toBe(market2[i].maxHp);
    }
  });

  it('produces different results with different seeds', () => {
    const market1 = generateComponentMarket(makeRng(42));
    const market2 = generateComponentMarket(makeRng(999));
    // At least one difference expected (could be count, types, or power costs)
    const same = market1.length === market2.length &&
      market1.every((c, i) => c.type === market2[i].type && c.powerCost === market2[i].powerCost);
    expect(same).toBe(false);
  });

  it('weapon power 1 has accuracy 4, power 2 has accuracy 3', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    for (const comp of market) {
      if (comp.type === 'weapon') {
        if (comp.powerCost === 1) expect(comp.accuracy).toBe(4);
        if (comp.powerCost === 2) expect(comp.accuracy).toBe(3);
      }
    }
  });

  it('engine power 1 has speedBonus 0, power 2 has speedBonus 1', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    for (const comp of market) {
      if (comp.type === 'engine') {
        if (comp.powerCost === 1) expect(comp.speedBonus).toBe(0);
        if (comp.powerCost === 2) expect(comp.speedBonus).toBe(1);
      }
    }
  });

  it('bridge power 1 has evasionBonus 0, power 2 has evasionBonus 1', () => {
    const rng = makeRng(42);
    const market = generateComponentMarket(rng);
    for (const comp of market) {
      if (comp.type === 'bridge') {
        if (comp.powerCost === 1) expect(comp.evasionBonus).toBe(0);
        if (comp.powerCost === 2) expect(comp.evasionBonus).toBe(1);
      }
    }
  });
});

describe('shipyard phase and stores', () => {
  beforeEach(() => {
    resetGame();
  });

  it('componentMarket starts empty after reset', () => {
    expect(get(componentMarket)).toEqual([]);
  });

  it('shipConfirmed starts false after reset', () => {
    expect(get(shipConfirmed)).toBe(false);
  });

  it('enterShipyard sets gamePhase to shipyard', () => {
    enterShipyard();
    expect(get(gamePhase)).toBe('shipyard');
  });

  it('confirmShipBuild sets shipConfirmed to true and returns to galaxy', () => {
    enterShipyard();
    confirmShipBuild();
    expect(get(shipConfirmed)).toBe(true);
    expect(get(gamePhase)).toBe('galaxy');
  });

  it('initGalaxySession generates market and resets ship state', () => {
    initGalaxySession(42);
    const market = get(componentMarket);
    expect(market.length).toBeGreaterThanOrEqual(5);
    expect(market.length).toBeLessThanOrEqual(6);
    expect(get(shipConfirmed)).toBe(false);
    expect(get(playerShipStore)).not.toBeNull();
  });

  it('initGalaxySession is deterministic with seed', () => {
    initGalaxySession(42);
    const market1 = get(componentMarket);
    const types1 = market1.map(c => ({ type: c.type, powerCost: c.powerCost }));

    resetGame();
    initGalaxySession(42);
    const market2 = get(componentMarket);
    const types2 = market2.map(c => ({ type: c.type, powerCost: c.powerCost }));

    expect(types1).toEqual(types2);
  });

  it('resetGame clears componentMarket and shipConfirmed', () => {
    initGalaxySession(42);
    confirmShipBuild();
    expect(get(shipConfirmed)).toBe(true);
    expect(get(componentMarket).length).toBeGreaterThan(0);

    resetGame();
    expect(get(componentMarket)).toEqual([]);
    expect(get(shipConfirmed)).toBe(false);
  });

  it('resetBoardState preserves playerShipStore, componentMarket, and shipConfirmed', () => {
    initGalaxySession(42);
    installComponent(0);
    confirmShipBuild();

    const shipBefore = get(playerShipStore);
    const marketBefore = get(componentMarket);
    const confirmedBefore = get(shipConfirmed);

    // Simulate starting a board
    initGame(5, 4, 99);
    expect(get(gamePhase)).toBe('rolling');

    // Simulate board completion — resetBoardState instead of resetGame
    resetBoardState();

    expect(get(gamePhase)).toBe('galaxy');
    expect(get(playerShipStore)).toBe(shipBefore);
    expect(get(componentMarket)).toBe(marketBefore);
    expect(get(shipConfirmed)).toBe(confirmedBefore);
  });

  it('resetBoardState clears board-specific stores', () => {
    initGalaxySession(42);
    initGame(5, 4, 99);

    // Board-specific stores should be populated
    expect(get(board)).not.toBeNull();
    expect(get(playerPos)).not.toBeNull();
    expect(get(movementPool)).toBeGreaterThan(0);

    resetBoardState();

    expect(get(board)).toBeNull();
    expect(get(playerPos)).toBeNull();
    expect(get(movementPool)).toBe(0);
    expect(get(diceValue)).toBeNull();
    expect(get(gamePhase)).toBe('galaxy');
    expect(get(visited).size).toBe(0);
    expect(get(movesMade)).toBe(0);
    expect(get(loseReason)).toBeNull();
    expect(get(combatState)).toBeNull();
  });
});

describe('installComponent / removeComponent', () => {
  beforeEach(() => {
    resetGame();
    initGalaxySession(42);
  });

  it('installComponent moves a component from market to player ship', () => {
    // Start with an empty ship so we have full power budget
    playerShipStore.set(new PlayerShip({ powerLimit: 7, components: [] }));

    const marketBefore = get(componentMarket);
    const countBefore = marketBefore.length;
    const component = marketBefore[0];

    const result = installComponent(0);
    expect(result).toBe(true);

    const marketAfter = get(componentMarket);
    expect(marketAfter.length).toBe(countBefore - 1);
    expect(marketAfter).not.toContain(component);

    const ship = get(playerShipStore);
    expect(ship.components).toContain(component);
  });

  it('installComponent returns false for out-of-bounds index', () => {
    expect(installComponent(-1)).toBe(false);
    expect(installComponent(100)).toBe(false);
  });

  it('installComponent returns false when insufficient power', () => {
    // Fill up the ship to exhaust power budget (powerLimit = 7)
    const market = get(componentMarket);
    let installed = 0;
    for (let i = 0; i < market.length; i++) {
      const ship = get(playerShipStore);
      const comp = get(componentMarket)[0]; // always index 0 since market shrinks
      if (ship.remainingPower >= comp.powerCost && !(comp.type === 'bridge' && ship.hasComponentType('bridge'))) {
        installComponent(0);
        installed++;
      } else {
        break;
      }
    }

    // Now try to add a component that exceeds remaining power
    // Create a scenario where we know power is exceeded
    const ship = get(playerShipStore);
    const remaining = ship.remainingPower;

    // Find a component in market that exceeds remaining power
    const currentMarket = get(componentMarket);
    const tooBig = currentMarket.findIndex(c => c.powerCost > remaining);
    if (tooBig !== -1) {
      const result = installComponent(tooBig);
      expect(result).toBe(false);
    }
  });

  it('installComponent returns false when adding second bridge', () => {
    // First, install a bridge
    const market = get(componentMarket);
    const bridgeIndex = market.findIndex(c => c.type === 'bridge');
    expect(bridgeIndex).toBeGreaterThanOrEqual(0);

    installComponent(bridgeIndex);

    // Now try to install another bridge
    const marketAfter = get(componentMarket);
    const secondBridgeIndex = marketAfter.findIndex(c => c.type === 'bridge');
    if (secondBridgeIndex !== -1) {
      const result = installComponent(secondBridgeIndex);
      expect(result).toBe(false);
      // Market should be unchanged
      expect(get(componentMarket).length).toBe(marketAfter.length);
    }
  });

  it('removeComponent moves a component from ship back to market', () => {
    // Install a component first
    const market = get(componentMarket);
    const component = market[0];
    const componentName = component.name;
    installComponent(0);

    const marketAfterInstall = get(componentMarket);
    const marketCountAfterInstall = marketAfterInstall.length;

    // Now remove it
    const result = removeComponent(componentName);
    expect(result).toBe(true);

    const ship = get(playerShipStore);
    expect(ship.getComponent(componentName)).toBeUndefined();

    const marketAfterRemove = get(componentMarket);
    expect(marketAfterRemove.length).toBe(marketCountAfterInstall + 1);
    expect(marketAfterRemove).toContain(component);
  });

  it('removeComponent returns false for non-existent component', () => {
    const result = removeComponent('NonExistentComponent');
    expect(result).toBe(false);
  });

  it('removeComponent repairs component HP before returning to market', () => {
    // Start with empty ship for clean test
    playerShipStore.set(new PlayerShip({ powerLimit: 7, components: [] }));

    // Install a component
    const market = get(componentMarket);
    const component = market[0];
    installComponent(0);

    // Damage the component
    component.takeDamage(1);
    expect(component.currentHp).toBeLessThan(component.maxHp);

    // Remove it — should be repaired
    removeComponent(component.name);

    const marketAfter = get(componentMarket);
    const returned = marketAfter.find(c => c === component);
    expect(returned).toBeDefined();
    expect(returned.currentHp).toBe(returned.maxHp);
  });

  it('both stores update reactively after install', () => {
    // Start with empty ship for clean test
    playerShipStore.set(new PlayerShip({ powerLimit: 7, components: [] }));

    const market = get(componentMarket);
    const initialMarketLen = market.length;
    const ship = get(playerShipStore);
    const initialShipLen = ship.components.length;

    installComponent(0);

    expect(get(componentMarket).length).toBe(initialMarketLen - 1);
    expect(get(playerShipStore).components.length).toBe(initialShipLen + 1);
  });

  it('both stores update reactively after remove', () => {
    // Install first
    const component = get(componentMarket)[0];
    installComponent(0);

    const marketAfterInstall = get(componentMarket).length;
    const shipAfterInstall = get(playerShipStore).components.length;

    // Remove
    removeComponent(component.name);

    expect(get(componentMarket).length).toBe(marketAfterInstall + 1);
    expect(get(playerShipStore).components.length).toBe(shipAfterInstall - 1);
  });

  it('installComponent returns false when playerShipStore is null', () => {
    playerShipStore.set(null);
    expect(installComponent(0)).toBe(false);
  });

  it('removeComponent returns false when playerShipStore is null', () => {
    playerShipStore.set(null);
    expect(removeComponent('Weapons')).toBe(false);
  });
});
