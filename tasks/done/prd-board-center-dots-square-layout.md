# PRD: Board Update - Center Dots & Square Layout

## Introduction

Update the hex board to add center dots (hex center vertices) as playable spaces and change the board boundary from a hexagonal shape to a roughly square/rectangular layout. Center dots connect to all 6 corner vertices of their hex via a hub-spoke pattern, creating smoother and more realistic movement through hexagons. The square layout provides a more familiar game board shape.

## Goals

- Add hex center dots as playable vertices connected to their 6 corner vertices
- Change board boundary from hexagonal to roughly square/rectangular
- Maintain existing 6-directional movement — center dots are intermediate steps along rays
- Allow obstacles on both center dots and corner vertices
- Keep configurable board sizes (small/medium/large) mapped to square-ish dimensions
- Preserve all existing game mechanics (dice, movement pool, win/lose conditions)

## User Stories

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

## Functional Requirements

- FR-1: Generate center vertices at each hex center position, added to the vertex graph alongside corner vertices
- FR-2: Center vertices connect to their hex's 6 corner vertices (hub-spoke adjacency)
- FR-3: Corner vertices gain adjacency to the center vertices of hexes they belong to
- FR-4: Directional rays include center vertices as intermediate steps between corners
- FR-5: Board boundary is rectangular (offset hex rows cropped to a square-ish shape)
- FR-6: Small = 5x4 (20 hexes), Medium = 7x6 (42 hexes), Large = 9x8 (72 hexes) — wider than tall for portrait screens
- FR-7: Center vertices rendered as hollow ring circles (stroke only) in default state; filled when active
- FR-8: Hub-spoke edges rendered between center dots and corner vertices
- FR-9: Obstacles can be placed on center dots (blocking movement through that hex center)
- FR-10: BFS path validation works with expanded graph (centers + corners)
- FR-11: Movement pool formula works appropriately with new board dimensions
- FR-12: All existing game mechanics (dice, win/lose, preview, animation) work with center dots

## Non-Goals (Out of Scope)

- Changing the number of movement directions (still 6)
- Different movement rules for center dots vs corner vertices
- Visual distinction between "passing through" a center vs "landing on" a center
- New obstacle types specific to center dots
- Changing the dice or movement pool mechanics

## Design Considerations

- **Center dot visual style:** Render center dots as hollow ring circles (stroke only, no fill) in default state. Same radius as corner vertices for consistent tap targets. When in an active state (visited, preview, animated, obstacle, start, target), fill them like corners
- **Hub-spoke edges:** Draw center-to-corner edges thinner or lighter than corner-to-corner edges to reduce visual clutter
- **Square board:** Offset hex rows (even rows shifted right) cropped to rectangular bounds. The board should look roughly square, not a perfect mathematical rectangle
- **Color palette:** Center dots use the same color scheme as corners (green=start, gold=target, dark=obstacle, etc.)

## Technical Considerations

### Ray Architecture — Graph Traversal, Not Geometric Lines

Center dots do NOT lie on the geometric straight lines between corner vertices. Rays must be rebuilt as **graph-traversal paths** that follow a direction through the lattice, alternating between corners and centers.

**How rays work now:** Walk from a vertex by stepping a direction vector (dx, dy). Some steps land on corners (collected), some land on empty space (skipped). The bipartite pattern means every other step hits a vertex.

**How rays work after this change:** Center dots fill those previously-empty gaps. Rays are built by graph traversal: from a corner, the "first step" in a direction goes to the center of the hex that the ray crosses, then the "second step" goes to the next corner in that direction. The sequence becomes `corner → center → corner → center → ...` with every step landing on a vertex. No gaps to skip.

**Implementation approach:** Replace the geometric ray walker with a direction-aware graph traversal:
1. From a corner vertex, for each of the 6 directions, identify which adjacent hex center is in that direction
2. From that center, identify which corner vertex continues in the same direction
3. Repeat, building the ray as an alternating sequence
4. Each "step" in a ray is one node — uniform travel distance

**Implication for dice/movement:** A dice roll of 3 now moves 3 nodes (e.g., corner → center → corner), which crosses 1 full hex. Previously, a roll of 3 could cross ~1.5-3 hexes (depending on bipartite gaps). The movement pool formula (`radius * 10`) likely needs to increase (e.g., `radius * 20`) to compensate for doubled step granularity. This should be tuned during implementation.

### hexGrid.js Changes
- `generateHexCenters()` must produce a rectangular grid instead of axial-distance-filtered hexes. Use column/row iteration with offset for even/odd rows
- Each hex center becomes a vertex in the `vertices` Map. Use the existing `vertexKey()` for deduplication (center pixel coords won't collide with corner coords since centers are at different positions)
- Adjacency: center vertex connects to its 6 corners; each corner adds the center(s) of its parent hex(es) to its neighbor list
- Ray computation: rebuild as graph traversal (see architecture note above). For each corner, determine which center is "in direction d" by checking which adjacent center lies closest to direction d. Then from that center, find the corner that continues in direction d

### movement.js Changes
- `computePath()` and `getAvailableDirections()` consume rays. If the ray data structure stays the same (`{ direction, vertices[] }`), these functions need zero changes
- `isTrapped()` also works unchanged since it just checks if any ray has a non-blocked first vertex

### Board.svelte Changes
- Add center vertex rendering (smaller circles, e.g., radius 5-6 vs 8 for corners)
- Add hub-spoke edge rendering (thinner lines from center to corners)
- viewBox computation already iterates all vertices, so it will automatically include center vertices

### gameState.js Changes
- `initGame()` uses `generateGrid()` output, so it will automatically get center vertices
- Obstacle percentage may need tuning (~12% currently, but total vertex count roughly doubles)
- Movement pool formula likely needs to increase to account for finer-grained steps

## Success Metrics

- Board displays as a roughly square shape with visible center dots in every hex
- Movement visibly passes through center dots (step-by-step animation shows corner → center → corner)
- All 3 board sizes render correctly with square layout
- Existing game flow works end-to-end (setup → roll → move → win/lose)
- No regression in test suite (all existing tests updated and passing)

## Resolved Design Decisions

- **Ray architecture:** Rays become graph-traversal paths (not geometric straight lines). Center dots fill the previously-skipped gaps, so every ray step lands on a vertex. The ray data structure (`{ direction, vertices[] }`) stays the same — only the ray-building logic changes.
- **Step uniformity:** Every step in a ray covers the same travel distance. Crossing one hex = 2 steps (corner → center → corner). This makes movement more granular and smoother.
- **Movement pool adjustment:** Pool formula likely needs to roughly double (e.g., `radius * 20` instead of `radius * 10`) since each hex crossing now costs 2 steps instead of 1. Exact tuning should happen during implementation.

## Open Questions

All resolved:

- **Board dimensions:** Small = 5x4 (20 hexes), Medium = 7x6 (42 hexes), Large = 9x8 (72 hexes). Slightly wider than tall to suit portrait phone screens.
- **Center dot visual style:** Ring/hollow circle (stroke only, no fill) in default state. Filled when in an active state (visited, preview, animated, obstacle, start, target). Same radius as corner vertices for consistent tap targets.
