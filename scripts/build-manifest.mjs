#!/usr/bin/env node
// Scans docs/ and writes manifest.json: the folder tree plus per-document
// titles and headings. Zero dependencies. Run with `npm run build`.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSlugger } from '../assets/core.js';

const IGNORED = new Set(['node_modules']);
const collator = new Intl.Collator(['ko', 'en'], { numeric: true, sensitivity: 'base' });

/** Title (first H1, else file stem) and headings of one markdown source. */
export function extractMeta(markdown, fallbackName) {
  const slug = createSlugger();
  const headings = [];
  let title = null;
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!h) continue;
    const text = stripInline(h[2]);
    headings.push({ level: h[1].length, text, id: slug(text) });
    if (title === null && h[1].length === 1) title = text;
  }
  return { title: title ?? fallbackName.replace(/\.md$/i, ''), headings };
}

function stripInline(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Walk a directory and return { tree, docs }. Paths use '/' relative to root. */
export async function buildTree(root) {
  const docs = {};
  async function walk(abs, rel) {
    const entries = (await readdir(abs, { withFileTypes: true }))
      .filter((e) => !e.name.startsWith('.') && !IGNORED.has(e.name));
    const files = [];
    const dirs = [];
    for (const e of entries) {
      const childAbs = join(abs, e.name);
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        const node = await walk(childAbs, childRel);
        if (node.children.length || node.index) dirs.push(node);
      } else if (e.isFile() && /\.md$/i.test(e.name)) {
        const meta = extractMeta(await readFile(childAbs, 'utf8'), e.name);
        docs[childRel] = meta;
        files.push({ type: 'file', name: e.name, path: childRel, title: meta.title });
      }
    }
    files.sort((a, b) => collator.compare(a.name, b.name));
    dirs.sort((a, b) => collator.compare(a.name, b.name));
    const indexFile = files.find((f) => f.name.toLowerCase() === 'readme.md');
    const children = [...files.filter((f) => f !== indexFile), ...dirs];
    const name = rel.split('/').pop() ?? '';
    return {
      type: 'dir', name, path: rel,
      title: name || 'Home',
      index: indexFile ? indexFile.path : null,
      children,
    };
  }
  const rootNode = await walk(root, '');
  return { tree: rootNode.children, home: rootNode.index, docs };
}

/**
 * @param root  directory to scan
 * @param base  URL prefix the viewer uses to fetch documents (relative to index.html)
 */
export async function buildManifest(root = 'docs', base = 'docs') {
  const { tree, home, docs } = await buildTree(root);
  return { generatedAt: new Date().toISOString(), root: base.replace(/\/+$/, ''), home, tree, docs };
}

async function main() {
  const root = process.argv[2] ?? 'docs';
  const out = process.argv[3] ?? 'manifest.json';
  const manifest = await buildManifest(root, process.argv[4] ?? relative(process.cwd(), root).split(sep).join('/'));
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n');
  const count = Object.keys(manifest.docs).length;
  console.log(`manifest: ${count} documents from ${relative(process.cwd(), root) || '.'} → ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
