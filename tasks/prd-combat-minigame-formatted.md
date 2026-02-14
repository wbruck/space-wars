-------------
User Story US-029
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- Create new module at `src/lib/game/combat.js` for all combat classes
- `ShipComponent` class: `name`, `maxHp`, `currentHp`, `destroyed` getter, `takeDamage(amount)` method
- `Ship` base class: `components` array, `isDestroyed` getter, `getActiveComponents()`, `getComponent(name)`
- `PlayerShip` extends `Ship` with default components: Weapons (2 HP), Engines (2 HP), Bridge (2 HP), configurable via constructor
- Follow existing patterns: seeded RNG via constructor parameter for deterministic tests (same as `gameState.js` and `boardObjects.js`)

## User Story
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

-------------
User Story US-030
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- `EnemyShip` extends `Ship` in `src/lib/game/combat.js` with default components: Weapons (1 HP), Engines (1 HP), Bridge (1 HP)
- Constructor accepts optional `components` array for future customization
- Behavioral getters: `canAttack` (false if Weapons destroyed), `canFlee` (false if Engines destroyed), `isBridgeDestroyed` (true if Bridge destroyed)
- Bridge destruction is the ONLY way to fully defeat an enemy and remove it from the board
- Destroying only Weapons or Engines leaves the enemy in place with damaged state

## User Story
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

-------------
User Story US-031
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- `CombatEngine` class in `combat.js` with constructor: `{ playerShip, enemyShip, maxTurns, hitThreshold, rng? }`
- Defaults: `maxTurns` = 5 (each side gets up to 5 attacks), `hitThreshold` = 4 (d6 roll of 4+ is a hit)
- State: `currentTurn`, `isPlayerTurn`, `turnLog`, `combatOver`, `result` (null | 'playerWin' | 'playerLose' | 'playerDestroyed' | 'enemyFled')
- `rng` parameter accepts `() => number` for deterministic tests (same seeded RNG pattern as board game)
- Combat end conditions: Bridge destroyed → `playerWin`, all player components destroyed → `playerDestroyed`, maxTurns reached → `playerLose`, enemy Engines+Weapons both destroyed → `enemyFled`
- `playerWin` (Bridge hit) is the ONLY outcome that removes the enemy from the board
- `playerDestroyed` ends the entire game (gamePhase → 'lost'). `playerLose` (timeout) triggers retreat only.

## User Story
**Description:** As a developer, I want a combat engine that resolves turn-based attacks between player and enemy ships using dice rolls so that combat has clear, testable mechanics.

**Acceptance Criteria:**
- [ ] Create `CombatEngine` class in `combat.js` with constructor accepting `{ playerShip, enemyShip, maxTurns, hitThreshold, rng? }`
- [ ] `maxTurns` defaults to 5 (each side gets up to 5 attack turns), `hitThreshold` defaults to 4 (roll of 4+ on d6 is a hit)
- [ ] `CombatEngine` has state: `currentTurn` (number, starts at 1), `isPlayerTurn` (boolean), `turnLog` (array of turn results), `combatOver` (boolean), `result` (null | 'playerWin' | 'playerLose' | 'playerDestroyed' | 'enemyFled')
- [ ] `setFirstAttacker(attacker)` method sets who goes first: `'player'` or `'enemy'`. Called before combat starts based on approach direction.
- [ ] `rollAttack()` method: rolls a d6 using `rng` (or Math.random), returns `{ roll: number, isHit: boolean }` where `isHit = roll >= hitThreshold`
- [ ] `executePlayerAttack(targetComponentName)` method: player chooses which enemy component to target. Rolls attack, applies damage if hit, logs result, advances turn. Returns `{ roll, isHit, targetComponent, destroyed, combatOver, result }`
- [ ] `executeEnemyAttack()` method: enemy auto-targets a random active player component. Rolls attack, applies damage if hit, logs result, advances turn. If enemy `canAttack` is false (Weapons destroyed), the attack auto-misses. Returns `{ roll, isHit, targetComponent, destroyed, combatOver, result }`
- [ ] Combat ends when: Bridge destroyed (`playerWin`), all player components destroyed (`playerDestroyed`), maxTurns reached by both sides (`playerLose`), or enemy Engines destroyed AND Weapons destroyed (`enemyFled`)
- [ ] Result `'playerWin'` (Bridge hit) is the ONLY outcome that removes the enemy from the board. `'enemyFled'` leaves the enemy on the board.
- [ ] Result `'playerDestroyed'` ends the entire game (gamePhase → 'lost', loseReason → 'enemy'). Result `'playerLose'` (timeout) triggers retreat only.
- [ ] `rng` parameter accepts a `() => number` function for deterministic tests
- [ ] Unit tests cover: hit/miss at various rolls, component targeting and damage, Weapons-destroyed auto-miss, Bridge-destroyed instant win, turn counting, max turns reached, player turn order, full combat simulation with seeded RNG
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-031`

-------------
User Story US-032
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- `getApproachAdvantage(playerDirection, enemyFacingDirection)` function in `combat.js`
- Direction math uses modular arithmetic on 6 hex directions (0-5):
  - **Front approach** (head-on): `playerDir === (enemyFacing + 3) % 6` → `{ firstAttacker: 'enemy', bonusAttacks: 0 }` (enemy attacks first)
  - **Rear approach** (from behind): `playerDir === enemyFacing` → `{ firstAttacker: 'player', bonusAttacks: 1 }` (player gets 2 attacks before enemy's first turn)
  - **Side approach** (any other): `{ firstAttacker: 'player', bonusAttacks: 0 }` (player first, normal alternation)
- Hex grid uses 6 directions from 3 lattice axes x 2 directions (existing `hexGrid.js` pattern)

## User Story
**Description:** As a developer, I want a function that determines first-attack advantage based on the player's movement direction relative to the enemy's facing direction.

**Acceptance Criteria:**
- [ ] Create `getApproachAdvantage(playerDirection, enemyFacingDirection)` function in `combat.js`
- [ ] **Front approach** (head-on): player's movement direction equals `(enemyFacingDirection + 3) % 6` (player moves directly into the enemy's front). Result: `{ firstAttacker: 'enemy', bonusAttacks: 0 }` — enemy attacks first
- [ ] **Rear approach** (from behind): player's movement direction equals `enemyFacingDirection` (player moves in the same direction the enemy faces, approaching from behind). Result: `{ firstAttacker: 'player', bonusAttacks: 1 }` — player gets 2 attacks before enemy's first turn
- [ ] **Side approach** (any other direction): Result: `{ firstAttacker: 'player', bonusAttacks: 0 }` — player attacks first, normal alternation
- [ ] Unit tests verify all 6 directions for a given enemy facing, covering front/rear/side classification for each
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-032`

