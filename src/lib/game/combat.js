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
   * @param {number} [powerCost=1] - Power cost (integer >= 1)
   */
  constructor(name, maxHp, powerCost = 1) {
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.powerCost = powerCost;
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
 * A weapon component with damage and accuracy stats.
 */
export class WeaponComponent extends ShipComponent {
  /**
   * @param {string} name
   * @param {number} maxHp
   * @param {number} [powerCost=1]
   */
  constructor(name, maxHp, powerCost = 1) {
    super(name, maxHp, powerCost);
    // Power 2: damage 1, accuracy 3. Power 1 (default): damage 1, accuracy 4.
    this.damage = 1;
    this.accuracy = powerCost >= 2 ? 3 : 4;
  }

  /** @returns {'weapon'} */
  get type() { return 'weapon'; }
}

/**
 * An engine component with speed bonus.
 */
export class EngineComponent extends ShipComponent {
  /**
   * @param {string} name
   * @param {number} maxHp
   * @param {number} [powerCost=1]
   */
  constructor(name, maxHp, powerCost = 1) {
    super(name, maxHp, powerCost);
    // Power 2: speedBonus 1. Power 1 (default): speedBonus 0.
    this.speedBonus = powerCost >= 2 ? 1 : 0;
  }

  /** @returns {'engine'} */
  get type() { return 'engine'; }
}

/**
 * A bridge component with evasion bonus.
 */
export class BridgeComponent extends ShipComponent {
  /**
   * @param {string} name
   * @param {number} maxHp
   * @param {number} [powerCost=1]
   */
  constructor(name, maxHp, powerCost = 1) {
    super(name, maxHp, powerCost);
    // Power 2: evasionBonus 1. Power 1 (default): evasionBonus 0.
    this.evasionBonus = powerCost >= 2 ? 1 : 0;
  }

  /** @returns {'bridge'} */
  get type() { return 'bridge'; }
}

/**
 * Mixin that provides shared component management logic.
 * Usage: class Ship extends ComponentContainer(Object) { ... }
 *
 * @param {Function} Base - The base class to extend
 * @returns {Function} A class extending Base with component management
 */
export const ComponentContainer = (Base) => class extends Base {
  /**
   * @param  {...any} args - Arguments passed to Base constructor.
   *   If the last arg is an object with powerLimit, it is consumed as options.
   */
  constructor(...args) {
    super(...args);
    /** @type {ShipComponent[]} */
    this._components = [];
    /** @type {number} */
    this.powerLimit = Infinity;
  }

  /**
   * Add a component, enforcing power budget and bridge uniqueness.
   * @param {ShipComponent} component
   * @throws {Error} If adding would exceed powerLimit
   * @throws {Error} If adding a second BridgeComponent
   */
  addComponent(component) {
    if (this.totalPower + component.powerCost > this.powerLimit) {
      throw new Error(`Cannot add component "${component.name}": would exceed powerLimit (${this.totalPower + component.powerCost} > ${this.powerLimit})`);
    }
    if (component.type === 'bridge' && this.hasComponentType('bridge')) {
      throw new Error('Cannot add a second BridgeComponent — only one bridge allowed');
    }
    this._components.push(component);
  }

  /**
   * Explicitly remove a component by name. Never triggered by damage/destruction.
   * @param {string} name
   * @returns {ShipComponent|undefined} The removed component, or undefined
   */
  removeComponent(name) {
    const idx = this._components.findIndex(c => c.name === name);
    if (idx === -1) return undefined;
    return this._components.splice(idx, 1)[0];
  }

  /** @returns {number} Sum of all component power costs (including destroyed) */
  get totalPower() {
    return this._components.reduce((sum, c) => sum + c.powerCost, 0);
  }

  /** @returns {number} powerLimit - totalPower */
  get remainingPower() {
    return this.powerLimit - this.totalPower;
  }

  /**
   * @param {string} type - Component type string (e.g. 'weapon', 'engine', 'bridge')
   * @returns {ShipComponent[]} Components matching the given type
   */
  getComponentsByType(type) {
    return this._components.filter(c => c.type === type);
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  hasComponentType(type) {
    return this._components.some(c => c.type === type);
  }

  /**
   * Backward-compatible name-based lookup.
   * @param {string} name
   * @returns {ShipComponent|undefined}
   */
  getComponent(name) {
    return this._components.find(c => c.name === name);
  }

  /**
   * @returns {ShipComponent[]} Components with currentHp > 0
   */
  getActiveComponents() {
    return this._components.filter(c => c.currentHp > 0);
  }

  /** @returns {boolean} True when all components are destroyed */
  get isDestroyed() {
    return this._components.length > 0 && this._components.every(c => c.destroyed);
  }

  /**
   * Backward-compatible components getter — returns the internal array.
   * @returns {ShipComponent[]}
   */
  get components() {
    return this._components;
  }
};

/**
 * Base ship with named components, using ComponentContainer mixin.
 *
 * Supports two constructor signatures for backward compatibility:
 *   new Ship('name', [comp1, comp2])          — legacy array form
 *   new Ship('name', { powerLimit, components }) — new options form
 */
export class Ship extends ComponentContainer(Object) {
  /**
   * @param {string} name - Ship name
   * @param {ShipComponent[]|{powerLimit?: number, components?: ShipComponent[]}} [opts] - Components array or options object
   */
  constructor(name, opts) {
    super();
    this.name = name;

    // Backward compat: if second arg is an array, treat as { components: arr, powerLimit: Infinity }
    let powerLimit = Infinity;
    let components = [];
    if (Array.isArray(opts)) {
      components = opts;
    } else if (opts && typeof opts === 'object') {
      powerLimit = opts.powerLimit ?? Infinity;
      components = opts.components || [];
    }

    this.powerLimit = powerLimit;
    for (const c of components) {
      this.addComponent(c);
    }
  }
}

/**
 * Player's ship with typed components and power budget.
 * Default powerLimit: 7, starts with no components (player builds ship in shipyard).
 */
export class PlayerShip extends Ship {
  /**
   * @param {ShipComponent[]|{powerLimit?: number, components?: ShipComponent[]}} [opts] - Legacy component array or options object
   */
  constructor(opts) {
    if (Array.isArray(opts)) {
      // Legacy: PlayerShip([comp1, comp2]) — enforce powerLimit 7
      super('Player Ship', { powerLimit: 7, components: opts });
    } else if (opts && typeof opts === 'object') {
      // New: PlayerShip({ powerLimit, components })
      super('Player Ship', {
        powerLimit: opts.powerLimit ?? 7,
        components: opts.components || [],
      });
    } else {
      // Default: PlayerShip() — empty ship with powerLimit 7
      super('Player Ship', {
        powerLimit: 7,
        components: [],
      });
    }
  }

  /** @returns {boolean} True if any weapon component is active (not destroyed) */
  get canAttack() {
    const weapons = this.getComponentsByType('weapon');
    return weapons.some(w => !w.destroyed);
  }

  /** @returns {boolean} True if the bridge component is destroyed */
  get isBridgeDestroyed() {
    const bridge = this.getComponentsByType('bridge')[0];
    return bridge ? bridge.destroyed : false;
  }

  /** @returns {boolean} True if ALL engine components are destroyed */
  get isEngineDestroyed() {
    const engines = this.getComponentsByType('engine');
    if (engines.length === 0) return true;
    return engines.every(e => e.destroyed);
  }
}

/**
 * Enemy ship with typed components and power budget.
 * Default powerLimit: 4, default components: power-1 weapon (1HP), power-1 engine (1HP), power-1 bridge (1HP).
 * Bridge destruction is the ONLY way to fully defeat an enemy.
 */
export class EnemyShip extends Ship {
  /**
   * @param {ShipComponent[]|{powerLimit?: number, components?: ShipComponent[]}} [opts] - Legacy component array or options object
   */
  constructor(opts) {
    const defaultComponents = [
      new WeaponComponent('Weapons', 1, 1),
      new EngineComponent('Engines', 1, 1),
      new BridgeComponent('Bridge', 1, 1),
    ];

    if (Array.isArray(opts)) {
      // Legacy: EnemyShip([comp1, comp2]) — enforce powerLimit 4
      super('Enemy Ship', { powerLimit: 4, components: opts });
    } else if (opts && typeof opts === 'object') {
      // New: EnemyShip({ powerLimit, components })
      super('Enemy Ship', {
        powerLimit: opts.powerLimit ?? 4,
        components: opts.components || defaultComponents,
      });
    } else {
      // Default: EnemyShip() — use defaults with powerLimit 4
      super('Enemy Ship', {
        powerLimit: 4,
        components: defaultComponents,
      });
    }
  }

  /** @returns {boolean} True if any weapon component is active (not destroyed) */
  get canAttack() {
    const weapons = this.getComponentsByType('weapon');
    return weapons.some(w => !w.destroyed);
  }

  /** @returns {boolean} True if any engine component is active */
  get canFlee() {
    const engines = this.getComponentsByType('engine');
    return engines.some(e => !e.destroyed);
  }

  /** @returns {boolean} True if the bridge component is destroyed — enemy fully defeated */
  get isBridgeDestroyed() {
    const bridge = this.getComponentsByType('bridge')[0];
    return bridge ? bridge.destroyed : false;
  }

  /** @returns {ShipComponent[]} Components that are not destroyed (HP > 0), available for salvage */
  getSalvageableComponents() {
    return this.components.filter(c => !c.destroyed);
  }
}

/**
 * Compute the player's approach position (1-6) relative to an enemy.
 *
 * Positions clockwise from enemy's front:
 *   1=Front, 2=Front-right, 3=Back-right, 4=Behind, 5=Back-left, 6=Front-left
 *
 * @param {number} playerDirection - Player's movement direction (0-5)
 * @param {number} enemyFacingDirection - Enemy's facing direction (0-5)
 * @returns {number} Approach position 1-6
 */
export function getApproachPosition(playerDirection, enemyFacingDirection) {
  return ((playerDirection - enemyFacingDirection + 3 + 6) % 6) + 1;
}

/**
 * Determine first-attack advantage based on zone type and approach direction.
 * @param {string} zoneType - 'vision' or 'proximity'
 * @param {number} playerDirection - Player's movement direction (0-5)
 * @param {number} enemyFacingDirection - Enemy's facing direction (0-5)
 * @returns {{ firstAttacker: 'player'|'enemy', bonusAttacks: number, rollBonus: number, approachType: 'vision'|'rear_ambush'|'simple', approachPosition: number }}
 */
export function getApproachAdvantage(zoneType, playerDirection, enemyFacingDirection) {
  const approachPosition = getApproachPosition(playerDirection, enemyFacingDirection);

  if (zoneType === 'vision') {
    // Entered enemy's line of fire: enemy attacks first
    return { firstAttacker: 'enemy', bonusAttacks: 0, rollBonus: 0, approachType: 'vision', approachPosition };
  }
  // Proximity engagement: player attacks first
  // Only position 4 (directly behind) grants rear ambush
  if (approachPosition === 4) {
    return { firstAttacker: 'player', bonusAttacks: 0, rollBonus: 1, approachType: 'rear_ambush', approachPosition };
  }
  return { firstAttacker: 'player', bonusAttacks: 0, rollBonus: 0, approachType: 'simple', approachPosition };
}

/**
 * Turn-based combat engine resolving attacks between player and enemy ships.
 */
export class CombatEngine {
  /**
   * @param {object} opts
   * @param {PlayerShip} opts.playerShip
   * @param {EnemyShip} opts.enemyShip
   * @param {number} [opts.maxTurns=5] - Max attack turns per side
   * @param {number} [opts.hitThreshold=4] - Minimum d6 roll for a hit
   * @param {() => number} [opts.rng] - Optional RNG returning 0-1 for deterministic tests
   */
  constructor({ playerShip, enemyShip, maxTurns = 5, hitThreshold = 4, rng }) {
    this.playerShip = playerShip;
    this.enemyShip = enemyShip;
    this.maxTurns = maxTurns;
    this.hitThreshold = hitThreshold;
    this.rng = rng || Math.random;
    this.currentTurn = 1;
    this.isPlayerTurn = true;
    this.turnLog = [];
    this.combatOver = false;
    this.result = null;
    /** @type {number} Total player attacks executed */
    this._playerAttackCount = 0;
    /** @type {number} Total enemy attacks executed */
    this._enemyAttackCount = 0;
    /** @type {number} Bonus attacks granted (e.g., from rear approach) */
    this.bonusAttacks = 0;
    /** @type {number} Roll bonus added to hit check (e.g., from rear proximity approach) */
    this.rollBonus = 0;
  }

  /**
   * Set who attacks first.
   * @param {'player'|'enemy'} attacker
   */
  setFirstAttacker(attacker) {
    this.isPlayerTurn = attacker === 'player';
  }

  /**
   * Roll a d6 attack.
   * @returns {{ roll: number, isHit: boolean }}
   */
  rollAttack() {
    const roll = Math.floor(this.rng() * 6) + 1;
    return { roll, isHit: roll >= this.hitThreshold };
  }

  /**
   * Check combat end conditions and set result if met.
   * @returns {boolean} Whether combat just ended
   * @private
   */
  _checkCombatEnd() {
    // Bridge destroyed → player wins
    if (this.enemyShip.isBridgeDestroyed) {
      this.combatOver = true;
      this.result = 'playerWin';
      return true;
    }
    // Player bridge destroyed → player destroyed
    if (this.playerShip.isBridgeDestroyed) {
      this.combatOver = true;
      this.result = 'playerDestroyed';
      return true;
    }
    // All player components destroyed → player destroyed
    if (this.playerShip.isDestroyed) {
      this.combatOver = true;
      this.result = 'playerDestroyed';
      return true;
    }
    // Enemy Weapons destroyed but Engines intact → enemy flees
    // Require at least 1 player attack before flee triggers (prevents instant flee on re-encounter with disarmed enemy)
    if (!this.enemyShip.canAttack && this.enemyShip.canFlee && this._playerAttackCount > 0) {
      this.combatOver = true;
      this.result = 'enemyFled';
      return true;
    }
    // Max turns reached by both sides
    if (this._playerAttackCount >= this.maxTurns && this._enemyAttackCount >= this.maxTurns) {
      this.combatOver = true;
      this.result = 'playerLose';
      return true;
    }
    return false;
  }

  /**
   * Advance turn state after an attack.
   * @private
   */
  _advanceTurn() {
    if (this.combatOver) return;

    if (this.isPlayerTurn) {
      // Check if player has bonus attacks remaining
      if (this.bonusAttacks > 0 && this._playerAttackCount === 1) {
        // Stay on player's turn for bonus attack
        this.bonusAttacks--;
        return;
      }
      // Switch to enemy turn
      this.isPlayerTurn = false;
    } else {
      // Switch to player turn and advance turn counter
      this.isPlayerTurn = true;
      this.currentTurn++;
    }
  }

  /**
   * Player escapes combat. Always available on the player's turn.
   * Sets combatOver = true and result = 'escaped'.
   * @returns {{ combatOver: boolean, result: string }}
   */
  escape() {
    if (this.combatOver) {
      return { combatOver: true, result: this.result };
    }
    this.combatOver = true;
    this.result = 'escaped';
    return { combatOver: true, result: 'escaped' };
  }

  /**
   * Player targets a specific enemy component.
   * Uses the first active weapon's accuracy and damage stats.
   * @param {string} targetComponentName
   * @returns {{ roll, isHit, targetComponent, destroyed, combatOver, result }}
   */
  executePlayerAttack(targetComponentName) {
    if (this.combatOver) {
      return { roll: 0, isHit: false, targetComponent: targetComponentName, destroyed: false, combatOver: true, result: this.result };
    }

    // Refuse to attack if player weapons are destroyed
    if (!this.playerShip.canAttack) {
      return { roll: 0, isHit: false, targetComponent: targetComponentName, destroyed: false, combatOver: this.combatOver, result: this.result };
    }

    // Get first active weapon for accuracy and damage
    const weapon = this.playerShip.getComponentsByType('weapon').find(w => !w.destroyed);
    const accuracy = weapon ? weapon.accuracy : this.hitThreshold;
    const damage = weapon ? weapon.damage : 1;

    const { roll } = this.rollAttack();
    const isHit = (roll + this.rollBonus) >= accuracy;
    let destroyed = false;

    if (isHit) {
      const component = this.enemyShip.getComponent(targetComponentName);
      if (component && !component.destroyed) {
        const dmgResult = component.takeDamage(damage);
        destroyed = dmgResult.destroyed;
      }
    }

    this._playerAttackCount++;

    const logEntry = {
      turn: this.currentTurn,
      attacker: 'player',
      target: targetComponentName,
      roll,
      isHit,
      destroyed,
    };
    this.turnLog.push(logEntry);

    this._checkCombatEnd();
    this._advanceTurn();

    return { roll, isHit, targetComponent: targetComponentName, destroyed, combatOver: this.combatOver, result: this.result };
  }

  /**
   * Enemy auto-targets a random active player component.
   * Auto-misses if enemy Weapons are destroyed.
   * @returns {{ roll, isHit, targetComponent, destroyed, combatOver, result }}
   */
  executeEnemyAttack() {
    if (this.combatOver) {
      return { roll: 0, isHit: false, targetComponent: null, destroyed: false, combatOver: true, result: this.result };
    }

    // Auto-miss if enemy can't attack (Weapons destroyed)
    if (!this.enemyShip.canAttack) {
      const logEntry = {
        turn: this.currentTurn,
        attacker: 'enemy',
        target: null,
        roll: 0,
        isHit: false,
        destroyed: false,
        autoMiss: true,
      };
      this.turnLog.push(logEntry);
      this._enemyAttackCount++;
      this._checkCombatEnd();
      this._advanceTurn();
      return { roll: 0, isHit: false, targetComponent: null, destroyed: false, combatOver: this.combatOver, result: this.result };
    }

    // Get first active weapon for accuracy and damage
    const weapon = this.enemyShip.getComponentsByType('weapon').find(w => !w.destroyed);
    const accuracy = weapon ? weapon.accuracy : this.hitThreshold;
    const damage = weapon ? weapon.damage : 1;

    // Pick random active player component
    const activeComponents = this.playerShip.getActiveComponents();
    const targetIndex = Math.floor(this.rng() * activeComponents.length);
    const target = activeComponents[targetIndex];

    const { roll } = this.rollAttack();
    const isHit = roll >= accuracy;
    let destroyed = false;

    if (isHit) {
      const dmgResult = target.takeDamage(damage);
      destroyed = dmgResult.destroyed;
    }

    this._enemyAttackCount++;

    const logEntry = {
      turn: this.currentTurn,
      attacker: 'enemy',
      target: target.name,
      roll,
      isHit,
      destroyed,
    };
    this.turnLog.push(logEntry);

    this._checkCombatEnd();
    this._advanceTurn();

    return { roll, isHit, targetComponent: target.name, destroyed, combatOver: this.combatOver, result: this.result };
  }
}
