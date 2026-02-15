# PRD: Board Object System (Obstacles & Power-Ups)

## Introduction

Add an extensible board object system with base classes for obstacles and power-ups. Currently, obstacles exist as a flat `Set<string>` of vertex IDs with no structure. This PRD introduces a `BoardObject` base class, an `Obstacle` subclass (refactoring existing behavior), and a `PowerUp` subclass (placeholder for future effects). A difficulty scale (1-10) controls placement density — higher difficulty means more obstacles and fewer power-ups. Both object types carry a numeric value/score representing their intensity.

This is a **data model and placement algorithm** effort. No rendering or player interaction changes are included; those will follow in a separate PRD.

## Goals

- Create an extensible `BoardObject` base class that obstacles and power-ups inherit from
- Refactor existing obstacle logic to use the new `Obstacle` class while preserving current blocking behavior
- Introduce a `PowerUp` class with the same base structure (effects deferred to future work)
- Add a difficulty parameter (1-10) that controls the ratio and count of obstacles vs. power-ups
- Assign a numeric value/score to each placed object based on difficulty
- Ensure all existing tests continue to pass after the refactor
- Keep the board data structure (`boardData.obstacles`) backward-compatible so rendering and movement code still works without changes in this phase

## User Stories

### US-016: Create BoardObject base class
**Description:** As a developer, I want a `BoardObject` base class so that all board objects share a common structure and can be extended with new types in the future.

**Acceptance Criteria:**
- [ ] Create `src/lib/game/boardObjects.js` with a `BoardObject` base class
- [ ] `BoardObject` has properties: `id` (unique string), `vertexId` (the vertex it occupies), `type` (string identifier, e.g. `"obstacle"`, `"powerup"`), `value` (number 1-10 representing intensity/power)
- [ ] `BoardObject` has a method `onPlayerInteraction(gameState)` that is a no-op by default (hook for subclasses)
- [ ] `BoardObject` has a method `getAffectedVertices(adjacency)` that returns `[this.vertexId]` by default (hook for subclasses that affect neighboring vertices)
- [ ] Export a factory function `createBoardObject(type, vertexId, value)` that returns the appropriate subclass instance
- [ ] Unit tests cover base class construction, default method behavior, and factory function
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-016`

### US-017: Create Obstacle subclass
**Description:** As a developer, I want an `Obstacle` class extending `BoardObject` so that existing blocker behavior is represented in the new object model.

**Acceptance Criteria:**
- [ ] `Obstacle` extends `BoardObject` with `type` set to `"obstacle"`
- [ ] `Obstacle` accepts a `value` (1-10) at construction; for this phase, value is stored but has no gameplay effect beyond the base blocking behavior
- [ ] `Obstacle` overrides `onPlayerInteraction()` to return `{ blocked: true }` (indicating movement stops)
- [ ] Export `Obstacle` from `boardObjects.js`
- [ ] Unit tests verify `Obstacle` type, value storage, and `onPlayerInteraction` return value
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-017`

### US-018: Create PowerUp subclass
**Description:** As a developer, I want a `PowerUp` class extending `BoardObject` so that power-ups can be placed on the board and extended with specific effects later.

**Acceptance Criteria:**
- [ ] `PowerUp` extends `BoardObject` with `type` set to `"powerup"`
- [ ] `PowerUp` accepts a `value` (1-10) at construction representing how powerful the pickup is
- [ ] `PowerUp` overrides `onPlayerInteraction()` to return `{ collected: true, value: this.value }` (placeholder; actual effects deferred)
- [ ] Export `PowerUp` from `boardObjects.js`
- [ ] Unit tests verify `PowerUp` type, value storage, and `onPlayerInteraction` return value
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-018`

### US-019: Add difficulty parameter and object placement algorithm
**Description:** As a developer, I want a placement algorithm that uses a difficulty level (1-10) to determine how many obstacles and power-ups to place and at what values, so the board can scale in challenge.

**Acceptance Criteria:**
- [ ] Create a `generateBoardObjects(vertices, startVertex, targetVertex, difficulty, rng)` function in `boardObjects.js`
- [ ] `difficulty` is an integer 1-10; default is 5
- [ ] The function returns `{ obstacles: Obstacle[], powerUps: PowerUp[], obstacleSet: Set<string> }` where `obstacleSet` contains the vertex IDs for backward compatibility with the existing movement/rendering code
- [ ] **Obstacle count** scales with difficulty: at difficulty 1, ~5% of eligible vertices; at difficulty 10, ~20% of eligible vertices. Linear interpolation between these bounds: `percentage = 0.05 + (difficulty - 1) * (0.15 / 9)`
- [ ] **Power-up count** scales inversely with difficulty: at difficulty 1, ~15% of eligible vertices; at difficulty 10, ~3% of eligible vertices. Linear interpolation: `percentage = 0.15 - (difficulty - 1) * (0.12 / 9)`
- [ ] Eligible vertices exclude `startVertex` and `targetVertex`
- [ ] Obstacles and power-ups cannot occupy the same vertex
- [ ] Object **values** correlate with difficulty: obstacles get values in range `[max(1, difficulty-2), min(10, difficulty+2)]` (harder boards have tougher obstacles); power-ups get values in range `[max(1, 11-difficulty-2), min(10, 11-difficulty+2)]` (easier boards have stronger power-ups)
- [ ] Uses the provided `rng` function for deterministic placement in tests
- [ ] Unit tests verify object counts at difficulty 1, 5, and 10 for a known board size
- [ ] Unit tests verify no objects on start/target vertices
- [ ] Unit tests verify no overlap between obstacles and power-ups
- [ ] Unit tests verify value ranges at different difficulties
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-019`

