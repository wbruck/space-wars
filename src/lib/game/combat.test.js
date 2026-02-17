import { describe, it, expect } from 'vitest';
import { ShipComponent, WeaponComponent, EngineComponent, BridgeComponent, ComponentContainer, Ship, PlayerShip, EnemyShip, CombatEngine, getApproachAdvantage, getApproachPosition } from './combat.js';

/** Standard PlayerShip loadout (the old defaults) for tests that need a fully equipped ship. */
function standardPlayerShip() {
  return new PlayerShip({
    powerLimit: 7,
    components: [
      new WeaponComponent('Weapons', 4, 2),
      new EngineComponent('Engines', 4, 2),
      new BridgeComponent('Bridge', 3, 2),
    ],
  });
}

describe('ShipComponent', () => {
  it('constructs with correct properties', () => {
    const comp = new ShipComponent('Weapons', 3);
    expect(comp.name).toBe('Weapons');
    expect(comp.maxHp).toBe(3);
    expect(comp.currentHp).toBe(3);
  });

  it('starts not destroyed', () => {
    const comp = new ShipComponent('Engines', 2);
    expect(comp.destroyed).toBe(false);
  });

  it('takeDamage reduces currentHp', () => {
    const comp = new ShipComponent('Bridge', 3);
    comp.takeDamage(1);
    expect(comp.currentHp).toBe(2);
    expect(comp.destroyed).toBe(false);
  });

  it('takeDamage clamps to min 0', () => {
    const comp = new ShipComponent('Weapons', 2);
    comp.takeDamage(5);
    expect(comp.currentHp).toBe(0);
    expect(comp.destroyed).toBe(true);
  });

  it('takeDamage returns destroyed: true when hit destroys component', () => {
    const comp = new ShipComponent('Engines', 1);
    const result = comp.takeDamage(1);
    expect(result.destroyed).toBe(true);
  });

  it('takeDamage returns destroyed: false when component survives', () => {
    const comp = new ShipComponent('Bridge', 3);
    const result = comp.takeDamage(1);
    expect(result.destroyed).toBe(false);
  });

  it('takeDamage returns destroyed: false when already destroyed', () => {
    const comp = new ShipComponent('Weapons', 1);
    comp.takeDamage(1);
    expect(comp.destroyed).toBe(true);
    const result = comp.takeDamage(1);
    expect(result.destroyed).toBe(false);
  });

  it('destroyed getter is true when currentHp is exactly 0', () => {
    const comp = new ShipComponent('Bridge', 2);
    comp.takeDamage(2);
    expect(comp.currentHp).toBe(0);
    expect(comp.destroyed).toBe(true);
  });

  it('handles multiple damage calls', () => {
    const comp = new ShipComponent('Engines', 3);
    comp.takeDamage(1);
    expect(comp.currentHp).toBe(2);
    comp.takeDamage(1);
    expect(comp.currentHp).toBe(1);
    comp.takeDamage(1);
    expect(comp.currentHp).toBe(0);
    expect(comp.destroyed).toBe(true);
  });
});

describe('ShipComponent powerCost property', () => {
  it('defaults powerCost to 1', () => {
    const comp = new ShipComponent('Test', 2);
    expect(comp.powerCost).toBe(1);
  });

  it('accepts custom powerCost', () => {
    const comp = new ShipComponent('Test', 2, 3);
    expect(comp.powerCost).toBe(3);
  });
});

describe('WeaponComponent', () => {
  it('extends ShipComponent', () => {
    const w = new WeaponComponent('Laser', 2);
    expect(w).toBeInstanceOf(ShipComponent);
  });

  it('has type getter returning "weapon"', () => {
    const w = new WeaponComponent('Laser', 2);
    expect(w.type).toBe('weapon');
  });

  it('powerCost 1 defaults: damage 1, accuracy 4', () => {
    const w = new WeaponComponent('Laser', 1, 1);
    expect(w.damage).toBe(1);
    expect(w.accuracy).toBe(4);
    expect(w.maxHp).toBe(1);
    expect(w.powerCost).toBe(1);
  });

  it('powerCost 2 defaults: damage 1, accuracy 3', () => {
    const w = new WeaponComponent('Laser', 2, 2);
    expect(w.damage).toBe(1);
    expect(w.accuracy).toBe(3);
    expect(w.maxHp).toBe(2);
    expect(w.powerCost).toBe(2);
  });

  it('defaults powerCost to 1 when omitted', () => {
    const w = new WeaponComponent('Laser', 1);
    expect(w.powerCost).toBe(1);
    expect(w.accuracy).toBe(4);
  });

  it('inherits takeDamage and destroyed', () => {
    const w = new WeaponComponent('Laser', 1);
    expect(w.destroyed).toBe(false);
    w.takeDamage(1);
    expect(w.destroyed).toBe(true);
  });
});

describe('EngineComponent', () => {
  it('extends ShipComponent', () => {
    const e = new EngineComponent('Thrusters', 2);
    expect(e).toBeInstanceOf(ShipComponent);
  });

  it('has type getter returning "engine"', () => {
    const e = new EngineComponent('Thrusters', 2);
    expect(e.type).toBe('engine');
  });

  it('powerCost 1 defaults: speedBonus 0', () => {
    const e = new EngineComponent('Thrusters', 1, 1);
    expect(e.speedBonus).toBe(0);
    expect(e.maxHp).toBe(1);
    expect(e.powerCost).toBe(1);
  });

  it('powerCost 2 defaults: speedBonus 1', () => {
    const e = new EngineComponent('Thrusters', 2, 2);
    expect(e.speedBonus).toBe(1);
    expect(e.maxHp).toBe(2);
    expect(e.powerCost).toBe(2);
  });

  it('defaults powerCost to 1 when omitted', () => {
    const e = new EngineComponent('Thrusters', 1);
    expect(e.powerCost).toBe(1);
    expect(e.speedBonus).toBe(0);
  });

  it('inherits takeDamage and destroyed', () => {
    const e = new EngineComponent('Thrusters', 1);
    expect(e.destroyed).toBe(false);
    e.takeDamage(1);
    expect(e.destroyed).toBe(true);
  });
});

describe('BridgeComponent', () => {
  it('extends ShipComponent', () => {
    const b = new BridgeComponent('Command', 2);
    expect(b).toBeInstanceOf(ShipComponent);
  });

  it('has type getter returning "bridge"', () => {
    const b = new BridgeComponent('Command', 2);
    expect(b.type).toBe('bridge');
  });

  it('powerCost 1 defaults: evasionBonus 0', () => {
    const b = new BridgeComponent('Command', 1, 1);
    expect(b.evasionBonus).toBe(0);
    expect(b.maxHp).toBe(1);
    expect(b.powerCost).toBe(1);
  });

  it('powerCost 2 defaults: evasionBonus 1', () => {
    const b = new BridgeComponent('Command', 3, 2);
    expect(b.evasionBonus).toBe(1);
    expect(b.maxHp).toBe(3);
    expect(b.powerCost).toBe(2);
  });

  it('defaults powerCost to 1 when omitted', () => {
    const b = new BridgeComponent('Command', 1);
    expect(b.powerCost).toBe(1);
    expect(b.evasionBonus).toBe(0);
  });

  it('inherits takeDamage and destroyed', () => {
    const b = new BridgeComponent('Command', 1);
    expect(b.destroyed).toBe(false);
    b.takeDamage(1);
    expect(b.destroyed).toBe(true);
  });
});