-------------
User Story US-033
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- Add `'combat'` to valid `gamePhase` values in `gameState.js`
- New store: `combatState` (writable, null | { engine, enemyId, approachAdvantage, preCombatPlayerPos, preCombatPath, triggerVertexIndex })
- Combat state is isolated from board stores — all combat data lives in `combatState` store, keeping board game state clean
- `startCombat()` creates a CombatEngine, populates combatState, transitions to `'combat'` phase
- `resolveCombat(result)` handles three outcome paths:
  - `'playerWin'` → remove enemy from `boardData.enemies`, `obstacleSet`, `enemyZones`, `enemyZoneMap`; restore player to pre-combat position; phase → `'rolling'`
  - `'playerLose'`/`'enemyFled'` → enemy stays with damaged state; restore player to pre-combat position; deduct dice roll from pool; phase → `'rolling'`
  - `'playerDestroyed'` → `loseReason` → `'enemy'`, `gamePhase` → `'lost'`
- `combatState` reset to `null` in `resetGame()`

## User Story
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

-------------
User Story US-034
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- In `movement.js` `computePath`: replace `hitByEnemy` stop behavior with `engageEnemy: { vertexIndex, enemyId }` — vertex IS included in path (player enters engagement zone)
- `computePath` accepts optional `enemyZoneMap` parameter: `Map<string, string>` (zone vertex ID → enemy ID) instead of just the Set
- `generateBoardObjects` in `boardObjects.js` returns additional `enemyZoneMap: Map<string, string>` alongside existing `enemyZones: Set<string>`
- `boardData` gains `enemyZoneMap` property
- In `executeMove` (`gameState.js`): when animation reaches engagement vertex, pause and call `startCombat()` with enemy ID, approach advantage (via `getApproachAdvantage` using selected direction and enemy facing), pre-combat position, and path info
- The existing `boardData.enemyZones.has(finalPos)` instant-death check in `executeMove` is **removed**
- Backward compatibility: existing tests without enemy zones still pass; when `enemyZoneMap` is undefined, no engagement triggers

## User Story
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

-------------
User Story US-035
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- Create `src/lib/components/CombatScreen.svelte` component
- `App.svelte` routes `phase === 'combat'` to show CombatScreen; Board+Dice+HUD hidden during combat
- Reuse `Dice.svelte` pattern for dice roll animation in combat
- Touch-friendly: all buttons min 44px, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`
- Interactive elements need `role="button"`, `tabindex="0"`, `onkeydown` for a11y (existing SVG pattern)
- Enemy turn auto-executes after 500ms delay; combat result message shows for 1.5s before resolving
- Uses Svelte 5 runes syntax: `$props()`, `$state()`, `$derived()` patterns

## User Story
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

-------------
User Story US-036
---------------
## Introduction
Add a turn-based combat mini-game triggered when the player enters an enemy's engagement zone, replacing instant-death kill zones with ship-to-ship component-targeting combat that determines board outcomes based on which components are destroyed.

## Goals
- Create extensible base classes for player and enemy ships with configurable components
- Build a turn-based combat engine with dice-based hit resolution
- Replace enemy kill zone instant-death with engagement zone combat triggers
- Handle combat outcomes: Bridge destruction removes enemy, other hits leave enemy in place, player destruction ends game

## Technical Details
- When enemy removed from board (`resolveCombat('playerWin')`): delete from `boardData.obstacles`, `boardData.enemyZones`, `boardData.enemyZoneMap`, and `boardData.enemies` array
- Board.svelte reactively updates since it iterates these collections — enemy markers, direction arrows, and kill zone overlays disappear automatically
- Enemy damaged state persists: if player re-engages the same enemy later, component damage carries over (Weapons/Engines HP not reset)
- `playerDestroyed` result sets `loseReason` to `'enemy'` and `gamePhase` to `'lost'` — no retreat, game is over
- On retreat: dice roll's movement points deducted from pool (move is "wasted"), player doesn't physically move
- Removing an enemy may open new valid paths to the target vertex

## User Story
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
