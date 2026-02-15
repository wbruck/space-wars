# PRD: Hex Vertex Strategy Board Game ("Game Time")

## Introduction

A single-player strategy board game where the player rolls dice and chooses a direction to move their token across a hex vertex grid. The player must navigate around randomly placed obstacles to reach a target vertex before running out of movement points or getting trapped. The board is a triangular lattice (vertices at hex corners) with 6-directional straight-line movement. Built as a web app with Vite + Svelte, clean minimal visual style. MVP focuses on core gameplay only — no PWA, no persistence.

## Goals

- Deliver a playable hex vertex board game in the browser
- Support configurable board sizes (small, medium, large)
- Provide strategic depth through directional movement + limited movement pool
- Ensure touch-friendly gameplay for mobile browsers
- Clean, minimal visual design that clearly communicates game state

## User Stories

### US-001: Initialize Vite + Svelte project
**Description:** As a developer, I need the project scaffolded with Vite + Svelte so we have a working dev environment.

**Acceptance Criteria:**
- [ ] Vite + Svelte project created in `/Users/user/code/game_time/`
- [ ] `npm run dev` starts dev server and renders a placeholder page
- [ ] Project structure matches planned layout (src/lib/components, src/lib/game, src/lib/utils)
- [ ] Commit with message: "US-001: scaffold Vite + Svelte project"

### US-002: Implement hex vertex grid math
**Description:** As a developer, I need hex grid math utilities that generate vertex positions, adjacency maps, and support configurable board sizes so the game board can be computed.

**Acceptance Criteria:**
- [ ] `hexGrid.js` module exports functions to generate a hex grid of configurable radius
- [ ] Vertices are computed at hex corners, deduplicated (shared corners stored once)
- [ ] Each vertex has a unique ID and pixel coordinates (for rendering)
- [ ] Adjacency map: for each vertex, lists all 6 neighboring vertices in the triangular lattice (fewer at board edges)
- [ ] For each vertex, the 6 directional rays are precomputed (ordered list of vertices in each straight-line direction)
- [ ] Grid supports radius 2 (small/19 hexes), 3 (medium/37 hexes), 4+ (large/61+ hexes)
- [ ] Unit tests verify vertex count, adjacency correctness, and ray computation for a radius-2 grid
- [ ] All tests pass
- [ ] Commit with message: "US-002: implement hex vertex grid math"

### US-003: Render the hex board with SVG
**Description:** As a player, I want to see the hex board displayed on screen so I can understand the game space.

**Acceptance Criteria:**
- [ ] `Board.svelte` renders the hex grid as an SVG element
- [ ] Hex outlines drawn as light guide lines (visual reference only)
- [ ] Vertices rendered as circles/dots at each hex corner
- [ ] Edges drawn as lines between adjacent vertices
- [ ] Start vertex highlighted in green
- [ ] Target vertex highlighted in gold/red
- [ ] Obstacle vertices rendered distinctly (dark fill or X marker)
- [ ] Board scales responsively to fit the viewport (mobile and desktop)
- [ ] Verify in browser that the board renders correctly at all 3 sizes
- [ ] Commit with message: "US-003: render hex board with SVG"

### US-004: Implement game state management
**Description:** As a developer, I need centralized game state so all components react to game changes consistently.

**Acceptance Criteria:**
- [ ] `gameState.js` exports Svelte writable stores for: board data, player position, movement pool, dice value, game phase (setup | rolling | selectingDirection | moving | won | lost)
- [ ] `initGame(radius)` function generates board: computes grid, places start vertex, target vertex, and random obstacles
- [ ] Start and target vertices are placed at reasonable distance apart (not adjacent)
- [ ] Random obstacles are placed ensuring at least one valid path from start to target exists
- [ ] Movement pool initialized to `radius * 10`
- [ ] Unit tests verify initialization, obstacle placement validity
- [ ] All tests pass
- [ ] Commit with message: "US-004: implement game state management"

### US-005: Implement dice roll mechanic
**Description:** As a player, I want to roll a die so I know how many spaces I can move this turn.