describe('ComponentContainer mixin', () => {
  // Create a simple test class using the mixin
  class TestBase {}
  const TestContainer = ComponentContainer(TestBase);

  function makeContainer(powerLimit = 10) {
    const container = new TestContainer();
    container.powerLimit = powerLimit;
    return container;
  }

  describe('mixin basics', () => {
    it('is a function that returns a class', () => {
      expect(typeof ComponentContainer).toBe('function');
      expect(typeof TestContainer).toBe('function');
    });

    it('resulting class extends the base', () => {
      const container = new TestContainer();
      expect(container).toBeInstanceOf(TestBase);
    });

    it('starts with empty components and Infinity powerLimit', () => {
      const container = new TestContainer();
      expect(container.components).toEqual([]);
      expect(container.powerLimit).toBe(Infinity);
    });
  });

  describe('addComponent', () => {
    it('adds a component to the internal array', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('Laser', 2, 1);
      container.addComponent(w);
      expect(container.components).toHaveLength(1);
      expect(container.components[0]).toBe(w);
    });

    it('allows adding multiple components within budget', () => {
      const container = makeContainer(5);
      container.addComponent(new WeaponComponent('Laser', 2, 1));
      container.addComponent(new EngineComponent('Thrusters', 2, 2));
      container.addComponent(new BridgeComponent('Bridge', 1, 1));
      expect(container.components).toHaveLength(3);
      expect(container.totalPower).toBe(4);
    });

    it('throws when adding would exceed powerLimit', () => {
      const container = makeContainer(2);
      container.addComponent(new WeaponComponent('Laser', 2, 2));
      expect(() => {
        container.addComponent(new EngineComponent('Thrusters', 1, 1));
      }).toThrow(/exceed powerLimit/);
    });

    it('throws when adding exactly exceeds powerLimit', () => {
      const container = makeContainer(3);
      container.addComponent(new WeaponComponent('Laser', 2, 2));
      expect(() => {
        container.addComponent(new EngineComponent('Thrusters', 1, 2));
      }).toThrow(/exceed powerLimit/);
    });

    it('allows adding up to exact powerLimit', () => {
      const container = makeContainer(3);
      container.addComponent(new WeaponComponent('Laser', 2, 2));
      container.addComponent(new EngineComponent('Thrusters', 1, 1));
      expect(container.totalPower).toBe(3);
      expect(container.remainingPower).toBe(0);
    });

    it('throws when adding a second BridgeComponent', () => {
      const container = makeContainer(10);
      container.addComponent(new BridgeComponent('Bridge1', 1, 1));
      expect(() => {
        container.addComponent(new BridgeComponent('Bridge2', 1, 1));
      }).toThrow(/second BridgeComponent/);
    });

    it('allows adding bridge after removing previous bridge', () => {
      const container = makeContainer(10);
      container.addComponent(new BridgeComponent('Bridge1', 1, 1));
      container.removeComponent('Bridge1');
      container.addComponent(new BridgeComponent('Bridge2', 1, 1));
      expect(container.components).toHaveLength(1);
      expect(container.components[0].name).toBe('Bridge2');
    });

    it('allows multiple weapons', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('Laser', 2, 1));
      container.addComponent(new WeaponComponent('Missiles', 2, 1));
      expect(container.getComponentsByType('weapon')).toHaveLength(2);
    });

    it('allows multiple engines', () => {
      const container = makeContainer(10);
      container.addComponent(new EngineComponent('Main', 2, 2));
      container.addComponent(new EngineComponent('Aux', 1, 1));
      expect(container.getComponentsByType('engine')).toHaveLength(2);
    });
  });

  describe('removeComponent', () => {
    it('removes a component by name and returns it', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('Laser', 2, 1);
      container.addComponent(w);
      const removed = container.removeComponent('Laser');
      expect(removed).toBe(w);
      expect(container.components).toHaveLength(0);
    });

    it('returns undefined for unknown name', () => {
      const container = makeContainer(10);
      expect(container.removeComponent('Nonexistent')).toBeUndefined();
    });

    it('frees power after removal', () => {
      const container = makeContainer(3);
      container.addComponent(new WeaponComponent('Laser', 2, 2));
      expect(container.remainingPower).toBe(1);
      container.removeComponent('Laser');
      expect(container.remainingPower).toBe(3);
    });

    it('only removes the first matching component', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('Gun', 1, 1));
      container.addComponent(new WeaponComponent('Gun', 2, 1));
      container.removeComponent('Gun');
      expect(container.components).toHaveLength(1);
      expect(container.components[0].maxHp).toBe(2);
    });
  });

  describe('totalPower and remainingPower', () => {
    it('totalPower is 0 when empty', () => {
      const container = makeContainer(10);
      expect(container.totalPower).toBe(0);
    });

    it('totalPower sums all component power costs', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('W', 1, 2));
      container.addComponent(new EngineComponent('E', 1, 3));
      expect(container.totalPower).toBe(5);
    });

    it('totalPower includes destroyed components', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('W', 1, 2);
      container.addComponent(w);
      w.takeDamage(1); // destroy it
      expect(w.destroyed).toBe(true);
      expect(container.totalPower).toBe(2);
    });

    it('remainingPower reflects powerLimit - totalPower', () => {
      const container = makeContainer(7);
      container.addComponent(new WeaponComponent('W', 1, 2));
      container.addComponent(new EngineComponent('E', 1, 2));
      expect(container.remainingPower).toBe(3);
    });
  });

  describe('getComponentsByType and hasComponentType', () => {
    it('getComponentsByType returns matching components', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('Laser', 2, 1));
      container.addComponent(new WeaponComponent('Missiles', 2, 1));
      container.addComponent(new EngineComponent('Thrusters', 2, 1));
      const weapons = container.getComponentsByType('weapon');
      expect(weapons).toHaveLength(2);
      expect(weapons.every(c => c.type === 'weapon')).toBe(true);
    });

    it('getComponentsByType returns empty for no matches', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('Laser', 2, 1));
      expect(container.getComponentsByType('bridge')).toEqual([]);
    });

    it('hasComponentType returns true when type exists', () => {
      const container = makeContainer(10);
      container.addComponent(new BridgeComponent('Bridge', 1, 1));
      expect(container.hasComponentType('bridge')).toBe(true);
    });

    it('hasComponentType returns false when type does not exist', () => {
      const container = makeContainer(10);
      expect(container.hasComponentType('bridge')).toBe(false);
    });

    it('includes destroyed components in type queries', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('Laser', 1, 1);
      container.addComponent(w);
      w.takeDamage(1);
      expect(w.destroyed).toBe(true);
      expect(container.getComponentsByType('weapon')).toHaveLength(1);
      expect(container.hasComponentType('weapon')).toBe(true);
    });
  });

  describe('getComponent (backward compat)', () => {
    it('returns component by name', () => {
      const container = makeContainer(10);
      const b = new BridgeComponent('Bridge', 1, 1);
      container.addComponent(b);
      expect(container.getComponent('Bridge')).toBe(b);
    });

    it('returns undefined for unknown name', () => {
      const container = makeContainer(10);
      expect(container.getComponent('Nope')).toBeUndefined();
    });
  });

  describe('getActiveComponents', () => {
    it('returns only non-destroyed components', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('Laser', 1, 1);
      const e = new EngineComponent('Thrusters', 2, 1);
      container.addComponent(w);
      container.addComponent(e);
      w.takeDamage(1); // destroy
      const active = container.getActiveComponents();
      expect(active).toHaveLength(1);
      expect(active[0]).toBe(e);
    });

    it('returns all when none destroyed', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('W', 2, 1));
      container.addComponent(new EngineComponent('E', 2, 1));
      expect(container.getActiveComponents()).toHaveLength(2);
    });

    it('returns empty when all destroyed', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('W', 1, 1);
      container.addComponent(w);
      w.takeDamage(1);
      expect(container.getActiveComponents()).toHaveLength(0);
    });
  });

  describe('isDestroyed', () => {
    it('is false when components have HP', () => {
      const container = makeContainer(10);
      container.addComponent(new WeaponComponent('W', 2, 1));
      expect(container.isDestroyed).toBe(false);
    });

    it('is true when all components destroyed', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('W', 1, 1);
      const e = new EngineComponent('E', 1, 1);
      container.addComponent(w);
      container.addComponent(e);
      w.takeDamage(1);
      e.takeDamage(1);
      expect(container.isDestroyed).toBe(true);
    });

    it('is false when empty (no components)', () => {
      const container = makeContainer(10);
      expect(container.isDestroyed).toBe(false);
    });
  });

  describe('components getter', () => {
    it('returns the internal _components array', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('W', 1, 1);
      container.addComponent(w);
      expect(container.components).toEqual([w]);
      expect(container.components).toBe(container._components);
    });

    it('destroyed components remain in the array', () => {
      const container = makeContainer(10);
      const w = new WeaponComponent('W', 1, 1);
      container.addComponent(w);
      w.takeDamage(1);
      expect(w.destroyed).toBe(true);
      expect(container.components).toHaveLength(1);
      expect(container.components[0]).toBe(w);
    });
  });
});

describe('Ship', () => {
  function makeShip() {
    return new Ship('Test Ship', [
      new ShipComponent('Weapons', 2),
      new ShipComponent('Engines', 1),
      new ShipComponent('Bridge', 2),
    ]);
  }

  it('constructs with name and components', () => {
    const ship = makeShip();
    expect(ship.name).toBe('Test Ship');
    expect(ship.components).toHaveLength(3);
  });

  it('isDestroyed is false when any component has HP', () => {
    const ship = makeShip();
    expect(ship.isDestroyed).toBe(false);
  });

  it('isDestroyed is true when all components destroyed', () => {
    const ship = makeShip();
    for (const c of ship.components) {
      c.takeDamage(c.maxHp);
    }
    expect(ship.isDestroyed).toBe(true);
  });

  it('getActiveComponents returns only alive components', () => {
    const ship = makeShip();
    ship.getComponent('Engines').takeDamage(1);
    const active = ship.getActiveComponents();
    expect(active).toHaveLength(2);
    expect(active.map(c => c.name)).toEqual(['Weapons', 'Bridge']);
  });

  it('getActiveComponents returns all when none destroyed', () => {
    const ship = makeShip();
    expect(ship.getActiveComponents()).toHaveLength(3);
  });

  it('getActiveComponents returns empty when all destroyed', () => {
    const ship = makeShip();
    for (const c of ship.components) {
      c.takeDamage(c.maxHp);
    }
    expect(ship.getActiveComponents()).toHaveLength(0);
  });

  it('getComponent returns the named component', () => {
    const ship = makeShip();
    const bridge = ship.getComponent('Bridge');
    expect(bridge).toBeDefined();
    expect(bridge.name).toBe('Bridge');
    expect(bridge.maxHp).toBe(2);
  });

  it('getComponent returns undefined for unknown name', () => {
    const ship = makeShip();
    expect(ship.getComponent('Shields')).toBeUndefined();
  });

  // US-003: Ship uses ComponentContainer mixin
  it('uses ComponentContainer mixin (has addComponent)', () => {
    const ship = makeShip();
    expect(typeof ship.addComponent).toBe('function');
    expect(typeof ship.removeComponent).toBe('function');
    expect(typeof ship.getComponentsByType).toBe('function');
    expect(typeof ship.hasComponentType).toBe('function');
  });

  it('accepts options object with powerLimit and components', () => {
    const ship = new Ship('Custom', {
      powerLimit: 5,
      components: [
        new WeaponComponent('Laser', 2, 2),
        new EngineComponent('Thrusters', 1, 1),
      ],
    });
    expect(ship.name).toBe('Custom');
    expect(ship.powerLimit).toBe(5);
    expect(ship.components).toHaveLength(2);
    expect(ship.totalPower).toBe(3);
    expect(ship.remainingPower).toBe(2);
  });

  it('options form enforces powerLimit', () => {
    expect(() => {
      new Ship('Overloaded', {
        powerLimit: 2,
        components: [
          new WeaponComponent('Laser', 2, 2),
          new EngineComponent('Thrusters', 1, 1),
        ],
      });
    }).toThrow(/exceed powerLimit/);
  });

  it('legacy array form defaults powerLimit to Infinity', () => {
    const ship = makeShip();
    expect(ship.powerLimit).toBe(Infinity);
  });

  it('destroyed components remain in array (never auto-removed)', () => {
    const ship = makeShip();
    ship.getComponent('Engines').takeDamage(1);
    expect(ship.getComponent('Engines').destroyed).toBe(true);
    expect(ship.components).toHaveLength(3);
  });

  it('isDestroyed is read-only status — does not trigger removal', () => {
    const ship = makeShip();
    for (const c of ship.components) {
      c.takeDamage(c.maxHp);
    }
    expect(ship.isDestroyed).toBe(true);
    // All components still present
    expect(ship.components).toHaveLength(3);
    // Components iterable for future salvage
    expect(ship.components.map(c => c.name)).toEqual(['Weapons', 'Engines', 'Bridge']);
  });
});

