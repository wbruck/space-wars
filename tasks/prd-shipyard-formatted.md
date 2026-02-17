# PRD: Shipyard Screen (Formatted)

---

# User Story 1

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### Rename Mapping
- `ShipComponent.size` → `ShipComponent.powerCost` (constructor parameter)
- `ComponentContainer.sizeLimit` → `ComponentContainer.powerLimit`
- `ComponentContainer.totalSize` → `ComponentContainer.totalPower`
- `ComponentContainer.remainingCapacity` → `ComponentContainer.remainingPower`

### Files to Update
- `src/lib/game/combat.js` — `ShipComponent`, `ComponentContainer`, `Ship`, `PlayerShip`, `EnemyShip`, `CombatEngine`
- `src/lib/game/combat.test.js` — all tests referencing size/sizeLimit/totalSize/remainingCapacity
- `src/lib/game/gameState.js` — PlayerShip creation
- `src/lib/game/boardObjects.js` — if any size references exist for ship components
- `src/lib/components/CombatScreen.svelte` — if any size references in UI

### Constraints
- This is a pure rename refactor — no behavioral changes
- All existing tests must pass after rename with updated property names

## User Story
### US-001: Rename size/sizeLimit to Power/powerLimit in code
**Description:** As a developer, I want the component sizing system renamed from "size" to "power" so the UI and code use consistent "Power Requirement" terminology.

**Acceptance Criteria:**
- [ ] `ShipComponent.size` renamed to `ShipComponent.powerCost` (constructor param name updated)
- [ ] `ComponentContainer.sizeLimit` renamed to `ComponentContainer.powerLimit`
- [ ] `ComponentContainer.totalSize` renamed to `ComponentContainer.totalPower`
- [ ] `ComponentContainer.remainingCapacity` renamed to `ComponentContainer.remainingPower`
- [ ] All references in `PlayerShip`, `EnemyShip`, `Ship`, and `CombatEngine` updated
- [ ] All existing tests updated to use new names
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-001"

---

# User Story 2

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### Game State Changes (`src/lib/game/gameState.js`)
- New `gamePhase` value: `'shipyard'` — add to the existing phase routing system alongside `'galaxy'`, `'rolling'`, `'combat'`, etc.
- New writable store: `componentMarket` — array of component instances available for installation
- New writable store: `shipConfirmed` — boolean, default `false`, tracks whether player has confirmed their build

### Component Market Generation
- `generateComponentMarket(rng)` creates 5-6 components using the seeded RNG from galaxy init
- Guaranteed minimum: 1 `WeaponComponent`, 1 `EngineComponent`, 1 `BridgeComponent`
- Remaining 2-3 slots filled randomly from any type
- Each component randomly assigned powerCost 1 or 2, with stats matching existing constructors:
  - Weapon power 1: HP 1, damage 1, accuracy 4 | Weapon power 2: HP 2, damage 1, accuracy 3
  - Engine power 1: HP 1, speedBonus 0 | Engine power 2: HP 2, speedBonus 1
  - Bridge power 1: HP 1, evasionBonus 0 | Bridge power 2: HP 2, evasionBonus 1
- Market generated once during `initGalaxy()`, persists for the entire session (never refreshed)
- The `rng` used should come from the galaxy seed for determinism

### Navigation Functions
- `enterShipyard()` — sets `gamePhase` to `'shipyard'`
- `confirmShipBuild()` — sets `shipConfirmed` to `true`, sets `gamePhase` back to `'galaxy'`

### Component Naming
- Names stay generic: "Weapons", "Engines", "Bridge" — differentiated by displayed power/stats, not flavor names

## User Story
### US-002: Add shipyard game phase and store
**Description:** As a developer, I need a `'shipyard'` game phase and a store for the component market so the shipyard screen can be routed and its state managed.

