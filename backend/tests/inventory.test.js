'use strict';

const dns = require('dns');
const { startDb, stopDb, clearDb, api, auth, createUser, createShop, createCategory, createProduct } = require('./helpers');
const { Product } = require('../src/modules/catalog/catalog.model');
const { InventoryTransaction, ImportBatch } = require('../src/modules/inventory/inventory.model');
const { ProductImage } = require('../src/modules/images/image.model');
const { AuditLog } = require('../src/modules/admin/audit.model');
const { STORE_MANAGER_PERMISSIONS } = require('../src/modules/auth/auth.model');
const { parseCsv } = require('../src/utils/csv');
const { CSV_COLUMNS } = require('../src/modules/inventory/csv-fields');

beforeAll(startDb);
afterAll(stopDb);
afterEach(async () => {
  jest.restoreAllMocks();
  await clearDb();
});

const HEADER = 'code,name,unit,stock,deal,free,pur_deal,pur_free,cost,value,mrp,pur_rate,rate,company,manufact,rackno,barcode';
const ROWS = [
  '"0000708"," ACI II GOLDEN SIZZE 40G","PCS",-290.000,0,0,0,0,8.7300,-2531.70,10.00,9.00,0.00,"ABC","","","8901512540201"',
  '"+000462","5 STAR 3D","PCS",12.500,1,2,3,4,20.0000,250.00,35.00,20.00,30.00,"CADBURY","MONDELEZ","B-46","0012345678905"',
  '"HALDIRA454","5 STAR 3D","24PC",4,0,0,0,0,0,0,40.00,30.00,0,"","","",""',
  '"CF1","CASH ROW","PCS",1,0,0,0,0,0,0,0,0,0,"","","","Cash received"',
  '"0000708","DUPLICATE CODE","PCS",1,0,0,0,0,0,0,5,0,0,"","","","8901512540201"',
  '"BAD1","BAD NUMBER","PCS",abc,0,0,0,0,0,0,5,0,0,"","","","123"',
  ',,,,,,,,,,,,,,,,'
];
const CSV = [HEADER, ...ROWS].join('\r\n');

async function setup() {
  const admin = await createUser('ADMIN');
  const owner = await createUser('SHOP_OWNER');
  const shop = await createShop(owner);
  const manager = await createUser('EMPLOYEE', { permissions: [...STORE_MANAGER_PERMISSIONS] });
  return { admin, owner, shop, manager };
}

async function importCsv(admin, csv = CSV) {
  const preview = await api().post('/api/inventory/imports/preview').set(auth(admin)).send({ csv, fileName: 'order.csv' });
  expect(preview.status).toBe(201);
  const commit = await api().post(`/api/inventory/imports/${preview.body.data.batch._id}/commit`).set(auth(admin)).send({});
  expect(commit.status).toBe(200);
  return { preview: preview.body.data, batch: commit.body.data };
}

