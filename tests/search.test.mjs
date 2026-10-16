import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBodyIndex, searchDocs, tokenize, excerpt, stripInline } from '../assets/search.js';
import { flattenTree } from '../assets/core.js';

const md = [
  '# 제목',
  '소개 문단입니다.',
  '```sh',
  'git rebase -i HEAD~3',
  '```',
  '## 전류와 구동',
  '| 용어 | 뜻 |',
  '| --- | --- |',
  '| ESR | 등가 직렬 저항 |',
  '## 전압과 전원',
  '리턴 경로를 확인한다.',
].join('\n');
const headings = [
  { level: 1, text: '제목', id: '제목' },
  { level: 2, text: '전류와 구동', id: '전류와-구동' },
  { level: 2, text: '전압과 전원', id: '전압과-전원' },
];

test('buildBodyIndex tags lines with the enclosing heading, keeps code, skips table rules', () => {
  const lines = buildBodyIndex(md, headings);
  assert.deepEqual(lines, [
    { text: '소개 문단입니다.', id: '제목' },
    { text: 'git rebase -i HEAD~3', id: '제목' },
    { text: '용어 뜻', id: '전류와-구동' },
    { text: 'ESR 등가 직렬 저항', id: '전류와-구동' },
    { text: '리턴 경로를 확인한다.', id: '전압과-전원' },
  ]);
});

test('searchDocs ranks title > heading > body and links body hits to headings', () => {
  const docs = {
    'a/esr.md': { title: 'ESR 정리', headings: [] },
    'b/glossary.md': { title: '용어집', headings: headings },
    'c/other.md': { title: '기타', headings: [{ level: 2, text: 'ESR 측정', id: 'esr-측정' }] },
  };
  const bodies = new Map([['b/glossary.md', buildBodyIndex(md, headings)]]);
  const hits = searchDocs(tokenize('esr'), docs, bodies);
  assert.deepEqual(hits.map((h) => h.path), ['a/esr.md', 'c/other.md', 'b/glossary.md']);
  assert.equal(hits[2].lineHits[0].id, '전류와-구동');
  assert.equal(hits[2].lineHits[0].text, 'ESR 등가 직렬 저항');
  assert.deepEqual(searchDocs(tokenize('esr 저항'), docs, bodies).map((h) => h.path), ['b/glossary.md']);
  assert.deepEqual(searchDocs([], docs, bodies), []);
});

test('stripInline removes emphasis, code, links and list markers', () => {
  assert.equal(stripInline('다음은 **하위 두 비트가 W1C**인 `REG` [링크](./x.md)입니다.'), '다음은 하위 두 비트가 W1C인 REG 링크입니다.');
  assert.equal(stripInline('- 항목 *강조* 끝'), '항목 강조 끝');
  assert.equal(stripInline('> 인용 <b>굵게</b>'), '인용 굵게');
  assert.equal(stripInline('1. a_b_c 유지'), 'a_b_c 유지');
  assert.equal(stripInline('git rebase -i <commit-hash> <br>'), 'git rebase -i <commit-hash> ');
});

test('excerpt windows around the match', () => {
  const long = 'a'.repeat(100) + ' needle ' + 'b'.repeat(100);
  const out = excerpt(long, 'needle', 60);
  assert.ok(out.includes('needle'));
  assert.ok(out.startsWith('…') && out.endsWith('…'));
  assert.ok(out.length <= 62);
  assert.equal(excerpt('short', 'short'), 'short');
});

test('flattenTree yields reading order: home, folder index, then children', () => {
  const manifest = {
    home: 'README.md',
    tree: [
      { type: 'file', path: 'a.md' },
      { type: 'dir', path: 'B', index: 'B/README.md', children: [
        { type: 'file', path: 'B/one.md' },
        { type: 'dir', path: 'B/C', index: null, children: [{ type: 'file', path: 'B/C/two.md' }] },
      ] },
    ],
  };
  assert.deepEqual(flattenTree(manifest), ['README.md', 'a.md', 'B/README.md', 'B/one.md', 'B/C/two.md']);
});
