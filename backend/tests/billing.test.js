'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createShop, createCategory, createProduct, marketplace, placeOrder } = require('./helpers');
const { Product } = require('../src/modules/catalog/catalog.model');
const { InventoryTransaction } = require('../src/modules/inventory/inventory.model');
const { Invoice, Payment } = require('../src/modules/billing/billing.model');
const { Settings } = require('../src/modules/admin/settings.model');
const { AuditLog } = require('../src/modules/admin/audit.model');
const { STORE_MANAGER_PERMISSIONS, PERMISSIONS } = require('../src/modules/auth/auth.model');
const { computeInvoice, applyPaymentState } = require('../src/modules/billing/billing.calc');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

let n = 0;
const key = () => `test-key-${Date.now()}-${(n += 1)}`;

async function setup() {
  const admin = await createUser('ADMIN');
  const owner = await createUser('SHOP_OWNER');
  const shop = await createShop(owner);
  const category = await createCategory();
  const manager = await createUser('EMPLOYEE', { permissions: [...STORE_MANAGER_PERMISSIONS] });
  const chips = await createProduct(shop, category, { name: 'Chips 40g', code: 'C1', barcode: '8901512540201', rate: 20, mrp: 20, stockCount: 10, cost: 15 });
  const ghee = await createProduct(shop, category, { name: 'Ghee 1L', code: 'G1', barcode: '8906007289085', rate: 550, mrp: 600, stockCount: 3 });
  return { admin, manager, shop, chips, ghee };
}

const createInvoice = (user, body) => api().post('/api/billing/invoices').set(auth(user)).send({ idempotencyKey: key(), ...body });

describe('invoice arithmetic', () => {
  it('handles line discounts, a shared invoice discount and exclusive/inclusive tax exactly', () => {
    const lines = [
      { quantity: 2, unitPrice: 100, discount: 10, taxRate: 5 },
      { quantity: 1, unitPrice: 50, discount: 0, taxRate: 12 }
    ];
    const ex = computeInvoice(lines, { taxMode: 'EXCLUSIVE', invoiceDiscount: 24 });
    expect(ex.subtotal).toBe(250);
    expect(ex.itemDiscountTotal).toBe(10);
    // 24 shared 190:50 → 19 and 5.
    expect(ex.items.map((i) => i.invoiceDiscountShare)).toEqual([19, 5]);
    expect(ex.items.map((i) => i.taxAmount)).toEqual([8.55, 5.4]);
    expect(ex.grandTotal).toBe(229.95);

    const inc = computeInvoice([{ quantity: 1, unitPrice: 118, discount: 0, taxRate: 18 }], { taxMode: 'INCLUSIVE' });
    expect(inc).toMatchObject({ taxableTotal: 100, taxTotal: 18, grandTotal: 118 });

    const none = computeInvoice([{ quantity: 3, unitPrice: 33.33, taxRate: 18 }], { taxMode: 'NONE', roundTotal: true });
    expect(none).toMatchObject({ taxTotal: 0, grandTotal: 100, roundOff: 0.01 });
  });

  it('derives payment status from payments, returns and cancellation', () => {
    const inv = { grandTotal: 100, amountPaid: 0, returnedTotal: 0, status: 'FINALIZED' };
    expect(applyPaymentState(inv).paymentStatus).toBe('UNPAID');
    inv.amountPaid = 40;
    expect(applyPaymentState(inv)).toMatchObject({ paymentStatus: 'PARTIALLY_PAID', outstanding: 60 });
    inv.amountPaid = 100;
    expect(applyPaymentState(inv).paymentStatus).toBe('PAID');
    inv.returnedTotal = 100;
    expect(applyPaymentState(inv)).toMatchObject({ paymentStatus: 'REFUNDED', refundDue: 100 });
    inv.status = 'CANCELLED';
    expect(applyPaymentState(inv).paymentStatus).toBe('CANCELLED');
  });
});

