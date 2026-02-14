# PRD: Combat & Board Bug Fixes and Enhancements (Formatted)

---

## User Story US-037

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Frontend (`src/lib/components/Board.svelte`, `src/App.svelte`)
- The direction selection UI and confirm move button are currently conditionally rendered, causing layout reflow when they appear
- Use CSS `min-height` or `visibility: hidden` (not `display: none`) to reserve fixed vertical space for the direction selection area
- The confirm move button slot should always be present in the DOM with a fixed height, toggling visibility rather than existence
- The board SVG uses `viewBox` + `preserveAspectRatio="xMidYMid meet"` for responsive scaling; surrounding elements must not push it during phase transitions
- Game phases `rolling` → `selectingDirection` trigger the layout shift; the UI below the dice/direction area must have constant height across both phases

### User Story
**US-037: Fix board layout shift when dice roll result is displayed**

**Description:** As a player, I want the game board to remain stable after rolling the dice so that the screen doesn't jump around when directional text and the confirm button appear.

**Acceptance Criteria:**
- [ ] Reserve fixed vertical space for the direction selection UI and confirm move button so they don't push the board down when they appear
- [ ] The board SVG and surrounding layout elements do not shift position when transitioning from `rolling` to `selectingDirection` phase
- [ ] The confirm move button slot is always present in the layout (visible or hidden) rather than conditionally rendered
- [ ] Verify in browser using dev-browser skill: roll dice, confirm no layout shift when direction options and confirm button appear
- [ ] Commit with message starting with `US-037`

---

## User Story US-038

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Frontend (`src/lib/components/CombatScreen.svelte`)
- The combat screen currently renders outcome text (hit/miss/destroyed) between the player and enemy health gauge panels, causing vertical layout shifts
- The ships container is a flex row with player panel, dice area, and enemy panel; outcome text should NOT be inserted within this container
- Move outcome text to a new fixed-height area below the target buttons section (after the `.target-buttons` div)
- The outcome text area should use a fixed `min-height` (e.g., 2rem) so appearing/disappearing text does not shift elements above it
- Relevant local state: `lastResult`, `showResult` control when outcome text is displayed
- HP bar containers use 8px height with 0.3s width transitions; these must remain positionally stable

### User Story
**US-038: Fix combat screen layout shift from outcome text**

**Description:** As a player, I want the combat screen to stay stable when attack results (hit/miss/destroyed) are displayed so that the health gauges don't jump around.

**Acceptance Criteria:**
- [ ] Move the attack outcome text (hit/miss/destroyed messages) to a fixed-height area below the ship health panels and target buttons, not between the player and enemy health gauges
- [ ] The outcome text area has a reserved fixed height so appearing/disappearing text doesn't shift the layout
- [ ] Player health panel, dice display, and enemy health panel remain in stable positions throughout combat
- [ ] Verify in browser using dev-browser skill: play through a combat encounter and confirm health gauges do not shift when result text appears
- [ ] Commit with message starting with `US-038`

---

## User Story US-039

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Game State (`src/lib/game/gameState.js`)
- Currently `startCombat()` creates a new `PlayerShip()` instance every time combat begins (line ~413), discarding any previous damage
- Create a persistent `PlayerShip` store (Svelte writable) or store on `boardData` that is initialized once in `initGame()`
- The store approach is preferred since `boardData` is spread for reactivity and ship instances have mutable internal state
- `startCombat()` must read from the persistent store instead of `new PlayerShip()`
- `resetGame()` and `initGame()` must create a fresh `PlayerShip` with default components (Weapons 2 HP, Engines 2 HP, Bridge 2 HP)
- No healing mechanic: damage persists for the entire game session

#### Combat Engine (`src/lib/game/combat.js`)
- `PlayerShip` defaults: Weapons (2 HP), Engines (2 HP), Bridge (2 HP)
- `CombatEngine` constructor accepts a `playerShip` parameter; no changes needed to the engine itself
- Enemy ships already persist via `enemyObj.combatShip` on the board object; player ship needs equivalent persistence

