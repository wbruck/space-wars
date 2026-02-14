import { describe, it, expect } from 'vitest';
import { BoardObject, Obstacle, BlackHole, PowerUp, createBoardObject, generateBoardObjects } from './boardObjects.js';
import { generateGrid } from './hexGrid.js';

describe('BoardObject', () => {
  it('constructs with correct properties', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.id).toBe('test:40,69.282');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.type).toBe('test');
    expect(obj.value).toBe(5);
  });

  it('constructs with center vertex ID', () => {
    const obj = new BoardObject('c:0,0', 'test', 3);
    expect(obj.id).toBe('test:c:0,0');
    expect(obj.vertexId).toBe('c:0,0');
  });

  it('onPlayerInteraction returns undefined by default', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.onPlayerInteraction({})).toBeUndefined();
  });

  it('getAffectedVertices returns own vertex by default', () => {
    const obj = new BoardObject('40,69.282', 'test', 5);
    expect(obj.getAffectedVertices(new Map())).toEqual(['40,69.282']);
  });
});

describe('Obstacle', () => {
  it('extends BoardObject with type obstacle', () => {
    const obs = new Obstacle('40,69.282', 7);
    expect(obs).toBeInstanceOf(BoardObject);
    expect(obs.type).toBe('obstacle');
    expect(obs.id).toBe('obstacle:40,69.282');
  });

  it('stores value', () => {
    const obs = new Obstacle('40,69.282', 3);
    expect(obs.value).toBe(3);
  });

  it('onPlayerInteraction returns blocked', () => {
    const obs = new Obstacle('40,69.282', 5);
    expect(obs.onPlayerInteraction({})).toEqual({ blocked: true });
  });

  it('getAffectedVertices returns own vertex', () => {
    const obs = new Obstacle('c:2,3', 5);
    expect(obs.getAffectedVertices(new Map())).toEqual(['c:2,3']);
  });
});

describe('BlackHole', () => {
  it('extends Obstacle with type blackhole', () => {
    const bh = new BlackHole('40,69.282', 5);
    expect(bh).toBeInstanceOf(Obstacle);
    expect(bh).toBeInstanceOf(BoardObject);
    expect(bh.type).toBe('blackhole');
    expect(bh.id).toBe('blackhole:40,69.282');
  });

  it('stores value', () => {
    const bh = new BlackHole('40,69.282', 7);
    expect(bh.value).toBe(7);
  });

  it('stores vertexId', () => {
    const bh = new BlackHole('c:1,2', 3);
    expect(bh.vertexId).toBe('c:1,2');
  });

  it('onPlayerInteraction returns killed with cause blackhole', () => {
    const bh = new BlackHole('40,69.282', 5);
    expect(bh.onPlayerInteraction({})).toEqual({ killed: true, cause: 'blackhole' });
  });

  it('is an instance of both BlackHole and Obstacle', () => {
    const bh = new BlackHole('40,69.282', 5);
    expect(bh).toBeInstanceOf(BlackHole);
    expect(bh).toBeInstanceOf(Obstacle);
  });

  it('getAffectedVertices returns own vertex', () => {
    const bh = new BlackHole('c:0,0', 4);
    expect(bh.getAffectedVertices(new Map())).toEqual(['c:0,0']);
  });
});

describe('PowerUp', () => {
  it('extends BoardObject with type powerup', () => {
    const pu = new PowerUp('40,69.282', 4);
    expect(pu).toBeInstanceOf(BoardObject);
    expect(pu.type).toBe('powerup');
    expect(pu.id).toBe('powerup:40,69.282');
  });

  it('stores value', () => {
    const pu = new PowerUp('40,69.282', 8);
    expect(pu.value).toBe(8);
  });

  it('onPlayerInteraction returns collected with value', () => {
    const pu = new PowerUp('40,69.282', 6);
    expect(pu.onPlayerInteraction({})).toEqual({ collected: true, value: 6 });
  });

  it('getAffectedVertices returns own vertex', () => {
    const pu = new PowerUp('c:1,1', 2);
    expect(pu.getAffectedVertices(new Map())).toEqual(['c:1,1']);
  });
});

