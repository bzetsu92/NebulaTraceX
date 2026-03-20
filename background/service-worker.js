import { DB } from '../storage/db.js';
import { Sessions, Steps, Errors } from '../storage/sessions.js';
import { Projects } from '../storage/projects.js';


const tabState = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    handleMessage(msg, sender)
        .then(sendResponse)
        .catch(err => sendResponse({ error: err.message }));
    return true;
});

async function handleMessage(msg, sender) {
    switch (msg.type) {

        case 'START_RECORDING': {
            const tab = await getActiveTab();
            if (!tab) return { error: 'No active tab' };
            if (tabState.get(tab.id)?.recording) return { error: 'Already recording' };

            const sessionId = await Sessions.create(tab.id, tab.url);
            await Projects.ensure(new URL(tab.url).hostname);
            tabState.set(tab.id, { sessionId, recording: true });

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content/constants.js', 'content/recorder.js'],
            }).catch(() => null);

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (sid) => window.__nebulaTraceX?.start(sid),
                args: [sessionId],
            }).catch(() => null);

            return { ok: true, sessionId };
        }

        case 'STOP_RECORDING': {
            const tab = await getActiveTab();
            if (!tab) return { error: 'No active tab' };
            const state = tabState.get(tab.id);
            if (!state?.recording) return { error: 'Not recording' };

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.__nebulaTraceX?.stop(),
            }).catch(() => null);

            await Sessions.end(state.sessionId);
            const steps = await Steps.getBySession(state.sessionId);
            if (!steps || steps.length === 0) {
                await Steps.deleteBySession(state.sessionId);
                await Errors.deleteBySession(state.sessionId);
                await Sessions.delete(state.sessionId);
                tabState.set(tab.id, { recording: false, sessionId: null });
                return { ok: true, sessionId: null, deleted: true };
            }
            tabState.set(tab.id, { ...state, recording: false });
            return { ok: true, sessionId: state.sessionId };
        }

        case 'RECORD_STEPS': {
            const { sessionId, steps } = msg;
            if (!Array.isArray(steps) || !steps.length) {
                return { ok: true };
            }
            await Steps.addBatch(sessionId, steps);
            const userSteps = steps.filter(s =>
                s && s.type !== 'network' &&
                s.action !== 'api_call' &&
                !s.screenshot &&
                !(s.method || s.status) &&
                !(s.url && !['navigate', 'navigation', 'pageload'].includes(s.type))
            );
            await Sessions.incrementSteps(sessionId, userSteps.length);
            return { ok: true };
        }

        case 'RECORD_ERROR': {
            const { sessionId, error } = msg;
            await DB.add('errors', { ...error, sessionId, timestamp: Date.now() });
            await Sessions.incrementErrors(sessionId);
            return { ok: true };
        }

        case 'ATTACH_SCREENSHOT': {
            let allSteps = [];
            for (let i = 0; i < 3; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, 300));
                allSteps = await Steps.getBySession(msg.sessionId);
                if (allSteps.length > 0) break;
            }
            if (allSteps.length > 0) {
                const last = allSteps[allSteps.length - 1];
                await DB.put('steps', { ...last, screenshot: msg.screenshot });
                return { ok: true };
            }
            const created = await DB.add('steps', {
                sessionId: msg.sessionId,
                type: 'screenshot',
                action: 'manual_screenshot',
                label: 'Manual screenshot',
                screenshot: msg.screenshot,
                timestamp: Date.now(),
            });
            if (created) await Sessions.incrementSteps(msg.sessionId, 0);
            return { ok: true, created: true };
        }

        case 'TRIGGER_CAPTURE_SCREENSHOT': {
            return captureScreenshotOnActiveTab();
        }

        case 'CAPTURE_SCREENSHOT': {
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(null, {
                    format: 'jpeg',
                    quality: 70,
                });
                return { dataUrl };
            } catch (e) {
                return { error: e.message };
            }
        }
        case 'INIT_NETWORK_HOOK': {
            const tabId = sender?.tab?.id;
            if (!tabId) return { error: 'No tab' };
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/network-hook.js'],
                world: 'MAIN',
            }).catch(() => null);
            return { ok: true };
        }

        case 'GET_STATE': {
            const tab = await getActiveTab();
            if (!tab) return { recording: false };
            const state = tabState.get(tab.id);
            let startedAt = null;
            if (state?.sessionId) {
                const session = await Sessions.get(state.sessionId);
                startedAt = session?.startedAt || null;
            }
            return {
                recording: state?.recording || false,
                sessionId: state?.sessionId || null,
                tabId: tab.id,
                url: tab.url,
                startedAt,
            };
        }

        case 'ADD_NOTE': {
            await Sessions.addNote(msg.sessionId, msg.note);
            return { ok: true };
        }

        case 'RENAME_PROJECT': {
            await Projects.rename(msg.hostname, msg.displayName);
            return { ok: true };
        }

        case 'CLEAR_ALL': {
            await Promise.all(['sessions', 'steps', 'errors', 'projects'].map(s => DB.clear(s)));
            tabState.clear();
            return { ok: true };
        }

        default:
            return { error: `Unknown message type: ${msg.type}` };
    }
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
}

chrome.tabs.onUpdated.addListener((tabId, info) => {
    const state = tabState.get(tabId);
    if (!state?.recording) return;
    if (info.status === 'loading') {
        return;
    }
        if (info.status === 'complete') {
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/constants.js', 'content/recorder.js'],
            }).catch(() => null);
        chrome.scripting.executeScript({
            target: { tabId },
            func: (sid) => window.__nebulaTraceX?.start(sid),
            args: [state.sessionId],
        }).catch(() => null);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    tabState.delete(tabId);
});

async function startRecordingOnActiveTab() {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab' };
    if (tabState.get(tab.id)?.recording) return { error: 'Already recording' };

    const sessionId = await Sessions.create(tab.id, tab.url);
    await Projects.ensure(new URL(tab.url).hostname);
    tabState.set(tab.id, { sessionId, recording: true });

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/constants.js', 'content/recorder.js'],
    }).catch(() => null);

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (sid) => window.__nebulaTraceX?.start(sid),
        args: [sessionId],
    }).catch(() => null);

    return { ok: true, sessionId };
}

async function stopRecordingOnActiveTab() {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab' };
    const state = tabState.get(tab.id);
    if (!state?.recording) return { error: 'Not recording' };

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__nebulaTraceX?.stop(),
    }).catch(() => null);

    await Sessions.end(state.sessionId);
    tabState.set(tab.id, { ...state, recording: false });

    return { ok: true, sessionId: state.sessionId };
}

async function captureScreenshotOnActiveTab() {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab' };
    const state = tabState.get(tab.id);
    if (!state?.recording) return { error: 'Not recording' };

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__nebulaTraceX?.capture?.(),
    }).catch(() => null);

    return { ok: true };
}

chrome.commands.onCommand.addListener(async (command) => {
    try {
        if (command === 'toggle-recording') {
            const tab = await getActiveTab();
            const state = tab ? tabState.get(tab.id) : null;
            if (state?.recording) await stopRecordingOnActiveTab();
            else await startRecordingOnActiveTab();
            return;
        }
        if (command === 'capture-screenshot') {
            await captureScreenshotOnActiveTab();
        }
    } catch {
        // Swallow to avoid noisy logs for harmless command failures.
    }
});
