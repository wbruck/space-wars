import { describe, it, expect } from 'vitest';
import { BoardObject, Obstacle, BlackHole, Enemy, PowerUp, createBoardObject, generateBoardObjects } from './boardObjects.js';
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

describe('Enemy', () => {
  it('extends Obstacle with type enemy', () => {
    const enemy = new Enemy('40,69.282', 5, 3);
    expect(enemy).toBeInstanceOf(Obstacle);
    expect(enemy).toBeInstanceOf(BoardObject);
    expect(enemy.type).toBe('enemy');
    expect(enemy.id).toBe('enemy:40,69.282');
  });

  it('stores value, direction, visionRange, and range', () => {
    const enemy = new Enemy('40,69.282', 7, 2, 4);
    expect(enemy.value).toBe(7);
    expect(enemy.direction).toBe(2);
    expect(enemy.visionRange).toBe(4);
    expect(enemy.range).toBe(4);
  });

  it('defaults visionRange to clamped value when not provided', () => {
    const enemy = new Enemy('40,69.282', 3, 2);
    expect(enemy.visionRange).toBe(3);
    expect(enemy.range).toBe(3);
    // Value > 6 clamps to 6
    const enemy2 = new Enemy('40,69.282', 9, 0);
    expect(enemy2.visionRange).toBe(6);
    expect(enemy2.range).toBe(6);
  });

  it('stores vertexId', () => {
    const enemy = new Enemy('c:1,2', 3, 0);
    expect(enemy.vertexId).toBe('c:1,2');
  });

  it('onPlayerInteraction returns killed with cause enemy', () => {
    const enemy = new Enemy('40,69.282', 5, 1);
    expect(enemy.onPlayerInteraction({})).toEqual({ killed: true, cause: 'enemy' });
  });

  it('is an instance of both Enemy and Obstacle', () => {
    const enemy = new Enemy('40,69.282', 5, 4);
    expect(enemy).toBeInstanceOf(Enemy);
    expect(enemy).toBeInstanceOf(Obstacle);
  });

  it('getAffectedVertices returns own vertex when no rays provided', () => {
    const enemy = new Enemy('40,69.282', 3, 1);
    expect(enemy.getAffectedVertices(new Map())).toEqual(['40,69.282']);
  });

  it('getAffectedVertices returns own vertex plus kill zone from rays', () => {
    const enemy = new Enemy('A', 3, 2);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D'] },
        { direction: 2, vertices: ['E', 'F', 'G', 'H'] },
        { direction: 4, vertices: ['I'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'E', 'F', 'G']);
  });

  it('getAffectedVertices respects range limit', () => {
    const enemy = new Enemy('A', 2, 0);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('getAffectedVertices handles ray shorter than range', () => {
    const enemy = new Enemy('A', 5, 1);
    const mockRays = new Map([
      ['A', [
        { direction: 1, vertices: ['B', 'C'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('getAffectedVertices handles no matching direction ray', () => {
    const enemy = new Enemy('A', 3, 5);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C'] },
        { direction: 2, vertices: ['D'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A']);
  });

  it('getAffectedVertices uses visionRange not value for ray length', () => {
    // value=8 but visionRange=2: should only take 2 vertices from the ray
    const enemy = new Enemy('A', 8, 0, 2);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E', 'F'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('visionRange=6 captures up to 6 ray vertices', () => {
    const enemy = new Enemy('A', 3, 0, 6);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E', 'F', 'G', 'H'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('getAffectedVertices returns only own vertex when combatShip has destroyed weapons (disarmed)', () => {
    const enemy = new Enemy('A', 3, 0, 4);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    // Without combatShip, should return full ray
    expect(enemy.getAffectedVertices(new Map(), mockRays)).toEqual(['A', 'B', 'C', 'D', 'E']);

    // Simulate a disarmed combatShip (weapons destroyed)
    enemy.combatShip = { canAttack: false };
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A']);
  });

  it('getAffectedVertices returns full ray when combatShip can still attack', () => {
    const enemy = new Enemy('A', 3, 0, 3);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D'] },
      ]],
    ]);
    enemy.combatShip = { canAttack: true };
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C', 'D']);
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

  it('creates Enemy for type enemy', () => {
    const obj = createBoardObject('enemy', '40,69.282', 5, 3);
    expect(obj).toBeInstanceOf(Enemy);
    expect(obj.type).toBe('enemy');
    expect(obj.vertexId).toBe('40,69.282');
    expect(obj.value).toBe(5);
    expect(obj.direction).toBe(3);
    expect(obj.visionRange).toBe(5); // defaults to clamped value
    expect(obj.range).toBe(5);
  });

  it('creates Enemy with explicit visionRange', () => {
    const obj = createBoardObject('enemy', '40,69.282', 8, 3, 2);
    expect(obj).toBeInstanceOf(Enemy);
    expect(obj.value).toBe(8);
    expect(obj.visionRange).toBe(2);
    expect(obj.range).toBe(2);
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

  it('returns all expected fields', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    expect(result).toHaveProperty('obstacles');
    expect(result).toHaveProperty('blackholes');
    expect(result).toHaveProperty('enemies');
    expect(result).toHaveProperty('powerUps');
    expect(result).toHaveProperty('obstacleSet');
    expect(result).toHaveProperty('blackholeSet');
    expect(result).toHaveProperty('enemyZones');
    expect(Array.isArray(result.obstacles)).toBe(true);
    expect(Array.isArray(result.blackholes)).toBe(true);
    expect(Array.isArray(result.enemies)).toBe(true);
    expect(Array.isArray(result.powerUps)).toBe(true);
    expect(result.obstacleSet).toBeInstanceOf(Set);
    expect(result.blackholeSet).toBeInstanceOf(Set);
    expect(result.enemyZones).toBeInstanceOf(Set);
  });

  it('excludes start and target vertices', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const allVertexIds = [
      ...result.obstacles.map(o => o.vertexId),
      ...result.blackholes.map(b => b.vertexId),
      ...result.enemies.map(e => e.vertexId),
      ...result.powerUps.map(p => p.vertexId),
    ];
    expect(allVertexIds).not.toContain(startVertex);
    expect(allVertexIds).not.toContain(targetVertex);
  });

  it('has no overlap between any object types', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const allIds = [
      ...result.obstacles.map(o => o.vertexId),
      ...result.blackholes.map(b => b.vertexId),
      ...result.enemies.map(e => e.vertexId),
      ...result.powerUps.map(p => p.vertexId),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('obstacleSet contains regular obstacle and enemy vertex IDs but not blackholes', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    // Regular obstacles are in obstacleSet
    for (const obs of result.obstacles) {
      expect(result.obstacleSet.has(obs.vertexId)).toBe(true);
    }
    // Enemies are in obstacleSet
    for (const enemy of result.enemies) {
      expect(result.obstacleSet.has(enemy.vertexId)).toBe(true);
    }
    // Blackholes are NOT in obstacleSet
    for (const bh of result.blackholes) {
      expect(result.obstacleSet.has(bh.vertexId)).toBe(false);
    }
  });

  it('blackholeSet matches blackhole vertex IDs', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const expected = new Set(result.blackholes.map(b => b.vertexId));
    expect(result.blackholeSet).toEqual(expected);
  });

  it('total obstacle count scales with difficulty at level 1 (~5%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    const expectedTotal = Math.floor(eligibleCount * 0.05);
    const actualTotal = result.obstacles.length + result.blackholes.length + result.enemies.length;
    expect(actualTotal).toBe(expectedTotal);
  });

  it('regular + blackhole count scales with difficulty at level 5 (~12.2%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const expectedTotal = Math.floor(eligibleCount * pct);
    const expectedRegular = Math.floor(expectedTotal * 0.6);
    const expectedBlackholes = Math.floor(expectedTotal * 0.2);
    expect(result.obstacles.length).toBe(expectedRegular);
    expect(result.blackholes.length).toBe(expectedBlackholes);
    // Enemy count varies due to visionRange budget system, but enemies should exist
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  it('regular + blackhole count scales with difficulty at level 10 (~20%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42), grid.rays);
    const pct = 0.05 + (10 - 1) * (0.15 / 9);
    const expectedTotal = Math.floor(eligibleCount * pct);
    const expectedRegular = Math.floor(expectedTotal * 0.6);
    const expectedBlackholes = Math.floor(expectedTotal * 0.2);
    expect(result.obstacles.length).toBe(expectedRegular);
    expect(result.blackholes.length).toBe(expectedBlackholes);
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  it('type distribution regular/blackhole is ~60/20 at difficulty 5+, enemies from budget', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const total = Math.floor(eligibleCount * pct);
    const expectedRegular = Math.floor(total * 0.6);
    const expectedBlackholes = Math.floor(total * 0.2);
    expect(result.obstacles.length).toBe(expectedRegular);
    expect(result.blackholes.length).toBe(expectedBlackholes);
    // Enemy count varies due to visionRange budget, but should be at least 1
    expect(result.enemies.length).toBeGreaterThanOrEqual(1);
    // Total visionRange budget should be consumed (enemySlots * 3)
    const enemySlots = total - expectedRegular - expectedBlackholes;
    const totalVisionRange = result.enemies.reduce((sum, e) => sum + e.visionRange, 0);
    expect(totalVisionRange).toBeLessThanOrEqual(enemySlots * 3);
  });

  it('no enemies at difficulty 1-2, ~80/20 regular/blackhole split', () => {
    for (const diff of [1, 2]) {
      const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, diff, makeRng(42));
      expect(result.enemies.length).toBe(0);
      const pct = 0.05 + (diff - 1) * (0.15 / 9);
      const total = Math.floor(eligibleCount * pct);
      const expectedRegular = Math.floor(total * 0.8);
      const expectedBlackholes = total - expectedRegular;
      expect(result.obstacles.length).toBe(expectedRegular);
      expect(result.blackholes.length).toBe(expectedBlackholes);
    }
  });

  it('enemies appear at difficulty 3+', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 3, makeRng(42), grid.rays);
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  it('enemy direction is 0-5', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    for (const enemy of result.enemies) {
      expect(enemy.direction).toBeGreaterThanOrEqual(0);
      expect(enemy.direction).toBeLessThanOrEqual(5);
    }
  });

  it('enemy visionRange is 1-6 and range equals visionRange', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    for (const enemy of result.enemies) {
      expect(enemy.visionRange).toBeGreaterThanOrEqual(1);
      expect(enemy.visionRange).toBeLessThanOrEqual(6);
      expect(enemy.range).toBe(enemy.visionRange);
    }
  });

  it('enemy kill zones computed from rays', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    // Recompute expected kill zones (passing obstacleSet to match what generateBoardObjects does)
    const expectedZones = new Set();
    for (const enemy of result.enemies) {
      const affected = enemy.getAffectedVertices(null, grid.rays, result.obstacleSet);
      // Skip own vertex (index 0)
      for (let i = 1; i < affected.length; i++) {
        expectedZones.add(affected[i]);
      }
    }
    expect(result.enemyZones).toEqual(expectedZones);
  });

  it('enemy visionRange is deterministic with same seed', () => {
    const r1 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const r2 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    expect(r1.enemies.map(e => e.visionRange)).toEqual(r2.enemies.map(e => e.visionRange));
  });

  it('enemy visionRange varies (not all the same) across multiple enemies', () => {
    // Use a large board with high difficulty to get many enemies
    const lgGrid = generateGrid(9, 8, 72);
    const lgIds = [...lgGrid.vertices.keys()];
    const result = generateBoardObjects(lgGrid.vertices, lgIds[0], lgIds[lgIds.length - 1], 8, makeRng(42), lgGrid.rays);
    if (result.enemies.length >= 3) {
      const ranges = new Set(result.enemies.map(e => e.visionRange));
      expect(ranges.size).toBeGreaterThan(1);
    }
  });

  it('enemy visionRange budget: total visionRange <= enemySlots * 3', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const total = Math.floor(eligibleCount * pct);
    const enemySlots = total - Math.floor(total * 0.6) - Math.floor(total * 0.2);
    const totalVisionRange = result.enemies.reduce((sum, e) => sum + e.visionRange, 0);
    expect(totalVisionRange).toBeLessThanOrEqual(enemySlots * 3);
  });

  it('power-up count scales inversely at level 1 (~15%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 1, makeRng(42));
    const pct = 0.15 - (1 - 1) * (0.12 / 9);
    const expectedCount = Math.floor(eligibleCount * pct);
    expect(result.powerUps.length).toBe(expectedCount);
  });

  it('power-up count scales inversely at level 10 (~3%)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42), grid.rays);
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
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42), grid.rays);
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
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 10, makeRng(42), grid.rays);
    for (const pu of result.powerUps) {
      expect(pu.value).toBeGreaterThanOrEqual(1);  // max(1, 11-10-2) = 1
      expect(pu.value).toBeLessThanOrEqual(3);     // min(10, 11-10+2) = 3
    }
  });

  it('is deterministic with same seed', () => {
    const r1 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    const r2 = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    expect(r1.obstacles.map(o => o.vertexId)).toEqual(r2.obstacles.map(o => o.vertexId));
    expect(r1.blackholes.map(b => b.vertexId)).toEqual(r2.blackholes.map(b => b.vertexId));
    expect(r1.enemies.map(e => e.vertexId)).toEqual(r2.enemies.map(e => e.vertexId));
    expect(r1.powerUps.map(p => p.vertexId)).toEqual(r2.powerUps.map(p => p.vertexId));
  });

  it('defaults difficulty to 5', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, undefined, makeRng(42), grid.rays);
    const pct = 0.05 + (5 - 1) * (0.15 / 9);
    const expectedTotal = Math.floor(eligibleCount * pct);
    const expectedRegular = Math.floor(expectedTotal * 0.6);
    const expectedBlackholes = Math.floor(expectedTotal * 0.2);
    expect(result.obstacles.length).toBe(expectedRegular);
    expect(result.blackholes.length).toBe(expectedBlackholes);
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  it('works without rays parameter (backward compat)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    expect(result.enemyZones).toBeInstanceOf(Set);
    expect(result.enemyZones.size).toBe(0);
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  it('all blackholes are instanceof BlackHole', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    for (const bh of result.blackholes) {
      expect(bh).toBeInstanceOf(BlackHole);
      expect(bh.type).toBe('blackhole');
    }
  });

  it('all enemies are instanceof Enemy', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    for (const enemy of result.enemies) {
      expect(enemy).toBeInstanceOf(Enemy);
      expect(enemy.type).toBe('enemy');
    }
  });

  it('returns enemyZoneMap as a Map', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    expect(result.enemyZoneMap).toBeInstanceOf(Map);
  });

  it('enemyZoneMap maps zone vertices to arrays of { enemyId, zoneType }', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);
    for (const [zoneVertex, entries] of result.enemyZoneMap) {
      // zoneVertex should also be in enemyZones
      expect(result.enemyZones.has(zoneVertex)).toBe(true);
      // entries should be an array
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      for (const zoneInfo of entries) {
        expect(zoneInfo).toHaveProperty('enemyId');
        expect(zoneInfo).toHaveProperty('zoneType');
        expect(['vision', 'proximity']).toContain(zoneInfo.zoneType);
        // enemyId should match an enemy in the enemies array
        const enemy = result.enemies.find(e => e.id === zoneInfo.enemyId);
        expect(enemy).toBeDefined();
      }
    }
  });

  it('enemyZoneMap covers all enemyZones vertices', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);
    for (const zoneVertex of result.enemyZones) {
      expect(result.enemyZoneMap.has(zoneVertex)).toBe(true);
    }
  });

  it('enemyZoneMap is empty when no rays provided', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42));
    expect(result.enemyZoneMap).toBeInstanceOf(Map);
    expect(result.enemyZoneMap.size).toBe(0);
  });

  it('proximity zones computed when adjacency is provided', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);
    if (result.enemies.length === 0) return; // skip if no enemies
    // Should have more zones than just vision (kill zone) vertices
    let visionCount = 0;
    let proximityCount = 0;
    for (const [, entries] of result.enemyZoneMap) {
      for (const zoneInfo of entries) {
        if (zoneInfo.zoneType === 'vision') visionCount++;
        if (zoneInfo.zoneType === 'proximity') proximityCount++;
      }
    }
    // With adjacency, proximity zones should exist
    expect(proximityCount).toBeGreaterThan(0);
  });

  it('vision zones present for enemy kill zone vertices', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);
    // For any enemy, check that kill zone vertices have a 'vision' entry for that enemy
    for (const enemy of result.enemies) {
      const affected = enemy.getAffectedVertices(null, grid.rays, result.obstacleSet);
      for (let i = 1; i < affected.length; i++) {
        const entries = result.enemyZoneMap.get(affected[i]);
        if (entries) {
          const enemyEntry = entries.find(e => e.enemyId === enemy.id);
          expect(enemyEntry).toBeDefined();
          expect(enemyEntry.zoneType).toBe('vision');
        }
      }
    }
  });

  it('proximity zones do not include start or target vertices', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);
    for (const [zoneVertex, entries] of result.enemyZoneMap) {
      for (const zoneInfo of entries) {
        if (zoneInfo.zoneType === 'proximity') {
          expect(zoneVertex).not.toBe(startVertex);
          expect(zoneVertex).not.toBe(targetVertex);
        }
      }
    }
  });

  it('no proximity zones when adjacency not provided', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);
    for (const [, entries] of result.enemyZoneMap) {
      for (const zoneInfo of entries) {
        expect(zoneInfo.zoneType).toBe('vision');
      }
    }
  });

  it('overlapping proximity zones: both enemies in shared vertex array', () => {
    // Use a small grid so enemies are close together
    const smallGrid = generateGrid(5, 4, 40);
    const ids = [...smallGrid.vertices.keys()];
    // Pick two adjacent vertices for enemies
    const v1 = ids[10];
    const adj1 = smallGrid.adjacency.get(v1) || [];
    const v2 = adj1.find(v => v !== ids[0] && v !== ids[ids.length - 1]);
    if (!v2) return; // skip if no adjacency found

    // Create two enemies at adjacent positions
    const enemy1 = new Enemy(v1, 3, 0, 1);
    const enemy2 = new Enemy(v2, 3, 0, 1);

    // Build zones manually to test overlap
    const enemyZones = new Set();
    const enemyZoneMap = new Map();

    // Add proximity zones for both enemies via BFS depth 2
    for (const enemy of [enemy1, enemy2]) {
      const proxVisited = new Set([enemy.vertexId]);
      let frontier = [enemy.vertexId];
      for (let depth = 0; depth < 2; depth++) {
        const nextFrontier = [];
        for (const fv of frontier) {
          for (const nv of (smallGrid.adjacency.get(fv) || [])) {
            if (proxVisited.has(nv)) continue;
            proxVisited.add(nv);
            enemyZones.add(nv);
            const existing = enemyZoneMap.get(nv) || [];
            if (!existing.some(e => e.enemyId === enemy.id)) {
              existing.push({ enemyId: enemy.id, zoneType: 'proximity' });
              enemyZoneMap.set(nv, existing);
            }
            nextFrontier.push(nv);
          }
        }
        frontier = nextFrontier;
      }
    }

    // Find shared vertices (in both enemies' zones)
    let sharedCount = 0;
    for (const [, entries] of enemyZoneMap) {
      if (entries.length >= 2) sharedCount++;
    }
    // Adjacent enemies should have at least some overlapping zones
    expect(sharedCount).toBeGreaterThan(0);
  });
});

