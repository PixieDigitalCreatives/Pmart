'use strict';

const crypto = require('crypto');
const { Product, ImageStatus, slugify } = require('../catalog/catalog.model');
const { InventoryTransaction, ImportBatch, ImportStatus, RowOutcome, MovementType, RefType } = require('./inventory.model');
const { CSV_FIELDS, autoMapping, convertRow } = require('./csv-fields');
const { parseCsv } = require('../../utils/csv');
const { badRequest, conflict, notFound } = require('../../utils/http-error');
const { memoryCache } = require('../../utils/cache');

const MAX_CSV_BYTES = 8 * 1024 * 1024;
const INSERT_CHUNK = 500;
const KNOWN_FIELDS = new Set(CSV_FIELDS.map((f) => f.field));

function validateMapping(headers, mapping) {
  const clean = {};
  const used = new Set();
  Object.entries(mapping || {}).forEach(([header, field]) => {
    if (!field) return;
    if (!headers.includes(header)) throw badRequest(`Column "${header}" is not in the file`, 'INVALID_MAPPING');
    if (!KNOWN_FIELDS.has(field)) throw badRequest(`Unknown product field "${field}"`, 'INVALID_MAPPING');
    if (used.has(field)) throw badRequest(`Two columns are mapped to ${field}`, 'INVALID_MAPPING');
    used.add(field);
    clean[header] = field;
  });
  ['code', 'name'].forEach((f) => {
    if (!used.has(f)) throw badRequest(`Map a column to ${f === 'code' ? 'Product Code' : 'Product Name'}`, 'INVALID_MAPPING');
  });
  return clean;
}

/**
 * Classifies every row against the file and the database. Rows are matched on product code (per store):
 * a code already in the store, or repeated earlier in the file, is a DUPLICATE and is never overwritten.
 */
async function analyse(rows, headers, mapping, shopId) {
  const existing = await Product.find({ shop: shopId }).select('code barcodes').lean();
  const existingCodes = new Set(existing.map((p) => p.code).filter(Boolean));
  const barcodeOwners = new Map();
  existing.forEach((p) => (p.barcodes || []).forEach((b) => barcodeOwners.set(b, `existing product ${p.code || p._id}`)));

  const seenCodes = new Map();
  const ready = [];
  const report = [];
  const totals = { rows: rows.length, created: 0, duplicate: 0, failed: 0, skipped: 0, warnings: 0 };

  rows.forEach((cells, index) => {
    const rowNo = index + 2; // 1-based, after the header line
    if (cells.every((c) => String(c).trim() === '')) {
      totals.skipped += 1;
      report.push({ row: rowNo, code: '', name: '', outcome: RowOutcome.SKIPPED, messages: ['Blank row'] });
      return;
    }
    const { values, raw, errors, warnings } = convertRow(cells, headers, mapping);
    const code = values.code || '';
    const name = values.name || '';
    if (cells.length !== headers.length) warnings.push(`Row has ${cells.length} columns; the header has ${headers.length}`);

    if (errors.length) {
      totals.failed += 1;
      report.push({ row: rowNo, code, name, outcome: RowOutcome.FAILED, messages: errors });
      return;
    }
    if (existingCodes.has(code)) {
      totals.duplicate += 1;
      report.push({ row: rowNo, code, name, outcome: RowOutcome.DUPLICATE, messages: ['Product code already exists in this store (not overwritten)'] });
      return;
    }
    if (seenCodes.has(code)) {
      totals.duplicate += 1;
      report.push({ row: rowNo, code, name, outcome: RowOutcome.DUPLICATE, messages: [`Same product code as row ${seenCodes.get(code)}`] });
      return;
    }
    seenCodes.set(code, rowNo);

    const barcode = values.barcode || '';
    if (barcode) {
      if (barcodeOwners.has(barcode)) warnings.push(`Barcode ${barcode} is also used by ${barcodeOwners.get(barcode)}`);
      else barcodeOwners.set(barcode, `row ${rowNo} (code ${code})`);
    }
    if (warnings.length) {
      totals.warnings += 1;
      report.push({ row: rowNo, code, name, outcome: RowOutcome.CREATED, messages: warnings });
    }
    ready.push({ rowNo, values, raw });
  });

  totals.created = ready.length;
  return { ready, report, totals };
}