**Acceptance Criteria:**
- [ ] New `gamePhase` value: `'shipyard'`
- [ ] New store `componentMarket` (writable) holding the array of available-for-purchase components
- [ ] New store `shipConfirmed` (writable, boolean, default `false`) tracking whether the player has confirmed their build
- [ ] New function `generateComponentMarket(rng)` that creates 5-6 random components with at least 1 weapon, 1 engine, 1 bridge; each component randomly size 1 or size 2
- [ ] `componentMarket` is generated once during `initGalaxy()` and persists for the session
- [ ] New function `enterShipyard()` that sets `gamePhase` to `'shipyard'`
- [ ] New function `confirmShipBuild()` that sets `shipConfirmed` to `true` and returns to galaxy phase
- [ ] Tests for `generateComponentMarket` verifying: correct count, type coverage, deterministic with seed
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-002"

---

# User Story 3

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### Game State Functions (`src/lib/game/gameState.js`)
- `installComponent(componentIndex)`:
  - Reads component from `componentMarket` store by index
  - Calls `playerShip.addComponent(component)` — this already enforces `powerLimit` budget and bridge uniqueness (max 1 bridge)
  - On success: removes component from `componentMarket` array, updates both stores
  - Returns `false` if `addComponent()` rejects (insufficient power or bridge conflict)
- `removeComponent(componentName)`:
  - Calls `playerShip.removeComponent(name)` — explicit removal already exists in `ComponentContainer`
  - Resets component HP to `maxHp` before returning to market (components are repaired when uninstalled)
  - Adds component back to `componentMarket` array, updates both stores

### Existing Infrastructure to Reuse
- `ComponentContainer.addComponent()` already enforces power budget and bridge uniqueness — no new validation logic needed
- `ComponentContainer.removeComponent()` already handles explicit removal — just wire to market
- The component market array uses the same `WeaponComponent`/`EngineComponent`/`BridgeComponent` instances

### Store Reactivity
- Both `componentMarket` and `playerShipStore` must be updated reactively so the UI reflects changes immediately

## User Story
### US-003: Add install/remove component functions
**Description:** As a developer, I need game state functions to move components between the market and the player's ship.

**Acceptance Criteria:**
- [ ] New function `installComponent(componentIndex)` — removes component from `componentMarket` array by index, calls `playerShip.addComponent()`. Returns `false` if insufficient power or bridge uniqueness violated.
- [ ] New function `removeComponent(componentName)` — calls `playerShip.removeComponent()`, adds component back to `componentMarket` array
- [ ] Both functions update their respective stores reactively
- [ ] Tests for install (success, insufficient power, bridge conflict) and remove (returns to market)
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-003"

---

# User Story 4

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### New Component (`src/lib/components/Shipyard.svelte`)
- Svelte 5 component using runes syntax (`$props()`, `$state()`, `$derived()`)
- Subscribe to `playerShipStore` and `componentMarket` stores using `$derived()`

### Power Bar Display
- Shows `totalPower / powerLimit` (e.g., "Power: 4 / 7")
- Color coding is inverted to indicate build readiness:
  - Red: low usage (ship underpowered, not ready)
  - Yellow: moderate usage (getting there)
  - Green: nearly full (ship is loaded and ready)

### Installed Components List
- Each component row displays: name, type label, power requirement, HP, and bonus stat
- Bonus descriptions must be human-readable:
  - Weapon power 2: "+1 Accuracy (hits 3+)"
  - Engine power 2: "+1 Speed"
  - Bridge power 2: "+1 Evasion"
  - Any power 1 component: "No bonus"
- Each row has a "Remove" button that calls `removeComponent(name)`

### Confirm Build Button
- Calls `confirmShipBuild()` to return to galaxy
- Disabled unless ship has at least 1 weapon, 1 engine, and 1 bridge installed
- Check using `playerShip.hasComponentType('weapon')`, `hasComponentType('engine')`, `hasComponentType('bridge')` — only counting active (non-destroyed) components

### Styling
- Use consistent styling with existing screens (GalaxySelection, CombatScreen)
- Mobile-friendly: buttons must meet 44px minimum touch target
- Touch: `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`

