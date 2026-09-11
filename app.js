import { convertFacebookUrl } from './converter.js';

const source = document.querySelector('#source-url');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const facebedOutput = document.querySelector('#facebed-url');
const facebookOutput = document.querySelector('#facebook-url');
const pasteButton = document.querySelector('#paste-button');
const clearButton = document.querySelector('#clear-button');

function clearResult() {
  results.hidden = true;
  facebedOutput.value = '';
  facebookOutput.value = '';
}

function render() {
  const value = source.value.trim();
  status.textContent = '';
  status.classList.remove('error', 'success');

  if (!value) {
    clearResult();
    return;
  }

  try {
    const converted = convertFacebookUrl(value);
    facebedOutput.value = converted.facebedUrl;
    facebookOutput.value = converted.facebookUrl;
    results.hidden = false;
    status.textContent = 'Converted locally. No Facebook request was made.';
    status.classList.add('success');
  } catch (error) {
    clearResult();
    status.textContent = error instanceof Error ? error.message : 'Unable to convert this URL.';
    status.classList.add('error');
  }
}

async function copyFrom(targetId, button) {
  const field = document.querySelector(`#${targetId}`);
  if (!field?.value) return;

  try {
    await navigator.clipboard.writeText(field.value);
    const oldText = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = oldText;
    }, 1200);
  } catch {
    field.focus();
    field.select();
    status.textContent = 'Clipboard access was blocked. The URL is selected for manual copy.';
    status.classList.add('error');
  }
}

source.addEventListener('input', render);

pasteButton.addEventListener('click', async () => {
  try {
    source.value = await navigator.clipboard.readText();
    render();
  } catch {
    status.textContent = 'Clipboard access was blocked. Paste the URL into the box manually.';
    status.classList.add('error');
    source.focus();
  }
});

clearButton.addEventListener('click', () => {
  source.value = '';
  status.textContent = '';
  clearResult();
  source.focus();
});

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', () => copyFrom(button.dataset.copyTarget, button));
});