function readCsv(csvText) {
  const text = String(csvText || '');
  if (!text.trim()) throw badRequest('The file is empty', 'EMPTY_FILE');
  if (Buffer.byteLength(text, 'utf8') > MAX_CSV_BYTES) throw badRequest('The file is larger than 8 MB', 'FILE_TOO_LARGE');
  const all = parseCsv(text);
  const headers = (all[0] || []).map((h) => String(h).trim());
  if (headers.length === 0 || headers.every((h) => !h)) throw badRequest('The first line must contain column names', 'NO_HEADER');
  // A trailing newline produces one empty row; ignore it.
  const rows = all.slice(1).filter((r, i, arr) => !(i === arr.length - 1 && r.length === 1 && r[0] === ''));
  return { headers, rows };
}

/** Parses and validates a CSV without writing products. Stores the file and the analysis as an ImportBatch. */
async function previewImport({ csvText, fileName, shopId, mapping, user }) {
  const { headers, rows } = readCsv(csvText);
  const usedMapping = validateMapping(headers, mapping && Object.keys(mapping).length ? mapping : autoMapping(headers));
  const { ready, report, totals } = await analyse(rows, headers, usedMapping, shopId);

  const batch = await ImportBatch.create({
    shop: shopId,
    fileName: fileName ? String(fileName).slice(0, 200) : undefined,
    fileHash: crypto.createHash('sha256').update(csvText).digest('hex'),
    fileSize: Buffer.byteLength(csvText, 'utf8'),
    headers,
    mapping: usedMapping,
    csvText,
    totals,
    report,
    createdBy: user._id
  });
  const previouslyImported = await ImportBatch.exists({ fileHash: batch.fileHash, status: ImportStatus.COMMITTED, shop: shopId });
  return {
    batch: summary(batch),
    sample: ready.slice(0, 25).map((r) => ({ row: r.rowNo, ...r.values })),
    previouslyImported: Boolean(previouslyImported)
  };
}

function summary(batch) {
  const b = batch.toObject ? batch.toObject() : batch;
  delete b.csvText;
  return b;
}

function uniqueSlug(base, taken) {
  const root = base || 'item';
  let slug = root;
  for (let i = 2; taken.has(slug); i += 1) slug = `${root}-${i}`;
  taken.add(slug);
  return slug;
}

/**
 * Creates the products of a previewed batch. The file is re-analysed against the database at commit time, so
 * anything imported since the preview is still treated as a duplicate. A committed batch cannot run again.
 */
