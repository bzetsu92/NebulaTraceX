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
    const map = {
        click: { icon: '', cls: 'icon-click' },
        input: { icon: '', cls: 'icon-input' },
        submit: { icon: '', cls: 'icon-submit' },
        network: { icon: '', cls: 'icon-network' },
        navigate: { icon: '', cls: 'icon-navigate' },
        navigation: { icon: '', cls: 'icon-navigate' },
        error: { icon: '', cls: 'icon-error' },
        pageload: { icon: '', cls: 'icon-navigate' },
    };
    return map[type] || { icon: '', cls: 'icon-navigate' };
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
