import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

import { cloudflare } from "@cloudflare/vite-plugin";

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
  'https://splice.com',
  'https://splice.com',
  'https://splice.com',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP() {
  return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}`;
}

function audioProxyMiddleware(req, res) {
  (async () => {
    try {
      const u = new URL(req.url, 'http://localhost');
      const target = u.searchParams.get('url');
      if (!target) { res.statusCode = 400; res.end('missing url'); return; }
      const resp = await fetch(target, {
        headers: {
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
          'Origin': randomChoice(ORIGINS),
          'Referer': randomChoice(REFERERS),
          'User-Agent': randomChoice(USER_AGENTS),
          'X-Forwarded-For': randomIP(),
        },
      });
      res.statusCode = resp.status;
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-methods', 'GET');
      const ct = resp.headers.get('content-type');
      if (ct) res.setHeader('content-type', ct);
      const cl = resp.headers.get('content-length');
      if (cl) res.setHeader('content-length', cl);
      const buf = await resp.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (e) {
      res.statusCode = 500;
      res.end(e.message);
    }
  })();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function graphqlProxyMiddleware(req, res) {
  (async () => {
    try {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
        res.setHeader('access-control-allow-headers', 'content-type');
        res.end();
        return;
      }

      const body = await readBody(req);
      const resp = await fetch('https://surfaces-graphql.splice.com/graphql', {
        method: req.method || 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Origin': randomChoice(ORIGINS),
          'Referer': randomChoice(REFERERS),
          'User-Agent': randomChoice(USER_AGENTS),
          'X-Forwarded-For': randomIP(),
        },
        body: body.length ? body : undefined,
      });

      res.statusCode = resp.status;
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
      const ct = resp.headers.get('content-type');
      if (ct) res.setHeader('content-type', ct);
      const buf = await resp.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (e) {
      res.statusCode = 500;
      res.end(e.message);
    }
  })();
}

export default defineConfig({
  plugins: [svelte(), {
    name: 'proxy-audio',
    configureServer(server) {
      server.middlewares.use('/api/proxy', audioProxyMiddleware);
      server.middlewares.use('/graphql', graphqlProxyMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy', audioProxyMiddleware);
      server.middlewares.use('/graphql', graphqlProxyMiddleware);
    },
  }, cloudflare()],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
    },
  },
})