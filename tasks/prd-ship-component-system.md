# PRD: Ship Component System Refactor

## Introduction

Refactor the ship and combat system to use a composition-based architecture with a `ComponentContainer` mixin, a `size_limit` budget system, and typed components (`WeaponComponent`, `EngineComponent`, `BridgeComponent`) that track their own stats. Ships (both player and enemy) are built by fitting components within a size budget, where each component has a size/weight cost. Component health persists between combat engagements and disabled components (0 HP) lose their functionality.

**Component persistence:** When a ship is destroyed (bridge destroyed or all components at 0 HP), all components must remain in the ship's component array. Destroyed ships retain their full component list — including any components that still have HP remaining. This is required to support a future "salvage components from destroyed ships" feature. Components are never automatically removed from a ship due to combat damage or ship destruction.

This replaces the current flat `ShipComponent` class and hardcoded component arrays in `PlayerShip`/`EnemyShip` with a flexible, extensible system.

## Goals

- Introduce a `size_limit` property on ships that caps total component weight
- Create typed component subclasses (`WeaponComponent`, `EngineComponent`, `BridgeComponent`) with type-specific stats
- Use a `ComponentContainer` mixin for shared component management logic (add, remove, validate, query)
- Make component stats extensible so future component types can add new stats without modifying the base
- Enforce that every ship must have exactly one `BridgeComponent`; weapons and engines are optional
- Support size 1 and size 2 variants of each component type with appropriately scaled stats
- Ensure destroyed ships retain all components (including non-destroyed ones) for future salvage
- Maintain all existing combat behaviors (damage, win/lose conditions, enemy flee, approach advantages)
- Preserve backward compatibility with `CombatEngine`, `CombatScreen.svelte`, `HUD.svelte`, and `gameState.js`

## User Stories

### US-001: Create typed component subclasses
**Description:** As a developer, I want `WeaponComponent`, `EngineComponent`, and `BridgeComponent` subclasses of `ShipComponent` so that each component type tracks its own type-specific stats.

**Acceptance Criteria:**
- [ ] `ShipComponent` base class retains: `name`, `maxHp`, `currentHp`, `size` (new), `destroyed` getter, `takeDamage(amount)`
- [ ] `ShipComponent` constructor accepts `(name, maxHp, size)` where `size` is the weight cost (integer >= 1)
- [ ] `WeaponComponent` extends `ShipComponent` with: `damage` (number, default 1), `accuracy` (number 1-6, the minimum d6 roll to hit, default 4)
- [ ] `EngineComponent` extends `ShipComponent` with: `speedBonus` (number, default 0 — reserved for future movement modifiers)
- [ ] `BridgeComponent` extends `ShipComponent` with: `evasionBonus` (number, default 0 — reserved for future evasion modifiers)
- [ ] Each subclass has a `type` getter returning `'weapon'`, `'engine'`, or `'bridge'` respectively
- [ ] Size 1 variants have lower HP/stats than size 2 variants (see FR-3 for defaults)
- [ ] All existing tests pass (may need updates to use new constructors)
- [ ] New unit tests cover each subclass's construction, type getter, and type-specific stats
- [ ] Commit with message starting with `US-001`

### US-002: Create ComponentContainer mixin
**Description:** As a developer, I want a `ComponentContainer` mixin that provides shared component management logic so that both `PlayerShip` and `EnemyShip` use identical add/remove/query behavior without class hierarchy duplication.

**Acceptance Criteria:**
- [ ] `ComponentContainer` is a mixin function: `ComponentContainer(Base)` returns a class extending `Base`
- [ ] The mixin adds a `sizeLimit` property (set via constructor option or setter)
- [ ] `addComponent(component)` adds a component if `totalSize + component.size <= sizeLimit`, throws error otherwise
- [ ] `addComponent` enforces exactly one `BridgeComponent` — throws if a second bridge is added
- [ ] `removeComponent(name)` removes a component by name and returns it (or undefined) — this is an explicit action, never triggered automatically by damage or ship destruction
- [ ] Components are never auto-removed when destroyed (0 HP) — they remain in the array with `destroyed === true`
- [ ] `totalSize` getter returns sum of all component sizes (including destroyed components — they still occupy space)
- [ ] `remainingCapacity` getter returns `sizeLimit - totalSize`
- [ ] `getComponentsByType(type)` returns array of components matching the given type string
- [ ] `hasComponentType(type)` returns boolean
- [ ] Existing `getComponent(name)`, `getActiveComponents()`, `isDestroyed` behavior preserved
- [ ] New unit tests for mixin: add/remove, capacity enforcement, bridge uniqueness, type queries
- [ ] Commit with message starting with `US-002`