#### Testing (`src/lib/game/gameState.test.js`, `src/lib/game/combat.test.js`)
- Tests use seeded RNG via `initGame(cols, rows, seed)` for reproducibility
- Use `get()` from `svelte/store` to read store values in tests
- Test scenario: init game → enter combat → take damage → resolve combat → enter second combat → verify reduced HP → init new game → verify full HP

### User Story
**US-039: Persist player ship health across combat encounters**

**Description:** As a player, I want my ship's damage to carry over between combat encounters so that each fight has lasting consequences and I must manage my ship's health strategically.

**Acceptance Criteria:**
- [ ] Create a persistent `PlayerShip` instance stored in game state (e.g., a `playerShip` Svelte store or property on board data) that is initialized once in `initGame()` with default components (Weapons 2 HP, Engines 2 HP, Bridge 2 HP)
- [ ] `startCombat()` reuses the persistent `PlayerShip` instance instead of creating a new one each time
- [ ] Player ship component damage persists between combat encounters for the entire game session (no healing between combats)
- [ ] When `resetGame()` or `initGame()` is called, a fresh `PlayerShip` is created
- [ ] Unit tests verify: player takes damage in combat, enters second combat with reduced HP, fresh game resets HP
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-039`

---

## User Story US-040

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Combat Engine (`src/lib/game/combat.js`)
- Add a new `escape()` method to `CombatEngine` that sets `combatOver = true` and `result = 'escaped'`
- The `'escaped'` result type is new; add it alongside existing results: `'playerWin'`, `'playerDestroyed'`, `'playerLose'`, `'enemyFled'`
- Escape is always available on the player's turn (no turn minimum), including the very first turn
- Escape should be callable regardless of component state (even if weapons destroyed)

#### Game State (`src/lib/game/gameState.js`)
- `resolveCombat()` must handle the `'escaped'` result identically to `'playerLose'`/`'enemyFled'`: return player to `preCombatPlayerPos`, deduct movement pool by steps taken to reach engagement zone
- The `preCombatPlayerPos`, `preCombatPath`, and `triggerVertexIndex` are already stored in `combatState`

#### Frontend (`src/lib/components/CombatScreen.svelte`)
- Add an "Escape" button in the target buttons area or as a separate row below
- Button disabled when: `!isPlayerTurn`, `rolling`, or `combatOver`
- Style with warning/caution color (yellow/amber, e.g., `#f9a825` background) to distinguish from blue attack buttons
- Min 44px touch target, `touch-action: manipulation`
- On click: call `engine.escape()`, increment `tick`, trigger end combat handler

### User Story
**US-040: Add escape button to combat mini-game**

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

---

## User Story US-041

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Combat Engine (`src/lib/game/combat.js`)
- `EnemyShip` already has a `canAttack` getter that returns `false` when Weapons are destroyed; mirror this pattern on `PlayerShip`
- Add `canAttack` getter to `PlayerShip`: `get canAttack() { return !this.getComponent('Weapons').destroyed; }`
- The combat engine's `executePlayerAttack()` should check `playerShip.canAttack` and refuse if false (defensive check)
- This depends on US-040 (escape button) being implemented so the player has an alternative action

#### Frontend (`src/lib/components/CombatScreen.svelte`)
- When `playerShip.canAttack` is `false`, disable all target buttons (`.target-buttons button`)
- Display a contextual message (e.g., "Weapons destroyed - Escape to retreat!") in the outcome text area
- The escape button (from US-040) must remain enabled when weapons are destroyed
- Derive `canAttack` state from `engine.playerShip.canAttack` with the `tick` reactivity pattern already used for other derived states

### User Story
**US-041: Disable player attack when weapons are destroyed**

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

---

