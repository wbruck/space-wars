/**
 * Board object system — base classes for obstacles and power-ups.
 *
 * @module boardObjects
 */

/**
 * Base class for all objects placed on the board.
 */
export class BoardObject {
  /**
   * @param {string} vertexId - The vertex this object occupies
   * @param {string} type - Object type identifier (e.g. 'obstacle', 'powerup')
   * @param {number} value - Intensity/power value (1-10)
   */
  constructor(vertexId, type, value) {
    this.id = `${type}:${vertexId}`;
    this.vertexId = vertexId;
    this.type = type;
    this.value = value;
  }

  /**
   * Hook called when a player lands on or passes through this object's vertex.
   * Subclasses override to implement specific behavior.
   * @param {object} _gameState - Current game state
   * @returns {undefined}
   */
  onPlayerInteraction(_gameState) {
    return undefined;
  }

  /**
   * Returns the vertices affected by this object.
   * Base implementation returns only the object's own vertex.
   * Subclasses can override to affect neighboring vertices.
   * @param {Map<string, string[]>} _adjacency - Graph adjacency map
   * @returns {string[]}
   */
  getAffectedVertices(_adjacency) {
    return [this.vertexId];
  }
}

/**
 * Obstacle that blocks player movement.
 */
export class Obstacle extends BoardObject {
  /**
   * @param {string} vertexId - The vertex this obstacle occupies
   * @param {number} value - Obstacle intensity (1-10)
   */
  constructor(vertexId, value) {
    super(vertexId, 'obstacle', value);
  }

  /**
   * Indicates this object blocks movement.
   * @param {object} _gameState
   * @returns {{ blocked: boolean }}
   */
  onPlayerInteraction(_gameState) {
    return { blocked: true };
  }
}

/**
 * Black hole that kills the player on contact but does not block movement.
 */
export class BlackHole extends Obstacle {
  /**
   * @param {string} vertexId - The vertex this black hole occupies
   * @param {number} value - Black hole intensity (1-10)
   */
  constructor(vertexId, value) {
    super(vertexId, value);
    this.type = 'blackhole';
    this.id = `blackhole:${vertexId}`;
  }

  /**
   * Indicates this object kills the player on contact.
   * @param {object} _gameState
   * @returns {{ killed: boolean, cause: string }}
   */
  onPlayerInteraction(_gameState) {
    return { killed: true, cause: 'blackhole' };
  }
}

/**
 * Enemy sentry that blocks movement at its own vertex and has a directional kill zone.
 */
export class Enemy extends Obstacle {
  /**
   * @param {string} vertexId - The vertex this enemy occupies
   * @param {number} value - Enemy intensity (1-10)
   * @param {number} direction - Facing direction (0-5)
   * @param {number} [visionRange] - Vision range (1-6), defaults to clamped value for backward compat
   */
  constructor(vertexId, value, direction, visionRange) {
    super(vertexId, value);
    this.type = 'enemy';
    this.id = `enemy:${vertexId}`;
    this.direction = direction;
    this.visionRange = visionRange != null ? visionRange : Math.min(Math.max(value, 1), 6);
    this.range = this.visionRange;
  }

  /**
   * Indicates this object kills the player on contact.
   * @param {object} _gameState
   * @returns {{ killed: boolean, cause: string }}
   */
  onPlayerInteraction(_gameState) {
    return { killed: true, cause: 'enemy' };
  }

  /**
   * Returns the enemy's own vertex plus kill zone vertices along the facing direction.
   * Vision rays stop at obstacles — the obstacle vertex is NOT included.
   * @param {Map<string, string[]>} _adjacency - Graph adjacency map
   * @param {Map<string, Array<{direction: number, vertices: string[]}>>} [rays] - Precomputed ray map
   * @param {Set<string>} [obstacleSet] - Obstacle vertex IDs; vision ray stops at these
   * @returns {string[]}
   */
  getAffectedVertices(_adjacency, rays, obstacleSet) {
    // Disarmed enemies (weapons destroyed) have no vision ray
    if (this.combatShip && !this.combatShip.canAttack) {
      return [this.vertexId];
    }
    const killZoneVertices = [];
    if (rays) {
      const vertexRays = rays.get(this.vertexId);
      if (vertexRays) {
        const facingRay = vertexRays.find(r => r.direction === this.direction);
        if (facingRay) {
          for (let i = 0; i < this.visionRange && i < facingRay.vertices.length; i++) {
            const vid = facingRay.vertices[i];
            // Stop at obstacles (don't include the obstacle vertex)
            if (obstacleSet && obstacleSet.has(vid)) {
              break;
            }
            killZoneVertices.push(vid);
          }
        }
      }
    }
    return [this.vertexId, ...killZoneVertices];
  }
}

