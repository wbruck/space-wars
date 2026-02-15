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
   * @param {number} [size=1] - Size/weight cost (integer >= 1)
   */
  constructor(name, maxHp, size = 1) {
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.size = size;
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
   * @param {number} [size=1]
   */
  constructor(name, maxHp, size = 1) {
    super(name, maxHp, size);
    // Size 2: damage 1, accuracy 3. Size 1 (default): damage 1, accuracy 4.
    this.damage = 1;
    this.accuracy = size >= 2 ? 3 : 4;
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
   * @param {number} [size=1]
   */
  constructor(name, maxHp, size = 1) {
    super(name, maxHp, size);
    // Size 2: speedBonus 1. Size 1 (default): speedBonus 0.
    this.speedBonus = size >= 2 ? 1 : 0;
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
   * @param {number} [size=1]
   */
  constructor(name, maxHp, size = 1) {
    super(name, maxHp, size);
    // Size 2: evasionBonus 1. Size 1 (default): evasionBonus 0.
    this.evasionBonus = size >= 2 ? 1 : 0;
  }

  /** @returns {'bridge'} */
  get type() { return 'bridge'; }
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

  /** @returns {boolean} False if Weapons component is destroyed — player cannot attack */
  get canAttack() {
    const weapons = this.getComponent('Weapons');
    return weapons ? !weapons.destroyed : false;
  }

  /** @returns {boolean} True if Bridge component is destroyed */
  get isBridgeDestroyed() {
    const bridge = this.getComponent('Bridge');
    return bridge ? bridge.destroyed : false;
  }

  /** @returns {boolean} True if Engines component is destroyed */
  get isEngineDestroyed() {
    const engines = this.getComponent('Engines');
    return engines ? engines.destroyed : false;
  }
}

/**
 * Enemy ship with 1 HP per component and behavioral getters.
 * Bridge destruction is the ONLY way to fully defeat an enemy.
 */
export class EnemyShip extends Ship {
  /**
   * @param {ShipComponent[]} [components] - Optional custom components
   */
  constructor(components) {
    const defaultComponents = [
      new ShipComponent('Weapons', 1),
      new ShipComponent('Engines', 1),
      new ShipComponent('Bridge', 1),
    ];
    super('Enemy Ship', components || defaultComponents);
  }

  /** @returns {boolean} False if Weapons component is destroyed — enemy auto-misses attacks */
  get canAttack() {
    const weapons = this.getComponent('Weapons');
    return weapons ? !weapons.destroyed : false;
  }

  /** @returns {boolean} False if Engines component is destroyed */
  get canFlee() {
    const engines = this.getComponent('Engines');
    return engines ? !engines.destroyed : false;
  }

  /** @returns {boolean} True if Bridge component is destroyed — enemy fully defeated */
  get isBridgeDestroyed() {
    const bridge = this.getComponent('Bridge');
    return bridge ? bridge.destroyed : false;
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

    const { roll } = this.rollAttack();
    const isHit = (roll + this.rollBonus) >= this.hitThreshold;
    let destroyed = false;

    if (isHit) {
      const component = this.enemyShip.getComponent(targetComponentName);
      if (component && !component.destroyed) {
        const dmgResult = component.takeDamage(1);
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

    // Pick random active player component
    const activeComponents = this.playerShip.getActiveComponents();
    const targetIndex = Math.floor(this.rng() * activeComponents.length);
    const target = activeComponents[targetIndex];

    const { roll, isHit } = this.rollAttack();
    let destroyed = false;

    if (isHit) {
      const dmgResult = target.takeDamage(1);
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
