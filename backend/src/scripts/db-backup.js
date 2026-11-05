'use strict';

/**
 * Exports every collection of the configured database as canonical Extended JSON (ObjectIds, dates and
 * decimals survive a restore) plus a manifest of document counts.
 *
 * Usage: npm run db:backup -- [output directory]
 * Default output: <repo>/backups/<db>-<YYYY-MM-DD-HHmm>/ (gitignored).
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');

const { EJSON } = mongoose.mongo.BSON;

async function main() {
  await connectDB();
  const db = mongoose.connection.db;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const outDir = path.resolve(process.argv[2] || path.join(__dirname, '../../../backups', `${db.databaseName}-${stamp}`));
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: {} };
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const docs = await db.collection(name).find({}).toArray();
    const indexes = await db.collection(name).indexes();
    fs.writeFileSync(path.join(outDir, `${name}.json`), EJSON.stringify(docs, null, 0, { relaxed: false }));
    fs.writeFileSync(path.join(outDir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));
    manifest.collections[name] = docs.length;
    console.log(`${name.padEnd(24)} ${docs.length}`);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Backup written to ${outDir}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
