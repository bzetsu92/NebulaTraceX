import { Projects } from '../../storage/projects.js';
import { Sessions, Steps, Errors } from '../../storage/sessions.js';
import { t } from '../i18n.js';
import { esc, formatTime, timeAgo, stepIcon } from '../ui/utils.js';

let _sessions = [];
let _steps = [];
let _stepCountBySession = {};
let _projects = {};

let _currentSessionId = null;
let _currentSteps = [];

let _activeTab = 'steps';

let _imageModal = null;

export function initTraceTab() {
    const search = document.getElementById('trace-search');
    search?.addEventListener('input', debounce(renderSessions, 200));

    document.querySelectorAll('[data-trace-tab]').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.traceTab));
    });

    document.getElementById('btn-back-trace')?.addEventListener('click', closeDetail);
    document.getElementById('btn-delete-all')?.addEventListener('click', deleteAllSessions);
    document.getElementById('btn-copy-export')?.addEventListener('click', () => copyExport('json'));
    document.getElementById('btn-export-json')?.addEventListener('click', () => exportSession('json'));
    document.getElementById('btn-export-md')?.addEventListener('click', () => exportSession('md'));

    if (!window.__traceImageListener) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg?.type === 'IMAGE_EDITED' && msg.sessionId === _currentSessionId) {
                loadSession(_currentSessionId);
            }
        });
        window.__traceImageListener = true;
    }

    chrome.storage.local.get('traceNeedsRefresh', (res) => {
        if (res?.traceNeedsRefresh) {
            chrome.storage.local.remove('traceNeedsRefresh');
            if (_currentSessionId) loadSession(_currentSessionId);
        }
    });

    initImageModal();

    return { refreshSessions };
}

export async function openSessionById(sessionId) {
    if (!_sessions.length) await refreshSessions();
    if (!sessionId) return;
    openSessionDetail(sessionId);
}

async function refreshSessions() {
    const [projects, sessions, steps] = await Promise.all([
        Projects.getAll(),
        Sessions.getAll(),
        Steps.getAll(),
    ]);

    _sessions = sessions || [];
    _steps = steps || [];
    _stepCountBySession = {};
    for (const step of _steps) {
        if (!isUserStep(step)) continue;
        const sid = step.sessionId;
        _stepCountBySession[sid] = (_stepCountBySession[sid] || 0) + 1;
    }

    _projects = Object.fromEntries((projects || []).map(p => [p.hostname, p]));
    renderSessions();
}

function renderSessions() {
    const list = document.getElementById('trace-list');
    const empty = document.getElementById('trace-empty');
    const searchBox = document.getElementById('trace-search-box');
    const toolbar = document.getElementById('trace-toolbar');
    if (!list) return;
    if (!list.dataset.bound) {
        list.addEventListener('click', (e) => {
            const del = e.target.closest('[data-delete-session]');
            if (del) return;
            const row = e.target.closest('[data-session-row]');
            if (!row) return;
            const sid = Number(row.dataset.sessionRow || 0) || null;
            if (sid) openSessionDetail(sid);
        });
        list.dataset.bound = '1';
    }

    const q = (document.getElementById('trace-search')?.value || '').toLowerCase().trim();
    const ordered = _sessions.slice().sort((a, b) => b.startedAt - a.startedAt);
    const filtered = q
        ? ordered.filter(s => {
            const host = (s.hostname || 'unknown').toLowerCase();
            const url = (s.url || '').toLowerCase();
            return host.includes(q) || url.includes(q);
        })
        : ordered;

    const badge = document.getElementById('badge-trace');
    if (badge) badge.textContent = String(ordered.length);

    if (!filtered.length) {
        if (searchBox) searchBox.style.display = ordered.length ? 'block' : 'none';
        if (toolbar) toolbar.style.display = ordered.length ? 'flex' : 'none';
        if (empty) empty.style.display = 'block';
        list.style.display = 'none';
        return;
    }

    if (searchBox) searchBox.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    list.style.display = 'block';

    list.innerHTML = filtered.map(session => {
        const host = session.hostname || 'unknown';
        const project = _projects?.[host];
        const displayName = project?.displayName || host;
        const faviconUrl = project?.faviconUrl || '';
        const stepCount = _stepCountBySession[session.id] || 0;
        return `
        <div class="session-row" data-session-row="${session.id}">
            <div class="favicon" style="background-image:url('${esc(faviconUrl)}')">
                <span class="favicon-fallback">${esc((displayName || host || '?')[0] || '?')}</span>
            </div>
            <div class="session-body">
                <div class="session-head">
                    <div class="session-title" title="${esc(displayName)}">${esc(displayName)}</div>
                    <div class="session-steps">${stepCount} ${t('trace.steps')}</div>
                </div>
                <div class="session-sub">${esc(host)} · ${esc(formatSessionLabel(session))}</div>
            </div>
            <div class="session-actions">
                <button class="btn btn-ghost btn-sm btn-icon btn-del btn-danger" data-delete-session="${session.id}" title="${t('trace.delete_session')}">DEL</button>
            </div>
        </div>
    `;
    }).join('');

    list.querySelectorAll('[data-delete-session]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sid = Number(btn.dataset.deleteSession);
            if (sid) await deleteSessionById(sid);
        });
    });
}

