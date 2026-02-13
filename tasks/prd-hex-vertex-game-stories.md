-------------
User Story 001
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Project Setup
- Initialize with `npm create vite@latest` using the Svelte template
- Project root: `/Users/user/code/game_time/`
- Directory structure:
  - `src/lib/components/` — Svelte UI components (Board, Dice, HUD, GameOver, SetupScreen)
  - `src/lib/game/` — Game logic modules (hexGrid, gameState, movement, obstacles)
  - `src/lib/utils/` — Utility helpers (canvas, storage)
- No additional dependencies needed for MVP (no PWA plugin, no persistence)

## User Story
### US-001: Initialize Vite + Svelte project
**Description:** As a developer, I need the project scaffolded with Vite + Svelte so we have a working dev environment.

**Acceptance Criteria:**
- [ ] Vite + Svelte project created in `/Users/user/code/game_time/`
- [ ] `npm run dev` starts dev server and renders a placeholder page
- [ ] Project structure matches planned layout (src/lib/components, src/lib/game, src/lib/utils)
- [ ] Commit with message: "US-001: scaffold Vite + Svelte project"

-------------
User Story 002
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Hex Grid Math
- Use axial coordinates (q, r) for hex centers; derive vertex positions using 60° rotation math
- Hex vertices form a triangular lattice — each interior vertex has 6 neighbors
- Deduplicate shared vertices using coordinate rounding/hashing (vertices at hex corners are shared by up to 3 hexes)
- The 3 lattice axes define 6 movement directions (3 axes × 2 directions each)
- For each vertex, precompute 6 directional rays: ordered lists of vertices in each straight-line direction along the triangular lattice
- Grid radius maps to hex count: radius 2 = 19 hexes, radius 3 = 37 hexes, radius 4 = 61 hexes

### Key Data Structures
- Vertex: `{ id, x, y, q, r }` — unique ID, pixel coordinates, and axial coordinates
- Adjacency map: `Map<vertexId, vertexId[]>` — 6 neighbors per interior vertex
- Directional rays: `Map<vertexId, { direction: number, vertices: vertexId[] }[]>` — 6 rays per vertex

### File
- `src/lib/game/hexGrid.js`

## User Story
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

-------------
User Story 003
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### SVG Board Rendering
- Render the board as SVG (not Canvas) for clean scaling and built-in click/tap handling per element
- Use SVG `viewBox` attribute for automatic responsive scaling — no fixed pixel dimensions
- Use Svelte `on:click` handlers on SVG `<circle>` elements for vertex interaction

### Visual Design
- Clean and minimal: flat colors, simple geometric shapes
- Color palette:
  - Background: white/light gray
  - Regular vertices: dark circles/dots
  - Start vertex: green
  - Target vertex: gold/red
  - Obstacle vertices: dark fill or X marker
  - Player token: blue
  - Visited vertices: lighter shade or outline change
- Hex outlines drawn as light guide lines (visual reference only)
- Edges drawn as lines between adjacent vertices

### File
- `src/lib/components/Board.svelte`
- Depends on: `src/lib/game/hexGrid.js` (US-002)

## User Story
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

-------------
User Story 004
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Game State Management
- Use Svelte writable stores for reactive state
- Game phases: `setup | rolling | selectingDirection | moving | won | lost`
- Movement pool formula: `radius * 10` (scales with board size)

### Obstacle Placement
- Generate random obstacles, then verify a valid path exists using BFS from start to target on the lattice graph (excluding obstacle vertices)
- If no valid path exists, regenerate obstacles
- Start and target vertices must be placed at a reasonable distance apart (not adjacent)

### Key Stores
- `board` — vertex list, adjacency map, rays, obstacle set, start/target vertex IDs
- `playerPos` — current vertex ID
- `movementPool` — remaining movement points (integer)
- `diceValue` — current roll result (1-6 or null)
- `gamePhase` — current phase string

### Files
- `src/lib/game/gameState.js`
- Depends on: `src/lib/game/hexGrid.js` (US-002)

## User Story
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

-------------
User Story 005
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Dice Component
- Visual die displaying dot patterns for faces 1-6
- Roll animation: CSS transform rotation or simple frame swap (cycle through random faces briefly before landing)
- Die is large and centered below the board for easy tapping
- Movement pool deduction happens after the move is completed (actual steps moved), not on roll
- If die roll exceeds remaining pool, movement is capped to remaining pool (e.g., roll 5 with pool 3 = move 3 steps)

### Game Flow Integration
- Die clickable only during `rolling` phase
- After roll: store dice value in game state, transition to `selectingDirection` phase
- Die disabled/grayed during all other phases

### File
- `src/lib/components/Dice.svelte`
- Depends on: `src/lib/game/gameState.js` (US-004)

## User Story
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

-------------
User Story 006
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Directional Movement
- After rolling, player enters `selectingDirection` phase
- Use precomputed directional rays from `hexGrid.js` to determine available directions
- Each ray is a straight line along one of the 6 triangular lattice axes
- Movement steps = `min(diceValue, remainingMovementPool)`

### Path Preview
- Tapping a direction highlights the path (vertices along the ray up to the step count)
- Path preview stops early at obstacles or board edge — player would stop at the last valid vertex
- Player can tap different directions to change preview before committing
- Confirm button or second tap on same direction commits the move

### Path Validation
- Ray-cast along the chosen direction: walk vertex-by-vertex along the ray
- Stop if next vertex is an obstacle or doesn't exist (board edge)
- Remaining steps after hitting obstacle are lost (not redirected)

