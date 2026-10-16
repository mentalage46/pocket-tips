// Pure helpers shared by the browser viewer and the Node build/test scripts.
// No DOM, no fetch — everything here is unit-testable.

/** GitHub-style heading slug. Keeps Unicode letters/digits (Korean included). */
export function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s+/g, '-');
}

/** Slugger that appends -1, -2, … for duplicate headings within one document. */
export function createSlugger() {
  const seen = new Map();
  return (text) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

/** Collapse ., .., duplicate and leading/trailing slashes. Never escapes above root. */
export function normalizePath(path) {
  const out = [];
  for (const seg of String(path).split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return out.join('/');
}

export function dirname(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

/** Resolve a (possibly percent-encoded) relative href against the current document path. */
export function resolveRelative(fromDoc, href) {
  const decoded = safeDecode(href);
  const base = decoded.startsWith('/') ? '' : dirname(fromDoc);
  return normalizePath(base ? `${base}/${decoded}` : decoded);
}

export function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** `#/dir/file.md?id=heading` → { path, id }. Also accepts legacy `#/file.md#heading`. */
export function parseRoute(hash) {
  let rest = String(hash || '');
  if (rest.startsWith('#')) rest = rest.slice(1);
  if (rest.startsWith('/')) rest = rest.slice(1);
  let id = '';
  const q = rest.indexOf('?');
  if (q !== -1) {
    const params = new URLSearchParams(rest.slice(q + 1));
    id = params.get('id') ?? '';
    rest = rest.slice(0, q);
  }
  const h = rest.indexOf('#');
  if (h !== -1) {
    if (!id) id = safeDecode(rest.slice(h + 1));
    rest = rest.slice(0, h);
  }
  return { path: normalizePath(safeDecode(rest)), id };
}

export function buildHash(path, id = '') {
  const base = `#/${encodePath(path)}`;
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

/**
 * Map a normalized content path to a document in the manifest.
 * Directories resolve to their README.md. '' resolves to the home page.
 */
export function resolveDoc(path, index) {
  const p = normalizePath(path);
  if (p === '') return index.files.has('README.md') ? 'README.md' : null;
  if (index.files.has(p)) return p;
  if (index.dirs.has(p)) {
    const readme = `${p}/README.md`;
    return index.files.has(readme) ? readme : null;
  }
  return null;
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Decide what an href inside a rendered document should become.
 * Returns { kind: 'route' | 'external' | 'asset' | 'missing', href }.
 */
export function rewriteHref(href, currentDoc, index, docsBase = 'docs') {
  const raw = String(href).trim();
  if (raw.startsWith('#/')) return { kind: 'route', href: raw };
  if (EXTERNAL.test(raw)) return { kind: 'external', href: raw };

  const hashAt = raw.indexOf('#');
  const target = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : safeDecode(raw.slice(hashAt + 1));

  if (target === '') return { kind: 'route', href: buildHash(currentDoc, frag) };

  const resolved = resolveRelative(currentDoc, target);
  const doc = resolveDoc(resolved, index);
  if (doc) return { kind: 'route', href: buildHash(doc, frag) };
  if (/\.md$/i.test(resolved) || index.dirs.has(resolved) || target.endsWith('/')) {
    return { kind: 'missing', href: resolved };
  }
  return { kind: 'asset', href: `${docsBase}/${encodePath(resolved)}` };
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
