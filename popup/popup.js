import { initRecorderTab, renderRecentSteps } from './tabs/recorder-tab.js';
import { initLogsTab, setSteps } from './tabs/logs-tab.js';
import { initExportTab } from './tabs/export-tab.js';
import { initStatsTab } from './tabs/stats-tab.js';
import { Sessions, Steps } from '../storage/sessions.js';
import { sendMsg } from './ui/utils.js';
import { translateDOM, t } from './i18n.js';

function initTheme() {
  const saved = localStorage.getItem('br-theme') || 'light';
  document.documentElement.dataset.theme = saved;
  const btn = document.getElementById('theme-toggle');
  btn.textContent = saved === 'dark' ? 'Light' : 'Dark';
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('br-theme', next);
    btn.textContent = next === 'dark' ? 'Light' : 'Dark';
  });
}

function initTabs(onTabChange) {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      btns.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
      onTabChange(tabId);
    });
  });
}

async function main() {
  translateDOM();
  initTheme();

  const recorder = initRecorderTab(onStepsUpdate);
  const logs = initLogsTab();
  const exporter = initExportTab();
  const stats = initStatsTab();

  initTabs(async (tabId) => {
    if (tabId === 'logs' || tabId === 'export') {
      await onStepsUpdate();
    }
    if (tabId === 'stats') {
      await stats.loadStats();
    }
    if (tabId === 'export') {
      const state = await sendMsg({ type: 'GET_STATE' });
      const allSessions = await Sessions.getAll();
      const latest = allSessions.sort((a, b) => b.startedAt - a.startedAt)[0];
      if (latest) await exporter.loadSession(latest.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    const isTypingContext =
      tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
    if (isTypingContext) return;
    if (!e.altKey) return;
    const map = { '1': 'recorder', '2': 'logs', '3': 'export', '4': 'stats' };
    const tabId = map[e.key];
    if (!tabId) return;
    e.preventDefault();
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    btn?.click();
  });

  await onStepsUpdate();
}

async function onStepsUpdate(sessionId) {
  try {
    if (!sessionId) {
      const all = await Sessions.getAll();
      const latest = all.sort((a, b) => b.startedAt - a.startedAt)[0];
      sessionId = latest?.id;
    }
    if (!sessionId) return;

    const steps = await Steps.getBySession(sessionId);
    setSteps(steps);
    renderRecentSteps(steps);

    document.getElementById('badge-steps').textContent = steps.length;
  } catch (e) {
    console.warn('[NebulaTraceX popup]', e);
  }
}

main().catch(console.error);
