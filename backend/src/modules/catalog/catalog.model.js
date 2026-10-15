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

const ProductSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    // Denormalized from the category (category slugs are immutable) so storefront links don't need a join.
    categorySlug: { type: String, required: true },
    subcategory: { type: String, trim: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true, match: SLUG_REGEX },
    brand: { type: String, trim: true, maxlength: 80, default: '' },
    sku: { type: String, trim: true, maxlength: 64 },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }], default: [] },
    description: { type: String, trim: true, maxlength: 4000 },
    unit: { type: String, required: true, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    // Percentage off MRP, derived from price and mrp on every save.
    discount: { type: Number, min: 0, max: 100, default: 0 },
    stockCount: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    imageUrl: { type: String, trim: true },
    gallery: { type: [{ type: String, trim: true }], default: [] },
    specifications: { type: Map, of: String },
    nutrition: { type: Map, of: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { flattenMaps: true }, toObject: { flattenMaps: true } }
);

ProductSchema.pre('validate', function deriveDiscount() {
  if (this.mrp == null || this.mrp < this.price) this.mrp = this.price;
  this.discount = this.mrp > 0 ? Math.round(((this.mrp - this.price) / this.mrp) * 100) : 0;
});

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ shop: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
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

module.exports = { Category, Product, slugify, SLUG_REGEX };