## User Story
### US-004: Shipyard Svelte component — layout and ship display
**Description:** As a player, I want to see my current ship loadout with power budget so I know what I'm working with.

**Acceptance Criteria:**
- [ ] New component `src/lib/components/Shipyard.svelte`
- [ ] Header shows: "Shipyard" title, power bar showing `totalPower / powerLimit` (e.g., "Power: 4 / 7")
- [ ] "Installed Components" section lists each component on the ship with: name, type icon/label, power requirement, HP, and bonus stat
- [ ] Bonus display examples: Weapon size 2 → "+1 Accuracy (hits 3+)", Engine size 2 → "+1 Speed", Bridge size 2 → "+1 Evasion". Size 1 components show "No bonus"
- [ ] Each installed component has a "Remove" button
- [ ] Clicking "Remove" calls `removeComponent()` and updates the display
- [ ] "Confirm Build" button at the bottom — calls `confirmShipBuild()`
- [ ] "Confirm Build" is disabled unless the ship has at least 1 weapon, 1 engine, and 1 bridge installed
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "feat: US-004"

---

# User Story 5

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### Component Market UI (within `src/lib/components/Shipyard.svelte`)
- "Available Components" section below the installed components section
- Subscribe to `componentMarket` store using `$derived()`

### Market Component Rows
- Same display format as installed components: name, type, power requirement, HP, bonus stat
- Each row has an "Install" button that calls `installComponent(index)`

### Install Button Disable Logic
- Disabled if `component.powerCost > playerShip.remainingPower`
- Disabled if component type is `'bridge'` and `playerShip.hasComponentType('bridge')` is true (bridge uniqueness)
- Use `$derived()` to reactively compute disabled state as ship changes

### Empty State
- When `componentMarket` array is empty, show "No components available" message

### Component Naming
- Names stay generic: "Weapons", "Engines", "Bridge" — differentiated by displayed power/stats

## User Story
### US-005: Shipyard Svelte component — component market
**Description:** As a player, I want to see available components and install them on my ship.

**Acceptance Criteria:**
- [ ] "Available Components" section lists each component in `componentMarket` with: name, type, power requirement, HP, bonus stat (same format as installed list)
- [ ] Each market component has an "Install" button
- [ ] "Install" button is disabled if the component's power requirement exceeds `remainingPower`
- [ ] "Install" button is disabled if it's a bridge and a bridge is already installed
- [ ] Clicking "Install" calls `installComponent()` and updates both lists
- [ ] When market is empty, show "No components available" message
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "feat: US-005"

---

# User Story 6

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### Galaxy Screen Changes (`src/lib/components/GalaxySelection.svelte`)
- Add "Shipyard" button that calls `enterShipyard()` — always visible and clickable
- Subscribe to `shipConfirmed` store using `$derived()`

### Gating Logic
- When `shipConfirmed === false`:
  - All board-selection cells get reduced opacity (e.g., `opacity: 0.4`) and `pointer-events: none`
  - Display a message like "Confirm your ship build first" near the grid
  - Only the "Shipyard" button is interactive
- When `shipConfirmed === true`:
  - Board cells function normally (unlocked boards are clickable per existing logic)
  - "Shipyard" button remains available for refitting between missions

### Session Flag
- `shipConfirmed` persists across board plays within the session
- Resets to `false` only on new galaxy/game init

## User Story
### US-006: Galaxy screen — shipyard button and gating
**Description:** As a player, I want a "Shipyard" button on the galaxy screen, and at game start it should be the only available action until I confirm my ship.

**Acceptance Criteria:**
- [ ] New "Shipyard" button on the galaxy screen that calls `enterShipyard()`
- [ ] When `shipConfirmed` is `false`: all board-selection cells are visually greyed out and non-clickable; only the "Shipyard" button is active
- [ ] When `shipConfirmed` is `true`: board cells function normally (unlocked boards are clickable); "Shipyard" button remains available for refitting
- [ ] Visual indication on greyed-out cells (e.g., reduced opacity, "Confirm ship first" tooltip or label)
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "feat: US-006"

