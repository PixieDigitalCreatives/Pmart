/**
 * normalize-addresses.ts — Safe, idempotent address normalization migration
 *
 * Covers: shops, orders, customerprofiles, and addresses collections.
 *
 * Behaviour:
 *  - Defaults to DRY-RUN mode. Pass --apply to actually write changes.
 *  - Migrates zipCode → pincode only when pincode is absent or empty.
 *  - Reports conflicting values (both zipCode and pincode present with different values).
 *  - Converts valid legacy coordinates {lat, lng} to GeoJSON location {type:'Point', coordinates:[lng,lat]}.
 *  - Validates lat ∈ [-90,90] and lng ∈ [-180,180]; preserves malformed records.
 *  - Processes in bounded batches (default 500).
 *  - Logs per-collection counts: scanned, migrated, conflicts, malformed, errors.
 *  - A second run with --apply should produce 0 additional modifications.
 *  - Does NOT delete historical order address snapshots or overwrite valid data.
 *
 * Usage:
 *   npx ts-node src/scripts/normalize-addresses.ts          # dry-run
 *   npx ts-node src/scripts/normalize-addresses.ts --apply  # live run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const BATCH_SIZE = 500;
const DRY_RUN = !process.argv.includes('--apply');

interface MigrationStats {
  scanned: number;
  migratedPincode: number;
  migratedCoords: number;
  conflicts: Array<{ _id: string; zipCode: string; pincode: string }>;
  malformed: Array<{ _id: string; reason: string; lat?: any; lng?: any }>;
  errors: Array<{ _id: string; error: string }>;
}

function newStats(): MigrationStats {
  return { scanned: 0, migratedPincode: 0, migratedCoords: 0, conflicts: [], malformed: [], errors: [] };
}

function isValidLat(v: any): boolean {
  return typeof v === 'number' && isFinite(v) && v >= -90 && v <= 90;
}
function isValidLng(v: any): boolean {
  return typeof v === 'number' && isFinite(v) && v >= -180 && v <= 180;
}

function printStats(label: string, stats: MigrationStats) {
  console.log(`\\n=== ${label} ===`);
  console.log(`  Scanned:          ${stats.scanned}`);
  console.log(`  Migrated pincode: ${stats.migratedPincode}`);
  console.log(`  Migrated coords:  ${stats.migratedCoords}`);
  console.log(`  Conflicts:        ${stats.conflicts.length}`);
  console.log(`  Malformed coords: ${stats.malformed.length}`);
  console.log(`  Errors:           ${stats.errors.length}`);
  if (stats.conflicts.length > 0) {
    console.log(`  Conflict details:`);
    stats.conflicts.forEach(c => console.log(`    _id=${c._id}  zipCode=${c.zipCode}  pincode=${c.pincode}`));
  }
  if (stats.malformed.length > 0) {
    console.log(`  Malformed details:`);
    stats.malformed.forEach(m => console.log(`    _id=${m._id}  reason=${m.reason}  lat=${m.lat}  lng=${m.lng}`));
  }
  if (stats.errors.length > 0) {
    console.log(`  Error details:`);
    stats.errors.forEach(e => console.log(`    _id=${e._id}  error=${e.error}`));
  }
}

/**
 * Migrate a flat address object embedded in a document.
 * path = 'address' for shops, 'deliveryAddress' for orders.
 * Returns the $set and $unset ops if changes are needed, or null.
 */
function buildFlatAddressOps(
  doc: any,
  path: string,
  stats: MigrationStats
): { $set?: Record<string, any>; $unset?: Record<string, any> } | null {
  const addr = doc[path];
  if (!addr) return null;

  const ops: any = { $set: {}, $unset: {} };
  let changed = false;

  // --- zipCode → pincode ---
  if (addr.zipCode !== undefined) {
    if (!addr.pincode || addr.pincode === '') {
      // No pincode present — adopt zipCode value
      ops.$set[`${path}.pincode`] = addr.zipCode;
      ops.$unset[`${path}.zipCode`] = '';
      stats.migratedPincode++;
      changed = true;
    } else if (addr.pincode === addr.zipCode) {
      // Same value — just clean up the duplicate field
      ops.$unset[`${path}.zipCode`] = '';
      stats.migratedPincode++;
      changed = true;
    } else {
      // Genuine conflict — record it, do NOT overwrite pincode
      stats.conflicts.push({ _id: doc._id.toString(), zipCode: addr.zipCode, pincode: addr.pincode });
      // Still remove zipCode but preserve existing pincode
      ops.$unset[`${path}.zipCode`] = '';
      changed = true;
    }
  }

  // --- Legacy coordinates → GeoJSON location ---
  if (addr.coordinates && typeof addr.coordinates === 'object' && 'lat' in addr.coordinates && 'lng' in addr.coordinates) {
    const lat = addr.coordinates.lat;
    const lng = addr.coordinates.lng;

    if (isValidLat(lat) && isValidLng(lng)) {
      // Only add GeoJSON location if not already present
      if (!addr.location || !addr.location.coordinates || !Array.isArray(addr.location.coordinates) || addr.location.coordinates.length !== 2) {
        ops.$set[`${path}.location`] = { type: 'Point', coordinates: [lng, lat] };
        stats.migratedCoords++;
        changed = true;
      }
      // Keep legacy coordinates — readers still consume them
    } else {
      // Invalid/malformed — preserve for investigation
      stats.malformed.push({ _id: doc._id.toString(), reason: 'invalid lat/lng range', lat, lng });
    }
  }

  if (!changed) return null;

  // Clean up empty op objects
  if (Object.keys(ops.$set).length === 0) delete ops.$set;
  if (Object.keys(ops.$unset).length === 0) delete ops.$unset;

  return ops;
}

