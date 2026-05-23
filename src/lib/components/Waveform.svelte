<script>
  import { LoaderCircle } from '@lucide/svelte';

  export let data = [];
  export let playingId = null;
  export let sampleUuid = null;
  export let playingProgress = 0;
  export let loading = false;
  export let error = null;
</script>

{#if data}
  <svg class="wave-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
    {#each data as amp, i}
      <rect x={i} y={10 - amp * 10} width={1} height={amp * 20} fill={playingId === sampleUuid ? 'var(--accent)' : 'var(--text4)'} />
    {/each}
    {#if playingId === sampleUuid}
      <line x1={playingProgress * 100} y1="0" x2={playingProgress * 100} y2="20" stroke="white" stroke-width="1.5" stroke-linecap="round" />
    {/if}
  </svg>
{:else if loading}
  <LoaderCircle size={14} class="spin" />
{:else if error}
  <span class="sample-error">{error}</span>
{/if}
