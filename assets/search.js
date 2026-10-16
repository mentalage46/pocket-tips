// Pure search helpers: title/heading search over the manifest and full-text
// search over lazily loaded document bodies. No DOM.

const HEADING = /^\s{0,3}#{1,6}\s+/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * Split a document into searchable lines, each tagged with the id of the
 * heading it sits under. Heading ids come from the manifest so they match
 * what the viewer renders.
 */
export function buildBodyIndex(markdown, headings = []) {
  const lines = [];
  let h = -1;
  let fence = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const f = raw.match(FENCE);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (!fence && HEADING.test(raw)) {
      if (h + 1 < headings.length) h++;
      continue;
    }
    const text = stripInline(raw).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || /^[-: ]+$/.test(text)) continue;
    lines.push({ text, id: h >= 0 ? headings[h].id : '' });
  }
  return lines;
}

/** Remove inline Markdown so snippets read as plain text. */
export function stripInline(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^*\w])[*_]([^*_\n]+?)[*_](?=[^*\w]|$)/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/<\/?(?:a|b|i|u|em|strong|br|hr|p|div|span|img|kbd|code|pre|details|summary|sub|sup|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|blockquote|small|mark|del|ins|picture|source|video|audio|figure|figcaption|center|font)\b[^>]*>/gi, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^\s{0,3}>\s?/, '');
}

export function tokenize(query) {
  return String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Search titles, paths, headings and (when provided) bodies.
 * @param terms   lowercase terms; all must match (AND)
 * @param docs    manifest.docs
 * @param bodies  Map<path, lines from buildBodyIndex> (may be partial/empty)
 * @returns hits sorted: title > heading > body, then by path
 */
export function searchDocs(terms, docs, bodies = new Map(), { maxHeadings = 4, maxLines = 3 } = {}) {
  if (!terms.length) return [];
  const hits = [];
  for (const [path, meta] of Object.entries(docs)) {
    const hay = `${meta.title} ${path}`.toLowerCase();
    const titleHit = terms.every((t) => hay.includes(t));
    const headingHits = meta.headings
      .filter((h) => h.level > 1 && terms.every((t) => h.text.toLowerCase().includes(t)))
      .slice(0, maxHeadings);
    const lineHits = [];
    const body = bodies.get(path);
    if (body) {
      for (const line of body) {
        const lower = line.text.toLowerCase();
        if (terms.every((t) => lower.includes(t))) {
          lineHits.push({ text: excerpt(line.text, terms[0]), id: line.id });
          if (lineHits.length >= maxLines) break;
        }
      }
    }
    if (titleHit || headingHits.length || lineHits.length) {
      hits.push({ path, meta, titleHit, headingHits, lineHits, score: titleHit ? 3 : headingHits.length ? 2 : 1 });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return hits;
}

/** Trim a long line to a window around the first match. */
export function excerpt(text, term, width = 90) {
  if (text.length <= width) return text;
  const at = text.toLowerCase().indexOf(term);
  const start = Math.max(0, Math.min(at - Math.floor(width / 3), text.length - width));
  const end = Math.min(text.length, start + width);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