async function migrateShops(db: mongoose.Connection, stats: MigrationStats) {
  const collection = db.collection('shops');
  const cursor = collection.find({
    $or: [
      { 'address.zipCode': { $exists: true } },
      { 'address.coordinates': { $exists: true }, 'address.location': { $exists: false } }
    ]
  }).batchSize(BATCH_SIZE);

  for await (const doc of cursor) {
    stats.scanned++;
    try {
      const ops = buildFlatAddressOps(doc, 'address', stats);
      if (ops && !DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, ops);
      }
    } catch (err: any) {
      stats.errors.push({ _id: doc._id.toString(), error: err.message });
    }
  }
}

async function migrateOrders(db: mongoose.Connection, stats: MigrationStats) {
  const collection = db.collection('orders');
  const cursor = collection.find({
    $or: [
      { 'deliveryAddress.zipCode': { $exists: true } },
      { 'deliveryAddress.coordinates': { $exists: true }, 'deliveryAddress.location': { $exists: false } }
    ]
  }).batchSize(BATCH_SIZE);

  for await (const doc of cursor) {
    stats.scanned++;
    try {
      const ops = buildFlatAddressOps(doc, 'deliveryAddress', stats);
      if (ops && !DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, ops);
      }
    } catch (err: any) {
      stats.errors.push({ _id: doc._id.toString(), error: err.message });
    }
  }
}

async function migrateCustomerProfiles(db: mongoose.Connection, stats: MigrationStats) {
  const collection = db.collection('customerprofiles');
  const cursor = collection.find({
    $or: [
      { 'addresses.zipCode': { $exists: true } },
      { 'addresses.coordinates': { $exists: true }, 'addresses.location': { $exists: false } }
    ]
  }).batchSize(BATCH_SIZE);

  for await (const doc of cursor) {
    stats.scanned++;
    try {
      if (!Array.isArray(doc.addresses)) continue;

      let docChanged = false;
      const updatedAddresses = doc.addresses.map((addr: any) => {
        const updated: any = { ...addr };
        let addrChanged = false;

        // zipCode → pincode
        if (addr.zipCode !== undefined) {
          if (!addr.pincode || addr.pincode === '') {
            updated.pincode = addr.zipCode;
            delete updated.zipCode;
            stats.migratedPincode++;
            addrChanged = true;
          } else if (addr.pincode === addr.zipCode) {
            delete updated.zipCode;
            stats.migratedPincode++;
            addrChanged = true;
          } else {
            stats.conflicts.push({ _id: doc._id.toString(), zipCode: addr.zipCode, pincode: addr.pincode });
            delete updated.zipCode;
            addrChanged = true;
          }
        }

        // Legacy coords → GeoJSON location
        if (addr.coordinates && typeof addr.coordinates === 'object' && 'lat' in addr.coordinates && 'lng' in addr.coordinates) {
          const { lat, lng } = addr.coordinates;
          if (isValidLat(lat) && isValidLng(lng)) {
            if (!addr.location || !addr.location.coordinates || !Array.isArray(addr.location.coordinates) || addr.location.coordinates.length !== 2) {
              updated.location = { type: 'Point', coordinates: [lng, lat] };
              stats.migratedCoords++;
              addrChanged = true;
            }
          } else {
            stats.malformed.push({ _id: doc._id.toString(), reason: 'invalid lat/lng in embedded address', lat, lng });
          }
        }

        if (addrChanged) docChanged = true;
        return updated;
      });

      if (docChanged && !DRY_RUN) {
        await collection.updateOne({ _id: doc._id }, { $set: { addresses: updatedAddresses } });
      }
    } catch (err: any) {
      stats.errors.push({ _id: doc._id.toString(), error: err.message });
    }
  }
}

