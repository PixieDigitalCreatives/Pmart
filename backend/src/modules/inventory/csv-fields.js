'use strict';

/**
 * The 17 columns of the store's inventory CSV (order.csv) and the product field each one is stored in.
 * This single table drives the importer, the CSV export and the product form, so no column is ever renamed
 * or dropped on the way in or out. See docs/PMart_INVENTORY_BILLING.md §4.
 */
const CSV_FIELDS = Object.freeze([
  { column: 'code', field: 'code', label: 'Product Code', type: 'string', required: true },
  { column: 'name', field: 'name', label: 'Product Name', type: 'string', required: true },
  { column: 'unit', field: 'unit', label: 'Unit', type: 'string' },
  { column: 'stock', field: 'stockCount', label: 'Current Stock', type: 'number', decimals: 3, clampNegative: true },
  { column: 'deal', field: 'deal', label: 'Deal', type: 'number', decimals: 3, clampNegative: true },
  { column: 'free', field: 'free', label: 'Free Quantity', type: 'number', decimals: 3, clampNegative: true },
  { column: 'pur_deal', field: 'purDeal', label: 'Purchase Deal', type: 'number', decimals: 3, clampNegative: true },
  { column: 'pur_free', field: 'purFree', label: 'Purchase Free Quantity', type: 'number', decimals: 3, clampNegative: true },
  { column: 'cost', field: 'cost', label: 'Cost Price', type: 'number', decimals: 4, clampNegative: true },
  { column: 'value', field: 'stockValue', label: 'Stock Value', type: 'number', decimals: 2, clampNegative: true },
  { column: 'mrp', field: 'mrp', label: 'MRP', type: 'number', decimals: 2, clampNegative: true },
  { column: 'pur_rate', field: 'purRate', label: 'Purchase Rate', type: 'number', decimals: 4, clampNegative: true },
  { column: 'rate', field: 'rate', label: 'Selling Rate', type: 'number', decimals: 2, clampNegative: true },
  { column: 'company', field: 'company', label: 'Company', type: 'string' },
  { column: 'manufact', field: 'manufacturer', label: 'Manufacturer', type: 'string' },
  { column: 'rackno', field: 'rackNo', label: 'Rack Number', type: 'string' },
  { column: 'barcode', field: 'barcode', label: 'Barcode', type: 'string' }
]);

const CSV_COLUMNS = CSV_FIELDS.map((f) => f.column);
const BY_FIELD = new Map(CSV_FIELDS.map((f) => [f.field, f]));

const STRING_LIMITS = { code: 64, name: 150, unit: 40, company: 120, manufacturer: 120, rackNo: 40, barcode: 64 };
const NUMBER_LIMIT = 100000000;

const roundTo = (n, decimals) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/** Default mapping: every header that matches a known column (case-insensitive) maps to it. */
function autoMapping(headers) {
  const mapping = {};
  headers.forEach((h) => {
    const key = String(h).trim().toLowerCase();
    const match = CSV_FIELDS.find((f) => f.column === key || f.field.toLowerCase() === key || f.label.toLowerCase() === key);
    if (match && !Object.values(mapping).includes(match.field)) mapping[h] = match.field;
  });
  return mapping;
}

/**
 * Converts one CSV row into product field values.
 * Returns { values, raw, errors, warnings }: `raw` holds the original text of every mapped column, keyed by the
 * CSV column name, exactly as it appeared in the file.
 */
function convertRow(cells, headers, mapping) {
  const values = {};
  const raw = {};
  const errors = [];
  const warnings = [];

  headers.forEach((header, i) => {
    const field = mapping[header];
    if (!field) return;
    const spec = BY_FIELD.get(field);
    if (!spec) return;
    const text = cells[i] === undefined ? '' : String(cells[i]);
    raw[spec.column] = text;

    if (spec.type === 'string') {
      // Codes keep their exact text (surrounding spaces included); every other text field is trimmed.
      const value = field === 'code' ? text : text.trim();
      const limit = STRING_LIMITS[field];
      if (value.length > limit) errors.push(`${spec.column}: longer than ${limit} characters`);
      values[field] = value;
      return;
    }

    const trimmed = text.trim();
    if (trimmed === '') {
      values[field] = 0;
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      errors.push(`${spec.column}: "${trimmed}" is not a number`);
      return;
    }
    if (Math.abs(n) > NUMBER_LIMIT) {
      errors.push(`${spec.column}: ${trimmed} is out of range`);
      return;
    }
    if (n < 0 && spec.clampNegative) {
      warnings.push(`${spec.column}: negative value ${trimmed} imported as 0`);
      values[field] = 0;
      return;
    }
    values[field] = roundTo(n, spec.decimals);
  });

  CSV_FIELDS.filter((f) => f.required).forEach((f) => {
    if (Object.values(mapping).includes(f.field) && !String(values[f.field] || '').trim()) errors.push(`${f.column}: required`);
  });
  return { values, raw, errors, warnings };
}

/** One export row in CSV column order. Numbers are written as plain decimals. */
function exportRow(product) {
  return CSV_FIELDS.map(({ field }) => {
    const v = product[field];
    if (v === undefined || v === null) return '';
    return typeof v === 'number' ? String(v) : v;
  });
}

module.exports = { CSV_FIELDS, CSV_COLUMNS, autoMapping, convertRow, exportRow, roundTo };