function openSessionDetail(sessionId) {
    _currentSessionId = sessionId;

    const detail = document.getElementById('trace-detail');
    const list = document.getElementById('trace-list');
    const searchBox = document.getElementById('trace-search-box');
    const toolbar = document.getElementById('trace-toolbar');
    if (detail) detail.style.display = 'block';
    if (list) list.style.display = 'none';
    if (searchBox) searchBox.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    if (sessionId) loadSession(sessionId);
    else renderSessionEmpty();
}

function closeDetail() {
    const detail = document.getElementById('trace-detail');
    const list = document.getElementById('trace-list');
    const searchBox = document.getElementById('trace-search-box');
    const toolbar = document.getElementById('trace-toolbar');
    if (detail) detail.style.display = 'none';
    if (list) list.style.display = 'block';
    if (searchBox) searchBox.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';
    _currentSessionId = null;
    _currentSteps = [];
}

async function deleteSessionById(sessionId, options = {}) {
    if (!confirm(t('trace.delete_session_confirm'))) return;
    await Steps.deleteBySession(sessionId);
    await Errors.deleteBySession(sessionId);
    await Sessions.delete(sessionId);
    if (options.close) closeDetail();
    await refreshSessions();
}

async function deleteAllSessions() {
    if (!confirm(t('trace.delete_all_confirm'))) return;
    const sessions = await Sessions.getAll();
    const steps = await Steps.getAll();
    const errors = await Errors.getAll();
    await Promise.all((steps || []).map(s => Steps.delete(s.id)));
    await Promise.all((errors || []).map(e => Errors.delete(e.id)));
    await Promise.all((sessions || []).map(s => Sessions.delete(s.id)));
    closeDetail();
    await refreshSessions();
}

async function loadSession(sessionId) {
    if (!sessionId) return;
    _currentSessionId = sessionId;
    _currentSteps = (await Steps.getBySession(sessionId) || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    renderActiveTab();
}

function renderSessionEmpty() {
    document.getElementById('trace-steps').innerHTML = emptyBlock(t('details.no_session'));
    document.getElementById('trace-networks').innerHTML = emptyBlock(t('details.no_session'));
    document.getElementById('trace-images').innerHTML = emptyBlock(t('details.no_session'));
}

function setActiveTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('[data-trace-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.traceTab === tab);
    });
    document.querySelectorAll('#tab-trace .detail-panel').forEach(p => {
        p.classList.toggle('active', p.id === `trace-${tab}`);
    });
    renderActiveTab();
}

function renderActiveTab() {
    if (_activeTab === 'steps') return renderSteps();
    if (_activeTab === 'networks') return renderNetworks();
    return renderImages();
}

