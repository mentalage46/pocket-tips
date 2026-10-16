#!/usr/bin/env node
// Verifies every relative link in docs/ resolves to a document (or asset) and
// that heading anchors exist. Exit code 1 when something is broken.
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { buildManifest } from './build-manifest.mjs';
import { rewriteHref, parseRoute, dirname } from '../assets/core.js';

const root = process.argv[2] ?? 'docs';
const manifest = await buildManifest(root);
const files = new Set(Object.keys(manifest.docs));
const dirs = new Set();
for (const p of files) { let d = dirname(p); while (d) { dirs.add(d); d = dirname(d); } }
const index = { files, dirs };

const LINK = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const problems = [];
let total = 0;

for (const path of files) {
  const text = await readFile(join(root, path), 'utf8');
  let fence = false;
  let lineNo = 0;
  for (const line of text.split(/\r?\n/)) {
    lineNo++;
    if (/^\s{0,3}(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    for (const m of line.matchAll(LINK)) {
      total++;
      const { kind, href } = rewriteHref(m[1], path, index, root);
      if (kind === 'missing') { problems.push(`${path}:${lineNo}  missing document  ${m[1]}`); continue; }
      if (kind === 'asset') {
        const ok = await stat(decodeURIComponent(href)).then((s) => s.isFile()).catch(() => false);
        if (!ok) problems.push(`${path}:${lineNo}  missing asset  ${m[1]}`);
        continue;
      }
      if (kind === 'route') {
        const { path: target, id } = parseRoute(href);
        if (!id) continue;
        const ids = new Set(manifest.docs[target]?.headings.map((h) => h.id) ?? []);
        if (!ids.has(id)) problems.push(`${path}:${lineNo}  missing anchor  ${m[1]}  (in ${target})`);
      }
    }
  }
}

console.log(`checked ${total} links in ${files.size} documents`);
for (const p of problems) console.log('  ✖ ' + p);
if (problems.length) { console.log(`${problems.length} problem(s)`); process.exit(1); }
console.log('all links resolve');
