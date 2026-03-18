/**
 * Zero-leak data masking – called before any value leaves the page context.
 * Masks: passwords, tokens, emails, credit cards, phone numbers.
 */

const SENSITIVE_TYPES = new Set(['password', 'hidden', 'credit-card', 'token']);

const PATTERNS = [
    { name: 'email', re: /\S+@\S+\.\S+/g, mask: '[EMAIL]' },
    { name: 'creditCard', re: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, mask: '[CARD]' },
    { name: 'phone', re: /\b(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, mask: '[PHONE]' },
    { name: 'jwt', re: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]*/g, mask: '[JWT]' },
    { name: 'bearerToken', re: /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, mask: '[TOKEN]' },
];

/**
 * Mask a string value using all patterns.
 * @param {string} value
 * @returns {string}
 */
export function maskValue(value) {
    if (typeof value !== 'string' || !value) return value;
    let result = value;
    for (const { re, mask } of PATTERNS) {
        result = result.replace(re, mask);
    }
    return result;
}

/**
 * Check if an element is sensitive (should be fully masked).
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function isSensitiveElement(el) {
    if (!el) return false;
    const type = (el.type || '').toLowerCase();
    if (SENSITIVE_TYPES.has(type)) return true;
    if (el.autocomplete && ['current-password', 'new-password', 'cc-number'].includes(el.autocomplete)) return true;
    const name = (el.name || el.id || '').toLowerCase();
    return /password|passwd|token|secret|cvv|ccnum/i.test(name);
}

/**
 * Safely extract value from an element, masking if needed.
 * @param {HTMLElement} el
 * @returns {string}
 */
export function safeValue(el) {
    if (isSensitiveElement(el)) return '***';
    const raw = el.value ?? el.textContent ?? '';
    return maskValue(String(raw).slice(0, 200));
}

/**
 * Sanitize network request body before capture.
 * @param {string|object} body
 * @returns {string}
 */
export function sanitizeBody(body) {
    let str = typeof body === 'string' ? body : JSON.stringify(body);
    return maskValue(str.slice(0, 1000)); // cap size
}