function renderSteps() {
    const target = document.getElementById('trace-steps');
    const steps = _currentSteps.filter(s => !isNetworkStep(s) && !s.screenshot);
    if (!steps.length) {
        target.innerHTML = emptyBlock(t('details.empty_steps'));
        return;
    }

    target.innerHTML = `
      ${steps.map(step => {
        const { cls, icon } = stepIcon(step.type);
        const sel = step.selector ? `<div class="step-selector">${esc(step.selector)}</div>` : '';
        const val = step.value && !step.isMasked
            ? `<div class="step-selector" style="color:var(--text-subtle)">val: ${esc(String(step.value).slice(0, 80))}</div>`
            : '';
        const label = step.label || step.action || step.type;
        const err = step.type === 'error' && step.message
            ? `<div class="step-selector" style="color:var(--danger)">${esc(step.message)}</div>`
            : '';
        const note = step.note
            ? `<div class="step-selector" style="color:var(--text-subtle)">note: ${esc(String(step.note).slice(0, 80))}</div>`
            : '';
        return `
          <div class="card-mini step-card">
            <div class="step-icon ${cls}">${icon}</div>
            <div class="step-body">
              <div class="row-between step-head">
                <div class="row" style="gap:6px">
                  <span class="badge badge-gray">${esc(step.type)}</span>
                  <span class="step-action">${esc(label)}</span>
                </div>
                <div class="row" style="gap:8px">
                  <button class="btn btn-ghost btn-sm btn-icon btn-del" data-delete-step="${step.id}" title="Delete">DEL</button>
                </div>
              </div>
              ${sel}
              ${val}
              ${note}
              ${err}
            </div>
          </div>`;
    }).join('')}`;
    target.querySelectorAll('[data-delete-step]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.deleteStep);
            if (id) await deleteStepById(id);
        });
    });
}

function renderNetworks() {
    const target = document.getElementById('trace-networks');
    const nets = _currentSteps.filter(s => isNetworkStep(s));
    if (!nets.length) {
        target.innerHTML = emptyBlock(t('details.empty_networks'));
        return;
    }

    target.innerHTML = `
      ${nets.map(step => {
        const statusBad = step.status >= 400 || step.error;
        const statusLine = step.error
            ? `<div class="step-selector" style="color:var(--danger)">Error: ${esc(step.error)}</div>`
            : (step.status >= 400
                ? `<div class="step-selector" style="color:var(--danger)">HTTP ${step.status}</div>`
                : '');
        return `
          <div class="card-mini step-card">
            <div class="step-icon icon-network"></div>
            <div class="step-body">
              <div class="row-between step-head">
                <div class="row" style="gap:6px">
                  <span class="badge badge-yellow">network</span>
                  <span class="step-action">${esc(step.method || '')} ${esc(String(step.status || ''))}</span>
                </div>
                <div class="row" style="gap:8px">
                  <button class="btn btn-ghost btn-sm btn-icon btn-del" data-delete-step="${step.id}" title="Delete">DEL</button>
                </div>
              </div>
              <div class="step-selector">${esc(step.url || '')}</div>
              ${step.body ? `<div class="step-selector" style="color:var(--text-subtle)">body: ${esc(String(step.body).slice(0, 120))}</div>` : ''}
              ${statusLine}
            </div>
          </div>`;
    }).join('')}`;
    target.querySelectorAll('[data-delete-step]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.deleteStep);
            if (id) await deleteStepById(id);
        });
    });
}

function renderImages() {
    const target = document.getElementById('trace-images');
    const imgs = _currentSteps.filter(s => s.screenshot);
    if (!imgs.length) {
        target.innerHTML = emptyBlock(t('details.empty_images'));
        return;
    }

    target.innerHTML = `
      <div class="image-grid-simple">
        ${imgs.map(step => `
          <div class="image-card-simple image-card" data-image-step="${step.id}">
            <img src="${step.screenshot}" alt="screenshot" loading="lazy" />
            <button class="btn btn-ghost btn-sm btn-icon btn-del image-del" data-delete-step="${step.id}" title="Delete">X</button>
            <div class="image-meta-simple">
              <span>${formatTime(step.timestamp)}</span>
              <span>${esc(step.label || step.action || step.type || '')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    target.querySelectorAll('[data-image-step]').forEach(card => {
        card.addEventListener('click', () => {
            const id = Number(card.dataset.imageStep);
            const step = _currentSteps.find(s => s.id === id);
            if (step) openImageModal(step);
        });
    });
    target.querySelectorAll('[data-delete-step]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.deleteStep);
            if (id) await deleteStepById(id);
        });
    });
}

