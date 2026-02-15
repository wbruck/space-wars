# PRD: New Obstacle Types — BlackHole & Enemy

## Introduction

Add two new obstacle subclasses to the board object system: **BlackHole** (a pass-through hazard that kills the player on contact) and **Enemy** (a directional sentry with a ray-based kill zone). Both extend the existing `Obstacle` class with their own type strings, are always visible on the board, and interact with the movement system to end the game when the player enters their danger zones.

## Goals

- Create a `BlackHole` subclass that doesn't block movement but ends the game when the player passes through it
- Create an `Enemy` subclass with a facing direction (0-5) and a ray-based kill zone where the range equals the enemy's value (1-10)
- Update the movement system (`computePath`) to detect blackhole and enemy kill zone hazards during path computation
- Update game execution (`executeMove`) to trigger game-over when a hazard is encountered mid-animation
- Update the placement algorithm to distribute a mix of regular obstacles, blackholes, and enemies based on difficulty
- Render blackholes and enemies (with direction/range indicators) visually on the board
- Ensure all existing tests continue to pass

## User Stories

### US-022: Create BlackHole subclass
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

### US-023: Create Enemy subclass
**Description:** As a developer, I want an `Enemy` class extending `Obstacle` so that enemies can be placed on the board as directional sentries with ray-based kill zones.

**Acceptance Criteria:**
- [ ] `Enemy` extends `Obstacle` with `type` set to `"enemy"`
- [ ] Constructor accepts `(vertexId, value, direction)` where `direction` is 0-5 (one of the 6 hex directions) and `value` (1-10) doubles as the kill zone range (number of vertices along the facing direction)
- [ ] Properties: `direction` (number 0-5), `range` (equals `this.value`)
- [ ] `onPlayerInteraction()` returns `{ killed: true, cause: 'enemy' }`
- [ ] `getAffectedVertices(adjacency)` returns the enemy's own vertex plus the kill zone vertices (the first `this.range` vertices along the enemy's facing direction ray). This requires access to the board's ray data, so accept an optional second parameter: `getAffectedVertices(adjacency, rays)`
- [ ] Enemy's own vertex **is** added to `obstacleSet` (the enemy physically blocks movement like a regular obstacle)
- [ ] Export `Enemy` from `boardObjects.js`
- [ ] Update `createBoardObject` factory to handle `"enemy"` type (accepts additional `direction` parameter)
- [ ] Unit tests verify Enemy type, value/direction/range storage, onPlayerInteraction return, getAffectedVertices with mock rays, and instanceof checks
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-023`

### US-024: Update placement algorithm for new obstacle types
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

### US-025: Update path computation for hazard detection
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

### US-026: Update game execution for hazard deaths
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

### US-027: Render blackholes on the board
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

### US-028: Render enemies with direction and range indicators
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

## Functional Requirements

- FR-1: `BlackHole` extends `Obstacle` with `type = "blackhole"`. Does NOT block movement (not in `obstacleSet`). Kills player on contact.
- FR-2: `Enemy` extends `Obstacle` with `type = "enemy"`. Blocks movement at its own vertex (in `obstacleSet`). Has `direction` (0-5) and `range` (= `value`). Kill zone is a ray of `range` vertices from enemy position along facing direction.
- FR-3: `computePath` must detect blackhole and enemy zone vertices in the path, include them, stop there, and return `hitBlackhole` / `hitByEnemy` flags.
- FR-4: `getAvailableDirections` must NOT filter out directions that pass through blackholes or enemy zones — only regular obstacles block direction availability.
- FR-5: `executeMove` must check for hazard deaths before checking win/lose conditions. Blackhole death takes priority over target reached.
- FR-6: `generateBoardObjects` distributes obstacle allocation as ~60% regular, ~20% blackhole, ~20% enemy. No enemies below difficulty 3.
- FR-7: Enemy kill zones are computed from the board's ray data. `generateBoardObjects` requires the `rays` parameter.
- FR-8: `loseReason` store tracks cause of death (`'blackhole'`, `'enemy'`, `'trapped'`, `'exhausted'`).
- FR-9: Blackholes rendered as dark purple/black with unique indicator (not X marker). Enemies rendered as red with directional indicator. Kill zones shown as semi-transparent red overlays.
- FR-10: All hazard types are always visible on the board.

## Non-Goals (Out of Scope)

- No GameOver screen changes to display lose reason (just the store — UI deferred)
- No enemy movement or patrol behavior — enemies are stationary sentries
- No blackhole gravity effects (pulling player closer, affecting adjacent vertices)
- No way to destroy or disable enemies or blackholes
- No sound effects or advanced animations for hazard deaths
- No changes to power-up system
- No fog-of-war or hidden hazards

## Technical Considerations

- **Class hierarchy:** `BlackHole` and `Enemy` both extend `Obstacle` (which extends `BoardObject`). They use their own `type` strings (`"blackhole"`, `"enemy"`) so they're distinguishable from regular obstacles via `type` checks or `instanceof`.
- **obstacleSet composition:** Regular obstacles + enemy positions go into `obstacleSet`. Blackholes do NOT. This means `getAvailableDirections` and `computePath`'s existing obstacle check naturally handle enemy-position-blocking without code changes. Only blackhole and kill-zone detection is new logic.
- **computePath backward compat:** New params `blackholes` and `enemyZones` are optional. When omitted, behavior is identical to current. This means all existing movement tests pass without modification.
- **Enemy kill zone computation:** Uses `rays.get(enemyVertexId)` to find the ray in the enemy's facing direction, then takes the first `range` vertex IDs from that ray. This leverages the existing precomputed ray infrastructure.
- **generateBoardObjects signature change:** Adds `rays` parameter. The caller (`initGame`) already has `grid.rays` available, so this is a simple pass-through.
- **Render data:** Board.svelte receives kill zone vertices as pre-computed arrays (from boardData), not raw enemy objects. This keeps rendering logic simple and avoids importing ray computation into the component.
- **Testing:** Seeded RNG ensures deterministic placement of blackholes, enemies, and their directions/ranges. Enemy kill zone tests can use small boards with known ray structures.

## Success Metrics

- All existing 148+ tests pass without modification
- New tests comprehensively cover both obstacle types, placement distribution, path hazard detection, and game-over triggering
- Blackholes and enemies are visually distinct and clearly identifiable on the board
- Player can see danger zones before committing to a move
- Game correctly ends when player enters a blackhole or enemy kill zone

## Open Questions

- Should the path preview show a danger indicator (red highlight, skull icon) when the previewed path ends at a hazard?
- Should there be a minimum distance between hazards and the start vertex to prevent immediate game-over scenarios?
- When an enemy's kill zone overlaps with the target vertex, should the player still die or should reaching the target take priority? (Current design: death takes priority.)
