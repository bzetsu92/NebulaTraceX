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

    // 1. data-testid / data-cy / data-qa (most stable – explicitly set by devs)
    for (const attr of ['data-testid', 'data-cy', 'data-qa', 'data-id', 'data-test']) {
        const val = el.getAttribute(attr);
        if (val && isUnique(`[${attr}="${CSS.escape(val)}"]`)) {
            return { selector: `[${attr}="${CSS.escape(val)}"]`, strategy: attr };
        }
    }

    // 2. Stable unique id (skip generated ids like "ember123", "mantine-xxx")
    if (el.id && !isGeneratedId(el.id) && isUnique(`#${CSS.escape(el.id)}`)) {
        return { selector: `#${CSS.escape(el.id)}`, strategy: 'id' };
    }

    // 3. aria-label on interactive elements
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        const s = `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (isUnique(s)) return { selector: s, strategy: 'aria-label' };
    }

    // 4. name attribute (form elements)
    if (el.name && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) {
        const s = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
        if (isUnique(s)) return { selector: s, strategy: 'name' };
    }

    // 5. Stable class chain (max 2 meaningful classes)
    const classSelector = buildClassSelector(el);
    if (classSelector && isUnique(classSelector)) {
        return { selector: classSelector, strategy: 'class' };
    }

    // 6. Build a short DOM path (tag + nth-child, max 4 levels)
    const path = buildDOMPath(el);
    if (path) return { selector: path, strategy: 'path' };

    // 7. XPath fallback
    return { selector: getXPath(el), strategy: 'xpath' };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isUnique(selector) {
    try {
        return document.querySelectorAll(selector).length === 1;
    } catch { return false; }
}

/** Heuristic: generated IDs from JS frameworks contain digits heavily */
function isGeneratedId(id) {
    return /^(ember|mantine|radix|react-|__)\d+/.test(id) ||
        /^\d+$/.test(id) ||
        id.length > 40;
}

/** Pick top 2 stable (non-dynamic) classes */
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

/** Walk up to 4 ancestors, build nth-child path */
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

/** XPath generation as last resort */
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
        if (parts.length >= 6) break; // cap depth
    }
    return '/' + parts.join('/');
}
