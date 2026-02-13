import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { generateGrid } from './hexGrid.js';
import { getAvailableDirections, computePath, isTrapped } from './movement.js';
import { initGame, resetGame, board } from './gameState.js';

describe('getAvailableDirections', () => {
  let grid;

  beforeEach(() => {
    grid = generateGrid(2, 40);
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
    grid = generateGrid(2, 40);
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
    grid = generateGrid(2, 40);
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
    const boardData = initGame(2, 42);
    const pos = get(board).startVertex;
    const rays = boardData.rays;

    const available = getAvailableDirections(rays, pos, boardData.obstacles);
    // Player should have at least one direction available at start
    expect(available.length).toBeGreaterThanOrEqual(1);
  });

  it('computePath respects game obstacles', () => {
    const boardData = initGame(2, 42);
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
