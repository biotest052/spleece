const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
];

const REFERERS = [
  'https://splice.com/',
  'https://splice.com/samples',
  'https://splice.com/packs',
  'https://splice.com/account',
];

const ORIGINS = [
  'https://splice.com',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP() {
  return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}`;
}

function corsHeaders(allowMethods) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': allowMethods,
    'access-control-allow-headers': 'content-type',
  };
}

async function handleGraphQL(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders('POST, OPTIONS') });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders('POST, OPTIONS') });
  }

  const body = await request.text();
  const resp = await fetch('https://surfaces-graphql.splice.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('content-type') || 'application/json',
      'Origin': randomChoice(ORIGINS),
      'Referer': randomChoice(REFERERS),
      'User-Agent': randomChoice(USER_AGENTS),
      'X-Forwarded-For': randomIP(),
    },
    body: body || undefined,
  });

  const responseBody = await resp.arrayBuffer();
  const responseHeaders = {
    ...corsHeaders('POST, OPTIONS'),
    ...(resp.headers.get('content-type') ? { 'content-type': resp.headers.get('content-type') } : {}),
  };

  return new Response(responseBody, { status: resp.status, headers: responseHeaders });
}

async function handleAudioProxy(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders('GET, OPTIONS') });
  }
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders('GET, OPTIONS') });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('missing url', { status: 400, headers: corsHeaders('GET, OPTIONS') });
  }

  const resp = await fetch(target, {
    headers: {
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      'Origin': randomChoice(ORIGINS),
      'Referer': randomChoice(REFERERS),
      'User-Agent': randomChoice(USER_AGENTS),
      'X-Forwarded-For': randomIP(),
    },
  });

  const responseBody = await resp.arrayBuffer();
  const responseHeaders = {
    ...corsHeaders('GET, OPTIONS'),
    ...(resp.headers.get('content-type') ? { 'content-type': resp.headers.get('content-type') } : {}),
    ...(resp.headers.get('content-length') ? { 'content-length': resp.headers.get('content-length') } : {}),
  };

  return new Response(responseBody, { status: resp.status, headers: responseHeaders });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/graphql') {
      return handleGraphQL(request);
    }

    if (url.pathname === '/api/proxy') {
      return handleAudioProxy(request);
    }

    return env.ASSETS.fetch(request);
  },
};
