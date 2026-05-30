<script>
  import { Download, Settings, Heart } from '@lucide/svelte';

  export let currentView = 'downloads';
  export let dlCount = 0;
  export let onNavigate;
  export let onHome;
</script>

<header class="topbar">
  <button class="brand" onclick={onHome} aria-label="home">
    <img src="spleece_logo.svg" width="54" height="54" alt="spleece logo"/>
    <span>spleece</span>
  </button>

  <nav class="nav-pills" aria-label="primary">
    <button class:active={currentView === 'downloads'} onclick={() => onNavigate?.('downloads')}>
      <Download size={16} />
      <span>save</span>
      {#if dlCount > 0}<span class="dl-badge">{dlCount}</span>{/if}
    </button>
    <button class:active={currentView === 'favourites'} onclick={() => onNavigate?.('favourites')}>
      <Heart size={16} />
      <span>faves</span>
    </button>
    <button class:active={currentView === 'settings'} onclick={() => onNavigate?.('settings')}>
      <Settings size={16} />
      <span>settings</span>
    </button>
  </nav>
</header>

<style>
  .dl-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
    background: var(--accent); color: #241b13; font-size: 11px; font-weight: 700;
    margin-left: 4px;
  }
</style>