describe('CSV import', () => {
  it('imports rows with every original field kept, leading zeros intact and negatives set to 0', async () => {
    const { admin } = await setup();
    const { preview, batch } = await importCsv(admin);

    expect(preview.batch.totals).toMatchObject({ rows: 7, created: 4, duplicate: 1, failed: 1, skipped: 1 });
    expect(batch.totals).toMatchObject({ created: 4, duplicate: 1, failed: 1, skipped: 1 });
    expect(batch.report.find((r) => r.outcome === 'FAILED').messages[0]).toMatch(/stock: "abc" is not a number/);
    expect(batch.report.find((r) => r.outcome === 'DUPLICATE').messages[0]).toMatch(/row 2/);

    const zero = await Product.findOne({ code: '0000708' }).lean();
    expect(zero.name).toBe('ACI II GOLDEN SIZZE 40G');
    expect(zero.stockCount).toBe(0);
    expect(zero.stockValue).toBe(0);
    expect(zero.barcode).toBe('8901512540201');
    expect(zero.isActive).toBe(false);
    expect(zero.image.status).toBe('NOT_AVAILABLE');
    // rate 0 → selling price falls back to MRP; the rate itself is kept as 0.
    expect(zero.rate).toBe(0);
    expect(zero.price).toBe(10);
    // The original text of all 17 columns is retained verbatim.
    expect(Object.keys(zero.importSource.raw)).toEqual(CSV_COLUMNS);
    expect(zero.importSource.raw.stock).toBe('-290.000');
    expect(zero.importSource.raw.name).toBe(' ACI II GOLDEN SIZZE 40G');
    expect(batch.report.find((r) => r.code === '0000708' && r.outcome === 'CREATED').messages).toEqual(
      expect.arrayContaining([expect.stringMatching(/stock: negative value -290.000 imported as 0/)])
    );

    const plus = await Product.findOne({ code: '+000462' }).lean();
    expect(plus).toMatchObject({ barcode: '0012345678905', stockCount: 12.5, deal: 1, free: 2, purDeal: 3, purFree: 4, cost: 20, stockValue: 250, mrp: 35, purRate: 20, rate: 30, price: 30, company: 'CADBURY', manufacturer: 'MONDELEZ', rackNo: 'B-46' });
    // Same product name on two rows is fine; names are never a key.
    expect(await Product.countDocuments({ name: '5 STAR 3D' })).toBe(2);
    // Non-barcode text in the barcode column is stored as-is.
    expect((await Product.findOne({ code: 'CF1' })).barcode).toBe('Cash received');

    const opening = await InventoryTransaction.find({ type: 'OPENING' }).lean();
    expect(opening.map((t) => t.stockAfter).sort()).toEqual([1, 12.5, 4].sort());
  });

  it('never overwrites existing products when the same file is imported again', async () => {
    const { admin } = await setup();
    await importCsv(admin);
    await Product.updateOne({ code: '+000462' }, { $set: { name: 'Renamed by staff' } });

    const { preview, batch } = await importCsv(admin);
    expect(preview.previouslyImported).toBe(true);
    expect(batch.totals).toMatchObject({ created: 0, duplicate: 5 });
    expect((await Product.findOne({ code: '+000462' })).name).toBe('Renamed by staff');
    expect(await Product.countDocuments()).toBe(4);
  });

  it('keeps codes that differ only by surrounding spaces as separate products, both found by a lookup', async () => {
    const { admin, manager } = await setup();
    const csv = [HEADER, '" Z1039","CADBURY CELEBRATIONS","PCS",15,0,0,0,0,0,0,50,0,0,"ROXY","","","7622202381133"', '"Z1039","MARGO 100GM","PCS",4,0,0,0,0,0,0,24,0,0,"ROXY","","","8902102230212"'].join('\n');
    const { batch } = await importCsv(admin, csv);
    expect(batch.totals).toMatchObject({ created: 2, duplicate: 0 });
    expect((await Product.findOne({ name: 'CADBURY CELEBRATIONS' })).code).toBe(' Z1039');
    const res = await api().get('/api/inventory/lookup').query({ code: 'z1039' }).set(auth(manager));
    expect(res.body.data.matches.map((p) => p.name).sort()).toEqual(['CADBURY CELEBRATIONS', 'MARGO 100GM']);
  });

  it('cannot commit the same preview twice', async () => {
    const { admin } = await setup();
    const preview = await api().post('/api/inventory/imports/preview').set(auth(admin)).send({ csv: CSV });
    const id = preview.body.data.batch._id;
    const [a, b] = await Promise.all([
      api().post(`/api/inventory/imports/${id}/commit`).set(auth(admin)).send({}),
      api().post(`/api/inventory/imports/${id}/commit`).set(auth(admin)).send({})
    ]);
    expect([a.status, b.status].sort()).toEqual(expect.arrayContaining([200]));
    expect(await Product.countDocuments()).toBe(4);
  });

  it('rejects a mapping without product code or name, and supports custom column mapping', async () => {
    const { admin } = await setup();
    const bad = await api().post('/api/inventory/imports/preview').set(auth(admin)).send({ csv: CSV, mapping: { name: 'name' } });
    expect(bad.status).toBe(400);
    const custom = 'Item No,Item Name,Qty\n"007","Salt",3\n';
    const ok = await api().post('/api/inventory/imports/preview').set(auth(admin)).send({ csv: custom, mapping: { 'Item No': 'code', 'Item Name': 'name', Qty: 'stockCount' } });
    expect(ok.status).toBe(201);
    expect(ok.body.data.sample[0]).toMatchObject({ code: '007', name: 'Salt', stockCount: 3 });
  });

  it('exports the inventory with the original 17 columns and exact values', async () => {
    const { admin } = await setup();
    await importCsv(admin);
    const res = await api().get('/api/inventory/export.csv').set(auth(admin));
    expect(res.status).toBe(200);
    const rows = parseCsv(res.text);
    expect(rows[0].slice(0, 17)).toEqual(CSV_COLUMNS);
    const plus = rows.find((r) => r[0] === '+000462');
    expect(plus[16]).toBe('0012345678905');
    expect(rows.find((r) => r[0] === '0000708')).toBeTruthy();
  });

  it('lets an admin roll back an import that has not been used', async () => {
    const { admin } = await setup();
    const { batch } = await importCsv(admin);
    const res = await api().post(`/api/inventory/imports/${batch._id}/rollback`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(4);
    expect(await Product.countDocuments()).toBe(0);
    expect((await ImportBatch.findById(batch._id)).status).toBe('ROLLED_BACK');
  });
});

describe('barcode lookup and search', () => {
  it('finds products by barcode (including the UPC/EAN form with or without the leading 0) and by code', async () => {
    const { admin, manager } = await setup();
    await importCsv(admin);
    const byBarcode = await api().get('/api/inventory/lookup').query({ code: '012345678905' }).set(auth(manager));
    expect(byBarcode.status).toBe(200);
    expect(byBarcode.body.data.matches.map((p) => p.code)).toEqual(['+000462']);
    const byCode = await api().get('/api/inventory/lookup').query({ code: 'HALDIRA454' }).set(auth(manager));
    expect(byCode.body.data.matches[0].name).toBe('5 STAR 3D');
    const unknown = await api().get('/api/inventory/lookup').query({ code: '8901234567890' }).set(auth(manager));
    expect(unknown.body.data.matches).toHaveLength(0);
  });

  it('searches the product list by name, company and barcode', async () => {
    const { admin, manager } = await setup();
    await importCsv(admin);
    const byName = await api().get('/api/manage/products').query({ search: '5 star' }).set(auth(manager));
    expect(byName.status).toBe(200);
    expect(byName.body.data.totalCount).toBe(2);
    const byCompany = await api().get('/api/manage/products').query({ search: 'cadbury', field: 'company' }).set(auth(manager));
    expect(byCompany.body.data.products.map((p) => p.code)).toEqual(['+000462']);
    const out = await api().get('/api/manage/products').query({ stock: 'out' }).set(auth(manager));
    expect(out.body.data.products.map((p) => p.code)).toEqual(['0000708']);
  });

  it('adds a product for an unknown barcode, warning about barcodes already in use', async () => {
    const { admin, shop } = await setup();
    const first = await api().post('/api/manage/products').set(auth(admin)).send({ name: 'Kala Tori 250g', code: 'NEW1', barcode: '8906114771213', unit: 'PCS', mrp: 30, rate: 0, stockCount: 5, shop: String(shop._id) });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ price: 30, stockCount: 5, isActive: false, barcodes: ['8906114771213'] });
    expect(first.body.warnings).toEqual([]);
    const second = await api().post('/api/manage/products').set(auth(admin)).send({ name: 'Other', code: 'NEW2', barcode: '8906114771213', unit: 'PCS', mrp: 10, shop: String(shop._id) });
    expect(second.status).toBe(201);
    expect(second.body.warnings[0]).toMatch(/Kala Tori/);
    const dupCode = await api().post('/api/manage/products').set(auth(admin)).send({ name: 'Dup', code: 'NEW1', unit: 'PCS', mrp: 10, shop: String(shop._id) });
    expect(dupCode.status).toBe(409);
    expect(await InventoryTransaction.countDocuments({ type: 'OPENING', product: first.body.data._id })).toBe(1);
  });

  it('requires a category before a product is listed online', async () => {
    const { admin, shop } = await setup();
    const res = await api().post('/api/manage/products').set(auth(admin)).send({ name: 'Online thing', unit: 'PCS', mrp: 10, isActive: true, shop: String(shop._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/category/i);
  });

  it('never changes stock through the product form without an adjustment permission', async () => {
    const { admin, shop } = await setup();
    const catalogOnly = await createUser('EMPLOYEE', { permissions: ['catalog.manage'] });
    const category = await createCategory();
    const product = await createProduct(shop, category, { stockCount: 10 });
    const denied = await api().put(`/api/manage/products/${product._id}`).set(auth(catalogOnly)).send({ stockCount: 3 });
    expect(denied.status).toBe(403);
    const ok = await api().put(`/api/manage/products/${product._id}`).set(auth(admin)).send({ stockCount: 3 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.stockCount).toBe(3);
    const row = await InventoryTransaction.findOne({ product: product._id, type: 'ADJUSTMENT' });
    expect(row).toMatchObject({ stockBefore: 10, stockAfter: 3, quantity: -7 });
  });

  it('logs selling-rate and purchase-rate changes with old and new values', async () => {
    const { admin, shop } = await setup();
    const category = await createCategory();
    const product = await createProduct(shop, category, { rate: 50, mrp: 60, purRate: 40 });
    await api().put(`/api/manage/products/${product._id}`).set(auth(admin)).send({ rate: 55, purRate: 42 });
    const log = await AuditLog.findOne({ resource: 'Product', resourceId: String(product._id), action: 'UPDATE' }).lean();
    expect(log.details.priceChanges).toMatchObject({ rate: { from: 50, to: 55 }, purRate: { from: 40, to: 42 }, price: { from: 50, to: 55 } });
  });
});

describe('restocking', () => {
  it('adds received plus free quantity once, records the supplier and updates the purchase rate', async () => {
    const { admin, manager } = await setup();
    await importCsv(admin);
    const product = await Product.findOne({ code: '+000462' });
    const body = { product: String(product._id), receivedQuantity: 10, freeQuantity: 2, purchaseRate: 21.5, supplierName: 'Sangam  Enterprises', referenceNumber: 'BILL-77', idempotencyKey: 'restock-key-0001' };

    const res = await api().post('/api/inventory/restocks').set(auth(manager)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.restock).toMatchObject({ stockBefore: 12.5, stockAfter: 24.5, receivedQuantity: 10, freeQuantity: 2, purchaseRate: 21.5, previousPurchaseRate: 20, amount: 215, supplierName: 'Sangam Enterprises', referenceNumber: 'BILL-77', number: 'RST-000001' });
    expect(res.body.data.product).toMatchObject({ stockCount: 24.5, purRate: 21.5 });

    const replay = await api().post('/api/inventory/restocks').set(auth(manager)).send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    expect((await Product.findById(product._id)).stockCount).toBe(24.5);
    const ledger = await InventoryTransaction.find({ product: product._id, type: 'RESTOCK' });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ quantity: 12, freeQuantity: 2, stockBefore: 12.5, stockAfter: 24.5 });

    const audit = await AuditLog.findOne({ resource: 'Restock' }).lean();
    expect(audit.details.purchaseRate).toEqual({ from: 20, to: 21.5 });
    const suppliers = await api().get('/api/inventory/suppliers').query({ search: 'sangam' }).set(auth(manager));
    expect(suppliers.body.data[0].name).toBe('Sangam Enterprises');
  });

  it('records manual adjustments only for users with inventory.adjust, with a reason', async () => {
    const { admin, manager } = await setup();
    await importCsv(admin);
    const product = await Product.findOne({ code: 'HALDIRA454' });
    const denied = await api().post('/api/inventory/adjustments').set(auth(manager)).send({ product: String(product._id), mode: 'SET', quantity: 2, reason: 'Count', idempotencyKey: 'adjust-key-0001' });
    expect(denied.status).toBe(403);
    const noReason = await api().post('/api/inventory/adjustments').set(auth(admin)).send({ product: String(product._id), mode: 'SET', quantity: 2, reason: '', idempotencyKey: 'adjust-key-0001' });
    expect(noReason.status).toBe(400);
    const ok = await api().post('/api/inventory/adjustments').set(auth(admin)).send({ product: String(product._id), mode: 'DELTA', quantity: -1.5, reason: 'Damaged packs', idempotencyKey: 'adjust-key-0002' });
    expect(ok.status).toBe(201);
    expect((await Product.findById(product._id)).stockCount).toBe(2.5);
    const again = await api().post('/api/inventory/adjustments').set(auth(admin)).send({ product: String(product._id), mode: 'DELTA', quantity: -1.5, reason: 'Damaged packs', idempotencyKey: 'adjust-key-0002' });
    expect(again.body.replayed).toBe(true);
    expect((await Product.findById(product._id)).stockCount).toBe(2.5);
  });
});

