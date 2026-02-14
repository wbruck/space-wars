<script>
  import { diceValue, gamePhase, movementPool, rollDice } from '../game/gameState.js';

  let rolling = $state(false);
  let displayValue = $state(null);

  // Subscribe to stores
  let phase = $derived($gamePhase);
  let pool = $derived($movementPool);
  let storeValue = $derived($diceValue);

  // Sync display value from store when not animating
  $effect(() => {
    if (!rolling) {
      displayValue = storeValue;
    }
  });

  let canRoll = $derived(phase === 'rolling' && !rolling);

  // Dot positions for die faces 1-6 (on a 3x3 grid: 0=top-left, 1=top-mid, 2=top-right, etc.)
  const DOT_LAYOUTS = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };

  const DOT_COORDS = {
    'top-left':     { cx: '25%', cy: '25%' },
    'top-right':    { cx: '75%', cy: '25%' },
    'mid-left':     { cx: '25%', cy: '50%' },
    'center':       { cx: '50%', cy: '50%' },
    'mid-right':    { cx: '75%', cy: '50%' },
    'bottom-left':  { cx: '25%', cy: '75%' },
    'bottom-right': { cx: '75%', cy: '75%' },
  };

  function handleRoll() {
    if (!canRoll) return;

    rolling = true;

    // Animate: flash through random values
    let frames = 0;
    const totalFrames = 10;
    const interval = setInterval(() => {
      displayValue = Math.floor(Math.random() * 6) + 1;
      frames++;
      if (frames >= totalFrames) {
        clearInterval(interval);
        // Commit the real roll
        const result = rollDice();
        displayValue = result;
        rolling = false;
      }
    }, 60);
  }

  let dots = $derived(displayValue ? DOT_LAYOUTS[displayValue] || [] : []);
</script>

<button
  class="dice-container"
  class:disabled={!canRoll}
  class:rolling
  onclick={handleRoll}
  disabled={!canRoll && !rolling}
  aria-label={canRoll ? 'Roll dice' : `Dice showing ${displayValue ?? 'nothing'}`}
>
  <div class="die-face">
    {#if displayValue}
      <svg viewBox="0 0 100 100" class="die-svg">
        {#each dots as pos}
          <circle
            cx={DOT_COORDS[pos].cx}
            cy={DOT_COORDS[pos].cy}
            r="10"
            class="die-dot"
          />
        {/each}
      </svg>
    {:else}
      <span class="die-prompt">Tap to roll</span>
    {/if}
  </div>
</button>

<style>
  .dice-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 90px;
    margin: 0.75rem auto;
    padding: 0;
    border-radius: 14px;
    border: 3px solid #555;
    background: #fafafa;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.25s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .dice-container:hover:not(.disabled) {
    border-color: #2196f3;
    transform: scale(1.05);
  }

  .dice-container:active:not(.disabled) {
    transform: scale(0.95);
  }

  .dice-container.disabled {
    opacity: 0.4;
    cursor: default;
  }

  .dice-container.rolling {
    animation: shake 0.1s linear infinite;
  }

  @keyframes shake {
    0% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
    100% { transform: rotate(-3deg); }
  }

  .die-face {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .die-svg {
    width: 100%;
    height: 100%;
  }

  .die-dot {
    fill: #333;
  }

  .die-prompt {
    font-size: 0.7rem;
    color: #888;
    text-align: center;
    line-height: 1.2;
  }

  @media (prefers-color-scheme: dark) {
    .dice-container {
      background: #333;
      border-color: #777;
    }
    .dice-container:hover:not(.disabled) {
      border-color: #64b5f6;
    }
    .die-dot {
      fill: #eee;
    }
    .die-prompt {
      color: #aaa;
    }
  }
</style>
