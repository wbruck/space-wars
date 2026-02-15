/**
 * Galaxy state module — manages a 3x3 grid of boards for meta-progression.
 */

const STORAGE_KEY = 'galaxyProgress';

const SIZE_OPTIONS = [
  { size: 'small', cols: 5, rows: 4 },
  { size: 'medium', cols: 7, rows: 6 },
  { size: 'large', cols: 9, rows: 8 },
];

/**
 * Simple seeded RNG (xorshift32), consistent with gameState.js pattern.
 */
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

/**
 * Generate a 3x3 galaxy grid of 9 boards.
 * @param {number} [seed] — optional seed for deterministic generation
 * @returns {Object[][]} 3x3 array of board objects
 */
export function generateGalaxy(seed) {
  const rng = seed != null ? makeRng(seed) : Math.random.bind(Math);

  const galaxy = [];
  for (let row = 0; row < 3; row++) {
    const rowArr = [];
    for (let col = 0; col < 3; col++) {
      const sizeOption = SIZE_OPTIONS[Math.floor(rng() * SIZE_OPTIONS.length)];
      const difficulty = 7 + Math.floor(rng() * 14); // 7–20
      const boardSeed = Math.floor(rng() * 2147483647) + 1; // positive int

      rowArr.push({
        row,
        col,
        size: sizeOption.size,
        cols: sizeOption.cols,
        rows: sizeOption.rows,
        difficulty,
        seed: boardSeed,
        status: row === 0 && col === 0 ? 'unlocked' : 'locked',
      });
    }
    galaxy.push(rowArr);
  }

  return galaxy;
}

/**
 * Get valid 8-directional adjacent board positions.
 * @param {number} row
 * @param {number} col
 * @returns {{row: number, col: number}[]}
 */
export function getAdjacentBoards(row, col) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr <= 2 && nc >= 0 && nc <= 2) {
        neighbors.push({ row: nr, col: nc });
      }
    }
  }
  return neighbors;
}

/**
 * Unlock adjacent locked boards after a win. Mutates galaxy in place.
 * Only changes 'locked' → 'unlocked'. Does NOT overwrite 'won' or 'lost'.
 * @param {Object[][]} galaxy
 * @param {number} row
 * @param {number} col
 */
export function unlockAdjacentBoards(galaxy, row, col) {
  const neighbors = getAdjacentBoards(row, col);
  for (const n of neighbors) {
    if (galaxy[n.row][n.col].status === 'locked') {
      galaxy[n.row][n.col].status = 'unlocked';
    }
  }
}

/**
 * Check if the galaxy is complete (no boards with status 'unlocked').
 * @param {Object[][]} galaxy
 * @returns {boolean}
 */
export function isGalaxyComplete(galaxy) {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (galaxy[row][col].status === 'unlocked') return false;
    }
  }
  return true;
}

/**
 * Save galaxy state to localStorage.
 * @param {Object[][]} galaxy
 */
export function saveGalaxy(galaxy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(galaxy));
  } catch (e) {
    // silently fail if localStorage is unavailable
  }
}

/**
 * Load galaxy state from localStorage.
 * @returns {Object[][]|null}
 */
export function loadGalaxy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Clear galaxy state from localStorage.
 */
export function clearGalaxy() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // silently fail if localStorage is unavailable
  }
}