### US-003: Refactor Ship base class to use ComponentContainer mixin
**Description:** As a developer, I want the `Ship` base class to use the `ComponentContainer` mixin so all ships get component management for free.

**Acceptance Criteria:**
- [ ] `Ship` is defined as `class Ship extends ComponentContainer(Object)` (or equivalent base)
- [ ] `Ship` constructor accepts `(name, { sizeLimit, components })` where `components` is optional array
- [ ] If `components` array provided, each is added via `addComponent()` (enforcing size constraints)
- [ ] `Ship` retains backward-compatible `components` getter that returns the internal components array (always contains all components, even destroyed ones)
- [ ] `isDestroyed` is a read-only status check — it never triggers component removal or cleanup
- [ ] A destroyed ship's `components` array is fully intact and iterable (supports future salvage)
- [ ] Existing `Ship` tests pass without modification (or with minimal constructor arg changes)
- [ ] Commit with message starting with `US-003`

### US-004: Refactor PlayerShip to use sized components
**Description:** As a developer, I want `PlayerShip` to use the new typed components with a configurable `sizeLimit` so the player ship's loadout is constrained by its size budget.

**Acceptance Criteria:**
- [ ] `PlayerShip` constructor accepts optional `{ sizeLimit, components }` config
- [ ] Default `sizeLimit` is `7` (fits size-2 weapon + size-2 engine + size-2 bridge + 1 spare)
- [ ] Default components: `WeaponComponent('Weapons', 4, 2)` (4 HP, size 2), `EngineComponent('Engines', 4, 2)` (4 HP, size 2), `BridgeComponent('Bridge', 3, 2)` (3 HP, size 2)
- [ ] `canAttack` getter returns true if any weapon component is active (not just one named 'Weapons')
- [ ] `isBridgeDestroyed` checks the bridge component (there is always exactly one)
- [ ] `isEngineDestroyed` returns true if ALL engine components are destroyed
- [ ] Custom components can be passed in to override defaults (for tests and future loadout customization)
- [ ] Backward compatibility: `getComponent('Weapons')`, `getComponent('Engines')`, `getComponent('Bridge')` still work
- [ ] All existing `PlayerShip` tests pass (update constructor calls as needed)
- [ ] New tests: sizeLimit enforcement, multiple weapons, custom loadouts
- [ ] Commit with message starting with `US-004`

### US-005: Refactor EnemyShip to use sized components
**Description:** As a developer, I want `EnemyShip` to use the new typed components with a variable `sizeLimit` so enemy ships scale with difficulty.

**Acceptance Criteria:**
- [ ] `EnemyShip` constructor accepts optional `{ sizeLimit, components }` config
- [ ] Default `sizeLimit` is `4` (fits size-1 weapon + size-1 engine + size-1 bridge + 1 spare)
- [ ] Default components: `WeaponComponent('Weapons', 1, 1)`, `EngineComponent('Engines', 1, 1)`, `BridgeComponent('Bridge', 1, 1)`
- [ ] `canAttack`, `canFlee`, `isBridgeDestroyed` getters work with typed components
- [ ] `canFlee` returns true if any engine component is active
- [ ] When an enemy ship is destroyed (bridge destroyed), all components remain in `components` array — non-destroyed components retain their current HP and stats
- [ ] `getSalvageableComponents()` returns components where `destroyed === false` (i.e., still have HP > 0) — available for future salvage feature
- [ ] All existing `EnemyShip` and `CombatEngine` tests pass
- [ ] New tests: variable sizeLimit, scaled enemy ships, component persistence after ship destruction, salvageable component query
- [ ] Commit with message starting with `US-005`

