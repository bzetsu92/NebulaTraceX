import { stepIcon, timeAgo } from '../ui/utils.js';
import { t } from '../i18n.js';

let _allSteps = [];

export function initLogsTab() {
    const search = document.getElementById('log-search');
    const filter = document.getElementById('log-filter');
    const list = document.getElementById('steps-list');

    search.addEventListener('input', debounce(render, 200));
    filter.addEventListener('change', render);

    return { setSteps };
}

function setSteps(steps) {
    _allSteps = steps || [];
    document.getElementById('badge-steps').textContent = _allSteps.length;
    render();
}

function render() {
    const q = (document.getElementById('log-search')?.value || '').toLowerCase();
    const typ = document.getElementById('log-filter')?.value || '';
    const list = document.getElementById('steps-list');

    let filtered = _allSteps;
    if (typ) filtered = filtered.filter(s => s.type === typ || s.action?.includes(typ));
    if (q) filtered = filtered.filter(s =>
        (s.selector || '').toLowerCase().includes(q) ||
        (s.action || '').toLowerCase().includes(q) ||
        (s.label || '').toLowerCase().includes(q) ||
        (s.url || '').toLowerCase().includes(q)
    );

    if (!filtered.length) {
        list.innerHTML = `
      <div class="empty">
        <div class="empty-icon"></div>
        <div class="empty-title">${t('logs.empty_no_results')}</div>
        <div class="empty-desc">${_allSteps.length ? t('logs.empty_try_filter') : t('logs.empty_no_steps')}</div>
      </div>`;
        return;
    }

    list.innerHTML = filtered.slice().reverse().map(step => {
        const { icon, cls } = stepIcon(step.type);
        const sel = step.selector ? `<div class="step-selector">${esc(step.selector)}</div>` : '';
        const url = step.type === 'network' && step.url
            ? `<div class="step-selector">${esc(step.url)}</div>`
            : '';
        const badge = typeBadge(step.type);
        const net = step.type === 'network'
            ? `<span style="font-size:10px;color:var(--text-subtle);margin-left:4px">${step.method || ''} ${step.status || ''}</span>`
            : '';
        return `
      <div class="card-mini" style="align-items:flex-start">
        <div class="step-icon ${cls}">${icon}</div>
        <div class="step-body">
          <div class="row" style="gap:6px;margin-bottom:2px">
            ${badge}
            <span class="step-action">${esc(step.label || step.action || step.type)}</span>
            ${net}
          </div>
          ${url}
          ${sel}
          ${step.value && !step.isMasked
                ? `<div class="step-selector" style="color:var(--text-subtle)">val: ${esc(String(step.value).slice(0, 60))}</div>` : ''}
          ${step.status >= 400
                ? `<div class="step-selector" style="color:var(--danger)">HTTP ${step.status}</div>` : ''}
          ${step.error
                ? `<div class="step-selector" style="color:var(--danger)">Error: ${esc(step.error)}</div>` : ''}
        </div>
        <div class="step-time">${timeAgo(step.timestamp)}</div>
      </div>`;
    }).join('');
}

function typeBadge(type) {
    const map = {
        click: ['badge-blue', ''],
        input: ['badge-purple', ''],
        submit: ['badge-green', ''],
        network: ['badge-yellow', ''],
        navigate: ['badge-gray', ''],
        error: ['badge-red', ''],
    };
    const [cls, icon] = map[type] || ['badge-gray', ''];
    return `<span class="badge ${cls}">${type}</span>`;
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

export { setSteps };
