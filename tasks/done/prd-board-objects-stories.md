# PRD Stories: Board Object System (Obstacles & Power-Ups)

---

## User Story US-016

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Create an extensible `BoardObject` base class that obstacles and power-ups inherit from
- Keep the board data structure backward-compatible so existing rendering and movement code works without changes
- Ensure all existing tests continue to pass after the refactor

### Technical Details

#### New File
- Create `src/lib/game/boardObjects.js` — colocated with existing game logic in `src/lib/game/`

#### Class Design
- `BoardObject` class with constructor accepting `(vertexId, type, value)`
- Properties: `id` (unique string, use `type:vertexId` pattern e.g. `"obstacle:40,69.282"`), `vertexId` (string — the vertex it occupies), `type` (string identifier), `value` (number 1-10)
- Method `onPlayerInteraction(gameState)` — no-op by default, returns `undefined`. Hook for subclasses to override.
- Method `getAffectedVertices(adjacency)` — returns `[this.vertexId]` by default. Hook for subclasses that affect neighboring vertices.
- Factory function `createBoardObject(type, vertexId, value)` — returns `Obstacle` for `"obstacle"`, `PowerUp` for `"powerup"`, throws for unknown types

#### Conventions
- Plain JavaScript, no TypeScript — matches project convention
- Use JSDoc for type hints
- Export all public classes and functions from `boardObjects.js`

### User Story
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

---

## User Story US-017

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Create an extensible `BoardObject` base class that obstacles and power-ups inherit from
- Refactor existing obstacle logic to use the new `Obstacle` class while preserving current blocking behavior
- Keep the board data structure backward-compatible so existing rendering and movement code works without changes

### Technical Details

#### Obstacle Subclass
- `Obstacle` extends `BoardObject`, calls `super(vertexId, "obstacle", value)` in its constructor
- `type` is always `"obstacle"` — set by the class, not the caller
- `value` (1-10) is stored but has **no gameplay effect** in this phase — existing blocking behavior in `movement.js` (`computePath`, `getAvailableDirections`) remains unchanged and is driven by the `Set<string>` of vertex IDs, not by `Obstacle` instances
- Override `onPlayerInteraction()` to return `{ blocked: true }` — this is a forward-looking hook; movement code does not call it yet

#### Existing Blocking Behavior (unchanged)
- `movement.js:getAvailableDirections()` filters directions where first ray vertex is in `obstacles` Set
- `movement.js:computePath()` stops path when encountering a vertex in `obstacles` Set
- These functions operate on `Set<string>` and are **not modified** in this story

### User Story
**Description:** As a developer, I want an `Obstacle` class extending `BoardObject` so that existing blocker behavior is represented in the new object model.

**Acceptance Criteria:**
- [ ] `Obstacle` extends `BoardObject` with `type` set to `"obstacle"`
- [ ] `Obstacle` accepts a `value` (1-10) at construction; for this phase, value is stored but has no gameplay effect beyond the base blocking behavior
- [ ] `Obstacle` overrides `onPlayerInteraction()` to return `{ blocked: true }` (indicating movement stops)
- [ ] Export `Obstacle` from `boardObjects.js`
- [ ] Unit tests verify `Obstacle` type, value storage, and `onPlayerInteraction` return value
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-017`

---

## User Story US-018

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Introduce a `PowerUp` class with the same base structure (effects deferred to future work)
- Keep the board data structure backward-compatible so existing rendering and movement code works without changes

### Technical Details

#### PowerUp Subclass
- `PowerUp` extends `BoardObject`, calls `super(vertexId, "powerup", value)` in its constructor
- `type` is always `"powerup"` — set by the class, not the caller
- `value` (1-10) represents how powerful the pickup is — higher value = stronger effect (when effects are implemented later)
- Override `onPlayerInteraction()` to return `{ collected: true, value: this.value }` — this is a placeholder; no game code calls this method yet
- Power-ups do **not** block movement — they are not added to the `obstacles` Set, so `movement.js` is unaware of them

#### Future Extensibility
- Specific power-up types (extra moves, remove obstacles, teleport, etc.) will be additional subclasses of `PowerUp` in future PRDs
- The `onPlayerInteraction` return value provides the hook for the movement system to react to power-ups later

### User Story
**Description:** As a developer, I want a `PowerUp` class extending `BoardObject` so that power-ups can be placed on the board and extended with specific effects later.

**Acceptance Criteria:**
- [ ] `PowerUp` extends `BoardObject` with `type` set to `"powerup"`
- [ ] `PowerUp` accepts a `value` (1-10) at construction representing how powerful the pickup is
- [ ] `PowerUp` overrides `onPlayerInteraction()` to return `{ collected: true, value: this.value }` (placeholder; actual effects deferred)
- [ ] Export `PowerUp` from `boardObjects.js`
- [ ] Unit tests verify `PowerUp` type, value storage, and `onPlayerInteraction` return value
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-018`

---

## User Story US-019

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Add a difficulty parameter (1-10) that controls the ratio and count of obstacles vs. power-ups
- Assign a numeric value/score to each placed object based on difficulty

### Technical Details

