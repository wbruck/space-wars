/**
 * Combat system — ship components, ships, and combat engine.
 *
 * @module combat
 */

/**
 * A targetable ship component with HP.
 */
export class ShipComponent {
  /**
   * @param {string} name - Component name (e.g. 'Weapons', 'Engines', 'Bridge')
   * @param {number} maxHp - Maximum hit points
   */
  constructor(name, maxHp) {
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
  }

  /** @returns {boolean} True when currentHp <= 0 */
  get destroyed() {
    return this.currentHp <= 0;
  }

  /**
   * Apply damage to this component.
   * @param {number} amount - Damage amount
   * @returns {{ destroyed: boolean }} Whether this hit destroyed the component
   */
  takeDamage(amount) {
    const wasBefore = this.currentHp > 0;
    this.currentHp = Math.max(0, this.currentHp - amount);
    return { destroyed: wasBefore && this.currentHp <= 0 };
  }
}

/**
 * Base ship with named components.
 */
export class Ship {
  /**
   * @param {string} name - Ship name
   * @param {ShipComponent[]} components - Array of ship components
   */
  constructor(name, components) {
    this.name = name;
    this.components = components;
  }

  /** @returns {boolean} True when all components are destroyed */
  get isDestroyed() {
    return this.components.every(c => c.destroyed);
  }

  /**
   * @returns {ShipComponent[]} Components with currentHp > 0
   */
  getActiveComponents() {
    return this.components.filter(c => c.currentHp > 0);
  }

  /**
   * @param {string} name - Component name
   * @returns {ShipComponent|undefined}
   */
  getComponent(name) {
    return this.components.find(c => c.name === name);
  }
}

/**
 * Player's ship with default components: Weapons (2 HP), Engines (2 HP), Bridge (2 HP).
 */
export class PlayerShip extends Ship {
  /**
   * @param {ShipComponent[]} [components] - Optional custom components
   */
  constructor(components) {
    const defaultComponents = [
      new ShipComponent('Weapons', 2),
      new ShipComponent('Engines', 2),
      new ShipComponent('Bridge', 2),
    ];
    super('Player Ship', components || defaultComponents);
  }
}
