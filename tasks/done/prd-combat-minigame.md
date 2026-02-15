# PRD: Combat Mini-Game

## Introduction

Add a turn-based combat mini-game that triggers when the player enters an enemy's engagement zone (replacing the current instant-death kill zone). The combat takes place on a new screen with the player and enemy exchanging attacks over alternating turns, targeting ship components. Approach direction determines first-attack advantage. Destroying the enemy's Bridge removes it from the board; hitting only Weapons or Engines leaves the enemy in place with damaged state. If the player's ship is destroyed, the game is over. If combat times out or the enemy flees, the player retreats to their pre-combat position.

## Goals

- Create extensible base classes for player ship and enemy ship with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Add a combat mini-game screen that pauses the board game during encounters
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Determine first-attack advantage based on approach direction relative to enemy facing
- Handle combat outcomes: Bridge destruction removes the enemy from the board, other component hits leave the enemy in place, combat loss forces retreat (or game over if player ship is destroyed)

## User Stories

### US-029: Create ShipComponent and PlayerShip base classes
**Description:** As a developer, I want base classes for ship components and the player's ship so that combat entities have a structured, extensible model.

**Acceptance Criteria:**
- [ ] Create `src/lib/game/combat.js` with a `ShipComponent` class: properties `name` (string), `maxHp` (number), `currentHp` (number, starts at maxHp), `destroyed` (getter, true when currentHp <= 0)
- [ ] `ShipComponent` has a `takeDamage(amount)` method that reduces `currentHp` by `amount` (min 0) and returns `{ destroyed: boolean }` indicating if this hit destroyed the component
- [ ] Create `Ship` base class with properties: `name` (string), `components` (array of ShipComponent instances), `isDestroyed` (getter, true when all components destroyed)
- [ ] `Ship` has `getActiveComponents()` returning components with currentHp > 0
- [ ] `Ship` has `getComponent(name)` returning a component by name
- [ ] Create `PlayerShip` extending `Ship` with default components: Weapons (2 HP), Engines (2 HP), Bridge (2 HP)
- [ ] `PlayerShip` components are configurable via constructor: `new PlayerShip(components?)` with sensible defaults
- [ ] Unit tests cover component creation, damage, destruction, ship active components, and PlayerShip defaults
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-029`

### US-030: Create EnemyShip combat class
**Description:** As a developer, I want an `EnemyShip` class so that enemies in combat have targetable components with distinct gameplay effects when destroyed.

**Acceptance Criteria:**
- [ ] `EnemyShip` extends `Ship` with default components: Weapons (1 HP), Engines (1 HP), Bridge (1 HP)
- [ ] `EnemyShip` accepts an optional `components` array in constructor for future customization
- [ ] `EnemyShip` has `canAttack` getter — returns `false` if Weapons component is destroyed
- [ ] `EnemyShip` has `canFlee` getter — returns `false` if Engines component is destroyed
- [ ] `EnemyShip` has `isBridgeDestroyed` getter — returns `true` if Bridge component is destroyed (enemy fully defeated)
- [ ] Destroying the Bridge immediately ends combat as a player victory regardless of other component states
- [ ] Unit tests verify component HP, canAttack/canFlee/isBridgeDestroyed getters, and bridge-destruction win condition
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-030`

### US-031: Create combat engine
**Description:** As a developer, I want a combat engine that resolves turn-based attacks between player and enemy ships using dice rolls so that combat has clear, testable mechanics.

