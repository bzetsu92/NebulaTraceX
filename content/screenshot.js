/**
 * Lightweight screenshot capture via chrome.tabs.captureVisibleTab.
 * Called from the background service worker (content script sends request).
 * Returns compressed base64 JPEG (<100KB target).
 */

/**
 * Request a screenshot from the background worker.
 * @returns {Promise<string>} base64 data URL
 */
export async function captureScreenshot() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Screenshot timeout')), 3000);
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (response?.error) return reject(new Error(response.error));
            resolve(response?.dataUrl || null);
        });
    });
}

function createCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

function canvasToBlob(canvas, quality) {
    if (canvas.convertToBlob) {
        return canvas.convertToBlob({ type: 'image/jpeg', quality });
    }
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('toBlob failed'));
        }, 'image/jpeg', quality);
    });
}

/**
 * Compress a base64 PNG/JPEG to a smaller JPEG using an off-screen canvas.
 * @param {string} dataUrl
 * @param {number} quality  0–1 (default 0.6)
 * @param {number} maxW     max width in px (default 1280)
 * @returns {Promise<string>}
 */
export function compressImage(dataUrl, quality = 0.6, maxW = 1280) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const canvas = createCanvas(
                Math.round(img.width * scale),
                Math.round(img.height * scale)
            );
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas unavailable'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvasToBlob(canvas, quality)
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Compare two base64 images (pixel sampling heuristic).
 * Returns 0–1 where 0 = identical, 1 = completely different.
 * Uses 4×4 grid sampling = 16 pixels – very cheap.
 */
export async function imageDiff(dataUrlA, dataUrlB) {
    const [a, b] = await Promise.all([samplePixels(dataUrlA), samplePixels(dataUrlB)]);
    if (!a || !b || a.length !== b.length) return 1;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    return diff / (a.length * 255);
}

async function samplePixels(dataUrl, grid = 4) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const c = createCanvas(grid, grid);
            const ctx = c.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0, grid, grid);
            resolve(Array.from(ctx.getImageData(0, 0, grid, grid).data));
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}