**Acceptance Criteria:**
- [ ] `Dice.svelte` component displays a visual die face (1-6 dots)
- [ ] Tapping/clicking the die triggers a roll with a brief animation (CSS rotation or frame swap)
- [ ] Random result 1-6 is generated and stored in game state
- [ ] Die roll subtracts the **actual steps moved** (capped to pool) from the movement pool
- [ ] Die is only clickable during the "rolling" game phase
- [ ] Die is disabled/grayed out during other phases
- [ ] If die roll exceeds remaining pool, movement is capped to remaining pool (roll 5, pool 3 = move 3)
- [ ] Verify in browser that die animates and updates state
- [ ] Commit with message: "US-005: implement dice roll mechanic"

### US-006: Implement directional movement
**Description:** As a player, after rolling the die I want to choose one of 6 directions to move in a straight line so I can navigate toward the target.

**Acceptance Criteria:**
- [ ] After rolling, the game enters "selectingDirection" phase
- [ ] The 6 possible directions from the current vertex are shown as directional indicators (arrows or highlighted paths)
- [ ] Directions that are fully blocked (immediate obstacle or board edge) are not shown
- [ ] Tapping a direction shows a **path preview** (highlighted vertices along the straight line)
- [ ] Player taps again (or a confirm button) to commit the move; tapping a different direction changes the preview
- [ ] Movement distance is capped to remaining movement pool (e.g., roll 5 with 3 pool = move 3 steps)
- [ ] If the path hits an obstacle or board edge before using all steps, the player stops at the last valid vertex
- [ ] Player token animates step-by-step along the path (brief delay between steps)
- [ ] After moving, vertices along the path are visually marked as "visited"
- [ ] Player position updates in game state
- [ ] Unit tests verify movement logic: straight-line movement, obstacle stopping, edge stopping
- [ ] All tests pass
- [ ] Verify in browser that direction selection and movement work correctly
- [ ] Commit with message: "US-006: implement directional movement"

### US-007: Implement win and lose conditions
**Description:** As a player, I want the game to detect when I've won or lost so the game has a clear conclusion.

**Acceptance Criteria:**
- [ ] **Win:** If player lands on (or passes through) the target vertex during movement, game phase changes to "won"
- [ ] **Lose (out of points):** If movement pool reaches 0 and player has not reached the target, game phase changes to "lost"
- [ ] **Lose (trapped):** If all 6 directions from current vertex are blocked (obstacles or board edge with no room to move), game phase changes to "lost"
- [ ] Win/lose detection runs after every move
- [ ] Unit tests verify all three conditions
- [ ] All tests pass
- [ ] Commit with message: "US-007: implement win and lose conditions"

### US-008: Build game HUD
**Description:** As a player, I want to see my remaining movement points and current game status so I can make informed decisions.

**Acceptance Criteria:**
- [ ] `HUD.svelte` displays: remaining movement pool, last dice roll value, current game phase (in plain language)
- [ ] HUD updates reactively as game state changes
- [ ] Layout is compact and does not overlap with the board on mobile screens
- [ ] Verify in browser on both desktop and mobile viewport sizes
- [ ] Commit with message: "US-008: build game HUD"

### US-009: Build setup and game-over screens
**Description:** As a player, I want to configure the board size before playing and see my result when the game ends.

**Acceptance Criteria:**
- [ ] `SetupScreen.svelte` shows board size options: Small, Medium, Large (with hex counts displayed)
- [ ] Tapping a size option and "Start Game" initializes the game and transitions to gameplay
- [ ] `GameOver.svelte` shows win or lose message
- [ ] Displays stats: moves made, movement points remaining (if won), board size
- [ ] "Play Again" button returns to setup screen
- [ ] Verify in browser that full flow works: setup → play → game over → setup
- [ ] Commit with message: "US-009: build setup and game-over screens"

### US-010: Mobile touch optimization
**Description:** As a mobile player, I want the game to be easy to play with touch so I can play comfortably on my phone.