### Movement Animation
- Animate token step-by-step along the path with brief delays between steps
- Mark each traversed vertex as "visited" (visual only, no gameplay effect)
- After animation completes, update player position in game state

### Direction Indicators
- Show arrows or highlighted path lines radiating from player position
- Hide directions that are fully blocked (immediate obstacle or board edge as first vertex)

### Files
- `src/lib/game/movement.js` — movement validation, ray traversal, path computation
- `src/lib/components/Board.svelte` — direction indicators, path preview, animation
- Depends on: `src/lib/game/hexGrid.js` (US-002), `src/lib/game/gameState.js` (US-004)

## User Story
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

-------------
User Story 007
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Win/Lose Detection
- Runs after every completed move (after animation and position update)
- Three conditions checked in order:

### Win Condition
- Player lands on OR passes through the target vertex during movement
- Check each vertex along the movement path, not just the final position
- If target is passed through, player stops at target (wins immediately)

### Lose Condition: Out of Points
- Movement pool reaches 0 and player has not reached the target
- Checked after movement pool deduction

### Lose Condition: Trapped
- All 6 directions from current vertex are blocked (obstacle or board edge with no room to move)
- Equivalent to: no valid ray from current position has at least 1 traversable vertex
- Checked at the start of each turn (before rolling)

### Game Phase Transitions
- Win → `gamePhase` set to `"won"`
- Lose → `gamePhase` set to `"lost"`

### Files
- `src/lib/game/gameState.js` — win/lose detection logic
- `src/lib/game/movement.js` — trapped detection helper
- Depends on: US-004, US-006

## User Story
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

-------------
User Story 008
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### HUD Component
- Compact overlay or panel below/beside the board
- Subscribes reactively to Svelte stores: `movementPool`, `diceValue`, `gamePhase`
- Layout must not overlap with the board on mobile screens
- Vertically stacked on mobile (board on top, HUD below)

### Display Elements
- Remaining movement pool (numeric display, e.g., "Moves: 23")
- Last dice roll value (e.g., "Rolled: 4")
- Game phase in plain language (e.g., "Roll the dice", "Choose a direction", "Moving...")

### File
- `src/lib/components/HUD.svelte`
- Depends on: `src/lib/game/gameState.js` (US-004)

## User Story
### US-008: Build game HUD
**Description:** As a player, I want to see my remaining movement points and current game status so I can make informed decisions.

**Acceptance Criteria:**
- [ ] `HUD.svelte` displays: remaining movement pool, last dice roll value, current game phase (in plain language)
- [ ] HUD updates reactively as game state changes
- [ ] Layout is compact and does not overlap with the board on mobile screens
- [ ] Verify in browser on both desktop and mobile viewport sizes
- [ ] Commit with message: "US-008: build game HUD"

-------------
User Story 009
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Setup Screen
- Board size selection: Small (radius 2, 19 hexes), Medium (radius 3, 37 hexes), Large (radius 4, 61 hexes)
- Display hex count next to each option for clarity
- "Start Game" button calls `initGame(radius)` from game state and transitions `gamePhase` to `"rolling"`

### Game Over Screen
- Conditional rendering based on `gamePhase` being `"won"` or `"lost"`
- Stats to display: total moves made, movement points remaining (if won), board size played
- "Play Again" button resets `gamePhase` to `"setup"`, returning to setup screen

### Screen Management
- `App.svelte` conditionally renders screens based on `gamePhase`:
  - `"setup"` → SetupScreen
  - `"won"` or `"lost"` → GameOver
  - All other phases → Game board + HUD + Dice

### Files
- `src/lib/components/SetupScreen.svelte`
- `src/lib/components/GameOver.svelte`
- `src/App.svelte` — conditional screen rendering
- Depends on: `src/lib/game/gameState.js` (US-004)

## User Story
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

-------------
User Story 010
---------------

## Introduction
A single-player hex vertex strategy board game built with Vite + Svelte where the player rolls dice, chooses a direction, and navigates obstacles to reach a target vertex before running out of movement points.

## Goals
- Deliver a playable hex vertex board game in the browser with configurable board sizes
- Provide strategic depth through 6-directional movement and limited movement pool
- Clean, minimal visual design with touch-friendly mobile gameplay

## Technical Details
### Mobile Touch Optimization
- Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">`
- Minimum tap target size: 44x44px (Apple HIG / Material Design guideline)
- SVG vertex circles should have sufficient radius or invisible hit areas to meet tap target requirements

### Responsive Layout
- Vertically stacked on narrow screens: board on top, dice + HUD below
- SVG `viewBox` ensures board scales to fit available width automatically
- No horizontal scrolling on any mobile viewport (320px minimum width support)

### Touch Targets
- Vertex dots: large enough to tap accurately (consider invisible larger hit area behind visible dot)
- Direction arrows/indicators: sized for finger taps, not mouse clicks
- Dice: large tap target, centered, easy to reach with thumb

### Testing
- Chrome DevTools device emulation: iPhone SE (375px), iPhone 14 (390px), Pixel 7 (412px)
- Verify no content overflow, no tiny targets, no overlapping elements

### Files
- `index.html` — viewport meta tag
- `src/app.css` — responsive layout styles
- `src/lib/components/Board.svelte` — touch target sizing
- `src/lib/components/Dice.svelte` — tap target sizing
- All component files may need touch-related adjustments

## User Story
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
