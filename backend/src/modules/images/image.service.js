'use strict';

const { Product, ImageStatus } = require('../catalog/catalog.model');
const { ProductImage, ReviewStatus, ImageOrigin } = require('./image.model');
const { lookupBarcode, downloadImage, sniffImageType, assertPublicHttpsUrl, MAX_IMAGE_BYTES } = require('./image-sources');
const { isValidGtin } = require('../../utils/barcode');
const { badRequest, conflict, notFound } = require('../../utils/http-error');
const { memoryCache } = require('../../utils/cache');

/** Public URL of an approved image (served by GET /api/product-images/:id). */
const publicImageUrl = (imageId) => `/api/product-images/${imageId}`;

/**
 * Re-derives a product's image status from its images: VERIFIED when an approved image is set, otherwise
 * PENDING when a candidate awaits review, otherwise NOT_AVAILABLE. Never promotes a pending image.
 */
async function refreshImageStatus(productId) {
  const product = await Product.findById(productId).select('image imageUrl');
  if (!product) return null;
  const approved = product.image?.imageId ? await ProductImage.exists({ _id: product.image.imageId, status: ReviewStatus.APPROVED }) : null;
  if (approved) return product;

  const pending = await ProductImage.exists({ product: productId, status: ReviewStatus.PENDING });
  await Product.updateOne(
    { _id: productId },
    {
      $set: { 'image.status': pending ? ImageStatus.PENDING : ImageStatus.NOT_AVAILABLE },
      $unset: { imageUrl: '', 'image.imageId': '', 'image.source': '', 'image.sourceUrl': '', 'image.verifiedAt': '', 'image.verifiedBy': '' }
    }
  );
  memoryCache.delByPrefix('catalog:');
  return Product.findById(productId);
}

/**
 * Looks up each valid barcode of the product in the open product databases and stores any image found as a
 * PENDING candidate. Already-known image URLs are not duplicated.
 * Returns { searched, found, created, errors }.
 */
async function findCandidatesForProduct(product) {
  const barcodes = (product.barcodes || []).filter(isValidGtin);
  const out = { productId: String(product._id), searched: barcodes.length, found: 0, created: 0, errors: [] };
  for (const barcode of barcodes) {
    const { results, errors } = await lookupBarcode(barcode);
    out.errors.push(...errors);
    for (const r of results.filter((x) => x.imageUrl)) {
      out.found += 1;
      if (await ProductImage.exists({ product: product._id, remoteUrl: r.imageUrl })) continue;
      await ProductImage.create({
        product: product._id,
        shop: product.shop,
        origin: r.origin,
        matchedBy: 'BARCODE',
        matchedBarcode: barcode,
        remoteUrl: r.imageUrl,
        sourceUrl: r.sourceUrl,
        sourceProductName: r.name.slice(0, 300),
        sourceBrand: r.brand.slice(0, 200),
        sourceQuantity: r.quantity.slice(0, 100),
        license: r.license,
        attribution: r.attribution
      });
      out.created += 1;
    }
    if (out.found > 0) break;
  }
  // Only a complete search counts; if any source failed the product is tried again next time.
  if (out.found > 0 || out.errors.length === 0) await Product.updateOne({ _id: product._id }, { $set: { 'image.lastSearchedAt': new Date() } });
  if (out.created > 0) await refreshImageStatus(product._id);
  return out;
}

/** Parses a `data:image/...;base64,` URL into a verified image buffer. */
function decodeDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!match) throw badRequest('Upload a JPEG, PNG or WebP image', 'NOT_AN_IMAGE');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('The image is larger than 3 MB', 'IMAGE_TOO_LARGE');
  const contentType = sniffImageType(buffer);
  if (!contentType) throw badRequest('The file is not a valid JPEG, PNG or WebP image', 'NOT_AN_IMAGE');
  return { buffer, contentType };
}

/** Bytes of a stored image as a Buffer (lean reads return BSON Binary). */
function toBuffer(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data.buffer) return Buffer.from(data.buffer);
  return null;
}

