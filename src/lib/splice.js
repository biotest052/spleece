const GRAPHQL = '/graphql';
const PAGE_SIZE = 50;

export class SpliceApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {number} [options.status] - HTTP status code
   * @param {string} [options.code] - Error code (challenge, graphql, http)
   * @param {string} [options.details] - Additional error details
   */
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'SpliceApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const SEARCH_QUERY = `
query SamplesSearch(
  $attributes: [AssetAttributeSlug!]
  $parent_asset_uuid: GUID
  $query: String
  $asset_type_slug: AssetTypeSlug = sample
  $order: SortOrder = DESC
  $sort: AssetSortType = popularity
  $random_seed: String
  $tags: [ID]
  $key: String
  $chord_type: String
  $bpm: String
  $min_bpm: Int
  $max_bpm: Int
  $limit: Int = 50
  $asset_category_slug: AssetCategorySlug
  $page: Int = 1
  $ac_uuid: String
  $licensed: Boolean
  $liked: Boolean
  $filepath: String
) {
  assetsSearch(
    filter: {attributes: $attributes, legacy: true, published: true, asset_type_slug: $asset_type_slug, query: $query, filepath: $filepath, tag_ids: $tags, key: $key, chord_type: $chord_type, bpm: $bpm, min_bpm: $min_bpm, max_bpm: $max_bpm, asset_category_slug: $asset_category_slug, ac_uuid: $ac_uuid, licensed: $licensed, liked: $liked}
    children: {parent_asset_uuid: $parent_asset_uuid}
    pagination: {page: $page, limit: $limit}
    sort: {sort: $sort, order: $order, random_seed: $random_seed}
  ) {
    items {
      ... on IAsset {
        uuid
        name
        asset_type_slug
        liked
        licensed
        tags { uuid label __typename }
        files { uuid name hash path asset_file_type_slug url __typename }
        __typename
      }
      ... on IAssetChild {
        parents(filter: {asset_type_slug: pack}) {
          items {
            ... on PackAsset {
              uuid
              name
              description
              main_genre
              permalink_slug
              permalink_base_url
              liked
              provider { uuid name image_path __typename }
              child_asset_counts { type count __typename }
              files { uuid asset_file_type_slug url path __typename }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      ... on SampleAsset {
        bpm
        key
        chord_type
        duration
        asset_category_slug
        catalog_uuid
        __typename
      }
      ... on GeneratedSampleAsset {
        bpm
        key
        chord_type
        duration
        asset_category_slug
        catalog_uuid
        __typename
      }
      ... on PackAsset {
        uuid
        name
        main_genre
        main_tag_permalink
        description
        liked
        permalink_slug
        permalink_base_url
        provider { uuid name permalink_slug __typename }
        files { uuid asset_file_type_slug url path __typename }
        child_asset_counts { type count __typename }
        __typename
      }
    }
    tag_summary { count tag { uuid label __typename } __typename }
    response_metadata { records __typename }
    pagination_metadata { currentPage totalPages __typename }
    __typename
  }
}
`;

const AUTOCOMPLETE_QUERY = `
query SoundsSearchAutocomplete($term: String!) {
  soundsSearchSuggestions(searchTerm: $term, limit: 7, context: "marketplace") {
    autocompleteUuid
    results { autocompleteTerm termType length offset __typename }
    __typename
  }
}`;

export async function searchAutocomplete(term) {
  const body = await graphqlFetch(AUTOCOMPLETE_QUERY, { term });
  return body?.data?.soundsSearchSuggestions?.results?.map(r => r.autocompleteTerm) || [];
}

export const RANDOM_TERMS = [
  'kick', 'snare', 'hihat', '808', 'drums', 'bass', 'lead', 'pad', 'pluck',
  'vocal', 'fx', 'texture', 'ambient', 'dark', 'warm', 'glitch', 'groove',
  'melody', 'arpeggio', 'chord', 'stutter', 'fill', 'rise', 'drop',
  'acoustic', 'electric', 'analog', 'digital', 'cinematic', 'lo-fi',
];

const PACK_QUERY = `
query PackByPermalink($permalink: String!) {
  pack: packAsset(permalink: $permalink) {
    uuid
    name
    main_genre
    main_tag_permalink
    description
    liked
    permalink_slug
    permalink_base_url
    provider { uuid name permalink_slug __typename }
    files { uuid asset_file_type_slug url path __typename }
    child_asset_counts { type count __typename }
    companion_packs {
      uuid
      name
      description
      permalink_slug
      main_genre
      provider { uuid name permalink_slug __typename }
      files { uuid asset_file_type_slug url path __typename }
      __typename
    }
    story {
      uuid
      background_url
      description
      title
      videos { background_url url __typename }
      __typename
    }
    __typename
  }
}
`;

export function proxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export function looksLikeChallenge(text = '') {
  return /cloudflare|turnstile|cf-chl|challenge-platform|checking your browser/i.test(text);
}

export function extractSample(item) {
  const files = item.files || [];
  const preview = files.find(f => f.asset_file_type_slug === 'preview_mp3') || files[0];
  if (!preview) return null;
  const download =
    files.find(f => /wav|audio|sample|original|source/i.test(f.asset_file_type_slug || '')) ||
    files.find(f => /\.wav(\?|$)/i.test(f.url || '')) ||
    preview;

  const parents = item.parents?.items || [];
  const parentPack = parents[0] || null;
  const packArtwork = parentPack?.files?.find(f => /image|artwork|cover/i.test(f.asset_file_type_slug || '')) || parentPack?.files?.find(f => /\.(jpg|jpeg|png|webp)/i.test(f.url || '')) || null;

  return {
    uuid: item.uuid,
    name: item.name,
    url: preview.url,
    downloadUrl: download.url,
    fileType: download.asset_file_type_slug,
    bpm: item.bpm,
    key: item.key,
    chordType: item.chord_type,
    duration: item.duration,
    assetType: item.asset_type_slug,
    category: item.asset_category_slug,
    tags: item.tags || [],
    liked: item.liked,
    licensed: item.licensed,
    pack: parentPack,
    packArtworkUrl: packArtwork?.url || null,
  };
}

export function extractPack(item) {
  const files = item.files || [];
  const artwork = files.find(f => /image|artwork|cover/i.test(f.asset_file_type_slug || '')) || files.find(f => /\.(jpg|jpeg|png|webp)/i.test(f.url || '')) || null;

  return {
    uuid: item.uuid,
    name: item.name,
    description: item.description,
    mainGenre: item.main_genre,
    permalink: item.permalink_slug,
    permalinkBaseUrl: item.permalink_base_url,
    provider: item.provider || null,
    files,
    artworkUrl: artwork?.url || null,
    childAssetCounts: item.child_asset_counts || [],
    liked: item.liked,
    assetType: item.asset_type_slug || 'pack',
  };
}

async function graphqlFetch(query, variables, signal) {
  const body = JSON.stringify({ query, variables });

  const resp = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    signal,
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (looksLikeChallenge(text)) {
      throw new SpliceApiError('Splice is asking for browser verification.', {
        status: resp.status,
        code: 'challenge',
        details: text.slice(0, 200),
      });
    }
    const parsed = tryJson(text);
    if (parsed?.errors) {
      throw new SpliceApiError(`API ${resp.status}: ${parsed.errors[0].message}`, {
        status: resp.status,
        code: 'graphql',
        details: JSON.stringify(parsed.errors),
      });
    }
    throw new SpliceApiError(`API ${resp.status}: ${text.slice(0, 200)}`, {
      status: resp.status,
      code: 'http',
    });
  }

  const text = await resp.text();
  if (looksLikeChallenge(text)) {
    throw new SpliceApiError('Splice is asking for browser verification.', {
      code: 'challenge',
    });
  }

  const parsed = JSON.parse(text);
  if (parsed.errors) {
    throw new SpliceApiError(parsed.errors[0].message, {
      code: 'graphql',
      details: JSON.stringify(parsed.errors),
    });
  }

  return parsed;
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Build filter object from search options
 * @param {Object} opts - Search options
 * @returns {Object} Filter object
 */
function buildFilter(opts) {
  const {
    query,
    tagUuids = [],
    key,
    chordType,
    bpm,
    minBpm,
    maxBpm,
    category,
    assetType = 'sample',
    parentAssetUuid,
  } = opts;

  const filter = { asset_type_slug: assetType };
  
  if (query) {
    filter.query = query;
    filter.filepath = query;
  }
  if (tagUuids.length) filter.tags = tagUuids;
  if (key) filter.key = key;
  if (chordType) filter.chord_type = chordType;
  if (bpm) filter.bpm = String(bpm);
  if (minBpm != null) filter.min_bpm = minBpm;
  if (maxBpm != null) filter.max_bpm = maxBpm;
  if (category) filter.asset_category_slug = category;
  if (parentAssetUuid) filter.parent_asset_uuid = parentAssetUuid;

  return filter;
}

/**
 * Build GraphQL variables from search options
 * @param {Object} filter - Built filter object
 * @param {Object} opts - Search options
 * @returns {Object} GraphQL variables
 */
function buildVariables(filter, opts) {
  const {
    sort = 'popularity',
    order = 'DESC',
    page = 1,
  } = opts;

  const variables = {
    ...filter,
    sort,
    order,
    limit: PAGE_SIZE,
    page,
    attributes: [],
    random_seed: null,
    ac_uuid: null,
    licensed: null,
    liked: null,
  };
  
  // Remove asset_type_slug as it's passed separately in GraphQL query
  delete variables.asset_type_slug;
  
  return variables;
}

export async function searchSamples(query, opts = {}) {
  const {
    signal,
    page = 1,
    tagUuids = [],
    key,
    chordType,
    bpm,
    minBpm,
    maxBpm,
    sort = 'popularity',
    order = 'DESC',
    category,
    assetType,
    parentAssetUuid,
  } = opts;

  const filter = buildFilter({ query, tagUuids, key, chordType, bpm, minBpm, maxBpm, category, assetType, parentAssetUuid });
  const variables = buildVariables(filter, { sort, order, page });

  const body = await graphqlFetch(SEARCH_QUERY, { ...variables, asset_type_slug: filter.asset_type_slug }, signal);

  const searchData = body?.data?.assetsSearch;
  if (!searchData?.items?.length) return { items: [], total: 0, tags: [] };

  const isPackSearch = (assetType || 'sample') === 'pack';

  const items = [];
  for (const item of searchData.items) {
    if (isPackSearch) {
      const p = extractPack(item);
      if (p) items.push(p);
    } else {
      const s = extractSample(item);
      if (s) items.push(s);
    }
  }

  return {
    items,
    total: searchData.response_metadata?.records ?? items.length,
    page: searchData.pagination_metadata?.currentPage ?? page,
    totalPages: searchData.pagination_metadata?.totalPages ?? 1,
    tags: searchData.tag_summary || [],
  };
}

export async function fetchPackByPermalink(permalink, { signal } = {}) {
  const body = await graphqlFetch(PACK_QUERY, { permalink }, signal);
  const packData = body?.data?.pack;
  if (!packData) return null;
  return extractPack(packData);
}

export function formatDuration(ms) {
  if (!ms) return '--:--';
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatKey(key, chord) {
  if (!key) return '';
  const note = key.toUpperCase();
  const suffix = chord === 'minor' ? 'm' : chord === 'major' ? '' : '';
  return `${note}${suffix}`;
}

export function formatBpm(bpm) {
  return bpm ? `${bpm}` : '';
}

export const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'recency', label: 'Newest' },
  { value: 'random', label: 'Random' },
];

export const KEY_OPTIONS = [
  { value: '', label: 'Any Key' },
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C#' },
  { value: 'Db', label: 'Db' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'D#' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#' },
  { value: 'Gb', label: 'Gb' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'G#' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'A#' },
  { value: 'Bb', label: 'Bb' },
  { value: 'B', label: 'B' },
];

export const CHORD_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
];

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'loop', label: 'Loops' },
  { value: 'oneshot', label: 'One Shots' },
  { value: 'drums', label: 'Drums' },
  { value: 'bass', label: 'Bass' },
  { value: 'melody', label: 'Melody' },
  { value: 'vocal', label: 'Vocal' },
  { value: 'fx', label: 'FX' },
  { value: 'percussion', label: 'Percussion' },
];
