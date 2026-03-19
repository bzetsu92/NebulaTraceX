import { Sessions, Steps } from '../../storage/sessions.js';
import { t } from '../i18n.js';
import { esc, formatTime, timeAgo, stepIcon } from '../ui/utils.js';

let _currentSession = null;
let _session = null;
let _steps = [];
let _activeTab = 'steps';

export function initExportTab() {
    document.querySelectorAll('[data-detail-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.detailTab;
            setActiveTab(tab);
        });
    });

    return { loadSession, refreshIfActive };
}

async function loadSession(sessionId) {
    if (!sessionId) return;
    _currentSession = sessionId;
    await refresh();
}

async function refreshIfActive(sessionId) {
    const panel = document.getElementById('tab-export');
    if (!panel?.classList.contains('active')) return;
    if (sessionId) _currentSession = sessionId;
    await refresh();
}

async function refresh() {
    if (!_currentSession) {
        renderEmpty();
        return;
    }
    const [session, steps] = await Promise.all([
        Sessions.get(_currentSession),
        Steps.getBySession(_currentSession),
    ]);
    _session = session || null;
    _steps = (steps || []).slice().sort((a, b) => a.timestamp - b.timestamp);

    renderHeader();
    renderActiveTab();
}

function setActiveTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('[data-detail-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.detailTab === tab);
    });
    document.querySelectorAll('.detail-panel').forEach(p => {
        p.classList.toggle('active', p.id === `detail-${tab}`);
    });
    renderActiveTab();
}

function renderHeader() {
    const urlEl = document.getElementById('detail-session-url');
    const timeEl = document.getElementById('detail-session-time');
    const durEl = document.getElementById('detail-session-duration');
    const noteEl = document.getElementById('detail-session-note');
    const countSteps = document.getElementById('detail-count-steps');
    const countNet = document.getElementById('detail-count-networks');
    const countImg = document.getElementById('detail-count-images');

    if (!_session) {
        urlEl.textContent = t('details.no_session');
        timeEl.textContent = '--:--';
        durEl.textContent = '--';
        noteEl.textContent = '';
        countSteps.textContent = `${t('details.count_steps')}: 0`;
        countNet.textContent = `${t('details.count_networks')}: 0`;
        countImg.textContent = `${t('details.count_images')}: 0`;
        return;
    }

    urlEl.textContent = _session.url || t('common.unknown_url');
    timeEl.textContent = formatTime(_session.startedAt);
    if (_session.endedAt) {
        const secs = Math.round((_session.endedAt - _session.startedAt) / 1000);
        durEl.textContent = `${secs}s`;
    } else {
        durEl.textContent = t('details.in_progress');
    }
    noteEl.textContent = _session.note || '';

    const nonNetwork = _steps.filter(s => s.type !== 'network');
    const nets = _steps.filter(s => s.type === 'network');
    const imgs = _steps.filter(s => s.screenshot);
    countSteps.textContent = `${t('details.count_steps')}: ${nonNetwork.length}`;
    countNet.textContent = `${t('details.count_networks')}: ${nets.length}`;
    countImg.textContent = `${t('details.count_images')}: ${imgs.length}`;
}

function renderActiveTab() {
    if (_activeTab === 'steps') return renderSteps();
    if (_activeTab === 'networks') return renderNetworks();
    return renderImages();
}

function renderSteps() {
    const target = document.getElementById('detail-steps');
    const steps = _steps.filter(s => s.type !== 'network');
    if (!steps.length) {
        target.innerHTML = emptyBlock(t('details.empty_steps'));
        return;
    }

    target.innerHTML = steps.map(step => {
        const { cls, icon } = stepIcon(step.type);
        const sel = step.selector ? `<div class="step-selector">${esc(step.selector)}</div>` : '';
        const val = step.value && !step.isMasked
            ? `<div class="step-selector" style="color:var(--text-subtle)">val: ${esc(String(step.value).slice(0, 80))}</div>`
            : '';
        const label = step.label || step.action || step.type;
        const err = step.type === 'error' && step.message
            ? `<div class="step-selector" style="color:var(--danger)">${esc(step.message)}</div>`
            : '';
        return `
          <div class="card-mini">
            <div class="step-icon ${cls}">${icon}</div>
            <div class="step-body">
              <div class="row" style="gap:6px;margin-bottom:2px">
                <span class="badge badge-gray">${esc(step.type)}</span>
                <span class="step-action">${esc(label)}</span>
              </div>
              ${sel}
              ${val}
              ${err}
            </div>
            <div class="step-time">${timeAgo(step.timestamp)}</div>
          </div>`;
    }).join('');
}

function renderNetworks() {
    const target = document.getElementById('detail-networks');
    const nets = _steps.filter(s => s.type === 'network');
    if (!nets.length) {
        target.innerHTML = emptyBlock(t('details.empty_networks'));
        return;
    }

    target.innerHTML = nets.map(step => {
        const statusBad = step.status >= 400 || step.error;
        const statusLine = step.error
            ? `<div class="step-selector" style="color:var(--danger)">Error: ${esc(step.error)}</div>`
            : (step.status >= 400
                ? `<div class="step-selector" style="color:var(--danger)">HTTP ${step.status}</div>`
                : '');
        return `
          <div class="card-mini">
            <div class="step-icon icon-network"></div>
            <div class="step-body">
              <div class="row" style="gap:6px;margin-bottom:2px">
                <span class="badge badge-yellow">network</span>
                <span class="step-action">${esc(step.method || '')} ${esc(String(step.status || ''))}</span>
                ${statusBad ? '' : ''}
              </div>
              <div class="step-selector">${esc(step.url || '')}</div>
              ${step.body ? `<div class="step-selector" style="color:var(--text-subtle)">body: ${esc(String(step.body).slice(0, 120))}</div>` : ''}
              ${statusLine}
            </div>
            <div class="step-time">${timeAgo(step.timestamp)}</div>
          </div>`;
    }).join('');
}

function renderImages() {
    const target = document.getElementById('detail-images');
    const imgs = _steps.filter(s => s.screenshot);
    if (!imgs.length) {
        target.innerHTML = emptyBlock(t('details.empty_images'));
        return;
    }

    target.innerHTML = `
      <div class="image-grid">
        ${imgs.map(step => `
          <div class="image-card">
            <img src="${step.screenshot}" alt="screenshot" loading="lazy" />
            <div class="image-meta">
              <span>${formatTime(step.timestamp)}</span>
              <span>${esc(step.label || step.action || step.type || '')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
}

function renderEmpty() {
    document.getElementById('detail-session-url').textContent = t('details.no_session');
    document.getElementById('detail-session-time').textContent = '--:--';
    document.getElementById('detail-session-duration').textContent = '--';
    document.getElementById('detail-session-note').textContent = '';
    document.getElementById('detail-count-steps').textContent = `${t('details.count_steps')}: 0`;
    document.getElementById('detail-count-networks').textContent = `${t('details.count_networks')}: 0`;
    document.getElementById('detail-count-images').textContent = `${t('details.count_images')}: 0`;
    document.getElementById('detail-steps').innerHTML = emptyBlock(t('details.no_session'));
    document.getElementById('detail-networks').innerHTML = emptyBlock(t('details.no_session'));
    document.getElementById('detail-images').innerHTML = emptyBlock(t('details.no_session'));
}

function emptyBlock(text) {
    return `
      <div class="empty">
        <div class="empty-icon"></div>
        <div class="empty-title">${esc(text)}</div>
      </div>`;
}
