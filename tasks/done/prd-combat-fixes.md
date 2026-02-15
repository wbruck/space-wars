# PRD: Combat & Board Bug Fixes and Enhancements

## Introduction

This PRD addresses a collection of bugs, UI layout issues, and missing gameplay features discovered during playtesting of the combat mini-game system. Issues range from layout shifts caused by dynamic text insertion, to missing combat mechanics (escape button, weapons-disabled state, bridge destruction loss condition), to enemy vision and engagement zone improvements. These fixes are critical for a polished, playable combat experience.

## Goals

- Eliminate UI layout shifts on both the main board and combat screen caused by dynamic text insertion
- Persist player ship health across multiple combat encounters (no healing)
- Add an escape mechanic to the combat mini-game with movement pool cost
- Enforce combat rules: no attacking with destroyed weapons, bridge destruction = game over
- Give players a choice to engage enemies in proximity zones while forcing engagement in vision zones
- Implement variable enemy vision range (1-6) that scales enemy combat strength
- Remove disarmed enemy vision rays from the board while keeping proximity engagement

## User Stories

### US-037: Fix board layout shift when dice roll result is displayed
**Description:** As a player, I want the game board to remain stable after rolling the dice so that the screen doesn't jump around when directional text and the confirm button appear.

**Acceptance Criteria:**
- [ ] Reserve fixed vertical space for the direction selection UI and confirm move button so they don't push the board down when they appear
- [ ] The board SVG and surrounding layout elements do not shift position when transitioning from `rolling` to `selectingDirection` phase
- [ ] The confirm move button slot is always present in the layout (visible or hidden) rather than conditionally rendered
- [ ] Verify in browser using dev-browser skill: roll dice, confirm no layout shift when direction options and confirm button appear
- [ ] Commit with message starting with `US-037`

### US-038: Fix combat screen layout shift from outcome text
**Description:** As a player, I want the combat screen to stay stable when attack results (hit/miss/destroyed) are displayed so that the health gauges don't jump around.

**Acceptance Criteria:**
- [ ] Move the attack outcome text (hit/miss/destroyed messages) to a fixed-height area below the ship health panels and target buttons, not between the player and enemy health gauges
- [ ] The outcome text area has a reserved fixed height so appearing/disappearing text doesn't shift the layout
- [ ] Player health panel, dice display, and enemy health panel remain in stable positions throughout combat
- [ ] Verify in browser using dev-browser skill: play through a combat encounter and confirm health gauges do not shift when result text appears
- [ ] Commit with message starting with `US-038`

### US-039: Persist player ship health across combat encounters
**Description:** As a player, I want my ship's damage to carry over between combat encounters so that each fight has lasting consequences and I must manage my ship's health strategically.

**Acceptance Criteria:**
- [ ] Create a persistent `PlayerShip` instance stored in game state (e.g., a `playerShip` Svelte store or property on board data) that is initialized once in `initGame()` with default components (Weapons 2 HP, Engines 2 HP, Bridge 2 HP)
- [ ] `startCombat()` reuses the persistent `PlayerShip` instance instead of creating a new one each time
- [ ] Player ship component damage persists between combat encounters for the entire game session (no healing between combats)
- [ ] When `resetGame()` or `initGame()` is called, a fresh `PlayerShip` is created
- [ ] Unit tests verify: player takes damage in combat, enters second combat with reduced HP, fresh game resets HP
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-039`

### US-040: Add escape button to combat mini-game
**Description:** As a player, I want an escape button during combat so that I can retreat from a fight I'm losing, returning to my pre-move position at the cost of the movement steps used.

**Acceptance Criteria:**
- [ ] Add an "Escape" button visible on the combat screen during the player's turn
- [ ] Clicking Escape ends combat immediately with a new result type `'escaped'`
- [ ] The escape button is always available on the player's turn regardless of component state
- [ ] `resolveCombat` handles `'escaped'` result: player returns to `preCombatPlayerPos` and movement pool is deducted by the number of steps taken to reach the engagement zone (same as `playerLose`/`enemyFled` behavior)
- [ ] The escape button is disabled during the enemy's turn and while dice are rolling
- [ ] Escape button has min 44px touch target and clear visual styling (e.g., yellow/warning color)
- [ ] Unit tests verify: escape result returns player to pre-combat position, movement pool deducted correctly
- [ ] All tests pass (`npm test`)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with `US-040`

### US-041: Disable player attack when weapons are destroyed
**Description:** As a player, when my ship's weapons are destroyed I should not be able to attack enemies, leaving escape as my only option.

**Acceptance Criteria:**
- [ ] Add a `canAttack` getter to `PlayerShip` that returns `false` when the Weapons component is destroyed (mirror the existing `EnemyShip.canAttack` pattern)
- [ ] When `playerShip.canAttack` is `false`, all target buttons in the combat screen are disabled
- [ ] Display a message indicating weapons are offline (e.g., "Weapons destroyed - Escape to retreat!")
- [ ] The escape button remains enabled when weapons are destroyed
- [ ] If the player's weapons are destroyed and they have no escape button, the combat auto-resolves (but with the escape button from US-040, the player must manually choose to escape)
- [ ] Unit tests verify: destroying player weapons disables attack capability
- [ ] All tests pass (`npm test`)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with `US-041`

### US-042: Player bridge destruction ends the game as a loss
**Description:** As a player, if my ship's bridge is destroyed during combat, the game should immediately end with a loss, since the bridge is the command center.

**Acceptance Criteria:**
- [ ] Add a `isBridgeDestroyed` getter to `PlayerShip` that returns `true` when the Bridge component is destroyed
- [ ] In `_checkCombatEnd()`, add a check: if `playerShip.isBridgeDestroyed` is true, set `result = 'playerDestroyed'` (same as full destruction)
- [ ] This check should have priority over other end conditions except enemy bridge destruction (if both bridges destroyed same turn, player wins)
- [ ] `resolveCombat` with `'playerDestroyed'` already transitions to the loss screen with `loseReason = 'enemy'`
- [ ] The loss screen (GameOver component) displays appropriately for bridge destruction
- [ ] Unit tests verify: destroying player bridge ends combat as player loss, game phase transitions to 'lost'
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-042`

