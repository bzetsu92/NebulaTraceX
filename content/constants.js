(() => {
    if (window.__nebulaTraceXConsts) return;

    // Storage key for runtime overrides (editable from UI later).
    // Shape (all optional):
    // {
    //   dataTestAttrs: string[],
    //   ignoreSelectorGroups: { [group: string]: string[] },
    //   ignoreSelectorGroupState: { [group: string]: boolean },
    //   ignoreSelectorsExtra: string[],
    //   maskPatterns: Array<{ re: RegExp | string, flags?: string, mask: string }>,
    //   sensitiveTypes: string[],
    //   networkPresetState: { [provider: string]: boolean },
    //   network: {
    //     ignoreExtensions: string[],
    //     blockedHostPatterns: string[],
    //     ignoreUrlPatterns: string[],
    //     ignoreMethods: string[],
    //     captureBodyMethods: string[],
    //     maxUrlLength: number,
    //     maxBodyLength: number,
    //     maxFormKeys: number
    //   }
    // }
    const STORAGE_KEY = 'ntxConfig';

    const cloneArray = (arr) => Array.isArray(arr) ? arr.slice() : [];
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const uniqStrings = (arr) => uniq(arr).filter((v) => typeof v === 'string');

    const DEFAULTS = Object.freeze({
        dataTestAttrs: Object.freeze([
            'data-testid',
            'data-test-id',
            'data-cy',
            'data-qa',
            'data-qa-id',
            'data-id',
            'data-test',
            'data-automation',
        ]),

        ignoreSelectorGroups: Object.freeze({
            base: Object.freeze([
                '[data-ntx-ignore]',
                '[data-ignore]',
                '[aria-hidden="true"]',
                '.tooltip',
                '.tooltip-inner',
                '.popover',
                '.toast',
                '.overlay',
                '.modal-backdrop',
                '.dropdown-menu',
                '.context-menu',
                '.menu',
                '.menu-item',
                '.select-menu',
                '.dropdown',
                '.dropdown-item',
            ]),
            ant: Object.freeze([
                '.ant-tooltip',
                '.ant-tooltip-inner',
                '.ant-popover',
                '.ant-popover-inner',
                '.ant-dropdown',
                '.ant-dropdown-menu',
                '.ant-dropdown-menu-item',
                '.ant-select-dropdown',
                '.ant-select-item',
            ]),
            mui: Object.freeze([
                '.MuiTooltip-tooltip',
                '.MuiPopover-paper',
                '.MuiMenu-paper',
                '.MuiMenuItem-root',
                '.MuiSelect-paper',
                '.MuiAutocomplete-popper',
                '.MuiSnackbar-root',
            ]),
            tippy: Object.freeze([
                '.tippy-box',
                '.tippy-content',
            ]),
            radix: Object.freeze([
                '.radix-tooltip-content',
                '.radix-dropdown-menu-content',
                '.radix-popover-content',
                '.radix-select-content',
            ]),
            headlessUi: Object.freeze([
                '.headlessui-popover-panel',
                '.headlessui-menu-items',
                '.headlessui-listbox-options',
            ]),
            tailwindUi: Object.freeze([
                '.tw-tooltip',
                '.tw-popover',
                '.tw-dropdown',
            ]),
            shopify: Object.freeze([
                '.Polaris-Backdrop',
                '.Polaris-Frame-Toast',
                '.Polaris-Modal-Dialog__Modal',
                '.Polaris-Popover__PopoverOverlay',
                '.Polaris-Tooltip',
                '.Polaris-Tooltip__Wrapper',
                '.Polaris-Tooltip__Content',
            ]),
        }),

        maskPatterns: Object.freeze([
            { re: /\S+@\S+\.\S+/g, mask: '[EMAIL]' },
            { re: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, mask: '[CARD]' },
            { re: /\b(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, mask: '[PHONE]' },
            { re: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]*/g, mask: '[JWT]' },
            { re: /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, mask: '[TOKEN]' },
        ]),

        sensitiveTypes: Object.freeze(['password', 'hidden', 'credit-card', 'token']),

        network: Object.freeze({
            ignoreExtensions: Object.freeze([
                'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
                'woff', 'woff2', 'ttf', 'otf', 'eot',
                'css', 'map',
            ]),
            blockedHostPatterns: Object.freeze([
                'google-analytics',
                'analytics.google.com',
                'doubleclick',
                'facebook.net',
                'hotjar',
                'googletagmanager',
                'fonts.googleapis.com',
                'fonts.gstatic.com',
            ]),
            ignoreUrlPatterns: Object.freeze([]),
            ignoreMethods: Object.freeze(['OPTIONS', 'HEAD']),
            captureBodyMethods: Object.freeze(['POST', 'PUT', 'PATCH', 'DELETE']),
            maxUrlLength: 300,
            maxBodyLength: 1000,
            maxFormKeys: 40,
        }),
    });

    const config = {
        dataTestAttrs: cloneArray(DEFAULTS.dataTestAttrs),
        ignoreSelectorGroups: {
            base: cloneArray(DEFAULTS.ignoreSelectorGroups.base),
            ant: cloneArray(DEFAULTS.ignoreSelectorGroups.ant),
            mui: cloneArray(DEFAULTS.ignoreSelectorGroups.mui),
            tippy: cloneArray(DEFAULTS.ignoreSelectorGroups.tippy),
            radix: cloneArray(DEFAULTS.ignoreSelectorGroups.radix),
            headlessUi: cloneArray(DEFAULTS.ignoreSelectorGroups.headlessUi),
            tailwindUi: cloneArray(DEFAULTS.ignoreSelectorGroups.tailwindUi),
            shopify: cloneArray(DEFAULTS.ignoreSelectorGroups.shopify),
        },
        maskPatterns: cloneArray(DEFAULTS.maskPatterns),
        sensitiveTypes: cloneArray(DEFAULTS.sensitiveTypes),
        network: {
            ignoreExtensions: cloneArray(DEFAULTS.network.ignoreExtensions),
            blockedHostPatterns: cloneArray(DEFAULTS.network.blockedHostPatterns),
            ignoreUrlPatterns: cloneArray(DEFAULTS.network.ignoreUrlPatterns),
            ignoreMethods: cloneArray(DEFAULTS.network.ignoreMethods),
            captureBodyMethods: cloneArray(DEFAULTS.network.captureBodyMethods),
            maxUrlLength: DEFAULTS.network.maxUrlLength,
            maxBodyLength: DEFAULTS.network.maxBodyLength,
            maxFormKeys: DEFAULTS.network.maxFormKeys,
        },
        ignoreSelectors: [],
        ignoreSelector: '',
    };

    const rebuildDerived = () => {
        config.ignoreSelectors = uniqStrings(
            Object.values(config.ignoreSelectorGroups).flat()
        );
        config.ignoreSelector = config.ignoreSelectors.join(',');
    };
    rebuildDerived();

    const syncAliases = () => {
        config.DATA_TEST_ATTRS = config.dataTestAttrs;
        config.IGNORE_SELECTOR_GROUPS = config.ignoreSelectorGroups;
        config.MASK_PATTERNS = config.maskPatterns;
        config.SENSITIVE_TYPES = config.sensitiveTypes;
        config.NETWORK_CONFIG = config.network;
        config.IGNORE_SELECTORS = config.ignoreSelectors;
        config.IGNORE_SELECTOR = config.ignoreSelector;
    };
    syncAliases();

    const resetGroupsToDefaults = () => {
        config.ignoreSelectorGroups = {
            base: cloneArray(DEFAULTS.ignoreSelectorGroups.base),
            ant: cloneArray(DEFAULTS.ignoreSelectorGroups.ant),
            mui: cloneArray(DEFAULTS.ignoreSelectorGroups.mui),
            tippy: cloneArray(DEFAULTS.ignoreSelectorGroups.tippy),
            radix: cloneArray(DEFAULTS.ignoreSelectorGroups.radix),
            headlessUi: cloneArray(DEFAULTS.ignoreSelectorGroups.headlessUi),
            tailwindUi: cloneArray(DEFAULTS.ignoreSelectorGroups.tailwindUi),
            shopify: cloneArray(DEFAULTS.ignoreSelectorGroups.shopify),
        };
    };

    const resetAll = () => {
        config.dataTestAttrs = cloneArray(DEFAULTS.dataTestAttrs);
        resetGroupsToDefaults();
        config.maskPatterns = cloneArray(DEFAULTS.maskPatterns);
        config.sensitiveTypes = cloneArray(DEFAULTS.sensitiveTypes);
        config.network = {
            ignoreExtensions: cloneArray(DEFAULTS.network.ignoreExtensions),
            blockedHostPatterns: cloneArray(DEFAULTS.network.blockedHostPatterns),
            ignoreUrlPatterns: cloneArray(DEFAULTS.network.ignoreUrlPatterns),
            ignoreMethods: cloneArray(DEFAULTS.network.ignoreMethods),
            captureBodyMethods: cloneArray(DEFAULTS.network.captureBodyMethods),
            maxUrlLength: DEFAULTS.network.maxUrlLength,
            maxBodyLength: DEFAULTS.network.maxBodyLength,
            maxFormKeys: DEFAULTS.network.maxFormKeys,
        };
        rebuildDerived();
        syncAliases();
    };

    const applyOverrides = (overrides) => {
        if (!overrides || typeof overrides !== 'object') {
            resetAll();
            return;
        }

        if (Array.isArray(overrides.dataTestAttrs)) {
            config.dataTestAttrs = uniqStrings(overrides.dataTestAttrs);
        }

        const hasGroupOverrides = Boolean(
            overrides.ignoreSelectorGroupState ||
            overrides.ignoreSelectorGroups ||
            overrides.ignoreSelectorsExtra
        );
        if (hasGroupOverrides) {
            resetGroupsToDefaults();

            if (overrides.ignoreSelectorGroupState && typeof overrides.ignoreSelectorGroupState === 'object') {
                for (const [group, enabled] of Object.entries(overrides.ignoreSelectorGroupState)) {
                    if (enabled === false && config.ignoreSelectorGroups[group]) {
                        config.ignoreSelectorGroups[group] = [];
                    }
                }
            }

            if (overrides.ignoreSelectorGroups && typeof overrides.ignoreSelectorGroups === 'object') {
                for (const [group, selectors] of Object.entries(overrides.ignoreSelectorGroups)) {
                    if (!Array.isArray(selectors)) continue;
                    if (!config.ignoreSelectorGroups[group]) config.ignoreSelectorGroups[group] = [];
                    config.ignoreSelectorGroups[group] = uniqStrings([
                        ...config.ignoreSelectorGroups[group],
                        ...selectors,
                    ]);
                }
            }

            if (Array.isArray(overrides.ignoreSelectorsExtra)) {
                config.ignoreSelectorGroups.base = uniqStrings([
                    ...config.ignoreSelectorGroups.base,
                    ...overrides.ignoreSelectorsExtra,
                ]);
            }
        }

        if (Array.isArray(overrides.maskPatterns)) {
            const normalized = [];
            for (const p of overrides.maskPatterns) {
                if (!p || !p.mask) continue;
                if (p.re instanceof RegExp) {
                    normalized.push({ re: p.re, mask: p.mask });
                    continue;
                }
                if (typeof p.re === 'string') {
                    try {
                        const flags = typeof p.flags === 'string' ? p.flags : 'g';
                        normalized.push({ re: new RegExp(p.re, flags), mask: p.mask });
                    } catch { /* ignore invalid regex */ }
                }
            }
            if (normalized.length) config.maskPatterns = normalized;
        }

        if (Array.isArray(overrides.sensitiveTypes)) {
            config.sensitiveTypes = uniqStrings(overrides.sensitiveTypes);
        }

        if (overrides.network && typeof overrides.network === 'object') {
            const net = overrides.network;
            if (Array.isArray(net.ignoreExtensions)) {
                config.network.ignoreExtensions = uniqStrings(net.ignoreExtensions);
            }
            if (Array.isArray(net.blockedHostPatterns)) {
                config.network.blockedHostPatterns = uniqStrings(net.blockedHostPatterns);
            }
            if (Array.isArray(net.ignoreUrlPatterns)) {
                config.network.ignoreUrlPatterns = uniqStrings(net.ignoreUrlPatterns);
            }
            if (Array.isArray(net.ignoreMethods)) {
                config.network.ignoreMethods = uniqStrings(net.ignoreMethods).map(v => String(v).toUpperCase());
            }
            if (Array.isArray(net.captureBodyMethods)) {
                config.network.captureBodyMethods = uniqStrings(net.captureBodyMethods).map(v => String(v).toUpperCase());
            }
            if (Number.isFinite(net.maxUrlLength)) {
                config.network.maxUrlLength = Math.max(80, Math.floor(net.maxUrlLength));
            }
            if (Number.isFinite(net.maxBodyLength)) {
                config.network.maxBodyLength = Math.max(200, Math.floor(net.maxBodyLength));
            }
            if (Number.isFinite(net.maxFormKeys)) {
                config.network.maxFormKeys = Math.max(5, Math.floor(net.maxFormKeys));
            }
        }

        rebuildDerived();
        syncAliases();
    };

    const loadOverrides = () => new Promise((resolve) => {
        if (!chrome?.storage?.local) return resolve(null);
        chrome.storage.local.get([STORAGE_KEY], (res) => {
            const overrides = res?.[STORAGE_KEY] || null;
            applyOverrides(overrides);
            resolve(overrides);
        });
    });

    window.__nebulaTraceXConsts = Object.assign(config, {
        DEFAULTS,
        applyOverrides,
        loadOverrides,
    });

    window.__nebulaTraceXConstsReady = loadOverrides().catch(() => null);

    if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (!changes[STORAGE_KEY]) return;
            applyOverrides(changes[STORAGE_KEY].newValue);
        });
    }
})();
