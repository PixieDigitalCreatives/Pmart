'use strict';

/**
 * RFC 4180 CSV parsing and writing. Every value stays a string: nothing is converted to a number,
 * so leading zeros and long barcodes survive untouched.
 */

/** Parses CSV text into an array of rows (arrays of strings). Handles quotes, escaped quotes, CRLF and a BOM. */
function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Quotes a value for CSV output. Every field is quoted so codes such as "+000462" or "0000708" keep their exact text. */
function csvCell(value) {
  if (value === undefined || value === null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Joins rows into CSV text with CRLF line endings. */
function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

module.exports = { parseCsv, toCsv, csvCell };
