'use strict';

const { Product } = require('../catalog/catalog.model');
const { Settings } = require('../admin/settings.model');
const { Invoice, Payment, Customer, InvoiceStatus } = require('./billing.model');
const { applyStockChange } = require('../inventory/inventory.service');
const { MovementType, RefType, nextSequence } = require('../inventory/inventory.model');
const { AuditLog, AuditAction } = require('../admin/audit.model');
const { computeInvoice, applyPaymentState, round2, EPS } = require('./billing.calc');
const { normalizeMobileNumber, isValidMobile } = require('../../utils/auth');
const { startOfDayIST } = require('../../utils/time');
const { badRequest, conflict, forbidden, notFound } = require('../../utils/http-error');

const DAY_MS = 24 * 60 * 60 * 1000;
const round3 = (n) => Math.round(n * 1000) / 1000;

/** End of the IST day `days` after `from` (an invoice due "today" is overdue only from tomorrow). */
function dueDateAfter(days, from = new Date()) {
  return new Date(startOfDayIST(from).getTime() + (days + 1) * DAY_MS - 1);
}

function normalizePhone(raw) {
  if (!raw) return '';
  const phone = normalizeMobileNumber(raw);
  if (!isValidMobile(phone)) throw badRequest('Enter a valid customer mobile number', 'INVALID_PHONE');
  return phone;
}

async function upsertCustomer(shopId, { name, phone, gstin }, session) {
  if (!phone) return null;
  const set = {};
  if (name) set.name = name;
  if (gstin) set.gstin = gstin;
  return Customer.findOneAndUpdate(
    { shop: shopId, phone },
    { $set: set, $setOnInsert: { shop: shopId, phone } },
    { upsert: true, new: true, session }
  );
}

async function addPayment(session, invoice, { amount, method, reference, note, receivedAt, idempotencyKey, kind = 'PAYMENT' }, user) {
  const value = round2(amount);
  const [payment] = await Payment.create(
    [
      {
        shop: invoice.shop,
        invoice: invoice._id,
        invoiceNumber: invoice.number,
        customer: invoice.customer,
        customerName: invoice.customerName,
        kind,
        amount: value,
        method,
        reference: reference || undefined,
        note: note || undefined,
        receivedAt: receivedAt || new Date(),
        recordedBy: user._id,
        idempotencyKey
      }
    ],
    { session }
  );
  if (kind === 'REFUND') {
    invoice.amountPaid = round2(invoice.amountPaid - value);
    invoice.refundedTotal = round2((invoice.refundedTotal || 0) + value);
  } else {
    invoice.amountPaid = round2(invoice.amountPaid + value);
  }
  return payment;
}

/**
 * Creates and finalises an invoice: numbers it, deducts stock for every line (one ledger row each) and records
 * any payments taken at the counter. Runs inside the caller's transaction and is idempotent on idempotencyKey.
 *
 * perms: { priceOverride, negativeStock } — what the user may do (checked by the controller).
 */
