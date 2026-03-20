export function getSelector(el) {
    if (!el || el === document.body) return { selector: 'body', strategy: 'tag' };

    const dataAttrs = globalThis.__nebulaTraceXConsts?.dataTestAttrs
        || globalThis.__nebulaTraceXConsts?.DATA_TEST_ATTRS
        || [];
    for (const attr of dataAttrs) {
        const val = el.getAttribute(attr);
        if (val) {
            const s = `[${attr}="${CSS.escape(val)}"]`;
            if (isUnique(el, s)) return { selector: s, strategy: attr };
        }
    }

    if (el.id && !isGeneratedId(el.id)) {
        const s = `#${CSS.escape(el.id)}`;
        if (isUnique(el, s)) return { selector: s, strategy: 'id' };
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        const s = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (isUnique(el, s)) return { selector: s, strategy: 'aria-label' };
    }

    const title = el.getAttribute('title');
    if (title) {
        const s = `${el.tagName.toLowerCase()}[title="${CSS.escape(title)}"]`;
        if (isUnique(el, s)) return { selector: s, strategy: 'title' };
    }

    const role = el.getAttribute('role');
    if (role) {
        const name = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('name') || '';
        if (name) {
            const s = `${el.tagName.toLowerCase()}[role="${CSS.escape(role)}"][aria-label="${CSS.escape(name)}"]`;
            if (isUnique(el, s)) return { selector: s, strategy: 'role+name' };
        }
    }

    if (el.name && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) {
        const s = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
        if (isUnique(el, s)) return { selector: s, strategy: 'name' };
    }

    const classSelector = buildClassSelector(el);
    if (classSelector && isUnique(el, classSelector)) {
        return { selector: classSelector, strategy: 'class' };
    }

    const path = buildDOMPath(el);
    if (path) return { selector: path, strategy: 'path' };

    return { selector: getXPath(el), strategy: 'xpath' };
}

function isUnique(el, selector) {
    try {
        const first = document.querySelector(selector);
        if (first !== el) return false;
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
