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

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
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
      ...corsHeaders(),
      ...(resp.headers.get('content-type') ? { 'content-type': resp.headers.get('content-type') } : {}),
    };

    return new Response(responseBody, {
      status: resp.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response(e.message, {
      status: 500,
      headers: corsHeaders(),
    });
  }
}
