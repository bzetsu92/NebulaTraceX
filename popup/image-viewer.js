import { Steps } from '../storage/sessions.js';

async function main() {
  const params = new URLSearchParams(location.search);
  const stepId = Number(params.get('stepId'));
  if (!stepId) return;
  const step = await Steps.get(stepId);
  if (!step) return;

  const img = document.getElementById('viewer-img');
  const note = document.getElementById('viewer-note');
  img.src = step.screenshotAnnotated || step.screenshot;
  note.textContent = step.screenshotNote || '';

  document.getElementById('btn-close').addEventListener('click', () => window.close());
}

main().catch(() => null);
