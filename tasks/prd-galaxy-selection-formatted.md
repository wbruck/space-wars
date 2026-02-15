# PRD: Galaxy Selection Screen (Formatted)

---

# User Story US-050

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Data Model
- Create `src/lib/game/galaxy.js` as a new game logic module alongside existing modules (`hexGrid.js`, `movement.js`, `boardObjects.js`)
- Galaxy state must be a plain serializable object (no class instances) for JSON localStorage persistence
- Each board needs a `seed` field — `initGame()` already accepts a seed parameter for deterministic board generation
- Use a seeded RNG (consistent with existing `xorshift32` pattern in the codebase) or `crypto.getRandomValues()` to generate board seeds, sizes, and difficulties
- Size mappings reuse existing constants: Small = 5x4, Medium = 7x6, Large = 9x8

### Board Object Structure
```javascript
{
  row: number,        // 0-2
  col: number,        // 0-2
  size: string,       // "small" | "medium" | "large"
  cols: number,       // grid columns for initGame (5, 7, or 9)
  rows: number,       // grid rows for initGame (4, 6, or 8)
  difficulty: number, // 7-20
  seed: number,       // deterministic RNG seed
  status: string      // "locked" | "unlocked" | "won" | "lost"
}
```

## User Story
### US-050: Create galaxy state data model
**Description:** As a developer, I need a data structure to represent the 3x3 galaxy grid so that each board tracks its size, difficulty, and completion status.

**Acceptance Criteria:**
- [ ] Create `src/lib/game/galaxy.js` with a `generateGalaxy()` function
- [ ] Galaxy is a 3x3 grid (9 boards), each board has: `row`, `col`, `size` (random: small/medium/large), `difficulty` (random: 1-10), `status` ("locked" | "unlocked" | "won" | "lost"), and a `seed` (for deterministic board generation)
- [ ] Board at position (0,0) starts with status "unlocked"; all others start "locked"
- [ ] Write unit tests for `generateGalaxy()` verifying grid structure, starting board status, and randomized size/difficulty distribution
- [ ] All tests pass
- [ ] Commit with message starting with "US-050"

---

# User Story US-051

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Adjacency Logic
- Adjacency is 8-directional (up, down, left, right, and all 4 diagonals) on the 3x3 grid
- Corner boards (0,0), (0,2), (2,0), (2,2) have 3 neighbors each
- Edge boards (0,1), (1,0), (1,2), (2,1) have 5 neighbors each
- Center board (1,1) has 8 neighbors
- `getAdjacentBoards(row, col)` should return an array of `{row, col}` objects for valid neighbors (bounds-checked to 0-2 range)

### Unlock Logic
- `unlockAdjacentBoards(galaxy, row, col)` mutates the galaxy grid in place
- Only changes boards with status `"locked"` to `"unlocked"` — must NOT overwrite `"won"` or `"lost"` statuses
- This function is called after a board is won (never after a loss)

## User Story
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

---

# User Story US-052

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### localStorage Persistence
- The current codebase has NO persistence — all state is in-memory Svelte stores. This story introduces localStorage for the first time.
- Store galaxy state under the key `"galaxyProgress"` in localStorage
- Galaxy state is a plain serializable object (no class instances), so `JSON.stringify()` / `JSON.parse()` is sufficient
- `saveGalaxy(galaxy)` — serialize and write to localStorage
- `loadGalaxy()` — read from localStorage and deserialize, return `null` if key doesn't exist or parse fails
- `clearGalaxy()` — remove the `"galaxyProgress"` key from localStorage
- Galaxy is saved after every board completion (win or loss) — called from the board completion handler (US-055)
- For unit tests, mock `localStorage` using a simple in-memory object or vitest's built-in mocking

## User Story
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

---

# User Story US-053

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Component Architecture
- Create `src/lib/components/GalaxySelection.svelte` — a new Svelte 5 component
- Receives galaxy grid data as a prop and an `onSelectBoard(row, col)` callback prop
- Uses Svelte 5 runes: `let { galaxy, onSelectBoard } = $props();`
- Does NOT subscribe to stores directly — receives all data via props (consistent with Board.svelte pattern)

### UI Layout
- Use CSS Grid: `display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);`
- Each cell shows: size label (Small/Medium/Large), difficulty number, and visual status
- Status styling:
  - `"won"` — green background/border
  - `"lost"` — red background/border, not clickable
  - `"unlocked"` — highlighted/glowing border, clickable (cursor: pointer)
  - `"locked"` — dimmed gray, not clickable
- Title "Galaxy Selection" displayed above the grid
- Mobile: min touch target 44px per cell, `touch-action: manipulation`
- Reuse existing dark background / sci-fi aesthetic from the game

### Accessibility
- Clickable cells need `role="button"`, `tabindex="0"`, `onkeydown` for keyboard nav (consistent with Board.svelte interactive elements)

## User Story
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

---

# User Story US-054

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Game State Changes (`src/lib/game/gameState.js`)
- Add new Svelte writable store: `export const galaxyState = writable(null);`
- Add new store to track current board: `export const currentBoardPos = writable(null);` — holds `{row, col}` of the board being played
- `resetGame()` currently sets `gamePhase` to `"setup"` — change to `"galaxy"`
- The `"setup"` phase is replaced by `"galaxy"` as the entry point

