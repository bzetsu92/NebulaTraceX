import { Projects } from '../../storage/projects.js';
import { Sessions, Steps } from '../../storage/sessions.js';
import { t } from '../i18n.js';
import { esc, formatTime, timeAgo, stepIcon } from '../ui/utils.js';

let _sites = [];
let _selectedHost = null;
let _selectedSessionId = null;
let _activeTab = 'steps';
let _modalStepId = null;
let _drawCtx = null;
let _drawing = false;
let _penActive = true;

export function initSitemapTab() {
    const search = document.getElementById('sitemap-search');
    const list = document.getElementById('sitemap-list');
    const detail = document.getElementById('sitemap-detail');
    const backBtn = document.getElementById('btn-back-sitemap');
    const sessionSelect = document.getElementById('sitemap-session-select');

    document.querySelectorAll('[data-site-tab]').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.siteTab));
    });

    search.addEventListener('input', debounce(renderList, 200));
    backBtn.addEventListener('click', () => {
        detail.style.display = 'none';
        list.style.display = 'block';
    });
    sessionSelect.addEventListener('change', async () => {
        _selectedSessionId = Number(sessionSelect.value);
        await renderSessionDetail();
    });

    initImageModal();

    return { refreshSites, openSiteBySessionId };
}

async function refreshSites() {
    const [projects, sessions, steps] = await Promise.all([
        Projects.getAll(),
        Sessions.getAll(),
        Steps.getAll(),
    ]);

    const projMap = Object.fromEntries(projects.map(p => [p.hostname, p]));
    const stats = {};
    for (const s of sessions) {
        const h = s.hostname || 'unknown';
        if (!stats[h]) {
            stats[h] = {
                hostname: h,
                displayName: projMap[h]?.displayName || h,
                color: projMap[h]?.color || '#6b7280',
                faviconUrl: projMap[h]?.faviconUrl || buildFaviconUrl(h),
                sessionCount: 0,
                stepCount: 0,
                lastSessionAt: 0,
                lastSessionId: null,
            };
        }
        stats[h].sessionCount++;
        if (s.startedAt > stats[h].lastSessionAt) {
            stats[h].lastSessionAt = s.startedAt;
            stats[h].lastSessionId = s.id;
        }
    }

    const sessionHost = Object.fromEntries(sessions.map(s => [s.id, s.hostname]));
    for (const step of steps) {
        const h = sessionHost[step.sessionId] || 'unknown';
        if (stats[h]) stats[h].stepCount++;
    }

    _sites = Object.values(stats).sort((a, b) => b.lastSessionAt - a.lastSessionAt);
    const badge = document.getElementById('badge-steps');
    if (badge) badge.textContent = String(_sites.length);
    renderList();
}

function renderList() {
    const list = document.getElementById('sitemap-list');
    const q = (document.getElementById('sitemap-search')?.value || '').toLowerCase();
    const filtered = _sites.filter(s =>
        s.hostname.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q)
    );

    if (!filtered.length) {
        list.innerHTML = `
        <div class="empty">
          <div class="empty-icon"></div>
          <div class="empty-title">${t('sitemap.empty')}</div>
        </div>`;
        return;
    }

    list.innerHTML = filtered.map(site => `
      <div class="card-mini site-card">
        <div class="site-avatar" data-host="${esc(site.hostname)}">
          <img src="${esc(site.faviconUrl)}" alt="" loading="lazy" />
          <span>${esc((site.displayName || site.hostname || '?')[0] || '?')}</span>
        </div>
        <div class="step-body">
          <div class="step-action">${esc(site.displayName)}</div>
          <div class="step-selector">${esc(site.hostname)}</div>
          <div class="site-meta">${site.sessionCount} sessions · ${site.stepCount} steps · ${timeAgo(site.lastSessionAt)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-host="${esc(site.hostname)}" data-session="${site.lastSessionId}">
          ${t('sitemap.view')}
        </button>
      </div>
    `).join('');

    list.querySelectorAll('button[data-host]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const host = btn.dataset.host;
            const sessionId = Number(btn.dataset.session) || null;
            await openSite(host, sessionId);
        });
    });

    list.querySelectorAll('.site-avatar img').forEach(img => {
        img.addEventListener('error', () => {
            img.style.display = 'none';
        });
    });
}

