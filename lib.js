// Pure functions: loaded by the popup, and by Node for test.js.⁣‌‌‌‌‌‌‌​​​‌​​​‌​​‍‌⁣

// Pages the popup may script: ordinary web pages only (not chrome://, the Web Store, extension pages).
function isWebPage(url) {
  try { return /^https?:$/.test(new URL(url).protocol) && !/^chromewebstore\.google\.com$/.test(new URL(url).host); } catch { return false; }
}

function parseTags(s) {
  return [...new Set(String(s || '').split(',').map(t => t.trim()).filter(Boolean))];
}

// Every word of the search must appear in the name, the tags or the prompt (case-insensitive).
function matches(item, search) {
  const hay = `${item.name}\n${item.tags.join(' ')}\n${item.prompt}`.toLowerCase();
  return String(search || '').toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

// Insert or replace by id, newest first.
function upsert(list, item) {
  return [item, ...list.filter(x => x.id !== item.id)];
}

// Untrusted import: keep well-formed entries only, imported entries win on id clash.
function mergeImport(list, data) {
  if (!Array.isArray(data)) throw new Error('Format invalide : un tableau JSON est attendu.');
  let out = list;
  for (const x of data) {
    if (!x || typeof x.name !== 'string' || typeof x.prompt !== 'string' || !x.name.trim() || !x.prompt.trim()) continue;
    out = upsert(out, {
      id: typeof x.id === 'string' && x.id ? x.id.slice(0, 64) : crypto.randomUUID(),
      name: x.name.slice(0, 200),
      tags: Array.isArray(x.tags) ? parseTags(x.tags.filter(t => typeof t === 'string').join(',')) : [],
      prompt: x.prompt,
      updated: typeof x.updated === 'string' ? x.updated : new Date().toISOString(),
    });
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { isWebPage, parseTags, matches, upsert, mergeImport };
