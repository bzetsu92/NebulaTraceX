function getSelector(el) {
    if (!el || el === document.body) return { selector: 'body', strategy: 'tag' };

    for (const attr of ['data-testid', 'data-cy', 'data-qa', 'data-id', 'data-test']) {
        const val = el.getAttribute(attr);
        if (val && isUnique(`[${attr}="${CSS.escape(val)}"]`)) {
            return { selector: `[${attr}="${CSS.escape(val)}"]`, strategy: attr };
        }
    }

    if (el.id && !isGeneratedId(el.id) && isUnique(`#${CSS.escape(el.id)}`)) {
        return { selector: `#${CSS.escape(el.id)}`, strategy: 'id' };
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        const s = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (isUnique(s)) return { selector: s, strategy: 'aria-label' };
    }

    if (el.name && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) {
        const s = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
        if (isUnique(s)) return { selector: s, strategy: 'name' };
    }

    const classSelector = buildClassSelector(el);
    if (classSelector && isUnique(classSelector)) {
        return { selector: classSelector, strategy: 'class' };
    }

    const path = buildDOMPath(el);
    if (path) return { selector: path, strategy: 'path' };

    return { selector: getXPath(el), strategy: 'xpath' };
}

function isUnique(selector) {
    try {
        return document.querySelectorAll(selector).length === 1;
    } catch { return false; }
}

function isGeneratedId(id) {
    return /^(ember|mantine|radix|react-|__)\d+/.test(id) ||
        /^\d+$/.test(id) ||
        id.length > 40;
}

function buildClassSelector(el) {
    const tag = el.tagName.toLowerCase();
    const stable = Array.from(el.classList).filter(c =>
        !/^\d/.test(c) &&
        !/^(css|chakra|tw|sc|emotion|styles?)[-_]\w+/.test(c) &&
        c.length < 40
    ).slice(0, 2);
    if (!stable.length) return null;
    return `${tag}.${stable.map(CSS.escape).join('.')}`;
}

function buildDOMPath(el, maxDepth = 4) {
    const parts = [];
    let current = el;
    let depth = 0;
    while (current && current !== document.body && depth < maxDepth) {
        const tag = current.tagName.toLowerCase();
        const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter(c => c.tagName === current.tagName)
            : [];
        const idx = siblings.indexOf(current) + 1;
        parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
        current = current.parentElement;
        depth++;
    }
    return parts.join(' > ');
}

function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
        let idx = 1;
        let sib = node.previousSibling;
        while (sib) {
            if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === node.nodeName) idx++;
            sib = sib.previousSibling;
        }
        parts.unshift(`${node.nodeName.toLowerCase()}[${idx}]`);
        node = node.parentNode;
        if (parts.length >= 6) break;
    }
    return '/' + parts.join('/');
}

const SENSITIVE_TYPES = new Set(['password', 'hidden', 'credit-card', 'token']);

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

function isSensitiveElement(el) {
    if (!el) return false;
    const type = (el.type || '').toLowerCase();
    if (SENSITIVE_TYPES.has(type)) return true;
    if (el.autocomplete && ['current-password', 'new-password', 'cc-number'].includes(el.autocomplete)) return true;
    const name = (el.name || el.id || '').toLowerCase();
    return /password|passwd|token|secret|cvv|ccnum/i.test(name);
}

function safeValue(el) {
    if (isSensitiveElement(el)) return '***';
    const raw = el.value ?? el.textContent ?? '';
    return maskValue(String(raw).slice(0, 200));
}

function sanitizeBody(body) {
    const str = typeof body === 'string' ? body : JSON.stringify(body);
    return maskValue(str.slice(0, 1000));
}

function captureScreenshot() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Screenshot timeout')), 3000);
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (response?.error) return reject(new Error(response.error));
            resolve(response?.dataUrl || null);
        });
    });
}

function compressImage(dataUrl, quality = 0.6, maxW = 1280) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const canvas = new OffscreenCanvas(
                Math.round(img.width * scale),
                Math.round(img.height * scale)
            );
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.convertToBlob({ type: 'image/jpeg', quality })
                .then((blob) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

async function imageDiff(dataUrlA, dataUrlB) {
    const [a, b] = await Promise.all([samplePixels(dataUrlA), samplePixels(dataUrlB)]);
    if (!a || !b || a.length !== b.length) return 1;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    return diff / (a.length * 255);
}

function samplePixels(dataUrl, grid = 4) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const c = new OffscreenCanvas(grid, grid);
            c.getContext('2d').drawImage(img, 0, 0, grid, grid);
            c.getContext('2d').getImageData(0, 0, grid, grid).data;
            resolve(Array.from(c.getContext('2d').getImageData(0, 0, grid, grid).data));
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

let _sessionId = null;
let _recording = false;
let _lastScreenshot = null;
let _stepBuffer = [];
let _flushTimer = null;

const IGNORE_EXT = /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css|map)(\?.*)?$/i;
const _origFetch = window.fetch.bind(window);
const _origXHROpen = XMLHttpRequest.prototype.open;
const _origXHRSend = XMLHttpRequest.prototype.send;


window.__nebulaTraceX = {
    start(sessionId) {
        if (_recording) return;
        _sessionId = sessionId;
        _recording = true;
        attachListeners();
        patchNetwork();
        postStep({ type: 'navigation', action: 'pageload', url: location.href, title: document.title });
    },
    stop() {
        if (!_recording) return;
        _recording = false;
        detachListeners();
        unpatchNetwork();
        flushBuffer(true);
        _sessionId = null;
    },
    capture() {
        if (!_recording) return;
        maybeScreenshot().catch(() => null);
    },
};

const _handlers = {};

