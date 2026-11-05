'use strict';

const { Product } = require('../catalog/catalog.model');
const { InventoryTransaction, Restock, Supplier, MovementType, RefType, nextSequence, supplierKey } = require('./inventory.model');
const { conflict, notFound, badRequest } = require('../../utils/http-error');

const round3 = (n) => Math.round(n * 1000) / 1000;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * The only code path that changes a product's stock. Applies `delta` atomically, recomputes the stock value
 * (max(stock, 0) × cost) and writes one ledger row, all inside the caller's transaction.
 *
 * Returns { product, stockBefore, stockAfter }, or null when the product does not match `filter` or the change
 * would take stock below zero without `allowNegative`. A repeated `dedupeKey` throws (unique index), which
 * aborts the transaction, so the same movement can never be applied twice.
 */
async function applyStockChange(session, { productId, delta, type, refType, refId, refNumber, reason, user, dedupeKey, freeQuantity, unitCost, allowNegative = false, filter = {} }) {
  const change = round3(delta);
  const match = { _id: productId, ...filter };
  if (change < 0 && !allowNegative) match.stockCount = { $gte: -change };

  const product = await Product.findOneAndUpdate(
    match,
    [
      { $set: { stockCount: { $round: [{ $add: ['$stockCount', change] }, 3] } } },
      { $set: { stockValue: { $round: [{ $multiply: [{ $max: ['$stockCount', 0] }, { $ifNull: ['$cost', 0] }] }, 2] } } }
    ],
    { new: true, session, updatePipeline: true }
  );
  if (!product) return null;

  const stockAfter = product.stockCount;
  const stockBefore = round3(stockAfter - change);
  await InventoryTransaction.create(
    [
      {
        shop: product.shop,
        product: product._id,
        productName: product.name,
        productCode: product.code,
        type,
        quantity: change,
        freeQuantity: freeQuantity || 0,
        stockBefore,
        stockAfter,
        unitCost,
        refType,
        refId,
        refNumber,
        reason,
        user: user ? user._id : undefined,
        dedupeKey
      }
    ],
    { session }
  );
  return { product, stockBefore, stockAfter };
}

/** Finds or creates the supplier named `name` for a shop. Returns null for an empty name. */
async function upsertSupplier(shopId, name, session) {
  const nameKey = supplierKey(name);
  if (!nameKey) return null;
  return Supplier.findOneAndUpdate(
    { shop: shopId, nameKey },
    { $setOnInsert: { shop: shopId, nameKey, name: String(name).trim().replace(/\s+/g, ' ') } },
    { upsert: true, new: true, session }
  );
}

/**
 * Receives stock: new stock = previous + received + free. Optionally updates the product's purchase rate.
 * Idempotent on `idempotencyKey`: a repeat returns the existing restock with `replayed: true`.
 */
async function restockProduct(session, { productId, receivedQuantity, freeQuantity = 0, purchaseRate, supplierName, referenceNumber, note, user, idempotencyKey }) {
  const existing = await Restock.findOne({ idempotencyKey }).session(session);
  if (existing) return { restock: existing, replayed: true };

  const product = await Product.findById(productId).session(session);
  if (!product) throw notFound('Product not found');
  const added = round3(receivedQuantity + freeQuantity);
  if (added <= 0) throw badRequest('Enter a received or free quantity above zero', 'INVALID_QUANTITY');

  const supplier = await upsertSupplier(product.shop, supplierName, session);
  const seq = await nextSequence(`restock:${product.shop}`, session);
  const number = `RST-${String(seq).padStart(6, '0')}`;
  const previousPurchaseRate = product.purRate || 0;
  const rate = purchaseRate == null ? previousPurchaseRate : round2(purchaseRate);

  const [restock] = await Restock.create(
    [
      {
        shop: product.shop,
        number,
        product: product._id,
        productName: product.name,
        productCode: product.code,
        barcode: product.barcode,
        unit: product.unit,
        receivedQuantity: round3(receivedQuantity),
        freeQuantity: round3(freeQuantity),
        purchaseRate: rate,
        previousPurchaseRate,
        amount: round2(receivedQuantity * rate),
        supplier: supplier ? supplier._id : undefined,
        supplierName: supplier ? supplier.name : undefined,
        referenceNumber: referenceNumber || undefined,
        stockBefore: product.stockCount,
        stockAfter: product.stockCount,
        note: note || undefined,
        user: user._id,
        idempotencyKey
      }
    ],
    { session }
  );

  const moved = await applyStockChange(session, {
    productId: product._id,
    delta: added,
    freeQuantity: round3(freeQuantity),
    unitCost: rate,
    type: MovementType.RESTOCK,
    refType: RefType.RESTOCK,
    refId: restock._id,
    refNumber: number,
    reason: referenceNumber ? `Ref ${referenceNumber}` : undefined,
    user,
    dedupeKey: `RST:${restock._id}`
  });

  restock.stockBefore = moved.stockBefore;
  restock.stockAfter = moved.stockAfter;
  await restock.save({ session });

  if (rate !== previousPurchaseRate) {
    await Product.updateOne({ _id: product._id }, { $set: { purRate: rate } }, { session });
  }
  return { restock, replayed: false, priceChanged: rate !== previousPurchaseRate, previousPurchaseRate };
}

/**
 * Manual stock correction. `mode` SET makes stock equal `quantity`; DELTA adds `quantity` (may be negative).
 * Idempotent on `idempotencyKey` through the ledger's dedupe key.
 */
async function adjustStock(session, { productId, mode, quantity, reason, user, idempotencyKey }) {
  const dedupeKey = `ADJ:${idempotencyKey}`;
  const prior = await InventoryTransaction.findOne({ dedupeKey }).session(session);
  if (prior) return { transaction: prior, replayed: true };

  const product = await Product.findById(productId).session(session);
  if (!product) throw notFound('Product not found');
  const delta = mode === 'SET' ? round3(quantity - product.stockCount) : round3(quantity);
  if (delta === 0) throw badRequest('Stock is already at that level', 'NO_CHANGE');

  const moved = await applyStockChange(session, {
    productId: product._id,
    delta,
    type: MovementType.ADJUSTMENT,
    refType: RefType.ADJUSTMENT,
    reason,
    user,
    dedupeKey,
    allowNegative: true,
    unitCost: product.cost
  });
  if (!moved) throw conflict('Stock changed while saving; try again', 'STOCK_CHANGED');
  const transaction = await InventoryTransaction.findOne({ dedupeKey }).session(session);
  return { transaction, replayed: false, ...moved };
}

module.exports = { applyStockChange, restockProduct, adjustStock, upsertSupplier, round2, round3 };
