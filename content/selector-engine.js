/**
 * Ultra-stable CSS selector generator.
 * Priority: data-testid > id > aria-label > class chain > xpath fallback.
 * Goal: generate selectors that survive minor DOM refactors.
 */

/**
 * Generate the most stable selector for a given element.
 * @param {HTMLElement} el
 * @returns {{ selector: string, strategy: string }}
 */
export function getSelector(el) {
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
