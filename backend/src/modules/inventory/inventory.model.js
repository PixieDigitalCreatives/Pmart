'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/** Kinds of stock movement. Positive quantities add stock, negative ones remove it. */
const MovementType = Object.freeze({
  OPENING: 'OPENING',
  RESTOCK: 'RESTOCK',
  SALE: 'SALE',
  SALE_REVERSAL: 'SALE_REVERSAL',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  ONLINE_ORDER: 'ONLINE_ORDER',
  ONLINE_ORDER_REVERSAL: 'ONLINE_ORDER_REVERSAL'
});

const RefType = Object.freeze({
  IMPORT: 'IMPORT',
  PRODUCT: 'PRODUCT',
  RESTOCK: 'RESTOCK',
  INVOICE: 'INVOICE',
  ORDER: 'ORDER',
  ADJUSTMENT: 'ADJUSTMENT'
});

const stringOnly = (field) => ({ partialFilterExpression: { [field]: { $type: 'string' } } });

// ---------- Stock ledger ----------

const InventoryTransactionSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String },
    productCode: { type: String },
    type: { type: String, enum: Object.values(MovementType), required: true },
    // Signed change applied to stockCount (received + free for restocks).
    quantity: { type: Number, required: true },
    freeQuantity: { type: Number, default: 0 },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    unitCost: { type: Number },
    refType: { type: String, enum: Object.values(RefType), required: true },
    refId: { type: Schema.Types.ObjectId },
    refNumber: { type: String },
    reason: { type: String, trim: true, maxlength: 300 },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    // Unique per logical movement (e.g. "INV:<id>:L1:SALE"), so a retried request can never move stock twice.
    dedupeKey: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryTransactionSchema.index({ dedupeKey: 1 }, { unique: true, ...stringOnly('dedupeKey') });
InventoryTransactionSchema.index({ product: 1, createdAt: -1 });
InventoryTransactionSchema.index({ shop: 1, type: 1, createdAt: -1 });
InventoryTransactionSchema.index({ shop: 1, createdAt: -1 });
InventoryTransactionSchema.index({ refType: 1, refId: 1 });

const InventoryTransaction = mongoose.model('InventoryTransaction', InventoryTransactionSchema);

// ---------- Suppliers ----------

const SupplierSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Lower-cased, single-spaced name used to match "ABC Traders" and "abc  traders" as one supplier.
    nameKey: { type: String, required: true },
    phone: { type: String, trim: true, maxlength: 20 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15 },
    notes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

SupplierSchema.index({ shop: 1, nameKey: 1 }, { unique: true });

const Supplier = mongoose.model('Supplier', SupplierSchema);

const supplierKey = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

// ---------- Restocks ----------

const RestockSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    number: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productCode: { type: String },
    barcode: { type: String },
    unit: { type: String },
    receivedQuantity: { type: Number, required: true, min: 0 },
    freeQuantity: { type: Number, default: 0, min: 0 },
    purchaseRate: { type: Number, min: 0 },
    previousPurchaseRate: { type: Number, min: 0 },
    // Purchase amount = receivedQuantity × purchaseRate (free goods are not charged).
    amount: { type: Number, default: 0 },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String, trim: true, maxlength: 120 },
    referenceNumber: { type: String, trim: true, maxlength: 60 },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RestockSchema.index({ idempotencyKey: 1 }, { unique: true });
RestockSchema.index({ shop: 1, number: 1 }, { unique: true });
RestockSchema.index({ shop: 1, createdAt: -1 });
RestockSchema.index({ product: 1, createdAt: -1 });
RestockSchema.index({ supplier: 1, createdAt: -1 });

const Restock = mongoose.model('Restock', RestockSchema);

// ---------- CSV import batches ----------

const ImportStatus = Object.freeze({
  PREVIEW: 'PREVIEW',
  COMMITTING: 'COMMITTING',
  COMMITTED: 'COMMITTED',
  FAILED: 'FAILED',
  ROLLED_BACK: 'ROLLED_BACK'
});
const RowOutcome = Object.freeze({ CREATED: 'CREATED', DUPLICATE: 'DUPLICATE', FAILED: 'FAILED', SKIPPED: 'SKIPPED' });

const ImportBatchSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    fileName: { type: String, trim: true, maxlength: 200 },
    fileHash: { type: String, required: true },
    fileSize: { type: Number },
    status: { type: String, enum: Object.values(ImportStatus), default: ImportStatus.PREVIEW },
    headers: { type: [String], default: [] },
    mapping: { type: Schema.Types.Mixed, default: {} },
    csvText: { type: String, select: false },
    totals: {
      rows: { type: Number, default: 0 },
      created: { type: Number, default: 0 },
      duplicate: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 }
    },
    // One entry per row that was not a clean create (duplicates, failures, skips, warnings).
    report: {
      type: [
        {
          _id: false,
          row: Number,
          code: String,
          name: String,
          outcome: { type: String, enum: Object.values(RowOutcome) },
          messages: [String]
        }
      ],
      default: []
    },
    error: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    committedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    committedAt: { type: Date }
  },
  { timestamps: true }
);

ImportBatchSchema.index({ shop: 1, createdAt: -1 });
ImportBatchSchema.index({ fileHash: 1 });

const ImportBatch = mongoose.model('ImportBatch', ImportBatchSchema);

// ---------- Gap-free counters (invoice and restock numbers) ----------

const CounterSchema = new Schema({ _id: { type: String }, seq: { type: Number, default: 0 } }, { versionKey: false });
const Counter = mongoose.model('Counter', CounterSchema);

/** Atomically returns the next number for `key`; inside a transaction the increment rolls back with it. */
async function nextSequence(key, session) {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return doc.seq;
}

module.exports = {
  InventoryTransaction,
  Supplier,
  Restock,
  ImportBatch,
  Counter,
  MovementType,
  RefType,
  ImportStatus,
  RowOutcome,
  nextSequence,
  supplierKey
};
