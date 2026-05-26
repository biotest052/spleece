<script>
  import { ArrowLeft, Package, Play, Pause, Download, LoaderCircle, Heart } from '@lucide/svelte';
  import ContextMenu from './ContextMenu.svelte';
  import { proxyUrl, formatBpm, formatKey, formatDuration } from '$lib/splice.js';

  export let pack;
  export let samples = [];
  export let loading = false;
  export let playingId = null;
  export let playingProgress = 0;
  export let waveData = {};
  export let waveLoading = {};
  export let sampleErrors = {};
  export let dlStatus = { uuid: null };
  export let favoriteMap = {};
  export let page = 1;
  export let totalPages = 1;
  export let onClose;
  export let onTogglePreview;
  export let onDownload;
  export let onGenWaveform;
  export let onToggleFavorite;
  export let onGoToPage;

  function fileName(s) {
    return s.name.split('/').pop();
  }
</script>

<div class="pack-header">
  <button class="back-btn" onclick={onClose}>
    <ArrowLeft size={16} />
    <span>Back</span>
  </button>
  <div class="pack-info">
    <div class="pack-artwork">
      {#if pack.artworkUrl}
        <img src={proxyUrl(pack.artworkUrl)} alt={pack.name} />
      {:else}
        <div class="pack-artwork-placeholder">
          <Package size={32} />
        </div>
      {/if}
    </div>
    <div class="pack-details">
      <div class="pack-details-top">
        <h2>{pack.name}</h2>
        <button
          class="pack-detail-fav-btn"
          title={favoriteMap[pack.uuid] ? 'Remove from favourites' : 'Add to favourites'}
          onclick={() => onToggleFavorite?.(pack)}
        >
          <Heart size={16} fill={favoriteMap[pack.uuid] ? 'var(--accent)' : 'none'} color={favoriteMap[pack.uuid] ? 'var(--accent)' : 'var(--text3)'} />
        </button>
      </div>
      {#if pack.provider}
        <span class="pack-provider">{pack.provider.name}</span>
      {/if}
      {#if pack.description}
        <div class="pack-desc">{@html pack.description}</div>
      {/if}
      {#if pack.mainGenre}
        <span class="pack-genre">{pack.mainGenre}</span>
      {/if}
    </div>
  </div>
</div>

{#if loading}
  <div class="loading">loading samples&hellip;</div>
{:else if samples.length}
  <div class="pack-samples-count">{samples.length} samples</div>
  <div class="results">
    {#each samples as sample}
      <ContextMenu {sample} favorited={!!favoriteMap[sample.uuid]} onToggleFavorite={onToggleFavorite}>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="row"
          class:playing={playingId === sample.uuid}
          onmouseenter={() => onGenWaveform?.(sample)}
        >
          {#if sample.packArtworkUrl}
            <button class="col-pack-thumb" title="View pack">
              <img src={proxyUrl(sample.packArtworkUrl)} alt="" />
            </button>
          {:else}
            <span class="col-pack-thumb"></span>
          {/if}
        <span class="col-name" title={sample.name}>
          <span class="sample-title">{fileName(sample)}</span>
          <span class="sample-tags">
            {#each sample.tags.slice(0, 4) as tag}
              <span class="tag">{tag.label}</span>
            {/each}
            {#if sample.key}
              <span class="sample-badge sample-badge--bpm">{formatKey(sample.key, sample.chordType)}</span>
            {/if}
            {#if sample.bpm}
              <span class="sample-badge sample-badge--bpm">{formatBpm(sample.bpm)}</span>
            {/if}
          </span>
        </span>
        <span class="col-meta">{formatDuration(sample.duration)}</span>
          <span class="col-wave-group">
            <span class="col-wave">
              {#if waveData[sample.uuid]}
                <svg class="wave-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                  {#each waveData[sample.uuid] as amp, i}
                    <rect x={i} y={10 - amp * 10} width={1} height={amp * 20} fill={playingId === sample.uuid ? 'var(--accent)' : 'var(--text4)'} />
                  {/each}
                  {#if playingId === sample.uuid}
                    <line x1={playingProgress * 100} y1="0" x2={playingProgress * 100} y2="20" stroke="white" stroke-width="1.5" stroke-linecap="round" />
                  {/if}
                </svg>
              {:else if waveLoading[sample.uuid]}
                <LoaderCircle size={14} class="spin" />
              {:else if sampleErrors[sample.uuid]}
                <span class="sample-error">{sampleErrors[sample.uuid]}</span>
              {/if}
            </span>
          </span>
          <button
            class="play-btn"
            title={playingId === sample.uuid ? 'Stop' : 'Preview'}
            onclick={() => onTogglePreview?.(sample)}
          >
            {#if playingId === sample.uuid}
              <Pause size={10} />
            {:else}
              <Play size={10} />
            {/if}
          </button>
          <button
            class="dl-btn"
            title="Download"
            onclick={() => onDownload?.(sample)}
            disabled={dlStatus.uuid === sample.uuid}
          >
            <Download size={14} />
          </button>
          <button
            class="fav-btn"
            title={favoriteMap[sample.uuid] ? 'Remove from favourites' : 'Add to favourites'}
            onclick={() => onToggleFavorite?.(sample)}
          >
            <Heart size={14} fill={favoriteMap[sample.uuid] ? 'var(--accent)' : 'none'} color={favoriteMap[sample.uuid] ? 'var(--accent)' : 'var(--text3)'} />
          </button>
        </div>
      </ContextMenu>
    {/each}
  </div>
  {#if totalPages > 1}
    <div class="pagination">
      <button class="page-btn" disabled={page <= 1} onclick={() => onGoToPage(page - 1)}>Prev</button>
      {#each Array(totalPages) as _, i}
        <button
          class="page-btn"
          class:active={i + 1 === page}
          disabled={i + 1 === page}
          onclick={() => onGoToPage(i + 1)}
        >{i + 1}</button>
      {/each}
      <button class="page-btn" disabled={page >= totalPages} onclick={() => onGoToPage(page + 1)}>Next</button>
    </div>
  {/if}
{:else}
  <div class="empty"><p>no samples in this pack</p></div>
{/if}

<style>
  .pack-details-top { display: flex; align-items: center; gap: 8px; }
  .pack-details-top h2 { flex: 1; }
  .pack-detail-fav-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border: none; border-radius: 8px;
    background: transparent; color: var(--text3); cursor: pointer; flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }
  .pack-detail-fav-btn:hover { background: var(--tag-bg); color: var(--accent); }
  .pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 16px; padding: 0 4px; }
  .page-btn {
    min-width: 34px; height: 34px; border: none; border-radius: 8px;
    background: var(--surface); color: var(--text3); cursor: pointer;
    font-size: 13px; transition: 0.15s;
  }
  .page-btn:hover:not(:disabled) { background: var(--bg2); color: var(--text); }
  .page-btn.active { background: var(--accent); color: #241b13; font-weight: 600; }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
