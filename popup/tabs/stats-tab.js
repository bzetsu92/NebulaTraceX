import { Projects } from '../../storage/projects.js';
import { sendMsg } from '../ui/utils.js';
import { t } from '../i18n.js';

let _loaded = false;
let _stats = [];
let _sortCol = 'stepCount';
let _sortDir = -1; // -1 = desc

export function initStatsTab() {
    document.querySelectorAll('#stats-table th').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (_sortCol === col) _sortDir *= -1;
            else { _sortCol = col; _sortDir = -1; }
            renderTable();
        });
    });

    document.getElementById('btn-clear')?.addEventListener('click', async () => {
        if (!confirm(t('stats.clear_confirm'))) return;
        await sendMsg({ type: 'CLEAR_ALL' });
        _loaded = false;
        _stats = [];
        renderTable();
        document.getElementById('chart-bar')?.getContext('2d') && location.reload();
    });

    return { loadStats };
}

async function loadStats() {
    if (_loaded) return;
    document.getElementById('stats-skeleton').style.display = 'block';
    document.getElementById('stats-content').style.display = 'none';

    _stats = await Projects.computeStats();
    _loaded = true;

    document.getElementById('stats-skeleton').style.display = 'none';
    document.getElementById('stats-content').style.display = 'block';

    renderTable();
    await loadCharts();
}

function renderTable() {
    const tbody = document.getElementById('stats-tbody');
    if (!tbody) return;

    const sorted = [..._stats].sort((a, b) => {
        const av = a[_sortCol] ?? '';
        const bv = b[_sortCol] ?? '';
        return typeof av === 'number'
            ? (av - bv) * _sortDir
            : String(av).localeCompare(String(bv)) * _sortDir;
    });

    if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-subtle);padding:24px">${t('stats.empty_data')}</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(row => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="color-dot" style="background:${row.color}"></span>
          <span title="${esc(row.hostname)}">${esc(row.displayName)}</span>
        </div>
      </td>
      <td><span class="badge badge-blue">${row.sessionCount}</span></td>
      <td><span class="badge badge-gray">${row.stepCount}</span></td>
      <td><span class="${row.errorCount > 0 ? 'badge badge-red' : 'badge badge-gray'}">${row.errorCount}</span></td>
    </tr>`
    ).join('');
}

async function loadCharts() {
    if (!_stats.length) return;

    const labels = _stats.map(s => s.displayName.slice(0, 16));
    const colors = _stats.map(s => s.color);
    const steps = _stats.map(s => s.stepCount);

    const isDark = document.documentElement.dataset.theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#8b949e' : '#6b7280';

    renderBarChart('chart-bar', { labels, values: steps, colors, gridColor, labelColor, isDark });
    renderDoughnutChart('chart-pie', { labels, values: steps, colors, isDark });

    const legend = document.getElementById('chart-legend');
    if (legend) {
        legend.innerHTML = _stats.map(s => `
        <div style="display:flex;align-items:center;gap:6px">
          <span class="color-dot" style="background:${s.color}"></span>
          <span style="color:var(--text)">${esc(s.displayName.slice(0, 20))}</span>
          <span style="color:var(--text-subtle)">${s.stepCount}</span>
        </div>`).join('');
    }
}

function getCanvas2D(canvasEl) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvasEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height || canvasEl.height || 1));
    canvasEl.width = Math.round(width * dpr);
    canvasEl.height = Math.round(height * dpr);
    const ctx = canvasEl.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

function renderBarChart(canvasId, { labels, values, colors, gridColor, labelColor }) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = getCanvas2D(canvas);
    if (!ctx) return;

    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height || canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 28;
    const padRight = 8;
    const padTop = 10;
    const padBottom = 18;

    const plotW = Math.max(1, w - padLeft - padRight);
    const plotH = Math.max(1, h - padTop - padBottom);

    const maxVal = Math.max(1, ...values);

    const gridLines = 4;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
        const y = padTop + (plotH * i) / gridLines;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
    }

    const n = values.length || 1;
    const gap = 8;
    const barW = Math.max(6, (plotW - gap * (n - 1)) / n);

    for (let i = 0; i < n; i++) {
        const v = values[i] ?? 0;
        const t = v / maxVal;
        const barH = plotH * t;
        const x = padLeft + i * (barW + gap);
        const y = padTop + (plotH - barH);

        ctx.fillStyle = colors[i] ? colors[i] + 'cc' : '#9ca3af';
        ctx.strokeStyle = colors[i] || '#6b7280';
        ctx.lineWidth = 1;

        roundRect(ctx, x, y, barW, barH, 4);
        ctx.fill();
        ctx.stroke();

        const showLabel = n <= 5 || i % 2 === 0;
        if (showLabel && labels[i]) {
            ctx.fillStyle = labelColor;
            ctx.font = '11px DM Sans, system-ui, sans-serif';
            const text = labels[i];
            ctx.save();
            ctx.translate(x + barW / 2, padTop + plotH + 13);
            ctx.textAlign = 'center';
            ctx.fillText(text, 0, 0);
            ctx.restore();
        }
    }
}

function renderDoughnutChart(canvasId, { values, colors, isDark }) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = getCanvas2D(canvas);
    if (!ctx) return;

    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height || canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 2;
    const thickness = Math.max(10, radius * 0.36);
    const innerR = radius - thickness;

    const total = values.reduce((a, b) => a + (b || 0), 0) || 1;
    let start = -Math.PI / 2;

    for (let i = 0; i < values.length; i++) {
        const val = values[i] || 0;
        const slice = (val / total) * Math.PI * 2;
        const end = start + slice;
        if (slice <= 0.00001) {
            continue;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, end);
        ctx.arc(cx, cy, innerR, end, start, true);
        ctx.closePath();
        ctx.fillStyle = (colors[i] || '#9ca3af') + 'cc';
        ctx.fill();
        ctx.strokeStyle = isDark ? '#0f1117' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        start = end;
    }
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
