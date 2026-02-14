import { describe, it, expect } from 'vitest';
import { ShipComponent, Ship, PlayerShip, EnemyShip } from './combat.js';

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
});

describe('PlayerShip', () => {
  it('creates with default components', () => {
    const ship = new PlayerShip();
    expect(ship.name).toBe('Player Ship');
    expect(ship.components).toHaveLength(3);
  });

  it('default Weapons has 2 HP', () => {
    const ship = new PlayerShip();
    const weapons = ship.getComponent('Weapons');
    expect(weapons.maxHp).toBe(2);
    expect(weapons.currentHp).toBe(2);
  });

  it('default Engines has 2 HP', () => {
    const ship = new PlayerShip();
    const engines = ship.getComponent('Engines');
    expect(engines.maxHp).toBe(2);
    expect(engines.currentHp).toBe(2);
  });

  it('default Bridge has 2 HP', () => {
    const ship = new PlayerShip();
    const bridge = ship.getComponent('Bridge');
    expect(bridge.maxHp).toBe(2);
    expect(bridge.currentHp).toBe(2);
  });

  it('is instanceof Ship', () => {
    const ship = new PlayerShip();
    expect(ship).toBeInstanceOf(Ship);
  });

  it('accepts custom components', () => {
    const custom = [
      new ShipComponent('Laser', 5),
      new ShipComponent('Shield', 3),
    ];
    const ship = new PlayerShip(custom);
    expect(ship.components).toHaveLength(2);
    expect(ship.getComponent('Laser').maxHp).toBe(5);
    expect(ship.getComponent('Shield').maxHp).toBe(3);
  });

  it('custom components override defaults', () => {
    const custom = [new ShipComponent('Weapons', 10)];
    const ship = new PlayerShip(custom);
    expect(ship.components).toHaveLength(1);
    expect(ship.getComponent('Weapons').maxHp).toBe(10);
    expect(ship.getComponent('Engines')).toBeUndefined();
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
});
