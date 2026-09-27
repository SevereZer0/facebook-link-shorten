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

function manualPasteFallback() {
  status.classList.remove('error', 'success');
  status.textContent = 'Long-press the URL box and choose Paste.';
  source.focus();

  try {
    const end = source.value.length;
    source.setSelectionRange(end, end);
  } catch {
    // Some older mobile browsers do not support setSelectionRange on textarea.
  }
}

function tryLegacyPaste() {
  source.focus();

  try {
    const before = source.value;
    const supported =
      typeof document.execCommand === 'function' &&
      (typeof document.queryCommandSupported !== 'function' ||
        document.queryCommandSupported('paste'));

    if (!supported) return false;

    const result = document.execCommand('paste');
    if (result || source.value !== before) {
      render();
      return true;
    }
  } catch {
    // Continue to the next clipboard strategy.
  }

  return false;
}

function markCopied(button) {
  const oldText = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = oldText;
  }, 1200);
}

function tryLegacyCopy(field) {
  try {
    field.focus();
    field.select();
    return (
      typeof document.execCommand === 'function' &&
      document.execCommand('copy')
    );
  } catch {
    return false;
  }
}

async function copyFrom(targetId, button) {
  const field = document.querySelector(`#${targetId}`);
  if (!field?.value) return;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(field.value);
      markCopied(button);
      return;
    } catch {
      // Android WebView-based browsers can expose Clipboard API but reject access.
    }
  }

  if (tryLegacyCopy(field)) {
    markCopied(button);
    return;
  }

  field.focus();
  field.select();
  status.classList.remove('success');
  status.classList.add('error');
  status.textContent = 'Automatic copy is unavailable. The URL is selected; choose Copy.';
}

source.addEventListener('input', render);
source.addEventListener('paste', () => {
  setTimeout(render, 0);
});

pasteButton.addEventListener('click', async () => {
  status.textContent = '';
  status.classList.remove('error', 'success');

  if (navigator.clipboard?.readText) {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText) {
        source.value = clipboardText;
        render();
        return;
      }
    } catch {
      // Fall through for browsers such as Android WebView wrappers.
    }
  }

  if (tryLegacyPaste()) return;

  manualPasteFallback();
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
