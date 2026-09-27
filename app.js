import { convertFacebookUrl } from './converter.js';

const source = document.querySelector('#source-url');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const facebedOutput = document.querySelector('#facebed-url');
const facebookOutput = document.querySelector('#facebook-url');
const pasteButton = document.querySelector('#paste-button');
const clearButton = document.querySelector('#clear-button');
const debugPanel = document.querySelector('#debug-panel');
const debugOutput = document.querySelector('#debug-output');
const copyDebugButton = document.querySelector('#copy-debug-button');
const hideDebugButton = document.querySelector('#hide-debug-button');

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
  status.textContent = 'Automatic paste failed. Debug details are shown below.';
  source.focus();

  try {
    const end = source.value.length;
    source.setSelectionRange(end, end);
  } catch {
    // Some older mobile browsers do not support setSelectionRange on textarea.
  }
}

function errorInfo(error) {
  if (!error) return null;
  return {
    name: error.name || error.constructor?.name || 'UnknownError',
    message: error.message || String(error),
  };
}

async function permissionState(name) {
  if (!navigator.permissions?.query) return 'Permissions API unavailable';

  try {
    const result = await navigator.permissions.query({ name });
    return result.state;
  } catch (error) {
    const info = errorInfo(error);
    return `query failed: ${info?.name}: ${info?.message}`;
  }
}

async function showPasteDebug(details) {
  const activation = navigator.userActivation;
  const uaData = navigator.userAgentData;

  const debug = {
    timestamp: new Date().toISOString(),
    page: location.href,
    secureContext: window.isSecureContext,
    topLevelPage: window.top === window.self,
    documentHasFocus: document.hasFocus(),
    visibilityState: document.visibilityState,
    clickIsTrusted: details.clickIsTrusted,
    userActivation: activation
      ? {
          isActive: activation.isActive,
          hasBeenActive: activation.hasBeenActive,
        }
      : 'unavailable',
    clipboardApi: {
      navigatorClipboard: Boolean(navigator.clipboard),
      readText: typeof navigator.clipboard?.readText === 'function',
      writeText: typeof navigator.clipboard?.writeText === 'function',
      clipboardReadPermission: await permissionState('clipboard-read'),
      clipboardWritePermission: await permissionState('clipboard-write'),
    },
    modernPaste: {
      attempted: details.modernAttempted,
      returnedEmptyString: details.modernReturnedEmpty,
      error: errorInfo(details.modernError),
    },
    legacyPaste: {
      execCommandAvailable: typeof document.execCommand === 'function',
      queryCommandSupportedAvailable:
        typeof document.queryCommandSupported === 'function',
      reportedSupported: details.legacyReportedSupported,
      attempted: details.legacyAttempted,
      result: details.legacyResult,
      changedFieldValue: details.legacyChangedValue,
      error: errorInfo(details.legacyError),
    },
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform || 'unavailable',
      language: navigator.language,
      vendor: navigator.vendor || 'unavailable',
      userAgentData: uaData
        ? {
            mobile: uaData.mobile,
            platform: uaData.platform,
            brands: uaData.brands,
          }
        : 'unavailable',
    },
    note: 'Clipboard contents are not included in this debug report.',
  };

  debugOutput.value = JSON.stringify(debug, null, 2);
  debugPanel.hidden = false;
}

function tryLegacyPaste() {
  const report = {
    legacyReportedSupported: null,
    legacyAttempted: false,
    legacyResult: null,
    legacyChangedValue: false,
    legacyError: null,
    success: false,
  };

  source.focus();

  try {
    if (typeof document.execCommand !== 'function') return report;

    report.legacyReportedSupported =
      typeof document.queryCommandSupported !== 'function'
        ? null
        : document.queryCommandSupported('paste');

    if (report.legacyReportedSupported === false) return report;

    const before = source.value;
    report.legacyAttempted = true;
    report.legacyResult = document.execCommand('paste');
    report.legacyChangedValue = source.value !== before;
    report.success = Boolean(report.legacyResult || report.legacyChangedValue);

    if (report.success) render();
  } catch (error) {
    report.legacyError = error;
  }

  return report;
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

async function copyText(text, field, button) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      markCopied(button);
      return true;
    } catch {
      // Continue to legacy copy.
    }
  }

  field.focus();
  field.select();

  if (tryLegacyCopy(field)) {
    markCopied(button);
    return true;
  }

  return false;
}

async function copyFrom(targetId, button) {
  const field = document.querySelector(`#${targetId}`);
  if (!field?.value) return;

  if (await copyText(field.value, field, button)) return;

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

pasteButton.addEventListener('click', async (event) => {
  status.textContent = '';
  status.classList.remove('error', 'success');
  debugPanel.hidden = true;

  let modernAttempted = false;
  let modernReturnedEmpty = false;
  let modernError = null;

  if (navigator.clipboard?.readText) {
    modernAttempted = true;

    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText) {
        source.value = clipboardText;
        render();
        return;
      }

      modernReturnedEmpty = true;
    } catch (error) {
      modernError = error;
    }
  }

  const legacy = tryLegacyPaste();
  if (legacy.success) return;

  manualPasteFallback();
  await showPasteDebug({
    clickIsTrusted: event.isTrusted,
    modernAttempted,
    modernReturnedEmpty,
    modernError,
    ...legacy,
  });
});

copyDebugButton.addEventListener('click', async () => {
  if (!debugOutput.value) return;

  if (await copyText(debugOutput.value, debugOutput, copyDebugButton)) return;

  debugOutput.focus();
  debugOutput.select();
  status.classList.remove('success');
  status.classList.add('error');
  status.textContent = 'Debug text is selected. Choose Copy.';
});

hideDebugButton.addEventListener('click', () => {
  debugPanel.hidden = true;
});

clearButton.addEventListener('click', () => {
  source.value = '';
  status.textContent = '';
  debugPanel.hidden = true;
  clearResult();
  source.focus();
});

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', () => copyFrom(button.dataset.copyTarget, button));
});