function isNetworkStep(step) {
    if (!step) return false;
    if (step.type === 'network') return true;
    if (step.action === 'api_call') return true;
    if (step.method || step.status) return true;
    if (step.url && !['navigate', 'navigation', 'pageload'].includes(step.type)) return true;
    return false;
}

function isUserStep(step) {
    return step && !isNetworkStep(step) && !step.screenshot;
}

function formatSessionLabel(session) {
    const duration = session.endedAt
        ? `${Math.round((session.endedAt - session.startedAt) / 1000)}s`
        : t('details.in_progress');
    return `${formatDateTime(session.startedAt)} · ${duration}`;
}

function formatDateTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('vi-VN', { hour12: false });
}

function emptyBlock(text) {
    return `
      <div class="empty">
        <div class="empty-icon"></div>
        <div class="empty-title">${esc(text)}</div>
      </div>`;
}

function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function initImageModal() {
    const modal = document.getElementById('image-modal');
    if (!modal) return;

    const img = document.getElementById('image-modal-img');
    const note = document.getElementById('image-modal-note');
    const time = document.getElementById('image-modal-time');

    const btnOpen = document.getElementById('image-modal-open');
    const btnClose = document.getElementById('image-modal-close');
    const backdrop = document.getElementById('image-modal-backdrop');

    if (!img || !note || !time) return;

    const close = () => {
        modal.style.display = 'none';
    };

    btnClose?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    btnOpen?.addEventListener('click', () => {
        if (_imageModal?.step?.id) {
            const url = chrome.runtime.getURL(`editor/editor.html?stepId=${_imageModal.step.id}`);
            chrome.tabs.create({ url });
        }
    });

    _imageModal = { modal, img, note, time };
}

function openImageModal(step) {
    if (!_imageModal) return;
    const { modal, img, note, time } = _imageModal;
    _imageModal.step = step;
    img.src = step.screenshot;
    note.value = step.note || '';
    time.textContent = formatDateTime(step.timestamp);
    modal.style.display = 'flex';
    img.onload = null;
}

