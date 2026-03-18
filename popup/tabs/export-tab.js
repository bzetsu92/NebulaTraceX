import { Sessions, Steps } from '../../storage/sessions.js';
import { t } from '../i18n.js';

let _fmt = 'json';
let _currentSession = null;

export function initExportTab() {
    document.querySelectorAll('[data-fmt]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-fmt]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _fmt = btn.dataset.fmt;
            refreshPreview();
        });
    });

    document.getElementById('btn-export').addEventListener('click', doExport);
    document.getElementById('btn-copy-export').addEventListener('click', doCopy);
    document.getElementById('btn-copy-prompt').addEventListener('click', copyAIPrompt);

    return { loadSession };
}

async function loadSession(sessionId) {
    if (!sessionId) return;
    _currentSession = sessionId;
    await refreshPreview();
}

async function refreshPreview() {
    const previewEl = document.getElementById('export-preview');
    const sizeEl = document.getElementById('export-size');
    if (!_currentSession) {
        previewEl.textContent = t('export.no_session');
        return;
    }

    const { content } = await buildExport(_currentSession, _fmt);
    const kb = (new TextEncoder().encode(content).length / 1024).toFixed(1);

    previewEl.textContent = content.slice(0, 1200) + (content.length > 1200 ? '\n...(truncated)' : '');
    sizeEl.textContent = `~${kb} KB`;
}

async function buildExport(sessionId, fmt) {
    const [session, steps] = await Promise.all([
        Sessions.get(sessionId),
        Steps.getBySession(sessionId),
    ]);

    if (!session) return { content: '(session not found)', ext: fmt };

    if (fmt === 'json') {
        const payload = {
            session: {
                id: session.id,
                url: session.url,
                hostname: session.hostname,
                startedAt: new Date(session.startedAt).toISOString(),
                endedAt: session.endedAt ? new Date(session.endedAt).toISOString() : null,
                note: session.note || '',
            },
            steps: steps.map(s => ({
                ...s,
                screenshot: s.screenshot ? '[base64]' : undefined,
                timestamp: new Date(s.timestamp).toISOString(),
            })),
            summary: {
                totalSteps: steps.length,
                clicks: steps.filter(s => s.type === 'click').length || undefined,
                inputs: steps.filter(s => s.type === 'input').length || undefined,
                errors: steps.filter(s => s.type === 'error').length || undefined,
            },
        };
        return { content: JSON.stringify(payload, null, 2), ext: 'json' };
    }

    // Markdown
    const dur = session.endedAt
        ? Math.round((session.endedAt - session.startedAt) / 1000) + 's'
        : 'In progress';

    let md = `# Bug Report: ${session.hostname}\n\n`;
    md += `- **URL:** ${session.url}\n`;
    md += `- **Time:** ${new Date(session.startedAt).toLocaleString()}\n`;
    if (session.note) md += `- **Note:** ${session.note}\n`;
    md += `\n## Steps\n\n`;

    steps.forEach((step, i) => {
        const t_str = new Date(step.timestamp).toLocaleTimeString();
        md += `### ${i + 1}. ${capitalize(step.action || step.type)}\n`;
        md += `- **At:** ${t_str}\n`;
        if (step.selector) md += `- **Selector:** \`${step.selector}\`\n`;
        if (step.label) md += `- **Element:** ${step.label}\n`;
        if (step.value && !step.isMasked) md += `- **Value:** \`${String(step.value).slice(0, 100)}\`\n`;
        if (step.url && step.type === 'navigate') md += `- **To:** \`${step.url}\`\n`;
        if (step.screenshot) md += `- **Screenshot:** Attached\n`;
        md += `\n`;
    });

    md += `---\n\n## 📊 Summary\n\n`;
    md += `| Metric | Count |\n|---|---|\n`;
    md += `| Total steps | ${steps.length} |\n`;
    md += `| Clicks | ${steps.filter(s => s.type === 'click').length} |\n`;
    md += `| Inputs | ${steps.filter(s => s.type === 'input').length} |\n`;
    md += `| Network calls | ${steps.filter(s => s.type === 'network').length} |\n`;
    md += `| Errors | ${steps.filter(s => s.type === 'error').length} |\n`;
    md += `\n---\n*Exported by NebulaTraceX v1.0 – bzetsu92*\n`;

    return { content: md, ext: 'md' };
}

async function doExport() {
    if (!_currentSession) return alert(t('export.no_session'));
    const btn = document.getElementById('btn-export');
    btn.textContent = t('export.btn_exporting');
    btn.disabled = true;

    try {
        const [session, { content, ext }] = await Promise.all([
            Sessions.get(_currentSession),
            buildExport(_currentSession, _fmt),
        ]);

        // Include real screenshots in JSON
        let finalContent = content;
        if (_fmt === 'json') {
            const steps = await Steps.getBySession(_currentSession);
            const parsed = JSON.parse(content);
            parsed.steps = steps.map((s, i) => ({
                ...parsed.steps[i],
                screenshot: s.screenshot || undefined,
            }));
            finalContent = JSON.stringify(parsed, null, 2);
        }

        const blob = new Blob([finalContent], {
            type: ext === 'json' ? 'application/json' : 'text/markdown',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name = `bug-report-${session?.hostname || 'unknown'}-${Date.now()}.${ext}`;
        a.href = url; a.download = name;
        a.click();
        URL.revokeObjectURL(url);

        btn.textContent = t('export.btn_exported');
        setTimeout(() => { btn.textContent = t('export.btn_export'); btn.disabled = false; }, 2000);
    } catch (e) {
        btn.textContent = t('export.btn_export');
        btn.disabled = false;
        console.error(e);
    }
}

async function doCopy() {
    if (!_currentSession) return;
    const { content } = await buildExport(_currentSession, _fmt);
    await navigator.clipboard.writeText(content).catch(() => null);
    const btn = document.getElementById('btn-copy-export');
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '📋'; }, 1500);
}

function copyAIPrompt() {
    const prompt = `You are a senior fullstack engineer. Analyze the bug report below and provide:
1. Root cause
2. Specific fix with code example
3. Reproduction steps to verify the fix
4. Edge cases to consider

Bug Report:
---
[Paste export content here]`;
    navigator.clipboard.writeText(prompt).catch(() => null);
    const btn = document.getElementById('btn-copy-prompt');
    btn.textContent = t('export.ai_prompt_copied');
    setTimeout(() => { btn.textContent = t('export.ai_prompt_copy'); }, 2000);
}

function typeIcon(type) {
    return { click: '', input: '', submit: '', network: '', navigate: '', error: '' }[type] || '';
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
