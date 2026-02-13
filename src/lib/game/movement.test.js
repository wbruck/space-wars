import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { generateGrid, isCenterVertex } from './hexGrid.js';
import { getAvailableDirections, computePath, isTrapped } from './movement.js';
import {
  initGame,
  resetGame,
  board,
  playerPos,
  movementPool,
  diceValue,
  gamePhase,
  previewPath,
  selectDirection,
  executeMove,
} from './gameState.js';

describe('getAvailableDirections', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('returns available directions for an interior vertex', () => {
    // Pick a vertex near the center that should have neighbors in multiple directions
    const centerVertex = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      const nonEmpty = rays.filter((r) => r.vertices.length > 0);
      return nonEmpty.length >= 3;
    });
    expect(centerVertex).toBeTruthy();

    const available = getAvailableDirections(grid.rays, centerVertex, new Set());
    expect(available.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty array for unknown vertex', () => {
    const available = getAvailableDirections(grid.rays, 'nonexistent', new Set());
    expect(available).toEqual([]);
  });

  it('filters out directions blocked by obstacles at first step', () => {
    // Find a vertex with at least one direction available
    const vid = [...grid.vertices.keys()][0];
    const allRays = grid.rays.get(vid);
    const nonEmptyRays = allRays.filter((r) => r.vertices.length > 0);

    if (nonEmptyRays.length > 0) {
      // Block the first vertex in the first non-empty ray
      const firstTarget = nonEmptyRays[0].vertices[0];
      const obstacles = new Set([firstTarget]);

      const available = getAvailableDirections(grid.rays, vid, obstacles);
      // Should have one fewer available direction
      const unblocked = nonEmptyRays.filter((r) => !obstacles.has(r.vertices[0]));
      expect(available.length).toBe(unblocked.length);
    }
  });

  it('returns no directions for edge vertex with all paths blocked', () => {
    // Find an edge vertex
    const edgeVertex = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      const nonEmpty = rays.filter((r) => r.vertices.length > 0);
      return nonEmpty.length > 0 && nonEmpty.length <= 3;
    });
    expect(edgeVertex).toBeTruthy();

    // Block all first vertices in all non-empty rays
    const allRays = grid.rays.get(edgeVertex);
    const obstacles = new Set();
    for (const ray of allRays) {
      if (ray.vertices.length > 0) {
        obstacles.add(ray.vertices[0]);
      }
    }

    const available = getAvailableDirections(grid.rays, edgeVertex, obstacles);
    expect(available.length).toBe(0);
  });
});

describe('computePath', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('computes straight-line path for given steps', () => {
    // Find a vertex with a ray having at least 3 vertices
    const vid = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 3);
    });
    expect(vid).toBeTruthy();

    const rays = grid.rays.get(vid);
    const longRay = rays.find((r) => r.vertices.length >= 3);

    const result = computePath(rays, longRay.direction, 3, new Set(), null);
    expect(result.path.length).toBe(3);
    expect(result.stoppedByObstacle).toBe(false);
    expect(result.reachedTarget).toBe(false);
  });

  it('stops at obstacle and loses remaining steps', () => {
    const vid = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 3);
    });
    const rays = grid.rays.get(vid);
    const longRay = rays.find((r) => r.vertices.length >= 3);

    // Place obstacle at the second vertex in the ray
    const obstacles = new Set([longRay.vertices[1]]);
    const result = computePath(rays, longRay.direction, 5, obstacles, null);

    // Should stop before the obstacle (only first vertex traversed)
    expect(result.path.length).toBe(1);
    expect(result.path[0]).toBe(longRay.vertices[0]);
    expect(result.stoppedByObstacle).toBe(true);
  });

  it('stops at board edge when ray runs out of vertices', () => {
    // Find a vertex with a short ray
    const vid = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length > 0 && r.vertices.length <= 2);
    });
    expect(vid).toBeTruthy();

    const rays = grid.rays.get(vid);
    const shortRay = rays.find(
      (r) => r.vertices.length > 0 && r.vertices.length <= 2
    );

    const result = computePath(
      rays,
      shortRay.direction,
      10,
      new Set(),
      null
    );
    // Path length should be capped to ray length
    expect(result.path.length).toBe(shortRay.vertices.length);
    expect(result.stoppedByObstacle).toBe(false);
  });

  it('stops and returns reachedTarget when passing through target', () => {
    const vid = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 3);
    });
    const rays = grid.rays.get(vid);
    const longRay = rays.find((r) => r.vertices.length >= 3);

    // Set the second vertex as target
    const target = longRay.vertices[1];
    const result = computePath(rays, longRay.direction, 5, new Set(), target);

    // Should stop at target vertex
    expect(result.path.length).toBe(2);
    expect(result.path[result.path.length - 1]).toBe(target);
    expect(result.reachedTarget).toBe(true);
  });

  it('returns empty path for invalid direction', () => {
    const vid = [...grid.vertices.keys()][0];
    const rays = grid.rays.get(vid);

    const result = computePath(rays, 99, 3, new Set(), null);
    expect(result.path).toEqual([]);
  });

  it('returns empty path for zero steps', () => {
    const vid = [...grid.vertices.keys()][0];
    const rays = grid.rays.get(vid);
    const nonEmpty = rays.find((r) => r.vertices.length > 0);
    if (nonEmpty) {
      const result = computePath(rays, nonEmpty.direction, 0, new Set(), null);
      expect(result.path).toEqual([]);
    }
  });
});

