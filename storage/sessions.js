import { DB, openDB } from './db.js';

export const Sessions = {
    async create(tabId, url) {
        const hostname = safeHostname(url);
        const id = await DB.add('sessions', {
            tabId,
            url,
            hostname,
            startedAt: Date.now(),
            endedAt: null,
            stepCount: 0,
            errorCount: 0,
            note: '',
        });
        return id;
    },

    async end(sessionId) {
        const session = await DB.get('sessions', sessionId);
        if (!session) return;
        await DB.put('sessions', { ...session, endedAt: Date.now() });
    },

    async get(id) { return DB.get('sessions', id); },
    async getAll() { return DB.getAll('sessions'); },
    async delete(id) { return DB.delete('sessions', id); },

    async addNote(sessionId, note) {
        const s = await DB.get('sessions', sessionId);
        if (s) await DB.put('sessions', { ...s, note });
    },

    async incrementSteps(sessionId, amount = 1) {
        const s = await DB.get('sessions', sessionId);
        if (s && amount > 0) {
            await DB.put('sessions', {
                ...s,
                stepCount: (s.stepCount || 0) + amount,
            });
        }
    },
    async incrementErrors(sessionId) {
        const s = await DB.get('sessions', sessionId);
        if (s) await DB.put('sessions', { ...s, errorCount: (s.errorCount || 0) + 1 });
    },
};

export const Steps = {
    async add(step) {
        return DB.add('steps', { ...step, timestamp: Date.now() });
    },
    async get(id) { return DB.get('steps', id); },
    async delete(id) { return DB.delete('steps', id); },
    async update(id, patch) {
        const existing = await DB.get('steps', id);
        if (!existing) return null;
        await DB.put('steps', { ...existing, ...patch });
        return true;
    },
    async addBatch(sessionId, steps = []) {
        if (!steps.length) return;
        const stamped = steps.map(step => ({
            ...step,
            sessionId,
            timestamp: Date.now(),
        }));
        await (async () => {
            const db = await openDB();
            await new Promise((resolve, reject) => {
                const t = db.transaction(['steps'], 'readwrite');
                const store = t.objectStore('steps');
                stamped.forEach(rec => store.add(rec));
                t.oncomplete = () => resolve();
                t.onerror = () => reject(t.error);
                t.onabort = () => reject(t.error);
            });
        })();
    },
    async getBySession(sessionId) {
        return DB.getByIndex('steps', 'sessionId', sessionId);
    },
    async getAll() { return DB.getAll('steps'); },
    async recountSession(sessionId) {
        const steps = await DB.getByIndex('steps', 'sessionId', sessionId);
        const s = await DB.get('sessions', sessionId);
        if (s) await DB.put('sessions', { ...s, stepCount: countUserSteps(steps) });
    },
    async deleteBySession(sessionId) {
        const steps = await DB.getByIndex('steps', 'sessionId', sessionId);
        await Promise.all(steps.map(s => DB.delete('steps', s.id)));
    },
};

export const Errors = {
    async add(err) {
        return DB.add('errors', { ...err, timestamp: Date.now() });
    },
    async getBySession(sessionId) {
        return DB.getByIndex('errors', 'sessionId', sessionId);
    },
    async getAll() {
        return DB.getAll('errors');
    },
    async deleteBySession(sessionId) {
        const errs = await DB.getByIndex('errors', 'sessionId', sessionId);
        await Promise.all(errs.map(e => DB.delete('errors', e.id)));
    },
};

function safeHostname(url) {
    try { return new URL(url).hostname; } catch { return 'unknown'; }
}

function countUserSteps(steps = []) {
    return steps.filter(s => !isNetworkStep(s) && !s.screenshot).length;
}

function isNetworkStep(step) {
    if (!step) return false;
    if (step.type === 'network') return true;
    if (step.action === 'api_call') return true;
    if (step.method || step.status) return true;
    if (step.url && !['navigate', 'navigation', 'pageload'].includes(step.type)) return true;
    return false;
}
