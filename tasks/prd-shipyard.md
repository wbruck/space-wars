# PRD: Shipyard Screen

## Introduction

Add a Shipyard screen where the player can build and customize their ship by installing and removing components. The screen shows the ship's power budget (renamed from "sizeLimit"), a list of installed components, and a randomly generated market of available components. The shipyard is accessed from the galaxy screen and is the only option available at game start — all other galaxy buttons are greyed out until the player confirms their ship build.

## Goals

- Rename `sizeLimit`/`size` terminology to "Power" / "Power Requirement" throughout the codebase
- Provide a dedicated screen for viewing and modifying ship loadouts
- Display component stats clearly (power requirement, HP, bonus)
- Generate a random pool of 5-6 components (at least 1 of each type) at game start, fixed for the session
- Allow free installation/removal of components within the power budget
- Gate galaxy progression behind an explicit ship confirmation step

## User Stories

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

### US-003: Add install/remove component functions
**Description:** As a developer, I need game state functions to move components between the market and the player's ship.

**Acceptance Criteria:**
- [ ] New function `installComponent(componentIndex)` — removes component from `componentMarket` array by index, calls `playerShip.addComponent()`. Returns `false` if insufficient power or bridge uniqueness violated.
- [ ] New function `removeComponent(componentName)` — calls `playerShip.removeComponent()`, adds component back to `componentMarket` array
- [ ] Both functions update their respective stores reactively
- [ ] Tests for install (success, insufficient power, bridge conflict) and remove (returns to market)
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-003"

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

### US-008: Update PlayerShip defaults for shipyard flow
**Description:** As a developer, I need the PlayerShip to start empty (no default components) so the player builds their ship in the shipyard.

**Acceptance Criteria:**
- [ ] `PlayerShip` constructor creates ship with no default components (empty `components` array)
- [ ] `PlayerShip.powerLimit` remains 7
- [ ] Update any tests that relied on default components being present
- [ ] Galaxy init creates the component market which includes the "starter" components the player can choose from
- [ ] All tests pass
- [ ] Commit with message starting with "feat: US-008"

## Functional Requirements

- FR-1: Rename `size` → `powerCost` on `ShipComponent`, `sizeLimit` → `powerLimit` on `ComponentContainer`, `totalSize` → `totalPower`, `remainingCapacity` → `remainingPower` throughout codebase and tests
- FR-2: Generate a random component market of 5-6 components at galaxy init, guaranteed to include at least 1 `WeaponComponent`, 1 `EngineComponent`, 1 `BridgeComponent`
- FR-3: Each market component is randomly size 1 or size 2, with stats matching existing size-based constructors
- FR-4: Component market is fixed for the session (generated once, never refreshed)
- FR-5: Players can freely install/remove components between the market and their ship, constrained by `powerLimit` and bridge uniqueness
- FR-6: Shipyard screen displays both installed and available components with: name, type, power requirement, HP, and bonus stat
- FR-7: "Confirm Build" button sets `shipConfirmed = true` and returns to galaxy; disabled unless ship has at least 1 weapon, 1 engine, and 1 bridge
- FR-8: Galaxy screen shows a "Shipyard" button that navigates to the shipyard phase
- FR-9: When `shipConfirmed` is `false`, galaxy board cells are greyed out and non-clickable
- FR-10: When `shipConfirmed` is `true`, galaxy functions normally; shipyard remains accessible for refitting between missions
- FR-11: PlayerShip starts with no default components; player must build via shipyard

## Non-Goals

- No component purchasing with currency (components are freely swappable)
- No component upgrades or crafting
- No salvage mechanics from combat (planned for future)
- No finding components on world maps (planned for future)
- No component durability or wear outside of combat damage
- No animated transitions between screens (keep it simple)

## Design Considerations

- Reuse the existing component stat system (`WeaponComponent`, `EngineComponent`, `BridgeComponent`)
- Power bar uses inverted color coding: Red (low usage) → Yellow (mid) → Green (nearly full). This signals "build readiness" rather than "running out of space"
- Component bonus descriptions should be human-readable (e.g., "+1 Accuracy (hits 3+)" not "accuracy: 3")
- Use consistent styling with existing screens (GalaxySelection, CombatScreen)
- Mobile-friendly: buttons should meet 44px minimum touch target

## Technical Considerations

- `ComponentContainer.addComponent()` already enforces power budget and bridge uniqueness — reuse this logic
- `removeComponent()` already exists for explicit removal — no new logic needed, just wire to market
- The component market array should use the same `WeaponComponent`/`EngineComponent`/`BridgeComponent` instances
- When removing a component from the ship, its HP should be reset to `maxHp` before returning to market (components are repaired when uninstalled)
- The `rng` used for market generation should come from the galaxy seed for determinism
- `shipConfirmed` should persist across board plays (it's a session-level flag)
- Component names stay generic ("Weapons", "Engines", "Bridge") — differentiated by displayed power/stats, not flavor names

## Success Metrics

- Player can build a ship in under 30 seconds
- Ship build persists correctly across multiple board plays
- All existing tests continue to pass after rename
- No regression in combat behavior after power rename

## Resolved Questions

- **Minimum ship requirement:** Must have at least 1 of each type (weapon, engine, bridge) to confirm build
- **Component naming:** Generic names ("Weapons", "Engines", "Bridge") with size/stats shown — no flavor names
- **Power bar colors:** Inverted color coding — Red (low usage, ship underpowered) → Yellow (moderate usage) → Green (nearly full, ship ready). Colors indicate build readiness, not a warning
