<script>
  import { Search, LoaderCircle, SlidersHorizontal, X } from '@lucide/svelte';
  import { KEY_OPTIONS, CHORD_OPTIONS, CATEGORY_OPTIONS, SORT_OPTIONS } from '$lib/splice.js';

  export let search = '';
  export let loading = false;
  export let total = 0;
  export let assetType = 'sample';
  export let showFilters = false;
  export let filterKey = '';
  export let filterChord = '';
  export let filterMinBpm = '';
  export let filterMaxBpm = '';
  export let filterSort = 'popularity';
  export let filterCategory = '';
  export let tagSummary = [];
  export let selectedTags = [];
  export let anyFilterActive = false;
  export let onSearch;
  export let onInputChange;
  export let onAssetTypeChange;
  export let onToggleFilters;
  export let onFilterChange;
  export let onClearFilters;
  export let onToggleTag;
</script>

<div class="search-area">
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
    <button onclick={onSearch} disabled={loading}>
      {#if loading}
        <LoaderCircle size={18} class="spin" />
      {:else}
        <Search size={18} />
      {/if}
    </button>
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
    <div class="asset-type-tabs">
      <button class:active={assetType === 'sample'} onclick={() => onAssetTypeChange?.('sample')}>Samples</button>
      <button class:active={assetType === 'pack'} onclick={() => onAssetTypeChange?.('pack')}>Packs</button>
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