### US-006: Update CombatEngine for typed components
**Description:** As a developer, I want `CombatEngine` to use weapon stats (`damage`, `accuracy`) from `WeaponComponent` so combat respects component-level stats.

**Acceptance Criteria:**
- [ ] Player attacks use the first active weapon's `accuracy` as the hit threshold (instead of the engine-level `hitThreshold`)
- [ ] Player attacks deal the active weapon's `damage` value (instead of hardcoded `1`)
- [ ] Enemy attacks use their first active weapon's `accuracy` and `damage` similarly
- [ ] If a ship has multiple weapons, attacks use the first active one (future: let player choose)
- [ ] `hitThreshold` constructor param still works as a fallback/override for tests
- [ ] When combat ends with `playerWin`, the enemy ship object retains all components (destroyed and non-destroyed) — no cleanup occurs
- [ ] All existing combat tests pass (update expectations where stat values changed)
- [ ] New tests: weapons with different damage/accuracy values, multi-weapon ships, verify enemy components persist after combat win
- [ ] Commit with message starting with `US-006`

### US-007: Update gameState.js ship creation
**Description:** As a developer, I want `gameState.js` to create ships using the new constructors so the game uses the refactored component system.

**Acceptance Criteria:**
- [ ] `initGame()` creates `PlayerShip` with appropriate `sizeLimit` (default 7)
- [ ] `startCombat()` creates `EnemyShip` with `sizeLimit` that may vary (default 4, can be scaled by difficulty in future)
- [ ] `playerShipStore` continues to persist the `PlayerShip` across combats within a board
- [ ] `enemyObj.combatShip` persistence still works (enemy damage carries between encounters)
- [ ] After a `playerWin` combat result, `enemyObj.combatShip` is retained on the enemy board object with all components intact (not nulled or garbage collected) — this is the ship that a future salvage system will read from
- [ ] Engine damage movement penalty (`isEngineDestroyed`) still functions in movement code
- [ ] All existing `gameState` tests pass
- [ ] Commit with message starting with `US-007`

### US-008: Update CombatScreen.svelte for typed components
**Description:** As a developer, I want the combat UI to work with the refactored component system so the player sees correct component stats.

**Acceptance Criteria:**
- [ ] `playerComponents` and `enemyComponents` derived values still produce `{ name, currentHp, maxHp, destroyed }` objects
- [ ] HP bars display correctly for components with HP > 2 (the new default player HP values)
- [ ] Target buttons for enemy components work with new component names
- [ ] No UI regressions — combat screen looks and functions the same
- [ ] Verify in browser using dev server (`npm run dev`)
- [ ] Commit with message starting with `US-008`

## Functional Requirements

- FR-1: `ShipComponent` base class gains a `size` property (integer >= 1) representing weight/space cost
- FR-2: Three typed subclasses extend `ShipComponent`: `WeaponComponent` (adds `damage`, `accuracy`), `EngineComponent` (adds `speedBonus`), `BridgeComponent` (adds `evasionBonus`)
- FR-3: Default stat values by size variant:

  | Component | Size | HP | Type-Specific Stats |
  |-----------|------|----|---------------------|
  | WeaponComponent | 1 | 1 | damage: 1, accuracy: 4 |
  | WeaponComponent | 2 | 2 | damage: 1, accuracy: 3 |
  | EngineComponent | 1 | 1 | speedBonus: 0 |
  | EngineComponent | 2 | 2 | speedBonus: 1 |
  | BridgeComponent | 1 | 1 | evasionBonus: 0 |
  | BridgeComponent | 2 | 2 | evasionBonus: 1 |