describe('getAffectedVertices with obstacles', () => {
  it('vision zone stops at obstacle vertex (obstacle not included)', () => {
    const enemy = new Enemy('A', 3, 0, 4);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    const obstacles = new Set(['C']); // Obstacle at C
    const result = enemy.getAffectedVertices(new Map(), mockRays, obstacles);
    // Should include A (own vertex) + B, but NOT C (obstacle) or D, E (behind obstacle)
    expect(result).toEqual(['A', 'B']);
  });

  it('vision zone stops at first obstacle in ray', () => {
    const enemy = new Enemy('A', 3, 0, 6);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E', 'F', 'G'] },
      ]],
    ]);
    const obstacles = new Set(['D']); // Obstacle at D
    const result = enemy.getAffectedVertices(new Map(), mockRays, obstacles);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('obstacle at first ray vertex blocks entire vision zone', () => {
    const enemy = new Enemy('A', 3, 0, 3);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D'] },
      ]],
    ]);
    const obstacles = new Set(['B']); // Obstacle at very first vertex
    const result = enemy.getAffectedVertices(new Map(), mockRays, obstacles);
    expect(result).toEqual(['A']); // Only own vertex
  });

  it('no obstacles — full vision zone as before', () => {
    const enemy = new Enemy('A', 3, 0, 3);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays, new Set());
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });

  it('no obstacleSet parameter — backward compatible (full vision zone)', () => {
    const enemy = new Enemy('A', 3, 0, 3);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays);
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });

  it('obstacle on own vertex does not affect ray (enemy vertex is first element, ray starts after)', () => {
    const enemy = new Enemy('A', 3, 0, 3);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D'] },
      ]],
    ]);
    // Enemy's own vertex in obstacles — should not block the ray
    const obstacles = new Set(['A']);
    const result = enemy.getAffectedVertices(new Map(), mockRays, obstacles);
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });

  it('disarmed enemy still returns only own vertex regardless of obstacles', () => {
    const enemy = new Enemy('A', 3, 0, 4);
    enemy.combatShip = { canAttack: false };
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C', 'D', 'E'] },
      ]],
    ]);
    const result = enemy.getAffectedVertices(new Map(), mockRays, new Set());
    expect(result).toEqual(['A']);
  });

  it('proximity zones are unaffected by obstacle parameter', () => {
    // Proximity zones are computed via BFS in generateBoardObjects, not in getAffectedVertices.
    // getAffectedVertices only handles vision zones. This is a documentation test.
    const enemy = new Enemy('A', 3, 0, 2);
    const mockRays = new Map([
      ['A', [
        { direction: 0, vertices: ['B', 'C'] },
      ]],
    ]);
    // Vision zone with obstacles
    const obstacles = new Set(['B']);
    const result = enemy.getAffectedVertices(new Map(), mockRays, obstacles);
    expect(result).toEqual(['A']); // Only own vertex (B is blocked)
    // Proximity zones would be computed separately via BFS — not tested here
  });
});

