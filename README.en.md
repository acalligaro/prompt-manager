# Prompt Manager

*A prompt library for AI websites.* · [Version française](README.md)

Chrome / Edge extension (Manifest V3): a local prompt library, with tags and search, for AI websites (Claude, ChatGPT, DeepSeek, Perplexity…). Save the prompt typed in the page's input box, find it again, load it back in one click.⁣‌‌‌‌‌‌‌​​​‌​​​‌​​‍‌⁣

The extension interface is in French only: the screenshots below are the same as in the French README, and button labels are quoted as they appear, with their meaning in English.

![Extension menu](docs/img/01-popup.png)

## Supported sites

The extension works on the active tab, whatever the site: it looks for the page's input box (the focused one, else the lowest visible text box).

| Site | Editor | Checked |
|---|---|---|
| Claude (`claude.ai`) | ProseMirror | Read and write, line breaks included |
| ChatGPT (`chatgpt.com`) | ProseMirror | Read and write, line breaks included |
| DeepSeek (`chat.deepseek.com`) | `textarea` | Read and write, line breaks included |
| Perplexity (`perplexity.ai`) | Lexical | Read and write, line breaks included |
| Other sites (Gemini, Mistral, Kilo, Copilot…) | `textarea` or `contenteditable` | Same mechanism, not checked site by site |

If no input box is found, « Charger » copies the prompt to the clipboard.

## Installation

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. **Load unpacked** and select this folder.
3. Pin the icon (blue bubble) to the toolbar.

After a code update: the extension's ↻ button in `chrome://extensions`.

## Usage

### Save a prompt

1. Type the prompt in the AI site's input box (without sending it).
2. Open the extension menu: the prompt is read automatically. « ↻ Lire la page » (read the page) reads it again.
3. Enter a name and, if needed, comma-separated tags.
4. **Enregistrer** (save). The form is cleared: the next save creates a new entry.

The prompt can also be pasted into the field by hand.

### Find a prompt

Every word of the search must appear in the name, the tags or the prompt text (case-insensitive).

![Search](docs/img/02-recherche.png)

### Load a prompt

**▶ Charger** (load) replaces the text of the page's input box with the prompt, without sending it. Hovering the button says so:

![Tooltip on hover](docs/img/03-survol.png)

Result in Claude:

![Prompt loaded in Claude's input box](docs/img/04-claude.png)

### Other actions

- **Copier** (copy): copies the prompt to the clipboard.
- **Modifier** (edit, or click the name): fills the form; « Enregistrer » updates the entry. « Nouveau » (new) cancels.
- **Supprimer** (delete): two clicks (« Confirmer ? »).
- **Exporter JSON** (export): downloads the whole library (`prompts-YYYY-MM-DD.json`).
- **Importer JSON** (import): opens the menu in a tab (the file picker closes the menu), then pick the file. Invalid entries are skipped; an entry with the same `id` is replaced.

## Data

Stored locally in the browser profile: `chrome.storage.local`, key `prompts`, newest entries first.

```json
[{ "id": "uuid", "name": "Revue de code", "tags": ["dev"], "prompt": "Relis le diff ci-dessous…", "updated": "2026-10-04T12:00:00.000Z" }]
```

Nothing is sent anywhere. Export regularly to back up or share the library.

## Architecture

Same principles as MDE Kusto Saver: no build step, vanilla JavaScript, pure functions in `lib.js` tested with Node.

| File | Role |
|---|---|
| `manifest.json` | Permissions `activeTab`, `scripting`, `storage`, `unlimitedStorage`; no permanent host permission |
| `popup.html` / `popup.js` | Menu (also the options page opened in a tab): form, list, import / export, `composer` function injected into the page |
| `lib.js` | `isWebPage`, `parseTags`, `matches`, `upsert`, `mergeImport` |
| `test.js` | Tests: `node test.js` (Node 18+) |
| `icons/` | `icon.svg` (source: chat bubble + bookmark) and its PNG renders 16 / 32 / 48 / 128 |
| `docs/img/` | Screenshots of the READMEs |
| `LICENSE` | Usage license |

- **`activeTab` instead of a list of sites.** The extension can only reach the active tab, and only when its menu is opened: it works on any AI site without asking for access to all sites.
- **No permanent content script.** The menu injects on demand (`chrome.scripting.executeScript`, `MAIN` world, top frame) the `composer` function, which reads or replaces the input box text.
- **Writing that rich editors accept.** `textarea`: select then `insertText` (fallback: native setter + `input` event). ProseMirror / Lexical: select with a `Range`, then a synthetic paste (`paste` with `text/plain`), which keeps line breaks; fallback: `insertText`. The text is read back and compared with the prompt to confirm.
- **No network call, nothing is sent to the site**: the prompt is only placed in the input box, sending stays manual.

## Limits

- An input box inside an iframe is not reached (none of the checked sites uses one).
- Editors that reject both the synthetic paste and `insertText` cannot be filled: the button then copies the prompt to the clipboard.
- French-only interface.

## License

[PolyForm Noncommercial 1.0.0](LICENSE): free to copy, modify and share for any noncommercial use, provided the "Required Notice" line (author name and source) is kept. Any commercial use requires written agreement.
