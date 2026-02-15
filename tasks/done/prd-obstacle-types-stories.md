# PRD Stories: New Obstacle Types — BlackHole & Enemy

---

## User Story US-022

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Create a `BlackHole` subclass that doesn't block movement but ends the game when the player passes through it
- Ensure all existing tests continue to pass

### Technical Details

#### Class Hierarchy
- `BlackHole` extends `Obstacle` (which extends `BoardObject`), inheriting `id`, `vertexId`, `type`, `value` properties
- Constructor: `(vertexId, value)` → calls `super(vertexId, value)`, then overrides `this.type = 'blackhole'` and recomputes `this.id = 'blackhole:' + vertexId`
- The `Obstacle` constructor calls `super(vertexId, 'obstacle', value)` — BlackHole must override the type after calling super, or call `BoardObject` constructor directly with `'blackhole'`

#### Key Behavioral Difference from Regular Obstacles
- Regular obstacles are added to `obstacleSet` (a `Set<string>`) which `movement.js` uses to block movement
- BlackHoles are **NOT** added to `obstacleSet` — they don't block movement, the player passes through them
- This means `getAvailableDirections()` and `computePath()` in `movement.js` will NOT treat blackholes as blockers (they only check `obstacles.has(vid)`)
- The death-on-contact behavior is handled in later stories (US-025, US-026)

#### Factory Update
- Update `createBoardObject(type, vertexId, value)` switch statement in `boardObjects.js` to handle `'blackhole'` → returns `new BlackHole(vertexId, value)`

#### Non-Goals
- No rendering changes (US-027)
- No movement system changes (US-025)
- No placement algorithm changes (US-024)

### User Story
**Description:** As a developer, I want a `BlackHole` class extending `Obstacle` so that blackholes can be placed on the board as pass-through hazards that end the game on contact.

