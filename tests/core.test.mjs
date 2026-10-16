import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, createSlugger, normalizePath, dirname, resolveRelative,
  parseRoute, buildHash, resolveDoc, rewriteHref, encodePath,
} from '../assets/core.js';

test('slugify matches GitHub for Korean and punctuation', () => {
  assert.equal(slugify('저항과 정전용량'), '저항과-정전용량');
  assert.equal(slugify('1.1. 시맨틱 HTML (Semantic HTML)'), '11-시맨틱-html-semantic-html');
  assert.equal(slugify('Server State (React Query)'), 'server-state-react-query');
  assert.equal(slugify('  Spaced   out  '), 'spaced-out');
  assert.equal(slugify('under_score-dash'), 'under_score-dash');
  assert.equal(slugify('3. Zustand (권장 ⭐)'), '3-zustand-권장-');
});

test('createSlugger dedupes like GitHub', () => {
  const slug = createSlugger();
  assert.equal(slug('예시'), '예시');
  assert.equal(slug('예시'), '예시-1');
  assert.equal(slug('예시'), '예시-2');
});

test('normalizePath resolves dot segments', () => {
  assert.equal(normalizePath('./AI/README.md'), 'AI/README.md');
  assert.equal(normalizePath('Backend/auth/../caching/redis.md'), 'Backend/caching/redis.md');
  assert.equal(normalizePath('/Hardware//glossary/'), 'Hardware/glossary');
  assert.equal(normalizePath('../outside.md'), 'outside.md');
  assert.equal(normalizePath(''), '');
});

test('dirname and resolveRelative work from a document', () => {
  assert.equal(dirname('Backend/auth/jwt.md'), 'Backend/auth');
  assert.equal(dirname('README.md'), '');
  assert.equal(resolveRelative('Backend/auth/jwt.md', '../caching/redis.md'), 'Backend/caching/redis.md');
  assert.equal(resolveRelative('README.md', './Version%20Control%20System/'), 'Version Control System');
  assert.equal(resolveRelative('Hardware/glossary/README.md', 'electrical.md'), 'Hardware/glossary/electrical.md');
});

test('parseRoute and buildHash round-trip with spaces and Korean', () => {
  const hash = buildHash('Version Control System/git/tips.md', '자주-쓰는-명령');
  assert.equal(hash, '#/Version%20Control%20System/git/tips.md?id=%EC%9E%90%EC%A3%BC-%EC%93%B0%EB%8A%94-%EB%AA%85%EB%A0%B9');
  assert.deepEqual(parseRoute(hash), { path: 'Version Control System/git/tips.md', id: '자주-쓰는-명령' });
  assert.deepEqual(parseRoute(''), { path: '', id: '' });
  assert.deepEqual(parseRoute('#/'), { path: '', id: '' });
  assert.deepEqual(parseRoute('#/AI/README.md'), { path: 'AI/README.md', id: '' });
  assert.deepEqual(parseRoute('#/AI/README.md#intro'), { path: 'AI/README.md', id: 'intro' });
  assert.equal(buildHash('AI/README.md', ''), '#/AI/README.md');
  assert.equal(encodePath('a b/c#d.md'), 'a%20b/c%23d.md');
});

const index = {
  files: new Set(['README.md', 'AI/README.md', 'AI/harness/concepts.md', 'Backend/caching/redis.md', 'Version Control System/git/tips.md']),
  dirs: new Set(['AI', 'AI/harness', 'Backend', 'Backend/caching', 'Version Control System', 'Version Control System/git']),
};

test('resolveDoc maps files, directories and the home page', () => {
  assert.equal(resolveDoc('AI/README.md', index), 'AI/README.md');
  assert.equal(resolveDoc('AI', index), 'AI/README.md');
  assert.equal(resolveDoc('AI/', index), 'AI/README.md');
  assert.equal(resolveDoc('', index), 'README.md');
  assert.equal(resolveDoc('Backend', index), null);
  assert.equal(resolveDoc('nope.md', index), null);
});

test('rewriteHref routes markdown links and keeps the rest', () => {
  const cur = 'AI/harness/concepts.md';
  assert.deepEqual(rewriteHref('../README.md', cur, index), { kind: 'route', href: '#/AI/README.md' });
  assert.deepEqual(rewriteHref('../../Backend/caching/redis.md#ttl', cur, index), { kind: 'route', href: '#/Backend/caching/redis.md?id=ttl' });
  assert.deepEqual(rewriteHref('#개요', cur, index), { kind: 'route', href: '#/AI/harness/concepts.md?id=%EA%B0%9C%EC%9A%94' });
  assert.deepEqual(rewriteHref('./Version%20Control%20System/', 'README.md', index), { kind: 'missing', href: 'Version Control System' });
  assert.deepEqual(rewriteHref('./AI/', 'README.md', index), { kind: 'route', href: '#/AI/README.md' });
  assert.deepEqual(rewriteHref('https://example.com/x', cur, index), { kind: 'external', href: 'https://example.com/x' });
  assert.deepEqual(rewriteHref('mailto:a@b.c', cur, index), { kind: 'external', href: 'mailto:a@b.c' });
  assert.deepEqual(rewriteHref('./diagram.png', cur, index, 'docs'), { kind: 'asset', href: 'docs/AI/harness/diagram.png' });
  assert.deepEqual(rewriteHref('../missing.md', cur, index), { kind: 'missing', href: 'AI/missing.md' });
  assert.deepEqual(rewriteHref('#/already/routed.md', cur, index), { kind: 'route', href: '#/already/routed.md' });
});