---

# User Story 7

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### App.svelte Routing
- `App.svelte` uses `gamePhase` store to route between screens
- Add `'shipyard'` case that renders the `Shipyard` component
- Existing pattern: `{#if $gamePhase === 'galaxy'}` ... `{:else if $gamePhase === 'combat'}` ...
- Add: `{:else if $gamePhase === 'shipyard'}` → `<Shipyard />`
- Import `Shipyard` component at top of file

### Full Navigation Flow
1. New game → `initGalaxy()` → `gamePhase = 'galaxy'` → galaxy screen shows only "Shipyard" button active
2. Click "Shipyard" → `enterShipyard()` → `gamePhase = 'shipyard'` → Shipyard screen
3. Install/remove components → click "Confirm Build" → `confirmShipBuild()` → `shipConfirmed = true`, `gamePhase = 'galaxy'`
4. Galaxy screen now shows board cells as clickable → select board → play

### Edge Cases
- Returning to shipyard after confirming: should work (refitting), `shipConfirmed` stays `true`
- Returning to galaxy from shipyard without confirming: need a "Back" button or `enterShipyard` should allow returning

## User Story
### US-007: Wire shipyard into App.svelte routing
**Description:** As a developer, I need the shipyard phase to render the Shipyard component in the app's screen router.

**Acceptance Criteria:**
- [ ] `App.svelte` renders `Shipyard` component when `gamePhase === 'shipyard'`
- [ ] Navigating to shipyard and back to galaxy works correctly
- [ ] Starting a new game → galaxy screen shows only shipyard button active
- [ ] Full flow works: new game → shipyard → install components → confirm → galaxy → select board → play
- [ ] All tests pass
- [ ] Verify in browser using dev-browser skill
- [ ] Commit with message starting with "feat: US-007"

---

# User Story 8

## Introduction
Add a Shipyard screen for building and customizing the player's ship with a power budget system and random component market, accessible from the galaxy screen.

## Goals
- Rename `sizeLimit`/`size` to "Power" / "Power Requirement" throughout the codebase
- Provide a shipyard screen for viewing and modifying ship loadouts
- Generate a random component market (5-6 components, at least 1 of each type)
- Allow free install/remove of components within the power budget
- Gate galaxy progression behind ship build confirmation

## Technical Details

### PlayerShip Constructor Changes (`src/lib/game/combat.js`)
- Current default: `WeaponComponent('Weapons', 4, 2)`, `EngineComponent('Engines', 4, 2)`, `BridgeComponent('Bridge', 3, 2)` — total power 6
- New default: empty `components` array, `powerLimit` remains 7
- Player must build their ship through the shipyard before playing

### Component Market as Starter Kit
- The `generateComponentMarket(rng)` from US-002 serves as the "starter kit"
- Market includes at least 1 of each type, so the player always has the components needed to build a viable ship
- Previous default components are no longer auto-installed

### Test Updates
- Many existing combat tests assume PlayerShip has default components
- Tests must be updated to either:
  - Explicitly add components to PlayerShip before testing, or
  - Create PlayerShip with components passed in constructor options: `new PlayerShip({ powerLimit: 7, components: [...] })`
- This is the most impactful change — audit `combat.test.js`, `gameState.test.js`, and any other test files referencing PlayerShip

### Backward Compatibility
- `Ship` base class still supports legacy array form `Ship('name', [comps])` — no change needed there
- `EnemyShip` defaults remain unchanged (enemies still spawn with their default loadout)

## User Story
### US-008: Update PlayerShip defaults for shipyard flow
**Description:** As a developer, I need the PlayerShip to start empty (no default components) so the player builds their ship in the shipyard.

**Acceptance Criteria:**
- [ ] `PlayerShip` constructor creates ship with no default components (empty `components` array)
- [ ] `PlayerShip.powerLimit` remains 7
- [ ] Update any tests that relied on default components being present
- [ ] Galaxy init creates the component market which includes the "starter" components the player can choose from
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-008"
