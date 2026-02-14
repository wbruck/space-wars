import { describe, it, expect } from 'vitest';
import { ShipComponent, Ship, PlayerShip, EnemyShip, CombatEngine, getApproachAdvantage } from './combat.js';

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
    playerShip: opts.playerShip || new PlayerShip(),
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
      const player = new PlayerShip();
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
      // Player has 3 components with 2 HP each = 6 hits needed
      // Use 1 HP player components for easier testing
      const player = new PlayerShip([
        new ShipComponent('Weapons', 1),
        new ShipComponent('Engines', 1),
        new ShipComponent('Bridge', 1),
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

  describe('enemyFled — Weapons destroyed, Engines intact', () => {
    it('ends combat when Weapons destroyed but Engines still intact', () => {
      // Destroying Weapons alone triggers flee (enemy can't attack but can still run)
      const engine = new CombatEngine({
        playerShip: new PlayerShip(),
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
        playerShip: new PlayerShip(),
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
      // Player with 1 HP components, enemy goes first, always hits
      const player = new PlayerShip([
        new ShipComponent('Weapons', 1),
        new ShipComponent('Engines', 1),
        new ShipComponent('Bridge', 1),
      ]);
      // Sequence: enemy target+roll, player miss, enemy target+roll, player miss, enemy target+roll
      // Enemy: target index (via rng), then roll 6 (hit)
      // Player: roll 1 (miss)
      const rngValues = [];
      // Turn 1: enemy targets idx 0, rolls 6 (hit), player rolls 1 (miss)
      rngValues.push(1, 6, 1);
      // Turn 2: enemy targets idx 0 (2 active left), rolls 6 (hit), player rolls 1 (miss)
      rngValues.push(1, 6, 1);
      // Turn 3: enemy targets idx 0 (1 active left), rolls 6 (hit) → playerDestroyed
      rngValues.push(1, 6);

      const engine = new CombatEngine({
        playerShip: player,
        enemyShip: new EnemyShip(),
        rng: makeRng(rngValues),
      });
      engine.setFirstAttacker('enemy');

      // Turn 1
      engine.executeEnemyAttack(); // hits, destroys one component
      expect(engine.combatOver).toBe(false);
      engine.executePlayerAttack('Bridge'); // miss
      expect(engine.combatOver).toBe(false);

      // Turn 2
      engine.executeEnemyAttack(); // hits, destroys another
      expect(engine.combatOver).toBe(false);
      engine.executePlayerAttack('Bridge'); // miss
      expect(engine.combatOver).toBe(false);

      // Turn 3
      const result = engine.executeEnemyAttack(); // hits, destroys last
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
        playerShip: new PlayerShip(),
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
        playerShip: new PlayerShip(),
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

// --- getApproachAdvantage Tests ---

describe('getApproachAdvantage', () => {
  describe('vision zone — enemy attacks first', () => {
    it('enemy attacks first when entering vision zone', () => {
      const result = getApproachAdvantage('vision', 0, 0);
      expect(result.firstAttacker).toBe('enemy');
      expect(result.bonusAttacks).toBe(0);
      expect(result.rollBonus).toBe(0);
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
      // playerDir === enemyFacing = rear approach
      const result = getApproachAdvantage('proximity', 0, 0);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
      expect(result.bonusAttacks).toBe(0);
    });

    it('non-rear proximity has no rollBonus', () => {
      const result = getApproachAdvantage('proximity', 1, 0);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(0);
    });

    it('rear approach with enemy facing 2', () => {
      const result = getApproachAdvantage('proximity', 2, 2);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
    });

    it('rear approach with enemy facing 5', () => {
      const result = getApproachAdvantage('proximity', 5, 5);
      expect(result.firstAttacker).toBe('player');
      expect(result.rollBonus).toBe(1);
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

    it('rollBonus of 0 keeps a roll of 3 as miss with threshold 4', () => {
      const engine = makeEngine([3]);
      engine.rollBonus = 0;
      const result = engine.executePlayerAttack('Bridge');
      expect(result.roll).toBe(3);
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
});
