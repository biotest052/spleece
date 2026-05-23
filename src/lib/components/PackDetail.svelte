<script>
  import { ArrowLeft, Package, Play, Pause, Download, LoaderCircle } from '@lucide/svelte';
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
  export let onClose;
  export let onTogglePreview;
  export let onDownload;
  export let onGenWaveform;

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
      <h2>{pack.name}</h2>
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
              <span>{tag.label}</span>
            {/each}
          </span>
        </span>
        <span class="col-meta">
          {formatBpm(sample.bpm)}{#if sample.bpm} bpm{/if}
        </span>
        <span class="col-meta">{formatKey(sample.key, sample.chordType)}</span>
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
      </div>
    {/each}
  </div>
{:else}
  <div class="empty"><p>no samples in this pack</p></div>
{/if}