### US-043: Give player choice to engage proximity zone enemies
**Description:** As a player, when I land on a proximity engagement zone I want the choice to engage or avoid the enemy, while vision zone encounters remain mandatory.

**Acceptance Criteria:**
- [ ] When movement ends on a proximity zone vertex, show a modal dialog before combat starts with two buttons: "Engage Enemy" and "Avoid"
- [ ] The modal displays the enemy's name/info and the approach advantage (e.g., "Proximity Approach - You attack first")
- [ ] Choosing "Engage Enemy" starts combat normally via `startCombat()`
- [ ] Choosing "Avoid" skips combat entirely: player stays at their current position, movement pool is deducted for steps taken, and the game continues to the next turn
- [ ] When movement ends on a vision zone vertex, combat starts automatically with no choice (mandatory engagement)
- [ ] Add a new game phase `'engagementChoice'` or handle via a modal state so the choice is properly integrated into the game flow
- [ ] The modal has min 44px touch targets and is styled consistently with the game UI
- [ ] Unit tests verify: proximity zone triggers choice, vision zone auto-engages, avoid skips combat
- [ ] All tests pass (`npm test`)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with `US-043`

### US-044: Randomize enemy vision range and scale combat strength
**Description:** As a developer, I want enemy vision range to be randomly assigned (1-6) so that enemies vary in threat level, with longer vision indicating a more powerful enemy.

