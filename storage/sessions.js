import { DB } from './db.js';

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
};

function safeHostname(url) {
    try { return new URL(url).hostname; } catch { return 'unknown'; }
}