## User Story US-042

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Combat Engine (`src/lib/game/combat.js`)
- Add `isBridgeDestroyed` getter to `PlayerShip`: `get isBridgeDestroyed() { return this.getComponent('Bridge').destroyed; }`
- `EnemyShip` already has `isBridgeDestroyed`; mirror the same pattern
- In `_checkCombatEnd()` (lines 200-226), add a check for `playerShip.isBridgeDestroyed` after the enemy bridge check but before `playerShip.isDestroyed`
- Priority order in `_checkCombatEnd()`: (1) enemy bridge destroyed → playerWin, (2) player bridge destroyed → playerDestroyed, (3) all player components destroyed → playerDestroyed, (4) enemy weapons destroyed + engines intact → enemyFled, (5) max turns → playerLose
- If both bridges are destroyed on the same turn (edge case), player wins (enemy bridge checked first)

#### Game State (`src/lib/game/gameState.js`)
- `resolveCombat` already handles `'playerDestroyed'` result: sets `loseReason = 'enemy'` and `gamePhase = 'lost'`
- No changes needed to `resolveCombat`; the existing loss flow handles bridge destruction

#### Frontend (`src/lib/components/GameOver.svelte`)
- The GameOver component already displays for `gamePhase === 'lost'`; verify it shows an appropriate message for `loseReason = 'enemy'`

### User Story
**US-042: Player bridge destruction ends the game as a loss**

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

---

## User Story US-043

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Game State (`src/lib/game/gameState.js`)
- Currently `executeMove()` (lines 303-316) checks `boardData.enemyZoneMap` at the final position and immediately calls `startCombat()` for both vision and proximity zones
- For proximity zones (`zoneType === 'proximity'`): instead of calling `startCombat()`, store the pending engagement info and set a new game phase `'engagementChoice'`
- For vision zones (`zoneType === 'vision'`): continue auto-starting combat as currently implemented
- Store pending engagement data: `{ enemyId, approachAdvantage, preCombatPos, path, triggerIndex, zoneType }` in a new store or existing `combatState`
- Add two new exported functions: `confirmEngagement()` (proceeds to `startCombat()`) and `declineEngagement()` (skips combat, deducts steps, returns to rolling phase)
- `declineEngagement()`: player stays at current position (the zone vertex), movement pool deducted for steps taken, game continues to `'rolling'` phase
- The `enemyZoneMap` structure already includes `zoneType` per vertex: `Map<vertexId, { enemyId, zoneType: 'vision'|'proximity' }>`

