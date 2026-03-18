# NebulaTraceX

NebulaTraceX is a lightweight browser extension designed to record user behavior, capture bugs, and export professional, AI-ready reports with one click.

---

## Project Structure

```
nebula-trace-x/
├── manifest.json                 # MV3 manifest
├── README.md
│
├── background/
│   └── service-worker.js         # Central message bus, session management
│
├── content/
│   ├── recorder.js               # Main content script (dynamic inject)
│   ├── selector-engine.js        # Stable CSS selector generator
│   ├── screenshot.js             # Screenshot capture + compression
│   └── masker.js                 # Data masking (passwords, tokens, emails)
│
├── popup/
│   ├── index.html                # Popup shell
│   ├── popup.js                  # Main entry point
│   ├── i18n.js                   # Lightweight i18n utility
│   ├── tabs/
│   │   ├── recorder-tab.js       # Record control and status
│   │   ├── logs-tab.js           # Searchable step timeline
│   │   ├── export-tab.js         # JSON/Markdown export + AI prompt
│   │   └── stats-tab.js          # Project statistics
│   └── ui/
│       └── utils.js              # Shared UI utilities
│
├── storage/
│   ├── db.js                     # IndexedDB abstraction
│   ├── sessions.js               # Session + Step CRUD
│   └── projects.js               # Project registry
│
└── assets/
    ├── icons/                    # Extension icons
    └── styles/
        └── popup.css             # Design system (light + dark)
```

---

## Architecture

### Event-Driven, Zero Polling
- Content script is injected only when recording starts (lazy load).
- No background polling or `setInterval` used.
- Steps are batched and debounced (300ms) before persistence.
- Stats are computed lazily when the Statistics tab is opened.

### Message Flow
```
Popup → sendMsg() → Service Worker → chrome.scripting.executeScript()
                                   ↓
                             Content Script
                             (recorder.js)
                                   ↓
                        chrome.runtime.sendMessage()
                                   ↓
                       Service Worker → IndexedDB
```

---

## Installation & Usage

### 1. Load Extension (Chrome/Edge)
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right).
3. Click "Load unpacked".
4. Select the `NebulaTraceX` project folder.

### 2. Manual Testing
1. Open any website (e.g., `google.com`).
2. Click the NebulaTraceX icon in the toolbar.
3. Click **"Start Recording"**.
4. Perform actions: click, type, navigate.
5. Click **"Stop Recording"**.
6. Switch to the **Steps** tab to view the timeline.
7. Use the **Export** tab to download JSON or Markdown reports.

---

## Security & Privacy

| Feature | Description |
|---------|-------|
| **Zero external requests** | All data stays local - offline-first approach. |
| **Input masking** | Passwords, emails, JWTs, and credit card numbers are automatically masked. |
| **CSP Strict** | `script-src 'self'` – no inline scripts allowed. |
| **Value truncation** | Limits values to 200 characters and bodies to 1000 characters. |

---

## Performance Benchmarks

| Metric | Target | Approach |
|--------|--------|----------|
| Popup Load | < 80ms | Vanilla JS, no framework |
| Export Size | < 400KB | JPEG compression (55%), value truncation |
| Export Time | < 0.2s | Optimized IndexedDB reads |
| RAM Usage | < 5MB | Lazy loading and module isolation |

---

## Selector Strategy

NebulaTraceX uses a prioritized selector strategy to ensure maximum stability:
1. `[data-testid]` (Explicitly set for testing)
2. `[data-cy]` (Cypress standard)
3. `[data-qa]` (QA standard)
4. `#unique-id` (Static IDs only)
5. `[aria-label]` (Accessibility labels)
6. `[name]` (Form elements)
7. `tag.class` (Stable class combinations)
8. `tag:nth-of-type` (DOM path depth limited)

---

## Export Formats

### JSON (Optimized)
Focuses on data density for AI consumption:
```json
{
  "session": { "id": 1, "url": "...", "hostname": "..." },
  "steps": [
    {
      "type": "click",
      "selector": "[data-testid='btn']",
      "label": "Submit",
      "timestamp": "..."
    }
  ],
  "summary": { "totalSteps": 1, "clicks": 1 }
}
```

---

## Known Limitations

- **MV3 Service Worker Sleep**: Service Worker may sleep after 30s of inactivity; the first message might experience a slight delay (~200ms).
- **Cross-Origin Iframes**: Cannot inject scripts into cross-origin iframes due to browser security restrictions.
- **Visual Capture**: `captureVisibleTab` only captures the visible viewport at the time of the action.

---

*Authored by bzetsu92 - 2026*