describe('createBoardObject', () => {
  it('creates Obstacle for type obstacle', () => {
    const obj = createBoardObject('obstacle', '40,69.282', 5);
    expect(obj).toBeInstanceOf(Obstacle);
    expect(obj.type).toBe('obstacle');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.value).toBe(5);
  });

  it('creates PowerUp for type powerup', () => {
    const obj = createBoardObject('powerup', 'c:0,0', 3);
    expect(obj).toBeInstanceOf(PowerUp);
    expect(obj.type).toBe('powerup');
    expect(obj.vertexId).toBe('c:0,0');
    expect(obj.value).toBe(3);
  });

  it('creates BlackHole for type blackhole', () => {
    const obj = createBoardObject('blackhole', '40,69.282', 5);
    expect(obj).toBeInstanceOf(BlackHole);
    expect(obj.type).toBe('blackhole');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.value).toBe(5);
  });

  it('throws for unknown type', () => {
    expect(() => createBoardObject('unknown', '40,69.282', 5))
      .toThrow('Unknown board object type: unknown');
  });
});

// --- generateBoardObjects tests ---

function makeRng(seed) {
  let s = seed | 0;
  if (s === 0) s = 1;
  return function () {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

describe('generateBoardObjects', () => {
  const grid = generateGrid(5, 4, 40);
  const ids = [...grid.vertices.keys()];
  // Pick start and target deterministically
  const startVertex = ids[0];
  const targetVertex = ids[ids.length - 1];
  const eligibleCount = ids.length - 2;

  it('returns obstacles, powerUps, and obstacleSet', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    expect(result).toHaveProperty('obstacles');
    expect(result).toHaveProperty('powerUps');
    expect(result).toHaveProperty('obstacleSet');
    expect(Array.isArray(result.obstacles)).toBe(true);
    expect(Array.isArray(result.powerUps)).toBe(true);
    expect(result.obstacleSet).toBeInstanceOf(Set);
  });

  it('excludes start and target vertices', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    const allVertexIds = [
      ...result.obstacles.map(o => o.vertexId),
      ...result.powerUps.map(p => p.vertexId),
    ];
    expect(allVertexIds).not.toContain(startVertex);
    expect(allVertexIds).not.toContain(targetVertex);
  });

  it('has no overlap between obstacles and power-ups', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    const obstacleIds = new Set(result.obstacles.map(o => o.vertexId));
    for (const pu of result.powerUps) {
      expect(obstacleIds.has(pu.vertexId)).toBe(false);
    }
  });

  it('obstacleSet matches obstacle vertex IDs', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    const expected = new Set(result.obstacles.map(o => o.vertexId));
    expect(result.obstacleSet).toEqual(expected);
  });

  it('obstacle count scales with difficulty at level 1 (~5%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    const expectedCount = Math.floor(eligibleCount * 0.05);
    expect(result.obstacles.length).toBe(expectedCount);
  });

  it('obstacle count scales with difficulty at level 5 (~12.2%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.obstacles.length).toBe(expectedCount);
  });

  it('obstacle count scales with difficulty at level 10 (~20%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42));
    const pct = 0.05 + (10 - 1) * (0.15 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.obstacles.length).toBe(expectedCount);
  });

  it('power-up count scales inversely at level 1 (~15%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    const pct = 0.15 - (1 - 1) * (0.12 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.powerUps.length).toBe(expectedCount);
  });

  it('power-up count scales inversely at level 10 (~3%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42));
    const pct = 0.15 - (10 - 1) * (0.12 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.powerUps.length).toBe(expectedCount);
  });

  it('obstacle values are within range at difficulty 1', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    for (const obs of result.obstacles) {
      expect(obs.value).toBeGreaterThanOrEqual(1);
      expect(obs.value).toBeLessThanOrEqual(3); // min(10, 1+2)
    }
  });

  it('obstacle values are within range at difficulty 10', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42));
    for (const obs of result.obstacles) {
      expect(obs.value).toBeGreaterThanOrEqual(8); // max(1, 10-2)
      expect(obs.value).toBeLessThanOrEqual(10);
    }
  });

  it('power-up values are within range at difficulty 1', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    for (const pu of result.powerUps) {
      expect(pu.value).toBeGreaterThanOrEqual(8); // max(1, 11-1-2) = 8
      expect(pu.value).toBeLessThanOrEqual(10);   // min(10, 11-1+2) = 10
    }
  });

  it('power-up values are within range at difficulty 10', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42));
    for (const pu of result.powerUps) {
      expect(pu.value).toBeGreaterThanOrEqual(1);  // max(1, 11-10-2) = 1
      expect(pu.value).toBeLessThanOrEqual(3);     // min(10, 11-10+2) = 3
    }
  });

  it('is deterministic with same seed', () => {
    const r1 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    const r2 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    expect(r1.obstacles.map(o => o.vertexId)).toEqual(r2.obstacles.map(o => o.vertexId));
    expect(r1.powerUps.map(p => p.vertexId)).toEqual(r2.powerUps.map(p => p.vertexId));
  });

  it('defaults difficulty to 5', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, undefined, makeRng(42));
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.obstacles.length).toBe(expectedCount);
  });
});