- FR-4: `ComponentContainer` mixin provides: `addComponent()`, `removeComponent()`, `totalSize`, `remainingCapacity`, `getComponentsByType()`, `hasComponentType()`
- FR-5: `addComponent()` throws if total size would exceed `sizeLimit`
- FR-6: `addComponent()` throws if adding a second `BridgeComponent` (exactly one bridge required)
- FR-7: `Ship` class applies `ComponentContainer` mixin and passes `sizeLimit` through constructor
- FR-8: `PlayerShip` defaults: `sizeLimit = 7`, three size-2 components (Weapons 4HP, Engines 4HP, Bridge 3HP), total size = 6
- FR-9: `EnemyShip` defaults: `sizeLimit = 4`, three size-1 components (Weapons 1HP, Engines 1HP, Bridge 1HP), total size = 3
- FR-10: `CombatEngine` reads `damage` and `accuracy` from the attacker's active `WeaponComponent` when resolving attacks
- FR-11: All behavioral getters (`canAttack`, `canFlee`, `isBridgeDestroyed`, `isEngineDestroyed`) use type-based queries rather than name-based lookups
- FR-12: `getComponent(name)` still works for backward compatibility (name-based lookup)
- FR-13: Destroyed components (0 HP) remain in the ship's `components` array permanently — they are never auto-removed
- FR-14: Destroyed ships retain their full component list including any non-destroyed components (supports future salvage)
- FR-15: `getSalvageableComponents()` on `Ship` returns all components where `destroyed === false` (HP > 0)
- FR-16: `enemyObj.combatShip` reference is preserved after combat ends with `playerWin` — the defeated enemy's ship and all its components remain accessible on the board object

## Non-Goals

- No ship loadout customization UI (future feature)
- No component repair or upgrade mechanics
- No salvage UI or salvage mechanics (future feature — but the data persistence infrastructure is in scope)
- No new component types beyond weapon/engine/bridge (extensibility is supported but not exercised)
- No difficulty-based enemy sizeLimit scaling (just use default 4 for now; scaling is a future enhancement)
- No changes to approach advantage, turn order, or escape mechanics
- No changes to board object placement or enemy vision zones

## Technical Considerations

- **Mixin pattern:** Use the standard JavaScript mixin pattern `const ComponentContainer = (Base) => class extends Base { ... }` — this avoids multiple inheritance issues while sharing behavior
- **Backward compatibility:** The `components` property on `Ship` must remain an array accessible by index and iterable by `CombatScreen.svelte`'s `.map()` calls
- **Stat extensibility:** Typed component subclasses accept a rest/options parameter so future stats can be added without changing the constructor signature
- **Test updates:** Many existing tests construct `ShipComponent('Weapons', 2)` directly — these need the `size` parameter added. Consider keeping `size` optional with a default of `1` on the base class to minimize test churn
- **CombatScreen.svelte:** The UI maps `c.name`, `c.currentHp`, `c.maxHp`, `c.destroyed` — all of which remain on the base class, so no UI changes should be needed beyond verifying HP bar scaling
- **Component persistence:** The `components` array on a ship is append-only during combat — damage sets `currentHp` to 0 but never splices the array. `removeComponent()` exists for explicit loadout changes (future salvage/equip), not for combat damage. After combat, `enemyObj.combatShip` must not be set to `null` on `playerWin` — the defeated ship is the source of salvageable components

## Success Metrics

- All 148+ existing tests pass after refactor
- New tests cover: component subclasses, mixin behavior, size enforcement, typed queries
- `CombatEngine` respects per-weapon `damage` and `accuracy` stats
- Ships cannot exceed their `sizeLimit` — validated by tests
- Bridge uniqueness enforced — validated by tests
- Destroyed ships retain all components (including non-destroyed ones) — validated by tests
- `getSalvageableComponents()` correctly returns surviving components from defeated ships — validated by tests
- Combat UI displays correctly with new HP values

## Open Questions

- Should `PlayerShip` default `sizeLimit` scale with game progression or board size? (Deferred — use fixed 7 for now)
- Should enemy `sizeLimit` scale with difficulty level? (Deferred — use fixed 4 for now, add scaling later)
- When multiple weapons exist, should the player choose which weapon to attack with? (Deferred — use first active weapon for now)
- Should `evasionBonus` and `speedBonus` have mechanical effects now or remain reserved? (Reserved for now — just store the values)
- How should the future salvage system work? (Deferred — for now, just ensure `getSalvageableComponents()` returns non-destroyed components and that destroyed enemy ships persist on their board objects)
