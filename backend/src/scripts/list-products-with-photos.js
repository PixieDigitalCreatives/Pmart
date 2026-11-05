'use strict';

/**
 * Lists online (isActive = true) every product that has a verified photo and a price above zero, as if the given
 * administrator had used "Make visible" on each one in the admin console. Products already listed, without a
 * verified photo, or priced at 0 are left alone. Each listed product gets an audit entry marked `bulk: true`.
 *
 * Listed products appear in storefront search, offers and "New in store"; category pages show them only once they
 * have a category. Undo for a product (or many) with "Hide" in Admin → Products.
 *
 * --exclude <csv> skips products whose photo still needs checking: a CSV with a `product_code` column, such as the
 * flagged-photo list `backups/photos-to-check-2026-11-05.csv`. Codes are matched like scanning (trimmed, upper-case).
 *
 * Usage: node src/scripts/list-products-with-photos.js --by <admin user id or phone> [--exclude <csv>] [--dry-run]
 */
const fs = require('fs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { User, UserRole } = require('../modules/auth/auth.model');
const { Product, ImageStatus } = require('../modules/catalog/catalog.model');
const { AuditLog, AuditAction } = require('../modules/admin/audit.model');
const { normalizeMobileNumber } = require('../utils/auth');
const { parseCsv } = require('../utils/csv');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const by = arg('by') || '';
  const dryRun = process.argv.includes('--dry-run');
  let excludeKeys = [];
  if (arg('exclude')) {
    const [header, ...rows] = parseCsv(fs.readFileSync(arg('exclude'), 'utf8'));
    const col = header.indexOf('product_code');
    if (col === -1) throw new Error('The --exclude file needs a product_code column');
    excludeKeys = [...new Set(rows.map((r) => String(r[col] || '').trim().toUpperCase()).filter(Boolean))];
  }
  await connectDB();

  const who = /^[0-9a-fA-F]{24}$/.test(by) ? { _id: by } : { phone: normalizeMobileNumber(by) };
  const user = await User.findOne({ ...who, role: UserRole.ADMIN, isActive: true });
  if (!user) throw new Error('Usage: node src/scripts/list-products-with-photos.js --by <id or phone of an active admin> [--dry-run]');

  const filter = {
    'image.status': ImageStatus.VERIFIED,
    imageUrl: { $exists: true, $nin: [null, ''] },
    price: { $gt: 0 },
    isActive: { $ne: true }
  };
  const skippedZeroPrice = await Product.countDocuments({ ...filter, price: { $lte: 0 } });
  const skippedFlagged = excludeKeys.length ? await Product.countDocuments({ ...filter, codeKey: { $in: excludeKeys } }) : 0;
  if (excludeKeys.length) filter.codeKey = { $nin: excludeKeys };
  const products = await Product.find(filter).select('_id').lean();
  console.log(
    `${products.length} products with a verified photo and a price will be listed; skipped: ${skippedZeroPrice} priced at 0, ` +
      `${skippedFlagged} in the exclude file (${excludeKeys.length} codes).${dryRun ? ' (dry run)' : ''}`
  );
  if (dryRun || products.length === 0) return mongoose.disconnect();

  const ids = products.map((p) => p._id);
  const result = await Product.updateMany({ _id: { $in: ids }, isActive: { $ne: true } }, { $set: { isActive: true } });
  await AuditLog.insertMany(
    ids.map((id) => ({
      user: user._id,
      action: AuditAction.UPDATE,
      resource: 'Product',
      resourceId: String(id),
      details: { isActive: true, bulk: true, reason: 'Listed online: has a verified photo' },
      ipAddress: 'cli:list-products-with-photos'
    }))
  );
  console.log(`Listed ${result.modifiedCount} products online as ${user.name}. Restart the API (or wait for its catalog cache to expire) to see them.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
