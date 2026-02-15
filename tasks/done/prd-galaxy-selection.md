# PRD: Galaxy Selection Screen

## Introduction

Replace the current single-game setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards that the player traverses sequentially. Each board has a randomly assigned size and difficulty. The player starts at the top-left board and unlocks adjacent boards by winning. Lost boards are permanently locked (red), forcing the player to find alternate paths. Galaxy progress persists in localStorage across browser sessions. Completing or losing all reachable boards triggers a "Galaxy Complete" summary screen.

## Goals

- Provide a meta-progression layer that gives players a reason to play multiple games in sequence
- Replace the manual size/difficulty picker with randomized board assignments for variety
- Add strategic depth through the adjacency-based unlock system where lost boards block paths
- Persist galaxy progress so players can return and continue across sessions
- Show a summary screen when the galaxy is complete with aggregate stats

## User Stories

### US-050: Create galaxy state data model
**Description:** As a developer, I need a data structure to represent the 3x3 galaxy grid so that each board tracks its size, difficulty, and completion status.

**Acceptance Criteria:**
- [ ] Create `src/lib/game/galaxy.js` with a `generateGalaxy()` function
- [ ] Galaxy is a 3x3 grid (9 boards), each board has: `row`, `col`, `size` (random: small/medium/large), `difficulty` (random: 1-10), `status` ("locked" | "unlocked" | "won" | "lost"), and a `seed` (for deterministic board generation)
- [ ] Board at position (0,0) starts with status "unlocked"; all others start "locked"
- [ ] Write unit tests for `generateGalaxy()` verifying grid structure, starting board status, and randomized size/difficulty distribution
- [ ] All tests pass
- [ ] Commit with message starting with "US-050"

### US-051: Implement galaxy adjacency and unlock logic
**Description:** As a developer, I need adjacency logic so that winning a board unlocks its 8-directional neighbors.

**Acceptance Criteria:**
- [ ] Add `getAdjacentBoards(row, col)` function that returns all valid neighbors (8-directional: up, down, left, right, and all 4 diagonals)
- [ ] Add `unlockAdjacentBoards(galaxy, row, col)` function that sets adjacent "locked" boards to "unlocked" (does not change "won" or "lost" boards)
- [ ] Corner boards have 3 neighbors, edge boards have 5, center board has 8
- [ ] Write unit tests verifying adjacency counts for corner, edge, and center positions
- [ ] Write unit tests verifying unlock does not overwrite "won" or "lost" statuses
- [ ] All tests pass
- [ ] Commit with message starting with "US-051"

### US-052: Implement galaxy persistence with localStorage
**Description:** As a player, I want my galaxy progress saved so that I can close the browser and resume later.

**Acceptance Criteria:**
- [ ] Add `saveGalaxy(galaxy)` function that serializes galaxy state to localStorage under key `"galaxyProgress"`
- [ ] Add `loadGalaxy()` function that deserializes and returns saved galaxy, or `null` if none exists
- [ ] Add `clearGalaxy()` function that removes saved galaxy from localStorage
- [ ] Galaxy is saved after every board completion (win or loss)
- [ ] Write unit tests for save/load/clear using mock localStorage
- [ ] All tests pass
- [ ] Commit with message starting with "US-052"

### US-053: Create GalaxySelection component with 3x3 grid UI
**Description:** As a player, I want to see a 3x3 grid of boards so I can choose which board to play next.

**Acceptance Criteria:**
- [ ] Create `src/lib/components/GalaxySelection.svelte` component
- [ ] Display 9 boards in a 3x3 CSS grid layout
- [ ] Each board cell shows: board size label (Small/Medium/Large), difficulty number, and visual status indicator
- [ ] Status colors: green background/border for "won", red for "lost", highlighted/glowing border for "unlocked" (selectable), dimmed/gray for "locked"
- [ ] Locked and lost boards are not clickable
- [ ] Unlocked boards are clickable and call an `onSelectBoard(row, col)` callback
- [ ] Won boards are not clickable (already completed)
- [ ] Screen has a title "Galaxy Selection" at the top
- [ ] Responsive layout that works on mobile (min touch target 44px per board cell)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "US-053"

### US-054: Integrate galaxy phase into game flow
**Description:** As a developer, I need to add a "galaxy" game phase so the App routes to the GalaxySelection screen.

**Acceptance Criteria:**
- [ ] Add `"galaxy"` as a new `gamePhase` value
- [ ] Add a `galaxyState` Svelte store in `gameState.js` to hold the current galaxy grid
- [ ] `resetGame()` now sets phase to `"galaxy"` instead of `"setup"` (galaxy replaces setup as the landing screen)
- [ ] On app load, check localStorage for saved galaxy: if found, load it and go to `"galaxy"` phase; if not, generate a new galaxy and go to `"galaxy"` phase
- [ ] App.svelte renders `GalaxySelection` when phase is `"galaxy"`
- [ ] When a board is selected, call `initGame(cols, rows, seed, difficulty)` using that board's properties, store the selected board's (row, col) for later, and transition to gameplay
- [ ] Verify in browser using dev-browser skill
- [ ] All tests pass
- [ ] Commit with message starting with "US-054"

### US-055: Handle board completion and return to galaxy
**Description:** As a player, after I finish a board (win or lose), I want to see the result and return to the galaxy with my progress updated.

