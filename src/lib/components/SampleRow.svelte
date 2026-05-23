<script>
  import { Play, Pause, Download, Package } from '@lucide/svelte';
  import Waveform from './Waveform.svelte';
  import { proxyUrl, formatBpm, formatKey, formatDuration } from '$lib/splice.js';

  export let sample;
  export let playingId = null;
  export let playingProgress = 0;
  export let waveData = null;
  export let waveLoading = false;
  export let sampleError = null;
  export let dlStatus = { uuid: null };
  export let onTogglePreview;
  export let onDownload;
  export let onOpenPack;
  export let onGenWaveform;

  function fileName(s) {
    return s.name.split('/').pop();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="row"
  class:playing={playingId === sample.uuid}
  onmouseenter={() => onGenWaveform?.(sample)}
>
  {#if sample.pack}
    <button
      class="col-pack-thumb"
      title={`Open pack: ${sample.pack.name}`}
      onclick={() => onOpenPack?.(sample)}
    >
      {#if sample.packArtworkUrl}
        <img src={proxyUrl(sample.packArtworkUrl)} alt="" />
      {:else}
        <Package size={14} />
      {/if}
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
      <Waveform
        data={waveData}
        {playingId}
        sampleUuid={sample.uuid}
        {playingProgress}
        loading={waveLoading}
        error={sampleError}
      />
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
    title="Click to download"
    onclick={() => onDownload?.(sample)}
    disabled={dlStatus.uuid === sample.uuid}
  >
    <Download size={14} />
  </button>
</div>