### US-020: Integrate placement into game initialization
**Description:** As a developer, I want `initGame` to use the new placement system so that the board is populated with structured board objects while maintaining backward compatibility.

**Acceptance Criteria:**
- [ ] `initGame(cols, rows, seed, difficulty)` accepts an optional `difficulty` parameter (default 5)
- [ ] `initGame` calls `generateBoardObjects()` instead of the current inline obstacle placement logic
- [ ] `boardData` gains two new properties: `boardObjects` (array of all `BoardObject` instances) and `powerUps` (array of `PowerUp` instances for future use)
- [ ] `boardData.obstacles` remains a `Set<string>` of obstacle vertex IDs so that `movement.js`, `Board.svelte`, and all existing rendering/game logic continues to work without changes
- [ ] The `hasValidPath()` check still runs after placement; if it fails, regeneration is retried (same retry logic as today)
- [ ] Existing tests that call `initGame(cols, rows, seed)` without a difficulty parameter still pass unchanged
- [ ] New tests verify that `boardData.boardObjects` and `boardData.powerUps` are populated
- [ ] New tests verify that different difficulty values produce different obstacle/power-up ratios
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-020`

### US-021: Add difficulty selection to SetupScreen
**Description:** As a player, I want to select a difficulty level (1-10) on the setup screen so that I can control how challenging the board is.

**Acceptance Criteria:**
- [ ] `SetupScreen.svelte` adds a difficulty slider or numeric input (1-10, default 5)
- [ ] Difficulty labels displayed: 1 = "Easy", 5 = "Normal", 10 = "Hard" (labels at min, mid, max)
- [ ] Selected difficulty is passed to the `onStart` callback alongside `cols` and `rows`
- [ ] `App.svelte` passes difficulty through to `initGame`
- [ ] Verify in browser using dev server that the slider appears and value changes work
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-021`

## Functional Requirements

- FR-1: `BoardObject` base class must have `id`, `vertexId`, `type`, `value`, `onPlayerInteraction()`, and `getAffectedVertices()` members
- FR-2: `Obstacle` must extend `BoardObject` with `type = "obstacle"` and `onPlayerInteraction()` returning `{ blocked: true }`
- FR-3: `PowerUp` must extend `BoardObject` with `type = "powerup"` and `onPlayerInteraction()` returning `{ collected: true, value }`
- FR-4: `createBoardObject(type, vertexId, value)` factory function must return the correct subclass instance
- FR-5: `generateBoardObjects()` must place objects based on difficulty (1-10) using the specified percentage formulas
- FR-6: Object values must be assigned randomly within difficulty-correlated ranges
- FR-7: No objects may be placed on start or target vertices
- FR-8: Obstacles and power-ups must not overlap on the same vertex
- FR-9: `initGame` must maintain backward-compatible `boardData.obstacles` as `Set<string>` while adding new `boardData.boardObjects` and `boardData.powerUps` properties
- FR-10: Difficulty defaults to 5 if not specified, preserving existing behavior at approximately the current ~12% obstacle density
- FR-11: SetupScreen must expose a 1-10 difficulty input that is passed through to `initGame`

## Non-Goals (Out of Scope)

- No rendering changes for obstacles or power-ups (separate PRD)
- No player interaction with power-ups during movement (separate PRD)
- No specific power-up effects (extra moves, teleport, etc.) — only the base class hook
- No obstacle value-based effects (wider blocking radius, movement point drain, etc.)
- No persistence, save/load, or level progression
- No changes to `movement.js` or `computePath()` — existing obstacle blocking logic is untouched
- No multiplayer or competitive difficulty features

## Technical Considerations

- **File location:** New module at `src/lib/game/boardObjects.js` keeps object classes colocated with other game logic
- **Plain JavaScript:** No TypeScript — matches the project convention. Use JSDoc for type hints.
- **Seeded RNG:** `generateBoardObjects` accepts an `rng` function (same pattern as `initGame`) for deterministic test coverage
- **Backward compatibility is critical:** `boardData.obstacles` must remain a `Set<string>` so `movement.js` (`computePath`, `getAvailableDirections`, `isTrapped`) and `Board.svelte` rendering work without modification
- **ID generation:** Board object IDs can use a simple counter or `type:vertexId` pattern (e.g., `"obstacle:40,69.282"`)
- **Difficulty 5 ≈ current behavior:** At difficulty 5, obstacle percentage is ~12.2%, which closely matches the current hardcoded 12%, ensuring existing game feel is preserved as the default
- **`hasValidPath` reuse:** The retry loop in `initGame` should use `obstacleSet` from `generateBoardObjects` for the BFS check, same as today

## Success Metrics

- All 88+ existing tests pass without modification
- New test file `boardObjects.test.js` has full coverage of base class, subclasses, factory, and placement algorithm
- `initGame` called without `difficulty` produces boards indistinguishable from current behavior
- `initGame` called with difficulty 1 produces noticeably fewer obstacles and more power-ups than difficulty 10

## Open Questions

- Should power-up placement also be validated (e.g., not blocking critical paths, or not clustering)? For now, power-ups don't block movement so this may not matter.
- Should the difficulty scale eventually be non-linear (e.g., exponential obstacle density at high difficulties)? Linear is simpler to start.
- When rendering and interaction are added later, should power-ups disappear after collection or persist visually?
