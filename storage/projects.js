import { DB } from './db.js';
import { Sessions, Steps, Errors } from './sessions.js';

const PALETTE = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
    '#10b981', '#14b8a6', '#f59e0b', '#6366f1',
];

export const Projects = {
    async ensure(hostname) {
        const existing = await DB.get('projects', hostname);
        if (existing) return existing;
        const project = {
            hostname,
            displayName: hostname,
            color: PALETTE[Math.abs(hashCode(hostname)) % PALETTE.length],
            faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
            createdAt: Date.now(),
        };
        await DB.put('projects', project);
        return project;
    },

    async rename(hostname, displayName) {
        const p = await DB.get('projects', hostname);
        if (p) await DB.put('projects', { ...p, displayName });
    },

    async getAll() { return DB.getAll('projects'); },

    async computeStats() {
        const [allSessions, allSteps, allErrors, projects] = await Promise.all([
            Sessions.getAll(),
            Steps.getAll(),
            Errors.getAll().catch(() => []),
            Projects.getAll(),
        ]);

        const projectMap = Object.fromEntries(projects.map(p => [p.hostname, p]));

        const stats = {};
        for (const s of allSessions) {
            const h = s.hostname || 'unknown';
            if (!stats[h]) {
                stats[h] = {
                    hostname: h,
                    displayName: projectMap[h]?.displayName || h,
                    color: projectMap[h]?.color || '#6b7280',
                    sessionCount: 0,
                    stepCount: 0,
                    errorCount: 0,
                };
            }
            stats[h].sessionCount++;
        }

        const sessionHostMap = Object.fromEntries(allSessions.map(s => [s.id, s.hostname]));
        for (const step of allSteps) {
            const h = sessionHostMap[step.sessionId] || 'unknown';
            if (stats[h]) stats[h].stepCount++;
        }

        const errList = Array.isArray(allErrors) ? allErrors : [];
        for (const e of errList) {
            const h = sessionHostMap[e.sessionId] || 'unknown';
            if (stats[h]) stats[h].errorCount++;
        }

        return Object.values(stats).sort((a, b) => b.stepCount - a.stepCount);
    },
};

function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return h;
}
