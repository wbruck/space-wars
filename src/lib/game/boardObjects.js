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
 * Factory function to create board objects by type.
 * @param {string} type - 'obstacle' or 'powerup'
 * @param {string} vertexId - The vertex ID
 * @param {number} value - Object value (1-10)
 * @returns {BoardObject}
 */
export function createBoardObject(type, vertexId, value) {
  switch (type) {
    case 'obstacle':
      return new Obstacle(vertexId, value);
    case 'powerup':
      return new PowerUp(vertexId, value);
    default:
      throw new Error(`Unknown board object type: ${type}`);
  }
}