**Acceptance Criteria:**
- [ ] Create `CombatEngine` class in `combat.js` with constructor accepting `{ playerShip, enemyShip, maxTurns, hitThreshold, rng? }`
- [ ] `maxTurns` defaults to 5 (each side gets up to 5 attack turns), `hitThreshold` defaults to 4 (roll of 4+ on d6 is a hit)
- [ ] `CombatEngine` has state: `currentTurn` (number, starts at 1), `isPlayerTurn` (boolean), `turnLog` (array of turn results), `combatOver` (boolean), `result` (null | 'playerWin' | 'playerLose' | 'playerDestroyed' | 'enemyFled')
- [ ] `setFirstAttacker(attacker)` method sets who goes first: `'player'` or `'enemy'`. Called before combat starts based on approach direction.
- [ ] `rollAttack()` method: rolls a d6 using `rng` (or Math.random), returns `{ roll: number, isHit: boolean }` where `isHit = roll >= hitThreshold`
- [ ] `executePlayerAttack(targetComponentName)` method: player chooses which enemy component to target. Rolls attack, applies damage if hit, logs result, advances turn. Returns `{ roll, isHit, targetComponent, destroyed, combatOver, result }`
- [ ] `executeEnemyAttack()` method: enemy auto-targets a random active player component. Rolls attack, applies damage if hit, logs result, advances turn. If enemy `canAttack` is false (Weapons destroyed), the attack auto-misses. Returns `{ roll, isHit, targetComponent, destroyed, combatOver, result }`
- [ ] Combat ends when: Bridge destroyed (`playerWin` — enemy removed from board), all player components destroyed (`playerDestroyed` — game over), maxTurns reached by both sides (`playerLose` — failed to defeat enemy, player retreats), or enemy Engines destroyed AND Weapons destroyed (`enemyFled` — enemy retreats but stays on board with damaged state)
- [ ] Result `'playerWin'` (Bridge hit) is the ONLY outcome that removes the enemy from the board. `'enemyFled'` leaves the enemy on the board (Weapons/Engines damaged but Bridge intact).
- [ ] Result `'playerDestroyed'` ends the entire game (gamePhase → 'lost', loseReason → 'enemy'). Result `'playerLose'` (timeout) triggers retreat only.
- [ ] `rng` parameter accepts a `() => number` function for deterministic tests (same seeded RNG pattern as the board game)
- [ ] Unit tests cover: hit/miss at various rolls, component targeting and damage, Weapons-destroyed auto-miss, Bridge-destroyed instant win, turn counting, max turns reached, player turn order, full combat simulation with seeded RNG
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-031`

### US-032: Calculate approach direction advantage
**Description:** As a developer, I want a function that determines first-attack advantage based on the player's movement direction relative to the enemy's facing direction.

**Acceptance Criteria:**
- [ ] Create `getApproachAdvantage(playerDirection, enemyFacingDirection)` function in `combat.js`
- [ ] **Front approach** (head-on): player's movement direction equals `(enemyFacingDirection + 3) % 6` (player moves directly into the enemy's front). Result: `{ firstAttacker: 'enemy', bonusAttacks: 0 }` — enemy attacks first
- [ ] **Rear approach** (from behind): player's movement direction equals `enemyFacingDirection` (player moves in the same direction the enemy faces, approaching from behind). Result: `{ firstAttacker: 'player', bonusAttacks: 1 }` — player gets 2 attacks before enemy's first turn
- [ ] **Side approach** (any other direction): Result: `{ firstAttacker: 'player', bonusAttacks: 0 }` — player attacks first, normal alternation
- [ ] Unit tests verify all 6 directions for a given enemy facing, covering front/rear/side classification for each
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-032`

### US-033: Add combat game phase and state management
**Description:** As a developer, I want a `'combat'` game phase and associated stores so that the board game pauses during combat encounters and can resume afterward.

**Acceptance Criteria:**
- [ ] Add `'combat'` to the valid `gamePhase` values (existing: setup, rolling, selectingDirection, moving, won, lost)
- [ ] Add new stores to `gameState.js`: `combatState` (writable, null | { engine: CombatEngine, enemyId: string, approachAdvantage: object, preCombatPlayerPos: string, preCombatPath: string[], triggerVertexIndex: number })
- [ ] `combatState` stores all data needed to run the mini-game and resolve its outcome
- [ ] `preCombatPlayerPos` saves the player's position before the move that triggered combat (for retreat)
- [ ] `triggerVertexIndex` records which path vertex triggered the engagement (for resume-after-win)
- [ ] Add `startCombat(enemyId, approachAdvantage, preCombatPos, path, triggerIndex)` function that creates a CombatEngine, sets combatState, and transitions to `'combat'` phase
- [ ] Add `resolveCombat(result)` function with three outcome paths:
  - `'playerWin'` (Bridge destroyed) → remove enemy from board (delete from boardData.enemies, obstacleSet, enemyZones, enemyZoneMap), restore player to preCombatPlayerPos, set phase to `'rolling'`
  - `'playerLose'` (max turns) or `'enemyFled'` → enemy stays on board (with any component damage persisted), restore player to preCombatPlayerPos, deduct the dice roll from movement pool, set phase to `'rolling'`
  - `'playerDestroyed'` (all player components destroyed) → set `loseReason` to `'enemy'`, set `gamePhase` to `'lost'` (game over)
