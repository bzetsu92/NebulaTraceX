import { Steps } from '../storage/sessions.js';

const img = document.getElementById('img');
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const zoomWrap = document.getElementById('zoom');
const note = document.getElementById('note');
const meta = document.getElementById('meta');
const errorEl = document.getElementById('error');
const toast = document.getElementById('toast');

const btnPen = document.getElementById('btn-pen');
const btnText = document.getElementById('btn-text');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnDownload = document.getElementById('btn-download');
const btnSave = document.getElementById('btn-save');
const btnClose = document.getElementById('btn-close');

let step = null;
let ctx = null;
let drawing = false;
let pen = false;
let textMode = false;
let scale = 1;
let activeBox = null;
let startPoint = null;
let history = [];

const qs = new URLSearchParams(location.search);
const stepId = Number(qs.get('stepId')) || null;

init();

async function init() {
  if (!stepId) return showError('Missing stepId');
  step = await Steps.get(stepId);
  if (!step || !step.screenshot) return showError('Image not found');

  img.src = step.screenshot;
  note.value = step.note || '';
  meta.textContent = `Step #${step.id}`;

  img.onload = () => {
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    ctx = canvas.getContext('2d');
    pushHistory();
  };

  bindEvents();
}

function bindEvents() {
  btnPen.addEventListener('click', () => {
    pen = !pen;
    if (pen) textMode = false;
    btnPen.classList.toggle('active', pen);
    btnText.classList.remove('active');
  });

  btnText.addEventListener('click', () => {
    textMode = !textMode;
    if (textMode) pen = false;
    btnText.classList.toggle('active', textMode);
    btnPen.classList.remove('active');
  });

  btnUndo.addEventListener('click', () => undo());

  canvas.addEventListener('mousedown', (e) => {
    if (!pen || !ctx) return;
    drawing = true;
    const p = toLocal(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!drawing || !pen || !ctx) return;
    const p = toLocal(e);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineCap = 'round';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  window.addEventListener('mouseup', () => {
    if (drawing) {
      drawing = false;
      pushHistory();
    }
  });

  overlay.addEventListener('mousedown', (e) => {
    if (!textMode) return;
    const p = toLocal(e);
    startPoint = p;
    const box = document.createElement('div');
    box.className = 'text-box';
    box.contentEditable = 'true';
    box.style.left = `${p.x}px`;
    box.style.top = `${p.y}px`;
    box.style.width = '10px';
    box.style.height = '10px';
    overlay.appendChild(box);
    activeBox = box;
    box.focus();
    e.preventDefault();
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!textMode || !activeBox || !startPoint) return;
    const p = toLocal(e);
    const w = Math.max(10, p.x - startPoint.x);
    const h = Math.max(10, p.y - startPoint.y);
    activeBox.style.width = `${w}px`;
    activeBox.style.height = `${h}px`;
  });

  overlay.addEventListener('mouseup', () => {
    if (!textMode) return;
    if (activeBox) {
      pushHistory();
    }
    activeBox = null;
    startPoint = null;
  });

  btnClear.addEventListener('click', () => {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    overlay.innerHTML = '';
    pushHistory();
  });

  btnZoomIn.addEventListener('click', () => { scale = Math.min(4, scale + 0.2); applyZoom(); });
  btnZoomOut.addEventListener('click', () => { scale = Math.max(0.5, scale - 0.2); applyZoom(); });
  btnZoomReset.addEventListener('click', () => { scale = 1; applyZoom(); });

  btnDownload.addEventListener('click', async () => {
    const merged = await mergeImageWithCanvas();
    const a = document.createElement('a');
    a.href = merged;
    a.download = `nebula-trace-${stepId}.jpg`;
    a.click();
  });

  btnSave.addEventListener('click', async () => {
    const merged = await mergeImageWithCanvas();
    await Steps.update(stepId, { screenshot: merged, note: note.value || '' });
    try {
      await chrome.storage.local.set({ traceNeedsRefresh: true });
      chrome.runtime.sendMessage({ type: 'IMAGE_EDITED', stepId, sessionId: step.sessionId });
    } catch {}
    showToast('Saved');
  });

  btnClose.addEventListener('click', () => window.close());
}

function applyZoom() {
  zoomWrap.style.transform = `scale(${scale})`;
}

function toLocal(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
}

async function mergeImageWithCanvas() {
  const w = canvas.width;
  const h = canvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const c = out.getContext('2d');
  if (!c) return img.src;
  c.drawImage(img, 0, 0, w, h);
  c.drawImage(canvas, 0, 0, w, h);

  const boxes = Array.from(overlay.querySelectorAll('.text-box'));
  boxes.forEach(box => {
    const rect = box.getBoundingClientRect();
    const parent = overlay.getBoundingClientRect();
    const x = rect.left - parent.left;
    const y = rect.top - parent.top;
    const bw = rect.width;
    const bh = rect.height;
    c.strokeStyle = '#4f46e5';
    c.lineWidth = 1;
    c.strokeRect(x, y, bw, bh);
    c.fillStyle = '#111827';
    c.font = '12px DM Sans, sans-serif';
    const text = (box.textContent || '').trim();
    drawWrappedText(c, text, x + 4, y + 14, bw - 8, 14);
  });

  return compressDataUrl(out, 0.8, 1600);
}

function compressDataUrl(canvas, quality = 0.8, maxW = 1600) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(1, maxW / w);
  if (scale === 1) return canvas.toDataURL('image/jpeg', quality);
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const c = out.getContext('2d');
  c.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', quality);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(/\s+/);
  let line = '';
  let yy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = words[i];
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function pushHistory() {
  if (!ctx) return;
  const snapshot = {
    canvas: canvas.toDataURL('image/png'),
    overlay: overlay.innerHTML,
  };
  history.push(snapshot);
  if (history.length > 20) history.shift();
}

function undo() {
  if (history.length < 2) return;
  history.pop();
  const prev = history[history.length - 1];
  restoreSnapshot(prev);
}

function restoreSnapshot(snap) {
  if (!ctx) return;
  const imgEl = new Image();
  imgEl.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  };
  imgEl.src = snap.canvas;
  overlay.innerHTML = snap.overlay || '';
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1200);
}

function showError(text) {
  errorEl.style.display = 'block';
  errorEl.textContent = text;
}
