#!/usr/bin/env node
// Minimal static dev server (no dependencies). Regenerates manifest.json on
// every request for it, so new or renamed docs show up on reload.
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { buildManifest } from './build-manifest.mjs';

const ROOT = resolve(process.argv[2] ?? '.');
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/manifest.json') {
      const manifest = await buildManifest(join(ROOT, 'docs'), 'docs');
      return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(manifest));
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT + sep) && file !== ROOT) return send(res, 403, 'text/plain', 'forbidden');
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) return send(res, 404, 'text/plain', 'not found');
    send(res, 200, TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', await readFile(file));
  } catch (err) {
    send(res, 500, 'text/plain', String(err));
  }
}).listen(PORT, () => {
  console.log(`Pocket Tips viewer: http://localhost:${PORT}/  (root: ${ROOT})`);
});

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}
