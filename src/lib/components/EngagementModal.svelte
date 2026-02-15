<script>
  import { pendingEngagement, confirmEngagement, declineEngagement } from '../game/gameState.js';

  let pending = $derived($pendingEngagement);

  let approachLabel = $derived.by(() => {
    if (!pending?.approachAdvantage) return '';
    switch (pending.approachAdvantage.approachType) {
      case 'rear_ambush': return 'Rear Ambush Approach – You attack first with bonus';
      case 'simple': return 'Simple Approach – You attack first';
      default: return '';
    }
  });
</script>

{#if pending}
  <div class="engagement-backdrop">
    <div class="engagement-modal">
      <h2 class="modal-title">Enemy Detected</h2>
      <p class="modal-desc">You've entered an enemy's proximity zone.</p>
      <div class="approach-info">{approachLabel}</div>
      <div class="modal-buttons">
        <button class="engage-btn" onclick={confirmEngagement}>
          Engage Enemy
        </button>
        <button class="avoid-btn" onclick={() => declineEngagement()}>
          Avoid
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .engagement-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    z-index: 100;
  }

  .engagement-modal {
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 320px;
    width: 90%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .modal-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .modal-desc {
    font-size: 0.9rem;
    color: #666;
    margin: 0 0 0.75rem 0;
  }

  .approach-info {
    font-size: 0.8rem;
    font-weight: 600;
    color: #1565c0;
    background: #e3f2fd;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: inline-block;
  }

  .modal-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .engage-btn {
    padding: 0.7rem 1.2rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #1565c0;
    border-radius: 8px;
    background: #1565c0;
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .engage-btn:hover {
    background: #0d47a1;
    transform: scale(1.03);
  }

  .engage-btn:active {
    transform: scale(0.97);
  }

  .avoid-btn {
    padding: 0.7rem 1.2rem;
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #9e9e9e;
    border-radius: 8px;
    background: #f5f5f5;
    color: #555;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }

  .avoid-btn:hover {
    background: #e0e0e0;
    transform: scale(1.03);
  }

  .avoid-btn:active {
    transform: scale(0.97);
  }

  @media (prefers-color-scheme: dark) {
    .engagement-modal {
      background: #1a1a2e;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }
    .modal-title { color: #eee; }
    .modal-desc { color: #aaa; }
    .approach-info { background: #0d47a1; color: #90caf9; }
    .engage-btn { background: #1565c0; border-color: #1565c0; }
    .engage-btn:hover { background: #1976d2; }
    .avoid-btn { background: #333; border-color: #555; color: #bbb; }
    .avoid-btn:hover { background: #444; }
  }
</style>
