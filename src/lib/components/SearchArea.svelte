<script>
  import { Search, LoaderCircle, SlidersHorizontal, X, Trash2 } from '@lucide/svelte';
  import ClearDataMenu from './ClearDataMenu.svelte';
  import { KEY_OPTIONS, CHORD_OPTIONS, CATEGORY_OPTIONS, SORT_OPTIONS } from '$lib/splice.js';

  let {
    search = '',
    loading = false,
    total = 0,
    assetType = 'sample',
    showFilters = false,
    filterKey = '',
    filterChord = '',
    filterMinBpm = '',
    filterMaxBpm = '',
    filterSort = 'popularity',
    filterCategory = '',
    tagSummary = [],
    selectedTags = [],
    anyFilterActive = false,
    onSearch,
    onInputChange,
    onAssetTypeChange,
    onToggleFilters,
    onFilterChange,
    onClearFilters,
    onToggleTag,
    onClearCache,
    onClearUserData,
    onClearBoth,
    getCacheSize,
    getUserDataSize,
    suggestions = [],
    suggestShow = false,
    onSurprise,
  } = $props();

  let showClearMenu = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let cacheSize = $state(0);
  let userDataSize = $state(0);
  let trashBtn;
  let searchAreaEl;

  $effect(() => {
    if (!suggestShow) return;
    function close(e) {
      if (searchAreaEl && !searchAreaEl.contains(e.target)) suggestShow = false;
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  });

  async function openClearMenu() {
    cacheSize = await getCacheSize?.();
    userDataSize = getUserDataSize?.() || 0;
    if (trashBtn) {
      const r = trashBtn.getBoundingClientRect();
      menuX = r.right;
      menuY = r.top;
    }
    showClearMenu = true;
  }
</script>

<div class="search-area" bind:this={searchAreaEl}>
  <div class="search-header">
    <h1>splice sounds</h1>
    <span>{total > 0 ? `${total} ${assetType === 'pack' ? 'pack' : 'sample'}${total !== 1 ? 's' : ''}` : 'search, preview, save'}</span>
  </div>
  <div class="search-box">
    <input
      type="text"
      placeholder="search splice sounds"
      value={search}
      oninput={(e) => onInputChange?.(e.target.value)}
      onkeydown={(e) => e.key === 'Enter' && onSearch?.()}
    />
    <button onclick={() => onSearch?.()} disabled={loading}>
      {#if loading}
        <LoaderCircle size={18} class="spin" />
      {:else}
        <Search size={18} />
      {/if}
    </button>
    {#if suggestShow && suggestions.length > 0}
      <div class="suggest-dropdown">
        {#each suggestions as s}
          <button class="suggest-item" onclick={() => { onInputChange?.(s); onSearch?.(); }}>{s}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="filter-toggle">
    <button
      class="filter-toggle-btn"
      class:active={showFilters}
      onclick={onToggleFilters}
    >
      <SlidersHorizontal size={14} />
      <span>Filters</span>
      {#if anyFilterActive}
        <span class="filter-badge">active</span>
      {/if}
    </button>
    <div class="filter-toggle-right">
      <button class="surprise-btn" onclick={onSurprise} title="Surprise me">Surprise me</button>
      <div class="asset-type-tabs">
        <button class:active={assetType === 'sample'} onclick={() => onAssetTypeChange?.('sample')}>Samples</button>
        <button class:active={assetType === 'pack'} onclick={() => onAssetTypeChange?.('pack')}>Packs</button>
      </div>
      <button class="clear-data-btn" title="Clear data" onclick={openClearMenu} bind:this={trashBtn}>
        <Trash2 size={15} />
      </button>
    </div>
  </div>

  {#if showFilters}
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label" for="filter-key">Key</label>
        <select id="filter-key" value={filterKey} onchange={(e) => onFilterChange?.('key', e.target.value)}>
          {#each KEY_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-chord">Chord</label>
        <select id="filter-chord" value={filterChord} onchange={(e) => onFilterChange?.('chord', e.target.value)}>
          {#each CHORD_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-bpm-min">Min BPM</label>
        <input id="filter-bpm-min" type="number" min="1" max="300" placeholder="--" value={filterMinBpm} oninput={(e) => onFilterChange?.('minBpm', e.target.value)} />
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-bpm-max">Max BPM</label>
        <input id="filter-bpm-max" type="number" min="1" max="300" placeholder="--" value={filterMaxBpm} oninput={(e) => onFilterChange?.('maxBpm', e.target.value)} />
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-category">Category</label>
        <select id="filter-category" value={filterCategory} onchange={(e) => onFilterChange?.('category', e.target.value)}>
          {#each CATEGORY_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-sort">Sort</label>
        <select id="filter-sort" value={filterSort} onchange={(e) => onFilterChange?.('sort', e.target.value)}>
          {#each SORT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      {#if anyFilterActive}
        <div class="filter-group filter-clear">
          <button class="filter-clear-btn" onclick={onClearFilters}><X size={12} /> Clear</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if tagSummary.length > 0}
    <div class="tag-bar">
      {#each tagSummary.slice(0, 30) as t}
        <button
          class="tag-chip"
          class:active={selectedTags.includes(t.tag.uuid)}
          onclick={() => onToggleTag?.(t.tag.uuid)}
        >
          {t.tag.label} {t.count}
        </button>
      {/each}
    </div>
  {/if}
</div>

<ClearDataMenu
  show={showClearMenu}
  x={menuX}
  y={menuY}
  {cacheSize}
  {userDataSize}
  onClose={() => showClearMenu = false}
  onClearCache={() => { onClearCache?.(); showClearMenu = false; }}
  onClearUserData={() => { onClearUserData?.(); userDataSize = getUserDataSize?.() || 0; }}
  onClearBoth={() => { onClearBoth?.(); cacheSize = 0; userDataSize = 0; showClearMenu = false; }}
/>

<style>
  .filter-toggle-right { display: flex; align-items: center; gap: 10px; }
  .clear-data-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: none; border-radius: 8px;
    background: transparent; color: var(--text3); cursor: pointer; flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }
  .clear-data-btn:hover { color: var(--err-text); background: var(--err-bg); }
  .surprise-btn {
    padding: 6px 14px; border: none; border-radius: 8px; background: var(--surface);
    color: var(--text3); cursor: pointer; font-size: 13px; transition: 0.15s;
  }
  .surprise-btn:hover { background: var(--accent); color: #241b13; }
  .suggest-dropdown {
    position: absolute; z-index: 100; top: 100%; left: 0; right: 0;
    background: var(--bg2); border: 1px solid var(--border); border-radius: 8px;
    margin-top: 2px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .suggest-item {
    display: block; width: 100%; padding: 8px 12px; border: none;
    background: none; color: var(--text); font-size: 13px; text-align: left;
    cursor: pointer; transition: 0.1s;
  }
  .suggest-item:hover { background: var(--tag-bg); color: var(--text); }
</style>
