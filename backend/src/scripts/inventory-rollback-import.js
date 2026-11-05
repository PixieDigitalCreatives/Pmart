'use strict';

/**
 * Undoes a committed CSV import: deletes the products that batch created, except products that have been
 * restocked, sold, adjusted or invoiced since (those are listed and kept).
 *
 * Usage: npm run inventory:rollback-import -- <importBatchId>
 */
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { rollbackImport } = require('../modules/inventory/import.service');

async function main() {
  const batchId = process.argv[2];
  if (!batchId || !mongoose.isValidObjectId(batchId)) throw new Error('Usage: npm run inventory:rollback-import -- <importBatchId>');
  await connectDB();
  const { deleted, kept } = await rollbackImport(batchId);
  console.log(`Deleted ${deleted} products. Kept ${kept.length}.`);
  kept.slice(0, 50).forEach((k) => console.log(`  kept ${k.code}: ${k.reason}`));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