#### Frontend (`src/lib/components/App.svelte` or new modal component)
- Show a modal dialog overlay when `gamePhase === 'engagementChoice'`
- Modal content: enemy info, approach advantage description (e.g., "Proximity Approach - You attack first"), two buttons
- "Engage Enemy" button: calls `confirmEngagement()`, styled with combat blue (#1565c0)
- "Avoid" button: calls `declineEngagement()`, styled neutral/gray
- Both buttons: min 44px touch targets, consistent with game UI (dark background, colored borders, pill-shaped)
- Modal has a semi-transparent backdrop overlay

### User Story
**US-043: Give player choice to engage proximity zone enemies**

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

---

## User Story US-044

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Board Objects (`src/lib/game/boardObjects.js`)
- The `Enemy` class currently sets `this.range = this.value` (line ~99), where `value` comes from difficulty scaling (1-10)
- Introduce a new `visionRange` property (1-6 inclusive) assigned using the seeded RNG during construction or in `generateBoardObjects()`
- Decouple `visionRange` from `value`: `visionRange` determines ray length only, `value` continues to represent difficulty contribution
- Update `getAffectedVertices()` to use `this.visionRange` instead of `this.range` for the ray loop limit
- Enemy component HP remains at 1 HP each regardless of vision range (no HP scaling)
- Enemies with shorter vision range contribute fewer difficulty points: update the difficulty budget calculation in `generateBoardObjects()` to account for `visionRange` (e.g., difficulty cost = visionRange, so a range-1 enemy is "cheap" and range-6 is "expensive")

#### Game State (`src/lib/game/gameState.js`)
- Zone computation in `initGame()` (lines 243-279) builds `enemyZoneMap` using `enemy.getAffectedVertices()`; this will automatically reflect the new `visionRange` since it reads from the enemy object
- No changes needed to zone computation logic itself

#### Testing
- All random values must use the seeded RNG for deterministic test reproducibility
- Verify vision range is always 1-6 inclusive across multiple seeded generations
- Verify `getAffectedVertices()` returns correct number of vertices based on `visionRange`

### User Story
**US-044: Randomize enemy vision range and scale combat strength**

**Description:** As a developer, I want enemy vision range to be randomly assigned (1-6) so that enemies vary in threat level, with longer vision indicating a more powerful enemy.

**Acceptance Criteria:**
- [ ] Modify the `Enemy` class constructor or `generateBoardObjects` to assign a random `visionRange` property between 1 and 6 (inclusive) using the seeded RNG
- [ ] The `visionRange` property replaces the current `range` (which equals `value`) for computing vision zone length via `getAffectedVertices()`
- [ ] Enemy combat ship component HP remains at 1 HP each regardless of vision range (no HP scaling with vision range)
- [ ] Enemies with shorter vision range contribute fewer "difficulty points" to the overall level (update difficulty budget calculation in `generateBoardObjects` if applicable)
- [ ] The vision range is visually reflected on the board by the length of the kill zone ray overlay
- [ ] Unit tests verify: vision range is always 1-6, seeded RNG produces deterministic ranges
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-044`

---

## User Story US-045

### Introduction
Fix bugs, UI layout issues, and missing gameplay features in the combat mini-game system to deliver a polished, playable combat experience.

### Goals
- Eliminate UI layout shifts on the main board and combat screen
- Enforce combat rules and add missing mechanics (escape, weapons-disabled, bridge destruction)
- Improve enemy vision and engagement zone behavior

### Technical Details

#### Game State (`src/lib/game/gameState.js`)
- `resolveCombat()` already handles enemy destruction by removing zone vertices from `enemyZoneMap` and `enemyZones` (lines 459-489)
- Extend this logic for disarmed (weapons destroyed) but surviving enemies: after any combat outcome except `'playerDestroyed'`, check `enemyObj.combatShip.canAttack`
- If `canAttack === false`: remove all vision zone vertices from `enemyZoneMap` for that enemy, keep only proximity zone vertices (BFS depth ≤ 2)
- Recompute proximity-only zones for the disarmed enemy: run BFS from enemy vertex (depth ≤ 2), add to `enemyZoneMap` with `zoneType: 'proximity'`

#### Board Objects (`src/lib/game/boardObjects.js`)
- Update `getAffectedVertices()` to check if `this.combatShip?.canAttack === false`; if so, return only `[this.vertexId]` (no vision ray)
- This ensures the board overlay rendering (which calls `getAffectedVertices()`) automatically hides the ray for disarmed enemies

#### Frontend (`src/App.svelte`, `src/lib/components/Board.svelte`)
- `enemyRenderData` in App.svelte calls `enemy.getAffectedVertices(null, boardData.rays)` to build `killZoneVertices`
- With the updated `getAffectedVertices()`, disarmed enemies will naturally return empty kill zones
- Board.svelte renders kill zone overlay circles from `killZoneVertices`; empty array = no overlay = no visible ray
- The enemy marker itself remains visible on the board (not destroyed, just disarmed)

#### Combat Re-engagement
- Disarmed enemies can still be engaged via proximity (landing on or adjacent to their vertex)
- When re-engaged, `enemyObj.combatShip` is reused (damage persists), and `canAttack` remains false, so enemy auto-misses all attacks

### User Story
**US-045: Remove disarmed enemy vision ray from the board**

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
