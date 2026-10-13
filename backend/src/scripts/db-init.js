'use strict';

/**
 * Creates every collection with its indexes and the platform settings document.
 * Safe to run repeatedly: existing data is untouched; indexes are reconciled with the models
 * (indexes that are no longer declared in code are dropped).
 *
 * Usage: npm run db:init
 */
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const models = require('../models');
const { Settings } = require('../modules/admin/settings.model');

async function main() {
  await connectDB();
  for (const model of models) {
    await model.createCollection();
    const dropped = await model.syncIndexes();
    const indexes = await model.listIndexes();
    console.log(`${model.collection.collectionName.padEnd(16)} ${indexes.length} index(es)${dropped.length ? `, dropped: ${dropped.join(', ')}` : ''}`);
  }
  await Settings.getSingleton();
  console.log('Platform settings ready.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