async function commitImport({ batchId, mapping, user }) {
  const claimed = await ImportBatch.findOneAndUpdate({ _id: batchId, status: ImportStatus.PREVIEW }, { $set: { status: ImportStatus.COMMITTING } }, { new: true }).select('+csvText');
  if (!claimed) {
    const batch = await ImportBatch.findById(batchId);
    if (!batch) throw notFound('Import not found');
    if (batch.status === ImportStatus.COMMITTED) return { batch: summary(batch), replayed: true };
    throw conflict(`This import is ${batch.status.toLowerCase().replace('_', ' ')}`, 'IMPORT_NOT_PENDING');
  }

  try {
    const { headers, rows } = readCsv(claimed.csvText);
    const usedMapping = validateMapping(headers, mapping && Object.keys(mapping).length ? mapping : claimed.mapping);
    const { ready, report, totals } = await analyse(rows, headers, usedMapping, claimed.shop);

    const taken = new Set((await Product.find({}).select('slug').lean()).map((p) => p.slug));
    const now = new Date();
    const docs = ready.map(({ rowNo, values, raw }) => {
      const rate = values.rate ?? 0;
      const mrp = values.mrp ?? 0;
      return {
        shop: claimed.shop,
        ...values,
        unit: values.unit || '',
        barcode: values.barcode || '',
        barcodes: values.barcode ? [values.barcode] : [],
        rate,
        mrp,
        price: rate > 0 ? rate : mrp,
        stockCount: values.stockCount ?? 0,
        isActive: false,
        image: { status: ImageStatus.NOT_AVAILABLE },
        slug: uniqueSlug(slugify(`${values.name} ${values.code}`), taken),
        importSource: { batch: claimed._id, row: rowNo, raw, importedAt: now }
      };
    });

    // Validate every document first (runs the schema hooks) so no invalid row is skipped silently by insertMany.
    const valid = [];
    for (const doc of docs) {
      const product = new Product(doc);
      try {
        await product.validate();
        valid.push(product);
      } catch (err) {
        totals.failed += 1;
        const messages = Object.values(err.errors || {}).map((e) => e.message);
        report.push({ row: doc.importSource.row, code: doc.code, name: doc.name, outcome: RowOutcome.FAILED, messages: messages.length ? messages : [err.message] });
      }
    }

    const created = [];
    for (let i = 0; i < valid.length; i += INSERT_CHUNK) {
      const chunk = valid.slice(i, i + INSERT_CHUNK);
      try {
        created.push(...(await Product.insertMany(chunk, { ordered: false })));
      } catch (err) {
        if (Array.isArray(err.insertedDocs)) created.push(...err.insertedDocs);
        (err.writeErrors || []).forEach((we) => {
          const doc = chunk[we.index];
          totals.failed += 1;
          report.push({ row: doc.importSource.row, code: doc.code, name: doc.name, outcome: RowOutcome.FAILED, messages: [we.errmsg || 'Insert failed'] });
        });
        if (!err.writeErrors && !err.insertedDocs) throw err;
      }
    }

    const opening = created
      .filter((p) => p.stockCount !== 0)
      .map((p) => ({
        shop: p.shop,
        product: p._id,
        productName: p.name,
        productCode: p.code,
        type: MovementType.OPENING,
        quantity: p.stockCount,
        stockBefore: 0,
        stockAfter: p.stockCount,
        unitCost: p.cost,
        refType: RefType.IMPORT,
        refId: claimed._id,
        reason: 'Opening stock from CSV import',
        user: user._id,
        dedupeKey: `IMP:${claimed._id}:${p._id}`
      }));
    for (let i = 0; i < opening.length; i += INSERT_CHUNK) {
      await InventoryTransaction.insertMany(opening.slice(i, i + INSERT_CHUNK), { ordered: false });
    }

    totals.created = created.length;
    report.sort((a, b) => a.row - b.row);
    const batch = await ImportBatch.findByIdAndUpdate(
      claimed._id,
      { $set: { status: ImportStatus.COMMITTED, mapping: usedMapping, totals, report, committedBy: user._id, committedAt: new Date() } },
      { new: true }
    );
    memoryCache.delByPrefix('catalog:');
    return { batch: summary(batch), replayed: false };
  } catch (err) {
    await ImportBatch.updateOne({ _id: claimed._id }, { $set: { status: ImportStatus.FAILED, error: err.message } });
    throw err;
  }
}

/**
 * Deletes the products a batch created, except any that have been restocked, sold, adjusted or invoiced since.
 * Returns { deleted, kept: [{ code, reason }] }.
 */
async function rollbackImport(batchId) {
  const { Invoice } = require('../billing/billing.model');
  const { ProductImage } = require('../images/image.model');
  const batch = await ImportBatch.findById(batchId);
  if (!batch) throw notFound('Import not found');
  if (batch.status !== ImportStatus.COMMITTED) throw conflict('Only a committed import can be rolled back', 'IMPORT_NOT_COMMITTED');

  const products = await Product.find({ 'importSource.batch': batch._id }).select('_id code').lean();
  const ids = products.map((p) => p._id);
  const moved = new Set((await InventoryTransaction.distinct('product', { product: { $in: ids }, type: { $ne: MovementType.OPENING } })).map(String));
  const invoiced = new Set((await Invoice.distinct('items.product', { 'items.product': { $in: ids } })).map(String));

  const kept = [];
  const removable = [];
  products.forEach((p) => {
    if (invoiced.has(String(p._id))) kept.push({ code: p.code, reason: 'on an invoice' });
    else if (moved.has(String(p._id))) kept.push({ code: p.code, reason: 'has stock movements after the import' });
    else removable.push(p._id);
  });

  await InventoryTransaction.deleteMany({ product: { $in: removable }, type: MovementType.OPENING, refId: batch._id });
  await ProductImage.deleteMany({ product: { $in: removable } });
  const { deletedCount } = await Product.deleteMany({ _id: { $in: removable } });
  batch.status = kept.length ? ImportStatus.COMMITTED : ImportStatus.ROLLED_BACK;
  batch.error = kept.length ? `Partially rolled back: ${deletedCount} removed, ${kept.length} kept` : undefined;
  await batch.save();
  memoryCache.delByPrefix('catalog:');
  return { deleted: deletedCount, kept };
}

module.exports = { previewImport, commitImport, rollbackImport, MAX_CSV_BYTES };
