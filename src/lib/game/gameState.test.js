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

describe('initGame', () => {
  beforeEach(() => {
    resetGame();
  });

  it('sets all stores correctly for radius 2', () => {
    initGame(2, 42);

    expect(get(board)).not.toBeNull();
    expect(get(playerPos)).toBeTruthy();
    expect(get(movementPool)).toBe(20); // radius * 10
    expect(get(diceValue)).toBeNull();
    expect(get(gamePhase)).toBe('rolling');
    expect(get(movesMade)).toBe(0);
  });

  it('sets all stores correctly for radius 3', () => {
    initGame(3, 42);

    expect(get(movementPool)).toBe(30); // radius * 10
    expect(get(gamePhase)).toBe('rolling');
  });

  it('sets all stores correctly for radius 4', () => {
    initGame(4, 42);

    expect(get(movementPool)).toBe(40); // radius * 10
    expect(get(gamePhase)).toBe('rolling');
  });

  it('places start and target vertices that are not the same', () => {
    const boardData = initGame(2, 42);

    expect(boardData.startVertex).not.toBe(boardData.targetVertex);
  });

  it('places start and target at reasonable distance apart (not adjacent)', () => {
    const boardData = initGame(2, 42);
    const adj = boardData.adjacency.get(boardData.startVertex) || [];
    expect(adj).not.toContain(boardData.targetVertex);
  });

  it('player starts at the start vertex', () => {
    const boardData = initGame(2, 42);

    expect(get(playerPos)).toBe(boardData.startVertex);
  });

  it('start vertex is in the visited set', () => {
    const boardData = initGame(2, 42);

    expect(get(visited).has(boardData.startVertex)).toBe(true);
  });

  it('obstacles do not include start or target vertices', () => {
    const boardData = initGame(2, 42);

    expect(boardData.obstacles.has(boardData.startVertex)).toBe(false);
    expect(boardData.obstacles.has(boardData.targetVertex)).toBe(false);
  });

  it('board data includes all grid fields plus game fields', () => {
    const boardData = initGame(2, 42);

    expect(boardData).toHaveProperty('vertices');
    expect(boardData).toHaveProperty('adjacency');
    expect(boardData).toHaveProperty('rays');
    expect(boardData).toHaveProperty('hexCenters');
    expect(boardData).toHaveProperty('size');
    expect(boardData).toHaveProperty('radius');
    expect(boardData).toHaveProperty('obstacles');
    expect(boardData).toHaveProperty('startVertex');
    expect(boardData).toHaveProperty('targetVertex');
  });
});

describe('obstacle placement validity', () => {
  it('a valid path exists from start to target (radius 2)', () => {
    const boardData = initGame(2, 42);
    const result = hasValidPath(
      boardData.adjacency,
      boardData.startVertex,
      boardData.targetVertex,
      boardData.obstacles
    );
    expect(result).toBe(true);
  });

  it('a valid path exists from start to target (radius 3)', () => {
    const boardData = initGame(3, 42);
    const result = hasValidPath(
      boardData.adjacency,
      boardData.startVertex,
      boardData.targetVertex,
      boardData.obstacles
    );
    expect(result).toBe(true);
  });

  it('a valid path exists from start to target (radius 4)', () => {
    const boardData = initGame(4, 42);
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
      const boardData = initGame(2, seed);
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
    const boardData = initGame(2, 42);
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

describe('resetGame', () => {
  it('resets all stores to initial values', () => {
    initGame(2, 42);
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