/** Reads an image's cached bytes. Returns { buffer, contentType } or null when nothing is cached yet. */
async function readImageBytes(filter) {
  const doc = await ProductImage.findOne(filter).select('+data').lean();
  const buffer = doc ? toBuffer(doc.data) : null;
  return buffer && buffer.length ? { buffer, contentType: doc.contentType } : null;
}

/** Marks `image` approved and makes it the product's verified photo; any previously approved photo is retired. */
async function approveImage(image, user) {
  if (image.status === ReviewStatus.REJECTED) throw conflict('A rejected image cannot be approved; add it again as a new candidate', 'IMAGE_REJECTED');
  const set = { status: ReviewStatus.APPROVED, reviewedBy: user._id, reviewedAt: new Date() };
  if (!(await readImageBytes({ _id: image._id }))) {
    const { buffer, contentType } = await downloadImage(image.remoteUrl);
    Object.assign(set, { data: buffer, contentType, bytes: buffer.length });
  }
  await ProductImage.updateOne({ _id: image._id }, { $set: set });

  await ProductImage.updateMany(
    { product: image.product, status: ReviewStatus.APPROVED, _id: { $ne: image._id } },
    { $set: { status: ReviewStatus.REJECTED, rejectReason: 'Replaced by a newer verified photo', reviewedBy: user._id, reviewedAt: new Date() } }
  );
  await Product.updateOne(
    { _id: image.product },
    {
      $set: {
        imageUrl: publicImageUrl(image._id),
        'image.status': ImageStatus.VERIFIED,
        'image.imageId': image._id,
        'image.source': image.origin,
        'image.sourceUrl': image.sourceUrl || undefined,
        'image.verifiedAt': new Date(),
        'image.verifiedBy': user._id
      }
    }
  );
  memoryCache.delByPrefix('catalog:');
  return ProductImage.findById(image._id);
}

async function rejectImage(image, user, reason) {
  image.status = ReviewStatus.REJECTED;
  image.reviewedBy = user._id;
  image.reviewedAt = new Date();
  image.rejectReason = reason || 'Not the exact product';
  await image.save();
  await refreshImageStatus(image.product);
  return image;
}

/** Stores an uploaded photo. It becomes the verified photo only when `markVerified` and the uploader may verify. */
async function uploadImage(product, { dataUrl, sourceUrl }, user, { markVerified }) {
  const { buffer, contentType } = decodeDataUrl(dataUrl);
  const image = await ProductImage.create({
    product: product._id,
    shop: product.shop,
    origin: ImageOrigin.UPLOAD,
    matchedBy: 'MANUAL',
    sourceUrl: sourceUrl || undefined,
    data: buffer,
    contentType,
    bytes: buffer.length,
    uploadedBy: user._id,
    attribution: 'Photo uploaded by store staff'
  });
  if (markVerified) return approveImage(image, user);
  await refreshImageStatus(product._id);
  return image;
}

/** Adds an image URL from a manufacturer/distributor page as a PENDING candidate. */
async function addUrlCandidate(product, { imageUrl, sourceUrl }, user) {
  await assertPublicHttpsUrl(imageUrl);
  if (sourceUrl) await assertPublicHttpsUrl(sourceUrl);
  if (await ProductImage.exists({ product: product._id, remoteUrl: imageUrl, status: { $ne: ReviewStatus.REJECTED } })) {
    throw conflict('This image URL is already a candidate for the product', 'DUPLICATE_CANDIDATE');
  }
  const image = await ProductImage.create({
    product: product._id,
    shop: product.shop,
    origin: ImageOrigin.URL,
    matchedBy: 'MANUAL',
    remoteUrl: imageUrl,
    sourceUrl: sourceUrl || undefined,
    uploadedBy: user._id
  });
  await refreshImageStatus(product._id);
  return image;
}

async function loadImage(id) {
  const image = await ProductImage.findById(id);
  if (!image) throw notFound('Image not found');
  return image;
}

module.exports = {
  findCandidatesForProduct,
  approveImage,
  rejectImage,
  uploadImage,
  addUrlCandidate,
  refreshImageStatus,
  loadImage,
  publicImageUrl,
  readImageBytes
};
