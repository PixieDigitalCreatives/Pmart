'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, match: SLUG_REGEX, immutable: true },
    description: { type: String, trim: true, maxlength: 500 },
    imageUrl: { type: String, trim: true },
    subcategories: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

const Category = mongoose.model('Category', CategorySchema);

/** Product photo states. Only VERIFIED images are ever shown as the product's photograph. */
const ImageStatus = Object.freeze({
  VERIFIED: 'VERIFIED',
  PENDING: 'PENDING',
  NOT_AVAILABLE: 'NOT_AVAILABLE'
});

const qty = { type: Number, default: 0, min: 0 };

const ProductSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    // Optional so in-store stock can exist before it is merchandised; required to list a product online (see below).
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    // Denormalized from the category (category slugs are immutable) so storefront links don't need a join.
    categorySlug: { type: String },
    subcategory: { type: String, trim: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true, match: SLUG_REGEX },
    brand: { type: String, trim: true, maxlength: 80, default: '' },
    sku: { type: String, trim: true, maxlength: 64 },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }], default: [] },
    description: { type: String, trim: true, maxlength: 4000 },
    unit: { type: String, trim: true, maxlength: 40, default: '' },

    // ---- Inventory CSV fields (see modules/inventory/csv-fields.js for the column mapping) ----
    // Kept exactly as written: the source system treats " Z1039" and "Z1039" as different items.
    code: { type: String, maxlength: 64 },
    // Trimmed, upper-cased code used for search and scanning (not unique).
    codeKey: { type: String },
    // Primary barcode exactly as entered or imported; `barcodes` holds every code that scans to this product.
    barcode: { type: String, trim: true, maxlength: 64, default: '' },
    barcodes: { type: [{ type: String, trim: true, maxlength: 64 }], default: [] },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    manufacturer: { type: String, trim: true, maxlength: 120, default: '' },
    rackNo: { type: String, trim: true, maxlength: 40, default: '' },
    deal: qty,
    free: qty,
    purDeal: qty,
    purFree: qty,
    cost: { type: Number, default: 0, min: 0 },
    // Stock valuation. Imported as given, then recomputed as max(stock, 0) × cost by every stock movement.
    stockValue: { type: Number, default: 0 },
    purRate: { type: Number, default: 0, min: 0 },
    // Selling rate from the CSV. When set, the effective selling price is rate > 0 ? rate : mrp.
    rate: { type: Number, min: 0 },
    taxRate: { type: Number, min: 0, max: 100 },
    hsn: { type: String, trim: true, maxlength: 16 },

    // Effective selling price used by the storefront and invoices.
    price: { type: Number, required: true, min: 0, default: 0 },
    mrp: { type: Number, min: 0 },
    // Percentage off MRP, derived from price and mrp on every save.
    discount: { type: Number, min: 0, max: 100, default: 0 },
    // Changed only through inventory.service (each change writes a stock-ledger row). Decimal for loose goods;
    // may go below zero only when an authorised user explicitly allows it on an invoice.
    stockCount: { type: Number, required: true, default: 0 },
    // The verified photograph (set only when image.status is VERIFIED).
    imageUrl: { type: String, trim: true },
    image: {
      status: { type: String, enum: Object.values(ImageStatus), default: ImageStatus.NOT_AVAILABLE },
      imageId: { type: Schema.Types.ObjectId, ref: 'ProductImage' },
      source: { type: String, trim: true },
      sourceUrl: { type: String, trim: true },
      verifiedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      lastSearchedAt: { type: Date }
    },
    gallery: { type: [{ type: String, trim: true }], default: [] },
    specifications: { type: Map, of: String },
    nutrition: { type: Map, of: String },
    // Listed on the online storefront.
    isActive: { type: Boolean, default: true },
    importSource: {
      batch: { type: Schema.Types.ObjectId, ref: 'ImportBatch' },
      row: { type: Number },
      // Original text of every CSV column for this row, keyed by the CSV column name.
      raw: { type: Schema.Types.Mixed },
      importedAt: { type: Date }
    }
  },
  { timestamps: true, minimize: false, toJSON: { flattenMaps: true }, toObject: { flattenMaps: true } }
);

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

ProductSchema.pre('validate', function derivePricing() {
  if (this.rate != null) this.price = round(this.rate > 0 ? this.rate : this.mrp || 0, 2);
  if (this.mrp == null) this.mrp = this.price;
  this.discount = this.mrp > 0 && this.mrp > this.price ? Math.round(((this.mrp - this.price) / this.mrp) * 100) : 0;
  this.stockCount = round(this.stockCount || 0, 3);
  this.codeKey = this.code ? this.code.trim().toUpperCase() : undefined;
  const codes = [this.barcode, ...(this.barcodes || [])].map((b) => String(b || '').trim()).filter(Boolean);
  this.barcodes = [...new Set(codes)];
  if (this.isActive && !this.category) {
    this.invalidate('category', 'Choose a category before listing the product online');
  }
});

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ shop: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
ProductSchema.index({ shop: 1, code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
ProductSchema.index({ codeKey: 1 });
ProductSchema.index({ barcodes: 1 });
ProductSchema.index({ shop: 1, stockCount: 1 });
ProductSchema.index({ 'image.status': 1, name: 1 });
ProductSchema.index({ 'importSource.batch': 1 });
ProductSchema.index({ category: 1, isActive: 1, createdAt: -1 });
ProductSchema.index({ categorySlug: 1, isActive: 1, createdAt: -1 });
ProductSchema.index({ categorySlug: 1, subcategory: 1, isActive: 1, createdAt: -1 });
ProductSchema.index({ tags: 1, isActive: 1 });
ProductSchema.index({ shop: 1, isActive: 1, stockCount: 1 });
ProductSchema.index({ isActive: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, price: 1 });
ProductSchema.index({ isActive: 1, price: -1 });
ProductSchema.index({ isActive: 1, discount: -1 });
ProductSchema.index(
  { name: 'text', brand: 'text', tags: 'text' },
  { weights: { name: 10, brand: 5, tags: 2 }, name: 'ProductTextIndex', background: true }
);

const Product = mongoose.model('Product', ProductSchema);

module.exports = { Category, Product, ImageStatus, slugify, SLUG_REGEX };