function attachListeners() {
    _handlers.click = throttle(onClickGlobal, 100);
    _handlers.input = debounce(onInputGlobal, 600);
    _handlers.submit = onSubmitGlobal;
    _handlers.error = onWindowError;
    _handlers.unhandled = onUnhandledRejection;

    document.addEventListener('click', _handlers.click, { capture: true, passive: true });
    document.addEventListener('input', _handlers.input, { capture: true, passive: true });
    document.addEventListener('submit', _handlers.submit, { capture: true });
    window.addEventListener('error', _handlers.error);
    window.addEventListener('unhandledrejection', _handlers.unhandled);
}

function detachListeners() {
    document.removeEventListener('click', _handlers.click, { capture: true });
    document.removeEventListener('input', _handlers.input, { capture: true });
    document.removeEventListener('submit', _handlers.submit, { capture: true });
    window.removeEventListener('error', _handlers.error);
    window.removeEventListener('unhandledrejection', _handlers.unhandled);
}

async function onClickGlobal(e) {
    if (!_recording) return;
    const el = e.target;
    const { selector, strategy } = getSelector(el);
    const label = el.textContent?.trim().slice(0, 80) || el.getAttribute('aria-label') || '';
    const step = {
        type: 'click',
        action: 'click',
        selector,
        selectorStrategy: strategy,
        label,
        tag: el.tagName.toLowerCase(),
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
    };

    postStep(step);
    maybeScreenshot();
}

function onInputGlobal(e) {
    if (!_recording) return;
    const el = e.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;

    const { selector, strategy } = getSelector(el);
    postStep({
        type: 'input',
        action: 'type',
        selector,
        selectorStrategy: strategy,
        inputType: el.type || 'text',
        value: safeValue(el),
        tag: el.tagName.toLowerCase(),
        name: el.name || el.id || '',
        isMasked: isSensitiveElement(el),
    });
}

function onSubmitGlobal(e) {
    if (!_recording) return;
    const form = e.target;
    const { selector } = getSelector(form);
    postStep({
        type: 'submit',
        action: 'form_submit',
        selector,
        formId: form.id || '',
        formAction: form.action || location.href,
    });
}

function onWindowError(e) {
    if (!_recording) return;
    sendToBackground({
        type: 'RECORD_ERROR',
        sessionId: _sessionId,
        error: {
            message: e.message?.slice(0, 500) || 'Unknown error',
            filename: e.filename || '',
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error?.stack?.slice(0, 1000) || '',
        },
    });
}

function onUnhandledRejection(e) {
    if (!_recording) return;
    sendToBackground({
        type: 'RECORD_ERROR',
        sessionId: _sessionId,
        error: {
            message: String(e.reason?.message || e.reason || 'Unhandled rejection').slice(0, 500),
            stack: e.reason?.stack?.slice(0, 1000) || '',
        },
    });
}


function patchNetwork() {
    window.fetch = async function (...args) {
        const [input, init] = args;
        const url = typeof input === 'string' ? input : input?.url || '';
        const res = await _origFetch(...args);
        if (_recording && shouldCapture(url)) {
            captureRequest({
                method: (init?.method || 'GET').toUpperCase(),
                url: url.slice(0, 300),
                status: res.status,
                type: 'fetch',
            });
        }
        return res;
    };

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__method = method;
        this.__url = url;
        return _origXHROpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (_recording && shouldCapture(this.__url)) {
            this.addEventListener('loadend', () => {
                captureRequest({
                    method: (this.__method || 'GET').toUpperCase(),
                    url: String(this.__url || '').slice(0, 300),
                    status: this.status,
                    type: 'xhr',
                    body: body ? sanitizeBody(body) : null,
                });
            }, { once: true });
        }
        return _origXHRSend.call(this, body);
    };
}

function unpatchNetwork() {
    window.fetch = _origFetch;
    XMLHttpRequest.prototype.open = _origXHROpen;
    XMLHttpRequest.prototype.send = _origXHRSend;
}

function shouldCapture(url) {
    if (!url) return false;
    if (IGNORE_EXT.test(url)) return false;
    try {
        const u = new URL(url, location.origin);
        if (/google-analytics|doubleclick|facebook\.net|hotjar/.test(u.hostname)) return false;
    } catch { return false; }
    return true;
}

function captureRequest(req) {
    postStep({ type: 'network', action: 'api_call', ...req });
}

let _screenshotCooldown = false;

async function maybeScreenshot() {
    if (_screenshotCooldown) return;
    _screenshotCooldown = true;
    setTimeout(() => { _screenshotCooldown = false; }, 1500);

    try {
        const dataUrl = await captureScreenshot();
        if (!dataUrl) return;
        const compressed = await compressImage(dataUrl, 0.55, 1280);

        if (_lastScreenshot) {
            const diff = await imageDiff(_lastScreenshot, compressed);
            if (diff < 0.03) return;
        }
        _lastScreenshot = compressed;

        sendToBackground({
            type: 'ATTACH_SCREENSHOT',
            sessionId: _sessionId,
            screenshot: compressed,
        });
    } catch (e) {
        console.warn('[NebulaTraceX] capture failed', e);
    }
}

function postStep(step) {
    _stepBuffer.push(step);
    if (!_flushTimer) {
        _flushTimer = setTimeout(() => flushBuffer(), 300);
    }
}

function flushBuffer(immediate = false) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
    if (!_stepBuffer.length || !_sessionId) return;
    const batch = _stepBuffer.splice(0);
    sendToBackground({ type: 'RECORD_STEPS', sessionId: _sessionId, steps: batch });
}

function sendToBackground(msg) {
    try { chrome.runtime.sendMessage(msg); } catch { /* SW may be restarting */ }
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function throttle(fn, ms) {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last < ms) return;
        last = now;
        fn(...args);
    };
}
