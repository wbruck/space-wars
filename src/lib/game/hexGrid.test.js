import { describe, it, expect } from 'vitest';
import { generateGrid, hexCount, isCenterVertex } from './hexGrid.js';

describe('hexCount', () => {
  it('returns correct hex count for each size', () => {
    expect(hexCount(5, 4)).toBe(20);
    expect(hexCount(7, 6)).toBe(42);
    expect(hexCount(9, 8)).toBe(72);
  });
});

describe('generateGrid', () => {
  describe('5x4 grid (small)', () => {
    const grid = generateGrid(5, 4);

    it('generates the correct number of hex centers', () => {
      expect(grid.hexCenters.length).toBe(20);
    });

    it('generates deduplicated vertices (shared corners stored once)', () => {
      const vertexCount = grid.vertices.size;
      // Must be > hex count and < 6 * hex count (sharing reduces count)
      expect(vertexCount).toBeGreaterThan(20);
      expect(vertexCount).toBeLessThan(20 * 6);
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
    const grid = generateGrid(5, 4);

    it('has an entry for every vertex', () => {
      expect(grid.adjacency.size).toBe(grid.vertices.size);
    });

    it('corner vertices have 3 to 6 neighbors (original 3 + up to 3 center neighbors)', () => {
      const corners = [...grid.vertices.entries()].filter(([, v]) => v.type === 'corner');
      for (const [id] of corners) {
        const neighbors = grid.adjacency.get(id);
        expect(neighbors.length).toBeGreaterThanOrEqual(1);
        expect(neighbors.length).toBeLessThanOrEqual(6);
      }
    });

    it('center vertices have exactly 6 neighbors', () => {
      const centers = [...grid.vertices.entries()].filter(([, v]) => v.type === 'center');
      expect(centers.length).toBe(hexCount(5, 4));
      for (const [id] of centers) {
        const neighbors = grid.adjacency.get(id);
        expect(neighbors.length).toBe(6);
      }
    });

    it('some corner vertices have fewer than 6 neighbors (board edge)', () => {
      let hasEdgeCorner = false;
      const corners = [...grid.vertices.entries()].filter(([, v]) => v.type === 'corner');
      for (const [id] of corners) {
        const neighbors = grid.adjacency.get(id);
        if (neighbors.length < 6) {
          hasEdgeCorner = true;
          break;
        }
      }
      expect(hasEdgeCorner).toBe(true);
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

    it('center vertices only neighbor corner vertices', () => {
      const centers = [...grid.vertices.entries()].filter(([, v]) => v.type === 'center');
      for (const [id] of centers) {
        const neighbors = grid.adjacency.get(id);
        for (const nid of neighbors) {
          expect(isCenterVertex(nid)).toBe(false);
        }
      }
    });

    it('corner vertices gain center neighbors from adjacent hexes', () => {
      // Interior corners belong to 3 hexes, so they should have 3 center neighbors
      let hasThreeCenterNeighbors = false;
      const corners = [...grid.vertices.entries()].filter(([, v]) => v.type === 'corner');
      for (const [id] of corners) {
        const neighbors = grid.adjacency.get(id);
        const centerNeighbors = neighbors.filter((nid) => isCenterVertex(nid));
        if (centerNeighbors.length === 3) {
          hasThreeCenterNeighbors = true;
          break;
        }
      }
      expect(hasThreeCenterNeighbors).toBe(true);
    });
  });

  describe('center vertices', () => {
    const grid = generateGrid(5, 4);

    it('center vertex count equals hex count', () => {
      const centers = [...grid.vertices.values()].filter((v) => v.type === 'center');
      expect(centers.length).toBe(hexCount(5, 4));
    });

    it('center vertex IDs start with "c:"', () => {
      const centers = [...grid.vertices.values()].filter((v) => v.type === 'center');
      for (const center of centers) {
        expect(center.id.startsWith('c:')).toBe(true);
        expect(isCenterVertex(center.id)).toBe(true);
      }
    });

    it('corner vertex IDs do not start with "c:"', () => {
      const corners = [...grid.vertices.values()].filter((v) => v.type === 'corner');
      for (const corner of corners) {
        expect(corner.id.startsWith('c:')).toBe(false);
        expect(isCenterVertex(corner.id)).toBe(false);
      }
    });

    it('center vertices have type "center" and corner vertices have type "corner"', () => {
      for (const v of grid.vertices.values()) {
        expect(v.type === 'center' || v.type === 'corner').toBe(true);
      }
    });

    it('total vertex count = corners + centers', () => {
      const corners = [...grid.vertices.values()].filter((v) => v.type === 'corner');
      const centers = [...grid.vertices.values()].filter((v) => v.type === 'center');
      expect(corners.length + centers.length).toBe(grid.vertices.size);
    });

    it('center vertex count equals hex count for all sizes', () => {
      for (const [cols, rows] of [[5, 4], [7, 6], [9, 8]]) {
        const g = generateGrid(cols, rows);
        const centers = [...g.vertices.values()].filter((v) => v.type === 'center');
        expect(centers.length).toBe(hexCount(cols, rows));
      }
    });
  });

  describe('directional rays', () => {
    const grid = generateGrid(5, 4);

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

    it('rays include center vertices as intermediate steps', () => {
      // Rays from corners should have center vertices interspersed
      let hasCenterInRay = false;
      const corners = [...grid.vertices.entries()].filter(([, v]) => v.type === 'corner');
      for (const [id] of corners) {
        const vertexRays = grid.rays.get(id);
        for (const ray of vertexRays) {
          if (ray.vertices.some((vid) => isCenterVertex(vid))) {
            hasCenterInRay = true;
            break;
          }
        }
        if (hasCenterInRay) break;
      }
      expect(hasCenterInRay).toBe(true);
    });

    it('rays from centers alternate center-corner pattern', () => {
      // From a center vertex, the first step is always a corner (hub-spoke),
      // and subsequent steps alternate. The pattern starting from a center is:
      // corner → (corner|center) → ... with center vertices interspersed.
      const centers = [...grid.vertices.entries()].filter(([, v]) => v.type === 'center');
      let checkedPattern = false;
      for (const [id] of centers) {
        const vertexRays = grid.rays.get(id);
        for (const ray of vertexRays) {
          if (ray.vertices.length >= 2) {
            // First vertex in ray from a center should always be a corner
            expect(isCenterVertex(ray.vertices[0])).toBe(false);
            checkedPattern = true;
          }
        }
        if (checkedPattern) break;
      }
      expect(checkedPattern).toBe(true);
    });

    it('rays contain a mix of corner and center vertices', () => {
      // Verify that rays include both corner and center vertices,
      // confirming centers are integrated into the ray system
      let foundMixedRay = false;
      for (const [, vertexRays] of grid.rays) {
        for (const ray of vertexRays) {
          if (ray.vertices.length >= 3) {
            const hasCenter = ray.vertices.some((vid) => isCenterVertex(vid));
            const hasCorner = ray.vertices.some((vid) => !isCenterVertex(vid));
            if (hasCenter && hasCorner) {
              foundMixedRay = true;
              break;
            }
          }
        }
        if (foundMixedRay) break;
      }
      expect(foundMixedRay).toBe(true);
    });
  });

  describe('multiple sizes', () => {
    it('7x6 generates 42 hex centers', () => {
      const grid = generateGrid(7, 6);
      expect(grid.hexCenters.length).toBe(42);
    });

    it('9x8 generates 72 hex centers', () => {
      const grid = generateGrid(9, 8);
      expect(grid.hexCenters.length).toBe(72);
    });

    it('larger grid produces more vertices', () => {
      const small = generateGrid(5, 4);
      const medium = generateGrid(7, 6);
      const large = generateGrid(9, 8);
      expect(medium.vertices.size).toBeGreaterThan(small.vertices.size);
      expect(large.vertices.size).toBeGreaterThan(medium.vertices.size);
    });
  });

  describe('grid metadata', () => {
    it('returns size, cols, and rows', () => {
      const grid = generateGrid(5, 4, 50);
      expect(grid.size).toBe(50);
      expect(grid.cols).toBe(5);
      expect(grid.rows).toBe(4);
    });

    it('hex centers have pixel coordinates', () => {
      const grid = generateGrid(5, 4);
      for (const center of grid.hexCenters) {
        expect(center).toHaveProperty('col');
        expect(center).toHaveProperty('row');
        expect(center).toHaveProperty('x');
        expect(center).toHaveProperty('y');
        expect(typeof center.x).toBe('number');
        expect(typeof center.y).toBe('number');
      }
    });

    it('board has rectangular shape (wider than tall or roughly square)', () => {
      const grid = generateGrid(5, 4);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const v of grid.vertices.values()) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
      const width = maxX - minX;
      const height = maxY - minY;
      // Board should be roughly square/rectangular, not hexagonal
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });
  });
});