describe('generateBoardObjects vision zones respect obstacles', () => {
  const grid = generateGrid(7, 6, 40);
  const ids = [...grid.vertices.keys()];
  const startVertex = ids[0];
  const targetVertex = ids[ids.length - 1];

  it('vision zones do not pass through obstacles', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays, grid.adjacency);

    for (const enemy of result.enemies) {
      const vertexRays = grid.rays.get(enemy.vertexId);
      if (!vertexRays) continue;
      const facingRay = vertexRays.find(r => r.direction === enemy.direction);
      if (!facingRay) continue;

      let sawObstacle = false;
      for (let i = 0; i < facingRay.vertices.length && i < enemy.visionRange; i++) {
        const vid = facingRay.vertices[i];
        if (result.obstacleSet.has(vid)) {
          sawObstacle = true;
          // The obstacle vertex itself should NOT be in the vision zone
          const entries = result.enemyZoneMap.get(vid);
          if (entries) {
            const entry = entries.find(e => e.enemyId === enemy.id);
            if (entry) {
              expect(entry.zoneType).not.toBe('vision');
            }
          }
          continue;
        }
        if (sawObstacle) {
          // Vertices behind obstacles should NOT have vision zone from this enemy
          const entries = result.enemyZoneMap.get(vid);
          if (entries) {
            const entry = entries.find(e => e.enemyId === enemy.id);
            if (entry) {
              expect(entry.zoneType).not.toBe('vision');
            }
          }
        }
      }
    }
  });

  it('zone computation uses final obstacle set (all enemies placed first)', () => {
    const result = generateBoardObjects(grid.vertices, startVertex, targetVertex, 5, makeRng(42), grid.rays);

    // Recompute expected zones with the final obstacleSet — should match exactly
    const expectedZones = new Set();
    for (const enemy of result.enemies) {
      const affected = enemy.getAffectedVertices(null, grid.rays, result.obstacleSet);
      for (let i = 1; i < affected.length; i++) {
        expectedZones.add(affected[i]);
      }
    }
    expect(result.enemyZones).toEqual(expectedZones);
  });
});
