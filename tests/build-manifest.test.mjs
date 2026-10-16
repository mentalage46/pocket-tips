import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractMeta, buildTree } from '../scripts/build-manifest.mjs';

test('extractMeta reads title and headings, skipping fenced code', () => {
  const md = [
    '# 제목 **강조** `코드`',
    '```sh',
    '# not a heading',
    '```',
    '## 저항과 정전용량',
    '## 저항과 정전용량',
    '### [링크](./x.md) 포함',
  ].join('\n');
  const meta = extractMeta(md, 'file.md');
  assert.equal(meta.title, '제목 강조 코드');
  assert.deepEqual(meta.headings.map((h) => h.id), ['제목-강조-코드', '저항과-정전용량', '저항과-정전용량-1', '링크-포함']);
  assert.equal(extractMeta('no heading', 'fallback-name.md').title, 'fallback-name');
});

test('buildTree nests folders, pins README as index, sorts files before dirs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pt-'));
  try {
    await mkdir(join(root, 'Version Control System', 'git'), { recursive: true });
    await mkdir(join(root, 'Empty'), { recursive: true });
    await mkdir(join(root, '.hidden'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# Home');
    await writeFile(join(root, 'b.md'), '# B');
    await writeFile(join(root, 'a10.md'), '# A10');
    await writeFile(join(root, 'a2.md'), '# A2');
    await writeFile(join(root, 'notes.txt'), 'ignored');
    await writeFile(join(root, '.hidden', 'x.md'), '# hidden');
    await writeFile(join(root, 'Version Control System', 'README.md'), '# VCS');
    await writeFile(join(root, 'Version Control System', 'git', 'tips.md'), '# Git Tips');

    const { tree, home, docs } = await buildTree(root);
    assert.equal(home, 'README.md');
    assert.deepEqual(tree.map((n) => n.name), ['a2.md', 'a10.md', 'b.md', 'Version Control System']);
    const vcs = tree[3];
    assert.equal(vcs.type, 'dir');
    assert.equal(vcs.index, 'Version Control System/README.md');
    assert.equal(vcs.title, 'Version Control System');
    assert.deepEqual(vcs.children.map((n) => n.path), ['Version Control System/git']);
    assert.equal(vcs.children[0].index, null);
    assert.equal(vcs.children[0].children[0].title, 'Git Tips');
    assert.ok(!('notes.txt' in docs));
    assert.ok(!Object.keys(docs).some((p) => p.startsWith('.hidden')));
    assert.equal(docs['Version Control System/git/tips.md'].title, 'Git Tips');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
