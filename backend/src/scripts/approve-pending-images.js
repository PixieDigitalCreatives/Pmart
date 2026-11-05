'use strict';

/**
 * Approves every PENDING product photo candidate in one go, as if the given administrator had pressed Approve on
 * each one in Product images. Use it only when the owner has decided to accept the barcode matches without
 * reviewing them one by one; any wrong photo can still be rejected or replaced in the admin console afterwards.
 *
 * - One photo per product: a product that already has a verified photo is skipped, and when a product has several
 *   candidates only the first (Open Food Facts, then Beauty, then Products, oldest first) is approved.
 * - Each approval downloads and stores the image (paced to about two downloads a second) and writes an audit entry.
 * - A failed download leaves the candidate pending, so re-running picks it up again. After three network failures
 *   in a row on one image server, the rest of that server's candidates are skipped for this run.
 *
 * Usage: npm run images:approve-pending -- --by 98XXXXXXXX [--limit 100] [--dry-run]
 */
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { User, UserRole } = require('../modules/auth/auth.model');
const { Product, ImageStatus } = require('../modules/catalog/catalog.model');
const { ProductImage, ReviewStatus, ImageOrigin } = require('../modules/images/image.model');
const { approveImage } = require('../modules/images/image.service');
const { recordAudit, AuditAction } = require('../modules/admin/audit.model');
const { normalizeMobileNumber } = require('../utils/auth');

const PACE_MS = 500;
const ORIGIN_ORDER = [ImageOrigin.OPEN_FOOD_FACTS, ImageOrigin.OPEN_BEAUTY_FACTS, ImageOrigin.OPEN_PRODUCTS_FACTS];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const phone = normalizeMobileNumber(arg('by'));
  const limit = Number(arg('limit')) || 0;
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  const user = await User.findOne({ phone, isActive: true });
  if (!user || (user.role !== UserRole.ADMIN && !(user.permissions || []).includes('images.verify'))) {
    throw new Error('Usage: npm run images:approve-pending -- --by <phone of an active admin> [--limit N] [--dry-run]');
  }

  const pending = await ProductImage.find({ status: ReviewStatus.PENDING }).select('product origin sourceUrl remoteUrl status createdAt').sort({ createdAt: 1 }).lean();
  const rank = (img) => {
    const i = ORIGIN_ORDER.indexOf(img.origin);
    return i === -1 ? ORIGIN_ORDER.length : i;
  };
  const byProduct = new Map();
  for (const img of pending) {
    const best = byProduct.get(String(img.product));
    if (!best || rank(img) < rank(best)) byProduct.set(String(img.product), img);
  }
  const verified = new Set(
    (await Product.find({ _id: { $in: [...byProduct.keys()] }, 'image.status': ImageStatus.VERIFIED }).select('_id').lean()).map((p) => String(p._id))
  );
  const todo = [...byProduct.values()].filter((img) => !verified.has(String(img.product)));
  const run = limit > 0 ? todo.slice(0, limit) : todo;
  console.log(
    `${pending.length} pending candidates on ${byProduct.size} products; ${verified.size} products already have a verified photo (skipped); ` +
      `${pending.length - byProduct.size} extra candidates left for review; approving ${run.length}${dryRun ? ' (dry run)' : ''} as ${user.name}.`
  );
  if (dryRun) return mongoose.disconnect();

  const req = { user, ip: 'cli:images:approve-pending' };
  const totals = { approved: 0, failed: 0, skipped: 0 };
  const errorKinds = {};
  const networkFailures = new Map();
  const hostOf = (url) => {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  };
  for (const img of run) {
    const host = hostOf(img.remoteUrl);
    if ((networkFailures.get(host) || 0) >= 3) {
      totals.skipped += 1;
      continue;
    }
    const started = Date.now();
    try {
      await approveImage(img, user);
      await recordAudit(req, AuditAction.APPROVE, 'ProductImage', img._id, { product: img.product, origin: img.origin, sourceUrl: img.sourceUrl, bulk: true });
      totals.approved += 1;
      networkFailures.set(host, 0);
    } catch (err) {
      totals.failed += 1;
      // fetch() rejects with a TypeError (or TimeoutError) when the server cannot be reached at all.
      const network = err.name === 'TypeError' || err.name === 'TimeoutError';
      if (network) networkFailures.set(host, (networkFailures.get(host) || 0) + 1);
      const kind = `${network ? `${host}: ` : ''}${err.message} ${err.cause?.code || ''}`.replace(/\d{3,}/g, '#').trim().slice(0, 100);
      errorKinds[kind] = (errorKinds[kind] || 0) + 1;
    }
    const done = totals.approved + totals.failed;
    if (done % 50 === 0) console.log(`${done}/${run.length} ${JSON.stringify(totals)}`);
    const wait = PACE_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  const downHosts = [...networkFailures].filter(([, n]) => n >= 3).map(([h]) => h);
  if (downHosts.length) console.log(`Unreachable, skipped for this run: ${downHosts.join(', ')}`);
  if (Object.keys(errorKinds).length) console.log(`Failures (left pending, retried next run): ${JSON.stringify(errorKinds)}`);
  console.log(`Done: ${JSON.stringify(totals)}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