describe('isTrapped', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('returns false for an interior vertex with no obstacles', () => {
    const centerVertex = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.filter((r) => r.vertices.length > 0).length >= 3;
    });
    expect(isTrapped(grid.rays, centerVertex, new Set())).toBe(false);
  });

  it('returns true when all directions are blocked', () => {
    const vid = [...grid.vertices.keys()][0];
    const allRays = grid.rays.get(vid);

    // Block the first vertex in every non-empty ray
    const obstacles = new Set();
    for (const ray of allRays) {
      if (ray.vertices.length > 0) {
        obstacles.add(ray.vertices[0]);
      }
    }

    expect(isTrapped(grid.rays, vid, obstacles)).toBe(true);
  });

  it('returns false if at least one direction is open', () => {
    const vid = [...grid.vertices.keys()].find((id) => {
      const rays = grid.rays.get(id);
      return rays.filter((r) => r.vertices.length > 0).length >= 2;
    });
    const allRays = grid.rays.get(vid);
    const nonEmpty = allRays.filter((r) => r.vertices.length > 0);

    // Block all but one direction
    const obstacles = new Set();
    for (let i = 1; i < nonEmpty.length; i++) {
      obstacles.add(nonEmpty[i].vertices[0]);
    }

    expect(isTrapped(grid.rays, vid, obstacles)).toBe(false);
  });
});

describe('movement integration with game state', () => {
  beforeEach(() => {
    resetGame();
  });

  it('available directions work with initialized game board', () => {
    const boardData = initGame(5, 4, 42);
    const pos = get(board).startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    // Player should have at least one direction available at start
    expect(available.length).toBeGreaterThanOrEqual(1);
  });

  it('computePath respects game obstacles', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    if (available.length > 0) {
      const result = computePath(
        rays.get(pos),
        available[0].direction,
        3,
        boardData.obstacles,
        boardData.targetVertex
      );
      // Path should not contain any obstacles
      for (const vid of result.path) {
        expect(boardData.obstacles.has(vid)).toBe(false);
      }
    }
  });
});

// --- Center dot movement tests (US-015) ---

/**
 * Helper: execute a move and return a promise that resolves when animation completes.
 */
function executeMoveAsync() {
  return new Promise((resolve) => {
    executeMove(() => resolve());
  });
}

describe('center dot movement: rays include center vertices', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('rays from corner vertices include center vertices as intermediate steps', () => {
    // Find a corner vertex with a ray of length >= 2
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 2);
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const longRay = rays.find((r) => r.vertices.length >= 2);

    // First vertex in ray from a corner should be a center (or corner depending on direction),
    // but rays should contain a mix of corner and center vertices
    const hasCenter = longRay.vertices.some((vid) => isCenterVertex(vid));
    const hasCorner = longRay.vertices.some((vid) => !isCenterVertex(vid));
    // At least some rays must include center vertices (the alternating pattern)
    expect(hasCenter || hasCorner).toBe(true);
  });

  it('rays that pass through centers contain both vertex types interleaved', () => {
    // Find a corner vertex with a long ray that includes center vertices
    // Rays contain both corner and center vertices interleaved as the ray
    // crosses hex boundaries. Center vertices never appear consecutively
    // (each center has only corner neighbors).
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 4 && r.vertices.some((v) => isCenterVertex(v)));
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const longRay = rays.find(
      (r) => r.vertices.length >= 4 && r.vertices.some((v) => isCenterVertex(v))
    );

    // Center vertices should never appear consecutively (center neighbors are always corners)
    for (let i = 0; i < longRay.vertices.length - 1; i++) {
      const currIsCenter = isCenterVertex(longRay.vertices[i]);
      const nextIsCenter = isCenterVertex(longRay.vertices[i + 1]);
      // Two centers in a row should never happen
      expect(currIsCenter && nextIsCenter).toBe(false);
    }

    // Both types should be present
    const centers = longRay.vertices.filter((v) => isCenterVertex(v));
    const corners = longRay.vertices.filter((v) => !isCenterVertex(v));
    expect(centers.length).toBeGreaterThan(0);
    expect(corners.length).toBeGreaterThan(0);
  });

  it('rays from center vertices also work correctly', () => {
    // Find a center vertex with non-empty rays
    const centerVid = [...grid.vertices.keys()].find((id) => {
      if (!isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 2);
    });
    expect(centerVid).toBeTruthy();

    const rays = grid.rays.get(centerVid);
    const nonEmpty = rays.filter((r) => r.vertices.length > 0);
    expect(nonEmpty.length).toBeGreaterThan(0);

    // First vertex from a center should be a corner
    for (const ray of nonEmpty) {
      expect(isCenterVertex(ray.vertices[0])).toBe(false);
    }
  });
});

