const DB_NAME = 'NebulaTraceXDB';
const DB_VERSION = 1;

const SCHEMA = {
    sessions: { keyPath: 'id', autoIncrement: true, indexes: [] },
    steps: { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] },
    projects: { keyPath: 'hostname', autoIncrement: false, indexes: [] },
    errors: { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] },
};

let _db = null;

export function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = ({ target: { result: db } }) => {
            for (const [name, cfg] of Object.entries(SCHEMA)) {
                if (db.objectStoreNames.contains(name)) continue;
                const store = db.createObjectStore(name, { keyPath: cfg.keyPath, autoIncrement: cfg.autoIncrement });
                cfg.indexes.forEach(idx => store.createIndex(idx.name, idx.keyPath, { unique: false }));
            }
        };
        req.onsuccess = ({ target: { result } }) => { _db = result; resolve(_db); };
        req.onerror = ({ target: { error } }) => reject(error);
    });
}

async function tx(stores, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(stores, mode);
        t.onerror = () => reject(t.error);
        Promise.resolve(fn(t)).then(resolve, reject);
    });
}

const req2p = (r) => new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
});

export const DB = {
    add: (s, rec) => tx([s], 'readwrite', t => req2p(t.objectStore(s).add(rec))),
    put: (s, rec) => tx([s], 'readwrite', t => req2p(t.objectStore(s).put(rec))),
    get: (s, key) => tx([s], 'readonly', t => req2p(t.objectStore(s).get(key))),
    getAll: (s) => tx([s], 'readonly', t => req2p(t.objectStore(s).getAll())),
    getByIndex: (s, idx, val) => tx([s], 'readonly', t => req2p(t.objectStore(s).index(idx).getAll(val))),
    delete: (s, key) => tx([s], 'readwrite', t => req2p(t.objectStore(s).delete(key))),
    clear: (s) => tx([s], 'readwrite', t => req2p(t.objectStore(s).clear())),
    count: (s) => tx([s], 'readonly', t => req2p(t.objectStore(s).count())),
};
