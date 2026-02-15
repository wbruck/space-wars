import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateGalaxy,
  getAdjacentBoards,
  unlockAdjacentBoards,
  isGalaxyComplete,
  saveGalaxy,
  loadGalaxy,
  clearGalaxy,
} from './galaxy.js';

describe('generateGalaxy', () => {
  it('returns a 3x3 grid of 9 boards', () => {
    const galaxy = generateGalaxy(42);
    expect(galaxy.length).toBe(3);
    for (const row of galaxy) {
      expect(row.length).toBe(3);
    }
  });

  it('each board has required properties', () => {
    const galaxy = generateGalaxy(42);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const board = galaxy[row][col];
        expect(board.row).toBe(row);
        expect(board.col).toBe(col);
        expect(['small', 'medium', 'large']).toContain(board.size);
        expect(board.difficulty).toBeGreaterThanOrEqual(7);
        expect(board.difficulty).toBeLessThanOrEqual(20);
        expect(board.seed).toBeGreaterThan(0);
        expect(['locked', 'unlocked']).toContain(board.status);
      }
    }
  });

  it('size maps to correct cols/rows', () => {
    const galaxy = generateGalaxy(42);
    const sizeMap = { small: [5, 4], medium: [7, 6], large: [9, 8] };
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const board = galaxy[row][col];
        const [expectedCols, expectedRows] = sizeMap[board.size];
        expect(board.cols).toBe(expectedCols);
        expect(board.rows).toBe(expectedRows);
      }
    }
  });

  it('board (0,0) starts unlocked, all others start locked', () => {
    const galaxy = generateGalaxy(42);
    expect(galaxy[0][0].status).toBe('unlocked');
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row === 0 && col === 0) continue;
        expect(galaxy[row][col].status).toBe('locked');
      }
    }
  });

  it('is deterministic with the same seed', () => {
    const a = generateGalaxy(123);
    const b = generateGalaxy(123);
    expect(a).toEqual(b);
  });

  it('produces different galaxies with different seeds', () => {
    const a = generateGalaxy(1);
    const b = generateGalaxy(2);
    // At least one board should differ in size, difficulty, or seed
    let hasDifference = false;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (
          a[row][col].size !== b[row][col].size ||
          a[row][col].difficulty !== b[row][col].difficulty ||
          a[row][col].seed !== b[row][col].seed
        ) {
          hasDifference = true;
        }
      }
    }
    expect(hasDifference).toBe(true);
  });

  it('generates varied sizes across the galaxy', () => {
    // With enough seeds, we should see all 3 sizes appear
    const sizes = new Set();
    for (let s = 1; s <= 10; s++) {
      const galaxy = generateGalaxy(s);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          sizes.add(galaxy[row][col].size);
        }
      }
    }
    expect(sizes.size).toBe(3);
  });
});

describe('getAdjacentBoards', () => {
  it('corner (0,0) has 3 neighbors', () => {
    const adj = getAdjacentBoards(0, 0);
    expect(adj.length).toBe(3);
    expect(adj).toContainEqual({ row: 0, col: 1 });
    expect(adj).toContainEqual({ row: 1, col: 0 });
    expect(adj).toContainEqual({ row: 1, col: 1 });
  });

  it('corner (2,2) has 3 neighbors', () => {
    const adj = getAdjacentBoards(2, 2);
    expect(adj.length).toBe(3);
    expect(adj).toContainEqual({ row: 1, col: 1 });
    expect(adj).toContainEqual({ row: 1, col: 2 });
    expect(adj).toContainEqual({ row: 2, col: 1 });
  });

  it('edge (0,1) has 5 neighbors', () => {
    const adj = getAdjacentBoards(0, 1);
    expect(adj.length).toBe(5);
  });

  it('center (1,1) has 8 neighbors', () => {
    const adj = getAdjacentBoards(1, 1);
    expect(adj.length).toBe(8);
  });
});

describe('unlockAdjacentBoards', () => {
  it('unlocks locked neighbors', () => {
    const galaxy = generateGalaxy(42);
    galaxy[0][0].status = 'won';
    unlockAdjacentBoards(galaxy, 0, 0);

    expect(galaxy[0][1].status).toBe('unlocked');
    expect(galaxy[1][0].status).toBe('unlocked');
    expect(galaxy[1][1].status).toBe('unlocked');
  });

  it('does not overwrite won status', () => {
    const galaxy = generateGalaxy(42);
    galaxy[0][1].status = 'won';
    galaxy[0][0].status = 'won';
    unlockAdjacentBoards(galaxy, 0, 0);

    expect(galaxy[0][1].status).toBe('won');
  });

  it('does not overwrite lost status', () => {
    const galaxy = generateGalaxy(42);
    galaxy[1][0].status = 'lost';
    galaxy[0][0].status = 'won';
    unlockAdjacentBoards(galaxy, 0, 0);

    expect(galaxy[1][0].status).toBe('lost');
  });
});

describe('isGalaxyComplete', () => {
  it('returns false when unlocked boards exist', () => {
    const galaxy = generateGalaxy(42);
    expect(isGalaxyComplete(galaxy)).toBe(false);
  });

  it('returns true when no unlocked boards remain', () => {
    const galaxy = generateGalaxy(42);
    // Set all to won or lost or locked
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        galaxy[row][col].status = row % 2 === 0 ? 'won' : 'lost';
      }
    }
    expect(isGalaxyComplete(galaxy)).toBe(true);
  });

  it('returns true when all boards are locked (no unlocked)', () => {
    const galaxy = generateGalaxy(42);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        galaxy[row][col].status = 'locked';
      }
    }
    expect(isGalaxyComplete(galaxy)).toBe(true);
  });
});

describe('localStorage persistence', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: (key) => { delete storage[key]; },
    });
  });

  it('saveGalaxy stores data in localStorage', () => {
    const galaxy = generateGalaxy(42);
    saveGalaxy(galaxy);
    expect(storage['galaxyProgress']).toBeDefined();
  });

  it('loadGalaxy retrieves saved galaxy', () => {
    const galaxy = generateGalaxy(42);
    saveGalaxy(galaxy);
    const loaded = loadGalaxy();
    expect(loaded).toEqual(galaxy);
  });

  it('loadGalaxy returns null when nothing saved', () => {
    expect(loadGalaxy()).toBeNull();
  });

  it('clearGalaxy removes saved data', () => {
    const galaxy = generateGalaxy(42);
    saveGalaxy(galaxy);
    clearGalaxy();
    expect(loadGalaxy()).toBeNull();
  });
});