async function createInvoice(session, input, user, perms) {
  const existing = await Invoice.findOne({ idempotencyKey: input.idempotencyKey }).session(session);
  if (existing) return { invoice: existing, replayed: true };

  const settings = (await Settings.getSingleton(session)).billing || {};
  const allowNegative = Boolean(settings.allowNegativeStock) || Boolean(input.allowNegativeStock && perms.negativeStock);
  if (input.allowNegativeStock && !perms.negativeStock && !settings.allowNegativeStock) {
    throw forbidden('Only an administrator can bill below zero stock', 'NEGATIVE_STOCK_FORBIDDEN');
  }
  const ids = [...new Set(input.items.map((l) => l.product))].sort();
  const products = await Product.find({ _id: { $in: ids } }).session(session);
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) throw conflict('Some products no longer exist', 'PRODUCT_NOT_FOUND', { productIds: missing });

  const overrides =
    (input.invoiceDiscount || 0) > 0 ||
    input.items.some((l) => (l.discount || 0) > 0 || (l.unitPrice != null && round2(l.unitPrice) !== byId.get(l.product).price) || l.taxRate != null);
  if (overrides && !perms.priceOverride) {
    throw forbidden('You are not allowed to change prices, discounts or tax rates', 'PRICE_OVERRIDE_FORBIDDEN');
  }
  const shops = new Set(products.map((p) => String(p.shop)));
  if (shops.size !== 1) throw badRequest('All items on an invoice must belong to the same store', 'MULTIPLE_SHOPS');
  const shopId = products[0].shop;

  const taxMode = input.taxMode || settings.taxMode || 'NONE';
  const lines = input.items.map((l, i) => {
    const p = byId.get(l.product);
    const unitPrice = l.unitPrice != null ? round2(l.unitPrice) : p.price;
    if (!(unitPrice > 0) && l.unitPrice == null) {
      throw badRequest(`${p.name} has no selling price. Set its selling rate or MRP first.`, 'NO_PRICE', { productId: String(p._id) });
    }
    return {
      lineNo: i + 1,
      product: p._id,
      code: p.code,
      barcode: p.barcode,
      name: p.name,
      unit: p.unit,
      hsn: p.hsn,
      quantity: round3(l.quantity),
      mrp: p.mrp || 0,
      listPrice: p.price,
      unitPrice,
      discount: round2(l.discount || 0),
      taxRate: l.taxRate != null ? l.taxRate : p.taxRate != null ? p.taxRate : settings.defaultTaxRate || 0
    };
  });
  const totals = computeInvoice(lines, { taxMode, invoiceDiscount: input.invoiceDiscount || 0, roundTotal: Boolean(settings.roundTotal) });

  const customerPhone = normalizePhone(input.customerPhone);
  const customer = await upsertCustomer(shopId, { name: input.customerName, phone: customerPhone, gstin: input.customerGstin }, session);
  const seq = await nextSequence(`invoice:${shopId}`, session);
  const date = new Date();
  const [invoice] = await Invoice.create(
    [
      {
        shop: shopId,
        number: `${settings.invoicePrefix || 'INV'}-${String(seq).padStart(6, '0')}`,
        date,
        taxMode,
        taxLabel: settings.taxLabel || 'GST',
        gstSplit: taxMode === 'NONE' ? 'NONE' : settings.gstSplit || 'NONE',
        customer: customer ? customer._id : undefined,
        customerName: input.customerName || (customer && customer.name) || undefined,
        customerPhone: customerPhone || undefined,
        customerGstin: input.customerGstin || undefined,
        ...totals,
        amountPaid: 0,
        dueDate: input.dueDate ? new Date(input.dueDate) : dueDateAfter(settings.paymentTermsDays || 0, date),
        notes: input.notes || undefined,
        negativeStockAllowedBy: input.allowNegativeStock && perms.negativeStock ? user._id : undefined,
        priceOverridden: lines.some((l) => l.unitPrice !== l.listPrice) || totals.itemDiscountTotal > 0 || totals.invoiceDiscount > 0,
        idempotencyKey: input.idempotencyKey,
        createdBy: user._id
      }
    ],
    { session }
  );

  for (const line of invoice.items) {
    const moved = await applyStockChange(session, {
      productId: line.product,
      delta: -line.quantity,
      type: MovementType.SALE,
      refType: RefType.INVOICE,
      refId: invoice._id,
      refNumber: invoice.number,
      user,
      dedupeKey: `INV:${invoice._id}:L${line.lineNo}:SALE`,
      unitCost: byId.get(String(line.product)).cost,
      allowNegative
    });
    if (!moved) {
      const current = await Product.findById(line.product).select('stockCount name').session(session);
      throw conflict(`Only ${current.stockCount} ${line.unit || ''} of ${line.name} in stock`.replace(/\s+/g, ' '), 'INSUFFICIENT_STOCK', {
        productId: String(line.product),
        available: current.stockCount
      });
    }
  }

  const payments = input.payments || [];
  const paying = round2(payments.reduce((s, p) => s + p.amount, 0));
  if (paying > invoice.grandTotal + EPS) throw badRequest(`Payments (₹${paying}) exceed the invoice total (₹${invoice.grandTotal})`, 'OVERPAYMENT');
  for (let i = 0; i < payments.length; i += 1) {
    await addPayment(session, invoice, { ...payments[i], idempotencyKey: `${input.idempotencyKey}:P${i + 1}` }, user);
  }
  applyPaymentState(invoice);
  await invoice.save({ session });
  return { invoice, replayed: false };
}

async function loadInvoice(session, id) {
  const invoice = await Invoice.findById(id).session(session);
  if (!invoice) throw notFound('Invoice not found');
  return invoice;
}

