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
  initGame,
  resetGame,
  hasValidPath,
} from './gameState.js';
import { isCenterVertex } from './hexGrid.js';

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
});