describe('creating invoices', () => {
  it('bills several products and deducts stock exactly once, even when the request is repeated', async () => {
    const { manager, chips, ghee } = await setup();
    const body = { idempotencyKey: 'invoice-key-0001', customerName: 'Ravi', customerPhone: '9876543210', items: [{ product: String(chips._id), quantity: 3 }, { product: String(ghee._id), quantity: 1 }] };

    const first = await api().post('/api/billing/invoices').set(auth(manager)).send(body);
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ number: 'INV-000001', grandTotal: 610, paymentStatus: 'UNPAID', outstanding: 610, customerPhone: '+919876543210' });
    expect(first.body.data.items.map((i) => [i.code, i.barcode, i.quantity, i.unitPrice, i.mrp])).toEqual([
      ['C1', '8901512540201', 3, 20, 20],
      ['G1', '8906007289085', 1, 550, 600]
    ]);

    const again = await api().post('/api/billing/invoices').set(auth(manager)).send(body);
    expect(again.status).toBe(200);
    expect(again.body.replayed).toBe(true);
    expect(again.body.data._id).toBe(first.body.data._id);

    // Two simultaneous submissions of a new key still produce one invoice.
    const raceBody = { ...body, idempotencyKey: 'invoice-key-race' };
    await Promise.all([api().post('/api/billing/invoices').set(auth(manager)).send(raceBody), api().post('/api/billing/invoices').set(auth(manager)).send(raceBody)]);

    expect(await Invoice.countDocuments()).toBe(2);
    expect((await Product.findById(chips._id)).stockCount).toBe(4);
    expect((await Product.findById(ghee._id)).stockCount).toBe(1);
    expect(await InventoryTransaction.countDocuments({ type: 'SALE' })).toBe(4);
    const sale = await InventoryTransaction.findOne({ product: chips._id, type: 'SALE', refId: first.body.data._id });
    expect(sale).toMatchObject({ stockBefore: 10, stockAfter: 7, quantity: -3, refNumber: 'INV-000001' });
    expect((await Product.findById(chips._id)).stockValue).toBe(60);
  });

  it('blocks billing below zero stock unless an administrator allows it on the invoice', async () => {
    const { admin, manager, ghee } = await setup();
    const blocked = await createInvoice(manager, { items: [{ product: String(ghee._id), quantity: 5 }] });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('INSUFFICIENT_STOCK');
    expect((await Product.findById(ghee._id)).stockCount).toBe(3);

    const notAllowed = await createInvoice(manager, { allowNegativeStock: true, items: [{ product: String(ghee._id), quantity: 5 }] });
    expect(notAllowed.status).toBe(403);

    const allowed = await createInvoice(admin, { allowNegativeStock: true, items: [{ product: String(ghee._id), quantity: 5 }] });
    expect(allowed.status).toBe(201);
    expect((await Product.findById(ghee._id)).stockCount).toBe(-2);
    expect(allowed.body.data.negativeStockAllowedBy).toBe(String(admin._id));
  });

  it('only lets authorised users change prices or give discounts', async () => {
    const { admin, manager, chips } = await setup();
    const denied = await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1, unitPrice: 15 }] });
    expect(denied.status).toBe(403);
    const deniedDiscount = await createInvoice(manager, { invoiceDiscount: 5, items: [{ product: String(chips._id), quantity: 1 }] });
    expect(deniedDiscount.status).toBe(403);
    // Sending the normal price is not an override.
    expect((await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1, unitPrice: 20 }] })).status).toBe(201);
    const ok = await createInvoice(admin, { invoiceDiscount: 5, items: [{ product: String(chips._id), quantity: 2, unitPrice: 18, discount: 1 }] });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ subtotal: 36, itemDiscountTotal: 1, invoiceDiscount: 5, grandTotal: 30, priceOverridden: true });
    expect(ok.body.data.items[0].listPrice).toBe(20);
  });

  it('refuses a product with no selling price', async () => {
    const { manager, shop } = await setup();
    const category = await createCategory();
    const free = await createProduct(shop, category, { rate: 0, mrp: 0, price: 0, stockCount: 5 });
    const res = await createInvoice(manager, { items: [{ product: String(free._id), quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_PRICE');
  });

  it('applies the configured GST mode and rate (none is assumed by default)', async () => {
    const { admin, manager, chips } = await setup();
    const plain = await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1 }] });
    expect(plain.body.data).toMatchObject({ taxMode: 'NONE', taxTotal: 0 });

    await api().put('/api/admin/settings').set(auth(admin)).send({ billing: { taxMode: 'EXCLUSIVE', defaultTaxRate: 5, gstSplit: 'CGST_SGST', gstin: '10ABCDE1234F1Z5' } });
    const gst = await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 2 }] });
    expect(gst.body.data).toMatchObject({ taxMode: 'EXCLUSIVE', taxableTotal: 40, taxTotal: 2, grandTotal: 42, gstSplit: 'CGST_SGST' });
    const s = await Settings.getSingleton();
    expect(s.billing.invoicePrefix).toBe('INV');
  });
});

