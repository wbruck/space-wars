import { describe, it, expect } from 'vitest';
import { generateGrid, hexCount } from './hexGrid.js';

describe('hexCount', () => {
  it('returns correct hex count for each radius', () => {
    expect(hexCount(2)).toBe(19);
    expect(hexCount(3)).toBe(37);
    expect(hexCount(4)).toBe(61);
  });
});

describe('generateGrid', () => {
  describe('radius 2 grid', () => {
    const grid = generateGrid(2);

    it('generates the correct number of hex centers', () => {
      expect(grid.hexCenters.length).toBe(19);
    });

    it('generates deduplicated vertices (shared corners stored once)', () => {
      const vertexCount = grid.vertices.size;
      // Must be > hex count and < 6 * hex count (sharing reduces count)
      expect(vertexCount).toBeGreaterThan(19);
      expect(vertexCount).toBeLessThan(19 * 6);
    });

    it('each vertex has an id and pixel coordinates', () => {
      for (const [key, vertex] of grid.vertices) {
        expect(vertex).toHaveProperty('id');
        expect(vertex).toHaveProperty('x');
        expect(vertex).toHaveProperty('y');
        expect(typeof vertex.x).toBe('number');
        expect(typeof vertex.y).toBe('number');
        expect(vertex.id).toBe(key);
      }
    });

    it('vertex IDs are unique', () => {
      const ids = [...grid.vertices.values()].map((v) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('adjacency map', () => {
    const grid = generateGrid(2);

    it('has an entry for every vertex', () => {
      expect(grid.adjacency.size).toBe(grid.vertices.size);
    });

    it('interior vertices have exactly 3 neighbors (hex vertex graph)', () => {
      let hasThreeNeighbors = false;
      for (const [, neighbors] of grid.adjacency) {
        if (neighbors.length === 3) {
          hasThreeNeighbors = true;
          break;
        }
      }
      expect(hasThreeNeighbors).toBe(true);
    });

    it('no vertex has more than 3 neighbors', () => {
      for (const [, neighbors] of grid.adjacency) {
        expect(neighbors.length).toBeLessThanOrEqual(3);
      }
    });

    it('edge vertices have fewer than 3 neighbors', () => {
      let hasEdgeVertex = false;
      for (const [, neighbors] of grid.adjacency) {
        if (neighbors.length < 3) {
          hasEdgeVertex = true;
          break;
        }
      }
      expect(hasEdgeVertex).toBe(true);
    });

    it('adjacency is symmetric (if A neighbors B, B neighbors A)', () => {
      for (const [vertexId, neighbors] of grid.adjacency) {
        for (const neighborId of neighbors) {
          const reverseNeighbors = grid.adjacency.get(neighborId);
          expect(reverseNeighbors).toBeDefined();
          expect(reverseNeighbors).toContain(vertexId);
        }
      }
    });

    it('all neighbor references are valid vertex IDs', () => {
      for (const [, neighbors] of grid.adjacency) {
        for (const neighborId of neighbors) {
          expect(grid.vertices.has(neighborId)).toBe(true);
        }
      }
    });
  });

  describe('directional rays', () => {
    const grid = generateGrid(2);

    it('has rays for every vertex', () => {
      expect(grid.rays.size).toBe(grid.vertices.size);
    });

    it('each vertex has exactly 6 directional rays', () => {
      for (const [, vertexRays] of grid.rays) {
        expect(vertexRays.length).toBe(6);
      }
    });

    it('ray directions are 0 through 5', () => {
      for (const [, vertexRays] of grid.rays) {
        const directions = vertexRays.map((r) => r.direction).sort();
        expect(directions).toEqual([0, 1, 2, 3, 4, 5]);
      }
    });

    it('ray vertices are all valid vertex IDs', () => {
      for (const [, vertexRays] of grid.rays) {
        for (const ray of vertexRays) {
          for (const vid of ray.vertices) {
            expect(grid.vertices.has(vid)).toBe(true);
          }
        }
      }
    });

    it('interior vertices have non-empty rays in all 6 directions', () => {
      // At least some vertices should have rays in all 6 directions
      let hasAllSixRays = false;
      for (const [, vertexRays] of grid.rays) {
        const nonEmpty = vertexRays.filter((r) => r.vertices.length > 0);
        if (nonEmpty.length === 6) {
          hasAllSixRays = true;
          break;
        }
      }
      expect(hasAllSixRays).toBe(true);
    });

    it('rays extend multiple vertices for interior vertices', () => {
      // Some rays should have more than 1 vertex (straight line extends)
      let hasLongRay = false;
      for (const [, vertexRays] of grid.rays) {
        for (const ray of vertexRays) {
          if (ray.vertices.length >= 2) {
            hasLongRay = true;
            break;
          }
        }
        if (hasLongRay) break;
      }
      expect(hasLongRay).toBe(true);
    });

    it('opposite direction rays are consistent', () => {
      // Direction i and direction (i+3)%6 are opposite.
      // If vertex A has B in its ray direction i, then B should have A
      // in its ray direction (i+3)%6.
      for (const [vertexId, vertexRays] of grid.rays) {
        for (const ray of vertexRays) {
          if (ray.vertices.length === 0) continue;
          const firstInRay = ray.vertices[0];
          const oppositeDir = (ray.direction + 3) % 6;
          const oppositeRays = grid.rays.get(firstInRay);
          const oppositeRay = oppositeRays.find(
            (r) => r.direction === oppositeDir
          );
          expect(oppositeRay.vertices).toContain(vertexId);
        }
      }
    });

    it('each adjacent vertex appears as first vertex in exactly one ray', () => {
      // Every direct neighbor should be the first vertex in one of the 6 rays
      for (const [vertexId, vertexRays] of grid.rays) {
        const neighbors = grid.adjacency.get(vertexId);
        for (const neighborId of neighbors) {
          const containingRays = vertexRays.filter(
            (r) => r.vertices.length > 0 && r.vertices[0] === neighborId
          );
          expect(containingRays.length).toBe(1);
        }
      }
    });
  });

  describe('multiple radii', () => {
    it('radius 3 generates 37 hex centers', () => {
      const grid = generateGrid(3);
      expect(grid.hexCenters.length).toBe(37);
    });

    it('radius 4 generates 61 hex centers', () => {
      const grid = generateGrid(4);
      expect(grid.hexCenters.length).toBe(61);
    });

    it('larger radius produces more vertices', () => {
      const small = generateGrid(2);
      const medium = generateGrid(3);
      const large = generateGrid(4);
      expect(medium.vertices.size).toBeGreaterThan(small.vertices.size);
      expect(large.vertices.size).toBeGreaterThan(medium.vertices.size);
    });
  });

  describe('grid metadata', () => {
    it('returns size and radius', () => {
      const grid = generateGrid(2, 50);
      expect(grid.size).toBe(50);
      expect(grid.radius).toBe(2);
    });

    it('hex centers have pixel coordinates', () => {
      const grid = generateGrid(2);
      for (const center of grid.hexCenters) {
        expect(center).toHaveProperty('q');
        expect(center).toHaveProperty('r');
        expect(center).toHaveProperty('x');
        expect(center).toHaveProperty('y');
        expect(typeof center.x).toBe('number');
        expect(typeof center.y).toBe('number');
      }
    });
  });
});
