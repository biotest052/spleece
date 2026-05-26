<script>
  import { Package, Heart } from '@lucide/svelte';
  import { proxyUrl } from '$lib/splice.js';

  export let pack;
  export let sampleCount = '?';
  export let favorited = false;
  export let onClick;
  export let onToggleFavorite;
</script>

<div class="pack-card-wrap">
  <button class="pack-card" onclick={() => onClick?.(pack)}>
    <div class="pack-card-artwork">
      {#if pack.artworkUrl}
        <img src={proxyUrl(pack.artworkUrl)} alt={pack.name} />
      {:else}
        <div class="pack-card-placeholder">
          <Package size={28} />
        </div>
      {/if}
    </div>
    <div class="pack-card-body">
      <strong class="pack-card-name">{pack.name}</strong>
      {#if pack.provider}
        <span class="pack-card-provider">{pack.provider.name}</span>
      {/if}
      {#if pack.mainGenre}
        <span class="pack-card-genre">{pack.mainGenre}</span>
      {/if}
      <span class="pack-card-count">{sampleCount} samples</span>
    </div>
  </button>
  <button
    class="pack-fav-btn"
    title={favorited ? 'Remove from favourites' : 'Add to favourites'}
    onclick={() => onToggleFavorite?.(pack)}
  >
    <Heart size={16} fill={favorited ? 'var(--accent)' : 'none'} color={favorited ? 'var(--accent)' : 'var(--text3)'} />
  </button>
</div>

<style>
  .pack-fav-btn {
    position: absolute; top: 8px; right: 8px;
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: none; border-radius: 8px;
    background: rgba(0,0,0,0.5); color: var(--text3); cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .pack-fav-btn:hover { background: rgba(0,0,0,0.7); color: var(--accent); }
</style>