describe('payments', () => {
  it('records full, partial and multiple payments and keeps the outstanding balance right', async () => {
    const { manager, chips } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 5 }], payments: [{ amount: 30, method: 'CASH' }] })).body.data;
    expect(inv).toMatchObject({ grandTotal: 100, amountPaid: 30, outstanding: 70, paymentStatus: 'PARTIALLY_PAID' });

    const pay = (body) => api().post(`/api/billing/invoices/${inv._id}/payments`).set(auth(manager)).send({ idempotencyKey: key(), ...body });
    const over = await pay({ amount: 71, method: 'UPI' });
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('OVERPAYMENT');

    const upiKey = 'payment-key-upi1';
    const upi = await api().post(`/api/billing/invoices/${inv._id}/payments`).set(auth(manager)).send({ idempotencyKey: upiKey, amount: 50, method: 'UPI', reference: 'UPI123' });
    expect(upi.status).toBe(201);
    expect(upi.body.data.invoice).toMatchObject({ amountPaid: 80, outstanding: 20, paymentStatus: 'PARTIALLY_PAID' });
    const replay = await api().post(`/api/billing/invoices/${inv._id}/payments`).set(auth(manager)).send({ idempotencyKey: upiKey, amount: 50, method: 'UPI' });
    expect(replay.body.replayed).toBe(true);

    const card = await pay({ amount: 20, method: 'CARD' });
    expect(card.body.data.invoice).toMatchObject({ amountPaid: 100, outstanding: 0, paymentStatus: 'PAID' });
    expect((await pay({ amount: 1, method: 'CASH' })).body.code).toBe('ALREADY_PAID');

    const detail = await api().get(`/api/billing/invoices/${inv._id}`).set(auth(manager));
    expect(detail.body.data.payments.map((p) => [p.method, p.amount])).toEqual([['CASH', 30], ['UPI', 50], ['CARD', 20]]);
    expect(await Payment.countDocuments()).toBe(3);
  });

  it('shows an unpaid invoice as overdue after its due date and filters by status and method', async () => {
    const { manager, chips } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1 }] })).body.data;
    await Invoice.updateOne({ _id: inv._id }, { $set: { dueDate: new Date(Date.now() - 86400000) } });
    await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1 }], payments: [{ amount: 20, method: 'UPI' }] });

    const overdue = await api().get('/api/billing/invoices').query({ paymentStatus: 'OVERDUE' }).set(auth(manager));
    expect(overdue.body.data.map((i) => [i.number, i.displayStatus])).toEqual([[inv.number, 'OVERDUE']]);
    const byUpi = await api().get('/api/billing/invoices').query({ method: 'UPI' }).set(auth(manager));
    expect(byUpi.body.data).toHaveLength(1);
    const byBarcode = await api().get('/api/billing/invoices').query({ product: '8901512540201' }).set(auth(manager));
    expect(byBarcode.body.data).toHaveLength(2);

    const dash = await api().get('/api/billing/dashboard').set(auth(manager));
    expect(dash.body.data).toMatchObject({ totalInvoices: 2, totalSales: 40, collected: 20, outstanding: 20, overdue: { count: 1, outstanding: 20 }, unpaid: { count: 1 } });
    expect(dash.body.data.topProducts[0]).toMatchObject({ code: 'C1', quantity: 2 });
  });
});

