import { t } from '../i18n.js';

const STORAGE_KEY = 'ntxConfig';

const DEFAULTS = {
    network: {
        ignoreExtensions: [
            'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
            'woff', 'woff2', 'ttf', 'otf', 'eot',
            'css', 'map',
        ],
        blockedHostPatterns: [
            'google-analytics',
            'analytics.google.com',
            'doubleclick',
            'facebook.net',
            'hotjar',
            'googletagmanager',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
        ],
        ignoreUrlPatterns: [],
        ignoreMethods: ['OPTIONS', 'HEAD'],
        captureBodyMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
        maxUrlLength: 300,
        maxBodyLength: 1000,
        maxFormKeys: 40,
    },
    ignoreSelectorGroupState: {
        ant: true,
        mui: true,
        radix: true,
        headlessUi: true,
        tailwindUi: true,
        shopify: true,
    },
    networkPresetState: {
        sentry: false,
        segment: false,
        mixpanel: false,
    },
};

const NETWORK_PRESETS = {
    sentry: [
        'sentry.io',
        'ingest.sentry.io',
        'o\\d+\\.ingest\\.sentry\\.io',
        'browser.sentry-cdn.com',
    ],
    segment: [
        'api.segment.io',
        'cdn.segment.com',
        'segment.com',
    ],
    mixpanel: [
        'mixpanel.com',
        'api.mixpanel.com',
        'decide.mixpanel.com',
    ],
};

const parseList = (value) => value
    .split(/\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);

const toListValue = (arr) => (Array.isArray(arr) ? arr.join('\n') : '');

function mergeConfig(stored) {
    const cfg = stored && typeof stored === 'object' ? stored : {};
    const network = { ...DEFAULTS.network, ...(cfg.network || {}) };
    const ignoreSelectorGroupState = {
        ...DEFAULTS.ignoreSelectorGroupState,
        ...(cfg.ignoreSelectorGroupState || {}),
    };
    const networkPresetState = {
        ...DEFAULTS.networkPresetState,
        ...(cfg.networkPresetState || {}),
    };
    return { network, ignoreSelectorGroupState, networkPresetState };
}

export function initSettingsTab() {
    const elBlockedHosts = document.getElementById('net-blocked-hosts');
    const elIgnoreUrls = document.getElementById('net-ignore-urls');
    const elIgnoreExts = document.getElementById('net-ignore-exts');
    const elIgnoreMethods = document.getElementById('net-ignore-methods');
    const elCaptureMethods = document.getElementById('net-capture-methods');
    const elMaxUrl = document.getElementById('net-max-url');
    const elMaxBody = document.getElementById('net-max-body');
    const elMaxFormKeys = document.getElementById('net-max-form-keys');
    const btnSave = document.getElementById('net-save');
    const btnReset = document.getElementById('net-reset');
    const status = document.getElementById('net-status');
    const presetChecks = Array.from(document.querySelectorAll('[data-preset]'));
    const netPresetChecks = Array.from(document.querySelectorAll('[data-net-preset]'));
    const configText = document.getElementById('config-json');
    const btnConfigExport = document.getElementById('config-export');
    const btnConfigImport = document.getElementById('config-import');
    const configStatus = document.getElementById('config-status');

    if (!elBlockedHosts || !btnSave || !btnReset) return null;

    const setStatus = (text) => {
        if (!status) return;
        status.textContent = text || '';
        if (text) {
            setTimeout(() => { status.textContent = ''; }, 1400);
        }
    };

    const render = (cfg) => {
        const { network, ignoreSelectorGroupState, networkPresetState } = cfg;
        elBlockedHosts.value = toListValue(network.blockedHostPatterns);
        elIgnoreUrls.value = toListValue(network.ignoreUrlPatterns);
        elIgnoreExts.value = (network.ignoreExtensions || []).join(', ');
        elIgnoreMethods.value = (network.ignoreMethods || []).join(', ');
        elCaptureMethods.value = (network.captureBodyMethods || []).join(', ');
        elMaxUrl.value = network.maxUrlLength ?? '';
        elMaxBody.value = network.maxBodyLength ?? '';
        elMaxFormKeys.value = network.maxFormKeys ?? '';
        presetChecks.forEach((check) => {
            const key = check.dataset.preset;
            check.checked = ignoreSelectorGroupState[key] !== false;
        });
        netPresetChecks.forEach((check) => {
            const key = check.dataset.netPreset;
            check.checked = networkPresetState[key] === true;
        });
    };

    const load = async () => {
        const res = await chrome.storage.local.get([STORAGE_KEY]);
        const cfg = mergeConfig(res[STORAGE_KEY]);
        render(cfg);
    };

    btnSave.addEventListener('click', async () => {
        const ignoreSelectorGroupState = {};
        presetChecks.forEach((check) => {
            ignoreSelectorGroupState[check.dataset.preset] = Boolean(check.checked);
        });

        const networkPresetState = {};
        netPresetChecks.forEach((check) => {
            networkPresetState[check.dataset.netPreset] = Boolean(check.checked);
        });

        const presetHosts = [];
        Object.entries(networkPresetState).forEach(([key, enabled]) => {
            if (!enabled) return;
            const hosts = NETWORK_PRESETS[key] || [];
            presetHosts.push(...hosts);
        });

        const override = {
            ignoreSelectorGroupState,
            networkPresetState,
            network: {
                blockedHostPatterns: Array.from(new Set([
                    ...parseList(elBlockedHosts.value),
                    ...presetHosts,
                ])),
                ignoreUrlPatterns: parseList(elIgnoreUrls.value),
                ignoreExtensions: parseList(elIgnoreExts.value),
                ignoreMethods: parseList(elIgnoreMethods.value).map((v) => v.toUpperCase()),
                captureBodyMethods: parseList(elCaptureMethods.value).map((v) => v.toUpperCase()),
                maxUrlLength: Number(elMaxUrl.value) || DEFAULTS.network.maxUrlLength,
                maxBodyLength: Number(elMaxBody.value) || DEFAULTS.network.maxBodyLength,
                maxFormKeys: Number(elMaxFormKeys.value) || DEFAULTS.network.maxFormKeys,
            },
        };
        await chrome.storage.local.set({ [STORAGE_KEY]: override });
        setStatus(t('settings.saved'));
    });

    btnReset.addEventListener('click', async () => {
        await chrome.storage.local.remove([STORAGE_KEY]);
        render(mergeConfig(null));
        setStatus(t('settings.reset'));
    });

    const setConfigStatus = (text) => {
        if (!configStatus) return;
        configStatus.textContent = text || '';
        if (text) {
            setTimeout(() => { configStatus.textContent = ''; }, 1400);
        }
    };

    btnConfigExport?.addEventListener('click', async () => {
        const res = await chrome.storage.local.get([STORAGE_KEY]);
        const payload = res[STORAGE_KEY] || {};
        const json = JSON.stringify(payload, null, 2);
        if (configText) configText.value = json;
        try {
            await navigator.clipboard.writeText(json);
            setConfigStatus(t('common.copied'));
        } catch {
            setConfigStatus(t('settings.export'));
        }
    });

    btnConfigImport?.addEventListener('click', async () => {
        if (!configText) return;
        try {
            const parsed = JSON.parse(configText.value || '{}');
            if (!parsed || typeof parsed !== 'object') throw new Error('Invalid');
            await chrome.storage.local.set({ [STORAGE_KEY]: parsed });
            render(mergeConfig(parsed));
            setConfigStatus(t('settings.import'));
        } catch {
            setConfigStatus(t('settings.invalid_json'));
        }
    });

    load().catch(console.warn);
    return { load };
}
