'use strict';

const crypto = require('crypto');
const { Product, ImageStatus } = require('../catalog/catalog.model');
const { Shop } = require('../shop/shop.model');
const { ProductImage, ReviewStatus } = require('../images/image.model');
const { InventoryTransaction, Restock, Supplier, ImportBatch, MovementType } = require('./inventory.model');
const { CSV_FIELDS, CSV_COLUMNS, exportRow } = require('./csv-fields');
const { restockProduct, adjustStock } = require('./inventory.service');
const { previewImport, commitImport, rollbackImport } = require('./import.service');
const imageService = require('../images/image.service');
const { lookupBarcode } = require('../images/image-sources');
const { hasPermission } = require('../../middleware/auth.middleware');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { runInTransaction } = require('../../utils/transaction');
const { scanVariants, isValidGtin, cleanScan } = require('../../utils/barcode');
const { escapeRegExp } = require('../../utils/regex');
const { csvCell, toCsv } = require('../../utils/csv');
const { z, assertObjectId, parsePagination, parseSearch } = require('../../utils/validation');
const { badRequest, forbidden, notFound } = require('../../utils/http-error');
const { memoryCache } = require('../../utils/cache');

/** Fields a scanner/restock/billing screen needs about a product. */
const SCAN_FIELDS =
  'name code barcode barcodes unit stockCount price rate mrp purRate cost rackNo company manufacturer imageUrl image.status isActive taxRate hsn shop category';

const idempotencyKey = z.string().trim().min(8).max(100);
const decimal = (max = 1000000) => z.number().finite().min(0).max(max);

const restockSchema = z.object({
  product: z.string().min(1),
  receivedQuantity: decimal(),
  freeQuantity: decimal().optional().default(0),
  purchaseRate: decimal().optional().nullable(),
  supplierName: z.string().trim().max(120).optional().or(z.literal('')),
  referenceNumber: z.string().trim().max(60).optional().or(z.literal('')),
  note: z.string().trim().max(300).optional().or(z.literal('')),
  idempotencyKey
});

const adjustmentSchema = z.object({
  product: z.string().min(1),
  mode: z.enum(['SET', 'DELTA']),
  quantity: z.number().finite().min(-1000000).max(1000000),
  reason: z.string().trim().min(3, 'Give a reason for the adjustment').max(300),
  idempotencyKey
});

/** Resolves the store an import or listing applies to: the one given, or the only store there is. */
async function resolveShop(requested) {
  if (requested) {
    assertObjectId(requested, 'shop id');
    const shop = await Shop.findById(requested).select('_id name');
    if (!shop) throw badRequest('Store not found', 'INVALID_SHOP');
    return shop;
  }
  const shops = await Shop.find().select('_id name').limit(2);
  if (shops.length === 1) return shops[0];
  throw badRequest(shops.length === 0 ? 'Create a store first' : 'Choose the store', 'SHOP_REQUIRED');
}