/**
 * Power-up that can be collected by the player.
 */
export class PowerUp extends BoardObject {
  /**
   * @param {string} vertexId - The vertex this power-up occupies
   * @param {number} value - Power-up strength (1-10)
   */
  constructor(vertexId, value) {
    super(vertexId, 'powerup', value);
  }

  /**
   * Indicates this power-up was collected. Actual effects are deferred to future subclasses.
   * @param {object} _gameState
   * @returns {{ collected: boolean, value: number }}
   */
  onPlayerInteraction(_gameState) {
    return { collected: true, value: this.value };
  }
}

/**
 * Generate board objects (obstacles, blackholes, enemies, and power-ups) based on difficulty.
 *
 * @param {Map<string, object>} vertices - Vertex map from generateGrid
 * @param {string} startVertex - Start vertex ID (excluded from placement)
 * @param {string} targetVertex - Target vertex ID (excluded from placement)
 * @param {number} [difficulty=5] - Difficulty level 1-10
 * @param {() => number} rng - Random number generator returning 0-1
 * @param {Map<string, Array<{direction: number, vertices: string[]}>>} [rays] - Precomputed ray map for enemy kill zones
 * @returns {{ obstacles: Obstacle[], blackholes: BlackHole[], enemies: Enemy[], powerUps: PowerUp[], obstacleSet: Set<string>, blackholeSet: Set<string>, enemyZones: Set<string>, enemyZoneMap: Map<string, string> }}
 */
