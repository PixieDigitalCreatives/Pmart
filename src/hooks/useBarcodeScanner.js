import { useEffect, useRef } from 'react';

/**
 * Catches scans from a USB/Bluetooth barcode scanner in keyboard mode anywhere on the page.
 * A scanner "types" the code very fast and ends with Enter; a person types far slower. Gaps are measured with the
 * key events' own timestamps.
 *
 * - Focus outside text fields: a burst of at least `minLength` characters with no gap above `maxGap` ms,
 *   followed by Enter, is one scan. `maxGap` is generous (100 ms) so slower Bluetooth scanners work too.
 * - Focus inside another text field (search box, customer name …): only a much faster burst counts — at least
 *   `fieldMinLength` characters, each within `fieldMaxGap` ms, with Enter right after — which people can't type.
 *   The scanned characters are taken back out of that field so the code doesn't end up in it.
 * - Fields marked with data-scanner-input handle their own Enter; password fields and selects are never touched.
 *
 * The same code reported twice within `repeatMs` (a double trigger) is ignored; deliberate repeat scans after that
 * are passed through. `fallback: true` (used once, by the admin layout) only acts when no screen scanner is active,
 * so a scan on a screen without its own scanner still does something.
 */
let screenScanners = 0;

const isTextField = (el) =>
  el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)) || el.tagName === 'SELECT');

// Removes the scanned characters from a React-controlled input or textarea (React listens for the input event).
function takeBackTyped(el, text) {
  if (!text || typeof el.value !== 'string') return;
  const at = el.value.lastIndexOf(text);
  if (at === -1) return;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setValue) return;
  setValue.call(el, el.value.slice(0, at) + el.value.slice(at + text.length));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function useBarcodeScanner(
  onScan,
  { enabled = true, fallback = false, minLength = 4, maxGap = 100, fieldMinLength = 6, fieldMaxGap = 35, repeatMs = 350 } = {}
) {
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;
    if (!fallback) screenScanners += 1;
    let buffer = '';
    let bufferTarget = null;
    let last = 0;
    let lastScan = { code: '', at: 0 };

    const onKeyDown = (e) => {
      const target = e.target;
      if (target && target.dataset && target.dataset.scannerInput !== undefined) return;
      const inField = isTextField(target);
      if (inField && (target.tagName === 'SELECT' || target.isContentEditable || target.type === 'password')) return;
      // The event's own timestamp is when the key arrived; performance.now() would include the page re-rendering
      // after each typed character, which makes a fast scanner look slow on a busy screen.
      const now = e.timeStamp || performance.now();
      const gapLimit = inField ? fieldMaxGap : maxGap;

      if (e.key === 'Enter') {
        const code = buffer;
        const sameTarget = bufferTarget === target;
        const quickEnter = now - last <= gapLimit * 2;
        buffer = '';
        bufferTarget = null;
        if (code.length < (inField ? fieldMinLength : minLength) || (inField && !(sameTarget && quickEnter))) return;
        if (fallback && screenScanners > 0) return;
        e.preventDefault();
        e.stopPropagation();
        if (inField) takeBackTyped(target, code);
        if (code === lastScan.code && now - lastScan.at < repeatMs) return;
        lastScan = { code, at: now };
        handler.current(code);
        return;
      }
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
      if (now - last > gapLimit || bufferTarget !== target) buffer = '';
      buffer += e.key;
      bufferTarget = target;
      last = now;
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      if (!fallback) screenScanners -= 1;
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [enabled, fallback, minLength, maxGap, fieldMinLength, fieldMaxGap, repeatMs]);
}

/** True when the browser can read barcodes from the camera (BarcodeDetector API). */
export const cameraScanSupported = () => typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);