- [ ] `combatState` is reset to `null` in `resetGame()`
- [ ] Unit tests verify: phase transitions to/from combat, combatState population, enemy removal on Bridge-destroyed win, enemy persists on flee/timeout, player retreat on loss, player destroyed triggers game over, pool deduction on retreat, resetGame clears combat state
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-033`

### US-034: Replace kill zone with engagement zone trigger
**Description:** As a developer, I want the enemy kill zone to trigger combat instead of instant death so that players have a chance to fight enemies.

**Acceptance Criteria:**
- [ ] In `computePath` (movement.js): when path encounters an enemy zone vertex, instead of setting `hitByEnemy` and stopping, set `engageEnemy: { vertexIndex, enemyId }` and stop. The vertex IS still included in the path (player enters the engagement zone).
- [ ] `computePath` return type gains `engageEnemy: { vertexIndex: number, enemyId: string } | null` — identifies which enemy was engaged and at which path step
- [ ] To find which enemy owns the kill zone vertex, `computePath` accepts an optional `enemyZoneMap` parameter: `Map<string, string>` mapping zone vertex ID → enemy ID (instead of just the Set)
- [ ] `generateBoardObjects` in `boardObjects.js` now returns an additional `enemyZoneMap: Map<string, string>` alongside `enemyZones: Set<string>`
- [ ] `boardData` gains `enemyZoneMap` property
- [ ] In `executeMove` (gameState.js): when animation reaches the engagement vertex, pause and call `startCombat()` with the enemy ID, approach advantage (from `getApproachAdvantage` using the player's selected direction and enemy's facing direction), pre-combat position, and path info
- [ ] The existing `boardData.enemyZones.has(finalPos)` instant-death check in `executeMove` is **removed** (replaced by the engagement trigger during path traversal)
- [ ] Backward compatibility: existing tests that don't use enemy zones still pass. When `enemyZoneMap` is undefined, no engagement triggers.
- [ ] Unit tests verify: engagement triggers at correct path vertex, correct enemy identified, approach advantage calculated, instant-death replaced
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-034`

### US-035: Combat mini-game screen
**Description:** As a player, I want a combat screen that shows my ship, the enemy ship, and lets me choose which component to attack each turn.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/CombatScreen.svelte` component
- [ ] Screen displays: player ship with component status bars (name, HP current/max), enemy ship with component status bars, current turn number and whose turn it is, approach advantage indicator (front/side/rear)
- [ ] On player's turn: show 3 clickable target buttons (Weapons, Engines, Bridge) for the enemy's active components. Destroyed components are grayed out and not clickable.
- [ ] When player clicks a target: animate dice roll (reuse Dice.svelte pattern or simple animation), show hit/miss result, update component HP, check combat end
- [ ] On enemy's turn: auto-execute after a short delay (500ms), show which player component was targeted, show dice roll and result
- [ ] If player has bonus attacks (rear approach), show "Bonus Attack!" indicator and allow extra attack before enemy's first turn
- [ ] When combat ends: show result message — "Victory!" (Bridge destroyed), "Retreat!" (timeout/flee), or "Destroyed!" (player ship destroyed) — then after 1.5s delay call the resolve function
- [ ] `App.svelte` routes `phase === 'combat'` to `CombatScreen`
- [ ] Touch-friendly: all buttons min 44px, touch-action: manipulation
- [ ] Verify in browser using dev server that combat screen displays correctly and interactions work
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-035`

### US-036: Board integration and combat outcome rendering
**Description:** As a player, I want combat outcomes to correctly update the board — only Bridge destruction removes the enemy, and my ship being destroyed ends the game.

