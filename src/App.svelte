<script>
  import { unscramble, wavEncode } from './lib/unscramble.js';
  import { fetchPackByPermalink, searchSamples, searchAutocomplete, proxyUrl, looksLikeChallenge, extractPack, RANDOM_TERMS } from './lib/splice.js';
  import Topbar from './lib/components/Topbar.svelte';
  import SearchArea from './lib/components/SearchArea.svelte';
  import SampleRow from './lib/components/SampleRow.svelte';
  import PackCard from './lib/components/PackCard.svelte';
  import PackDetail from './lib/components/PackDetail.svelte';
  import SettingsPage from './lib/components/SettingsPage.svelte';
  import { Clock, Download, CheckCircle, CircleX } from '@lucide/svelte';

  let search = $state('');
  let samples = $state([]);
  let tagSummary = $state([]);
  let selectedTags = $state([]);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state('');
  let total = $state(0);
  let totalPages = $state(1);
  let currentPage = $state(1);
  let abortController = $state(null);
  let playingId = $state(null);
  let playingProgress = $state(0);
  let playingDuration = $state(0);
  let progressRaf = null;
  let waveData = $state({});
  let waveLoading = $state({});
  let sampleErrors = $state({});
  let audioCache = $state(new Map());
  const audioRequests = new Map();
  const CACHE_DB = 'spleece-audio-cache';
  const CACHE_STORE = 'audio';
  const CACHE_VERSION = 1;
  let playCtx = $state(null);
  let sourceNode = $state(null);
  let playbackToken = 0;
  let dlStatus = $state({ uuid: null });
  let suppressNextDownloadClick = false;
  let dark = $state(true);
  let hasSearched = $state(false);
  let downloadFormat = $state('wav');
  let currentView = $state('downloads');
  let settingsSection = $state('appearance');

  let favorites = $state(loadFavorites());
  let favType = $state('sample');
  let focusIndex = $state(-1);
  let dlQueue = $state([]);
  let stats = $state(loadStats());
  let suggestions = $state([]);
  let suggestShow = $state(false);

  function loadFavorites() {
    try {
      const raw = localStorage.getItem('spleece-favorites');
      const arr = raw ? JSON.parse(raw) : [];
      const map = {};
      for (const s of arr) map[s.uuid] = s;
      return map;
    } catch { return {}; }
  }

  function saveFavorites(map) {
    localStorage.setItem('spleece-favorites', JSON.stringify(Object.values(map)));
  }

  function toggleFavorite(item) {
    const map = { ...favorites };
    if (map[item.uuid]) delete map[item.uuid];
    else map[item.uuid] = { ...item, _type: item.assetType || (item.sampleCount !== undefined ? 'pack' : item.pack ? 'sample' : assetType) };
    favorites = map;
    saveFavorites(map);
  }

  let showFilters = $state(false);
  let filterKey = $state('');
  let filterChord = $state('');
  let filterMinBpm = $state('');
  let filterMaxBpm = $state('');
  let filterSort = $state('popularity');
  let filterOrder = $state('DESC');
  let filterCategory = $state('');
  let assetType = $state('sample');

  function loadStats() {
    try { return JSON.parse(localStorage.getItem('spleece-stats') || '{}'); }
    catch { return {}; }
  }
  function saveStats(s) { localStorage.setItem('spleece-stats', JSON.stringify(s)); }
  function trackStat(uuid, field) {
    const s = { ...stats };
    if (!s[uuid]) s[uuid] = { plays: 0, downloads: 0 };
    s[uuid][field] += 1;
    stats = s;
    saveStats(s);
  }
  function randomDiscovery() {
    const term = RANDOM_TERMS[Math.floor(Math.random() * RANDOM_TERMS.length)];
    search = term;
    assetType = 'sample';
    doSearch();
  }
  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault();
      const list = viewingPack ? packSamples : samples;
      if (!list.length) return;
      const delta = e.key === 'j' ? 1 : -1;
      let idx = Math.max(0, Math.min(list.length - 1, (focusIndex < 0 ? -1 : focusIndex) + delta));
      focusIndex = idx;
    }
    if (e.key === ' ' && focusIndex >= 0) {
      e.preventDefault();
      const list = viewingPack ? packSamples : samples;
      const s = list[focusIndex];
      if (s) togglePreview(s);
    }
  }
  function addToDlQueue(sample) {
    if (dlQueue.find(d => d.uuid === sample.uuid)) return;
    dlQueue = [...dlQueue, { ...sample, status: 'queued', progress: 0 }];
    processDlQueue();
  }
  async function processDlQueue() {
    const next = dlQueue.find(d => d.status === 'queued');
    if (!next) return;
    dlQueue = dlQueue.map(d => d.uuid === next.uuid ? { ...d, status: 'downloading' } : d);
    try {
      await download(next);
      dlQueue = dlQueue.map(d => d.uuid === next.uuid ? { ...d, status: 'done' } : d);
      trackStat(next.uuid, 'downloads');
    } catch {
      dlQueue = dlQueue.map(d => d.uuid === next.uuid ? { ...d, status: 'failed' } : d);
    }
    processDlQueue();
  }

  let viewingPack = $state(null);
  let packSamples = $state([]);
  let packLoading = $state(false);
  let packPage = $state(1);
  let packTotalPages = $state(1);

  let initializing = true;

  function syncUrl() {
    if (initializing) return;
    const url = new URL(window.location.href);
    if (currentView === 'downloads' && viewingPack?.permalink) {
      url.pathname = `/pack/${viewingPack.permalink}`;
      url.search = '';
      if (packPage > 1) url.searchParams.set('p', String(packPage));
    } else if (currentView === 'favourites') {
      url.pathname = '/favourites';
      url.search = '';
    } else if (currentView === 'settings') {
      url.pathname = '/settings';
      url.search = '';
    } else {
      url.pathname = '/';
      url.search = '';
      if (search) url.searchParams.set('s', search);
      if (selectedTags.length) url.searchParams.set('t', selectedTags.join(','));
      if (currentPage > 1) url.searchParams.set('p', String(currentPage));
      url.searchParams.set('ty', assetType);
      if (filterKey) url.searchParams.set('k', filterKey);
      if (filterChord) url.searchParams.set('ch', filterChord);
      if (filterMinBpm) url.searchParams.set('mb', filterMinBpm);
      if (filterMaxBpm) url.searchParams.set('xB', filterMaxBpm);
      if (filterCategory) url.searchParams.set('ca', filterCategory);
      if (filterSort !== 'popularity') url.searchParams.set('so', filterSort);
    }
    history.replaceState(null, '', url.toString());
  }

  function handlePopState() {
    const url = new URL(window.location.href);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/pack/')) {
      loadPackByPermalink(path.replace('/pack/', ''), parseInt(url.searchParams.get('p')) || 1);
    } else if (path === '/favourites') {
      currentView = 'favourites';
    } else if (path === '/settings') {
      currentView = 'settings';
    } else {
      const s = url.searchParams.get('s') || '';
      const ty = url.searchParams.get('ty') || 'sample';
      const t = url.searchParams.get('t') || '';
      const p = parseInt(url.searchParams.get('p')) || 1;
      search = s; assetType = ty;
      selectedTags = t ? t.split(',') : [];
      filterKey = url.searchParams.get('k') || '';
      filterChord = url.searchParams.get('ch') || '';
      filterMinBpm = url.searchParams.get('mb') || '';
      filterMaxBpm = url.searchParams.get('xB') || '';
      filterCategory = url.searchParams.get('ca') || '';
      filterSort = url.searchParams.get('so') || 'popularity';
      viewingPack = null;
      if (s || t) doSearch(p);
      else { samples = []; hasSearched = false; currentPage = 1; }
    }
  }

  async function loadPackByPermalink(slug, page = 1) {
    try {
      const pack = await fetchPackByPermalink(slug);
      if (!pack) { error = 'Pack not found'; currentView = 'downloads'; return; }
      currentView = 'downloads';
      viewingPack = pack;
      packLoading = true; packSamples = []; packPage = 1; packTotalPages = 1;
      const result = await searchSamples('', {
        assetType: 'sample', parentAssetUuid: pack.uuid,
        sort: 'popularity', order: 'DESC', page,
      });
      packSamples = result.items; packPage = result.page || page;
      packTotalPages = result.totalPages || 1;
      prefetchAudio(packSamples);
    } catch (e) { error = e.message || 'Failed to load pack'; }
    finally { packLoading = false; }
  }

  const initUrl = new URL(window.location.href);
  const initPath = initUrl.pathname.replace(/\/+$/, '') || '/';
  if (initPath.startsWith('/pack/')) {
    currentView = 'downloads';
    loadPackByPermalink(initPath.replace('/pack/', ''), parseInt(initUrl.searchParams.get('p')) || 1);
  } else if (initPath === '/favourites') {
    currentView = 'favourites';
  } else if (initPath === '/settings') {
    currentView = 'settings';
  } else {
    const s = initUrl.searchParams.get('s') || '';
    const ty = initUrl.searchParams.get('ty') || 'sample';
    const t = initUrl.searchParams.get('t') || '';
    const p = parseInt(initUrl.searchParams.get('p')) || 1;
    const k = initUrl.searchParams.get('k') || '';
    const ch = initUrl.searchParams.get('ch') || '';
    const mb = initUrl.searchParams.get('mb') || '';
    const xB = initUrl.searchParams.get('xB') || '';
    const ca = initUrl.searchParams.get('ca') || '';
    const so = initUrl.searchParams.get('so') || 'popularity';
    search = s; assetType = ty; currentPage = p;
    selectedTags = t ? t.split(',') : [];
    filterKey = k; filterChord = ch; filterMinBpm = mb; filterMaxBpm = xB;
    filterCategory = ca; filterSort = so;
    if (s || t) doSearch(p);
    else hasSearched = false;
  }
  initializing = false;
  syncUrl();

  $effect(() => { syncUrl(); });

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeydown);
  }

  $effect(() => { if (samples.length) focusIndex = -1; });
  $effect(() => { if (packSamples.length) focusIndex = -1; });

  function toggleTheme(isDark) {
    dark = isDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  function toggleTag(uuid) {
    if (selectedTags.includes(uuid))
      selectedTags = selectedTags.filter(t => t !== uuid);
    else
      selectedTags = [...selectedTags, uuid];
    doSearch();
  }

  function clearFilters() {
    filterKey = '';
    filterChord = '';
    filterMinBpm = '';
    filterMaxBpm = '';
    filterSort = 'popularity';
    filterOrder = 'DESC';
    filterCategory = '';
    selectedTags = [];
    doSearch();
  }

  function anyFilterActive() {
    return filterKey || filterChord || filterMinBpm || filterMaxBpm || filterCategory || selectedTags.length;
  }

  function handleFilterChange(field, value) {
    if (field === 'key') filterKey = value;
    else if (field === 'chord') filterChord = value;
    else if (field === 'minBpm') filterMinBpm = value;
    else if (field === 'maxBpm') filterMaxBpm = value;
    else if (field === 'sort') filterSort = value;
    else if (field === 'category') filterCategory = value;
    doSearch();
  }

  async function doSearch(page = 1) {
    closeSuggest();
    const q = search.trim();
    if (!q && !selectedTags.length && !anyFilterActive()) return;
    if (abortController) abortController.abort();
    abortController = new AbortController();

    viewingPack = null;
    hasSearched = true;
    samples = [];
    error = '';
    loading = true;
    total = 0;
    currentPage = page;
    totalPages = 1;
    waveData = {};
    sampleErrors = {};
    tagSummary = [];

    try {
      const result = await searchSamples(q, {
        signal: abortController.signal,
        page,
        tagUuids: selectedTags,
        key: filterKey || null,
        chordType: filterChord || null,
        minBpm: filterMinBpm ? parseInt(filterMinBpm) : null,
        maxBpm: filterMaxBpm ? parseInt(filterMaxBpm) : null,
        sort: filterSort,
        order: filterOrder,
        category: filterCategory || null,
        assetType,
      });
      samples = result.items;
      total = result.total;
      currentPage = result.page;
      totalPages = result.totalPages;
      tagSummary = result.tags;
      prefetchAudio(samples);
    } catch (e) {
      if (e.name === 'AbortError') return;
      error = e.message || 'Search failed';
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    if (loadingMore || currentPage >= totalPages) return;
    loadingMore = true;
    try {
      const result = await searchSamples(search.trim(), {
        page: currentPage + 1,
        tagUuids: selectedTags,
        key: filterKey || null,
        chordType: filterChord || null,
        minBpm: filterMinBpm ? parseInt(filterMinBpm) : null,
        maxBpm: filterMaxBpm ? parseInt(filterMaxBpm) : null,
        sort: filterSort,
        order: filterOrder,
        category: filterCategory || null,
        assetType,
      });
      const newItems = [];
      for (const s of result.items) {
        if (!samples.find(x => x.uuid === s.uuid)) { samples.push(s); newItems.push(s); }
      }
      prefetchAudio(newItems);
      currentPage = result.page;
    } catch (e) {
      console.error('Load more failed:', e);
    } finally {
      loadingMore = false;
    }
  }

  function hadMore() {
    return samples.length < total;
  }

  function fileName(sample) {
    return sample.name.split('/').pop();
  }

  function cleanBaseName(sample) {
    return fileName(sample).replace(/\.(wav|mp3|aif|aiff|flac|ogg|m4a)$/i, '');
  }

  function safeFileName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim() || 'sample';
  }

  function isWav(bytes) {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }

  async function createBrowserSaveTarget(name, ext) {
    if (!window.showSaveFilePicker) return null;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{
          description: 'Audio',
          accept: { [ext === 'wav' ? 'audio/wav' : 'audio/mpeg']: ['.' + ext] },
        }],
      });
      return {
        async write(blob) {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        },
      };
    } catch (e) {
      if (e?.name === 'AbortError') return false;
      throw e;
    }
  }

  async function rawFetchAudio(url) {
    const resp = await fetch(proxyUrl(url));
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (!resp.ok) {
      const text = decodeAsText(bytes);
      if (looksLikeChallenge(text)) throw new Error('Splice is asking for browser verification');
      throw new Error('HTTP ' + resp.status);
    }
    return validateAudioBytes(bytes);
  }

  function openAudioCacheDb() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {
      const req = indexedDB.open(CACHE_DB, CACHE_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  async function readCachedAudio(key) {
    const db = await openAudioCacheDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const req = tx.objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => {
        const value = req.result?.bytes;
        resolve(value ? new Uint8Array(value) : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  async function writeCachedAudio(key, bytes) {
    const db = await openAudioCacheDb();
    if (!db) return;

    await new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.objectStore(CACHE_STORE).put({
        key,
        bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        savedAt: Date.now(),
      });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); resolve(); };
    });
  }

  async function clearAudioCache() {
    audioCache = new Map();
    audioRequests.clear();

    if (typeof indexedDB === 'undefined') return;
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(CACHE_DB);
      req.onsuccess = resolve;
      req.onerror = resolve;
      req.onblocked = resolve;
    });
  }

  async function getCacheSize() {
    const db = await openAudioCacheDb();
    if (!db) return 0;
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const all = tx.objectStore(CACHE_STORE).getAll();
      all.onsuccess = () => {
        let total = 0;
        for (const item of all.result) total += item.bytes?.byteLength || 0;
        resolve(total);
      };
      all.onerror = () => resolve(0);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  function getUserDataSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      total += (key?.length || 0) + (val?.length || 0);
    }
    return total;
  }

  function clearUserData() {
    favorites = {};
    localStorage.removeItem('spleece-favorites');
  }

  function decodeAsText(bytes) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 800));
  }

  function validateAudioBytes(bytes) {
    if (bytes.length < 32) throw new Error('Audio response was empty');
    const text = decodeAsText(bytes);
    if (/^\s*</.test(text) || looksLikeChallenge(text)) {
      if (looksLikeChallenge(text)) throw new Error('Splice is asking for browser verification');
      throw new Error('Audio request returned HTML instead of audio');
    }
    return bytes;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchAudioWithRetry(url) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await rawFetchAudio(url);
      } catch (e) {
        lastError = e;
        const msg = String(e?.message || e || '');
        if (/browser verification|HTML instead of audio/i.test(msg)) break;
        if (attempt < 2) await delay(250 * (attempt + 1));
      }
    }
    throw lastError;
  }

  let decodeCtx = null;
  function getDecodeCtx() {
    if (!decodeCtx || decodeCtx.state === 'closed') decodeCtx = new AudioContext();
    return decodeCtx;
  }

  async function getAudioBuffer(url) {
    const key = url;
    if (audioCache.has(key)) return audioCache.get(key);
    if (audioRequests.has(key)) return audioRequests.get(key);

    const request = (async () => {
      const cacheKey = `preview:${url}`;
      const cached = await readCachedAudio(cacheKey);
      if (cached) {
        audioCache = new Map(audioCache).set(key, cached);
        return cached;
      }

      const raw = await fetchAudioWithRetry(url);
      const mp3 = unscramble(raw);
      audioCache = new Map(audioCache).set(key, mp3);
      writeCachedAudio(cacheKey, mp3);
      return mp3;
    })().finally(() => {
      audioRequests.delete(key);
    });

    audioRequests.set(key, request);
    return request;
  }

  async function prefetchAudio(items) {
    const chunkSize = 2;
    const preloadLimit = 10;
    const preloadItems = items.slice(0, preloadLimit);
    for (let i = 0; i < preloadItems.length; i += chunkSize) {
      const chunk = preloadItems.slice(i, i + chunkSize);
      await Promise.allSettled(chunk.map(s => getAudioBuffer(s.url).catch(() => {})));
      await delay(150);
    }
  }

  async function genWaveform(sample) {
    if (waveData[sample.uuid] || waveLoading[sample.uuid]) return;
    waveLoading = { ...waveLoading, [sample.uuid]: true };
    try {
      const mp3 = await getAudioBuffer(sample.url);
      const ctx = getDecodeCtx();
      const buf = await ctx.decodeAudioData(mp3.buffer.slice(0));
      const ch = buf.getChannelData(0);
      const bars = 100;
      const step = Math.max(1, Math.floor(ch.length / bars));
      const peaks = [];
      for (let i = 0; i < bars && i * step < ch.length; i++) {
        let sum = 0;
        const end = Math.min((i + 1) * step, ch.length);
        for (let j = i * step; j < end; j++) sum += Math.abs(ch[j]);
        peaks.push(Math.min(1, (sum / (end - i * step)) * 3));
      }
      waveData = { ...waveData, [sample.uuid]: peaks };
      sampleErrors = { ...sampleErrors, [sample.uuid]: null };
    } catch (e) {
      sampleErrors = { ...sampleErrors, [sample.uuid]: describeAudioError(e) };
    }
    waveLoading = { ...waveLoading, [sample.uuid]: false };
  }

  function describeAudioError(e) {
    const msg = String(e?.message || e || '');
    if (/browser verification/i.test(msg)) return 'verification required';
    if (/HTTP 429|rate/i.test(msg)) return 'rate limited';
    if (/HTML instead of audio/i.test(msg)) return 'blocked response';
    if (/empty/i.test(msg)) return 'empty audio';
    return 'audio unavailable';
  }

  function stopPreview() {
    playbackToken += 1;
    if (progressRaf) { cancelAnimationFrame(progressRaf); progressRaf = null; }
    const src = sourceNode;
    sourceNode = null;
    playingId = null;
    playingProgress = 0;
    playingDuration = 0;
    if (!src) return;
    src.onended = null;
    try { src.stop(); } catch {}
    try { src.disconnect(); } catch {}
  }

  async function togglePreview(sample) {
    if (playingId === sample.uuid) { stopPreview(); return; }
    stopPreview();
    const token = playbackToken;
    try {
      const mp3 = await getAudioBuffer(sample.url);
      if (!playCtx || playCtx.state === 'closed') playCtx = new AudioContext();
      if (playCtx.state === 'suspended') await playCtx.resume();
      if (token !== playbackToken) return;
      const buf = await playCtx.decodeAudioData(mp3.buffer.slice(0));
      if (token !== playbackToken) return;
      const src = playCtx.createBufferSource();
      src.buffer = buf;
      src.connect(playCtx.destination);
      src.start();
      sourceNode = src;
      playingId = sample.uuid;
      playingDuration = buf.duration;
      trackStat(sample.uuid, 'plays');
      const startTime = playCtx.currentTime;
      const rafUpdate = () => {
        if (playingId !== sample.uuid) return;
        const elapsed = playCtx.currentTime - startTime;
        playingProgress = Math.min(elapsed / buf.duration, 1);
        if (playingProgress < 1) progressRaf = requestAnimationFrame(rafUpdate);
      };
      progressRaf = requestAnimationFrame(rafUpdate);
      src.onended = () => {
        if (token === playbackToken && playingId === sample.uuid) {
          playingId = null; sourceNode = null;
        }
      };
      sampleErrors = { ...sampleErrors, [sample.uuid]: null };
    } catch (e) {
      console.error('Preview failed:', e);
      sampleErrors = { ...sampleErrors, [sample.uuid]: describeAudioError(e) };
    }
  }

  async function getRawBytes(url) {
    const key = `raw:${url}`;
    if (audioCache.has(key)) return audioCache.get(key);
    if (audioRequests.has(key)) return audioRequests.get(key);

    const request = (async () => {
      const cached = await readCachedAudio(key);
      if (cached) {
        audioCache = new Map(audioCache).set(key, cached);
        return cached;
      }

      const bytes = await fetchAudioWithRetry(url);
      audioCache = new Map(audioCache).set(key, bytes);
      writeCachedAudio(key, bytes);
      return bytes;
    })().finally(() => {
      audioRequests.delete(key);
    });

    audioRequests.set(key, request);
    return request;
  }

  async function decodeAudioBytes(bytes) {
    const ctx = getDecodeCtx();
    return ctx.decodeAudioData(bytes.buffer.slice(0));
  }

  function trimStartSilence(audioBuffer, threshold = 0.001) {
    const ch = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    let firstNonSilent = 0;
    for (let i = 0; i < len; i++) {
      let maxAmp = 0;
      for (let c = 0; c < ch; c++) {
        const abs = Math.abs(audioBuffer.getChannelData(c)[i]);
        if (abs > maxAmp) maxAmp = abs;
      }
      if (maxAmp > threshold) { firstNonSilent = i; break; }
    }
    if (firstNonSilent === 0) return audioBuffer;
    const newLen = len - firstNonSilent;
    const ctx = getDecodeCtx();
    const trimmed = ctx.createBuffer(ch, newLen, audioBuffer.sampleRate);
    for (let c = 0; c < ch; c++) {
      const oldData = audioBuffer.getChannelData(c);
      const newData = trimmed.getChannelData(c);
      for (let i = 0; i < newLen; i++) newData[i] = oldData[i + firstNonSilent];
    }
    return trimmed;
  }

  async function getDownloadSource(sample, usePreview) {
    if (usePreview) {
      return { bytes: await getAudioBuffer(sample.url), source: 'preview' };
    }
    try {
      return { bytes: await getRawBytes(sample.downloadUrl), source: 'download' };
    } catch (e) {
      console.warn('Download URL failed, falling back to preview:', e);
      return { bytes: await getAudioBuffer(sample.url), source: 'preview' };
    }
  }

  async function makeDownloadBlob(sample, usePreview) {
    let { bytes, source } = await getDownloadSource(sample, usePreview);
    if (downloadFormat === 'original') {
      if (source === 'preview') return { blob: new Blob([bytes], { type: 'audio/mpeg' }), ext: 'mp3' };
      if (isWav(bytes)) return { blob: new Blob([bytes], { type: 'audio/wav' }), ext: 'wav' };
      try {
        await decodeAudioBytes(bytes);
        return { blob: new Blob([bytes], { type: 'audio/mpeg' }), ext: 'mp3' };
      } catch {
        bytes = await getAudioBuffer(sample.url);
        return { blob: new Blob([bytes], { type: 'audio/mpeg' }), ext: 'mp3' };
      }
    }
    if (isWav(bytes)) return { blob: new Blob([bytes], { type: 'audio/wav' }), ext: 'wav' };
    try {
      const ab = trimStartSilence(await decodeAudioBytes(bytes));
      return { blob: new Blob([wavEncode(ab)], { type: 'audio/wav' }), ext: 'wav' };
    } catch (e) {
      if (source === 'preview') throw e;
      bytes = await getAudioBuffer(sample.url);
      const ab = trimStartSilence(await decodeAudioBytes(bytes));
      return { blob: new Blob([wavEncode(ab)], { type: 'audio/wav' }), ext: 'wav' };
    }
  }

  async function download(sample) {
    if (suppressNextDownloadClick) { suppressNextDownloadClick = false; return; }
    dlStatus = { uuid: sample.uuid };
    try {
      const baseName = cleanBaseName(sample);
      const usePreview = !sample.downloadUrl || sample.downloadUrl === sample.url;
      const requestedExt = downloadFormat === 'original' ? 'mp3' : 'wav';
      const requestedName = baseName + '.' + requestedExt;
      const browserSaveTarget = await createBrowserSaveTarget(requestedName, requestedExt);
      if (browserSaveTarget === false) return;
      const { blob, ext } = await makeDownloadBlob(sample, usePreview);
      const name = baseName + '.' + ext;
      if (browserSaveTarget) await browserSaveTarget.write(blob);
      else saveBlob(blob, name);
      sampleErrors = { ...sampleErrors, [sample.uuid]: null };
    } catch (e) {
      console.error('Download failed:', e);
      sampleErrors = { ...sampleErrors, [sample.uuid]: describeAudioError(e) };
    }
    dlStatus = { uuid: null };
  }

  async function openPack(pack) {
    viewingPack = pack;
    packLoading = true;
    packSamples = [];
    packPage = 1;
    packTotalPages = 1;
    try {
      const result = await searchSamples('', {
        assetType: 'sample',
        parentAssetUuid: pack.uuid,
        sort: 'popularity',
        order: 'DESC',
      });
      packSamples = result.items;
      packPage = result.page || 1;
      packTotalPages = result.totalPages || 1;
      prefetchAudio(packSamples);
    } catch (e) {
      error = e.message || 'Failed to load pack samples';
    } finally {
      packLoading = false;
    }
  }

  async function goToPackPage(page) {
    if (packLoading || !viewingPack || page < 1 || page > packTotalPages) return;
    packLoading = true;
    try {
      const result = await searchSamples('', {
        assetType: 'sample',
        parentAssetUuid: viewingPack.uuid,
        sort: 'popularity',
        order: 'DESC',
        page,
      });
      packSamples = result.items;
      packPage = result.page || page;
      packTotalPages = result.totalPages || packTotalPages;
      prefetchAudio(result.items);
    } catch (e) {
      error = e.message || 'Failed to load pack samples';
    } finally {
      packLoading = false;
    }
  }

  function closePack() {
    viewingPack = null;
    packSamples = [];
    stopPreview();
  }

  function sampleCount(pack) {
    const c = pack.childAssetCounts?.find(c => c.type === 'sample');
    return c ? c.count : '?';
  }

  let suggestTimer;

  function handleSearchInput(value) {
    search = value;
    clearTimeout(suggestTimer);
    if (value.trim().length < 1) { suggestions = []; suggestShow = false; return; }
    suggestTimer = setTimeout(async () => {
      const results = await searchAutocomplete(value.trim());
      suggestions = results;
      suggestShow = results.length > 0;
    }, 150);
  }

  function closeSuggest() { suggestShow = false; }
