// Runs in the page (MAIN) world to observe fetch/XHR and post sanitized events.
(() => {
    if (window.__nebulaTraceXNetHook) return;

    const CHANNEL = 'nebula-trace-x';
    const IGNORE_EXT = /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css|map)(\?.*)?$/i;
    const BLOCKED_HOSTS = /google-analytics|doubleclick|facebook\.net|hotjar/;

    const PATTERNS = [
        { re: /\S+@\S+\.\S+/g, mask: '[EMAIL]' },
        { re: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, mask: '[CARD]' },
        { re: /\b(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, mask: '[PHONE]' },
        { re: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]*/g, mask: '[JWT]' },
        { re: /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, mask: '[TOKEN]' },
    ];

    function maskValue(value) {
        if (typeof value !== 'string' || !value) return value;
        let result = value;
        for (const { re, mask } of PATTERNS) result = result.replace(re, mask);
        return result;
    }

    function sanitizeBody(body) {
        try {
            if (typeof body === 'string') return maskValue(body.slice(0, 1000));
            if (body instanceof URLSearchParams) return maskValue(body.toString().slice(0, 1000));
            if (body instanceof FormData) {
                const keys = [];
                for (const k of body.keys()) keys.push(k);
                return `[FORMDATA] ${maskValue(keys.join(', ')).slice(0, 200)}`;
            }
            return maskValue(JSON.stringify(body).slice(0, 1000));
        } catch {
            try { return maskValue(String(body).slice(0, 1000)); } catch { return null; }
        }
    }

    function shouldCapture(url) {
        if (!url) return false;
        if (IGNORE_EXT.test(url)) return false;
        try {
            const u = new URL(url, location.origin);
            if (BLOCKED_HOSTS.test(u.hostname)) return false;
        } catch { return false; }
        return true;
    }

    function emit(payload) {
        window.postMessage({ source: CHANNEL, type: 'network', payload }, '*');
    }

    const state = {
        patched: false,
        origFetch: window.fetch,
        origOpen: XMLHttpRequest.prototype.open,
        origSend: XMLHttpRequest.prototype.send,
    };

    function patch() {
        if (state.patched) return;
        state.patched = true;

        window.fetch = async function (...args) {
            const [input, init] = args;
            const url = typeof input === 'string' ? input : input?.url || '';
            const method = (init?.method || input?.method || 'GET').toUpperCase();
            try {
                const res = await state.origFetch(...args);
                if (shouldCapture(url)) {
                    emit({ method, url: url.slice(0, 300), status: res.status, type: 'fetch' });
                }
                return res;
            } catch (err) {
                if (shouldCapture(url)) {
                    emit({
                        method,
                        url: url.slice(0, 300),
                        status: 0,
                        type: 'fetch',
                        error: String(err?.message || err),
                    });
                }
                throw err;
            }
        };

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this.__nt_method = method;
            this.__nt_url = url;
            return state.origOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const capture = shouldCapture(this.__nt_url);
            const bodyStr = body ? sanitizeBody(body) : null;
            if (capture) {
                this.addEventListener('loadend', () => {
                    emit({
                        method: (this.__nt_method || 'GET').toUpperCase(),
                        url: String(this.__nt_url || '').slice(0, 300),
                        status: this.status,
                        type: 'xhr',
                        body: bodyStr,
                    });
                }, { once: true });
            }
            return state.origSend.call(this, body);
        };
    }

    function unpatch() {
        if (!state.patched) return;
        window.fetch = state.origFetch;
        XMLHttpRequest.prototype.open = state.origOpen;
        XMLHttpRequest.prototype.send = state.origSend;
        state.patched = false;
    }

    function onMessage(e) {
        if (e.source !== window) return;
        const data = e.data || {};
        if (data.source !== CHANNEL) return;
        if (data.type === 'net-start') {
            patch();
            window.postMessage({ source: CHANNEL, type: 'net-ready' }, '*');
        }
        if (data.type === 'net-stop') unpatch();
    }

    window.addEventListener('message', onMessage);

    window.__nebulaTraceXNetHook = {
        patch,
        unpatch,
    };

    // Auto-start on first injection (recording just began).
    patch();
    window.postMessage({ source: CHANNEL, type: 'net-ready' }, '*');
})();
