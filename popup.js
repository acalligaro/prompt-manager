// Popup (also the options page opened in a tab). The library lives in chrome.storage.local `prompts`:⁣‌‌‌‌‌‌‌​​​‌​​​‌​​‍‌⁣
// [{ id, name, tags: [string], prompt, updated: ISO date }], newest first.
const $ = id => document.getElementById(id);
let items = [];
let editingId = null;

// Run in the page's MAIN world, injected as is: must stay self-contained.
// Finds the chat input box (focused one, else the lowest visible textarea / contenteditable) and reads or replaces its text.
// Checked on Claude and ChatGPT (ProseMirror), Perplexity (Lexical), DeepSeek (textarea).
async function composer(action, text) {
  const tick = ms => new Promise(r => setTimeout(r, ms));
  const usable = e => { const r = e.getBoundingClientRect(); return r.width > 50 && r.height > 10 && !e.disabled && !e.readOnly; };
  const a = document.activeElement;
  const el = a && usable(a) && (a.tagName === 'TEXTAREA' || a.isContentEditable) ? a
    : [...document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""]')].filter(usable)
      .sort((x, y) => y.getBoundingClientRect().bottom - x.getBoundingClientRect().bottom)[0];
  if (!el) return null;
  // Rich editors render one block per line: join the blocks with \n (innerText would double the breaks).
  const read = () => {
    if (el.tagName === 'TEXTAREA') return el.value;
    const kids = [...el.children];
    return kids.length && kids.every(c => /^(P|DIV|PRE|H[1-6])$/.test(c.tagName))
      ? kids.map(c => c.innerText.replace(/\n$/, '')).join('\n') : el.innerText;
  };
  if (action === 'read') return read().trim() || null;
  const same = () => read().trim() === text.trim();
  el.focus();
  if (el.tagName === 'TEXTAREA') {
    el.select();
    document.execCommand('insertText', false, text);
    if (!same()) {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return same();
  }
  // The page has no focus while the popup is open, so execCommand('selectAll') is ignored by Lexical: select with a Range,
  // then a synthetic paste, which ProseMirror and Lexical turn into paragraphs / line breaks.
  const selectAll = async () => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    await tick(50);
  };
  await selectAll();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await tick(200);
  if (!same()) { await selectAll(); document.execCommand('insertText', false, text); await tick(100); }
  return same();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && isWebPage(tab.url) ? tab : null;
}
// Top frame only (the chat box lives there on every site checked; all frames would also write into unrelated iframes).
// null if the page cannot be scripted.
async function inPage(tabId, args) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: composer, args });
    return res?.result ?? null;
  } catch { return null; }
}

function say(text) { $('msg').textContent = text; }
const save = () => chrome.storage.local.set({ prompts: items });

async function grab() {
  const tab = await activeTab();
  const p = tab && await inPage(tab.id, ['read']);
  if (p) { $('prompt').value = p; say('Prompt lu depuis la page.'); }
  else say(tab ? 'Zone de saisie vide ou introuvable : collez le prompt.' : 'Ouvrez le site d\'IA dans l\'onglet actif.');
}

async function load(item) {
  const tab = await activeTab();
  if (tab && await inPage(tab.id, ['write', item.prompt])) return say(`« ${item.name} » chargé dans la page.`);
  await navigator.clipboard.writeText(item.prompt);
  say('Zone de saisie introuvable : prompt copié, collez-le avec Ctrl/Cmd+V.');
}

function edit(item) {
  editingId = item.id;
  $('name').value = item.name;
  $('tags').value = item.tags.join(', ');
  $('prompt').value = item.prompt;
  say(`Modification de « ${item.name} ».`);
}

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
function btn(text, onclick, className = '') { return el('button', { textContent: text, onclick, className }); }
function tip(e, text) { e.dataset.tip = text; e.setAttribute('aria-label', `${e.textContent} : ${text}`); return e; }

function render() {
  const search = $('search').value;
  const shown = items.filter(x => matches(x, search));
  $('count').textContent = items.length;
  $('list').replaceChildren(...(shown.length ? shown.map(item => {
    const del = btn('Supprimer', () => {
      if (del.textContent !== 'Confirmer ?') return (del.textContent = 'Confirmer ?');
      items = items.filter(x => x.id !== item.id);
      if (editingId === item.id) editingId = null;
      save(); render();
    }, 'del');
    return el('li', { className: 'item' },
      el('div', {}, el('span', { className: 'name', textContent: item.name, title: 'Modifier', onclick: () => edit(item) }),
        ...item.tags.map(t => el('span', { className: 'tag', textContent: t }))),
      el('pre', { textContent: item.prompt }),
      el('div', { className: 'actions' },
        tip(btn('▶ Charger', () => load(item), 'primary'), 'Remplace le texte de la zone de saisie de la page'),
        btn('Copier', () => navigator.clipboard.writeText(item.prompt).then(() => say('Prompt copié.'))),
        btn('Modifier', () => edit(item)),
        del));
  }) : [el('li', { className: 'empty', textContent: items.length ? 'Aucun résultat.' : 'Bibliothèque vide.' })]));
}

$('grab').onclick = grab;
const clearForm = () => { editingId = null; $('name').value = $('tags').value = $('prompt').value = ''; };
$('clear').onclick = () => { clearForm(); say(''); };
$('save').onclick = () => {
  const name = $('name').value.trim(), prompt = $('prompt').value.trim();
  if (!name || !prompt) return say('Nom et prompt obligatoires.');
  items = upsert(items, { id: editingId || crypto.randomUUID(), name, tags: parseTags($('tags').value), prompt, updated: new Date().toISOString() });
  // Empty form after saving: the next save is a new entry, never a silent overwrite of this one.
  clearForm();
  save(); render(); say(`« ${name} » enregistré.`);
};
$('search').oninput = render;
$('export').onclick = () => {
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })),
    download: `prompts-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('import').onclick = async () => {
  // The file picker closes the popup: import from the options page opened in a tab.
  if (await chrome.tabs.getCurrent()) $('file').click(); else chrome.runtime.openOptionsPage();
};
$('file').onchange = async () => {
  try {
    const before = items.length;
    items = mergeImport(items, JSON.parse(await $('file').files[0].text()));
    save(); render(); say(`Import : ${items.length - before} nouveau(x), doublons d'id remplacés.`);
  } catch (e) { say(`Import refusé : ${e.message}`); }
  $('file').value = '';
};

(async () => {
  if (await chrome.tabs.getCurrent()) document.body.classList.add('tab');
  ({ prompts: items = [] } = await chrome.storage.local.get('prompts'));
  render();
  if (await activeTab()) grab();
})();
