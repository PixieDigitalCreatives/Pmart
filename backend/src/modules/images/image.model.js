'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/** Review state of one candidate or uploaded photo. APPROVED is the only state shown as the product's photo. */
const ReviewStatus = Object.freeze({ PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' });

const ImageOrigin = Object.freeze({
  UPLOAD: 'UPLOAD',
  URL: 'URL',
  OPEN_FOOD_FACTS: 'OPEN_FOOD_FACTS',
  OPEN_BEAUTY_FACTS: 'OPEN_BEAUTY_FACTS',
  OPEN_PRODUCTS_FACTS: 'OPEN_PRODUCTS_FACTS'
});

const ProductImageSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    status: { type: String, enum: Object.values(ReviewStatus), default: ReviewStatus.PENDING },
    origin: { type: String, enum: Object.values(ImageOrigin), required: true },
    // How the candidate was tied to the product. Database candidates are only ever matched on the exact barcode.
    matchedBy: { type: String, enum: ['BARCODE', 'MANUAL'], required: true },
    matchedBarcode: { type: String },
    // Image file at the source (remote candidates) and the page that identifies the product.
    remoteUrl: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    // What the source says the product is, shown next to our record so the reviewer can compare.
    sourceProductName: { type: String, trim: true, maxlength: 300 },
    sourceBrand: { type: String, trim: true, maxlength: 200 },
    sourceQuantity: { type: String, trim: true, maxlength: 100 },
    license: { type: String, trim: true, maxlength: 200 },
    attribution: { type: String, trim: true, maxlength: 300 },
    // Cached bytes (uploads, and remote images once approved). Excluded from queries unless asked for.
    data: { type: Buffer, select: false },
    contentType: { type: String },
    bytes: { type: Number },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectReason: { type: String, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

ProductImageSchema.index({ product: 1, status: 1, createdAt: -1 });
ProductImageSchema.index({ status: 1, createdAt: -1 });
ProductImageSchema.index({ product: 1, remoteUrl: 1 });

const ProductImage = mongoose.model('ProductImage', ProductImageSchema);

module.exports = { ProductImage, ReviewStatus, ImageOrigin };