export function generateBoardObjects(vertices, startVertex, targetVertex, difficulty = 5, rng, rays, adjacency) {
  const eligible = [...vertices.keys()].filter(
    id => id !== startVertex && id !== targetVertex
  );

  // Shuffle eligible vertices using Fisher-Yates
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // Calculate counts based on difficulty
  const obstaclePct = 0.05 + (difficulty - 1) * (0.15 / 9);
  const powerUpPct = 0.15 - (difficulty - 1) * (0.12 / 9);
  const totalObstacleCount = Math.floor(eligible.length * obstaclePct);
  const powerUpCount = Math.floor(eligible.length * powerUpPct);

  // Split total obstacle count into regular, blackhole, and enemy
  let regularCount, blackholeCount, enemyCount;
  if (difficulty <= 2) {
    // No enemies at difficulty 1-2
    regularCount = Math.floor(totalObstacleCount * 0.8);
    blackholeCount = totalObstacleCount - regularCount;
    enemyCount = 0;
  } else {
    regularCount = Math.floor(totalObstacleCount * 0.6);
    blackholeCount = Math.floor(totalObstacleCount * 0.2);
    enemyCount = totalObstacleCount - regularCount - blackholeCount;
  }

  // Value ranges
  const obsMin = Math.max(1, difficulty - 2);
  const obsMax = Math.min(10, difficulty + 2);
  const puMin = Math.max(1, 11 - difficulty - 2);
  const puMax = Math.min(10, 11 - difficulty + 2);

  let idx = 0;

  // Regular obstacles — in obstacleSet
  const obstacles = [];
  const obstacleSet = new Set();
  for (let i = 0; i < regularCount; i++) {
    const vertexId = eligible[idx++];
    const value = obsMin + Math.floor(rng() * (obsMax - obsMin + 1));
    obstacles.push(new Obstacle(vertexId, value));
    obstacleSet.add(vertexId);
  }

  // Blackholes — NOT in obstacleSet
  const blackholes = [];
  const blackholeSet = new Set();
  for (let i = 0; i < blackholeCount; i++) {
    const vertexId = eligible[idx++];
    const value = obsMin + Math.floor(rng() * (obsMax - obsMin + 1));
    blackholes.push(new BlackHole(vertexId, value));
    blackholeSet.add(vertexId);
  }

  // Enemies — in obstacleSet (they block movement at their own vertex)
  // Use a budget system: each enemy costs its visionRange (1-6) from the total budget.
  // Budget = enemyCount * 3 (slightly below average of 3.5 to maintain enemy count).
  const enemyBudget = enemyCount * 3;
  const enemies = [];
  const enemyZones = new Set();
  const enemyZoneMap = new Map();
  let budgetRemaining = enemyBudget;

  // Phase 1: Place all enemies and add to obstacleSet
  while (budgetRemaining > 0 && idx < eligible.length) {
    const vertexId = eligible[idx++];
    const value = obsMin + Math.floor(rng() * (obsMax - obsMin + 1));
    const direction = Math.floor(rng() * 6);
    // Cap visionRange to remaining budget so we don't overshoot
    const maxRange = Math.min(6, budgetRemaining);
    const visionRange = 1 + Math.floor(rng() * maxRange);
    budgetRemaining -= visionRange;
    const enemy = new Enemy(vertexId, value, direction, visionRange);
    enemies.push(enemy);
    obstacleSet.add(vertexId);
  }

  // Phase 2: Compute zones for all enemies (after all obstacles are finalized)
  for (const enemy of enemies) {
    // Compute kill zone from rays (respecting all obstacles including other enemies)
    if (rays) {
      const affected = enemy.getAffectedVertices(null, rays, obstacleSet);
      // Skip the first element (enemy's own vertex) since that's in obstacleSet
      for (let j = 1; j < affected.length; j++) {
        enemyZones.add(affected[j]);
        const existing = enemyZoneMap.get(affected[j]) || [];
        existing.push({ enemyId: enemy.id, zoneType: 'vision' });
        enemyZoneMap.set(affected[j], existing);
      }
    }

    // Compute proximity zone via BFS (depth <= 2)
    if (adjacency) {
      const proxVisited = new Set();
      proxVisited.add(enemy.vertexId); // enemy's own vertex
      let frontier = [enemy.vertexId];
      for (let depth = 0; depth < 2; depth++) {
        const nextFrontier = [];
        for (const fv of frontier) {
          const neighbors = adjacency.get(fv) || [];
          for (const nv of neighbors) {
            if (proxVisited.has(nv)) continue;
            proxVisited.add(nv);
            // Skip obstacles (except enemy's own vertex already handled)
            if (obstacleSet.has(nv)) continue;
            // Skip start/target vertices
            if (nv === startVertex || nv === targetVertex) continue;
            enemyZones.add(nv);
            const existingZone = enemyZoneMap.get(nv) || [];
            if (!existingZone.some(e => e.enemyId === enemy.id)) {
              existingZone.push({ enemyId: enemy.id, zoneType: 'proximity' });
              enemyZoneMap.set(nv, existingZone);
            }
            nextFrontier.push(nv);
          }
        }
        frontier = nextFrontier;
      }
    }
  }

  // Power-ups
  const powerUps = [];
  for (let i = 0; i < powerUpCount; i++) {
    const vertexId = eligible[idx++];
    const value = puMin + Math.floor(rng() * (puMax - puMin + 1));
    powerUps.push(new PowerUp(vertexId, value));
  }

  return { obstacles, blackholes, enemies, powerUps, obstacleSet, blackholeSet, enemyZones, enemyZoneMap };
}

/**
 * Factory function to create board objects by type.
 * @param {string} type - 'obstacle', 'blackhole', 'enemy', or 'powerup'
 * @param {string} vertexId - The vertex ID
 * @param {number} value - Object value (1-10)
 * @param {number} [direction] - Facing direction (0-5), required for 'enemy' type
 * @param {number} [visionRange] - Vision range (1-6), optional for 'enemy' type
 * @returns {BoardObject}
 */
export function createBoardObject(type, vertexId, value, direction, visionRange) {
  switch (type) {
    case 'obstacle':
      return new Obstacle(vertexId, value);
    case 'blackhole':
      return new BlackHole(vertexId, value);
    case 'enemy':
      return new Enemy(vertexId, value, direction, visionRange);
    case 'powerup':
      return new PowerUp(vertexId, value);
    default:
      throw new Error(`Unknown board object type: ${type}`);
  }
}
