import { sendMsg, formatTime, stepIcon, stepBadge, timeAgo } from '../ui/utils.js';
import { t } from '../i18n.js';

let _state = { recording: false, sessionId: null, startTime: null };
let _timer = null;

export function initRecorderTab(onStepsUpdate, onViewSite) {
    const btnStart = document.getElementById('btn-start');
    const btnShot = document.getElementById('btn-screenshot');
    const btnView = document.getElementById('btn-view-site');
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    const elapsedEl = document.getElementById('elapsed-time');
    const sessionUrl = document.getElementById('session-url');
    const noteField = document.getElementById('session-note');
    const logoDot = document.getElementById('logo-dot');

    const START_STOP_SHORTCUT = 'Cmd+Shift+Y';
    const SCREENSHOT_SHORTCUT = 'Cmd+Shift+S';

    btnStart.title = `${t('recorder.start_btn')} (${START_STOP_SHORTCUT})`;
    if (btnShot?.title && !btnShot.title.includes(SCREENSHOT_SHORTCUT)) {
        btnShot.title = `${btnShot.title} (${SCREENSHOT_SHORTCUT})`;
    } else if (btnShot) {
        btnShot.title = `${t('recorder.screenshot_btn')} (${SCREENSHOT_SHORTCUT})`;
    }

    refreshState();

    async function refreshState() {
        const state = await sendMsg({ type: 'GET_STATE' });
        if (!state) return;
        const fullUrl = state.url || 'Unknown URL';
        sessionUrl.title = fullUrl;
        sessionUrl.textContent = shorten(fullUrl, 56);
        if (state.recording && state.sessionId) {
            enterRecording(state.sessionId, state.startedAt || null);
        } else {
            exitRecording();
        }
    }

    btnStart.addEventListener('click', async () => {
        if (_state.recording) {
            // Stop
            btnStart.disabled = true;
            const res = await sendMsg({ type: 'STOP_RECORDING' });
            btnStart.disabled = false;
            if (res?.ok) {
                exitRecording();
                onStepsUpdate && onStepsUpdate(res.sessionId);
                if (btnView) {
                    btnView.style.display = 'inline-flex';
                    btnView.dataset.sessionId = res.sessionId;
                }
            }
        } else {
            // Start
            btnStart.disabled = true;
            const res = await sendMsg({ type: 'START_RECORDING' });
            btnStart.disabled = false;
            if (res?.ok) {
                enterRecording(res.sessionId);
                if (btnView) btnView.style.display = 'none';
            } else {
                showError(res?.error);
            }
        }
    });

    btnShot.addEventListener('click', async () => {
        if (!_state.recording) return;
        btnShot.disabled = true;
        await sendMsg({ type: 'TRIGGER_CAPTURE_SCREENSHOT' });
        setTimeout(() => { btnShot.disabled = false; }, 1000);
    });

    let noteTimer;
    noteField.addEventListener('input', () => {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(() => {
            if (_state.sessionId) {
                sendMsg({ type: 'ADD_NOTE', sessionId: _state.sessionId, note: noteField.value });
            }
        }, 1000);
    });

    function enterRecording(sessionId, startedAt = null) {
        const baseStart = startedAt && !Number.isNaN(startedAt) ? startedAt : Date.now();
        _state = { recording: true, sessionId, startTime: _state.startTime || baseStart };
        btnStart.textContent = t('recorder.stop_btn');
        btnStart.title = `${t('recorder.stop_btn')} (${START_STOP_SHORTCUT})`;
        btnStart.className = 'btn btn-danger btn-record';
        btnShot.disabled = false;
        setStatus('active', t('recorder.recording'));
        logoDot.classList.add('recording');
        startTimer();
    }

    function exitRecording() {
        _state = { recording: false, sessionId: null, startTime: null };
        btnStart.textContent = t('recorder.start_btn');
        btnStart.title = `${t('recorder.start_btn')} (${START_STOP_SHORTCUT})`;
        btnStart.className = 'btn btn-primary btn-record';
        btnShot.disabled = true;
        setStatus('idle', t('recorder.ready'));
        logoDot.classList.remove('recording');
        stopTimer();
    }

    function setStatus(cls, text) {
        statusBar.className = `status-bar ${cls}`;
        statusText.textContent = text;
    }

    function startTimer() {
        _state.startTime = _state.startTime || Date.now();
        stopTimer();
        _timer = setInterval(() => {
            const secs = Math.floor((Date.now() - _state.startTime) / 1000);
            elapsedEl.textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(_timer);
        elapsedEl.textContent = '00:00';
    }

    if (btnView) {
        btnView.addEventListener('click', () => {
            const sid = Number(btnView.dataset.sessionId);
            if (sid && onViewSite) onViewSite(sid);
        });
    }

    return { getState: () => _state };
}

export function renderRecentSteps(steps) {
    const container = document.getElementById('recent-steps');
    if (!steps || !steps.length) {
        container.innerHTML = `
      <div class="empty">
        <div class="empty-icon"></div>
        <div class="empty-title">${t('recorder.empty_title')}</div>
        <div class="empty-desc">${t('recorder.empty_desc')}</div>
      </div>`;
        return;
    }
    const last5 = steps.slice(-5).reverse();
    container.innerHTML = last5.map(step => renderStepCard(step)).join('');
}

export function renderStepCard(step) {
    const { icon, cls } = stepIcon(step.type);
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
}

function showError(msg) {
    console.warn('[NebulaTraceX]', msg);
}

function pad(n) { return String(n).padStart(2, '0'); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function shorten(s, max) {
    const str = String(s || '');
    if (str.length <= max) return str;
    return str.slice(0, Math.max(0, max - 1)) + '…';
}
