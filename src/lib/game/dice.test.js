import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  diceValue,
  gamePhase,
  movementPool,
  initGame,
  resetGame,
  rollDice,
} from './gameState.js';

describe('rollDice', () => {
  beforeEach(() => {
    resetGame();
  });

  it('returns null if not in rolling phase', () => {
    // gamePhase starts as 'setup' after resetGame
    expect(get(gamePhase)).toBe('setup');
    const result = rollDice();
    expect(result).toBeNull();
    expect(get(diceValue)).toBeNull();
  });

  it('returns a value between 1 and 6 when in rolling phase', () => {
    initGame(5, 4, 42);
    expect(get(gamePhase)).toBe('rolling');

    const result = rollDice();
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(6);
  });

  it('stores the dice value in the diceValue store', () => {
    initGame(5, 4, 42);
    const result = rollDice();
    expect(get(diceValue)).toBe(result);
  });

  it('transitions game phase to selectingDirection', () => {
    initGame(5, 4, 42);
    rollDice();
    expect(get(gamePhase)).toBe('selectingDirection');
  });

  it('does not change phase if already in selectingDirection', () => {
    initGame(5, 4, 42);
    rollDice(); // moves to selectingDirection
    const firstDice = get(diceValue);

    const result = rollDice(); // should be no-op
    expect(result).toBeNull();
    expect(get(diceValue)).toBe(firstDice); // unchanged
    expect(get(gamePhase)).toBe('selectingDirection');
  });

  it('caps dice value to remaining movement pool', () => {
    initGame(5, 4, 42);

    // Manually set movement pool to a low value to test capping
    movementPool.set(2);
    const result = rollDice();

    // Result must be <= 2 (the remaining pool)
    expect(result).toBeLessThanOrEqual(2);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('caps dice value to 1 when pool is 1', () => {
    initGame(5, 4, 42);
    movementPool.set(1);

    const result = rollDice();
    expect(result).toBe(1);
  });

  it('does not deduct from movement pool on roll (deduction happens after move)', () => {
    initGame(5, 4, 42);
    const poolBefore = get(movementPool);

    rollDice();

    // Movement pool should not change on roll
    expect(get(movementPool)).toBe(poolBefore);
  });

  it('produces results in valid range over many rolls', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      initGame(5, 4, i);
      const result = rollDice();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      results.add(result);
    }
    // With 100 rolls, we should see at least a few different values
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});
