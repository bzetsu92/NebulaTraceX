export function sendMsg(msg) {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(msg, (res) => {
                if (chrome.runtime.lastError) { resolve(null); return; }
                resolve(res);
            });
        } catch { resolve(null); }
    });
}

export function timeAgo(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
}

export function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('vi-VN', { hour12: false });
}

export function stepIcon(type) {
    const icons = {
        click: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 12l.1-.1c.3-.3.9-.3 1.2 0s.3.9 0 1.2l-1.1 1.1-3.2 3.2-1.1 1.1c-.3.3-.9.3-1.2 0s-.3-.9 0-1.2l2.1-2.1M13.5 13.5l-4.5 4.5M3 13.5l3-3 4.5 4.5M9 7.5L12 4.5l6 6-4.5 4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        input: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        submit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        screenshot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        navigate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    };

    const map = {
        click: { cls: 'icon-click' },
        input: { cls: 'icon-input' },
        submit: { cls: 'icon-submit' },
        network: { cls: 'icon-network' },
        screenshot: { cls: 'icon-image' },
        navigate: { cls: 'icon-navigate' },
        navigation: { cls: 'icon-navigate' },
        error: { cls: 'icon-error' },
        pageload: { cls: 'icon-navigate' },
    };

    const config = map[type] || { cls: 'icon-navigate' };
    const iconKey = type === 'navigation' || type === 'pageload' ? 'navigate' : (type === 'screenshot' || type === 'image' ? 'screenshot' : type);

    return {
        icon: icons[iconKey] || icons.navigate,
        cls: config.cls
    };
}

export function stepBadge(type) {
    const cls = {
        click: 'badge-blue', input: 'badge-purple', submit: 'badge-green',
        network: 'badge-yellow', navigate: 'badge-gray', error: 'badge-red',
    }[type] || 'badge-gray';
    return `<span class="badge ${cls}">${type}</span>`;
}

export function esc(s, max = 200) {
    return String(s || '').slice(0, max)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