function dateRange(query, field = 'createdAt') {
  const range = {};
  if (query.from) {
    const d = new Date(String(query.from));
    if (Number.isNaN(d.getTime())) throw badRequest('Invalid from date', 'INVALID_DATE');
    range.$gte = d;
  }
  if (query.to) {
    const d = new Date(String(query.to));
    if (Number.isNaN(d.getTime())) throw badRequest('Invalid to date', 'INVALID_DATE');
    // A bare date means "through the end of that day".
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) d.setUTCHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

class InventoryController {
  static fields(req, res) {
    res.json({ success: true, data: CSV_FIELDS });
  }

  /** Exact lookup used by every scanner: barcode (any of a product's barcodes) or product code. */
  static async lookup(req, res) {
    const raw = cleanScan(req.query.code);
    if (!raw) throw badRequest('Scan or type a barcode or product code', 'CODE_REQUIRED');
    if (raw.length > 64) throw badRequest('Code too long', 'CODE_TOO_LONG');
    const variants = scanVariants(raw);
    const filter = { $or: [{ barcodes: { $in: variants } }, { codeKey: raw.toUpperCase() }] };
    if (req.query.shop) filter.shop = assertObjectId(req.query.shop, 'shop id');
    const products = await Product.find(filter).select(SCAN_FIELDS).limit(10).lean();
    res.json({ success: true, data: { code: raw, matches: products, validGtin: isValidGtin(raw) } });
  }

  /** Products that already use a barcode (duplicate warning on the product form). */
  static async barcodeCheck(req, res) {
    const barcode = cleanScan(req.query.barcode);
    if (!barcode) return res.json({ success: true, data: [] });
    const filter = { barcodes: { $in: scanVariants(barcode) } };
    if (req.query.exclude) filter._id = { $ne: assertObjectId(req.query.exclude, 'product id') };
    res.json({ success: true, data: await Product.find(filter).select('name code barcode').limit(5).lean() });
  }

  /** Product details for an unknown barcode from open product databases. Always returned as unverified. */
  static async externalLookup(req, res) {
    const barcode = cleanScan(req.query.barcode);
    if (!isValidGtin(barcode)) return res.json({ success: true, data: { barcode, valid: false, results: [] } });
    const result = await lookupBarcode(barcode, { stopAtFirstImage: false });
    res.json({ success: true, data: { ...result, verified: false } });
  }

  /** Streams the whole inventory as CSV with the original 17 columns first. */
  static async exportCsv(req, res) {
    const filter = {};
    if (req.query.shop) filter.shop = assertObjectId(req.query.shop, 'shop id');
    const header = [...CSV_COLUMNS, 'category', 'image_status', 'listed_online', 'selling_price', 'updated_at'];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pmart-inventory-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.write(`﻿${header.map(csvCell).join(',')}\r\n`);
    const cursor = Product.find(filter).populate('category', 'name').sort({ code: 1, _id: 1 }).lean().cursor();
    for await (const p of cursor) {
      const row = [...exportRow(p), p.category?.name || '', p.image?.status || ImageStatus.NOT_AVAILABLE, p.isActive ? 'yes' : 'no', p.price, p.updatedAt?.toISOString() || ''];
      res.write(`${row.map(csvCell).join(',')}\r\n`);
    }
    res.end();
  }

  // ---------- CSV import ----------

  static async previewImport(req, res) {
    const { csv, fileName, shop, mapping } = z
      .object({ csv: z.string().min(1, 'The file is empty'), fileName: z.string().max(200).optional(), shop: z.string().optional(), mapping: z.record(z.string(), z.string()).optional() })
      .parse(req.body);
    const target = await resolveShop(shop);
    const result = await previewImport({ csvText: csv, fileName, shopId: target._id, mapping, user: req.user });
    res.status(201).json({ success: true, data: { ...result, shop: target } });
  }

  static async commitImport(req, res) {
    assertObjectId(req.params.id, 'import id');
    const { mapping } = z.object({ mapping: z.record(z.string(), z.string()).optional() }).parse(req.body || {});
    const { batch, replayed } = await commitImport({ batchId: req.params.id, mapping, user: req.user });
    if (!replayed) await recordAudit(req, AuditAction.CREATE, 'ImportBatch', batch._id, { fileName: batch.fileName, totals: batch.totals });
    res.json({ success: true, data: batch, replayed });
  }

  static async rollbackImport(req, res) {
    assertObjectId(req.params.id, 'import id');
    const result = await rollbackImport(req.params.id);
    await recordAudit(req, AuditAction.DELETE, 'ImportBatch', req.params.id, { rollback: true, deleted: result.deleted, kept: result.kept.length });
    res.json({ success: true, data: result });
  }

  static async listImports(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
    const [rows, total] = await Promise.all([
      ImportBatch.find().select('-report').populate('createdBy', 'name').populate('shop', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ImportBatch.countDocuments()
    ]);
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  static async getImport(req, res) {
    assertObjectId(req.params.id, 'import id');
    const batch = await ImportBatch.findById(req.params.id).populate('createdBy', 'name').populate('committedBy', 'name').populate('shop', 'name').lean();
    if (!batch) throw notFound('Import not found');
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const report = outcome ? batch.report.filter((r) => r.outcome === outcome) : batch.report;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 500 });
    res.json({
      success: true,
      data: { ...batch, report: report.slice(skip, skip + limit) },
      pagination: { total: report.length, page, limit, pages: Math.ceil(report.length / limit) }
    });
  }

  static async importReportCsv(req, res) {
    assertObjectId(req.params.id, 'import id');
    const batch = await ImportBatch.findById(req.params.id).lean();
    if (!batch) throw notFound('Import not found');
    const rows = [['row', 'code', 'name', 'outcome', 'messages'], ...batch.report.map((r) => [r.row, r.code, r.name, r.outcome, (r.messages || []).join('; ')])];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import-report-${batch._id}.csv"`);
    res.send(`﻿${toCsv(rows)}`);
  }

  // ---------- Restock ----------

  static async restock(req, res) {
    const data = restockSchema.parse(req.body);
    assertObjectId(data.product, 'product id');
    const result = await runInTransaction((session) => restockProduct(session, { ...data, productId: data.product, user: req.user }));
    if (!result.replayed) {
      await recordAudit(req, AuditAction.CREATE, 'Restock', result.restock._id, {
        number: result.restock.number,
        product: data.product,
        received: data.receivedQuantity,
        free: data.freeQuantity,
        ...(result.priceChanged ? { purchaseRate: { from: result.previousPurchaseRate, to: result.restock.purchaseRate } } : {})
      });
      memoryCache.delByPrefix('catalog:');
    }
    const product = await Product.findById(data.product).select(SCAN_FIELDS).lean();
    res.status(result.replayed ? 200 : 201).json({ success: true, data: { restock: result.restock, product }, replayed: result.replayed });
  }

  static async listRestocks(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
    const search = parseSearch(req.query.search);
    const filter = { ...dateRange(req.query) };
    if (req.query.product) filter.product = assertObjectId(req.query.product, 'product id');
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ productName: rx }, { productCode: { $regex: `^\s*${escapeRegExp(search)}\s*$`, $options: 'i' } }, { barcode: search }, { supplierName: rx }, { referenceNumber: rx }, { number: rx }];
    }
    const [rows, total] = await Promise.all([
      Restock.find(filter).populate('user', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Restock.countDocuments(filter)
    ]);
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  static async suppliers(req, res) {
    const search = parseSearch(req.query.search);
    const filter = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const [suppliers, companies] = await Promise.all([
      Supplier.find(filter).select('name phone').sort({ name: 1 }).limit(15).lean(),
      // Company names already on products are offered too (most restocks come from the product's company).
      search ? Product.distinct('company', { company: { $regex: escapeRegExp(search), $options: 'i' } }) : []
    ]);
    const names = new Set(suppliers.map((s) => s.name.toLowerCase()));
    const extra = companies.filter((c) => c && !names.has(c.toLowerCase())).slice(0, 10).map((name) => ({ name, fromProducts: true }));
    res.json({ success: true, data: [...suppliers, ...extra] });
  }

  // ---------- Ledger and adjustments ----------

  static async adjust(req, res) {
    const data = adjustmentSchema.parse(req.body);
    assertObjectId(data.product, 'product id');
    const result = await runInTransaction((session) => adjustStock(session, { ...data, productId: data.product, user: req.user }));
    if (!result.replayed) {
      await recordAudit(req, AuditAction.UPDATE, 'Stock', data.product, { mode: data.mode, quantity: data.quantity, from: result.stockBefore, to: result.stockAfter, reason: data.reason });
      memoryCache.delByPrefix('catalog:');
    }
    res.status(result.replayed ? 200 : 201).json({ success: true, data: result.transaction, replayed: result.replayed });
  }

  static async transactions(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const filter = { ...dateRange(req.query) };
    if (req.query.product) filter.product = assertObjectId(req.query.product, 'product id');
    if (req.query.type) {
      const types = String(req.query.type).split(',').filter((t) => Object.values(MovementType).includes(t));
      if (types.length) filter.type = { $in: types };
    }
    const search = parseSearch(req.query.search);
    if (search) filter.$or = [{ productName: { $regex: escapeRegExp(search), $options: 'i' } }, { productCode: search }, { refNumber: search }];
    const [rows, total] = await Promise.all([
      InventoryTransaction.find(filter).populate('user', 'name').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      InventoryTransaction.countDocuments(filter)
    ]);
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  // ---------- Product images ----------

  /** Image-matching dashboard: products by image status, each with its candidates. */
  static async imageQueue(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 60 });
    const status = Object.values(ImageStatus).includes(req.query.status) ? req.query.status : ImageStatus.PENDING;
    const filter = { 'image.status': status };
    const search = parseSearch(req.query.search);
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ name: rx }, { codeKey: search.toUpperCase() }, { barcodes: search }, { manufacturer: rx }, { company: rx }];
    }
    if (req.query.searchable === 'true') filter['barcodes.0'] = { $exists: true };
    const [products, total, counts] = await Promise.all([
      Product.find(filter).select('name code barcode barcodes unit company manufacturer imageUrl image').sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      Product.aggregate([{ $group: { _id: '$image.status', count: { $sum: 1 } } }])
    ]);
    const images = await ProductImage.find({ product: { $in: products.map((p) => p._id) } }).sort({ createdAt: -1 }).lean();
    const byProduct = new Map();
    images.forEach((img) => {
      const list = byProduct.get(String(img.product)) || [];
      list.push(img);
      byProduct.set(String(img.product), list);
    });
    res.json({
      success: true,
      data: products.map((p) => ({ ...p, images: byProduct.get(String(p._id)) || [] })),
      counts: Object.fromEntries(counts.map((c) => [c._id || ImageStatus.NOT_AVAILABLE, c.count])),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  }

  static async productImages(req, res) {
    assertObjectId(req.params.id, 'product id');
    res.json({ success: true, data: await ProductImage.find({ product: req.params.id }).populate('reviewedBy', 'name').populate('uploadedBy', 'name').sort({ createdAt: -1 }).lean() });
  }

  /**
   * Searches the open product databases by barcode for up to 10 products per request and stores what is found
   * as PENDING candidates. Without productIds it takes products that have a valid barcode, no image and no search
   * in the last 30 days.
   */
  static async findCandidates(req, res) {
    const { productIds, limit } = z.object({ productIds: z.array(z.string()).max(10).optional(), limit: z.number().int().min(1).max(10).optional() }).parse(req.body || {});
    let products;
    if (productIds && productIds.length) {
      productIds.forEach((id) => assertObjectId(id, 'product id'));
      products = await Product.find({ _id: { $in: productIds } });
    } else {
      const staleBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      products = await Product.find({
        'image.status': ImageStatus.NOT_AVAILABLE,
        'barcodes.0': { $exists: true },
        $or: [{ 'image.lastSearchedAt': { $exists: false } }, { 'image.lastSearchedAt': { $lt: staleBefore } }]
      })
        .sort({ _id: 1 })
        .limit(limit || 5);
    }
    const results = [];
    for (const product of products) results.push({ name: product.name, code: product.code, ...(await imageService.findCandidatesForProduct(product)) });
    res.json({ success: true, data: results });
  }

  static async uploadImage(req, res) {
    assertObjectId(req.params.id, 'product id');
    const { dataUrl, sourceUrl, markVerified } = z
      .object({ dataUrl: z.string().min(20).max(5 * 1024 * 1024), sourceUrl: z.string().trim().url().optional().or(z.literal('')), markVerified: z.boolean().optional() })
      .parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('Product not found');
    const verify = Boolean(markVerified);
    if (verify && !hasPermission(req.user, 'images.verify')) throw forbidden('Missing permission: images.verify');
    const image = await imageService.uploadImage(product, { dataUrl, sourceUrl }, req.user, { markVerified: verify });
    await recordAudit(req, verify ? AuditAction.APPROVE : AuditAction.CREATE, 'ProductImage', image._id, { product: product._id, origin: 'UPLOAD', verified: verify });
    res.status(201).json({ success: true, data: { _id: image._id, status: image.status } });
  }

  static async addImageUrl(req, res) {
    assertObjectId(req.params.id, 'product id');
    const { imageUrl, sourceUrl } = z.object({ imageUrl: z.string().trim().url(), sourceUrl: z.string().trim().url().optional().or(z.literal('')) }).parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('Product not found');
    const image = await imageService.addUrlCandidate(product, { imageUrl, sourceUrl }, req.user);
    await recordAudit(req, AuditAction.CREATE, 'ProductImage', image._id, { product: product._id, origin: 'URL', imageUrl, sourceUrl });
    res.status(201).json({ success: true, data: image });
  }

  static async approveImage(req, res) {
    assertObjectId(req.params.imageId, 'image id');
    const image = await imageService.loadImage(req.params.imageId);
    const approved = await imageService.approveImage(image, req.user);
    await recordAudit(req, AuditAction.APPROVE, 'ProductImage', image._id, { product: image.product, origin: image.origin, sourceUrl: image.sourceUrl });
    res.json({ success: true, data: { _id: approved._id, status: approved.status } });
  }

  static async rejectImage(req, res) {
    assertObjectId(req.params.imageId, 'image id');
    const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body || {});
    const image = await imageService.loadImage(req.params.imageId);
    await imageService.rejectImage(image, req.user, reason);
    await recordAudit(req, AuditAction.REJECT, 'ProductImage', image._id, { product: image.product, reason });
    res.json({ success: true, data: { _id: image._id, status: image.status } });
  }

  /** Image bytes for staff (any review state). Remote candidates that are not cached yet redirect to the source. */
  static async imageFile(req, res) {
    assertObjectId(req.params.imageId, 'image id');
    const image = await ProductImage.findById(req.params.imageId).lean();
    if (!image) throw notFound('Image not found');
    const bytes = await imageService.readImageBytes({ _id: image._id });
    if (!bytes) {
      if (!image.remoteUrl) throw notFound('Image file not found');
      return res.json({ success: true, data: { remoteUrl: image.remoteUrl } });
    }
    res.setHeader('Content-Type', bytes.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(bytes.buffer);
  }
}

/** Public, cacheable bytes of an approved product photo. Anything not approved is a 404. */
async function servePublicImage(req, res) {
  assertObjectId(req.params.id, 'image id');
  const bytes = await imageService.readImageBytes({ _id: req.params.id, status: ReviewStatus.APPROVED });
  if (!bytes) throw notFound('Image not found');
  res.setHeader('Content-Type', bytes.contentType);
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('ETag', `"${crypto.createHash('sha1').update(String(req.params.id)).digest('hex')}"`);
  res.send(bytes.buffer);
}

module.exports = { InventoryController, servePublicImage, SCAN_FIELDS, dateRange, resolveShop };