**Acceptance Criteria:**
- [ ] Modify the `Enemy` class constructor or `generateBoardObjects` to assign a random `visionRange` property between 1 and 6 (inclusive) using the seeded RNG
- [ ] The `visionRange` property replaces the current `range` (which equals `value`) for computing vision zone length via `getAffectedVertices()`
- [ ] Enemy combat ship component HP remains at 1 HP each regardless of vision range (no HP scaling with vision range)
- [ ] Enemies with shorter vision range contribute fewer "difficulty points" to the overall level (update difficulty budget calculation in `generateBoardObjects` if applicable)
- [ ] The vision range is visually reflected on the board by the length of the kill zone ray overlay
- [ ] Unit tests verify: vision range is always 1-6, combat HP scales with range, seeded RNG produces deterministic ranges
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-044`

### US-045: Remove disarmed enemy vision ray from the board
**Description:** As a player, when I destroy an enemy's weapons in combat, their vision ray should be removed from the board since they can no longer threaten at range, but I can still engage them by landing on their proximity zone.

**Acceptance Criteria:**
- [ ] After combat resolves (any outcome except `playerDestroyed`), check if the surviving enemy's weapons are destroyed
- [ ] If enemy weapons are destroyed: remove all vision zone vertices from `enemyZoneMap` and the kill zone overlay for that enemy, keep only proximity zone vertices
- [ ] Update `getAffectedVertices()` or the zone computation to skip vision ray for enemies with destroyed weapons (return only the enemy's own vertex)
- [ ] The enemy remains on the board (not destroyed) and can still be engaged via proximity (landing on or adjacent to their vertex)
- [ ] The board visually reflects the removal: no more red/colored ray extending from the disarmed enemy
- [ ] If the enemy later re-engages (proximity), they still cannot attack (existing `canAttack` logic handles this)
- [ ] Unit tests verify: disarmed enemy has no vision zone, proximity zone still exists, re-engagement works
- [ ] All tests pass (`npm test`)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with `US-045`

## Functional Requirements

- FR-1: The board layout must reserve fixed space for direction selection UI and confirm button to prevent layout shifts during the `rolling` → `selectingDirection` transition
- FR-2: The combat screen must display attack outcome text in a fixed-height area below the combat panels, not between health gauges
- FR-3: A single `PlayerShip` instance must persist across all combat encounters within a game session, with no healing between combats
- FR-4: The combat screen must include an "Escape" button that ends combat and returns the player to their pre-move position with movement pool deduction for steps used
- FR-5: When the player's Weapons component is destroyed, all attack target buttons must be disabled; only the Escape button remains functional
- FR-6: Destruction of the player's Bridge component immediately ends combat as a loss and transitions to the game-over screen
- FR-7: Proximity zone engagement must present a modal choice (Engage/Avoid); vision zone engagement must be mandatory
- FR-8: Enemy vision range must be randomly assigned between 1-6 using seeded RNG; enemy component HP remains 1 HP each (no scaling)
- FR-9: Enemies with destroyed weapons must have their vision ray removed from the board while retaining proximity engagement capability

## Non-Goals (Out of Scope)

- No ship repair or healing mechanics (damage is permanent for the entire game)
- No player ship component upgrades or customization during gameplay
- No changes to the enemy flee mechanic (already implemented)
- No changes to the dice rolling or hit threshold mechanics
- No changes to the board size or hex grid system
- No new enemy types or behaviors beyond vision range scaling
- No sound effects or combat animations beyond existing dice animation
- No multiplayer combat features

## Design Considerations

- **Layout stability:** Use CSS `min-height`, `visibility: hidden` (not `display: none`), or placeholder elements to reserve space for dynamic content
- **Modal dialog:** Reuse existing game UI styling (dark background, colored borders, pill-shaped buttons) for the proximity engagement choice modal
- **Escape button:** Style with a warning/caution color (yellow/amber) to distinguish from attack buttons (blue) and clearly communicate retreat
- **Disabled attack buttons:** When weapons are destroyed, gray out target buttons and show a contextual message directing the player to use Escape
- **Enemy vision overlay:** Already uses `rgba(198,40,40,0.25)` for kill zones; shorter rays will naturally appear less threatening on the board

## Technical Considerations

- **Player ship persistence:** Store the `PlayerShip` instance either as a new Svelte writable store (`playerShip`) or as a property on `boardData`. The store approach is cleaner since `boardData` is spread for reactivity and ship instances have mutable state.
- **Combat engine changes:** `_checkCombatEnd()` must be updated to check `playerShip.isBridgeDestroyed` before checking `playerShip.isDestroyed`. A new `'escaped'` result type needs to be added.
- **Enemy zone recomputation:** After combat resolves, the zone map needs partial recomputation for the specific enemy. This is already partially handled in `resolveCombat` for destroyed enemies; extend it for disarmed enemies.
- **Vision range vs. value:** The `Enemy.range` property currently equals `this.value`. Introduce a separate `visionRange` property (1-6) and decouple it from `value`. Enemy component HP stays at 1 HP each.
- **Seeded RNG:** All random values (vision range) must use the game's seeded RNG for deterministic test reproducibility.
- **Existing tests:** 148 tests across 6 files. Changes must not break existing tests. New tests should follow existing patterns (seeded RNG, `get()` from `svelte/store` for reading stores).

## Success Metrics

- Zero layout shifts during gameplay transitions (board roll → direction select, combat hit/miss display)
- Player ship health correctly persists across 3+ sequential combat encounters in a single game
- Escape button successfully returns player to pre-move position with correct pool deduction
- Players cannot deal damage after weapons are destroyed
- Bridge destruction immediately ends the game with the loss screen
- Proximity encounters show choice modal; vision encounters auto-engage
- Enemy vision rays vary in length (1-6) across the board
- Disarmed enemies have no vision ray but remain engageable via proximity
- All existing tests continue to pass; new tests cover all acceptance criteria

## Resolved Questions

- **HP scaling:** Vision range does not affect enemy component HP. All enemy components remain at 1 HP each. Vision range only determines ray length and difficulty point contribution.
- **Avoid cost:** Choosing "Avoid" on a proximity engagement has no extra cost beyond the normal movement pool deduction for steps taken.
- **Escape timing:** The escape button is always available on every player turn, including the very first turn. No minimum engagement required.
