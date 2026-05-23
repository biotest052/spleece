<script>
  import { Package } from '@lucide/svelte';
  import { proxyUrl } from '$lib/splice.js';

  export let pack;
  export let sampleCount = '?';
  export let onClick;
</script>

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
