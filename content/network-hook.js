(() => {
    if (window.__nebulaTraceXNetHook) return;

    const CHANNEL = 'nebula-trace-x';

    const DEFAULT_CONFIG = {
        ignoreExtensions: [
            'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
            'woff', 'woff2', 'ttf', 'otf', 'eot',
            'css', 'map',
        ],
        blockedHostPatterns: [
            'google-analytics',
            'analytics.google.com',
            'doubleclick',
            'facebook.net',
            'hotjar',
            'googletagmanager',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
        ],
        ignoreUrlPatterns: [],
        ignoreMethods: ['OPTIONS', 'HEAD'],
        captureBodyMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
        maxUrlLength: 300,
        maxBodyLength: 1000,
        maxFormKeys: 40,
        maskPatterns: [
            { re: /\S+@\S+\.\S+/g, mask: '[EMAIL]' },
            { re: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, mask: '[CARD]' },
            { re: /\b(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, mask: '[PHONE]' },
            { re: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]*/g, mask: '[JWT]' },
            { re: /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, mask: '[TOKEN]' },
        ],
    };

    const cloneArray = (arr) => Array.isArray(arr) ? arr.slice() : [];

    const config = {
        ignoreExtensions: cloneArray(DEFAULT_CONFIG.ignoreExtensions),
        blockedHostPatterns: cloneArray(DEFAULT_CONFIG.blockedHostPatterns),
        ignoreUrlPatterns: cloneArray(DEFAULT_CONFIG.ignoreUrlPatterns),
        ignoreMethods: cloneArray(DEFAULT_CONFIG.ignoreMethods),
        captureBodyMethods: cloneArray(DEFAULT_CONFIG.captureBodyMethods),
        maxUrlLength: DEFAULT_CONFIG.maxUrlLength,
        maxBodyLength: DEFAULT_CONFIG.maxBodyLength,
        maxFormKeys: DEFAULT_CONFIG.maxFormKeys,
        maskPatterns: cloneArray(DEFAULT_CONFIG.maskPatterns),
    };

    const compiled = {
        ignoreExtRe: null,
        blockedHostRes: [],
        ignoreUrlRes: [],
        ignoreMethodsSet: new Set(),
        captureBodySet: new Set(),
    };

    const compileRegexList = (list) => {
        const res = [];
        for (const item of list) {
            if (!item) continue;
            if (item instanceof RegExp) {
                res.push(item);
                continue;
            }
            if (typeof item === 'string') {
                try { res.push(new RegExp(item, 'i')); } catch { /* ignore invalid */ }
            }
        }
        return res;
    };

    const rebuildCompiled = () => {
        if (config.ignoreExtensions.length) {
            const exts = config.ignoreExtensions.map((e) => String(e).replace(/^\./, '')).filter(Boolean);
            compiled.ignoreExtRe = exts.length
                ? new RegExp(`\\.(${exts.join('|')})(\\?.*)?$`, 'i')
                : null;
        } else {
            compiled.ignoreExtRe = null;
        }
        compiled.blockedHostRes = compileRegexList(config.blockedHostPatterns);
        compiled.ignoreUrlRes = compileRegexList(config.ignoreUrlPatterns);
        compiled.ignoreMethodsSet = new Set(config.ignoreMethods.map((m) => String(m).toUpperCase()));
        compiled.captureBodySet = new Set(config.captureBodyMethods.map((m) => String(m).toUpperCase()));
    };
    rebuildCompiled();

    const applyConfig = (overrides) => {
        if (!overrides || typeof overrides !== 'object') return;
        if (Array.isArray(overrides.ignoreExtensions)) {
            config.ignoreExtensions = cloneArray(overrides.ignoreExtensions);
        }
        if (Array.isArray(overrides.blockedHostPatterns)) {
            config.blockedHostPatterns = cloneArray(overrides.blockedHostPatterns);
        }
        if (Array.isArray(overrides.ignoreUrlPatterns)) {
            config.ignoreUrlPatterns = cloneArray(overrides.ignoreUrlPatterns);
        }
        if (Array.isArray(overrides.ignoreMethods)) {
            config.ignoreMethods = cloneArray(overrides.ignoreMethods);
        }
        if (Array.isArray(overrides.captureBodyMethods)) {
            config.captureBodyMethods = cloneArray(overrides.captureBodyMethods);
        }
        if (Number.isFinite(overrides.maxUrlLength)) {
            config.maxUrlLength = Math.max(80, Math.floor(overrides.maxUrlLength));
        }
        if (Number.isFinite(overrides.maxBodyLength)) {
            config.maxBodyLength = Math.max(200, Math.floor(overrides.maxBodyLength));
        }
        if (Number.isFinite(overrides.maxFormKeys)) {
            config.maxFormKeys = Math.max(5, Math.floor(overrides.maxFormKeys));
        }
        if (Array.isArray(overrides.maskPatterns)) {
            const normalized = [];
            for (const p of overrides.maskPatterns) {
                if (!p || !p.mask) continue;
                if (p.re instanceof RegExp) {
                    normalized.push({ re: p.re, mask: p.mask });
                    continue;
                }
                if (typeof p.re === 'string') {
                    try {
                        const flags = typeof p.flags === 'string' ? p.flags : 'g';
                        normalized.push({ re: new RegExp(p.re, flags), mask: p.mask });
                    } catch { /* ignore invalid */ }
                }
            }
            if (normalized.length) config.maskPatterns = normalized;
        }
        rebuildCompiled();
    };

    function maskValue(value) {
        if (typeof value !== 'string' || !value) return value;
        let result = value;
        for (const { re, mask } of config.maskPatterns) result = result.replace(re, mask);
        return result;
    }

    function sanitizeBody(body) {
        try {
            const maxLen = config.maxBodyLength;
            if (body && typeof body.getReader === 'function') return '[STREAM]';
            if (typeof body === 'string') return maskValue(body.slice(0, maxLen));
            if (body instanceof URLSearchParams) return maskValue(body.toString().slice(0, maxLen));
            if (body instanceof FormData) {
                const keys = [];
                let i = 0;
                for (const k of body.keys()) {
                    keys.push(k);
                    i++;
                    if (i >= config.maxFormKeys) break;
                }
                return `[FORMDATA] ${maskValue(keys.join(', ')).slice(0, Math.min(200, maxLen))}`;
            }
            if (body instanceof ArrayBuffer) return `[ARRAYBUFFER ${body.byteLength}]`;
            if (body instanceof Blob) return `[BLOB ${body.type || 'unknown'} ${body.size}]`;
            return maskValue(JSON.stringify(body).slice(0, maxLen));
        } catch {
            try { return maskValue(String(body).slice(0, config.maxBodyLength)); } catch { return null; }
        }
    }

    function isHttpUrl(url) {
        if (!url) return false;
        if (url.startsWith('data:') || url.startsWith('blob:')) return false;
        try {
            const u = new URL(url, location.origin);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch { return false; }
    }

    function shouldCapture(url, method) {
        if (!url) return false;
        if (!isHttpUrl(url)) return false;
        if (compiled.ignoreMethodsSet.has(String(method || '').toUpperCase())) return false;
        if (compiled.ignoreExtRe && compiled.ignoreExtRe.test(url)) return false;
        try {
            const u = new URL(url, location.origin);
            if (compiled.blockedHostRes.some((re) => re.test(u.hostname))) return false;
            if (compiled.ignoreUrlRes.some((re) => re.test(u.href))) return false;
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
            const captureBody = compiled.captureBodySet.has(method);
            const body = captureBody ? (init?.body ?? input?.body ?? null) : null;
            const bodyStr = body ? sanitizeBody(body) : null;
            try {
                const res = await state.origFetch(...args);
                if (shouldCapture(url, method)) {
                    emit({
                        method,
                        url: String(url).slice(0, config.maxUrlLength),
                        status: res.status,
                        type: 'fetch',
                        body: bodyStr,
                    });
                }
                return res;
            } catch (err) {
                if (shouldCapture(url, method)) {
                    emit({
                        method,
                        url: String(url).slice(0, config.maxUrlLength),
                        status: 0,
                        type: 'fetch',
                        body: bodyStr,
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
            const method = (this.__nt_method || 'GET').toUpperCase();
            const capture = shouldCapture(this.__nt_url, method);
            const captureBody = compiled.captureBodySet.has(method);
            const bodyStr = body && captureBody ? sanitizeBody(body) : null;
            if (capture) {
                this.addEventListener('loadend', () => {
                    emit({
                        method,
                        url: String(this.__nt_url || '').slice(0, config.maxUrlLength),
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
        if (data.type === 'net-config') {
            applyConfig(data.payload);
            return;
        }
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

    patch();
    window.postMessage({ source: CHANNEL, type: 'net-ready' }, '*');
})();