### App.svelte Integration
- Import `GalaxySelection` component and `galaxyState` / `currentBoardPos` stores
- On mount: check `loadGalaxy()` — if saved galaxy exists, load into `galaxyState` store; otherwise call `generateGalaxy()` and set store
- Route `gamePhase === "galaxy"` → render `<GalaxySelection>` with galaxy data and `onSelectBoard` handler
- `handleSelectBoard(row, col)`: look up the board at (row, col) from galaxy, call `initGame(board.cols, board.rows, board.seed, board.difficulty)`, set `currentBoardPos` to `{row, col}`
- `initGame()` already accepts `(cols, rows, seed, difficulty)` — no changes needed to initGame itself

### Phase Flow Update
```
"galaxy" → (select board) → "rolling" → ... gameplay loop ... → "won"/"lost"
→ GameOver → (continue) → update galaxy → "galaxy" (or "galaxyComplete")
```

## User Story
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

---

# User Story US-055

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Board Completion Flow
- Currently `handlePlayAgain()` in App.svelte calls `resetGame()` which goes to `"setup"`. This needs to be replaced with galaxy-aware logic.
- New flow in App.svelte `handleContinue()`:
  1. Read `currentBoardPos` store to get `{row, col}` of the board just played
  2. Read `gamePhase` to determine if player won or lost (phase is `"won"` or `"lost"`)
  3. Update the galaxy grid: set `galaxy[row][col].status` to `"won"` or `"lost"`
  4. If won: call `unlockAdjacentBoards(galaxy, row, col)` to unlock neighbors
  5. Call `saveGalaxy(galaxy)` to persist to localStorage
  6. Update `galaxyState` store with the modified galaxy
  7. Check `isGalaxyComplete(galaxy)` — if true, set phase to `"galaxyComplete"`; otherwise set phase to `"galaxy"`

### Store Updates
- `galaxyState` store must be updated reactively so `GalaxySelection` re-renders with new statuses
- `currentBoardPos` is reset to `null` when returning to galaxy

## User Story
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

---

# User Story US-056

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Galaxy Completion Logic
- `isGalaxyComplete(galaxy)` returns `true` when no board in the 3x3 grid has status `"unlocked"`
- This means all boards are either `"won"`, `"lost"`, or `"locked"` (unreachable because adjacent boards were all lost)
- This check runs after every board completion (in the `handleContinue` flow from US-055)

### GalaxyComplete Component
- Create `src/lib/components/GalaxyComplete.svelte`
- Receives galaxy data as a prop to compute stats
- Display counts: won (green), lost (red), unreachable/locked (gray)
- "New Galaxy" button: calls `clearGalaxy()` to remove localStorage, calls `generateGalaxy()` to create fresh galaxy, updates `galaxyState` store, sets phase to `"galaxy"`

### New Game Phase
- Add `"galaxyComplete"` as a new `gamePhase` value
- App.svelte routes `gamePhase === "galaxyComplete"` → render `<GalaxyComplete>`

## User Story
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

---

# User Story US-057

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### GameOver.svelte Changes (`src/lib/components/GameOver.svelte`)
- The current "Play Again" button calls `onPlayAgain()` which triggers `resetGame()` → `"setup"` phase
- Change button text from "Play Again" to "Return to Galaxy"
- The callback prop should be renamed or repurposed: `onPlayAgain` → `onContinue` (or keep the same prop name but change the handler in App.svelte)
- All existing stats remain: moves made (`$movesMade`), points remaining (`$movementPool`, win only), board size, and contextual loss reason (`$loseReason`)
- No other UI changes to GameOver — just the button text and flow

## User Story
### US-057: Update GameOver screen for galaxy flow
**Description:** As a player, the GameOver screen should reflect that I'm returning to the galaxy, not restarting a standalone game.

**Acceptance Criteria:**
- [ ] Change "Play Again" button text to "Return to Galaxy"
- [ ] Remove the standalone "Play Again" flow (no longer resets to setup screen)
- [ ] GameOver still shows all existing stats (moves made, points remaining, board size, loss reason)
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "US-057"

---

# User Story US-058

---

## Introduction
Replace the current setup screen with a "Galaxy Selection" screen — a 3x3 grid of boards with random size and difficulty that the player traverses sequentially, with progress persisted in localStorage.

## Goals
- Provide a meta-progression layer with randomized board assignments
- Add strategic depth through adjacency-based unlock system where lost boards block paths
- Persist galaxy progress across browser sessions

## Technical Details
### Files to Remove
- Delete `src/lib/components/SetupScreen.svelte`

### Files to Modify
- `src/App.svelte`: Remove `import SetupScreen` and the `gamePhase === "setup"` routing branch
- Any test files referencing `"setup"` phase need updating (check `gameState.test.js`, `winLose.test.js`)
- `src/lib/game/gameState.js`: Remove any remaining `"setup"` references (resetGame should already point to `"galaxy"` from US-054)

### Verification
- `grep -r "SetupScreen\|setup" src/` should return no hits related to the old setup flow
- All existing tests must still pass after cleanup

## User Story
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
