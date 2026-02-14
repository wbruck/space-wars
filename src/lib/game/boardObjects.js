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
   * @param {number} value - Enemy intensity (1-10), also used as kill zone range
   * @param {number} direction - Facing direction (0-5)
   */
  constructor(vertexId, value, direction) {
    super(vertexId, value);
    this.type = 'enemy';
    this.id = `enemy:${vertexId}`;
    this.direction = direction;
    this.range = this.value;
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
   * @param {Map<string, string[]>} _adjacency - Graph adjacency map
   * @param {Map<string, Array<{direction: number, vertices: string[]}>>} [rays] - Precomputed ray map
   * @returns {string[]}
   */
  getAffectedVertices(_adjacency, rays) {
    const killZoneVertices = [];
    if (rays) {
      const vertexRays = rays.get(this.vertexId);
      if (vertexRays) {
        const facingRay = vertexRays.find(r => r.direction === this.direction);
        if (facingRay) {
          for (let i = 0; i < this.range && i < facingRay.vertices.length; i++) {
            killZoneVertices.push(facingRay.vertices[i]);
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
export function generateBoardObjects(vertices, startVertex, targetVertex, difficulty = 5, rng, rays) {
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
  const enemies = [];
  const enemyZones = new Set();
  const enemyZoneMap = new Map();
  for (let i = 0; i < enemyCount; i++) {
    const vertexId = eligible[idx++];
    const value = obsMin + Math.floor(rng() * (obsMax - obsMin + 1));
    const direction = Math.floor(rng() * 6);
    const enemy = new Enemy(vertexId, value, direction);
    enemies.push(enemy);
    obstacleSet.add(vertexId);

    // Compute kill zone from rays
    if (rays) {
      const affected = enemy.getAffectedVertices(null, rays);
      // Skip the first element (enemy's own vertex) since that's in obstacleSet
      for (let j = 1; j < affected.length; j++) {
        enemyZones.add(affected[j]);
        enemyZoneMap.set(affected[j], enemy.id);
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
 * @returns {BoardObject}
 */
export function createBoardObject(type, vertexId, value, direction) {
  switch (type) {
    case 'obstacle':
      return new Obstacle(vertexId, value);
    case 'blackhole':
      return new BlackHole(vertexId, value);
    case 'enemy':
      return new Enemy(vertexId, value, direction);
    case 'powerup':
      return new PowerUp(vertexId, value);
    default:
      throw new Error(`Unknown board object type: ${type}`);
  }
}
