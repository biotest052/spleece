<script>
  import { Trash2, AudioWaveform, Database } from '@lucide/svelte';

  let { show = false, x = 0, y = 0, cacheSize = 0, userDataSize = 0, onClose, onClearCache, onClearUserData, onClearBoth } = $props();

  let menuEl = $state(null);

  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  $effect(() => {
    if (show) {
      const close = (e) => {
        if (menuEl && !menuEl.contains(e.target)) onClose?.();
      };
      const onKey = (e) => {
        if (e.key === 'Escape') onClose?.();
      };
      const t = setTimeout(() => {
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
      }, 0);
      return () => {
        clearTimeout(t);
        document.removeEventListener('click', close);
        document.removeEventListener('keydown', onKey);
      };
    }
  });
</script>

{#if show}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_interactive_supports_focus a11y_click_events_have_key_events -->
  <div
    class="cd-menu"
    style="left: {x}px; top: {y}px;"
    bind:this={menuEl}
    role="menu"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <button class="cd-row cd-row--full" onclick={onClearUserData}>
      <span class="cd-row-left"><Trash2 size={16} /> Clear User Data</span>
      <span class="cd-row-right">{fmt(userDataSize)}</span>
    </button>
    <div class="cd-sep"></div>
    <div class="cd-cols">
      <button class="cd-row cd-col" onclick={onClearCache}>
        <span><AudioWaveform size={16} /> Audio</span>
        <span class="cd-row-num">{fmt(cacheSize)}</span>
      </button>
      <button class="cd-row cd-col" onclick={onClearUserData}>
        <span><Database size={16} /> Favourites</span>
        <span class="cd-row-num">{fmt(userDataSize)}</span>
      </button>
    </div>
    <div class="cd-sep"></div>
    <button class="cd-row cd-row--full cd-row--danger" onclick={onClearBoth}>
      <span class="cd-row-left">Clear Both</span>
      <span class="cd-row-right">{fmt(cacheSize + userDataSize)}</span>
    </button>
  </div>
{/if}

<style>
  .cd-menu {
    position: fixed; z-index: 1000; min-width: 260px;
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 10px; padding: 4px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .cd-row {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 10px 12px; border: none; background: transparent;
    color: var(--text); font-size: 13px; cursor: pointer; font-family: inherit;
    gap: 8px; border-radius: 6px;
  }
  .cd-row:hover { background: var(--tag-bg); }
  .cd-row-left { display: flex; align-items: center; gap: 8px; }
  .cd-row-right { color: var(--text4); font-size: 12px; font-variant-numeric: tabular-nums; }
  .cd-cols { display: flex; gap: 4px; padding: 2px; }
  .cd-col { flex: 1; flex-direction: column; align-items: flex-start; gap: 3px; padding: 10px; }
  .cd-col span { display: flex; align-items: center; gap: 6px; }
  .cd-row-num { color: var(--text4); font-size: 11px; font-variant-numeric: tabular-nums; }
  .cd-sep { height: 1px; background: var(--border); margin: 2px 0; }
  .cd-row--danger { color: var(--err-text); }
  .cd-row--danger:hover { background: var(--err-bg); }
</style>
