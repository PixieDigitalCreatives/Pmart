'use strict';

/**
 * Looks up products in Open Food Facts / Open Beauty Facts / Open Products Facts by exact barcode and stores any
 * photo found as a PENDING candidate for review in the admin console. Nothing is marked verified.
 * Throttled to stay within those services' request limits (~1 request per 0.7 s per service).
 *
 * Usage: npm run images:find-candidates -- [--limit 500]
 * Re-running skips products searched in the last 30 days.
 */
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Product, ImageStatus } = require('../modules/catalog/catalog.model');
const { findCandidatesForProduct } = require('../modules/images/image.service');
const { isValidGtin } = require('../utils/barcode');

async function main() {
  const i = process.argv.indexOf('--limit');
  const limit = i > -1 ? Number(process.argv[i + 1]) : 0;
  await connectDB();
  const staleBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filter = {
    'image.status': ImageStatus.NOT_AVAILABLE,
    'barcodes.0': { $exists: true },
    $or: [{ 'image.lastSearchedAt': { $exists: false } }, { 'image.lastSearchedAt': { $lt: staleBefore } }]
  };
  const candidates = (await Product.find(filter).select('_id barcodes shop name code').sort({ _id: 1 }).lean()).filter((p) => p.barcodes.some(isValidGtin));
  const todo = limit > 0 ? candidates.slice(0, limit) : candidates;
  console.log(`${todo.length} products with a valid barcode to search (${candidates.length} eligible).`);

  const totals = { searched: 0, withImage: 0, candidates: 0, errors: 0 };
  const errorKinds = {};
  for (const p of todo) {
    let r;
    try {
      r = await findCandidatesForProduct(p);
    } catch (err) {
      // A dropped database connection or similar: count it and carry on; the product is retried next run.
      r = { found: 0, created: 0, errors: [err.message] };
    }
    totals.searched += 1;
    if (r.found) totals.withImage += 1;
    totals.candidates += r.created;
    if (r.errors.length) {
      totals.errors += 1;
      r.errors.forEach((e) => {
        const kind = e.replace(/\d{3,}/g, '#').slice(0, 80);
        errorKinds[kind] = (errorKinds[kind] || 0) + 1;
      });
    }
    if (totals.searched % 50 === 0) console.log(`${totals.searched}/${todo.length} ${JSON.stringify(totals)}`);
  }
  if (Object.keys(errorKinds).length) console.log(`Errors (products are retried next run): ${JSON.stringify(errorKinds)}`);
  console.log(`Done: ${JSON.stringify(totals)}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
