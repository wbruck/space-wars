# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm test             # Run all vitest unit tests
npx vitest run src/lib/game/hexGrid.test.js   # Run a single test file
```

## Directory Layout

- `src/lib/components/` — Svelte UI components (Board, Dice, HUD, SetupScreen, GameOver)
- `src/lib/game/` — Game logic modules (hexGrid, gameState, movement, boardObjects) and tests
- `src/lib/utils/` — Shared helpers

## Architecture

Single-player hex vertex board game built with **Svelte 5** (runes syntax) + **Vite 7**, plain JavaScript (no TypeScript). Board rendered as SVG.

### Game Flow & Screen Routing

`App.svelte` routes screens based on the `gamePhase` store:

```
galaxy → shipyard → galaxy (ship build confirmed) → board selection
rolling → selectingDirection → moving → rolling (gameplay loop)
won | lost → GameOver (stats + play again)
```

Gameplay phases show `Board` + `Dice` + `HUD` together.

### Game State (`src/lib/game/gameState.js`)

Centralized Svelte writable stores: `board`, `playerPos`, `movementPool`, `diceValue`, `gamePhase`, `visited`, `movesMade`, `selectedDirection`, `previewPath`, `animatingPath`, `animationStep`, `componentMarket`, `shipConfirmed`.

Key exports: `initGame(cols, rows, seed?, difficulty?)`, `rollDice()`, `selectDirection(dir)`, `executeMove(callback?)`, `resetGame()`, `hasValidPath()`, `generateComponentMarket(rng)`, `initGalaxySession(seed?)`, `enterShipyard()`, `confirmShipBuild()`, `installComponent(index)`, `removeComponent(name)`.

- `initGame` accepts cols/rows for board dimensions, an optional seed for deterministic tests (xorshift32 RNG), and optional difficulty (1-10, default 5)
- `boardData` includes `boardObjects` (all BoardObject instances), `powerUps` (PowerUp[]), and `obstacles` (Set<string> for backward compatibility)
- Movement pool formula: `(cols + rows) * 5`
- `executeMove` animates step-by-step with setTimeout (150ms/step), then checks win/lose/trapped
- Movement pool deduction happens AFTER the move completes, using actual steps taken (not dice value)
- **Win/lose check flow:** `rollDice()` checks trapped *before* rolling (start-of-turn trap). `executeMove()` checks win (target reached), lose (pool exhausted), lose (trapped) *after* move completes.
- **Shipyard stores:** `componentMarket` (writable, array of component instances), `shipConfirmed` (writable, boolean). `generateComponentMarket(rng)` creates 5-6 components with guaranteed 1 weapon, 1 engine, 1 bridge. `initGalaxySession(seed?)` generates the market and resets ship state. `enterShipyard()` sets phase to 'shipyard'. `confirmShipBuild()` sets shipConfirmed=true and returns to galaxy. `installComponent(index)` moves component from market to ship (returns false on power/bridge rejection). `removeComponent(name)` moves component from ship back to market (repairs HP first).

### Hex Grid (`src/lib/game/hexGrid.js`)

Spaces are at hex **vertices** (corners) AND hex **centers**. Corner vertices form the original triangular lattice; center vertices fill gaps to create a denser graph. Each center vertex has **6 neighbors** (its hex's 6 corners). Each corner vertex has up to **6 neighbors** (3 corners + up to 3 centers). The 6 movement directions come from 3 lattice axes x 2 directions. Directional rays are built via graph traversal and include both corner and center vertices. Rays do **NOT** strictly alternate corner-center-corner — some directions have consecutive corners (e.g., corner→center→corner→corner→center). Center vertices never appear consecutively since center neighbors are always corners.

Internally, `hexGrid.js` uses a `coordToId` map for position-based lookups that handles both corner and center vertex ID resolution.

Board layout is rectangular using offset columns (odd-q) for flat-top hexes. Size mappings: Small = 5x4 (20 hexes), Medium = 7x6 (42 hexes), Large = 9x8 (72 hexes).

`generateGrid(cols, rows, size)` returns `{ vertices, adjacency, rays, hexCenters, size, cols, rows }`. Corner vertex IDs are coordinate strings like `"40,69.282"`. Center vertex IDs use `c:` prefix like `"c:0,0"`. Vertices have a `type` property (`"corner"` or `"center"`). Use `isCenterVertex(id)` to distinguish them.

### Movement (`src/lib/game/movement.js`)

`getAvailableDirections()` — non-blocked rays from current vertex.
`computePath()` — walks a ray for N steps, stops at obstacles/edges, detects target.
`isTrapped()` — true if all directions blocked (lose condition).

Path computation uses **rays** (not adjacency). Remaining steps after hitting an obstacle are lost.

### Combat System (`src/lib/game/combat.js`)

Ship component system using composition-based architecture with a `ComponentContainer` mixin.

**Components:** `ShipComponent` base class with typed subclasses: `WeaponComponent` (damage, accuracy), `EngineComponent` (speedBonus), `BridgeComponent` (evasionBonus). Each has a `type` getter (`'weapon'`, `'engine'`, `'bridge'`). Constructor: `ShipComponent(name, maxHp, powerCost=1)` — powerCost defaults to 1 for backward compat. Power 1 vs power 2 variants have different stats (e.g., weapon accuracy 4 vs 3).

**ComponentContainer mixin:** `ComponentContainer(Base)` returns a class with component management: `addComponent()` (enforces powerLimit budget and bridge uniqueness), `removeComponent()` (explicit only, never triggered by damage), `totalPower`, `remainingPower`, `getComponentsByType(type)`, `hasComponentType(type)`, `getComponent(name)` (backward compat), `getActiveComponents()`, `isDestroyed`. Destroyed components (0 HP) remain in the array permanently — never auto-removed.

**Ships:** `Ship` extends `ComponentContainer(Object)`. Constructors support legacy array form `Ship('name', [comps])` (powerLimit=Infinity) and new options form `Ship('name', { powerLimit, components })`.

- `PlayerShip`: powerLimit=7, defaults: WeaponComponent('Weapons', 4, 2), EngineComponent('Engines', 4, 2), BridgeComponent('Bridge', 3, 2). Getters use type-based queries (`canAttack` = any weapon active, `isEngineDestroyed` = ALL engines destroyed).
- `EnemyShip`: powerLimit=4, defaults: WeaponComponent('Weapons', 1, 1), EngineComponent('Engines', 1, 1), BridgeComponent('Bridge', 1, 1). Has `getSalvageableComponents()` returning non-destroyed components.

**CombatEngine:** Turn-based d6 combat. Reads `accuracy` and `damage` from attacker's first active `WeaponComponent` (falls back to `hitThreshold` constructor param). `rollBonus` only applies to player attacks. Win conditions: enemy bridge destroyed. Lose conditions: player bridge destroyed, all player components destroyed, max turns. Enemy flees if weapons destroyed but engines intact.

**Component persistence:** Destroyed ships retain all components (including non-destroyed ones) for future salvage. `enemyObj.combatShip` is preserved after `playerWin` — never nulled.

### Board Objects (`src/lib/game/boardObjects.js`)

`BoardObject` base class with `Obstacle` and `PowerUp` subclasses. Factory: `createBoardObject(type, vertexId, value)`. Placement: `generateBoardObjects(vertices, start, target, difficulty, rng)` returns `{ obstacles, powerUps, obstacleSet }`. Difficulty 1-10 scales obstacle density (5%-20%) and power-up density (15%-3%). Object values correlate with difficulty level.

### Component Data Flow

- **Board.svelte** — receives all game data as **props** from App.svelte: `cols`, `rows`, `startVertex`, `targetVertex`, `obstacles`, `playerPos`, `visited`, `gamePhase`, `availableDirections`, `previewPath`, `selectedDirection`, `animatingPath`, `animationStep`, `onDirectionSelect`, `onConfirmMove`
- **HUD.svelte, GameOver.svelte** — subscribe directly to stores (no props needed)
- **Dice.svelte** — uses `$derived()` for store auto-subscription
- **SetupScreen.svelte** — local `$state()` for size and difficulty selection, callback prop for start (passes cols, rows, difficulty)

## Svelte 5 Patterns

```javascript
let { prop1, prop2 } = $props();      // Component props
let local = $state(initialValue);      // Mutable local state
let computed = $derived($storeName);   // Auto-subscribe to store in .svelte
let complex = $derived.by(() => { }); // Computed with logic
```

In `.js` files and tests, use `get()` from `svelte/store` to read store values.

## Testing

593 tests across 7 files in `src/lib/game/` (`hexGrid.test.js`, `gameState.test.js`, `movement.test.js`, `winLose.test.js`, `dice.test.js`, `boardObjects.test.js`, `combat.test.js`). Tests use seeded RNG (`initGame(cols, rows, seed)`) for reproducibility. For async tests with `executeMove`, wrap in a Promise (vitest deprecated `done()` callbacks). Combat tests use `makeRng(rolls)` and `makeEngine(rolls, opts)` helpers for deterministic testing. When testing with PlayerShip/EnemyShip, always use typed subclasses (WeaponComponent, etc.) — type-based getters won't find plain ShipComponent instances.

## Mobile & SVG

- SVG uses `viewBox` + `preserveAspectRatio="xMidYMid meet"` for responsive scaling
- Touch targets: min 44px, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`
- Interactive SVG elements need `role="button"`, `tabindex="0"`, `onkeydown` for a11y