async function deleteStepById(id) {
    if (!confirm(t('trace.delete_confirm'))) return;
    await Steps.delete(id);
    await Steps.recountSession(_currentSessionId);
    _currentSteps = (await Steps.getBySession(_currentSessionId) || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    renderActiveTab();
}

async function exportSession(format) {
    if (!_currentSessionId) return;
    const session = await Sessions.get(_currentSessionId);
    const steps = (_currentSteps || []).slice();
    const data = buildExport(format, session, steps);
    const blob = new Blob([data.text], { type: data.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyExport(format) {
    if (!_currentSessionId) return;
    const session = await Sessions.get(_currentSessionId);
    const steps = (_currentSteps || []).slice();
    const data = buildExport(format, session, steps);
    try {
        await navigator.clipboard.writeText(data.text);
    } catch {
        // Ignore clipboard failures in restricted contexts.
    }
}

function buildExport(format, session, steps) {
    const ordered = (steps || []).slice().sort((a, b) => a.timestamp - b.timestamp);
    const actions = ordered.filter(isUserStep);
    const networks = ordered.filter(isNetworkStep);
    const screenshots = ordered.filter(s => s.screenshot);

    const sessionInfo = session ? compact({
        url: session.url || null,
        hostname: session.hostname || null,
        startedAtISO: session.startedAt ? new Date(session.startedAt).toISOString() : null,
        endedAtISO: session.endedAt ? new Date(session.endedAt).toISOString() : null,
        durationSec: session.endedAt ? Math.round((session.endedAt - session.startedAt) / 1000) : null,
        note: session.note || null,
    }) : null;

    const summary = compact({
        steps: actions.length,
        networks: networks.length,
        images: screenshots.length,
    });

    if (format === 'json') {
        const payload = compact({
            meta: {
                app: 'NebulaTraceX',
                exportedAt: new Date().toISOString(),
                formatVersion: 2,
            },
            session: sessionInfo,
            summary,
            steps: actions.map(pickStep).filter(Boolean),
            networks: networks.map(pickNetwork).filter(Boolean),
            images: screenshots.map(pickImage).filter(Boolean),
        });
        return {
            text: JSON.stringify(payload, null, 2),
            mime: 'application/json',
            filename: `nebula-trace-${_currentSessionId}.json`,
        };
    }

    const lines = [];
    lines.push('# NebulaTraceX');
    lines.push('');
    if (sessionInfo) {
        if (sessionInfo.url) lines.push(`- URL: ${mdEscape(sessionInfo.url)}`);
        if (sessionInfo.hostname) lines.push(`- Hostname: ${mdEscape(sessionInfo.hostname)}`);
        if (sessionInfo.startedAtISO) lines.push(`- Started: ${sessionInfo.startedAtISO}`);
        if (sessionInfo.endedAtISO) lines.push(`- Ended: ${sessionInfo.endedAtISO}`);
        if (sessionInfo.durationSec != null) lines.push(`- Duration: ${formatDuration(sessionInfo.durationSec)}`);
        if (sessionInfo.note) lines.push(`- Note: ${mdEscape(sessionInfo.note)}`);
        lines.push('');
    }
    lines.push('## Summary');
    lines.push(`- Steps: ${summary.steps}`);
    lines.push(`- Networks: ${summary.networks}`);
    lines.push(`- Images: ${summary.images}`);
    lines.push('');
    lines.push('## Steps');
    if (!actions.length) lines.push('- No steps recorded');
    actions.forEach((s, i) => {
        const label = s.label || s.action || '';
        lines.push(`${i + 1}. [${formatDateTime(s.timestamp)}] ${mdEscape(s.type)} ${mdEscape(label)}`);
        if (s.selector) lines.push(`- selector: \`${mdEscape(s.selector)}\``);
        if (s.value && !s.isMasked) lines.push(`- value: ${mdEscape(String(s.value))}`);
        if (s.isMasked) lines.push(`- value: [MASKED]`);
    });
    lines.push('');
    lines.push('## Networks');
    if (!networks.length) lines.push('- No network calls recorded');
    networks.forEach((s, i) => {
        lines.push(`${i + 1}. [${formatDateTime(s.timestamp)}] ${mdEscape(s.method || '')} ${mdEscape(String(s.status || ''))}`);
        if (s.url) lines.push(`- url: ${mdEscape(s.url)}`);
        if (s.error) lines.push(`- error: ${mdEscape(s.error)}`);
        else if (s.body) lines.push(`- body: ${mdEscape(String(s.body))}`);
    });
    lines.push('');
    lines.push('## Images');
    if (!screenshots.length) lines.push('- No screenshots recorded');
    screenshots.forEach((s, i) => {
        lines.push(`${i + 1}. [${formatDateTime(s.timestamp)}] ${mdEscape(s.label || s.action || s.type || '')}`);
    });

    return {
        text: lines.join('\n'),
        mime: 'text/markdown',
        filename: `nebula-trace-${_currentSessionId}.md`,
    };
}

function pickStep(step) {
    return compact({
        type: step.type || null,
        action: step.action || null,
        label: step.label || null,
        selector: step.selector || null,
        value: step.isMasked ? '[MASKED]' : (step.value ?? null),
        timestampISO: step.timestamp ? new Date(step.timestamp).toISOString() : null,
    });
}

function pickNetwork(step) {
    return compact({
        method: step.method || null,
        status: step.status ?? null,
        url: step.url || null,
        error: step.error || null,
        body: step.error ? null : (step.body || null),
        timestampISO: step.timestamp ? new Date(step.timestamp).toISOString() : null,
    });
}

function pickImage(step) {
    return compact({
        label: step.label || step.action || step.type || null,
        timestampISO: step.timestamp ? new Date(step.timestamp).toISOString() : null,
    });
}

function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '';
    return `${seconds}s`;
}

function compact(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined || v === '') continue;
        if (Array.isArray(v) && v.length === 0) continue;
        out[k] = v;
    }
    return out;
}

function mdEscape(text) {
    return String(text || '')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/`/g, '\\`');
}