describe('PlayerShip', () => {
  it('creates with empty components by default', () => {
    const ship = new PlayerShip();
    expect(ship.name).toBe('Player Ship');
    expect(ship.components).toHaveLength(0);
  });

  it('default powerLimit is 7', () => {
    const ship = new PlayerShip();
    expect(ship.powerLimit).toBe(7);
  });

  it('default totalPower is 0 (no components)', () => {
    const ship = new PlayerShip();
    expect(ship.totalPower).toBe(0);
    expect(ship.remainingPower).toBe(7);
  });

  it('standardPlayerShip has correct Weapons', () => {
    const ship = standardPlayerShip();
    const weapons = ship.getComponent('Weapons');
    expect(weapons).toBeInstanceOf(WeaponComponent);
    expect(weapons.maxHp).toBe(4);
    expect(weapons.currentHp).toBe(4);
    expect(weapons.powerCost).toBe(2);
    expect(weapons.type).toBe('weapon');
    expect(weapons.damage).toBe(1);
    expect(weapons.accuracy).toBe(3);
  });

  it('standardPlayerShip has correct Engines', () => {
    const ship = standardPlayerShip();
    const engines = ship.getComponent('Engines');
    expect(engines).toBeInstanceOf(EngineComponent);
    expect(engines.maxHp).toBe(4);
    expect(engines.currentHp).toBe(4);
    expect(engines.powerCost).toBe(2);
    expect(engines.type).toBe('engine');
    expect(engines.speedBonus).toBe(1);
  });

  it('standardPlayerShip has correct Bridge', () => {
    const ship = standardPlayerShip();
    const bridge = ship.getComponent('Bridge');
    expect(bridge).toBeInstanceOf(BridgeComponent);
    expect(bridge.maxHp).toBe(3);
    expect(bridge.currentHp).toBe(3);
    expect(bridge.powerCost).toBe(2);
    expect(bridge.type).toBe('bridge');
    expect(bridge.evasionBonus).toBe(1);
  });

  it('is instanceof Ship', () => {
    const ship = new PlayerShip();
    expect(ship).toBeInstanceOf(Ship);
  });

  it('accepts legacy custom components array', () => {
    const custom = [
      new ShipComponent('Laser', 5),
      new ShipComponent('Shield', 3),
    ];
    const ship = new PlayerShip(custom);
    expect(ship.components).toHaveLength(2);
    expect(ship.getComponent('Laser').maxHp).toBe(5);
    expect(ship.getComponent('Shield').maxHp).toBe(3);
  });

  it('legacy custom components work with empty default', () => {
    const custom = [new ShipComponent('Weapons', 10)];
    const ship = new PlayerShip(custom);
    expect(ship.components).toHaveLength(1);
    expect(ship.getComponent('Weapons').maxHp).toBe(10);
    expect(ship.getComponent('Engines')).toBeUndefined();
  });

  it('accepts options object with powerLimit and components', () => {
    const ship = new PlayerShip({
      powerLimit: 5,
      components: [
        new WeaponComponent('Laser', 2, 1),
        new EngineComponent('Thrusters', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    expect(ship.powerLimit).toBe(5);
    expect(ship.components).toHaveLength(3);
    expect(ship.totalPower).toBe(3);
    expect(ship.remainingPower).toBe(2);
  });

  it('options object defaults to powerLimit 7 and empty components', () => {
    const ship = new PlayerShip({});
    expect(ship.powerLimit).toBe(7);
    expect(ship.components).toHaveLength(0);
  });

  // isBridgeDestroyed getter
  it('isBridgeDestroyed is false when no Bridge installed', () => {
    const ship = new PlayerShip();
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  it('isBridgeDestroyed is true when Bridge is destroyed', () => {
    const ship = standardPlayerShip();
    ship.getComponent('Bridge').takeDamage(3);
    expect(ship.isBridgeDestroyed).toBe(true);
  });

  it('isBridgeDestroyed is false when Bridge is damaged but not destroyed', () => {
    const ship = standardPlayerShip();
    ship.getComponent('Bridge').takeDamage(1);
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  it('isBridgeDestroyed returns false if no Bridge component exists', () => {
    const ship = new PlayerShip([new ShipComponent('Laser', 2)]);
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  // canAttack getter — uses type-based query
  it('canAttack is true when Weapons is active', () => {
    const ship = standardPlayerShip();
    expect(ship.canAttack).toBe(true);
  });

  it('canAttack is false when all weapons are destroyed', () => {
    const ship = standardPlayerShip();
    ship.getComponent('Weapons').takeDamage(4);
    expect(ship.canAttack).toBe(false);
  });

  it('canAttack is true when Weapons is damaged but not destroyed', () => {
    const ship = standardPlayerShip();
    ship.getComponent('Weapons').takeDamage(1);
    expect(ship.canAttack).toBe(true);
  });

  it('canAttack returns false if no weapon components exist', () => {
    const ship = new PlayerShip([new ShipComponent('Laser', 2)]);
    expect(ship.canAttack).toBe(false);
  });

  it('canAttack returns false for empty ship', () => {
    const ship = new PlayerShip();
    expect(ship.canAttack).toBe(false);
  });

  // isEngineDestroyed getter — uses type-based query, checks ALL engines
  it('isEngineDestroyed is false when Engines is active', () => {
    const ship = standardPlayerShip();
    expect(ship.isEngineDestroyed).toBe(false);
  });

  it('isEngineDestroyed is true when all engines are destroyed', () => {
    const ship = standardPlayerShip();
    ship.getComponent('Engines').takeDamage(4);
    expect(ship.isEngineDestroyed).toBe(true);
  });

  it('isEngineDestroyed returns true if no engine components exist', () => {
    const ship = new PlayerShip([new ShipComponent('Laser', 2)]);
    expect(ship.isEngineDestroyed).toBe(true);
  });

  it('isEngineDestroyed returns true for empty ship', () => {
    const ship = new PlayerShip();
    expect(ship.isEngineDestroyed).toBe(true);
  });

  // US-004: powerLimit enforcement
  it('enforces powerLimit — cannot exceed budget', () => {
    expect(() => {
      new PlayerShip({
        powerLimit: 3,
        components: [
          new WeaponComponent('W', 2, 2),
          new EngineComponent('E', 2, 2),
        ],
      });
    }).toThrow(/exceed powerLimit/);
  });

  // US-004: multiple weapons
  it('canAttack is true when one of multiple weapons is active', () => {
    const ship = new PlayerShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Laser', 2, 1),
        new WeaponComponent('Missiles', 2, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    // Destroy first weapon
    ship.getComponent('Laser').takeDamage(2);
    expect(ship.canAttack).toBe(true); // Missiles still active
  });

  it('canAttack is false only when ALL weapons are destroyed', () => {
    const ship = new PlayerShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Laser', 1, 1),
        new WeaponComponent('Missiles', 1, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Laser').takeDamage(1);
    ship.getComponent('Missiles').takeDamage(1);
    expect(ship.canAttack).toBe(false);
  });

  // US-004: multiple engines — isEngineDestroyed checks ALL
  it('isEngineDestroyed is false when one of multiple engines is active', () => {
    const ship = new PlayerShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Main Engine', 1, 1),
        new EngineComponent('Aux Engine', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Main Engine').takeDamage(1);
    expect(ship.isEngineDestroyed).toBe(false); // Aux still active
  });

  it('isEngineDestroyed is true only when ALL engines are destroyed', () => {
    const ship = new PlayerShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Main Engine', 1, 1),
        new EngineComponent('Aux Engine', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Main Engine').takeDamage(1);
    ship.getComponent('Aux Engine').takeDamage(1);
    expect(ship.isEngineDestroyed).toBe(true);
  });

  // getComponent works with explicitly added components
  it('getComponent("Weapons") returns the weapon', () => {
    const ship = standardPlayerShip();
    const w = ship.getComponent('Weapons');
    expect(w).toBeDefined();
    expect(w.name).toBe('Weapons');
  });

  it('getComponent("Engines") returns the engine', () => {
    const ship = standardPlayerShip();
    const e = ship.getComponent('Engines');
    expect(e).toBeDefined();
    expect(e.name).toBe('Engines');
  });

  it('getComponent("Bridge") returns the bridge', () => {
    const ship = standardPlayerShip();
    const b = ship.getComponent('Bridge');
    expect(b).toBeDefined();
    expect(b.name).toBe('Bridge');
  });

  it('legacy array form sets powerLimit to 7', () => {
    const ship = new PlayerShip([new ShipComponent('Test', 1)]);
    expect(ship.powerLimit).toBe(7);
  });

  it('legacy array form enforces powerLimit 7', () => {
    expect(() => {
      new PlayerShip([
        new WeaponComponent('W', 2, 2),
        new EngineComponent('E', 2, 2),
        new EngineComponent('E2', 2, 2),
        new BridgeComponent('B', 3, 2),
      ]);
    }).toThrow(/exceed powerLimit/);
  });
});

describe('EnemyShip', () => {
  it('creates with default components', () => {
    const ship = new EnemyShip();
    expect(ship.name).toBe('Enemy Ship');
    expect(ship.components).toHaveLength(3);
  });

  it('default Weapons has 1 HP', () => {
    const ship = new EnemyShip();
    const weapons = ship.getComponent('Weapons');
    expect(weapons.maxHp).toBe(1);
    expect(weapons.currentHp).toBe(1);
  });

  it('default Engines has 1 HP', () => {
    const ship = new EnemyShip();
    const engines = ship.getComponent('Engines');
    expect(engines.maxHp).toBe(1);
    expect(engines.currentHp).toBe(1);
  });

  it('default Bridge has 1 HP', () => {
    const ship = new EnemyShip();
    const bridge = ship.getComponent('Bridge');
    expect(bridge.maxHp).toBe(1);
    expect(bridge.currentHp).toBe(1);
  });

  it('is instanceof Ship', () => {
    const ship = new EnemyShip();
    expect(ship).toBeInstanceOf(Ship);
  });

  it('accepts custom components', () => {
    const custom = [
      new ShipComponent('Weapons', 3),
      new ShipComponent('Engines', 2),
      new ShipComponent('Bridge', 2),
    ];
    const ship = new EnemyShip(custom);
    expect(ship.components).toHaveLength(3);
    expect(ship.getComponent('Weapons').maxHp).toBe(3);
  });

  // canAttack getter
  it('canAttack is true when Weapons is active', () => {
    const ship = new EnemyShip();
    expect(ship.canAttack).toBe(true);
  });

  it('canAttack is false when Weapons is destroyed', () => {
    const ship = new EnemyShip();
    ship.getComponent('Weapons').takeDamage(1);
    expect(ship.canAttack).toBe(false);
  });

  // canFlee getter
  it('canFlee is true when Engines is active', () => {
    const ship = new EnemyShip();
    expect(ship.canFlee).toBe(true);
  });

  it('canFlee is false when Engines is destroyed', () => {
    const ship = new EnemyShip();
    ship.getComponent('Engines').takeDamage(1);
    expect(ship.canFlee).toBe(false);
  });

  // isBridgeDestroyed getter
  it('isBridgeDestroyed is false when Bridge is active', () => {
    const ship = new EnemyShip();
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  it('isBridgeDestroyed is true when Bridge is destroyed', () => {
    const ship = new EnemyShip();
    ship.getComponent('Bridge').takeDamage(1);
    expect(ship.isBridgeDestroyed).toBe(true);
  });

  // Bridge destruction = instant win regardless of other components
  it('destroying Bridge is victory even with other components alive', () => {
    const ship = new EnemyShip();
    // Weapons and Engines still active
    expect(ship.canAttack).toBe(true);
    expect(ship.canFlee).toBe(true);
    // Destroy only Bridge
    ship.getComponent('Bridge').takeDamage(1);
    expect(ship.isBridgeDestroyed).toBe(true);
    // Ship is NOT fully destroyed (isDestroyed checks ALL components)
    expect(ship.isDestroyed).toBe(false);
    // But Bridge destroyed = player victory
    expect(ship.isBridgeDestroyed).toBe(true);
  });

  // Behavioral combinations
  it('destroying Weapons disables attack but not flee', () => {
    const ship = new EnemyShip();
    ship.getComponent('Weapons').takeDamage(1);
    expect(ship.canAttack).toBe(false);
    expect(ship.canFlee).toBe(true);
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  it('destroying Engines disables flee but not attack', () => {
    const ship = new EnemyShip();
    ship.getComponent('Engines').takeDamage(1);
    expect(ship.canFlee).toBe(false);
    expect(ship.canAttack).toBe(true);
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  it('destroying all components makes ship fully destroyed', () => {
    const ship = new EnemyShip();
    for (const c of ship.components) {
      c.takeDamage(c.maxHp);
    }
    expect(ship.isDestroyed).toBe(true);
    expect(ship.canAttack).toBe(false);
    expect(ship.canFlee).toBe(false);
    expect(ship.isBridgeDestroyed).toBe(true);
  });

  // Edge: custom ship without standard component names
  it('canAttack returns false if no Weapons component exists', () => {
    const ship = new EnemyShip([new ShipComponent('Laser', 2)]);
    expect(ship.canAttack).toBe(false);
  });

  it('canFlee returns false if no Engines component exists', () => {
    const ship = new EnemyShip([new ShipComponent('Laser', 2)]);
    expect(ship.canFlee).toBe(false);
  });

  it('isBridgeDestroyed returns false if no Bridge component exists', () => {
    const ship = new EnemyShip([new ShipComponent('Laser', 2)]);
    expect(ship.isBridgeDestroyed).toBe(false);
  });

  // US-005: typed components and powerLimit
  it('default powerLimit is 4', () => {
    const ship = new EnemyShip();
    expect(ship.powerLimit).toBe(4);
  });

  it('default totalPower is 3 (three power-1 components)', () => {
    const ship = new EnemyShip();
    expect(ship.totalPower).toBe(3);
    expect(ship.remainingPower).toBe(1);
  });

  it('default Weapons is a WeaponComponent with 1 HP, powerCost 1', () => {
    const ship = new EnemyShip();
    const weapons = ship.getComponent('Weapons');
    expect(weapons).toBeInstanceOf(WeaponComponent);
    expect(weapons.maxHp).toBe(1);
    expect(weapons.powerCost).toBe(1);
    expect(weapons.type).toBe('weapon');
    expect(weapons.damage).toBe(1);
    expect(weapons.accuracy).toBe(4);
  });

  it('default Engines is an EngineComponent with 1 HP, powerCost 1', () => {
    const ship = new EnemyShip();
    const engines = ship.getComponent('Engines');
    expect(engines).toBeInstanceOf(EngineComponent);
    expect(engines.maxHp).toBe(1);
    expect(engines.powerCost).toBe(1);
    expect(engines.type).toBe('engine');
    expect(engines.speedBonus).toBe(0);
  });

  it('default Bridge is a BridgeComponent with 1 HP, powerCost 1', () => {
    const ship = new EnemyShip();
    const bridge = ship.getComponent('Bridge');
    expect(bridge).toBeInstanceOf(BridgeComponent);
    expect(bridge.maxHp).toBe(1);
    expect(bridge.powerCost).toBe(1);
    expect(bridge.type).toBe('bridge');
    expect(bridge.evasionBonus).toBe(0);
  });

  // US-005: options object constructor
  it('accepts options object with powerLimit and components', () => {
    const ship = new EnemyShip({
      powerLimit: 6,
      components: [
        new WeaponComponent('Laser', 2, 2),
        new EngineComponent('Thrusters', 2, 2),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    expect(ship.powerLimit).toBe(6);
    expect(ship.components).toHaveLength(3);
    expect(ship.totalPower).toBe(5);
    expect(ship.remainingPower).toBe(1);
  });

  it('options object defaults to powerLimit 4 and default components', () => {
    const ship = new EnemyShip({});
    expect(ship.powerLimit).toBe(4);
    expect(ship.components).toHaveLength(3);
    expect(ship.getComponent('Weapons')).toBeInstanceOf(WeaponComponent);
  });

  it('enforces powerLimit — cannot exceed budget', () => {
    expect(() => {
      new EnemyShip({
        powerLimit: 3,
        components: [
          new WeaponComponent('W', 1, 2),
          new EngineComponent('E', 1, 2),
        ],
      });
    }).toThrow(/exceed powerLimit/);
  });

  // US-005: variable powerLimit for difficulty scaling
  it('supports variable powerLimit for scaled enemy ships', () => {
    const weakEnemy = new EnemyShip({ powerLimit: 3 });
    expect(weakEnemy.powerLimit).toBe(3);
    expect(weakEnemy.totalPower).toBe(3); // default components fit exactly

    const strongEnemy = new EnemyShip({
      powerLimit: 8,
      components: [
        new WeaponComponent('Heavy Laser', 3, 2),
        new WeaponComponent('Missiles', 2, 2),
        new EngineComponent('Engines', 2, 2),
        new BridgeComponent('Bridge', 2, 1),
      ],
    });
    expect(strongEnemy.powerLimit).toBe(8);
    expect(strongEnemy.totalPower).toBe(7);
    expect(strongEnemy.remainingPower).toBe(1);
  });

  // US-005: canAttack with multiple weapons
  it('canAttack is true when one of multiple weapons is active', () => {
    const ship = new EnemyShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Laser', 1, 1),
        new WeaponComponent('Missiles', 1, 1),
        new EngineComponent('Engines', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Laser').takeDamage(1);
    expect(ship.canAttack).toBe(true); // Missiles still active
  });

  it('canAttack is false only when ALL weapons are destroyed', () => {
    const ship = new EnemyShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Laser', 1, 1),
        new WeaponComponent('Missiles', 1, 1),
        new EngineComponent('Engines', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Laser').takeDamage(1);
    ship.getComponent('Missiles').takeDamage(1);
    expect(ship.canAttack).toBe(false);
  });

  // US-005: canFlee with multiple engines
  it('canFlee is true when one of multiple engines is active', () => {
    const ship = new EnemyShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Weapons', 1, 1),
        new EngineComponent('Main Engine', 1, 1),
        new EngineComponent('Aux Engine', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Main Engine').takeDamage(1);
    expect(ship.canFlee).toBe(true); // Aux still active
  });

  it('canFlee is false only when ALL engines are destroyed', () => {
    const ship = new EnemyShip({
      powerLimit: 10,
      components: [
        new WeaponComponent('Weapons', 1, 1),
        new EngineComponent('Main Engine', 1, 1),
        new EngineComponent('Aux Engine', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Main Engine').takeDamage(1);
    ship.getComponent('Aux Engine').takeDamage(1);
    expect(ship.canFlee).toBe(false);
  });

  // US-005: component persistence after ship destruction
  it('all components persist after ship destruction (bridge destroyed)', () => {
    const ship = new EnemyShip();
    ship.getComponent('Bridge').takeDamage(1);
    expect(ship.isBridgeDestroyed).toBe(true);
    // All components still present, including non-destroyed ones
    expect(ship.components).toHaveLength(3);
    expect(ship.getComponent('Weapons').destroyed).toBe(false);
    expect(ship.getComponent('Engines').destroyed).toBe(false);
    expect(ship.getComponent('Weapons').currentHp).toBe(1);
    expect(ship.getComponent('Engines').currentHp).toBe(1);
  });

  it('non-destroyed components retain HP after ship destruction', () => {
    const ship = new EnemyShip({
      powerLimit: 6,
      components: [
        new WeaponComponent('Weapons', 3, 2),
        new EngineComponent('Engines', 2, 2),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    // Damage weapon partially
    ship.getComponent('Weapons').takeDamage(1);
    expect(ship.getComponent('Weapons').currentHp).toBe(2);
    // Destroy bridge
    ship.getComponent('Bridge').takeDamage(1);
    expect(ship.isBridgeDestroyed).toBe(true);
    // Weapons retains partial HP, engines full HP
    expect(ship.getComponent('Weapons').currentHp).toBe(2);
    expect(ship.getComponent('Engines').currentHp).toBe(2);
    // Components array intact
    expect(ship.components).toHaveLength(3);
    expect(ship.components.map(c => c.name)).toEqual(['Weapons', 'Engines', 'Bridge']);
  });

  // US-005: getSalvageableComponents
  it('getSalvageableComponents returns all components when none destroyed', () => {
    const ship = new EnemyShip();
    const salvageable = ship.getSalvageableComponents();
    expect(salvageable).toHaveLength(3);
  });

  it('getSalvageableComponents excludes destroyed components', () => {
    const ship = new EnemyShip();
    ship.getComponent('Weapons').takeDamage(1);
    ship.getComponent('Bridge').takeDamage(1);
    const salvageable = ship.getSalvageableComponents();
    expect(salvageable).toHaveLength(1);
    expect(salvageable[0].name).toBe('Engines');
  });

  it('getSalvageableComponents returns empty when all destroyed', () => {
    const ship = new EnemyShip();
    for (const c of ship.components) {
      c.takeDamage(c.maxHp);
    }
    expect(ship.getSalvageableComponents()).toHaveLength(0);
  });

  it('getSalvageableComponents returns components with partial HP', () => {
    const ship = new EnemyShip({
      powerLimit: 6,
      components: [
        new WeaponComponent('Weapons', 3, 2),
        new EngineComponent('Engines', 2, 2),
        new BridgeComponent('Bridge', 1, 1),
      ],
    });
    ship.getComponent('Weapons').takeDamage(1); // 2 HP remaining
    ship.getComponent('Bridge').takeDamage(1); // destroyed
    const salvageable = ship.getSalvageableComponents();
    expect(salvageable).toHaveLength(2); // Weapons (damaged) + Engines (full)
    expect(salvageable.map(c => c.name)).toEqual(['Weapons', 'Engines']);
    expect(salvageable[0].currentHp).toBe(2); // Weapons at 2/3 HP
    expect(salvageable[1].currentHp).toBe(2); // Engines at full
  });

  // US-005: backward compat — getComponent still works
  it('backward compat: getComponent("Weapons") returns the weapon', () => {
    const ship = new EnemyShip();
    const w = ship.getComponent('Weapons');
    expect(w).toBeDefined();
    expect(w.name).toBe('Weapons');
  });

  it('backward compat: getComponent("Engines") returns the engine', () => {
    const ship = new EnemyShip();
    const e = ship.getComponent('Engines');
    expect(e).toBeDefined();
    expect(e.name).toBe('Engines');
  });

  it('backward compat: getComponent("Bridge") returns the bridge', () => {
    const ship = new EnemyShip();
    const b = ship.getComponent('Bridge');
    expect(b).toBeDefined();
    expect(b.name).toBe('Bridge');
  });

  // US-005: legacy array form enforces powerLimit 4
  it('legacy array form sets powerLimit to 4', () => {
    const ship = new EnemyShip([new WeaponComponent('Test', 1, 1)]);
    expect(ship.powerLimit).toBe(4);
  });

  it('legacy array form enforces powerLimit 4', () => {
    expect(() => {
      new EnemyShip([
        new WeaponComponent('W', 2, 2),
        new EngineComponent('E', 2, 2),
        new BridgeComponent('B', 1, 1),
      ]);
    }).toThrow(/exceed powerLimit/);
  });
});

// --- CombatEngine Tests ---

/**
 * Creates a deterministic RNG from a sequence of desired d6 rolls.
 * rollAttack() does: Math.floor(rng() * 6) + 1
 * So for a desired roll R, rng must return (R - 1) / 6 + small epsilon
 * to ensure Math.floor gives R - 1.
 */
function makeRng(rolls) {
  let i = 0;
  return () => {
    const roll = rolls[i % rolls.length];
    i++;
    // rng returns value in [0,1). For Math.floor(rng*6)+1 = roll, need rng in [(roll-1)/6, roll/6)
    return (roll - 0.5) / 6;
  };
}

/** Helper: creates a standard combat engine with seeded RNG */
function makeEngine(rolls, opts = {}) {
  return new CombatEngine({
    playerShip: opts.playerShip || standardPlayerShip(),
    enemyShip: opts.enemyShip || new EnemyShip(),
    maxTurns: opts.maxTurns ?? 5,
    hitThreshold: opts.hitThreshold ?? 4,
    rng: makeRng(rolls),
  });
}

describe('CombatEngine', () => {
  describe('construction', () => {
    it('initializes with correct defaults', () => {
      const engine = makeEngine([4]);
      expect(engine.currentTurn).toBe(1);
      expect(engine.isPlayerTurn).toBe(true);
      expect(engine.turnLog).toEqual([]);
      expect(engine.combatOver).toBe(false);
      expect(engine.result).toBe(null);
      expect(engine.maxTurns).toBe(5);
      expect(engine.hitThreshold).toBe(4);
    });

    it('accepts custom maxTurns and hitThreshold', () => {
      const engine = makeEngine([4], { maxTurns: 3, hitThreshold: 5 });
      expect(engine.maxTurns).toBe(3);
      expect(engine.hitThreshold).toBe(5);
    });

    it('stores player and enemy ships', () => {
      const player = standardPlayerShip();
      const enemy = new EnemyShip();
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: enemy,
        rng: makeRng([4]),
      });
      expect(engine.playerShip).toBe(player);
      expect(engine.enemyShip).toBe(enemy);
    });
  });

  describe('setFirstAttacker', () => {
    it('sets player first', () => {
      const engine = makeEngine([4]);
      engine.setFirstAttacker('player');
      expect(engine.isPlayerTurn).toBe(true);
    });

    it('sets enemy first', () => {
      const engine = makeEngine([4]);
      engine.setFirstAttacker('enemy');
      expect(engine.isPlayerTurn).toBe(false);
    });
  });

  describe('rollAttack', () => {
    it('returns correct roll and hit for roll of 4 (hit)', () => {
      const engine = makeEngine([4]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(4);
      expect(result.isHit).toBe(true);
    });

    it('returns correct roll and miss for roll of 3', () => {
      const engine = makeEngine([3]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(3);
      expect(result.isHit).toBe(false);
    });

    it('returns correct roll for roll of 1 (min)', () => {
      const engine = makeEngine([1]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(1);
      expect(result.isHit).toBe(false);
    });

    it('returns correct roll for roll of 6 (max, hit)', () => {
      const engine = makeEngine([6]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(6);
      expect(result.isHit).toBe(true);
    });

    it('roll of 5 is a hit', () => {
      const engine = makeEngine([5]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(5);
      expect(result.isHit).toBe(true);
    });

    it('roll of 2 is a miss', () => {
      const engine = makeEngine([2]);
      const result = engine.rollAttack();
      expect(result.roll).toBe(2);
      expect(result.isHit).toBe(false);
    });
  });

  describe('executePlayerAttack', () => {
    it('damages enemy component on hit', () => {
      // Roll 4 = hit
      const engine = makeEngine([4]);
      const result = engine.executePlayerAttack('Bridge');
      expect(result.roll).toBe(4);
      expect(result.isHit).toBe(true);
      expect(result.targetComponent).toBe('Bridge');
      expect(result.destroyed).toBe(true); // 1 HP Bridge destroyed by 1 hit
      expect(engine.enemyShip.getComponent('Bridge').currentHp).toBe(0);
    });

    it('does not damage on miss', () => {
      // Roll 2 = miss
      const engine = makeEngine([2]);
      const result = engine.executePlayerAttack('Bridge');
      expect(result.isHit).toBe(false);
      expect(result.destroyed).toBe(false);
      expect(engine.enemyShip.getComponent('Bridge').currentHp).toBe(1);
    });

    it('logs the attack', () => {
      const engine = makeEngine([4]);
      engine.executePlayerAttack('Weapons');
      expect(engine.turnLog).toHaveLength(1);
      expect(engine.turnLog[0]).toMatchObject({
        turn: 1,
        attacker: 'player',
        target: 'Weapons',
        roll: 4,
        isHit: true,
        destroyed: true,
      });
    });

    it('switches to enemy turn after attack', () => {
      const engine = makeEngine([2]); // miss, no end condition
      engine.executePlayerAttack('Bridge');
      expect(engine.isPlayerTurn).toBe(false);
    });

    it('no-ops when combat is already over', () => {
      const engine = makeEngine([4]);
      // Destroy bridge to end combat
      engine.executePlayerAttack('Bridge');
      expect(engine.combatOver).toBe(true);
      const result = engine.executePlayerAttack('Weapons');
      expect(result.roll).toBe(0);
      expect(result.combatOver).toBe(true);
    });

    it('refuses to attack when player weapons are destroyed', () => {
      const player = standardPlayerShip();
      player.getComponent('Weapons').takeDamage(4); // destroy weapons (4 HP default)
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([4]),
      });
      const result = engine.executePlayerAttack('Bridge');
      expect(result.roll).toBe(0);
      expect(result.isHit).toBe(false);
      expect(result.destroyed).toBe(false);
      // Enemy should not be damaged
      expect(engine.enemyShip.getComponent('Bridge').currentHp).toBe(1);
    });

    it('does not advance turn or log when player weapons destroyed', () => {
      const player = standardPlayerShip();
      player.getComponent('Weapons').takeDamage(4);
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([4]),
      });
      engine.executePlayerAttack('Bridge');
      expect(engine.turnLog).toHaveLength(0);
      expect(engine._playerAttackCount).toBe(0);
      expect(engine.isPlayerTurn).toBe(true); // still player turn
    });
  });

  describe('executeEnemyAttack', () => {
    it('targets a random active player component', () => {
      // Rolls: first for target selection (rng used by enemy targeting), second for attack roll
      // Actually, executeEnemyAttack uses rng twice: once for target index, once for rollAttack
      // The rng sequence controls both
      const engine = makeEngine([1, 4]); // target index calc + roll of 4
      engine.setFirstAttacker('enemy');
      const result = engine.executeEnemyAttack();
      expect(result.isHit).toBe(true);
      expect(result.targetComponent).toBeDefined();
    });

    it('auto-misses when enemy Weapons destroyed', () => {
      const engine = makeEngine([4]);
      engine.enemyShip.getComponent('Weapons').takeDamage(1);
      engine.setFirstAttacker('enemy');
      const result = engine.executeEnemyAttack();
      expect(result.roll).toBe(0);
      expect(result.isHit).toBe(false);
      expect(result.targetComponent).toBe(null);
      // Log should have autoMiss
      expect(engine.turnLog[0].autoMiss).toBe(true);
    });

    it('switches to player turn after attack', () => {
      const engine = makeEngine([1, 2]); // target selection + miss roll
      engine.setFirstAttacker('enemy');
      engine.executeEnemyAttack();
      expect(engine.isPlayerTurn).toBe(true);
    });

    it('logs the attack', () => {
      const engine = makeEngine([1, 5]); // target + hit
      engine.setFirstAttacker('enemy');
      engine.executeEnemyAttack();
      expect(engine.turnLog).toHaveLength(1);
      expect(engine.turnLog[0].attacker).toBe('enemy');
      expect(engine.turnLog[0].isHit).toBe(true);
    });
  });

  describe('Bridge destroyed → playerWin', () => {
    it('ends combat immediately when Bridge is destroyed', () => {
      // Roll 4 = hit, destroys Bridge (1 HP)
      const engine = makeEngine([4]);
      const result = engine.executePlayerAttack('Bridge');
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerWin');
      expect(result.destroyed).toBe(true);
      expect(engine.combatOver).toBe(true);
      expect(engine.result).toBe('playerWin');
    });

    it('playerWin even if other enemy components alive', () => {
      const engine = makeEngine([4]);
      const result = engine.executePlayerAttack('Bridge');
      expect(result.result).toBe('playerWin');
      expect(engine.enemyShip.canAttack).toBe(true);
      expect(engine.enemyShip.canFlee).toBe(true);
    });
  });

  describe('all player components destroyed → playerDestroyed', () => {
    it('ends combat when all player components are destroyed', () => {
      // Use 1 HP typed player components for easier testing
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 1, 1),
        new EngineComponent('Engines', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      // All enemy attacks hit (rolls of 4), targeting each component
      // rng controls: target selection + attack roll for each enemy attack
      // For 3 active components: index 0=Weapons, 1=Engines, 2=Bridge
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([
          1, 4,  // enemy targets index 0 (Weapons), rolls 4 (hit)
          1, 4,  // enemy targets index 0 (now Engines since Weapons dead), rolls 4 (hit)
          1, 4,  // enemy targets index 0 (now Bridge since others dead), rolls 4 (hit)
        ]),
      });
      engine.setFirstAttacker('enemy');

      engine.executeEnemyAttack(); // Destroys component
      expect(engine.combatOver).toBe(false); // Not all destroyed yet

      engine.executeEnemyAttack(); // Destroys another
      expect(engine.combatOver).toBe(false);

      const result = engine.executeEnemyAttack(); // Destroys last
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerDestroyed');
    });
  });

  describe('max turns reached → playerLose', () => {
    it('ends combat when both sides exhaust max turns', () => {
      // maxTurns = 2, all attacks miss (roll 1)
      const engine = makeEngine(
        [1], // all rolls are 1 (miss)
        { maxTurns: 2 }
      );

      // Turn 1: player attacks (miss)
      engine.executePlayerAttack('Bridge');
      expect(engine.combatOver).toBe(false);

      // Turn 1: enemy attacks (miss) — rng gives target index + miss roll
      engine.executeEnemyAttack();
      expect(engine.combatOver).toBe(false);

      // Turn 2: player attacks (miss)
      engine.executePlayerAttack('Bridge');
      expect(engine.combatOver).toBe(false);

      // Turn 2: enemy attacks (miss) — this is enemy's 2nd attack
      const result = engine.executeEnemyAttack();
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerLose');
    });
  });

  describe('player bridge destroyed → playerDestroyed', () => {
    it('ends combat when player Bridge is destroyed', () => {
      // Player with 1 HP Bridge for easy testing
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      // Enemy hits Bridge: target index selects Bridge (idx 2 of 3 components), roll 4 (hit)
      // For idx 2 with 3 components: Math.floor(rng * 3) = 2, need rng >= 2/3
      // Roll 5 gives rng = (5-0.5)/6 = 0.75, Math.floor(0.75 * 3) = 2 ✓
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([5, 4]), // target idx 2 (Bridge), roll 4 (hit)
      });
      engine.setFirstAttacker('enemy');

      const result = engine.executeEnemyAttack();
      expect(result.targetComponent).toBe('Bridge');
      expect(result.destroyed).toBe(true);
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerDestroyed');
    });

    it('playerDestroyed from bridge even with other components alive', () => {
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([5, 4]), // target idx 2 (Bridge), hit
      });
      engine.setFirstAttacker('enemy');

      engine.executeEnemyAttack();
      expect(engine.result).toBe('playerDestroyed');
      // Weapons and Engines still alive
      expect(player.getComponent('Weapons').destroyed).toBe(false);
      expect(player.getComponent('Engines').destroyed).toBe(false);
    });

    it('enemy bridge check has priority over player bridge check (both destroyed same turn)', () => {
      // If both bridges are destroyed, enemy bridge is checked first → playerWin
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      const enemy = new EnemyShip();
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: enemy,
        rng: makeRng([4]),
      });

      // Pre-destroy player bridge
      player.getComponent('Bridge').takeDamage(1);
      expect(player.isBridgeDestroyed).toBe(true);

      // Player destroys enemy bridge
      const result = engine.executePlayerAttack('Bridge');
      expect(result.destroyed).toBe(true);
      // Both bridges destroyed, but enemy bridge is checked first → playerWin
      expect(result.result).toBe('playerWin');
    });

    it('player bridge destruction takes priority over isDestroyed check', () => {
      // When bridge is destroyed but ship is not fully destroyed
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 2, 1),
        new EngineComponent('Engines', 2, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([5, 4]), // target idx 2 (Bridge), hit
      });
      engine.setFirstAttacker('enemy');

      engine.executeEnemyAttack(); // Destroys Bridge
      expect(player.isBridgeDestroyed).toBe(true);
      expect(player.isDestroyed).toBe(false); // Not all components destroyed
      expect(engine.result).toBe('playerDestroyed');
    });
  });

  describe('escape', () => {
    it('sets combatOver and result to escaped', () => {
      const engine = makeEngine([4]);
      const result = engine.escape();
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('escaped');
      expect(engine.combatOver).toBe(true);
      expect(engine.result).toBe('escaped');
    });

    it('no-ops when combat already over', () => {
      const engine = makeEngine([4]);
      // End combat by destroying enemy bridge
      engine.executePlayerAttack('Bridge');
      expect(engine.result).toBe('playerWin');

      const result = engine.escape();
      expect(result.result).toBe('playerWin'); // preserves original result
    });

    it('can escape on the very first turn', () => {
      const engine = makeEngine([4]);
      expect(engine.currentTurn).toBe(1);
      expect(engine.isPlayerTurn).toBe(true);
      const result = engine.escape();
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('escaped');
    });

    it('can escape regardless of component state', () => {
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 1, 1),
        new EngineComponent('Engines', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      // Destroy Weapons and Engines
      player.getComponent('Weapons').takeDamage(1);
      player.getComponent('Engines').takeDamage(1);

      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng([4]),
      });

      const result = engine.escape();
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('escaped');
    });
  });

  describe('enemyFled — Weapons destroyed, Engines intact', () => {
    it('ends combat when Weapons destroyed but Engines still intact', () => {
      // Destroying Weapons alone triggers flee (enemy can't attack but can still run)
      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip: new EnemyShip(),
        rng: makeRng([4]),
      });

      const r = engine.executePlayerAttack('Weapons'); // rng[0]=4 → hit, destroys Weapons
      expect(r.destroyed).toBe(true);
      expect(engine.enemyShip.canAttack).toBe(false);
      expect(engine.enemyShip.canFlee).toBe(true);
      expect(r.combatOver).toBe(true);
      expect(r.result).toBe('enemyFled');
    });

    it('does NOT trigger flee when Engines also destroyed', () => {
      // If both Weapons and Engines are destroyed, enemy can't flee
      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip: new EnemyShip(),
        rng: makeRng([4, 4]),
      });

      // Pre-destroy Engines
      engine.enemyShip.getComponent('Engines').takeDamage(1);
      expect(engine.enemyShip.canFlee).toBe(false);

      // Now destroy Weapons — enemy can't attack AND can't flee
      const r = engine.executePlayerAttack('Weapons');
      expect(r.destroyed).toBe(true);
      expect(engine.enemyShip.canAttack).toBe(false);
      expect(engine.enemyShip.canFlee).toBe(false);
      // Should NOT end as enemyFled — enemy is stuck, combat continues
      expect(r.combatOver).toBe(false);
    });

    it('does NOT trigger flee if player has 0 attacks (disarmed re-encounter)', () => {
      // Simulate re-encounter: enemy Weapons already destroyed, enemy attacks first (auto-miss)
      const enemyShip = new EnemyShip();
      enemyShip.getComponent('Weapons').takeDamage(1); // Pre-destroy Weapons
      expect(enemyShip.canAttack).toBe(false);
      expect(enemyShip.canFlee).toBe(true);

      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip,
        rng: makeRng([1]),
      });
      engine.setFirstAttacker('enemy');

      // Enemy attacks first — auto-misses (Weapons destroyed)
      const r = engine.executeEnemyAttack();
      expect(engine.turnLog[0].autoMiss).toBe(true);
      // Should NOT trigger flee — player hasn't had a turn yet
      expect(r.combatOver).toBe(false);
      expect(engine.isPlayerTurn).toBe(true); // player's turn now
    });

    it('triggers flee after player gets at least 1 attack on disarmed enemy', () => {
      // Enemy Weapons pre-destroyed, enemy goes first (auto-miss), then player attacks
      const enemyShip = new EnemyShip();
      enemyShip.getComponent('Weapons').takeDamage(1);

      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip,
        rng: makeRng([1, 2]), // enemy target+roll (auto-miss skips), player rolls 2 (miss)
      });
      engine.setFirstAttacker('enemy');

      // Enemy auto-miss
      engine.executeEnemyAttack();
      expect(engine.combatOver).toBe(false);

      // Player attacks (miss, but attack count increments)
      const r = engine.executePlayerAttack('Bridge');
      expect(r.isHit).toBe(false);
      expect(engine._playerAttackCount).toBe(1);
      // Now flee should trigger: !canAttack && canFlee && playerAttackCount > 0
      expect(r.combatOver).toBe(true);
      expect(r.result).toBe('enemyFled');
    });
  });

  describe('turn ordering', () => {
    it('player goes first by default', () => {
      const engine = makeEngine([2]);
      expect(engine.isPlayerTurn).toBe(true);
    });

    it('alternates player → enemy → player', () => {
      const engine = makeEngine([1]); // all misses
      expect(engine.isPlayerTurn).toBe(true);

      engine.executePlayerAttack('Bridge');
      expect(engine.isPlayerTurn).toBe(false);

      engine.executeEnemyAttack();
      expect(engine.isPlayerTurn).toBe(true);
      expect(engine.currentTurn).toBe(2);
    });

    it('enemy goes first when setFirstAttacker("enemy")', () => {
      const engine = makeEngine([1, 1]); // misses
      engine.setFirstAttacker('enemy');
      expect(engine.isPlayerTurn).toBe(false);

      engine.executeEnemyAttack();
      expect(engine.isPlayerTurn).toBe(true);
    });

    it('currentTurn advances after enemy attack', () => {
      const engine = makeEngine([1]); // all misses
      expect(engine.currentTurn).toBe(1);

      engine.executePlayerAttack('Bridge');
      expect(engine.currentTurn).toBe(1); // still turn 1

      engine.executeEnemyAttack();
      expect(engine.currentTurn).toBe(2); // now turn 2
    });
  });

  describe('bonus attacks (rear approach)', () => {
    it('player gets extra attack before enemy turn when bonusAttacks = 1', () => {
      const engine = makeEngine([1]); // all misses
      engine.bonusAttacks = 1;

      // Attack 1
      engine.executePlayerAttack('Bridge');
      expect(engine.isPlayerTurn).toBe(true); // still player turn (bonus)

      // Attack 2 (bonus attack)
      engine.executePlayerAttack('Bridge');
      expect(engine.isPlayerTurn).toBe(false); // now enemy turn
    });

    it('bonus attack decrements bonusAttacks', () => {
      const engine = makeEngine([1]); // all misses
      engine.bonusAttacks = 1;

      engine.executePlayerAttack('Bridge');
      expect(engine.bonusAttacks).toBe(0);
    });
  });

  describe('turn counting', () => {
    it('tracks player and enemy attack counts independently', () => {
      const engine = makeEngine([1]); // all misses
      engine.executePlayerAttack('Bridge');
      expect(engine._playerAttackCount).toBe(1);
      expect(engine._enemyAttackCount).toBe(0);

      engine.executeEnemyAttack();
      expect(engine._playerAttackCount).toBe(1);
      expect(engine._enemyAttackCount).toBe(1);
    });
  });

  describe('full combat simulation with seeded RNG', () => {
    it('simulates a full combat where player wins by destroying Bridge', () => {
      // Player always hits (roll 4), enemy always misses (roll 1)
      // After player hits Bridge (1 HP), combat ends as playerWin
      // Sequence: player roll 4 (hit Bridge)
      const engine = makeEngine([4]);
      const result = engine.executePlayerAttack('Bridge');
      expect(result.result).toBe('playerWin');
      expect(engine.turnLog).toHaveLength(1);
    });

    it('simulates combat where enemy eventually destroys all player components', () => {
      // Player with 1 HP typed components, enemy goes first, always hits
      // Enemy targets Engines first (idx 1), then Weapons, then Bridge
      // so player's Weapons stay alive for their attack turns
      const player = new PlayerShip([
        new WeaponComponent('Weapons', 1, 1),
        new EngineComponent('Engines', 1, 1),
        new BridgeComponent('Bridge', 1, 1),
      ]);
      // For idx 1 of 3: roll 3 → rng=0.4167 → floor(0.4167*3)=1 (Engines)
      // For idx 0 of 2 remaining [Weapons, Bridge]: roll 1 → rng=0.0833 → floor(0.0833*2)=0 (Weapons)
      // For idx 0 of 1 remaining [Bridge]: roll 1 → rng=0.0833 → floor(0.0833*1)=0 (Bridge)
      const rngValues = [];
      // Turn 1: enemy targets idx 1 (Engines), rolls 6 (hit), player rolls 1 (miss)
      rngValues.push(3, 6, 1);
      // Turn 2: enemy targets idx 0 (Weapons), rolls 6 (hit) → player weapons destroyed
      // Player can't attack (weapons destroyed), so no player roll needed
      // But bridge is still alive so combat continues
      rngValues.push(1, 6);
      // Turn 3: enemy targets idx 0 (Bridge), rolls 6 (hit) → playerDestroyed
      rngValues.push(1, 6);

      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng(rngValues),
      });
      engine.setFirstAttacker('enemy');

      // Turn 1: enemy destroys Engines
      engine.executeEnemyAttack();
      expect(engine.combatOver).toBe(false);
      engine.executePlayerAttack('Bridge'); // miss (weapons still active)
      expect(engine.combatOver).toBe(false);

      // Turn 2: enemy destroys Weapons
      engine.executeEnemyAttack();
      expect(engine.combatOver).toBe(false);
      // Player can't attack — weapons destroyed; no-op
      engine.executePlayerAttack('Bridge');
      expect(engine.combatOver).toBe(false);
      // Manually switch to enemy turn since player attack was blocked
      engine.isPlayerTurn = false;

      // Turn 3: enemy destroys Bridge → playerDestroyed
      const result = engine.executeEnemyAttack();
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerDestroyed');
    });

    it('simulates timeout when both sides miss all attacks', () => {
      // maxTurns = 2, all misses
      const engine = makeEngine([1], { maxTurns: 2 });

      // Turn 1
      engine.executePlayerAttack('Bridge'); // miss
      engine.executeEnemyAttack(); // miss (target + roll, both use rng value 1)

      // Turn 2
      engine.executePlayerAttack('Bridge'); // miss
      const result = engine.executeEnemyAttack(); // miss, both sides at maxTurns
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('playerLose');
    });

    it('simulates combat where player destroys Weapons causing flee', () => {
      // Destroying Weapons alone triggers flee (enemy can still move but can't fight)
      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip: new EnemyShip(),
        rng: makeRng([4]),
      });

      const result = engine.executePlayerAttack('Weapons'); // hit, destroys Weapons → flee
      expect(result.combatOver).toBe(true);
      expect(result.result).toBe('enemyFled');
      expect(engine.enemyShip.canAttack).toBe(false);
      expect(engine.enemyShip.canFlee).toBe(true);
    });
  });

  describe('rng parameter', () => {
    it('accepts custom rng function', () => {
      let called = false;
      const customRng = () => { called = true; return 0.5; }; // roll = floor(0.5*6)+1 = 4
      const engine = new CombatEngine({
        playerShip: standardPlayerShip(),
        enemyShip: new EnemyShip(),
        rng: customRng,
      });
      engine.rollAttack();
      expect(called).toBe(true);
    });

    it('produces deterministic results with same rng', () => {
      const engine1 = makeEngine([4, 2, 6]);
      const engine2 = makeEngine([4, 2, 6]);

      const r1 = engine1.executePlayerAttack('Bridge');
      const r2 = engine2.executePlayerAttack('Bridge');
      expect(r1.roll).toBe(r2.roll);
      expect(r1.isHit).toBe(r2.isHit);
    });
  });

  describe('custom hitThreshold', () => {
    it('hit threshold of 5 means only 5 and 6 hit', () => {
      const engine = makeEngine([4], { hitThreshold: 5 });
      const result = engine.rollAttack();
      expect(result.roll).toBe(4);
      expect(result.isHit).toBe(false);
    });

    it('hit threshold of 1 means everything hits', () => {
      const engine = makeEngine([1], { hitThreshold: 1 });
      const result = engine.rollAttack();
      expect(result.roll).toBe(1);
      expect(result.isHit).toBe(true);
    });
  });
});

// --- getApproachPosition Tests ---

describe('getApproachPosition', () => {
  it('returns positions 1-6 for enemy facing 0 (East)', () => {
    // P=0 → behind (4), P=1 → back-left (5), P=2 → front-left (6),
    // P=3 → front (1), P=4 → front-right (2), P=5 → back-right (3)
    expect(getApproachPosition(0, 0)).toBe(4);
    expect(getApproachPosition(1, 0)).toBe(5);
    expect(getApproachPosition(2, 0)).toBe(6);
    expect(getApproachPosition(3, 0)).toBe(1);
    expect(getApproachPosition(4, 0)).toBe(2);
    expect(getApproachPosition(5, 0)).toBe(3);
  });

  it('returns positions 1-6 for enemy facing 3 (West)', () => {
    // P=3 → behind (4), P=0 → front (1)
    expect(getApproachPosition(3, 3)).toBe(4);
    expect(getApproachPosition(0, 3)).toBe(1);
  });

  it('every facing produces all 6 positions exactly once', () => {
    for (let facing = 0; facing < 6; facing++) {
      const positions = [];
      for (let p = 0; p < 6; p++) {
        positions.push(getApproachPosition(p, facing));
      }
      expect(positions.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('exactly one player direction yields position 4 (behind) per facing', () => {
    for (let facing = 0; facing < 6; facing++) {
      let behindCount = 0;
      for (let p = 0; p < 6; p++) {
        if (getApproachPosition(p, facing) === 4) behindCount++;
      }
      expect(behindCount).toBe(1);
    }
  });

  it('position 4 occurs when playerDirection === enemyFacingDirection', () => {
    for (let d = 0; d < 6; d++) {
      expect(getApproachPosition(d, d)).toBe(4);
    }
  });

  it('position 1 (front) occurs when player approaches from opposite of facing', () => {
    for (let d = 0; d < 6; d++) {
      const opposite = (d + 3) % 6;
      expect(getApproachPosition(opposite, d)).toBe(1);
    }
  });
});

// --- getApproachAdvantage Tests ---

describe('getApproachAdvantage', () => {
  describe('vision zone — enemy attacks first', () => {
    it('enemy attacks first when entering vision zone', () => {
      const result = getApproachAdvantage('vision', 0, 0);
      expect(result.firstAttacker).toBe('enemy');
      expect(result.bonusAttacks).toBe(0);
      expect(result.rollBonus).toBe(0);
      expect(result.approachPosition).toBe(4);
    });

    it('enemy attacks first regardless of direction match in vision zone', () => {
      // Even if player approaches from behind, vision zone = enemy first
      const result = getApproachAdvantage('vision', 2, 2);
      expect(result.firstAttacker).toBe('enemy');
      expect(result.rollBonus).toBe(0);
    });

    it('enemy attacks first for all player directions in vision zone', () => {
      for (let playerDir = 0; playerDir < 6; playerDir++) {
        const result = getApproachAdvantage('vision', playerDir, 3);
        expect(result.firstAttacker).toBe('enemy');
        expect(result.rollBonus).toBe(0);
      }
    });
  });

  describe('proximity zone — player attacks first', () => {
    it('player attacks first when entering proximity zone', () => {
      const result = getApproachAdvantage('proximity', 1, 0);
      expect(result.firstAttacker).toBe('player');
      expect(result.bonusAttacks).toBe(0);
      expect(result.rollBonus).toBe(0);
    });

    it('rear approach in proximity grants rollBonus +1', () => {
      // playerDir === enemyFacing = rear approach (position 4)
      const result = getApproachAdvantage('proximity', 0, 0);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
      expect(result.bonusAttacks).toBe(0);
      expect(result.approachPosition).toBe(4);
      expect(result.approachType).toBe('rear_ambush');
    });

    it('non-rear proximity has no rollBonus', () => {
      const result = getApproachAdvantage('proximity', 1, 0);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(0);
      expect(result.approachPosition).toBe(5);
      expect(result.approachType).toBe('simple');
    });

    it('rear approach with enemy facing 2', () => {
      const result = getApproachAdvantage('proximity', 2, 2);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
      expect(result.approachPosition).toBe(4);
    });

    it('rear approach with enemy facing 5', () => {
      const result = getApproachAdvantage('proximity', 5, 5);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
      expect(result.approachPosition).toBe(4);
    });

    it('non-rear directions with enemy facing 0', () => {
      for (const dir of [1, 2, 3, 4, 5]) {
        const result = getApproachAdvantage('proximity', dir, 0);
        expect(result.firstAttacker).toBe('player');
        expect(result.rollBonus).toBe(0);
      }
    });
  });

  describe('proximity zone — exactly 1 rear, 5 non-rear per facing', () => {
    it('all 6 enemy facing directions have exactly 1 rear direction', () => {
      for (let enemyFacing = 0; enemyFacing < 6; enemyFacing++) {
        let rearCount = 0;
        for (let playerDir = 0; playerDir < 6; playerDir++) {
          const result = getApproachAdvantage('proximity', playerDir, enemyFacing);
          expect(result.firstAttacker).toBe('player');
          if (result.rollBonus > 0) rearCount++;
        }
        expect(rearCount).toBe(1);
      }
    });
  });

  describe('rollBonus in CombatEngine', () => {
    it('rollBonus of 1 makes a roll of 3 hit with threshold 4', () => {
      const engine = makeEngine([3]);
      engine.rollBonus = 1;
      const result = engine.executePlayerAttack('Bridge');
      // roll=3, 3+1=4 >= 4, so hit
      expect(result.roll).toBe(3);
      expect(result.isHit).toBe(true);
      expect(result.destroyed).toBe(true);
    });

    it('rollBonus of 0 keeps a roll of 2 as miss with weapon accuracy 3', () => {
      const engine = makeEngine([2]);
      engine.rollBonus = 0;
      const result = engine.executePlayerAttack('Bridge');
      expect(result.roll).toBe(2);
      expect(result.isHit).toBe(false);
    });

    it('rollBonus does not affect enemy attacks', () => {
      const engine = makeEngine([1, 3]); // target selection + roll 3
      engine.rollBonus = 1;
      engine.setFirstAttacker('enemy');
      const result = engine.executeEnemyAttack();
      // Enemy uses rollAttack() which doesn't use rollBonus
      expect(result.roll).toBe(3);
      expect(result.isHit).toBe(false); // 3 < 4, no bonus for enemy
    });

    it('rollBonus defaults to 0', () => {
      const engine = makeEngine([4]);
      expect(engine.rollBonus).toBe(0);
    });
  });

  describe('weapon stats in combat (US-006)', () => {
    describe('player weapon accuracy', () => {
      it('player attack uses weapon accuracy instead of hitThreshold', () => {
        // Default player weapon is power-2 with accuracy 3
        // hitThreshold is 4, but weapon accuracy 3 should be used
        const engine = makeEngine([3]); // roll 3
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(true); // 3 >= accuracy 3, even though 3 < hitThreshold 4
      });

      it('power-1 weapon with accuracy 4 misses on roll of 3', () => {
        const player = new PlayerShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 2, 1), // power 1, accuracy 4
            new EngineComponent('Engines', 2, 1),
            new BridgeComponent('Bridge', 2, 1),
          ],
        });
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          rng: makeRng([3]),
        });
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(false); // 3 < accuracy 4
      });

      it('power-2 weapon with accuracy 3 hits on roll of 3', () => {
        const player = new PlayerShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 4, 2), // power 2, accuracy 3
            new EngineComponent('Engines', 2, 1),
            new BridgeComponent('Bridge', 2, 1),
          ],
        });
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          rng: makeRng([3]),
        });
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(true); // 3 >= accuracy 3
      });
    });

    describe('player weapon damage', () => {
      it('player attack deals weapon damage (default 1) to enemy component', () => {
        // Default weapon damage is 1
        const engine = makeEngine([4]); // hit
        engine.executePlayerAttack('Engines');
        expect(engine.enemyShip.getComponent('Engines').currentHp).toBe(0); // 1HP - 1 = 0
      });

      it('player attack with custom high-damage weapon deals correct damage', () => {
        const player = new PlayerShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Big Gun', 4, 2),
            new EngineComponent('Engines', 2, 1),
            new BridgeComponent('Bridge', 2, 1),
          ],
        });
        // Manually set higher damage for testing
        player.getComponent('Big Gun').damage = 3;

        const enemy = new EnemyShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 1, 1),
            new EngineComponent('Engines', 5, 1),
            new BridgeComponent('Bridge', 5, 1),
          ],
        });
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: enemy,
          rng: makeRng([4]),
        });
        engine.executePlayerAttack('Engines');
        expect(enemy.getComponent('Engines').currentHp).toBe(2); // 5HP - 3 = 2
      });
    });

    describe('enemy weapon accuracy', () => {
      it('enemy attack uses weapon accuracy instead of hitThreshold', () => {
        // Default enemy weapon is power-1 with accuracy 4
        // Roll 4 should hit (4 >= accuracy 4)
        const engine = makeEngine([1, 4]); // target selection + roll 4
        engine.setFirstAttacker('enemy');
        const result = engine.executeEnemyAttack();
        expect(result.roll).toBe(4);
        expect(result.isHit).toBe(true);
      });

      it('enemy with power-1 weapon misses on roll of 3', () => {
        // Default enemy weapon accuracy is 4 (power 1)
        const engine = makeEngine([1, 3]); // target selection + roll 3
        engine.setFirstAttacker('enemy');
        const result = engine.executeEnemyAttack();
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(false); // 3 < accuracy 4
      });

      it('enemy with power-2 weapon (accuracy 3) hits on roll of 3', () => {
        const enemy = new EnemyShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 2, 2), // power 2, accuracy 3
            new EngineComponent('Engines', 1, 1),
            new BridgeComponent('Bridge', 1, 1),
          ],
        });
        const engine = new CombatEngine({
          playerShip: standardPlayerShip(),
          enemyShip: enemy,
          rng: makeRng([1, 3]), // target selection + roll 3
        });
        engine.setFirstAttacker('enemy');
        const result = engine.executeEnemyAttack();
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(true); // 3 >= accuracy 3
      });
    });

    describe('enemy weapon damage', () => {
      it('enemy attack deals weapon damage to player component', () => {
        // Default enemy weapon damage is 1
        const player = standardPlayerShip();
        const startHp = player.getComponent('Weapons').currentHp; // 4
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          rng: makeRng([1, 4]), // target idx 0 (Weapons), roll 4 (hit)
        });
        engine.setFirstAttacker('enemy');
        engine.executeEnemyAttack();
        expect(player.getComponent('Weapons').currentHp).toBe(startHp - 1);
      });

      it('enemy with high-damage weapon deals correct damage', () => {
        const enemy = new EnemyShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 2, 1),
            new EngineComponent('Engines', 1, 1),
            new BridgeComponent('Bridge', 1, 1),
          ],
        });
        enemy.getComponent('Weapons').damage = 2;

        const player = standardPlayerShip();
        const startHp = player.getComponent('Weapons').currentHp; // 4
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: enemy,
          rng: makeRng([1, 4]), // target idx 0, roll 4 (hit)
        });
        engine.setFirstAttacker('enemy');
        engine.executeEnemyAttack();
        expect(player.getComponent('Weapons').currentHp).toBe(startHp - 2);
      });
    });

    describe('multi-weapon ships', () => {
      it('uses first active weapon when ship has multiple weapons', () => {
        const player = new PlayerShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Laser', 2, 1),   // accuracy 4
            new WeaponComponent('Cannon', 4, 2),   // accuracy 3
            new EngineComponent('Engines', 2, 1),
            new BridgeComponent('Bridge', 2, 1),
          ],
        });
        // First active weapon is Laser (accuracy 4)
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          rng: makeRng([3]),
        });
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(false); // 3 < accuracy 4 (Laser)
      });

      it('falls back to second weapon when first is destroyed', () => {
        const player = new PlayerShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Laser', 2, 1),   // accuracy 4
            new WeaponComponent('Cannon', 4, 2),   // accuracy 3
            new EngineComponent('Engines', 2, 1),
            new BridgeComponent('Bridge', 2, 1),
          ],
        });
        // Destroy first weapon
        player.getComponent('Laser').takeDamage(2);
        expect(player.getComponent('Laser').destroyed).toBe(true);

        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          rng: makeRng([3]),
        });
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(3);
        expect(result.isHit).toBe(true); // 3 >= accuracy 3 (Cannon)
      });
    });

    describe('hitThreshold fallback', () => {
      it('falls back to hitThreshold when no typed weapon found', () => {
        // Use legacy PlayerShip with plain ShipComponents (no type getter)
        const player = new PlayerShip([
          new ShipComponent('Weapons', 2),
          new ShipComponent('Engines', 2),
          new ShipComponent('Bridge', 2),
        ]);
        // canAttack uses getComponentsByType('weapon') — plain ShipComponents have no type
        // So canAttack returns false, attack is refused
        const engine = new CombatEngine({
          playerShip: player,
          enemyShip: new EnemyShip(),
          hitThreshold: 5,
          rng: makeRng([4]),
        });
        // Player can't attack because canAttack is false (no typed weapons)
        const result = engine.executePlayerAttack('Bridge');
        expect(result.roll).toBe(0);
        expect(result.isHit).toBe(false);
      });
    });

    describe('enemy components persist after playerWin', () => {
      it('enemy ship retains all components after bridge destruction', () => {
        const enemy = new EnemyShip();
        const engine = new CombatEngine({
          playerShip: standardPlayerShip(),
          enemyShip: enemy,
          rng: makeRng([4]),
        });

        engine.executePlayerAttack('Bridge'); // destroys Bridge
        expect(engine.result).toBe('playerWin');

        // All components still in array
        expect(enemy.components).toHaveLength(3);
        expect(enemy.getComponent('Bridge').destroyed).toBe(true);
        expect(enemy.getComponent('Weapons').destroyed).toBe(false);
        expect(enemy.getComponent('Engines').destroyed).toBe(false);
      });

      it('non-destroyed enemy components retain HP after playerWin', () => {
        const enemy = new EnemyShip({
          powerLimit: 10,
          components: [
            new WeaponComponent('Weapons', 3, 1),
            new EngineComponent('Engines', 3, 1),
            new BridgeComponent('Bridge', 1, 1),
          ],
        });
        const engine = new CombatEngine({
          playerShip: standardPlayerShip(),
          enemyShip: enemy,
          rng: makeRng([4]),
        });

        engine.executePlayerAttack('Bridge');
        expect(engine.result).toBe('playerWin');

        // Non-destroyed components retain full HP
        expect(enemy.getComponent('Weapons').currentHp).toBe(3);
        expect(enemy.getComponent('Engines').currentHp).toBe(3);
      });

      it('salvageable components available after playerWin', () => {
        const enemy = new EnemyShip();
        const engine = new CombatEngine({
          playerShip: standardPlayerShip(),
          enemyShip: enemy,
          rng: makeRng([4]),
        });

        engine.executePlayerAttack('Bridge');
        expect(engine.result).toBe('playerWin');

        const salvageable = enemy.getSalvageableComponents();
        expect(salvageable).toHaveLength(2); // Weapons + Engines
        expect(salvageable.map(c => c.name)).toEqual(expect.arrayContaining(['Weapons', 'Engines']));
      });
    });
  });
});
