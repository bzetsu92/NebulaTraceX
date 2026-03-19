import { initRecorderTab, renderRecentSteps } from './tabs/recorder-tab.js';
import { initSitemapTab, openSiteBySessionId } from './tabs/sitemap-tab.js';
import { initStatsTab } from './tabs/stats-tab.js';
import { Sessions, Steps } from '../storage/sessions.js';
import { translateDOM } from './i18n.js';

let sitemap = null;

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

function initSideCarousel() {
    const root = document.getElementById('side-carousel');
    const dotsWrap = document.getElementById('side-dots');
    if (!root || !dotsWrap) return;
    const slides = Array.from(root.querySelectorAll('.side-slide'));
    const dots = Array.from(dotsWrap.querySelectorAll('.side-dot'));
    if (!slides.length) return;
    let idx = 0;
    const show = (i) => {
        slides.forEach((s, k) => s.classList.toggle('active', k === i));
        dots.forEach((d, k) => d.classList.toggle('active', k === i));
    };
    show(idx);
    setInterval(() => {
        idx = (idx + 1) % slides.length;
        show(idx);
    }, 2600);
}

async function main() {
    translateDOM();
    initTheme();
    initSideCarousel();

    const recorder = initRecorderTab(onStepsUpdate, (sessionId) => {
        const btn = document.querySelector('.tab-btn[data-tab="sitemap"]');
        btn?.click();
        openSiteBySessionId(sessionId);
    });
    sitemap = initSitemapTab();
    const stats = initStatsTab();

    initTabs(async (tabId) => {
        if (tabId === 'sitemap') {
            await sitemap.refreshSites();
        }
        if (tabId === 'stats') {
            await stats.loadStats();
        }
    });

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        const isTypingContext =
            tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
        if (isTypingContext) return;
        if (!e.altKey) return;
        const map = { '1': 'home', '2': 'sitemap', '3': 'stats', '4': 'settings' };
        const tabId = map[e.key];
        if (!tabId) return;
        e.preventDefault();
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        btn?.click();
    });

    await onStepsUpdate();
    if (sitemap) await sitemap.refreshSites();
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
        renderRecentSteps(steps);
        if (sitemap) await sitemap.refreshSites();

    } catch (e) {
        console.warn('[NebulaTraceX popup]', e);
    }
}

main().catch(console.error);