async function openSite(hostname, sessionId = null) {
    _selectedHost = hostname;
    const allSessions = await Sessions.getAll();
    const sessions = allSessions.filter(s => s.hostname === hostname)
        .sort((a, b) => b.startedAt - a.startedAt);

    const siteName = hostname;
    const detail = document.getElementById('sitemap-detail');
    const list = document.getElementById('sitemap-list');
    detail.style.display = 'block';
    list.style.display = 'none';

    document.getElementById('sitemap-site-name').textContent = siteName;
    document.getElementById('sitemap-hostname').textContent = hostname;
    document.getElementById('sitemap-session-count').textContent = `${t('sitemap.sessions')}: ${sessions.length}`;

    const stepsAll = await Steps.getAll();
    const stepCount = stepsAll.filter(s => sessions.some(ss => ss.id === s.sessionId)).length;
    document.getElementById('sitemap-step-count').textContent = `${t('sitemap.steps')}: ${stepCount}`;

    const select = document.getElementById('sitemap-session-select');
    select.innerHTML = sessions.map(s => {
        const host = safeHostname(s.url);
        const label = `${formatTime(s.startedAt)} · ${host}`;
        return `<option value="${s.id}">${esc(label)}</option>`;
    }).join('');

    if (sessionId && sessions.some(s => s.id === sessionId)) {
        _selectedSessionId = sessionId;
    } else {
        _selectedSessionId = sessions[0]?.id || null;
    }
    select.value = _selectedSessionId || '';
    await renderSessionDetail();
}

async function renderSessionDetail() {
    if (!_selectedSessionId) return;
    const steps = await Steps.getBySession(_selectedSessionId);
    const ordered = (steps || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    renderSteps(ordered);
    renderNetworks(ordered);
    renderImages(ordered);
}

function renderSteps(steps) {
    const target = document.getElementById('site-steps');
    const list = steps.filter(s => s.type !== 'network');
    if (!list.length) {
        target.innerHTML = emptyBlock(t('details.empty_steps'));
        return;
    }
    target.innerHTML = list.map(step => {
        const { cls, icon } = stepIcon(step.type);
        const sel = step.selector ? `<div class="step-selector">${esc(step.selector)}</div>` : '';
        const label = step.label || step.action || step.type;
        return `
          <div class="card-mini">
            <div class="step-icon ${cls}">${icon}</div>
            <div class="step-body">
              <div class="step-action">${esc(label)}</div>
              ${sel}
            </div>
            <div class="step-time">${timeAgo(step.timestamp)}</div>
          </div>`;
    }).join('');
}

function renderNetworks(steps) {
    const target = document.getElementById('site-networks');
    const list = steps.filter(s => s.type === 'network');
    if (!list.length) {
        target.innerHTML = emptyBlock(t('details.empty_networks'));
        return;
    }
    target.innerHTML = list.map(step => `
      <div class="card-mini">
        <div class="step-icon icon-network"></div>
        <div class="step-body">
          <div class="step-action">${esc(step.method || '')} ${esc(String(step.status || ''))}</div>
          <div class="step-selector">${esc(step.url || '')}</div>
          ${step.body ? `<div class="step-selector" style="color:var(--text-subtle)">body: ${esc(String(step.body).slice(0, 120))}</div>` : ''}
          ${step.error ? `<div class="step-selector" style="color:var(--danger)">Error: ${esc(step.error)}</div>` : ''}
        </div>
        <div class="step-time">${timeAgo(step.timestamp)}</div>
      </div>
    `).join('');
}

function renderImages(steps) {
    const target = document.getElementById('site-images');
    const imgs = steps.filter(s => s.screenshot);
    if (!imgs.length) {
        target.innerHTML = emptyBlock(t('details.empty_images'));
        return;
    }
    target.innerHTML = `
      <div class="image-grid image-grid-large">
        ${imgs.map(step => `
          <div class="image-card">
            <img src="${step.screenshotAnnotated || step.screenshot}" alt="screenshot" loading="lazy" data-img-step="${step.id}" />
            ${step.screenshotNote ? `<div class="image-note">${esc(step.screenshotNote)}</div>` : ''}
            <div class="image-meta">
              <span>${formatTime(step.timestamp)}</span>
              <span>${esc(step.screenshotNote || '')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    target.querySelectorAll('img[data-img-step]').forEach(img => {
        img.addEventListener('click', () => openImageModal(Number(img.dataset.imgStep), img.src));
    });
}

function setActiveTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('[data-site-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.siteTab === tab);
    });
    document.querySelectorAll('.detail-panel').forEach(p => {
        p.classList.toggle('active', p.id === `site-${tab}`);
    });
}