// ---------- Product images ----------

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function mockOpenFoodFacts(record) {
  jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '151.101.1.1', family: 4 }]);
  jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    const href = String(url);
    if (href.includes('/api/v2/product/')) {
      const found = href.includes('openfoodfacts.org') && record;
      return new Response(JSON.stringify(found ? { status: 1, product: record } : { status: 0 }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
  });
}

describe('product images', () => {
  async function productWithBarcode() {
    const { admin, manager, shop } = await setup();
    const category = await createCategory();
    const product = await createProduct(shop, category, { name: 'Cadbury 5 Star 3D', barcode: '7622201693152' });
    return { admin, manager, product };
  }

  it('stores a barcode match as a pending candidate that is never shown as the product photo', async () => {
    const { admin, product } = await productWithBarcode();
    mockOpenFoodFacts({ code: '7622201693152', product_name: '5 Star 3D', brands: 'Cadbury', quantity: '42 g', image_front_url: 'https://images.openfoodfacts.org/images/products/762/220/169/3152/front_en.3.400.jpg' });

    const res = await api().post('/api/inventory/images/find-candidates').set(auth(admin)).send({ productIds: [String(product._id)] });
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ found: 1, created: 1 });

    const candidate = await ProductImage.findOne({ product: product._id }).lean();
    expect(candidate).toMatchObject({ status: 'PENDING', origin: 'OPEN_FOOD_FACTS', matchedBy: 'BARCODE', matchedBarcode: '7622201693152', sourceProductName: '5 Star 3D', sourceBrand: 'Cadbury' });
    const fresh = await Product.findById(product._id).lean();
    expect(fresh.image.status).toBe('PENDING');
    expect(fresh.imageUrl).toBeUndefined();
    expect((await api().get(`/api/product-images/${candidate._id}`)).status).toBe(404);

    // Searching again does not duplicate the candidate.
    await api().post('/api/inventory/images/find-candidates').set(auth(admin)).send({ productIds: [String(product._id)] });
    expect(await ProductImage.countDocuments({ product: product._id })).toBe(1);
  });

  it('ignores a database record for a different barcode', async () => {
    const { admin, product } = await productWithBarcode();
    mockOpenFoodFacts({ code: '7622201693169', product_name: 'Another variant', image_front_url: 'https://images.openfoodfacts.org/x.jpg' });
    await api().post('/api/inventory/images/find-candidates').set(auth(admin)).send({ productIds: [String(product._id)] });
    expect(await ProductImage.countDocuments()).toBe(0);
    expect((await Product.findById(product._id)).image.status).toBe('NOT_AVAILABLE');
  });

  it('only a verifier can approve; approval caches the photo and makes it public; rejection removes it', async () => {
    const { admin, manager, product } = await productWithBarcode();
    mockOpenFoodFacts({ code: '7622201693152', product_name: '5 Star 3D', image_front_url: 'https://images.openfoodfacts.org/front.jpg' });
    await api().post('/api/inventory/images/find-candidates').set(auth(admin)).send({ productIds: [String(product._id)] });
    const candidate = await ProductImage.findOne({ product: product._id });

    expect((await api().post(`/api/inventory/images/${candidate._id}/approve`).set(auth(manager))).status).toBe(403);
    const approved = await api().post(`/api/inventory/images/${candidate._id}/approve`).set(auth(admin));
    expect(approved.status).toBe(200);
    const verified = await Product.findById(product._id).lean();
    expect(verified.image).toMatchObject({ status: 'VERIFIED', source: 'OPEN_FOOD_FACTS' });
    expect(verified.imageUrl).toBe(`/api/product-images/${candidate._id}`);
    const pub = await api().get(verified.imageUrl);
    expect(pub.status).toBe(200);
    expect(pub.headers['content-type']).toBe('image/png');

    const rejected = await api().post(`/api/inventory/images/${candidate._id}/reject`).set(auth(admin)).send({ reason: 'Wrong variant' });
    expect(rejected.status).toBe(200);
    const after = await Product.findById(product._id).lean();
    expect(after.image.status).toBe('NOT_AVAILABLE');
    expect(after.imageUrl).toBeUndefined();
    expect((await api().get(verified.imageUrl)).status).toBe(404);
  });

  it('uploads a photo; only users with images.verify can mark it verified', async () => {
    const { admin, product } = await productWithBarcode();
    const catalogStaff = await createUser('EMPLOYEE', { permissions: ['catalog.manage'] });
    const dataUrl = `data:image/png;base64,${PNG.toString('base64')}`;
    const denied = await api().post(`/api/inventory/products/${product._id}/images/upload`).set(auth(catalogStaff)).send({ dataUrl, markVerified: true });
    expect(denied.status).toBe(403);
    const pending = await api().post(`/api/inventory/products/${product._id}/images/upload`).set(auth(catalogStaff)).send({ dataUrl });
    expect(pending.status).toBe(201);
    expect((await Product.findById(product._id)).image.status).toBe('PENDING');
    const fake = await api().post(`/api/inventory/products/${product._id}/images/upload`).set(auth(admin)).send({ dataUrl: 'data:image/png;base64,bm90IGFuIGltYWdl', markVerified: true });
    expect(fake.status).toBe(400);
    const ok = await api().post(`/api/inventory/products/${product._id}/images/upload`).set(auth(admin)).send({ dataUrl, markVerified: true });
    expect(ok.status).toBe(201);
    expect((await Product.findById(product._id)).image.status).toBe('VERIFIED');
  });

  it('refuses image URLs that point at private addresses', async () => {
    const { admin, product } = await productWithBarcode();
    const res = await api().post(`/api/inventory/products/${product._id}/images/url`).set(auth(admin)).send({ imageUrl: 'https://127.0.0.1/secret.png' });
    expect(res.status).toBe(400);
  });
});

describe('permissions', () => {
  it('store managers can search and restock but not delete, import, adjust or verify', async () => {
    const { admin, manager, shop } = await setup();
    const category = await createCategory();
    const product = await createProduct(shop, category);
    expect((await api().get('/api/manage/products').set(auth(manager))).status).toBe(200);
    expect((await api().delete(`/api/manage/products/${product._id}`).set(auth(manager))).status).toBe(403);
    expect((await api().post('/api/inventory/imports/preview').set(auth(manager)).send({ csv: CSV })).status).toBe(403);
    expect((await api().get('/api/reports/inventory').set(auth(manager))).status).toBe(403);
    const customer = await createUser('CUSTOMER');
    expect((await api().get('/api/inventory/lookup').query({ code: '1' }).set(auth(customer))).status).toBe(403);
    expect((await api().delete(`/api/manage/products/${product._id}`).set(auth(admin))).status).toBe(200);
  });
});