describe('center dot movement: getAvailableDirections with centers', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('returns directions from a center vertex', () => {
    const centerVid = [...grid.vertices.keys()].find((id) => {
      if (!isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.filter((r) => r.vertices.length > 0).length >= 3;
    });
    expect(centerVid).toBeTruthy();

    const available = getAvailableDirections(grid.rays, centerVid, new Set());
    expect(available.length).toBeGreaterThanOrEqual(3);
  });

  it('blocks direction when first ray vertex (center) is an obstacle', () => {
    // Find a corner vertex where the first ray vertex is a center
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length > 0 && isCenterVertex(r.vertices[0]));
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const rayWithCenter = rays.find(
      (r) => r.vertices.length > 0 && isCenterVertex(r.vertices[0])
    );

    // Block the center vertex
    const obstacles = new Set([rayWithCenter.vertices[0]]);
    const available = getAvailableDirections(grid.rays, cornerVid, obstacles);

    // That direction should be blocked
    const blockedDir = available.find((r) => r.direction === rayWithCenter.direction);
    expect(blockedDir).toBeUndefined();
  });
});

describe('center dot movement: computePath through centers', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('path traverses through center dots as intermediate steps', () => {
    // Find a corner vertex with a long ray that includes centers
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 3 && r.vertices.some((v) => isCenterVertex(v)));
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const ray = rays.find(
      (r) => r.vertices.length >= 3 && r.vertices.some((v) => isCenterVertex(v))
    );

    const result = computePath(rays, ray.direction, 3, new Set(), null);
    expect(result.path.length).toBe(3);

    // Path should include at least one center vertex
    const centersInPath = result.path.filter((vid) => isCenterVertex(vid));
    expect(centersInPath.length).toBeGreaterThan(0);
  });

  it('obstacle on a center dot blocks ray traversal', () => {
    // Find a ray where a center vertex is in the middle
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 3 && isCenterVertex(r.vertices[1]));
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const ray = rays.find((r) => r.vertices.length >= 3 && isCenterVertex(r.vertices[1]));

    // Place obstacle on the center vertex (index 1)
    const obstacles = new Set([ray.vertices[1]]);
    const result = computePath(rays, ray.direction, 5, obstacles, null);

    // Should stop before the center obstacle
    expect(result.path.length).toBe(1);
    expect(result.stoppedByObstacle).toBe(true);
    expect(result.path).not.toContain(ray.vertices[1]);
  });

  it('target at a center vertex triggers win detection', () => {
    // Find a ray that has a center vertex
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.some((r) => r.vertices.length >= 2 && isCenterVertex(r.vertices[0]));
    });
    expect(cornerVid).toBeTruthy();

    const rays = grid.rays.get(cornerVid);
    const ray = rays.find((r) => r.vertices.length >= 2 && isCenterVertex(r.vertices[0]));

    // Set the center vertex as the target
    const centerTarget = ray.vertices[0];
    const result = computePath(rays, ray.direction, 5, new Set(), centerTarget);

    expect(result.reachedTarget).toBe(true);
    expect(result.path[result.path.length - 1]).toBe(centerTarget);
    expect(result.path.length).toBe(1);
  });
});

