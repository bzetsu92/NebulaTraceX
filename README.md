# NebulaTraceX

NebulaTraceX is a lightweight MV3 browser extension that records user behavior, captures bugs, and exports AI‑ready reports with one click.

---

## Project Structure

```
NebulaTraceX/
├── manifest.json
├── README.md
│
├── background/
│   └── service-worker.js          # Central message bus + session lifecycle
│
├── content/
│   ├── constants.js               # Runtime rules + storage overrides
│   ├── recorder.js                # Main recorder (click/input/nav + network)
│   ├── network-hook.js            # Page-level fetch/xhr hook (MAIN world)
│   ├── selector-engine.js         # Stable selector generator
│   └── screenshot.js              # Screenshot compression + diff
│
├── editor/
│   ├── editor.html                # Full‑page image editor
│   ├── editor.css
│   └── editor.js
│
├── popup/
│   ├── index.html                 # Popup shell
│   ├── popup.js                   # Entry point
│   ├── i18n.js                    # Lightweight i18n
│   ├── tabs/
│   │   ├── recorder-tab.js        # Record control + status
│   │   ├── trace-tab.js           # Session list + detail view
│   │   └── settings-tab.js        # Config UI (Step/UI + Network + Share)
│   └── ui/
│       └── utils.js
│
├── storage/
│   ├── db.js                      # IndexedDB wrapper
│   ├── sessions.js                # Session/Step CRUD
│   └── projects.js                # Project registry
│
└── assets/
    ├── icons/
    └── styles/
        └── popup.css              # Design system (light + dark)
```

---

## Architecture

### Event‑Driven (No Polling)
- Content scripts are injected only when recording starts.
- Steps are buffered and flushed in batches to IndexedDB.
- Network capture is a lightweight fetch/xhr patch in MAIN world.

### Message Flow
```
Popup → Service Worker → Content Script (recorder.js)
                      ↘︎ Page Hook (network-hook.js)
```

---

## Installation (Chrome/Edge)

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `NebulaTraceX` folder

---

## Usage

1. Open any site
2. Click the NebulaTraceX icon
3. **Start Recording**
4. Perform actions (click, type, navigate)
5. **Stop Recording**
6. Open **TRACE** to review steps, networks, and images
7. Export **JSON / Markdown** or copy JSON to clipboard

---

## Config (Popup → CONFIG)

### Step / UI Filters
Toggle framework presets to reduce noisy clicks (overlays, tooltips):
- Ant Design, MUI, Radix UI, Headless UI, Tailwind UI, Shopify Polaris

### Network Rules
Control what gets captured:
- Blocked hosts (patterns)
- Ignore URL patterns
- Ignore extensions
- Ignore methods
- Capture body methods
- Limits (URL length, body length, form keys)

### Config Share
Export/import the rule set as JSON for team sharing.

---

## Runtime Overrides (storage)

Config lives in `chrome.storage.local` under `ntxConfig`. Any change is applied live.

Example:
```js
chrome.storage.local.set({
  ntxConfig: {
    ignoreSelectorGroupState: { mui: false },
    network: {
      blockedHostPatterns: ['sentry.io', 'mixpanel.com'],
      maxBodyLength: 800
    }
  }
});
```

---

## Export (AI‑Ready)

### JSON (Compact)
- Only essential fields
- Masks sensitive content
- Excludes redundant metadata

### Markdown
- Human‑readable summary
- Ideal for tickets / bug reports

---

## Security & Privacy

- **All data stays local** (IndexedDB + storage)
- **Sensitive input masked** (email, cards, tokens, JWTs)
- **Length limits** on values and bodies
- **No external requests** by the extension

---

## Known Limitations

- **MV3 Service Worker sleep** can add a small delay on first interaction
- **Cross‑origin iframes** cannot be injected
- **Screenshot capture** only grabs the visible viewport

---

Authored by bzetsu92 — 2026