describe('cancellation and returns', () => {
  it('cancels an invoice, puts stock back once and refunds what was paid', async () => {
    const { admin, manager, chips } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 4 }], payments: [{ amount: 50, method: 'CASH' }] })).body.data;
    expect((await Product.findById(chips._id)).stockCount).toBe(6);

    const denied = await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(manager)).send({ reason: 'Customer changed mind', refundMethod: 'CASH', idempotencyKey: key() });
    expect(denied.status).toBe(403);
    const noMethod = await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(admin)).send({ reason: 'Customer changed mind', idempotencyKey: key() });
    expect(noMethod.body.code).toBe('REFUND_METHOD_REQUIRED');

    const body = { reason: 'Customer changed mind', refundMethod: 'CASH', idempotencyKey: 'cancel-key-0001' };
    const res = await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(admin)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'CANCELLED', amountPaid: 0, refundedTotal: 50, outstanding: 0, refundDue: 0 });
    const twice = await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(admin)).send(body);
    expect(twice.body.replayed).toBe(true);
    expect((await Product.findById(chips._id)).stockCount).toBe(10);
    expect(await InventoryTransaction.countDocuments({ type: 'SALE_REVERSAL' })).toBe(1);
    expect(await Payment.countDocuments({ kind: 'REFUND' })).toBe(1);
    const pay = await api().post(`/api/billing/invoices/${inv._id}/payments`).set(auth(manager)).send({ idempotencyKey: key(), amount: 1, method: 'CASH' });
    expect(pay.body.code).toBe('INVOICE_CANCELLED');
  });

  it('returns part of an invoice: stock comes back and the refund is the returned value', async () => {
    const { admin, manager, chips, ghee } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 5 }, { product: String(ghee._id), quantity: 1 }], payments: [{ amount: 650, method: 'CASH' }] })).body.data;
    expect(inv.paymentStatus).toBe('PAID');

    const tooMany = await api().post(`/api/billing/invoices/${inv._id}/returns`).set(auth(admin)).send({ items: [{ lineNo: 1, quantity: 6 }], reason: 'Damaged', idempotencyKey: key() });
    expect(tooMany.status).toBe(400);

    const body = { items: [{ lineNo: 1, quantity: 2 }], reason: 'Damaged packs', refundMethod: 'CASH', idempotencyKey: 'return-key-0001' };
    const res = await api().post(`/api/billing/invoices/${inv._id}/returns`).set(auth(admin)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ returnedTotal: 40, netTotal: 610, amountPaid: 610, refundedTotal: 40, outstanding: 0, refundDue: 0, paymentStatus: 'PAID' });
    expect(res.body.data.items[0].returnedQuantity).toBe(2);
    await api().post(`/api/billing/invoices/${inv._id}/returns`).set(auth(admin)).send(body);
    expect((await Product.findById(chips._id)).stockCount).toBe(7);

    // Cancelling afterwards only restores what was not already returned.
    await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(admin)).send({ reason: 'Void', refundMethod: 'CASH', idempotencyKey: key() });
    expect((await Product.findById(chips._id)).stockCount).toBe(10);
    expect((await Product.findById(ghee._id)).stockCount).toBe(3);
  });
});