**Acceptance Criteria:**
- [ ] Viewport meta tag set for proper mobile scaling (no pinch-zoom needed)
- [ ] Vertex tap targets are at least 44x44px effective size (or vertex dots are large enough)
- [ ] Direction selection arrows/indicators are large enough to tap accurately
- [ ] Dice tap target is large and easy to hit
- [ ] No horizontal scrolling on mobile viewports
- [ ] Game layout stacks vertically on narrow screens (board on top, dice + HUD below)
- [ ] Verify in browser using Chrome DevTools device emulation (iPhone, Android)
- [ ] Commit with message: "US-010: mobile touch optimization"

## Functional Requirements

- FR-1: Generate a hex vertex grid (triangular lattice) of configurable radius (2, 3, or 4+)
- FR-2: Compute 6-directional rays from each vertex (straight-line paths along the triangular lattice axes)
- FR-3: Render the board as SVG with distinct visual treatment for: regular vertices, start, target, obstacles, visited, and player token
- FR-4: Roll a die (1-6) with visual animation on tap/click
- FR-5: After rolling, display available movement directions from the current vertex
- FR-6: Preview the path before committing — tap direction to highlight, confirm to move
- FR-7: Move the player token in a straight line, capped to remaining movement pool
- FR-8: Stop movement early if the path hits an obstacle or board edge
- FR-9: Subtract actual steps moved from the movement pool
- FR-10: Detect win condition when player reaches the target vertex
- FR-11: Detect lose condition when movement pool reaches 0 without reaching target
- FR-12: Detect lose condition when player is trapped (no valid direction to move)
- FR-13: Place obstacles randomly, guaranteeing at least one valid path from start to target
- FR-14: Support responsive layout for mobile and desktop browsers

## Non-Goals (Out of Scope for MVP)

- PWA features (service worker, offline support, installability)
- Game state persistence / save & resume (LocalStorage)
- Sound effects or music
- Multiple obstacle types (teleporters, one-way paths, etc.)
- AI opponent or multiplayer
- Leaderboards or scoring system
- Hand-crafted levels or campaigns
- Undo/redo moves
- Tutorial or onboarding flow

## Design Considerations

- **Visual style:** Clean and minimal — flat colors, simple geometric shapes
- **Color palette:** White/light gray background, dark vertices, green start, gold target, red/dark obstacles, blue player token
- **Board rendering:** SVG for clean scaling and built-in click/tap handling per element
- **Layout:** Vertically stacked on mobile (board top, controls bottom). Centered on desktop
- **Dice:** Large, centered below the board. Shows dot pattern matching the rolled value
- **Direction indicators:** Arrows or highlighted path lines radiating from player position

## Technical Considerations

- **Hex math:** Use axial coordinates (q, r) for hex centers; derive vertex positions using 60° rotation math. Deduplicate shared vertices using coordinate rounding/hashing
- **Triangular lattice:** Hex vertices form a triangular lattice. Each interior vertex has 6 neighbors. The 3 lattice axes define the 6 movement directions
- **Path validation:** BFS or ray-casting along each direction to find valid endpoints (stop at obstacles/edges)
- **Obstacle placement:** Generate random obstacles, then verify path exists (BFS from start to target on the lattice graph minus obstacles). Regenerate if no path exists
- **SVG interaction:** Use Svelte `on:click` handlers on SVG `<circle>` and `<line>` elements for vertex/direction selection
- **Responsive SVG:** Use `viewBox` attribute for automatic scaling; no fixed pixel dimensions

## Success Metrics

- Game is playable from start to finish in the browser (setup → roll → move → win or lose)
- Board renders correctly at all 3 configurable sizes
- Touch interactions work smoothly on mobile viewports (no mis-taps, no tiny targets)
- Game feels fair: randomly generated boards always have a solvable path
- A complete game session takes 2-5 minutes

## Resolved Design Decisions

- **Path preview:** Yes — tap a direction to see the highlighted path, then tap again or confirm to commit the move. Reduces mis-taps and adds strategic consideration.
- **Obstacle collision:** Player stops at the last valid vertex before the obstacle. Remaining steps are lost.
- **Visited vertices:** Visual marker only, no gameplay effect. Keeps the game simple.
- **Pool overflow:** Movement is capped to remaining pool. If you roll 5 but have 3 points left, you move 3 steps. Pool goes to 0.
