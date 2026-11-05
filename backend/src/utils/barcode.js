'use strict';

/** Removes whitespace and control characters a keyboard-wedge scanner may add around a code. */
function cleanScan(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
}

/** True for a GTIN-8, UPC-A (12), EAN-13 or GTIN-14 whose check digit is correct. */
function isValidGtin(code) {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Codes a scanned value may be stored under: the value itself plus the UPC-A / EAN-13 forms of the same
 * number (scanners differ in whether they report the leading 0 of a UPC-A code).
 */
function scanVariants(value) {
  const code = cleanScan(value);
  if (!code) return [];
  const out = new Set([code]);
  if (/^\d{12}$/.test(code)) out.add(`0${code}`);
  if (/^0\d{12}$/.test(code)) out.add(code.slice(1));
  return [...out];
}

module.exports = { cleanScan, isValidGtin, scanVariants };
