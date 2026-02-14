<script>
  let { onStart } = $props();

  let selectedSize = $state(0);
  let difficulty = $state(5);

  const sizes = [
    { cols: 5, rows: 4, label: 'Small', hexes: 20 },
    { cols: 7, rows: 6, label: 'Medium', hexes: 42 },
    { cols: 9, rows: 8, label: 'Large', hexes: 72 },
  ];

  let difficultyLabel = $derived(
    difficulty <= 2 ? 'Easy' : difficulty <= 4 ? 'Medium' : difficulty <= 6 ? 'Normal' : difficulty <= 8 ? 'Hard' : 'Expert'
  );

  function handleStart() {
    const s = sizes[selectedSize];
    onStart(s.cols, s.rows, difficulty);
  }
</script>

<div class="setup">
  <p class="subtitle">Hex Vertex Strategy Board Game</p>

  <div class="size-options">
    {#each sizes as size, i}
      <button
        class="size-btn"
        class:active={selectedSize === i}
        onclick={() => selectedSize = i}
      >
        {size.label} ({size.hexes} hexes)
      </button>
    {/each}
  </div>

  <div class="difficulty-section">
    <label class="difficulty-label" for="difficulty-slider">
      Difficulty: {difficulty} <span class="difficulty-tag">{difficultyLabel}</span>
    </label>
    <div class="slider-row">
      <span class="slider-end">1 Easy</span>
      <input
        id="difficulty-slider"
        type="range"
        min="1"
        max="10"
        step="1"
        bind:value={difficulty}
      />
      <span class="slider-end">10 Hard</span>
    </div>
  </div>

  <button class="start-btn" onclick={handleStart}>Start Game</button>
</div>

<style>
  .setup {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
    margin: 0;
  }

  .size-options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .size-btn {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    min-height: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .size-btn.active {
    border-color: #4caf50;
    color: #4caf50;
  }

  .difficulty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    max-width: 320px;
  }

  .difficulty-label {
    font-size: 1rem;
    font-weight: 600;
  }

  .difficulty-tag {
    font-weight: 400;
    color: #888;
    font-size: 0.9rem;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .slider-end {
    font-size: 0.75rem;
    color: #888;
    white-space: nowrap;
  }

  input[type="range"] {
    flex: 1;
    min-height: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    accent-color: #4caf50;
  }

  .start-btn {
    padding: 0.75rem 2.5rem;
    font-size: 1.2rem;
    background: #4caf50;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .start-btn:hover {
    background: #388e3c;
  }

  .start-btn:active {
    background: #2e7d32;
  }

  @media (prefers-color-scheme: dark) {
    .subtitle { color: #aaa; }
  }
</style>
