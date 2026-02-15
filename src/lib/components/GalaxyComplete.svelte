<script>
  import { galaxyState, gamePhase } from '../game/gameState.js';
  import { clearGalaxy, generateGalaxy } from '../game/galaxy.js';

  let { galaxy } = $props();

  let counts = $derived.by(() => {
    let won = 0, lost = 0, locked = 0;
    if (!galaxy) return { won, lost, locked };
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const status = galaxy[row][col].status;
        if (status === 'won') won++;
        else if (status === 'lost') lost++;
        else locked++;
      }
    }
    return { won, lost, locked };
  });

  function handleNewGalaxy() {
    clearGalaxy();
    const newGalaxy = generateGalaxy();
    galaxyState.set(newGalaxy);
    gamePhase.set('galaxy');
  }
</script>

<div class="galaxy-complete">
  <h2 class="title">Galaxy Complete!</h2>

  <div class="stats">
    <div class="stat won">
      <span class="stat-value">{counts.won}</span>
      <span class="stat-label">Won</span>
    </div>
    <div class="stat lost">
      <span class="stat-value">{counts.lost}</span>
      <span class="stat-label">Lost</span>
    </div>
    <div class="stat locked">
      <span class="stat-value">{counts.locked}</span>
      <span class="stat-label">Unreachable</span>
    </div>
  </div>

  <button class="new-galaxy-btn" onclick={handleNewGalaxy}>New Galaxy</button>
</div>

<style>
  .galaxy-complete {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .title {
    font-size: 1.8rem;
    color: #ffd54f;
    margin: 0;
  }

  .stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #999;
  }

  .stat.won .stat-value { color: #4caf50; }
  .stat.lost .stat-value { color: #e53935; }
  .stat.locked .stat-value { color: #888; }

  .new-galaxy-btn {
    padding: 0.75rem 2.5rem;
    font-size: 1.2rem;
    background: #ffd54f;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .new-galaxy-btn:hover {
    background: #ffca28;
  }

  .new-galaxy-btn:active {
    background: #ffb300;
  }

  @media (prefers-color-scheme: light) {
    .title { color: #f57f17; }
    .stat.won .stat-value { color: #2e7d32; }
    .stat.lost .stat-value { color: #c62828; }
    .stat.locked .stat-value { color: #999; }
    .new-galaxy-btn {
      background: #f57f17;
      color: #fff;
    }
    .new-galaxy-btn:hover { background: #ef6c00; }
    .new-galaxy-btn:active { background: #e65100; }
  }
</style>