/** Records a payment against an invoice; never more than what is outstanding. Idempotent on idempotencyKey. */
async function recordPayment(session, invoiceId, input, user) {
  const prior = await Payment.findOne({ idempotencyKey: input.idempotencyKey }).session(session);
  if (prior) return { invoice: await loadInvoice(session, prior.invoice), payment: prior, replayed: true };

  const invoice = await loadInvoice(session, invoiceId);
  if (invoice.status === InvoiceStatus.CANCELLED) throw conflict('This invoice is cancelled', 'INVOICE_CANCELLED');
  applyPaymentState(invoice);
  if (invoice.outstanding <= EPS) throw conflict('This invoice is already fully paid', 'ALREADY_PAID');
  if (round2(input.amount) > invoice.outstanding + EPS) {
    throw badRequest(`Amount exceeds the outstanding balance of ₹${invoice.outstanding}`, 'OVERPAYMENT');
  }
  const payment = await addPayment(session, invoice, input, user);
  applyPaymentState(invoice);
  await invoice.save({ session });
  return { invoice, payment, replayed: false };
}

/** Refunds money owed back after a return (up to refundDue). */
async function recordRefund(session, invoiceId, input, user) {
  const prior = await Payment.findOne({ idempotencyKey: input.idempotencyKey }).session(session);
  if (prior) return { invoice: await loadInvoice(session, prior.invoice), payment: prior, replayed: true };
  const invoice = await loadInvoice(session, invoiceId);
  applyPaymentState(invoice);
  if (round2(input.amount) > invoice.refundDue + EPS) throw badRequest(`Only ₹${invoice.refundDue} is due back to the customer`, 'REFUND_TOO_LARGE');
  const payment = await addPayment(session, invoice, { ...input, kind: 'REFUND' }, user);
  applyPaymentState(invoice);
  await invoice.save({ session });
  return { invoice, payment, replayed: false };
}

/**
 * Puts back the stock of every line, less anything already returned. The ledger dedupe key is the same for cancel
 * and delete, so an invoice's stock can only ever be put back once.
 */
async function restoreStock(session, invoice, reason, user) {
  for (const line of invoice.items) {
    const qty = round3(line.quantity - (line.returnedQuantity || 0));
    if (qty <= 0) continue;
    await applyStockChange(session, {
      productId: line.product,
      delta: qty,
      type: MovementType.SALE_REVERSAL,
      refType: RefType.INVOICE,
      refId: invoice._id,
      refNumber: invoice.number,
      reason,
      user,
      dedupeKey: `INV:${invoice._id}:L${line.lineNo}:CANCEL`,
      allowNegative: true
    });
  }
}

/**
 * Cancels an invoice: puts back the stock of every line (less anything already returned) and refunds what was
 * paid. A second cancel is a no-op.
 */
async function cancelInvoice(session, invoiceId, { reason, refundMethod, idempotencyKey }, user) {
  const invoice = await loadInvoice(session, invoiceId);
  if (invoice.status === InvoiceStatus.CANCELLED) return { invoice, replayed: true };
  if (invoice.amountPaid > EPS && !refundMethod) throw badRequest('Choose how the paid amount is refunded', 'REFUND_METHOD_REQUIRED');

  await restoreStock(session, invoice, `Invoice cancelled: ${reason}`, user);
  if (invoice.amountPaid > EPS) {
    await addPayment(session, invoice, { amount: invoice.amountPaid, method: refundMethod, note: `Refund on cancellation: ${reason}`, idempotencyKey: `${idempotencyKey}:refund`, kind: 'REFUND' }, user);
  }
  invoice.status = InvoiceStatus.CANCELLED;
  invoice.cancelledAt = new Date();
  invoice.cancelledBy = user._id;
  invoice.cancelReason = reason;
  applyPaymentState(invoice);
  await invoice.save({ session });
  return { invoice, replayed: false };
}

/**
 * Returns some quantity of one or more lines: stock goes back, the invoice's net total drops by the lines'
 * proportional value, and (optionally) the amount now owed back is refunded at once.
 */
