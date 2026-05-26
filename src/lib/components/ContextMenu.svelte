<script>
  import { Link, Heart } from '@lucide/svelte';

  let { sample, children, favorited = false, onToggleFavorite } = $props();

  let show = $state(false);
  let x = $state(0);
  let y = $state(0);
  let menuEl = $state(null);

  function onContextMenu(e) {
    e.preventDefault();
    x = e.clientX;
    y = e.clientY;
    show = true;
  }

  function slugify(name) {
    return name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  async function copyLink() {
    const url = `https://splice.com/sounds/sample/${sample.uuid.replace(/-/g, '')}/${slugify(sample.name)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '0';
      ta.style.top = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    show = false;
  }

  $effect(() => {
    if (show) {
      const close = (e) => {
        if (menuEl && !menuEl.contains(e.target)) {
          show = false;
        }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') show = false;
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div oncontextmenu={onContextMenu} style="display: contents;">
  {@render children()}
</div>

{#if show}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="context-menu"
    style="left: {x}px; top: {y}px;"
    bind:this={menuEl}
    role="menu"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <button class="context-menu-item" onclick={copyLink} role="menuitem">
      <Link size={14} />
      Copy Link
    </button>
    <button class="context-menu-item" onclick={() => { onToggleFavorite?.(sample); show = false; }} role="menuitem">
      <Heart size={14} fill={favorited ? 'var(--accent)' : 'none'} color={favorited ? 'var(--accent)' : undefined} />
      {favorited ? 'Unfavourite' : 'Favourite'}
    </button>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--bg2, #1a1a2e);
    border: 1px solid var(--border, #333);
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    min-width: 130px;
  }
  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: var(--text1, #eee);
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    white-space: nowrap;
  }
  .context-menu-item:hover {
    background: var(--accent, #7c3aed);
    color: #fff;
  }
</style>