async function migrateStandaloneAddresses(db: mongoose.Connection, stats: MigrationStats) {
  const collection = db.collection('addresses');
  // Standalone Address model already uses GeoJSON and pincode in the schema.
  // But check for any legacy documents that slipped through.
  const cursor = collection.find({
    $or: [
      { zipCode: { $exists: true } },
      { 'coordinates.lat': { $exists: true }, location: { $exists: false } }
    ]
  }).batchSize(BATCH_SIZE);

  for await (const doc of cursor) {
    stats.scanned++;
    try {
      const ops: any = { $set: {}, $unset: {} };
      let changed = false;

      if (doc.zipCode !== undefined) {
        if (!doc.pincode || doc.pincode === '') {
          ops.$set.pincode = doc.zipCode;
          ops.$unset.zipCode = '';
          stats.migratedPincode++;
          changed = true;
        } else if (doc.pincode === doc.zipCode) {
          ops.$unset.zipCode = '';
          stats.migratedPincode++;
          changed = true;
        } else {
          stats.conflicts.push({ _id: doc._id.toString(), zipCode: doc.zipCode, pincode: doc.pincode });
          ops.$unset.zipCode = '';
          changed = true;
        }
      }

      if (doc.coordinates && typeof doc.coordinates === 'object' && 'lat' in doc.coordinates) {
        const { lat, lng } = doc.coordinates;
        if (isValidLat(lat) && isValidLng(lng)) {
          if (!doc.location || !doc.location.coordinates) {
            ops.$set.location = { type: 'Point', coordinates: [lng, lat] };
            stats.migratedCoords++;
            changed = true;
          }
        } else {
          stats.malformed.push({ _id: doc._id.toString(), reason: 'invalid lat/lng', lat, lng });
        }
      }

      if (changed && !DRY_RUN) {
        const finalOps: any = {};
        if (Object.keys(ops.$set).length > 0) finalOps.$set = ops.$set;
        if (Object.keys(ops.$unset).length > 0) finalOps.$unset = ops.$unset;
        await collection.updateOne({ _id: doc._id }, finalOps);
      }
    } catch (err: any) {
      stats.errors.push({ _id: doc._id.toString(), error: err.message });
    }
  }
}

async function run() {
  console.log(`\\n╔══════════════════════════════════════════════╗`);
  console.log(`║  PMart Address Normalization Migration       ║`);
  console.log(`║  Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY (writing changes)'}${DRY_RUN ? '      ' : '   '}║`);
  console.log(`║  Batch size: ${BATCH_SIZE}                             ║`);
  console.log(`╚══════════════════════════════════════════════╝\\n`);

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to database.\\n');

    const db = mongoose.connection;

    const shopStats = newStats();
    await migrateShops(db, shopStats);
    printStats('Shops', shopStats);

    const orderStats = newStats();
    await migrateOrders(db, orderStats);
    printStats('Orders', orderStats);

    const profileStats = newStats();
    await migrateCustomerProfiles(db, profileStats);
    printStats('CustomerProfiles', profileStats);

    const addressStats = newStats();
    await migrateStandaloneAddresses(db, addressStats);
    printStats('Standalone Addresses', addressStats);

    // Summary
    const totalMigrated = shopStats.migratedPincode + orderStats.migratedPincode + profileStats.migratedPincode + addressStats.migratedPincode
      + shopStats.migratedCoords + orderStats.migratedCoords + profileStats.migratedCoords + addressStats.migratedCoords;
    const totalConflicts = shopStats.conflicts.length + orderStats.conflicts.length + profileStats.conflicts.length + addressStats.conflicts.length;
    const totalMalformed = shopStats.malformed.length + orderStats.malformed.length + profileStats.malformed.length + addressStats.malformed.length;
    const totalErrors = shopStats.errors.length + orderStats.errors.length + profileStats.errors.length + addressStats.errors.length;

    console.log(`\\n${'='.repeat(50)}`);
    console.log(`SUMMARY${DRY_RUN ? ' (DRY-RUN — no writes performed)' : ''}`);
    console.log(`  Total documents needing migration: ${shopStats.scanned + orderStats.scanned + profileStats.scanned + addressStats.scanned}`);
    console.log(`  Total fields migrated:            ${totalMigrated}`);
    console.log(`  Total conflicts:                  ${totalConflicts}`);
    console.log(`  Total malformed (preserved):      ${totalMalformed}`);
    console.log(`  Total errors:                     ${totalErrors}`);
    console.log(`${'='.repeat(50)}`);

    if (DRY_RUN) {
      console.log('\\nThis was a DRY-RUN. To apply changes, run again with: --apply');
    } else {
      console.log('\\nMigration applied. Run again to verify idempotency (should show 0 modifications).');
    }

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
