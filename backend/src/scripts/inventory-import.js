'use strict';

/**
 * Imports an inventory CSV (the 17-column order.csv format) from the command line, using the same preview and
 * commit logic as the admin console. Existing product codes are reported as duplicates and never overwritten.
 *
 * Usage: npm run inventory:import -- <file.csv> [--shop <shopId>] [--dry-run]
 * The import is attributed to the first active ADMIN account.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { User, UserRole } = require('../modules/auth/auth.model');
const { Shop } = require('../modules/shop/shop.model');
const { previewImport, commitImport } = require('../modules/inventory/import.service');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) throw new Error('Usage: npm run inventory:import -- <file.csv> [--shop <shopId>] [--dry-run]');
  const csvText = fs.readFileSync(path.resolve(file), 'utf8');
  await connectDB();

  const admin = await User.findOne({ role: UserRole.ADMIN, isActive: true }).sort({ createdAt: 1 });
  if (!admin) throw new Error('No active ADMIN account found (run npm run create-admin first)');
  const shopId = arg('--shop');
  const shops = shopId ? await Shop.find({ _id: shopId }) : await Shop.find().limit(2);
  if (shops.length !== 1) throw new Error(shops.length ? 'Several stores exist; pass --shop <shopId>' : 'No store found');

  const { batch, previouslyImported } = await previewImport({ csvText, fileName: path.basename(file), shopId: shops[0]._id, user: admin });
  console.log(`Preview for ${shops[0].name}: ${JSON.stringify(batch.totals)}`);
  if (previouslyImported) console.log('Note: this exact file was imported before; its codes will be reported as duplicates.');
  if (process.argv.includes('--dry-run')) {
    console.log(`Dry run only. Batch ${batch._id} left in PREVIEW.`);
  } else {
    const { batch: done } = await commitImport({ batchId: batch._id, user: admin });
    console.log(`Committed batch ${done._id}: ${JSON.stringify(done.totals)}`);
    const counts = done.report.reduce((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] || 0) + 1 }), {});
    console.log(`Report entries by outcome: ${JSON.stringify(counts)}`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