describe('deleting invoices', () => {
  const del = (user, id, body) => api().delete(`/api/billing/invoices/${id}`).set(auth(user)).send(body);

  it('lets only an administrator delete, and asks for a reason', async () => {
    const { admin, manager, chips } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1 }] })).body.data;
    const everyPermission = await createUser('EMPLOYEE', { permissions: [...PERMISSIONS] });

    expect((await del(manager, inv._id, { reason: 'Duplicate bill' })).status).toBe(403);
    expect((await del(everyPermission, inv._id, { reason: 'Duplicate bill' })).status).toBe(403);
    expect((await del(admin, inv._id, {})).status).toBe(400);
    expect((await del(admin, '0123456789abcdef01234567', { reason: 'Duplicate bill' })).status).toBe(404);
    expect(await Invoice.countDocuments()).toBe(1);
    expect((await Product.findById(chips._id)).stockCount).toBe(9);
  });

  it('removes a cancelled invoice and its payments, keeps the stock ledger and leaves stock alone', async () => {
    const { admin, manager, chips } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 4 }], payments: [{ amount: 30, method: 'UPI' }] })).body.data;
    await api().post(`/api/billing/invoices/${inv._id}/cancel`).set(auth(admin)).send({ reason: 'Wrong items', refundMethod: 'UPI', idempotencyKey: key() });
    expect((await Product.findById(chips._id)).stockCount).toBe(10);
    expect(await Payment.countDocuments({ invoice: inv._id })).toBe(2);

    const res = await del(admin, inv._id, { reason: 'Clean up' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ number: 'INV-000001', deleted: true, stockRestored: false, refunded: 0, paymentsDeleted: 2 });
    expect(await Invoice.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
    expect((await Product.findById(chips._id)).stockCount).toBe(10);
    expect((await InventoryTransaction.find({ refId: inv._id })).map((t) => t.type).sort()).toEqual(['SALE', 'SALE_REVERSAL']);
    const audit = await AuditLog.findOne({ resource: 'Invoice', action: 'DELETE', resourceId: inv._id });
    expect(String(audit.user)).toBe(String(admin._id));
    expect(audit.details).toMatchObject({ number: 'INV-000001', status: 'CANCELLED', reason: 'Clean up', stockRestored: false, grandTotal: 80 });
    expect(audit.details.items[0]).toMatchObject({ code: 'C1', quantity: 4 });
    expect(audit.details.payments.map((p) => [p.kind, p.amount, p.method])).toEqual([
      ['PAYMENT', 30, 'UPI'],
      ['REFUND', 30, 'UPI']
    ]);

    // A repeated request is a no-op; the invoice is gone from reads and lists; its number is not reused.
    const again = await del(admin, inv._id, { reason: 'Clean up' });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ replayed: true, data: { number: 'INV-000001', paymentsDeleted: 2 } });
    expect(await AuditLog.countDocuments({ resource: 'Invoice', action: 'DELETE' })).toBe(1);
    expect((await api().get(`/api/billing/invoices/${inv._id}`).set(auth(admin))).status).toBe(404);
    expect((await api().get('/api/billing/invoices').set(auth(admin))).body.pagination.total).toBe(0);
    expect((await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 1 }] })).body.data.number).toBe('INV-000002');
  });

  it('cancels a live invoice first: stock back once (less returns) and what was paid refunded', async () => {
    const { admin, manager, chips, ghee } = await setup();
    const inv = (await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 5 }, { product: String(ghee._id), quantity: 1 }], payments: [{ amount: 200, method: 'CASH' }] })).body.data;
    await api().post(`/api/billing/invoices/${inv._id}/returns`).set(auth(admin)).send({ items: [{ lineNo: 1, quantity: 2 }], reason: 'Damaged', idempotencyKey: key() });
    expect((await Product.findById(chips._id)).stockCount).toBe(7);
    expect((await Product.findById(ghee._id)).stockCount).toBe(2);

    const noMethod = await del(admin, inv._id, { reason: 'Billed by mistake' });
    expect(noMethod.status).toBe(400);
    expect(noMethod.body.code).toBe('REFUND_METHOD_REQUIRED');
    expect(await Invoice.countDocuments()).toBe(1);

    // Two simultaneous deletes: one does the work, the other is a replay.
    const body = { reason: 'Billed by mistake', refundMethod: 'CASH' };
    const results = await Promise.all([del(admin, inv._id, body), del(admin, inv._id, body)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.map((r) => r.body.replayed).sort()).toEqual([false, true]);
    expect(results.find((r) => !r.body.replayed).body.data).toMatchObject({ stockRestored: true, refunded: 200, refundMethod: 'CASH', paymentsDeleted: 1 });

    expect((await Product.findById(chips._id)).stockCount).toBe(10);
    expect((await Product.findById(ghee._id)).stockCount).toBe(3);
    const reversals = await InventoryTransaction.find({ refId: inv._id, type: 'SALE_REVERSAL' }).sort({ quantity: 1 });
    expect(reversals.map((r) => r.quantity)).toEqual([1, 3]);
    expect(reversals[0].reason).toBe('Invoice deleted: Billed by mistake');
    expect(await Payment.countDocuments()).toBe(0);
    expect(await Invoice.countDocuments()).toBe(0);
  });
});