**Acceptance Criteria:**
- [ ] When `resolveCombat('playerWin')` is called (Bridge destroyed): the enemy's vertex is removed from `boardData.obstacles`, the enemy's kill zone vertices are removed from `boardData.enemyZones` and `boardData.enemyZoneMap`, the enemy is removed from `boardData.enemies` array
- [ ] Board.svelte reactively updates: the enemy's red marker, direction arrow, and kill zone overlay all disappear when the enemy is removed
- [ ] When `resolveCombat('playerLose')` or `resolveCombat('enemyFled')` is called: the enemy stays on the board. Any component damage to the enemy (e.g., Weapons destroyed) persists — if the player re-engages the same enemy later, the enemy's damaged state carries over.
- [ ] When `resolveCombat('playerDestroyed')` is called: game transitions to `'lost'` phase with `loseReason` set to `'enemy'`. Player does NOT retreat — the game is over.
- [ ] After non-fatal combat (win or retreat), the player appears at their pre-combat position and the game is in rolling phase
- [ ] On retreat (playerLose/enemyFled): the dice roll's movement points are deducted from the pool (the move is "wasted"), but the player doesn't move
- [ ] If removing the enemy (Bridge destroyed) creates a new valid path to the target, the player can now use it
- [ ] Verify in browser: (1) win by Bridge hit → enemy disappears, player resumes. (2) timeout/flee → enemy stays, player retreats, turn lost. (3) player destroyed → game over screen.
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-036`

## Functional Requirements

- FR-1: `ShipComponent` class with `name`, `maxHp`, `currentHp`, `destroyed` getter, `takeDamage(amount)` method
- FR-2: `Ship` base class with `components` array, `isDestroyed` getter, `getActiveComponents()`, `getComponent(name)`
- FR-3: `PlayerShip` has Weapons (2 HP), Engines (2 HP), Bridge (2 HP) by default. Configurable via constructor.
- FR-4: `EnemyShip` has Weapons (1 HP), Engines (1 HP), Bridge (1 HP) by default. Has `canAttack`, `canFlee`, `isBridgeDestroyed` getters.
- FR-5: `CombatEngine` manages turn-based combat: 5 turns per side, d6 rolls, 4+ hits, alternating turns
- FR-6: Player chooses which enemy component to target. Enemy auto-targets random active player component.
- FR-7: Destroyed Weapons = enemy can't attack (auto-miss). Destroyed Engines = enemy can't flee. Destroyed Bridge = enemy destroyed (instant win).
- FR-8: Approach advantage: front = enemy first, side = player first, rear = player gets 2 attacks before enemy's turn
- FR-9: Direction math: front = `playerDir === (enemyFacing + 3) % 6`, rear = `playerDir === enemyFacing`, side = any other
- FR-10: `'combat'` game phase pauses the board game. `combatState` store holds combat engine and context data.
- FR-11: Enemy kill zones trigger combat instead of instant death. `computePath` returns `engageEnemy` info instead of `hitByEnemy`.
- FR-12: Bridge destroyed (playerWin) → enemy removed from board (obstacles, enemyZones, enemies array), player returns to pre-combat position, rolling phase. Weapons/Engines hits alone do NOT remove the enemy.
- FR-13: Timeout/flee (playerLose/enemyFled) → player retreats to pre-combat position, dice roll's movement deducted from pool, enemy stays on board with damaged state, rolling phase
- FR-16: Player destroyed (playerDestroyed) → game over (gamePhase 'lost', loseReason 'enemy'). No retreat.
- FR-14: Combat screen shows both ships' component status, clickable targets on player turn, animated dice rolls, turn indicators
- FR-15: `enemyZoneMap` (Map<vertexId, enemyId>) enables identifying which enemy owns a kill zone vertex

## Non-Goals (Out of Scope)

- No player ship component effects during board movement (Engines/Weapons don't affect board gameplay yet)
- No ship upgrades, repairs, or persistent damage between combats
- No multiple simultaneous enemy engagements
- No combat items, special abilities, or power-up integration
- No combat difficulty scaling beyond the base hit threshold
- No enemy AI targeting strategy (random targeting only)
- No combat animations beyond dice roll and HP bar changes
- No sound effects
- No flee option for the player during combat

## Technical Considerations

- **File location:** New module at `src/lib/game/combat.js` for all combat classes and engine. New component at `src/lib/components/CombatScreen.svelte`.
- **Seeded RNG:** `CombatEngine` accepts optional `rng` function for deterministic tests, same pattern as `gameState.js` and `boardObjects.js`.
- **enemyZoneMap:** Changing from `Set<string>` to also include a `Map<string, string>` for zone→enemy lookup. The existing `enemyZones` Set is kept for backward compatibility with movement checks.
- **Phase routing:** App.svelte adds `phase === 'combat'` routing to show CombatScreen. Board+Dice+HUD hidden during combat.
- **Reactivity:** When an enemy is removed from `boardData.enemies` and `boardData.obstacles`, Board.svelte's derived values automatically update since they iterate these collections.
- **Combat state isolation:** All combat state lives in the `combatState` store, not mixed into board stores. This keeps the board game state clean and makes it easy to resume.
- **executeMove interruption:** When combat triggers during path animation, the animation pauses at the engagement vertex. After combat resolves, the player is placed at their pre-combat position (not the engagement vertex).

## Success Metrics

- All existing 148+ tests pass without modification
- New tests in `combat.test.js` cover ship classes, combat engine, approach advantage, and full combat simulations
- Combat mini-game is playable end-to-end in the browser
- Enemies are correctly removed from the board only when Bridge is destroyed
- Enemies with damaged Weapons/Engines persist on the board with damaged state
- Player correctly retreats on combat timeout/flee, game over on player ship destroyed
- Approach direction correctly determines first-attack advantage

## Open Questions

- Should the combat screen show a visual representation of the ships, or just component status bars?
- Should there be a "target all" option or must the player always pick a specific component?
- If the player defeats all enemies on the board, should there be a bonus or special message?
- Should combat turns have a time limit, or can the player take as long as they want?
- Should the flee condition (Engines + Weapons destroyed) count as a win for score/stats purposes?
