# Game Time

A single-player hex vertex strategy board game. Roll dice, choose a direction, and navigate obstacles to reach the target before running out of moves.

## Quick Start

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm test           # Run unit tests (vitest)
```

## How to Play

1. **Choose a board size** - Small (19 hexes), Medium (37 hexes), or Large (61 hexes)
2. **Roll the die** - Tap the die to roll 1-6
3. **Pick a direction** - Choose one of 6 directions along the hex lattice
4. **Preview your path** - See where you'll land before confirming
5. **Move** - Your token travels in a straight line

**Win** by reaching the gold target vertex. **Lose** if you run out of movement points or get trapped.

## Tech Stack

- **Svelte 5** (runes syntax) + **Vite 7**
- **SVG** for board rendering (responsive via `viewBox`)
- **Vitest** for unit tests
- Plain JavaScript (no TypeScript)

## Project Structure

```
src/
  lib/
    components/       # Svelte UI components
      Board.svelte       # SVG hex grid renderer + direction/path UI
      Dice.svelte        # Die face with roll animation
      HUD.svelte         # Movement pool, dice value, game phase display
      SetupScreen.svelte # Board size selection
      GameOver.svelte    # Win/lose screen with stats
    game/             # Game logic (pure JS, framework-agnostic)
      hexGrid.js         # Hex math: vertices, adjacency, directional rays
      gameState.js       # Svelte stores, initGame(), rollDice(), executeMove()
      movement.js        # getAvailableDirections(), computePath(), isTrapped()
```

## Key Concepts

**Hex vertex grid** - Spaces are at hexagon corners (not centers), forming a triangular lattice. Each vertex has 3 direct neighbors. The 6 movement directions come from 3 lattice axes.

**Directional rays** - From each vertex, 6 precomputed rays extend in straight lines across the lattice, skipping gaps in the bipartite structure.

**Movement pool** - Starts at `radius * 10`. Each move costs the actual steps taken (capped to remaining pool). Rolling 5 with 3 points left means you move 3 steps.

**Obstacles** - Randomly placed with BFS validation ensuring a path from start to target always exists.

## Development Patterns

- **Svelte 5 runes**: `$props()` for component props, `$state()` for local state, `$derived` for computed values
- **Store access**: Use `$storeName` auto-subscribe in `.svelte` files; use `get()` from `svelte/store` in JS/tests
- **Game state**: Centralized in Svelte writable stores (`gamePhase`, `playerPos`, `movementPool`, etc.)
- **Screen routing**: `App.svelte` switches on `gamePhase` - `setup` / `won|lost` / gameplay phases
- **Touch targets**: Minimum 44px, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`
- **SVG responsiveness**: `viewBox` with `preserveAspectRatio="xMidYMid meet"` - no fixed pixel dimensions
- **Seeded RNG**: `initGame(radius, seed)` accepts an optional seed for deterministic tests
- **Async test helpers**: Use `executeMoveAsync()` Promise wrapper (vitest deprecated `done()` callbacks)