</script>

<div class="app-shell">
  <Topbar
    {currentView}
    dlCount={dlQueue.filter(d => d.status !== 'done').length}
    onNavigate={(view) => { stopPreview(); if (view !== 'downloads') closePack(); currentView = view; }}
    onHome={() => (closePack(), currentView = 'downloads')}
  />

  <main class="content">
    {#if currentView === 'downloads'}
      {#if viewingPack}
        <PackDetail
          pack={viewingPack}
          samples={packSamples}
          loading={packLoading}
          playingId={playingId}
          playingProgress={playingProgress}
          waveData={waveData}
          waveLoading={waveLoading}
          sampleErrors={sampleErrors}
          dlStatus={dlStatus}
          favoriteMap={favorites}
          page={packPage}
          totalPages={packTotalPages}
          onClose={closePack}
          onTogglePreview={togglePreview}
          onDownload={(s) => addToDlQueue(s)}
          onGenWaveform={genWaveform}
          onToggleFavorite={toggleFavorite}
        />
      {:else}
        <SearchArea
          search={search}
          {loading}
          {total}
          assetType={assetType}
          showFilters={showFilters}
          filterKey={filterKey}
          filterChord={filterChord}
          filterMinBpm={filterMinBpm}
          filterMaxBpm={filterMaxBpm}
          filterSort={filterSort}
          filterCategory={filterCategory}
          tagSummary={tagSummary}
          selectedTags={selectedTags}
          anyFilterActive={anyFilterActive()}
          suggestions={suggestions}
          suggestShow={suggestShow}
          onSearch={doSearch}
          onInputChange={handleSearchInput}
          onAssetTypeChange={(type) => (assetType = type, doSearch())}
          onToggleFilters={() => showFilters = !showFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onToggleTag={toggleTag}
          onClearCache={clearAudioCache}
          onClearUserData={clearUserData}
          onClearBoth={() => { clearAudioCache(); clearUserData(); }}
          onSurprise={() => { randomDiscovery(); closeSuggest(); }}
          {getCacheSize}
          {getUserDataSize}
        />

        {#if error}
          <div class="error">{error}</div>
        {/if}

        {#if loading && !samples.length}
          <div class="loading">searching&hellip;</div>
        {/if}

        {#if samples.length > 0}
          {#if assetType === 'pack'}
            <div class="pack-grid">
              {#each samples as pack}
                <PackCard
                  pack={pack}
                  sampleCount={sampleCount(pack)}
                  favorited={!!favorites[pack.uuid]}
                  onClick={openPack}
                  onToggleFavorite={toggleFavorite}
                />
              {/each}
            </div>
          {:else}
            <div class="results">
              {#each samples as sample}
                <SampleRow
                  sample={sample}
                  playingId={playingId}
                  playingProgress={playingProgress}
                  waveData={waveData[sample.uuid]}
                  waveLoading={waveLoading[sample.uuid]}
                  sampleError={sampleErrors[sample.uuid]}
                  dlStatus={dlStatus}
                  favorited={!!favorites[sample.uuid]}
                  onTogglePreview={togglePreview}
                  onDownload={(s) => addToDlQueue(s)}
                  onOpenPack={(s) => { openPack(extractPack(s.pack)); currentView = 'downloads'; }}
                  onGenWaveform={genWaveform}
                  onToggleFavorite={toggleFavorite}
                />
              {/each}
            </div>

          {#if hadMore()}
            <div class="load-more-wrap">
              <button class="load-more" onclick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'loading&hellip;' : 'load more'}
              </button>
            </div>
          {/if}
        {/if}
      {:else if hasSearched && !loading}
          <div class="empty"><p>no results</p></div>
        {/if}
      {/if}

      {#if dlQueue.length > 0}
        <div class="dl-queue">
          <h3 class="dl-queue-header">Download Queue ({dlQueue.filter(d => d.status !== 'done').length} remaining)</h3>
          <div class="dl-queue-list">
            {#each dlQueue.slice(-20).reverse() as item}
              <div class="dl-queue-item" class:done={item.status === 'done'} class:failed={item.status === 'failed'}>
                <span class="dl-queue-name" title={item.sampleName || item.name}>{item.sampleName || item.name || item.uuid.slice(0, 8)}</span>
                <span class="dl-queue-status">
                  {#if item.status === 'queued'}<Clock size={14} />
                  {:else if item.status === 'downloading'}<Download size={14} />
                  {:else if item.status === 'done'}<CheckCircle size={14} />
                  {:else if item.status === 'failed'}<CircleX size={14} />
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    {:else if currentView === 'favourites'}
      {#if error}
        <div class="error">{error}</div>
      {/if}
      {#if loading}
        <div class="loading">searching&hellip;</div>
      {/if}
      <div class="fav-tabs">
        <button class:active={favType === 'sample'} onclick={() => favType = 'sample'}>Samples</button>
        <button class:active={favType === 'pack'} onclick={() => favType = 'pack'}>Packs</button>
      </div>
      {#if favType === 'sample'}
        {@const favSamples = Object.values(favorites).filter(f => (f._type || 'sample') === 'sample')}
        {#if favSamples.length > 0}
          <div class="results">
            {#each favSamples as sample (sample.uuid)}
              <SampleRow
                sample={sample}
                playingId={playingId}
                playingProgress={playingProgress}
                waveData={waveData[sample.uuid]}
                waveLoading={waveLoading[sample.uuid]}
                sampleError={sampleErrors[sample.uuid]}
                dlStatus={dlStatus}
                favorited={!!favorites[sample.uuid]}
                onTogglePreview={togglePreview}
                onDownload={(s) => addToDlQueue(s)}
                onOpenPack={(s) => { openPack(extractPack(s.pack)); currentView = 'downloads'; }}
                onToggleFavorite={toggleFavorite}
              />
            {/each}
          </div>
        {:else if !loading}
          <div class="empty"><p>no favourite samples yet</p></div>
        {/if}
      {:else}
        {@const favPacks = Object.values(favorites).filter(f => f._type === 'pack')}
        {#if favPacks.length > 0}
          <div class="pack-grid">
            {#each favPacks as fav (fav.uuid)}
              <PackCard
                pack={fav}
                sampleCount={fav.sampleCount ?? '?'}
                favorited={!!favorites[fav.uuid]}
                onClick={(p) => { openPack(p); currentView = 'downloads'; }}
                onToggleFavorite={toggleFavorite}
              />
            {/each}
          </div>
        {:else if !loading}
          <div class="empty"><p>no favourite packs yet</p></div>
        {/if}
      {/if}

    {:else if currentView === 'settings'}
      <SettingsPage
        dark={dark}
        downloadFormat={downloadFormat}
        settingsSection={settingsSection}
        stats={stats}
        onToggleTheme={toggleTheme}
        onFormatChange={(fmt) => downloadFormat = fmt}
        onClearCache={clearAudioCache}
        onSectionChange={(s) => settingsSection = s}
      />
    {/if}
  </main>
</div>
