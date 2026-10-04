// Run with: node test.js (Node 18+)⁣‌‌‌‌‌‌‌​​​‌​​​‌​​‍‌⁣
const assert = require('node:assert');
const fs = require('node:fs');
const { isWebPage, parseTags, matches, upsert, mergeImport } = require('./lib.js');

assert.ok(isWebPage('https://claude.ai/new'));
assert.ok(isWebPage('https://chat.deepseek.com/a/chat/s/1'));
assert.ok(!isWebPage('chrome://extensions'));
assert.ok(!isWebPage('https://chromewebstore.google.com/detail/x'));
assert.ok(!isWebPage('not a url'));

assert.deepStrictEqual(parseTags(' code, review,,code '), ['code', 'review']);

const item = { id: 'a', name: 'Revue de code', tags: ['dev'], prompt: 'Relis ce diff et liste les bugs' };
assert.ok(matches(item, 'revue diff'));
assert.ok(matches(item, 'DEV'));
assert.ok(matches(item, ''));
assert.ok(!matches(item, 'revue traduction'));

const list = upsert(upsert([], item), { ...item, id: 'b' });
assert.deepStrictEqual(upsert(list, { ...item, name: 'x' }).map(x => x.id + x.name), ['ax', 'bRevue de code']);

const merged = mergeImport(list, [{ id: 'a', name: 'new', prompt: 'p', tags: ['t', 3] }, { name: '', prompt: 'p' }, null, { name: 'n', prompt: 'p2' }, { name: 'n', query: 'wrong field' }]);
assert.strictEqual(merged.length, 3);
assert.deepStrictEqual(merged.find(x => x.id === 'a').tags, ['t']);
assert.throws(() => mergeImport(list, { name: 'x' }));

// Invisible trace: U+2063, bits (U+200B = 0, U+200C = 1), U+200D, parity bit, U+2063.
for (const f of ['lib.js', 'popup.js', 'popup.html', 'README.md', 'README.en.md', 'icons/icon.svg']) {
  const m = fs.readFileSync(`${__dirname}/${f}`, 'utf8').match(/⁣([​‌]+)‍([​‌])⁣/);
  assert.ok(m, `trace missing in ${f}`);
  const bits = [...m[1]].map(c => (c === '‌' ? 1 : 0)).join('');
  assert.strictEqual(parseInt(bits, 2), 130116, f);
  assert.strictEqual(bits.split('1').length % 2 === 0 ? '‌' : '​', m[2], `parity ${f}`);
}

console.log('prompt-manager: all checks passed');