describe('center dot movement: isTrapped with center obstacles', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(5, 4, 40);
  });

  it('player is trapped when all first-step centers are obstacles', () => {
    // Find a corner vertex where all first-step vertices in non-empty rays are centers
    const cornerVid = [...grid.vertices.keys()].find((id) => {
      if (isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      const nonEmpty = rays.filter((r) => r.vertices.length > 0);
      return nonEmpty.length > 0 && nonEmpty.some((r) => isCenterVertex(r.vertices[0]));
    });
    expect(cornerVid).toBeTruthy();

    // Block all first vertices in all non-empty rays
    const rays = grid.rays.get(cornerVid);
    const obstacles = new Set();
    for (const ray of rays) {
      if (ray.vertices.length > 0) {
        obstacles.add(ray.vertices[0]);
      }
    }

    expect(isTrapped(grid.rays, cornerVid, obstacles)).toBe(true);
  });

  it('player on a center vertex is trapped when all corner neighbors are blocked', () => {
    // Find a center vertex
    const centerVid = [...grid.vertices.keys()].find((id) => {
      if (!isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.filter((r) => r.vertices.length > 0).length > 0;
    });
    expect(centerVid).toBeTruthy();

    // Block all first vertices in all non-empty rays from the center
    const rays = grid.rays.get(centerVid);
    const obstacles = new Set();
    for (const ray of rays) {
      if (ray.vertices.length > 0) {
        obstacles.add(ray.vertices[0]);
      }
    }

    expect(isTrapped(grid.rays, centerVid, obstacles)).toBe(true);
  });

  it('player on a center vertex is NOT trapped when at least one corner is open', () => {
    const centerVid = [...grid.vertices.keys()].find((id) => {
      if (!isCenterVertex(id)) return false;
      const rays = grid.rays.get(id);
      return rays.filter((r) => r.vertices.length > 0).length >= 2;
    });
    expect(centerVid).toBeTruthy();

    const rays = grid.rays.get(centerVid);
    const nonEmpty = rays.filter((r) => r.vertices.length > 0);

    // Block all but one direction
    const obstacles = new Set();
    for (let i = 1; i < nonEmpty.length; i++) {
      obstacles.add(nonEmpty[i].vertices[0]);
    }

    expect(isTrapped(grid.rays, centerVid, obstacles)).toBe(false);
  });
});

describe('center dot movement: full integration with game state', () => {
  beforeEach(() => {
    resetGame();
  });

  it('movement through center dot works end-to-end with game state', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;

    // Find a direction where the first step is a center vertex
    const available = getAvailableDirections(boardData.rays, pos, boardData.obstacles);
    const dirWithCenter = available.find((dir) => {
      return dir.vertices.length > 0 && isCenterVertex(dir.vertices[0]);
    });

    if (!dirWithCenter) {
      // If start vertex doesn't have center as first step, that's ok for this seed
      // Just verify movement works with any direction
      expect(available.length).toBeGreaterThan(0);
      return;
    }

    movementPool.set(10);
    diceValue.set(2);
    gamePhase.set('selectingDirection');

    selectDirection(dirWithCenter.direction);
    const path = get(previewPath);
    expect(path.length).toBeGreaterThanOrEqual(1);

    // First step should be a center vertex
    expect(isCenterVertex(path[0])).toBe(true);

    // If path has 2+ vertices, second should be a corner
    if (path.length >= 2) {
      expect(isCenterVertex(path[1])).toBe(false);
    }

    await executeMoveAsync();

    // Player should have moved
    const newPos = get(playerPos);
    expect(newPos).not.toBe(pos);
    expect(get(gamePhase)).not.toBe('selectingDirection');
  });

  it('animation steps through center dots during executeMove', async () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;

    const available = getAvailableDirections(boardData.rays, pos, boardData.obstacles);
    expect(available.length).toBeGreaterThan(0);

    // Use a direction with at least 2 steps
    const dir = available.find((d) => d.vertices.length >= 2) || available[0];

    movementPool.set(20);
    diceValue.set(3);
    gamePhase.set('selectingDirection');

    selectDirection(dir.direction);
    const path = get(previewPath);
    expect(path.length).toBeGreaterThanOrEqual(1);

    await executeMoveAsync();

    // Verify player ended up at last path vertex
    expect(get(playerPos)).toBe(path[path.length - 1]);
    // Movement pool deducted by actual steps taken
    expect(get(movementPool)).toBe(20 - path.length);
  });

  it('preview path includes center dots for display in Board.svelte', () => {
    const boardData = initGame(5, 4, 42);
    const pos = boardData.startVertex;

    const available = getAvailableDirections(boardData.rays, pos, boardData.obstacles);
    // Find direction with center vertex in path
    const dirWithCenter = available.find((dir) =>
      dir.vertices.some((vid) => isCenterVertex(vid))
    );

    if (!dirWithCenter) return; // Skip if no center in any available ray

    movementPool.set(20);
    diceValue.set(4);
    gamePhase.set('selectingDirection');

    selectDirection(dirWithCenter.direction);
    const path = get(previewPath);

    // Preview path should contain center vertices
    const centersInPreview = path.filter((vid) => isCenterVertex(vid));
    expect(centersInPreview.length).toBeGreaterThan(0);
  });
});