**Acceptance Criteria:**
- [ ] `BlackHole` extends `Obstacle` with `type` set to `"blackhole"`
- [ ] Constructor accepts `(vertexId, value)` and calls the Obstacle constructor
- [ ] `onPlayerInteraction()` returns `{ killed: true, cause: 'blackhole' }`
- [ ] Blackholes are **not** added to `obstacleSet` (they don't block movement — the player passes through them)
- [ ] Export `BlackHole` from `boardObjects.js`
- [ ] Update `createBoardObject` factory to handle `"blackhole"` type
- [ ] Unit tests verify BlackHole type, value storage, onPlayerInteraction return, and that it is an instance of both BlackHole and Obstacle
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-022`

---

## User Story US-023

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Create an `Enemy` subclass with a facing direction (0-5) and a ray-based kill zone where the range equals the enemy's value (1-10)
- Ensure all existing tests continue to pass

### Technical Details

#### Class Structure
- `Enemy` extends `Obstacle` with `type` set to `"enemy"`
- Constructor: `(vertexId, value, direction)` where `direction` is 0-5 (one of the 6 hex movement directions)
- Additional properties: `this.direction = direction`, `this.range = this.value` (the value property doubles as the kill zone range — higher value = longer range = more dangerous)
- Override `this.type = 'enemy'` and `this.id = 'enemy:' + vertexId`

#### Kill Zone via getAffectedVertices
- Override `getAffectedVertices(adjacency, rays)` to return the enemy's own vertex PLUS the kill zone vertices
- Kill zone computation: `rays.get(this.vertexId)` returns the array of 6 ray objects. Find the ray matching `this.direction`. Take the first `this.range` vertex IDs from that ray's `vertices` array.
- The `rays` parameter comes from the board's precomputed ray map (`grid.rays` / `boardData.rays`)
- The base class signature is `getAffectedVertices(adjacency)` — the `rays` parameter is added as an optional second param for backward compatibility

#### obstacleSet Behavior
- Unlike BlackHole, the Enemy's own vertex **IS** added to `obstacleSet` — the enemy physically blocks movement at its position (like a regular obstacle)
- The kill zone vertices are NOT in `obstacleSet` — they're tracked separately (in `enemyZones` Set, computed in US-024)

#### Factory Update
- Update `createBoardObject` to handle `'enemy'` type. Since Enemy has an extra `direction` parameter, the factory signature may need adjustment or `direction` can be passed as part of an options object

#### Non-Goals
- No rendering (US-028), no placement (US-024), no movement changes (US-025)
- No enemy movement or patrol behavior — enemies are stationary

### User Story
**Description:** As a developer, I want an `Enemy` class extending `Obstacle` so that enemies can be placed on the board as directional sentries with ray-based kill zones.

**Acceptance Criteria:**
- [ ] `Enemy` extends `Obstacle` with `type` set to `"enemy"`
- [ ] Constructor accepts `(vertexId, value, direction)` where `direction` is 0-5 (one of the 6 hex directions) and `value` (1-10) doubles as the kill zone range (number of vertices along the facing direction)
- [ ] Properties: `direction` (number 0-5), `range` (equals `this.value`)
- [ ] `onPlayerInteraction()` returns `{ killed: true, cause: 'enemy' }`
- [ ] `getAffectedVertices(adjacency, rays)` returns the enemy's own vertex plus the kill zone vertices (the first `this.range` vertices along the enemy's facing direction ray)
- [ ] Enemy's own vertex **is** added to `obstacleSet` (the enemy physically blocks movement like a regular obstacle)
- [ ] Export `Enemy` from `boardObjects.js`
- [ ] Update `createBoardObject` factory to handle `"enemy"` type (accepts additional `direction` parameter)
- [ ] Unit tests verify Enemy type, value/direction/range storage, onPlayerInteraction return, getAffectedVertices with mock rays, and instanceof checks
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-023`

---

## User Story US-024

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Update the placement algorithm to distribute a mix of regular obstacles, blackholes, and enemies based on difficulty
- Ensure all existing tests continue to pass

### Technical Details

#### generateBoardObjects Signature Change
- Current: `generateBoardObjects(vertices, startVertex, targetVertex, difficulty, rng)`
- New: `generateBoardObjects(vertices, startVertex, targetVertex, difficulty, rng, rays)`
- The `rays` parameter is the board's precomputed ray map (`grid.rays`) needed for computing enemy kill zones
- The caller (`initGame` in `gameState.js`) already has `grid.rays` available — just pass it through

#### Type Distribution
- Total obstacle count uses the same formula: `Math.floor(eligible.length * obstaclePct)` where `obstaclePct = 0.05 + (difficulty - 1) * (0.15 / 9)`
- Of that total: ~60% regular obstacles (`Math.floor(total * 0.6)`), ~20% blackholes (`Math.floor(total * 0.2)`), ~20% enemies (`Math.floor(total * 0.2)`)
- At difficulty 1-2: no enemies are placed. Their allocation is redistributed to regular obstacles (so ~80% regular, ~20% blackhole at low difficulty)
- Blackholes can appear at any difficulty level

#### Enemy Placement Details
- Each enemy gets a random facing direction: `Math.floor(rng() * 6)` (0-5)
- Enemy range = enemy's value (already computed from difficulty-correlated formula: `[max(1, difficulty-2), min(10, difficulty+2)]`)
- Kill zone: use `rays.get(enemyVertexId)` to get the ray array, find the ray matching the enemy's direction, take the first `range` vertices from `ray.vertices`
- All kill zone vertices across all enemies are collected into a single `enemyZones: Set<string>`

#### obstacleSet Composition
- `obstacleSet` contains: regular obstacle vertex IDs + enemy vertex IDs (both block movement)
- `obstacleSet` does NOT contain: blackhole vertex IDs (they're passable)
- `hasValidPath()` BFS in `initGame` uses `obstacleSet` — blackholes are passable for pathfinding purposes

#### Return Type Changes
- Current: `{ obstacles, powerUps, obstacleSet }`
- New: `{ obstacles, powerUps, obstacleSet, blackholes, enemies, blackholeSet, enemyZones }`
- `blackholes: BlackHole[]`, `enemies: Enemy[]`
- `blackholeSet: Set<string>` (blackhole vertex IDs), `enemyZones: Set<string>` (all kill zone vertex IDs)

#### initGame Updates
- Pass `grid.rays` to `generateBoardObjects`
- Add to `boardData`: `blackholes` (array), `blackholeSet` (Set), `enemies` (array), `enemyZones` (Set)
- On failed path validation retry, clear all new fields too

### User Story
**Description:** As a developer, I want `generateBoardObjects` to place a mix of regular obstacles, blackholes, and enemies so that the board has varied hazards scaled by difficulty.

**Acceptance Criteria:**
- [ ] `generateBoardObjects` return type gains: `blackholes: BlackHole[]`, `enemies: Enemy[]`, `blackholeSet: Set<string>` (blackhole vertex IDs), `enemyZones: Set<string>` (all kill zone vertex IDs across all enemies)
- [ ] Of the total obstacle count (same formula as before), a portion are replaced by blackholes and enemies: ~20% blackholes, ~20% enemies, ~60% regular obstacles (use `Math.floor`)
- [ ] At difficulty 1-2, no enemies are placed (enemies only appear at difficulty 3+). Blackholes can appear at any difficulty.
- [ ] Each enemy gets a random facing direction (0-5) chosen via `rng`
- [ ] Enemy range = enemy's value (already difficulty-correlated from existing value formula)
- [ ] Enemy kill zone vertices are computed using the board's rays from the enemy's vertex in the enemy's facing direction, taking the first `range` vertices from that ray
- [ ] `generateBoardObjects` now accepts an additional parameter: `rays` (the board's precomputed ray map) for computing enemy kill zones
- [ ] Kill zone vertices that overlap with start or target vertices are still included in the zone (player can still die there)
- [ ] Blackhole vertices are NOT added to `obstacleSet` (they don't block); enemy vertices ARE added to `obstacleSet` (they block)
- [ ] `hasValidPath` BFS check uses `obstacleSet` (which includes enemy positions but NOT blackholes — blackholes are passable)
- [ ] Unit tests verify: type distribution ratios, blackholes not in obstacleSet, enemies in obstacleSet, enemy kill zone computation, no enemies at difficulty 1-2, kill zone set completeness
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-024`

---

## User Story US-025

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Update the movement system (`computePath`) to detect blackhole and enemy kill zone hazards during path computation
- Ensure all existing tests continue to pass

### Technical Details

#### computePath Changes (`src/lib/game/movement.js`)
- Current signature: `computePath(rays, direction, steps, obstacles, targetVertex)`
- New signature: `computePath(rays, direction, steps, obstacles, targetVertex, blackholes, enemyZones)`
- `blackholes` and `enemyZones` are optional (`Set<string>` or `undefined/null`)
- When both are omitted/null, behavior is identical to current — **full backward compatibility**

#### Hazard Check Order (per vertex in ray traversal)
For each vertex `vid` in the ray:
1. **Obstacle check** (existing): `obstacles.has(vid)` → set `stoppedByObstacle = true`, do NOT add to path, break
2. **Blackhole check** (new): `blackholes?.has(vid)` → add to path, set `hitBlackhole = true`, break
3. **Enemy zone check** (new): `enemyZones?.has(vid)` → add to path, set `hitByEnemy = true`, break
4. **Normal**: add to path, check target (existing)

Key difference from obstacles: blackholes and enemy zones **include** the vertex in the path (player enters it), then stop. Obstacles stop **before** (vertex not included).

#### Return Type Changes
- Current: `{ path, stoppedByObstacle, reachedTarget }`
- New: `{ path, stoppedByObstacle, reachedTarget, hitBlackhole, hitByEnemy }`
- `hitBlackhole` and `hitByEnemy` default to `false`

#### getAvailableDirections — NO Changes
- `getAvailableDirections()` only checks `obstacles.has(ray.vertices[0])` for the first vertex
- Since blackholes are NOT in `obstacleSet`, directions through blackholes remain available
- Enemy kill zone vertices are NOT in `obstacleSet`, so directions through kill zones remain available
- Enemy positions ARE in `obstacleSet`, so directions where an enemy is the first vertex are blocked (correct)

#### selectDirection Update (`src/lib/game/gameState.js`)
- Update the `computePath` call in `selectDirection()` to pass `boardData.blackholeSet` and `boardData.enemyZones`
- These are available on `boardData` after US-024's initGame changes

### User Story
**Description:** As a developer, I want `computePath` to detect when a path passes through a blackhole or enemy kill zone so that the game can respond appropriately.

**Acceptance Criteria:**
- [ ] `computePath` accepts two new optional parameters: `blackholes` (Set<string>) and `enemyZones` (Set<string>)
- [ ] When the path encounters a blackhole vertex: the vertex IS added to the path (player enters it), then path stops (player falls in). Return flag `hitBlackhole: true`
- [ ] When the path passes through an enemy kill zone vertex: the vertex IS added to the path (player enters the zone), then path stops (player is shot). Return flag `hitByEnemy: true`
- [ ] Hazard check order for each vertex: obstacle (stop before) > blackhole (include, then stop) > enemy zone (include, then stop) > target (include, then stop)
- [ ] `getAvailableDirections` is NOT changed — directions through blackholes and enemy zones remain available (player can select them)
- [ ] When `blackholes` and `enemyZones` are not provided (undefined/null), behavior is identical to current — full backward compatibility for existing callers
- [ ] Update `selectDirection` in `gameState.js` to pass `blackholes` and `enemyZones` from boardData to `computePath`
- [ ] Unit tests verify: path stops at blackhole (vertex included), path stops at enemy zone (vertex included), path through clear zone is unchanged, backward compat when params omitted, hazard priority ordering
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-025`

---

## User Story US-026

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Update game execution (`executeMove`) to trigger game-over when a hazard is encountered mid-animation
- Ensure all existing tests continue to pass

### Technical Details

#### New Store: loseReason (`src/lib/game/gameState.js`)
- Add `export const loseReason = writable(null)` alongside existing stores
- Set to a string when game is lost: `'blackhole'`, `'enemy'`, `'trapped'`, `'exhausted'`
- Reset to `null` in `resetGame()`
- Also set `loseReason` for existing lose conditions: `'trapped'` (when `isTrapped` returns true in both `rollDice` and `executeMove`), `'exhausted'` (when `newPool <= 0` in `executeMove`)

#### executeMove Death Checks (`src/lib/game/gameState.js`)
- After animation completes and `finalPos` is determined, BEFORE existing win/lose checks:
  1. Check `boardData.blackholeSet.has(finalPos)` → `loseReason.set('blackhole')`, `gamePhase.set('lost')`, return
  2. Check `boardData.enemyZones.has(finalPos)` → `loseReason.set('enemy')`, `gamePhase.set('lost')`, return
- This ordering ensures: hazard death > win check > pool exhaustion > trapped check
- Blackhole on the target vertex = death, NOT win (FR-5)

#### Existing Lose Conditions — Add loseReason
- `executeMove`: pool exhaustion (`newPool <= 0`) → `loseReason.set('exhausted')`
- `executeMove`: trapped after move → `loseReason.set('trapped')`
- `rollDice`: trapped before roll → `loseReason.set('trapped')`

#### Backward Compatibility
- `loseReason` is a new store — no existing code reads it, so no breakage
- Existing lose conditions get `loseReason` set but otherwise behave identically
- `boardData.blackholeSet` and `boardData.enemyZones` default to empty Sets if not present (for existing tests that call `initGame` without the new placement data)

#### Non-Goals
- No GameOver screen changes (just the store — UI deferred to future PRD)
- No sound effects or advanced death animations

### User Story
**Description:** As a developer, I want `executeMove` to end the game when the player moves into a blackhole or enemy kill zone so that the new obstacle types have real gameplay consequences.

**Acceptance Criteria:**
- [ ] After animation completes in `executeMove`, check if the final position is a blackhole → set `gamePhase` to `'lost'`
- [ ] After animation completes, check if the final position is in an enemy kill zone → set `gamePhase` to `'lost'`
- [ ] Hazard death check happens BEFORE the existing win/lose checks (blackhole on target = death, not win)
- [ ] The path preview (from `selectDirection`) already shows the path stopping at the hazard, so the player can see the danger before confirming
- [ ] Add a new store `loseReason` (writable, default `null`) to `gameState.js` that is set to `'blackhole'`, `'enemy'`, `'trapped'`, or `'exhausted'` when the game is lost — this enables the GameOver screen to display cause-specific messages later
- [ ] `loseReason` is reset to `null` in `resetGame()`
- [ ] Unit tests verify: blackhole death triggers lost phase, enemy zone death triggers lost phase, loseReason is set correctly for each cause, loseReason is null on reset, existing win/lose paths still work
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-026`

---

## User Story US-027

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Render blackholes visually on the board so players can strategize around them
- All hazard types are always visible on the board

### Technical Details

#### Board.svelte Prop Addition
- New prop: `blackholes = new Set()` — `Set<string>` of blackhole vertex IDs
- Added to the existing `$props()` destructure alongside `obstacles`

#### Rendering Approach
- Blackholes rendered as dark purple/black circles (`fill: #2d0040` or `#1a0033`) — visually distinct from regular obstacles (`#444`) and other vertex states
- Add a concentric ring indicator: a second smaller circle or ring stroke inside the blackhole vertex to suggest a vortex/spiral (SVG `<circle>` with `stroke` and `fill: none` inside)
- Blackhole vertices do NOT get the obstacle X marker — the `{#if obstacles.has(v.id)}` block in Board.svelte already only checks `obstacleSet`, and blackholes are not in that set
- Blackhole rendering goes in the vertex rendering section, similar to how obstacle styling works

#### vertexColor Update
- In the `vertexColor(v)` function, add a check for `blackholes.has(v.id)` returning the dark purple color
- This check should go BEFORE the obstacle check in priority order (since blackholes are not in `obstacles` set, they'd fall through to default otherwise)

#### isActiveVertex Update
- Add `blackholes.has(v.id)` to the `isActiveVertex()` check so center vertices with blackholes render as filled (not hollow rings)

#### App.svelte
- Pass `boardData.blackholeSet` as the `blackholes` prop to Board component (available after US-024)

#### Styling
- Add CSS classes: `.blackhole` for the dark fill, `.blackhole-ring` for the inner concentric indicator
- Dark mode: adjust blackhole colors for visibility on dark backgrounds

### User Story
**Description:** As a player, I want to see blackholes on the board so I can avoid them when choosing my direction.

**Acceptance Criteria:**
- [ ] Board.svelte accepts a new prop `blackholes` (Set<string>) for blackhole vertex IDs
- [ ] Blackholes are rendered as dark purple/black circles with a spiral or concentric ring indicator (visually distinct from regular obstacles)
- [ ] Blackhole vertices do NOT get the obstacle X marker — they get their own unique visual
- [ ] Blackholes are always visible regardless of game phase
- [ ] App.svelte passes `boardData.blackholeSet` (or equivalent) as the `blackholes` prop
- [ ] Verify in browser using dev server that blackholes are visually distinct and clearly identifiable
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-027`

---

## User Story US-028

---

### Introduction
Add two new obstacle subclasses — BlackHole (pass-through death) and Enemy (directional sentry with ray-based kill zone) — that extend the existing board object system and interact with the movement system to create new hazard types.

### Goals
- Render enemies with their facing direction and kill zone range on the board so players can plan safe paths
- All hazard types are always visible on the board

### Technical Details

#### Board.svelte Prop Addition
- New prop: `enemies = []` — array of objects: `{ vertexId: string, direction: number, range: number, killZoneVertices: string[] }`
- This pre-computed render data avoids importing ray logic into the component

#### Enemy Rendering
- Enemy vertex rendered as a red circle (`fill: #c62828` or `#d32f2f`) — distinct from regular obstacles (gray) and blackholes (purple)
- Direction indicator: a small triangle/arrow pointing from the enemy's position along the facing direction angle (`(Math.PI / 3) * direction`). Use an SVG `<polygon>` for the arrowhead, similar to the existing direction arrow rendering in `directionArrows`
- Enemy vertices should NOT get the obstacle X marker — add a check `!enemyVertexSet.has(v.id)` to the X marker conditional, or rely on computing an `enemyVertexSet` derived value

#### Kill Zone Rendering
- For each enemy, render semi-transparent red circles on each kill zone vertex: `fill: rgba(198, 40, 40, 0.25)` or a red overlay with low opacity
- Kill zone circles rendered BEFORE regular vertex circles in SVG layer order (so vertices render on top)
- Use the `killZoneVertices` array from the prop data — iterate and place a circle at each vertex's coordinates (look up from `grid.vertices`)

#### Derived Data
- Compute `enemyVertexSet = $derived(new Set(enemies.map(e => e.vertexId)))` for quick lookup in `vertexColor` and X-marker conditional
- Compute `killZoneSet = $derived(new Set(enemies.flatMap(e => e.killZoneVertices)))` for vertex color tinting

#### vertexColor Update
- Add check for enemy vertex IDs returning the red color (before obstacle check)
- Optionally tint kill zone vertices a light red if not in another active state

#### App.svelte
- Construct enemy render data from `boardData.enemies`:
  ```js
  enemies.map(e => ({
    vertexId: e.vertexId,
    direction: e.direction,
    range: e.range,
    killZoneVertices: e.getAffectedVertices(boardData.adjacency, boardData.rays).slice(1)
  }))
  ```
  (`.slice(1)` removes the enemy's own vertex from the kill zone list since it's rendered separately)
- Or use pre-computed data if `boardData` already includes it from US-024

#### Styling
- CSS classes: `.enemy-vertex` (red fill), `.kill-zone` (semi-transparent red), `.enemy-direction` (direction arrow/triangle)
- Dark mode: ensure red colors visible on dark backgrounds

### User Story
**Description:** As a player, I want to see enemies on the board with their facing direction and kill zone range so I can plan safe paths.

**Acceptance Criteria:**
- [ ] Board.svelte accepts a new prop `enemies` (array of `{ vertexId, direction, range, killZoneVertices }` objects)
- [ ] Enemies are rendered as red circles (or triangles pointing in their facing direction) — visually distinct from regular obstacles and blackholes
- [ ] Enemy kill zone is shown as a semi-transparent red overlay on the affected vertices (the ray of vertices in the enemy's facing direction, up to `range` steps)
- [ ] Kill zone rendering uses the precomputed `killZoneVertices` array (vertex IDs) from the enemy data, not recomputed in the component
- [ ] Enemy direction is visually indicated (arrow, triangle point, or similar) so the player can tell which way it faces
- [ ] App.svelte constructs the enemy render data from `boardData.enemies` and passes it as prop
- [ ] Verify in browser using dev server that enemies and their kill zones are clearly visible
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-028`