describe('documents and reports', () => {
  it('renders the invoice as a PDF', async () => {
    const { manager, chips } = await setup();
    const inv = (await createInvoice(manager, { customerName: 'Ravi', items: [{ product: String(chips._id), quantity: 1 }] })).body.data;
    const res = await api().get(`/api/billing/invoices/${inv._id}/pdf`).set(auth(manager)).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('builds reports as JSON, CSV and PDF for users with reports.read', async () => {
    const { admin, manager, chips } = await setup();
    await createInvoice(manager, { items: [{ product: String(chips._id), quantity: 2 }], payments: [{ amount: 40, method: 'UPI' }] });
    const list = await api().get('/api/reports').set(auth(admin));
    expect(list.body.data.map((r) => r.type)).toEqual(
      expect.arrayContaining(['inventory', 'low-stock', 'out-of-stock', 'stock-valuation', 'purchases', 'restocks', 'sales', 'product-sales', 'daily-sales', 'monthly-sales', 'collections', 'outstanding', 'adjustments'])
    );
    const sales = await api().get('/api/reports/product-sales').set(auth(admin));
    expect(sales.body.data.rows[0]).toMatchObject({ code: 'C1', sold: 2, sales: 40 });
    const daily = await api().get('/api/reports/daily-sales').set(auth(admin));
    expect(daily.body.data.totals).toMatchObject({ net: 40, collected: 40 });
    const csv = await api().get('/api/reports/inventory').query({ format: 'csv' }).set(auth(admin));
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toMatch(/Chips 40g/);
    const pdf = await api().get('/api/reports/stock-valuation').query({ format: 'pdf' }).set(auth(admin)).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');
    expect((await api().get('/api/reports/sales').set(auth(manager))).status).toBe(403);
  });

  it('writes online orders and their cancellation to the same stock ledger', async () => {
    const m = await marketplace({ stock: 10, price: 100 });
    const placed = await placeOrder(m.customer, m.address, [[m.product, 2]]);
    expect(placed.status).toBe(201);
    const sale = await InventoryTransaction.findOne({ product: m.product._id, type: 'ONLINE_ORDER' }).lean();
    expect(sale).toMatchObject({ quantity: -2, stockBefore: 10, stockAfter: 8, refType: 'ORDER', refNumber: placed.body.data.orderNumber });
    expect(String(sale.refId)).toBe(placed.body.data._id);

    const cancel = await api().put(`/api/orders/${placed.body.data._id}/status`).set(auth(m.customer)).send({ status: 'CANCELLED' });
    expect(cancel.status).toBe(200);
    const back = await InventoryTransaction.findOne({ product: m.product._id, type: 'ONLINE_ORDER_REVERSAL' }).lean();
    expect(back).toMatchObject({ quantity: 2, stockBefore: 8, stockAfter: 10, reason: 'Order cancelled' });
    expect((await Product.findById(m.product._id)).stockCount).toBe(10);
  });
});