#### Placement Function Signature
- `generateBoardObjects(vertices, startVertex, targetVertex, difficulty, rng)` in `boardObjects.js`
- `vertices` — the `Map<string, object>` from the grid (used to get all vertex IDs)
- `difficulty` — integer 1-10, default 5
- `rng` — a `() => number` function (0-1) for deterministic placement, same seeded RNG pattern used in `gameState.js:initGame()`
- Returns `{ obstacles: Obstacle[], powerUps: PowerUp[], obstacleSet: Set<string> }`

#### Placement Density Formulas
- **Eligible vertices:** All vertex IDs except `startVertex` and `targetVertex`
- **Obstacle percentage:** `0.05 + (difficulty - 1) * (0.15 / 9)` — ranges from ~5% (difficulty 1) to ~20% (difficulty 10). At difficulty 5 this yields ~12.2%, matching the current hardcoded 12%.
- **Power-up percentage:** `0.15 - (difficulty - 1) * (0.12 / 9)` — ranges from ~15% (difficulty 1) to ~3% (difficulty 10)
- Object count = `Math.floor(eligibleVertices.length * percentage)`

#### Value Assignment
- **Obstacle values:** Random integer in `[max(1, difficulty-2), min(10, difficulty+2)]` — harder boards have tougher obstacles
- **Power-up values:** Random integer in `[max(1, 11-difficulty-2), min(10, 11-difficulty+2)]` — easier boards have stronger power-ups
- Use the `rng` function for both vertex selection and value assignment

#### Placement Rules
- Obstacles are placed first by shuffling eligible vertices and taking the first N
- Power-ups are placed from the remaining eligible vertices (no overlap with obstacles)
- No objects on `startVertex` or `targetVertex`

### User Story
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

---

## User Story US-020

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Refactor existing obstacle logic to use the new placement system while preserving current blocking behavior
- Keep the board data structure backward-compatible so existing rendering and movement code works without changes
- Ensure all existing tests continue to pass after the refactor

### Technical Details

#### `initGame` Signature Change
- `initGame(cols, rows, seed, difficulty)` — `difficulty` is optional, defaults to 5
- Existing calls `initGame(cols, rows)` and `initGame(cols, rows, seed)` continue to work unchanged

#### Replacing Inline Obstacle Logic
- **Remove** the current inline obstacle placement block in `gameState.js` (lines ~137-162: `obstacleCount`, candidate filtering, placement loop)
- **Replace** with a call to `generateBoardObjects(grid.vertices, startVertex, targetVertex, difficulty, rng)`
- Use the returned `obstacleSet` for the `hasValidPath()` BFS check (same retry logic: up to 20 attempts, clear on failure)

#### Board Data Structure Changes
- `boardData.obstacles` — remains `Set<string>` (from `obstacleSet`), no change for consumers
- `boardData.boardObjects` — **new** array of all `BoardObject` instances (both obstacles and power-ups)
- `boardData.powerUps` — **new** array of `PowerUp` instances (subset of `boardObjects`, for convenient access)

#### Backward Compatibility
- `movement.js` functions (`computePath`, `getAvailableDirections`, `isTrapped`) use `boardData.obstacles` (a `Set<string>`) — unchanged
- `Board.svelte` renders obstacles from `boardData.obstacles` — unchanged
- `hasValidPath()` takes `obstacles` as `Set<string>` — unchanged
- The 88+ existing tests that call `initGame(cols, rows, seed)` will get difficulty=5, producing ~12.2% obstacles (≈ current 12%) — behavior is effectively identical

### User Story
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

---

## User Story US-021

---

### Introduction
Add an extensible board object system with base classes for obstacles and power-ups, controlled by a difficulty scale (1-10) that determines placement density and object values.

### Goals
- Add a difficulty parameter (1-10) that controls the ratio and count of obstacles vs. power-ups
- Expose difficulty selection to the player on the setup screen

### Technical Details

#### SetupScreen Changes (`src/lib/components/SetupScreen.svelte`)
- Add a difficulty slider (HTML `<input type="range">`) with `min=1`, `max=10`, `step=1`, default value `5`
- Use Svelte 5 `$state()` for the local difficulty value: `let difficulty = $state(5)`
- Display labels at key positions: "Easy" at 1, "Normal" at 5, "Hard" at 10
- Display the current numeric value next to the slider
- The `onStart` callback currently receives `(cols, rows)` — update to receive `(cols, rows, difficulty)`

#### App.svelte Changes
- The `handleStart` function (or equivalent) that calls `initGame(cols, rows)` must be updated to pass `difficulty`: `initGame(cols, rows, undefined, difficulty)` (seed remains undefined for non-test gameplay)
- No other App.svelte changes needed

#### Styling
- Match existing SetupScreen styling patterns (the board size selector)
- Ensure slider is touch-friendly (min 44px touch target, `touch-action: manipulation`)

### User Story
**Description:** As a player, I want to select a difficulty level (1-10) on the setup screen so that I can control how challenging the board is.

**Acceptance Criteria:**
- [ ] `SetupScreen.svelte` adds a difficulty slider or numeric input (1-10, default 5)
- [ ] Difficulty labels displayed: 1 = "Easy", 5 = "Normal", 10 = "Hard" (labels at min, mid, max)
- [ ] Selected difficulty is passed to the `onStart` callback alongside `cols` and `rows`
- [ ] `App.svelte` passes difficulty through to `initGame`
- [ ] Verify in browser using dev server that the slider appears and value changes work
- [ ] All tests pass (`npm test`)
- [ ] Commit with message starting with `US-021`