async function returnItems(session, invoiceId, { items, reason, refundMethod, idempotencyKey }, user) {
  const invoice = await loadInvoice(session, invoiceId);
  const prior = invoice.returns.find((r) => r.idempotencyKey === idempotencyKey);
  if (prior) return { invoice, ret: prior, replayed: true };
  if (invoice.status === InvoiceStatus.CANCELLED) throw conflict('This invoice is cancelled', 'INVOICE_CANCELLED');

  const returnNo = invoice.returns.length + 1;
  const retItems = [];
  let amount = 0;
  for (const { lineNo, quantity } of items) {
    const line = invoice.items.find((l) => l.lineNo === lineNo);
    if (!line) throw badRequest(`Line ${lineNo} is not on this invoice`, 'INVALID_LINE');
    const qty = round3(quantity);
    const left = round3(line.quantity - (line.returnedQuantity || 0));
    if (qty <= 0 || qty > left + 0.0005) throw badRequest(`Line ${lineNo}: at most ${left} can be returned`, 'RETURN_TOO_LARGE');
    const value = round2((line.lineTotal * qty) / line.quantity);
    line.returnedQuantity = round3((line.returnedQuantity || 0) + qty);
    retItems.push({ lineNo, quantity: qty, amount: value });
    amount = round2(amount + value);
    await applyStockChange(session, {
      productId: line.product,
      delta: qty,
      type: MovementType.RETURN,
      refType: RefType.INVOICE,
      refId: invoice._id,
      refNumber: `${invoice.number}-R${returnNo}`,
      reason,
      user,
      dedupeKey: `INV:${invoice._id}:RET:${idempotencyKey}:L${lineNo}`,
      allowNegative: true
    });
  }
  invoice.returns.push({ number: `${invoice.number}-R${returnNo}`, items: retItems, amount, reason, user: user._id, idempotencyKey });
  invoice.returnedTotal = round2((invoice.returnedTotal || 0) + amount);
  applyPaymentState(invoice);
  if (refundMethod && invoice.refundDue > EPS) {
    await addPayment(session, invoice, { amount: invoice.refundDue, method: refundMethod, note: `Refund for return ${invoice.number}-R${returnNo}`, idempotencyKey: `${idempotencyKey}:refund`, kind: 'REFUND' }, user);
    applyPaymentState(invoice);
  }
  await invoice.save({ session });
  return { invoice, ret: invoice.returns[invoice.returns.length - 1], replayed: false };
}

/**
 * Permanently deletes an invoice. One that is not cancelled yet is cancelled first: its stock goes back through the
 * ledger and everything paid on it is refunded (refundMethod). Then the invoice and its payment / refund rows are
 * removed. Ledger rows stay, so the stock history still adds up, and an audit entry written in the same transaction
 * keeps a snapshot of what was deleted. The invoice number is not reused. Repeating a delete that succeeded is a no-op.
 */
async function deleteInvoice(session, invoiceId, { reason, refundMethod }, user, { ipAddress } = {}) {
  const invoice = await Invoice.findById(invoiceId).session(session);
  if (!invoice) {
    const prior = await AuditLog.findOne({ resource: 'Invoice', resourceId: String(invoiceId), action: AuditAction.DELETE }).session(session);
    if (prior) return { snapshot: prior.details, replayed: true };
    throw notFound('Invoice not found');
  }
  const wasCancelled = invoice.status === InvoiceStatus.CANCELLED;
  const refunded = wasCancelled ? 0 : round2(invoice.amountPaid);
  if (refunded > EPS && !refundMethod) throw badRequest('Choose how the paid amount is refunded', 'REFUND_METHOD_REQUIRED');

  if (!wasCancelled) await restoreStock(session, invoice, `Invoice deleted: ${reason}`, user);
  const payments = await Payment.find({ invoice: invoice._id }).sort({ receivedAt: 1 }).session(session).lean();
  await Payment.deleteMany({ invoice: invoice._id }, { session });
  await Invoice.deleteOne({ _id: invoice._id }, { session });

  const snapshot = {
    number: invoice.number,
    date: invoice.date,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    grandTotal: invoice.grandTotal,
    returnedTotal: invoice.returnedTotal,
    netTotal: invoice.netTotal,
    amountPaid: invoice.amountPaid,
    createdBy: invoice.createdBy,
    cancelledAt: invoice.cancelledAt,
    cancelReason: invoice.cancelReason,
    reason,
    stockRestored: !wasCancelled,
    refunded,
    refundMethod: refunded > EPS ? refundMethod : undefined,
    items: invoice.items.map((l) => ({ lineNo: l.lineNo, product: l.product, code: l.code, name: l.name, quantity: l.quantity, returnedQuantity: l.returnedQuantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    returns: invoice.returns.map((r) => ({ number: r.number, date: r.date, amount: r.amount, reason: r.reason })),
    payments: payments.map((p) => ({ kind: p.kind, amount: p.amount, method: p.method, reference: p.reference, receivedAt: p.receivedAt }))
  };
  await AuditLog.create([{ user: user._id, action: AuditAction.DELETE, resource: 'Invoice', resourceId: String(invoice._id), details: snapshot, ipAddress }], { session });
  return { snapshot, replayed: false };
}

module.exports = { createInvoice, recordPayment, recordRefund, cancelInvoice, returnItems, deleteInvoice, dueDateAfter };
