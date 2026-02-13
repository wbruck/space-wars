-------------
User Story 011
---------------

## Introduction
Add hex center dots as playable vertices and change the board from a hexagonal boundary to a square layout, creating smoother movement and a more familiar game board shape.

## Goals
- Add center dots as intermediate movement steps within each hex (hub-spoke connectivity)
- Change board boundary to square/rectangular layout (5x4, 7x6, 9x8)
- Preserve 6-directional movement with center dots filling previously-skipped ray gaps

## Technical Details
### hexGrid.js — Center Vertex Generation
- Add each hex center as a new vertex in the `vertices` Map using `vertexKey(cx, cy)` (center pixel coords won't collide with corner coords)
- Center vertex IDs should be distinguishable from corner vertex IDs (e.g., prefix with `c:` or tag with a `type` property)
- Each center vertex gets 6 neighbors in the adjacency map: the 6 corner vertices of its hex
- Each corner vertex gains up to 3 additional neighbors: the center vertices of the hexes it belongs to (a corner is shared by up to 3 hexes)
- Corner vertices retain their existing corner-to-corner edge adjacency

### Ray Rebuilding — Graph Traversal
- Rays must be rebuilt as graph-traversal paths, not geometric straight-line walks
- Center dots do NOT lie on the geometric lines between corners — they fill the previously-skipped gaps in the bipartite lattice
- Replace the geometric ray walker with direction-aware graph traversal:
  1. From a corner vertex, for each of 6 directions, identify which adjacent hex center is in that direction
  2. From that center, identify which corner continues in the same direction
  3. Repeat, building the ray as alternating: corner → center → corner → center...
- Ray data structure stays the same: `{ direction: number, vertices: string[] }` — only the building logic changes
- Every step in a ray is now one node with uniform travel distance (no more skipped gaps)

### Impact on Movement
- Crossing one hex now costs 2 steps (corner → center → corner) instead of ~1
- Movement pool formula will need to roughly double (e.g., `radius * 20`) — tuned in US-014
- `computePath()` and `getAvailableDirections()` in movement.js need zero changes since they consume the ray array

### Non-Goals
- No change to number of movement directions (still 6)
- No different movement rules for center dots vs corner vertices

### Files
- `src/lib/game/hexGrid.js` — primary changes
- `src/lib/game/hexGrid.test.js` — new/updated tests

## User Story
### US-011: Add hex center vertices to grid math
**Description:** As a developer, I need hex center points added to the vertex graph so that movement passes through hex centers as intermediate steps.

**Acceptance Criteria:**
- [ ] `hexGrid.js` generates center vertices for each hex, added to the `vertices` Map
- [ ] Center vertex IDs are distinguishable from corner vertex IDs (e.g., prefixed or tagged)
- [ ] Each center vertex has 6 neighbors in the adjacency map (its hex's 6 corner vertices)
- [ ] Each corner vertex gains additional neighbors: the center vertices of the hexes it belongs to (up to 3 additional neighbors)
- [ ] Corner vertices retain their existing edge-based adjacency to other corners
- [ ] Directional rays now include center vertices as intermediate steps (corner → center → corner → center...)
- [ ] Unit tests verify: center vertex count equals hex count, center adjacency is exactly 6 per center, corner vertices have increased neighbor count, rays include center vertices
- [ ] All tests pass
- [ ] Commit with message: "US-011: add hex center vertices to grid math"

-------------
User Story 012
---------------

## Introduction
Add hex center dots as playable vertices and change the board from a hexagonal boundary to a square layout, creating smoother movement and a more familiar game board shape.

## Goals
- Add center dots as intermediate movement steps within each hex (hub-spoke connectivity)
- Change board boundary to square/rectangular layout (5x4, 7x6, 9x8)
- Preserve 6-directional movement with center dots filling previously-skipped ray gaps

## Technical Details
### hexGrid.js — Rectangular Grid Generation
- Replace `generateHexCenters()` which currently uses axial distance filtering (`abs(q) + abs(r) + abs(s) <= radius`) producing a hexagonal boundary
- New generation uses column/row iteration with offset for even/odd rows to produce a rectangular grid
- Size mappings: Small = 5 columns x 4 rows (20 hexes), Medium = 7x6 (42 hexes), Large = 9x8 (72 hexes)
- Wider than tall to suit portrait phone screens
- `generateGrid()` API changes: accept `cols` and `rows` instead of (or in addition to) `radius`
- `hexCount()` function updated: returns `cols * rows` for rectangular grids

### SetupScreen.svelte
- Update size options to show new hex counts: Small (20 hexes), Medium (42 hexes), Large (72 hexes)
- Pass cols/rows to `initGame()` instead of radius

### Coordinate System
- Flat-top hex orientation preserved
- Offset rows: even rows at base position, odd rows shifted right by `size * 3/2`
- Row spacing: `size * √3`

### Files
- `src/lib/game/hexGrid.js` — grid generation logic
- `src/lib/game/hexGrid.test.js` — updated tests
- `src/lib/components/SetupScreen.svelte` — size labels

## User Story
### US-012: Change board shape to square layout
**Description:** As a developer, I need the hex grid generator to produce a roughly square/rectangular board instead of a hexagonal boundary.

**Acceptance Criteria:**
- [ ] `hexGrid.js` generates hexes arranged in a rectangular grid (offset rows) instead of using axial distance filtering
- [ ] Size mappings updated: Small = 5x4 (20 hexes), Medium = 7x6 (42 hexes), Large = 9x8 (72 hexes)
- [ ] `hexCount()` function updated to return correct count for rectangular grids
- [ ] `SetupScreen.svelte` updated with new hex counts for each size
- [ ] Board boundary is roughly square when rendered (not a hexagonal shape)
- [ ] Unit tests verify: vertex counts, adjacency, and rays are correct for rectangular grids at all 3 sizes
- [ ] All tests pass
- [ ] Commit with message: "US-012: change board shape to square layout"

-------------
User Story 013
---------------

## Introduction
Add hex center dots as playable vertices and change the board from a hexagonal boundary to a square layout, creating smoother movement and a more familiar game board shape.

## Goals
- Add center dots as intermediate movement steps within each hex (hub-spoke connectivity)
- Change board boundary to square/rectangular layout (5x4, 7x6, 9x8)
- Preserve 6-directional movement with center dots filling previously-skipped ray gaps

## Technical Details
### Board.svelte — Center Dot Rendering
- Center dots rendered as hollow ring circles (stroke only, no fill) in default state
- Same radius as corner vertices (VERTEX_R = 8) for consistent tap targets
- When in an active state (visited, preview, animated, obstacle, start, target), fill them with the same colors as corners
- Need a way to identify center vs corner vertices for rendering — check vertex ID prefix or a `type` property from the grid data

### Hub-Spoke Edge Rendering
- Draw edges between each center vertex and its 6 corner vertices
- Hub-spoke edges should be thinner or lighter than corner-to-corner edges to reduce visual clutter (e.g., stroke-width 0.5 vs 1, or lighter color)
- Existing corner-to-corner edges still rendered at current weight

### SVG & Layout
- SVG viewBox computation already iterates all vertices — will automatically include center vertices
- Board renders with square boundary since the grid is now rectangular (US-012)
- Color palette unchanged: green=start, gold=target, dark=obstacle, light blue=visited, blue=preview/animated, gray=default

### `vertexColor()` Update
- Modify to check if vertex is a center dot and in default state → return "transparent" or "none" for fill (hollow ring)
- All active states use same fill colors as corners

### Files
- `src/lib/components/Board.svelte` — rendering changes
- Depends on: US-011 (center vertices in grid), US-012 (square layout)

## User Story
### US-013: Update board rendering for center dots and square layout
**Description:** As a player, I want to see center dots on each hexagon and a square-shaped board so the game space is clear and intuitive.

**Acceptance Criteria:**
- [ ] `Board.svelte` renders center vertices as hollow ring circles (stroke only, no fill) in default state; filled when active (visited, preview, animated, obstacle, start, target)
- [ ] Edges are drawn between center vertices and their 6 corner vertices (hub-spoke lines)
- [ ] Existing corner-to-corner edges still rendered
- [ ] Center vertices support all existing color states (start, target, obstacle, visited, preview, animated)
- [ ] Board renders with square boundary at all 3 sizes
- [ ] SVG viewBox adjusts correctly for the new rectangular layout
- [ ] Verify in browser that the board renders correctly at all 3 sizes
- [ ] Commit with message: "US-013: update board rendering for center dots and square layout"

-------------
User Story 014
---------------

## Introduction
Add hex center dots as playable vertices and change the board from a hexagonal boundary to a square layout, creating smoother movement and a more familiar game board shape.

## Goals
- Add center dots as intermediate movement steps within each hex (hub-spoke connectivity)
- Change board boundary to square/rectangular layout (5x4, 7x6, 9x8)
- Preserve 6-directional movement with center dots filling previously-skipped ray gaps

## Technical Details
### gameState.js — Initialization with Expanded Graph
- `initGame()` uses `generateGrid()` output — will automatically receive center vertices if grid generates them
- Start/target placement: consider both center and corner vertices when picking start and target positions (farthest apart strategy still works)
- Obstacle placement: both center and corner vertices eligible as obstacles
- Current obstacle rate is ~12% of vertices; total vertex count roughly doubles with centers, so the percentage may need tuning to maintain similar difficulty

### BFS Path Validation
- `hasValidPath()` uses the adjacency graph — with centers added to adjacency, BFS will naturally traverse through them
- No logic changes needed, but tests should verify BFS works across center-to-corner edges

### Movement Pool Adjustment
- Current formula: `radius * 10`
- With center dots, crossing one hex costs 2 steps (corner → center → corner) instead of ~1
- Pool likely needs to roughly double to maintain similar game length
- New formula suggestion: tied to board dimensions rather than radius (e.g., `(cols + rows) * N` or `totalVertices * factor`)
- Exact tuning should happen during implementation and playtesting

### API Change
- `initGame()` may need to accept `cols, rows` instead of `radius` (coordinated with US-012 changes to grid generation)

### Non-Goals
- No persistence/save changes
- No AI opponent
- No new obstacle types

### Files
- `src/lib/game/gameState.js` — initialization, pool formula
- `src/lib/game/gameState.test.js` — updated tests
- Depends on: US-011, US-012

## User Story
### US-014: Update game state for center dot support
**Description:** As a developer, I need game state initialization to work with the expanded vertex graph (center dots + square layout) so gameplay functions correctly.

**Acceptance Criteria:**
- [ ] `initGame()` correctly initializes with the new grid (center + corner vertices)
- [ ] Start and target placement considers both center and corner vertices
- [ ] Obstacle placement works on both center and corner vertices
- [ ] BFS path validation (`hasValidPath`) works with the expanded adjacency graph
- [ ] Movement pool formula still works appropriately for the new board sizes
- [ ] Unit tests verify initialization, obstacle placement, and path validation with center dots
- [ ] All tests pass
- [ ] Commit with message: "US-014: update game state for center dot support"

-------------
User Story 015
---------------

## Introduction
Add hex center dots as playable vertices and change the board from a hexagonal boundary to a square layout, creating smoother movement and a more familiar game board shape.

## Goals
- Add center dots as intermediate movement steps within each hex (hub-spoke connectivity)
- Change board boundary to square/rectangular layout (5x4, 7x6, 9x8)
- Preserve 6-directional movement with center dots filling previously-skipped ray gaps

## Technical Details
### movement.js — Zero Logic Changes Expected
- `getAvailableDirections()` consumes rays (`{ direction, vertices[] }`) — data structure unchanged, function works as-is
- `computePath()` walks the ray array step by step — center dots appear as intermediate entries in the array, function works as-is
- `isTrapped()` checks if any ray has a non-blocked first vertex — works unchanged
- The key change is in ray generation (US-011), not ray consumption

### Verification Focus
- Verify that movement through center dots works correctly end-to-end despite movement.js having no code changes
- A dice roll of 3 should move 3 nodes (e.g., corner → center → corner), visibly stepping through the hex center
- Obstacles on center dots should block the ray at that point (remaining steps lost)
- Trapped detection should work when all adjacent centers and corners are blocked

### Board.svelte — Path Preview & Animation
- Path preview lines should connect through center dots (corner → center → corner)
- Movement animation (150ms per step) should visibly pause at center dots, making movement through hexes smooth
- Direction arrows should point toward the first vertex in the ray (which is now a center dot, not a corner)

### Testing
- Unit tests should verify: movement through centers, obstacle on center blocking path, passing through target center triggers win, trapped when surrounded by center obstacles
- Integration test: full path corner → center → corner → center → corner with obstacles at various positions

### Files
- `src/lib/game/movement.js` — likely no code changes, but verify
- `src/lib/game/movement.test.js` — new tests for center dot scenarios
- `src/lib/components/Board.svelte` — preview/animation verification
- Depends on: US-011, US-012, US-013, US-014

## User Story
### US-015: Update movement logic for center dots
**Description:** As a player, I want movement rays to pass through center dots so that moving across the board feels smoother with more granular steps.

**Acceptance Criteria:**
- [ ] `getAvailableDirections()` works correctly with rays that include center vertices
- [ ] `computePath()` traverses center dots as intermediate steps (corner → center → corner)
- [ ] Obstacles on center dots block ray traversal (same behavior as corner obstacles)
- [ ] `isTrapped()` correctly detects trapped state with center dots in the adjacency
- [ ] Path preview in Board.svelte shows center dots as intermediate steps
- [ ] Movement animation steps through center dots (visible step-by-step movement through hexes)
- [ ] Unit tests verify movement through center dots, obstacle blocking on centers, trapped detection
- [ ] All tests pass
- [ ] Verify in browser that direction selection, path preview, and movement animation work correctly
- [ ] Commit with message: "US-015: update movement logic for center dots"