**Acceptance Criteria:**
- [ ] After the GameOver screen "Continue" button is clicked, update the galaxy board status: set to "won" if player won, "lost" if player lost
- [ ] If the board was won, unlock all adjacent locked boards using `unlockAdjacentBoards()`
- [ ] Save updated galaxy to localStorage
- [ ] Transition back to `"galaxy"` phase so player sees the updated grid
- [ ] Won board shows green on the galaxy grid
- [ ] Lost board shows red on the galaxy grid and is no longer selectable
- [ ] Verify in browser using dev-browser skill
- [ ] All tests pass
- [ ] Commit with message starting with "US-055"

### US-056: Detect galaxy completion and show summary
**Description:** As a player, when I've resolved all reachable boards in the galaxy, I want to see a summary of my performance.

**Acceptance Criteria:**
- [ ] Add `isGalaxyComplete(galaxy)` function that returns `true` when no boards have status "unlocked" (all are won, lost, or locked-with-no-path)
- [ ] Create `src/lib/components/GalaxyComplete.svelte` component
- [ ] Summary shows: total boards won (green count), total boards lost (red count), total boards unreachable (locked count)
- [ ] Display a "New Galaxy" button that clears localStorage and generates a fresh galaxy
- [ ] App.svelte renders `GalaxyComplete` when galaxy is complete (new phase `"galaxyComplete"`)
- [ ] After returning from a board, check `isGalaxyComplete()` before going to galaxy phase — if complete, go to `"galaxyComplete"` phase instead
- [ ] Write unit tests for `isGalaxyComplete()` with various galaxy states
- [ ] Verify in browser using dev-browser skill
- [ ] All tests pass
- [ ] Commit with message starting with "US-056"

### US-057: Update GameOver screen for galaxy flow
**Description:** As a player, the GameOver screen should reflect that I'm returning to the galaxy, not restarting a standalone game.

**Acceptance Criteria:**
- [ ] Change "Play Again" button text to "Return to Galaxy"
- [ ] Remove the standalone "Play Again" flow (no longer resets to setup screen)
- [ ] GameOver still shows all existing stats (moves made, points remaining, board size, loss reason)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "US-057"

### US-058: Remove legacy SetupScreen
**Description:** As a developer, I want to remove the old SetupScreen since the Galaxy Selection screen replaces it.

**Acceptance Criteria:**
- [ ] Remove `SetupScreen.svelte` component file
- [ ] Remove the `"setup"` phase routing from App.svelte
- [ ] Remove any imports or references to SetupScreen across the codebase
- [ ] Verify no dead code remains related to the old setup flow
- [ ] All tests pass (update any tests that reference `"setup"` phase)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "US-058"

## Functional Requirements

- FR-1: The galaxy is a 3x3 grid of 9 boards, each with a randomly assigned size (small/medium/large) and difficulty (1-10)
- FR-2: Each board has a deterministic seed so replaying generates the same board layout
- FR-3: The top-left board (0,0) is unlocked at the start; all other boards start locked
- FR-4: Adjacency is 8-directional (up, down, left, right, and all 4 diagonals)
- FR-5: Winning a board sets it to "won" (green) and unlocks all adjacent locked boards
- FR-6: Losing a board sets it to "lost" (red) and permanently locks it — it cannot be replayed
- FR-7: Only "unlocked" boards are selectable by the player
- FR-8: Galaxy progress is persisted to localStorage and restored on page load
- FR-9: When no "unlocked" boards remain, the galaxy is complete
- FR-10: The galaxy complete screen shows win/loss/unreachable counts and a "New Galaxy" button
- FR-11: The "New Galaxy" button clears localStorage and generates a fresh random galaxy
- FR-12: The legacy SetupScreen and `"setup"` game phase are removed

## Non-Goals

- No visual map/path lines connecting boards (just a simple grid)
- No board preview showing the hex layout before selecting
- No undo/retry for lost boards
- No difficulty progression (boards are fully random, not scaled by position)
- No animations or transitions between galaxy and board screens
- No galaxy difficulty selection (always 9 random boards)
- No leaderboard or score tracking beyond the current galaxy
- No multiple save slots (one galaxy at a time)

## Design Considerations

- Board cells in the 3x3 grid should be large enough for mobile touch targets (minimum 44px)
- Use distinct, colorblind-friendly status indicators: green for won, red for lost, a glowing/highlighted border for unlocked (selectable), and dimmed gray for locked
- The galaxy screen should feel thematic — "Galaxy Selection" title at top, board cells could be styled as planets or star systems
- Reuse existing game styling patterns (dark background, sci-fi aesthetic matching the combat/ship theme)
- Consider adding board size and difficulty as small labels inside each cell so the player can make strategic path choices

## Technical Considerations

- Galaxy state should be a plain serializable object (no class instances) for easy JSON localStorage persistence
- Use `crypto.getRandomValues()` or a seeded RNG to generate board seeds, sizes, and difficulties
- The `galaxyState` store should be a Svelte writable store in `gameState.js` alongside existing stores
- `initGame()` already accepts a seed parameter — use each board's stored seed for deterministic generation
- The `"setup"` phase is removed entirely; `"galaxy"` becomes the new entry point
- `resetGame()` transitions to `"galaxy"` instead of `"setup"`
- Need to track which board (row, col) the player is currently playing so completion can update the right cell

## Success Metrics

- Player can complete a full galaxy traversal from top-left to a terminal state
- Galaxy progress survives a full page refresh
- Lost boards are permanently red and unselectable
- Adjacent unlocking works correctly in all 8 directions
- Galaxy complete screen triggers when no unlocked boards remain

## Open Questions

- Should board cells display a name/label (e.g., "Alpha-7", "Nebula-3") for flavor, or just size and difficulty?
- Should there be a visual indication of which boards are adjacent to the currently hovered/selected board?
- Should the galaxy complete screen show per-board stats (moves made, points remaining) or just aggregate counts?
