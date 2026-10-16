// Pocket Tips — Markdown static viewer (browser side).
// Routing: #/dir/file.md?id=heading-slug. Content lives under docs/ and is
// fetched on demand; the folder tree comes from manifest.json.
import {
  createSlugger, parseRoute, buildHash, resolveDoc, rewriteHref, resolveRelative, encodePath, dirname,
} from './core.js';

const MERMAID_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.esm.min.mjs';
const $ = (sel) => document.querySelector(sel);
const els = {
  tree: $('#tree'), results: $('#search-results'), search: $('#search'), article: $('#article'),
  breadcrumb: $('#breadcrumb'), footer: $('#doc-footer'), toc: $('#toc'), sidebar: $('#sidebar'),
  backdrop: $('#backdrop'), menuBtn: $('#menu-btn'), themeBtn: $('#theme-btn'),
};

const state = {
  manifest: null, index: null, docsBase: 'docs', current: null,
  cache: new Map(), expanded: loadSet('pt.expanded'), mermaid: null, tocObserver: null, navToken: 0,
};

marked.use({ gfm: true, breaks: false });

// ---------- boot ----------
(async function boot() {
  try {
    const res = await fetch('manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest.json ${res.status}`);
    state.manifest = await res.json();
  } catch (err) {
    els.article.innerHTML = `<div class="not-found"><h2>manifest.json을 불러올 수 없습니다</h2>
      <p class="muted">먼저 <code>npm run build</code>로 manifest를 만들고, <code>npm run serve</code>로 서버를 띄운 뒤 접속하세요.<br>
      (<code>file://</code>로 직접 열면 fetch가 차단됩니다.)</p><p class="muted">${escapeHtml(String(err))}</p></div>`;
    return;
  }
  state.docsBase = state.manifest.root || 'docs';
  state.index = buildIndex(state.manifest);
  renderTree();
  wireChrome();
  window.addEventListener('hashchange', navigate);
  navigate();
})();

function buildIndex(manifest) {
  const files = new Set(Object.keys(manifest.docs));
  const dirs = new Set();
  for (const p of files) {
    let d = dirname(p);
    while (d) { dirs.add(d); d = dirname(d); }
  }
  return { files, dirs };
}

// ---------- routing ----------
async function navigate() {
  const token = ++state.navToken;
  const { path, id } = parseRoute(location.hash);
  const doc = resolveDoc(path, state.index);
  closeSidebar();

  if (!doc) { renderNotFound(path); return; }

  // Canonicalize directory routes (#/AI → #/AI/README.md) without adding history entries.
  if (path !== '' && path !== doc) {
    history.replaceState(null, '', buildHash(doc, id));
  }

  const sameDoc = state.current === doc;
  if (!sameDoc) {
    let md;
    try {
      md = await loadDoc(doc);
    } catch (err) {
      if (token !== state.navToken) return;
      renderNotFound(doc, err);
      return;
    }
    if (token !== state.navToken) return;
    state.current = doc;
    await renderDoc(doc, md);
    if (token !== state.navToken) return;
  }
  highlightTree(doc);
  scrollToId(id, !sameDoc);
}

async function loadDoc(path) {
  if (state.cache.has(path)) return state.cache.get(path);
  const res = await fetch(`${state.docsBase}/${encodePath(path)}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  state.cache.set(path, text);
  return text;
}

function renderNotFound(path, err) {
  state.current = null;
  document.title = '문서를 찾을 수 없음 · Pocket Tips';
  els.breadcrumb.innerHTML = '';
  els.toc.innerHTML = '';
  els.footer.innerHTML = '';
  els.article.innerHTML = `<div class="not-found"><h2>문서를 찾을 수 없습니다</h2>
    <p><code>${escapeHtml(path || '(empty)')}</code></p>
    ${err ? `<p class="muted">${escapeHtml(String(err))}</p>` : ''}
    <p><a href="#/">홈으로 돌아가기</a></p></div>`;
  highlightTree(null);
}

// ---------- rendering ----------
async function renderDoc(path, markdown) {
  const meta = state.manifest.docs[path];
  const title = meta?.title ?? path;
  document.title = path === state.manifest.home ? 'Pocket Tips' : `${title} · Pocket Tips`;

  els.article.innerHTML = marked.parse(markdown);
  const headings = decorateHeadings(els.article);
  rewriteLinks(els.article, path);
  rewriteImages(els.article, path);
  wrapTables(els.article);
  const mermaidBlocks = prepareCodeBlocks(els.article);

  renderBreadcrumb(path);
  renderToc(headings);
  renderFooter(path);
  window.scrollTo({ top: 0 });

  if (mermaidBlocks.length) await renderMermaid(mermaidBlocks);
}

function decorateHeadings(root) {
  const slug = createSlugger();
  const headings = [];
  for (const h of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const text = h.textContent.trim();
    const id = slug(text);
    h.id = id;
    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = buildHash(state.current, id);
    a.setAttribute('aria-label', `${text} 링크`);
    a.textContent = '#';
    h.prepend(a);
    headings.push({ level: Number(h.tagName[1]), text, id, el: h });
  }
  return headings;
}

function rewriteLinks(root, current) {
  for (const a of root.querySelectorAll('a[href]')) {
    if (a.classList.contains('anchor')) continue;
    const { kind, href } = rewriteHref(a.getAttribute('href'), current, state.index, state.docsBase);
    a.setAttribute('href', href);
    if (kind === 'external') {
      a.classList.add('external');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else if (kind === 'missing') {
      a.classList.add('link-missing');
      a.title = `문서를 찾을 수 없습니다: ${href}`;
      a.removeAttribute('href');
    }
  }
}

function rewriteImages(root, current) {
  for (const img of root.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(src)) continue;
    img.src = `${state.docsBase}/${encodePath(resolveRelative(current, src))}`;
    img.loading = 'lazy';
  }
}

function wrapTables(root) {
  for (const table of root.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.replaceWith(wrap);
    wrap.append(table);
  }
}

function prepareCodeBlocks(root) {
  const mermaidBlocks = [];
  for (const code of root.querySelectorAll('pre > code')) {
    const pre = code.parentElement;
    if (code.classList.contains('language-mermaid')) {
      const holder = document.createElement('pre');
      holder.className = 'mermaid';
      holder.textContent = code.textContent;
      pre.replaceWith(holder);
      mermaidBlocks.push(holder);
      continue;
    }
    if (window.hljs) {
      const lang = [...code.classList].find((c) => c.startsWith('language-'))?.slice(9);
      if (!lang || hljs.getLanguage(lang)) hljs.highlightElement(code);
    }
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = '복사';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = '복사됨';
      } catch { btn.textContent = '실패'; }
      setTimeout(() => { btn.textContent = '복사'; }, 1500);
    });
    pre.append(btn);
  }
  return mermaidBlocks;
}

async function renderMermaid(blocks) {
  try {
    if (!state.mermaid) {
      const mod = await import(MERMAID_URL);
      state.mermaid = mod.default;
    }
    state.mermaid.initialize({ startOnLoad: false, theme: isDark() ? 'dark' : 'default', securityLevel: 'strict' });
    await state.mermaid.run({ nodes: blocks });
  } catch (err) {
    // Blocks detached by a navigation that happened mid-render are not a failure.
    const stale = blocks.filter((b) => b.isConnected && !b.querySelector('svg'));
    if (!stale.length) return;
    console.warn('mermaid render failed', err);
    for (const b of stale) b.insertAdjacentHTML('afterbegin', '<div class="muted">다이어그램을 렌더링하지 못했습니다.</div>');
  }
}

function renderBreadcrumb(path) {
  const parts = path.split('/');
  const frag = document.createDocumentFragment();
  frag.append(link('#/', '홈'));
  let acc = '';
  parts.forEach((seg, i) => {
    acc = acc ? `${acc}/${seg}` : seg;
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '/';
    frag.append(sep);
    const isLast = i === parts.length - 1;
    if (isLast) {
      if (seg.toLowerCase() === 'readme.md' && parts.length > 1) return;
      const cur = document.createElement('span');
      cur.className = 'current';
      cur.textContent = state.manifest.docs[path]?.title ?? seg;
      frag.append(cur);
    } else {
      const target = resolveDoc(acc, state.index);
      if (target) frag.append(link(buildHash(target), seg));
      else { const s = document.createElement('span'); s.textContent = seg; frag.append(s); }
    }
  });
  els.breadcrumb.replaceChildren(frag);
}

function renderToc(headings) {
  state.tocObserver?.disconnect();
  const items = headings.filter((h) => h.level >= 2 && h.level <= 4);
  if (items.length < 2) { els.toc.innerHTML = ''; return; }
  const ul = document.createElement('ul');
  for (const h of items) {
    const li = document.createElement('li');
    li.className = `d${h.level}`;
    li.append(link(buildHash(state.current, h.id), h.text));
    ul.append(li);
  }
  const title = document.createElement('h4');
  title.textContent = '이 페이지';
  els.toc.replaceChildren(title, ul);

  const links = new Map(items.map((h, i) => [h.el, ul.children[i].firstChild]));
  let active = null;
  state.tocObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    active?.classList.remove('active');
    active = links.get(visible[0].target);
    active?.classList.add('active');
  }, { rootMargin: '-64px 0px -70% 0px', threshold: 0 });
  for (const h of items) state.tocObserver.observe(h.el);
}

function renderFooter(path) {
  const raw = `${state.docsBase}/${encodePath(path)}`;
  els.footer.replaceChildren(
    extLink(raw, '원본 .md 보기'),
    Object.assign(document.createElement('span'), { textContent: path, className: 'muted' }),
  );
}

function scrollToId(id, fresh) {
  if (!id) { if (fresh) window.scrollTo({ top: 0 }); return; }
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  // Retrigger :target-style flash without touching location.hash.
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  el.classList.add('flash');
}

// ---------- sidebar tree ----------
function renderTree() {
  const { tree, home } = state.manifest;
  const root = document.createElement('ul');
  root.setAttribute('role', 'tree');
  if (home) {
    const li = document.createElement('li');
    li.className = 'home';
    li.dataset.path = home;
    const row = document.createElement('div');
    row.className = 'row';
    row.append(spacer(), treeLink('#/', state.manifest.docs[home]?.title ?? 'Home', home));
    li.append(row);
    root.append(li);
  }
  for (const node of tree) root.append(renderNode(node));
  els.tree.replaceChildren(root);
}

function renderNode(node) {
  const li = document.createElement('li');
  li.dataset.path = node.path;
  const row = document.createElement('div');
  row.className = 'row';
  if (node.type === 'file') {
    li.className = 'file';
    row.append(spacer(), treeLink(buildHash(node.path), node.title, node.path));
    li.append(row);
    return li;
  }
  const open = state.expanded.has(node.path);
  li.className = `dir${open ? '' : ' collapsed'}`;
  const toggle = document.createElement('button');
  toggle.className = 'toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', `${node.name} 펼치기/접기`);
  toggle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  toggle.addEventListener('click', () => setExpanded(li, li.classList.contains('collapsed')));
  row.append(toggle);
  if (node.index) {
    row.append(treeLink(buildHash(node.index), node.name, node.index));
  } else {
    const btn = document.createElement('button');
    btn.className = 'label';
    btn.type = 'button';
    btn.textContent = node.name;
    btn.addEventListener('click', () => setExpanded(li, li.classList.contains('collapsed')));
    row.append(btn);
  }
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = String(countDocs(node));
  row.append(count);
  li.append(row);
  const ul = document.createElement('ul');
  ul.setAttribute('role', 'group');
  for (const child of node.children) ul.append(renderNode(child));
  li.append(ul);
  return li;
}

function countDocs(node) {
  return node.children.reduce((n, c) => n + (c.type === 'file' ? 1 : countDocs(c)), node.index ? 1 : 0);
}

function treeLink(href, text, docPath) {
  const a = document.createElement('a');
  a.className = 'label';
  a.href = href;
  a.textContent = text;
  a.title = docPath;
  return a;
}

function spacer() {
  const s = document.createElement('span');
  s.className = 'spacer';
  return s;
}

function setExpanded(li, open) {
  li.classList.toggle('collapsed', !open);
  li.querySelector(':scope > .row > .toggle')?.setAttribute('aria-expanded', String(open));
  if (open) state.expanded.add(li.dataset.path); else state.expanded.delete(li.dataset.path);
  saveSet('pt.expanded', state.expanded);
}

function highlightTree(doc) {
  for (const row of els.tree.querySelectorAll('.row.active')) row.classList.remove('active');
  if (!doc) return;
  const li = [...els.tree.querySelectorAll('li')].find((el) =>
    el.dataset.path === doc || (el.classList.contains('dir') && `${el.dataset.path}/README.md` === doc));
  if (!li) return;
  li.querySelector(':scope > .row')?.classList.add('active');
  // Opening a folder's README should reveal its children too.
  if (li.classList.contains('dir') && li.classList.contains('collapsed')) setExpanded(li, true);
  let parent = li.parentElement?.closest('li.dir');
  while (parent) {
    if (parent.classList.contains('collapsed')) setExpanded(parent, true);
    parent = parent.parentElement?.closest('li.dir');
  }
  li.querySelector(':scope > .row')?.scrollIntoView({ block: 'nearest' });
}

// ---------- search ----------
function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    els.results.hidden = true;
    els.tree.hidden = false;
    return;
  }
  const terms = q.split(/\s+/);
  const hits = [];
  for (const [path, meta] of Object.entries(state.manifest.docs)) {
    const hay = `${meta.title} ${path}`.toLowerCase();
    const titleHit = terms.every((t) => hay.includes(t));
    const headingHits = meta.headings.filter((h) => h.level > 1 && terms.every((t) => h.text.toLowerCase().includes(t))).slice(0, 4);
    if (titleHit || headingHits.length) hits.push({ path, meta, titleHit, headingHits });
  }
  hits.sort((a, b) => Number(b.titleHit) - Number(a.titleHit) || a.path.localeCompare(b.path));

  const frag = document.createDocumentFragment();
  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.textContent = hits.length ? `${hits.length}개 문서` : '검색 결과가 없습니다';
  frag.append(summary);
  for (const hit of hits.slice(0, 50)) {
    const a = document.createElement('a');
    a.className = 'hit';
    a.href = buildHash(hit.path, hit.titleHit || !hit.headingHits.length ? '' : hit.headingHits[0].id);
    a.innerHTML = `<div class="t">${mark(hit.meta.title, terms)}</div><div class="p">${escapeHtml(hit.path)}</div>`
      + hit.headingHits.map((h) => `<div class="h">${mark(h.text, terms)}</div>`).join('');
    a.addEventListener('click', (ev) => {
      const target = ev.target.closest('.h');
      if (target) {
        ev.preventDefault();
        const idx = [...a.querySelectorAll('.h')].indexOf(target);
        location.hash = buildHash(hit.path, hit.headingHits[idx].id);
      }
    });
    frag.append(a);
  }
  els.results.replaceChildren(frag);
  els.results.hidden = false;
  els.tree.hidden = true;
}

function mark(text, terms) {
  let html = escapeHtml(text);
  for (const t of terms) {
    if (!t) continue;
    html = html.replace(new RegExp(escapeRegExp(escapeHtml(t)), 'gi'), (m) => `<mark>${m}</mark>`);
  }
  return html;
}

// ---------- chrome ----------
function wireChrome() {
  els.search.addEventListener('input', () => runSearch(els.search.value));
  els.search.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { els.search.value = ''; runSearch(''); els.search.blur(); }
    if (ev.key === 'Enter') els.results.querySelector('a.hit')?.click();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) {
      ev.preventDefault();
      els.search.focus();
      els.search.select();
    }
  });
  els.menuBtn.addEventListener('click', () => {
    els.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  els.backdrop.addEventListener('click', closeSidebar);
  els.themeBtn.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
  syncHljsTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncHljsTheme);
  // Leaving the mobile breakpoint with the drawer open would leave a stale backdrop behind.
  window.matchMedia('(max-width: 900px)').addEventListener('change', (ev) => { if (!ev.matches) closeSidebar(); });
}

function openSidebar() {
  els.sidebar.classList.add('open');
  els.backdrop.hidden = false;
  els.menuBtn.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.backdrop.hidden = true;
  els.menuBtn.setAttribute('aria-expanded', 'false');
}

function isDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('pt.theme', theme); } catch {}
  syncHljsTheme();
  if (state.current && els.article.querySelector('pre.mermaid')) {
    // Mermaid bakes colors into the SVG; re-render the page to pick up the new theme.
    const doc = state.current;
    state.current = null;
    loadDoc(doc).then((md) => { state.current = doc; return renderDoc(doc, md); });
  }
}
function syncHljsTheme() {
  const dark = isDark();
  $('#hljs-light').disabled = dark;
  $('#hljs-dark').disabled = !dark;
}

// ---------- utils ----------
function link(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}
function extLink(href, text) {
  const a = link(href, text);
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}
