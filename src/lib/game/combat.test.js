import { describe, it, expect } from 'vitest';
import { ShipComponent, Ship, PlayerShip } from './combat.js';

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
