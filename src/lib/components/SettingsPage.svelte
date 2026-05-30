<script>
  import { Settings, Sun, Moon } from '@lucide/svelte';

  export let dark = true;
  export let downloadFormat = 'wav';
  export let settingsSection = 'appearance';
  export let version = '24/05/26';
  export let onToggleTheme;
  export let onFormatChange;
  export let onClearCache;
  export let onSectionChange;
  export let stats = {};
</script>

<div class="page settings-page">
  <div class="page-header">
    <Settings size={20} />
    <h1>settings</h1>
    <span>{version}</span>
  </div>
  <div class="settings-layout">
    <div class="settings-nav">
      <button class="settings-section-btn" class:active={settingsSection === 'appearance'} onclick={() => onSectionChange?.('appearance')}>Appearance</button>
      <button class="settings-section-btn" class:active={settingsSection === 'audio'} onclick={() => onSectionChange?.('audio')}>Audio</button>
      <button class="settings-section-btn" class:active={settingsSection === 'stats'} onclick={() => onSectionChange?.('stats')}>Stats</button>
    </div>
    <div class="settings-controls">
      {#if settingsSection === 'appearance'}
        <div class="setting-row">
          <span class="setting-label">Theme</span>
          <div class="setting-options">
            <button class="setting-option" class:active={!dark} onclick={() => onToggleTheme?.(false)}><Sun size={14} /> Light</button>
            <button class="setting-option" class:active={dark} onclick={() => onToggleTheme?.(true)}><Moon size={14} /> Dark</button>
          </div>
        </div>
      {:else if settingsSection === 'audio'}
        <div class="setting-row">
          <span class="setting-label">Download Format</span>
          <div class="setting-options">
            <button class="setting-option" class:active={downloadFormat === 'wav'} onclick={() => onFormatChange?.('wav')}>WAV</button>
            <button class="setting-option" class:active={downloadFormat === 'original'} onclick={() => onFormatChange?.('original')}>Original</button>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">Audio Cache</span>
          <div class="setting-options">
            <button class="setting-option" onclick={onClearCache}>Clear cache</button>
          </div>
        </div>
      {:else if settingsSection === 'stats'}
        {@const entries = Object.entries(stats)}
        <div class="setting-row">
          <span class="setting-label">Samples played</span>
          <span class="setting-value">{entries.reduce((s, [,v]) => s + (v.plays || 0), 0)}</span>
        </div>
        <div class="setting-row">
          <span class="setting-label">Samples downloaded</span>
          <span class="setting-value">{entries.reduce((s, [,v]) => s + (v.downloads || 0), 0)}</span>
        </div>
      {/if}
    </div>
  </div>
</div>