export async function openSiteBySessionId(sessionId) {
    const s = await Sessions.get(sessionId);
    if (!s?.hostname) return;
    await openSite(s.hostname, sessionId);
}

function emptyBlock(text) {
    return `
      <div class="empty">
        <div class="empty-icon"></div>
        <div class="empty-title">${esc(text)}</div>
      </div>`;
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function safeHostname(url) {
    try { return new URL(url).hostname; } catch { return 'unknown'; }
}

function buildFaviconUrl(hostname) {
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

// ─── Image Modal ──────────────────────────────────────────────────────────
function initImageModal() {
    const modal = document.getElementById('image-modal');
    const close = document.getElementById('image-modal-close');
    const backdrop = document.getElementById('image-modal-backdrop');
    const penBtn = document.getElementById('image-modal-pen');
    const clearBtn = document.getElementById('image-modal-clear');
    const saveBtn = document.getElementById('image-modal-save');
    const openBtn = document.getElementById('image-modal-open');
    close.addEventListener('click', closeImageModal);
    backdrop.addEventListener('click', closeImageModal);
    penBtn.addEventListener('click', () => {
        _penActive = !_penActive;
        penBtn.classList.toggle('active', _penActive);
    });
    clearBtn.addEventListener('click', clearCanvas);
    saveBtn.addEventListener('click', saveAnnotatedImage);
    openBtn.addEventListener('click', openImageWindow);
}

async function openImageModal(stepId, src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    const canvas = document.getElementById('image-modal-canvas');
    const note = document.getElementById('image-modal-note');
    const timeEl = document.getElementById('image-modal-time');
    img.src = src;
    note.value = '';
    timeEl.textContent = '';
    modal.style.display = 'flex';
    _modalStepId = stepId;
    _penActive = true;
    const penBtn = document.getElementById('image-modal-pen');
    penBtn.classList.add('active');

    const step = await Steps.get(stepId).catch(() => null);
    if (step) {
        note.value = step.screenshotNote || '';
        timeEl.textContent = formatTime(step.timestamp);
        if (step.screenshotAnnotated && step.screenshotAnnotated !== src) {
            img.src = step.screenshotAnnotated;
        }
    }

    let tmr;
    note.oninput = () => {
        clearTimeout(tmr);
        tmr = setTimeout(async () => {
            await Steps.update(stepId, { screenshotNote: note.value });
            await renderSessionDetail();
        }, 500);
    };

    img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvas.width = w;
        canvas.height = h;
        _drawCtx = canvas.getContext('2d');
        if (_drawCtx) {
            _drawCtx.lineWidth = 5;
            _drawCtx.lineCap = 'round';
            _drawCtx.strokeStyle = '#ff3b30';
        }
    };

    bindCanvasDraw(canvas);
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'none';
    _modalStepId = null;
    clearCanvas();
}

function bindCanvasDraw(canvas) {
    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (canvas.width / r.width);
        const y = (e.clientY - r.top) * (canvas.height / r.height);
        return { x, y };
    };
    canvas.onpointerdown = (e) => {
        if (!_penActive || !_drawCtx) return;
        _drawing = true;
        const { x, y } = getPos(e);
        _drawCtx.beginPath();
        _drawCtx.moveTo(x, y);
    };
    canvas.onpointermove = (e) => {
        if (!_drawing || !_drawCtx) return;
        const { x, y } = getPos(e);
        _drawCtx.lineTo(x, y);
        _drawCtx.stroke();
    };
    canvas.onpointerup = () => { _drawing = false; };
    canvas.onpointerleave = () => { _drawing = false; };
}

function clearCanvas() {
    const canvas = document.getElementById('image-modal-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function saveAnnotatedImage() {
    if (!_modalStepId) return;
    const img = document.getElementById('image-modal-img');
    const canvas = document.getElementById('image-modal-canvas');
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    const dataUrl = tmp.toDataURL('image/jpeg', 0.9);
    await Steps.update(_modalStepId, { screenshotAnnotated: dataUrl });
    await renderSessionDetail();
}

async function openImageWindow() {
    if (!_modalStepId) return;
    try {
        const url = chrome.runtime.getURL(`popup/image-viewer.html?stepId=${_modalStepId}`);
        chrome.windows.create({
            url,
            type: 'popup',
            width: 900,
            height: 700,
        });
    } catch {
        // ignore
    }
}
