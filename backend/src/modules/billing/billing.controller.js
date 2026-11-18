'use strict';

const mongoose = require('mongoose');
const { Invoice, Payment, Customer, InvoiceStatus, PaymentStatus, PaymentMethod, TaxMode } = require('./billing.model');
const { Product } = require('../catalog/catalog.model');
const { Order, OrderStatus } = require('../order/order.model');
const { Settings } = require('../admin/settings.model');
const { InventoryTransaction } = require('../inventory/inventory.model');
const service = require('./billing.service');
const { displayPaymentStatus } = require('./billing.calc');
const { renderInvoicePdf } = require('./invoice-pdf');
const { dateRange } = require('../inventory/inventory.controller');
const { hasPermission } = require('../../middleware/auth.middleware');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { runInTransaction } = require('../../utils/transaction');
const { scanVariants } = require('../../utils/barcode');
const { escapeRegExp } = require('../../utils/regex');
const { startOfDayIST } = require('../../utils/time');
const { z, assertObjectId, parsePagination, parseSearch } = require('../../utils/validation');
const { notFound } = require('../../utils/http-error');
const { memoryCache } = require('../../utils/cache');

const idempotencyKey = z.string().trim().min(8).max(100);
const amount = z.number().finite().positive('Amount must be above 0').max(10000000);
const method = z.enum(Object.values(PaymentMethod));

const paymentInput = z.object({
  amount,
  method,
  reference: z.string().trim().max(80).optional().or(z.literal('')),
  note: z.string().trim().max(300).optional().or(z.literal(''))
});

const invoiceSchema = z.object({
  idempotencyKey,
  items: z
    .array(
      z.object({
        product: z.string().min(1),
        quantity: z.number().finite().positive('Quantity must be above 0').max(100000),
        unitPrice: z.number().finite().min(0).max(10000000).optional().nullable(),
        discount: z.number().finite().min(0).max(10000000).optional(),
        taxRate: z.number().finite().min(0).max(100).optional().nullable()
      })
    )
    .min(1, 'Add at least one product')
    .max(300, 'At most 300 lines per invoice'),
  taxMode: z.enum(Object.values(TaxMode)).optional(),
  invoiceDiscount: z.number().finite().min(0).max(10000000).optional(),
  customerName: z.string().trim().max(120).optional().or(z.literal('')),
  customerPhone: z.string().trim().max(20).optional().or(z.literal('')),
  customerGstin: z.string().trim().toUpperCase().regex(/^([0-9A-Z]{15})?$/, 'GSTIN must be 15 letters/digits').optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  dueDate: z.string().optional(),
  allowNegativeStock: z.boolean().optional(),
  payments: z.array(paymentInput).max(5).optional()
});

const decorate = (inv) => {
  const o = inv.toObject ? inv.toObject() : inv;
  return { ...o, displayStatus: displayPaymentStatus(o) };
};

/** Filters for the invoice list (also used by the reports). */
async function invoiceFilter(query) {
  const filter = { ...dateRange(query, 'date') };
  if (query.shop) filter.shop = assertObjectId(query.shop, 'shop id');
  if (query.customer) filter.customer = assertObjectId(query.customer, 'customer id');
  const status = String(query.paymentStatus || '');
  if (status === PaymentStatus.OVERDUE) {
    filter.status = InvoiceStatus.FINALIZED;
    filter.paymentStatus = { $in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] };
    filter.dueDate = { $lt: new Date() };
  } else if (Object.values(PaymentStatus).includes(status)) {
    filter.paymentStatus = status;
  }
  if (query.method && Object.values(PaymentMethod).includes(query.method)) {
    filter._id = { $in: await Payment.distinct('invoice', { method: query.method, kind: 'PAYMENT' }) };
  }
  if (query.product) {
    // A scanned barcode / product code narrows the list to invoices containing that product.
    const code = String(query.product).trim();
    const ids = await Product.distinct('_id', { $or: [{ barcodes: { $in: scanVariants(code) } }, { codeKey: code.toUpperCase() }] });
    filter['items.product'] = { $in: ids };
  }
  const search = parseSearch(query.search);
  if (search) {
    const rx = { $regex: escapeRegExp(search), $options: 'i' };
    filter.$or = [{ number: rx }, { customerName: rx }, { customerPhone: rx }];
  }
  return filter;
}

class BillingController {
  static async settings(req, res) {
    const s = await Settings.getSingleton();
    res.json({
      success: true,
      data: {
        ...s.billing.toObject(),
        canOverridePrice: hasPermission(req.user, 'billing.price_override'),
        canAllowNegativeStock: hasPermission(req.user, 'inventory.negative_stock')
      }
    });
  }

  static async createInvoice(req, res) {
    const data = invoiceSchema.parse(req.body);
    data.items.forEach((l) => assertObjectId(l.product, 'product id'));
    const perms = { priceOverride: hasPermission(req.user, 'billing.price_override'), negativeStock: hasPermission(req.user, 'inventory.negative_stock') };
    let result;
    try {
      result = await runInTransaction((session) => service.createInvoice(session, data, req.user, perms));
    } catch (err) {
      // Two identical requests racing: the loser hits the unique idempotency index and gets the winner's invoice.
      if (err.code === 11000 && err.keyPattern && err.keyPattern.idempotencyKey) {
        const existing = await Invoice.findOne({ idempotencyKey: data.idempotencyKey });
        if (existing) return res.json({ success: true, data: decorate(existing), replayed: true });
      }
      throw err;
    }
    if (!result.replayed) {
      await recordAudit(req, AuditAction.CREATE, 'Invoice', result.invoice._id, {
        number: result.invoice.number,
        grandTotal: result.invoice.grandTotal,
        lines: result.invoice.items.length,
        ...(result.invoice.priceOverridden ? { priceOverridden: true } : {}),
        ...(result.invoice.negativeStockAllowedBy ? { negativeStockAllowed: true } : {})
      });
      memoryCache.delByPrefix('catalog:');
    }
    res.status(result.replayed ? 200 : 201).json({ success: true, data: decorate(result.invoice), replayed: result.replayed });
  }

  static async listInvoices(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
    const filter = await invoiceFilter(req.query);
    const sortKey = { date: { date: -1 }, total: { grandTotal: -1, date: -1 }, outstanding: { outstanding: -1, date: -1 }, number: { number: -1 } }[req.query.sort] || { date: -1 };
    const [rows, total] = await Promise.all([
      Invoice.find(filter).select('-items -returns').populate('createdBy', 'name').sort(sortKey).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter)
    ]);
    res.json({ success: true, data: rows.map(decorate), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  static async getInvoice(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name').populate('cancelledBy', 'name').populate('shop', 'name phone address').lean();
    if (!invoice) throw notFound('Invoice not found');
    const payments = await Payment.find({ invoice: invoice._id }).populate('recordedBy', 'name').sort({ receivedAt: 1 }).lean();
    res.json({ success: true, data: { ...decorate(invoice), payments } });
  }

  static async invoicePdf(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const invoice = await Invoice.findById(req.params.id).populate('shop', 'name phone address').lean();
    if (!invoice) throw notFound('Invoice not found');
    const [payments, settings] = await Promise.all([Payment.find({ invoice: invoice._id }).sort({ receivedAt: 1 }).lean(), Settings.getSingleton()]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${invoice.number}.pdf"`);
    renderInvoicePdf({ invoice: decorate(invoice), payments, billing: settings.billing, shop: invoice.shop }, res);
  }

  static async recordPayment(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const data = paymentInput.extend({ idempotencyKey, receivedAt: z.string().optional() }).parse(req.body);
    const input = { ...data, receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined };
    const result = await runInTransaction((session) => service.recordPayment(session, req.params.id, input, req.user));
    if (!result.replayed) await recordAudit(req, AuditAction.CREATE, 'Payment', result.payment._id, { invoice: result.invoice.number, amount: data.amount, method: data.method });
    res.status(result.replayed ? 200 : 201).json({ success: true, data: { invoice: decorate(result.invoice), payment: result.payment }, replayed: result.replayed });
  }

  static async recordRefund(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const data = paymentInput.extend({ idempotencyKey }).parse(req.body);
    const result = await runInTransaction((session) => service.recordRefund(session, req.params.id, data, req.user));
    if (!result.replayed) await recordAudit(req, AuditAction.CREATE, 'Refund', result.payment._id, { invoice: result.invoice.number, amount: data.amount, method: data.method });
    res.status(result.replayed ? 200 : 201).json({ success: true, data: { invoice: decorate(result.invoice), payment: result.payment }, replayed: result.replayed });
  }

  static async cancelInvoice(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const data = z.object({ reason: z.string().trim().min(3, 'Give a reason for cancelling').max(300), refundMethod: method.optional(), idempotencyKey }).parse(req.body);
    const result = await runInTransaction((session) => service.cancelInvoice(session, req.params.id, data, req.user));
    if (!result.replayed) {
      await recordAudit(req, AuditAction.UPDATE, 'Invoice', result.invoice._id, { cancelled: true, number: result.invoice.number, reason: data.reason });
      memoryCache.delByPrefix('catalog:');
    }
    res.json({ success: true, data: decorate(result.invoice), replayed: result.replayed });
  }

  /** Admin only. Cancels the invoice first if needed (stock back, refund), then removes it and its payments. */
  static async deleteInvoice(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const data = z.object({ reason: z.string().trim().min(3, 'Give a reason for deleting').max(300), refundMethod: method.optional() }).parse(req.body || {});
    const result = await runInTransaction((session) => service.deleteInvoice(session, req.params.id, data, req.user, { ipAddress: req.ip }));
    if (!result.replayed) memoryCache.delByPrefix('catalog:');
    const s = result.snapshot;
    res.json({
      success: true,
      data: { _id: req.params.id, number: s.number, deleted: true, stockRestored: s.stockRestored, refunded: s.refunded, refundMethod: s.refundMethod, paymentsDeleted: s.payments.length },
      replayed: result.replayed
    });
  }

  static async returnItems(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const data = z
      .object({
        items: z.array(z.object({ lineNo: z.number().int().min(1), quantity: z.number().finite().positive() })).min(1),
        reason: z.string().trim().min(3, 'Give a reason for the return').max(300),
        refundMethod: method.optional(),
        idempotencyKey
      })
      .parse(req.body);
    const result = await runInTransaction((session) => service.returnItems(session, req.params.id, data, req.user));
    if (!result.replayed) {
      await recordAudit(req, AuditAction.UPDATE, 'Invoice', result.invoice._id, { return: result.ret.number, amount: result.ret.amount, reason: data.reason });
      memoryCache.delByPrefix('catalog:');
    }
    res.json({ success: true, data: decorate(result.invoice), replayed: result.replayed });
  }

  static async listPayments(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const filter = { ...dateRange(req.query, 'receivedAt') };
    if (req.query.method && Object.values(PaymentMethod).includes(req.query.method)) filter.method = req.query.method;
    if (req.query.kind === 'PAYMENT' || req.query.kind === 'REFUND') filter.kind = req.query.kind;
    if (req.query.invoice) filter.invoice = assertObjectId(req.query.invoice, 'invoice id');
    if (req.query.customer) filter.customer = assertObjectId(req.query.customer, 'customer id');
    const search = parseSearch(req.query.search);
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ invoiceNumber: rx }, { customerName: rx }, { reference: rx }];
    }
    const [rows, total, summary] = await Promise.all([
      Payment.find(filter).populate('recordedBy', 'name').sort({ receivedAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([{ $match: filter }, { $group: { _id: { kind: '$kind', method: '$method' }, amount: { $sum: '$amount' }, count: { $sum: 1 } } }])
    ]);
    res.json({ success: true, data: rows, summary, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  static async customers(req, res) {
    const search = parseSearch(req.query.search);
    const filter = {};
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ name: rx }, { phone: rx }];
    }
    const customers = await Customer.find(filter).sort({ updatedAt: -1 }).limit(req.query.all ? 100 : 25).lean();
    const balances = await Invoice.aggregate([
      { $match: { customer: { $in: customers.map((c) => c._id) }, status: InvoiceStatus.FINALIZED } },
      { $group: { _id: '$customer', outstanding: { $sum: '$outstanding' }, invoices: { $sum: 1 }, totalPurchases: { $sum: '$netTotal' } } }
    ]);
    const byId = new Map(balances.map((b) => [String(b._id), b]));
    res.json({
      success: true,
      data: customers.map((c) => ({
        ...c,
        outstanding: byId.get(String(c._id))?.outstanding || 0,
        invoices: byId.get(String(c._id))?.invoices || 0,
        totalPurchases: byId.get(String(c._id))?.totalPurchases || 0
      }))
    });
  }

  static async createCustomer(req, res) {
    const data = z
      .object({
        name: z.string().trim().min(1, 'Name is required').max(120),
        phone: z.string().trim().min(5, 'Valid phone required').max(20),
        email: z.string().trim().email().optional().or(z.literal('')),
        address: z.string().trim().max(300).optional().or(z.literal('')),
        shippingAddress: z.string().trim().max(300).optional().or(z.literal('')),
        customerType: z.enum(['RETAIL', 'WHOLESALE']).optional().default('RETAIL'),
        creditLimit: z.number().min(0).optional().default(0),
        gstin: z.string().trim().uppercase().max(15).optional().or(z.literal(''))
      })
      .parse(req.body);

    const { Shop } = require('../shop/shop.model');
    const defaultShop = await Shop.findOne().select('_id').lean();
    const shopId = req.user?.shop || defaultShop?._id;
    if (!shopId) throw badRequest('No store found to associate customer');

    let customer = await Customer.findOne({ shop: shopId, phone: data.phone });
    if (customer) {
      Object.assign(customer, data);
      await customer.save();
    } else {
      customer = await Customer.create({ ...data, shop: shopId });
    }
    res.status(201).json({ success: true, data: customer });
  }

  static async getCustomer(req, res) {
    assertObjectId(req.params.id, 'customer id');
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw notFound('Customer not found');

    const [invoices, payments, stats] = await Promise.all([
      Invoice.find({ customer: customer._id, status: InvoiceStatus.FINALIZED }).sort({ date: -1 }).limit(50).lean(),
      Payment.find({ customer: customer._id }).sort({ receivedAt: -1 }).limit(50).lean(),
      Invoice.aggregate([
        { $match: { customer: customer._id, status: InvoiceStatus.FINALIZED } },
        { $group: { _id: null, totalPurchases: { $sum: '$netTotal' }, outstanding: { $sum: '$outstanding' }, count: { $sum: 1 } } }
      ])
    ]);

    const stat = stats[0] || { totalPurchases: 0, outstanding: 0, count: 0 };
    res.json({
      success: true,
      data: {
        ...customer,
        totalPurchases: stat.totalPurchases,
        outstanding: stat.outstanding,
        invoicesCount: stat.count,
        invoices,
        payments
      }
    });
  }

  static async updateCustomer(req, res) {
    assertObjectId(req.params.id, 'customer id');
    const data = z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        phone: z.string().trim().min(5).max(20).optional(),
        email: z.string().trim().email().optional().or(z.literal('')),
        address: z.string().trim().max(300).optional().or(z.literal('')),
        shippingAddress: z.string().trim().max(300).optional().or(z.literal('')),
        customerType: z.enum(['RETAIL', 'WHOLESALE']).optional(),
        creditLimit: z.number().min(0).optional(),
        gstin: z.string().trim().uppercase().max(15).optional().or(z.literal(''))
      })
      .parse(req.body);

    const customer = await Customer.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
    if (!customer) throw notFound('Customer not found');
    res.json({ success: true, data: customer });
  }

  static async getCustomerStatement(req, res) {
    assertObjectId(req.params.id, 'customer id');
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw notFound('Customer not found');

    const [invoices, payments] = await Promise.all([
      Invoice.find({ customer: customer._id, status: InvoiceStatus.FINALIZED }).sort({ date: 1 }).lean(),
      Payment.find({ customer: customer._id }).sort({ receivedAt: 1 }).lean()
    ]);

    const entries = [];
    for (const inv of invoices) {
      entries.push({
        date: inv.date,
        type: 'INVOICE',
        ref: inv.number,
        description: `Invoice ${inv.number}`,
        debit: inv.netTotal,
        credit: 0
      });
      if (inv.returns && inv.returns.length > 0) {
        for (const ret of inv.returns) {
          entries.push({
            date: ret.date,
            type: 'RETURN',
            ref: ret.number || inv.number,
            description: `Sales Return (${ret.reason || 'Returned'})`,
            debit: 0,
            credit: ret.amount
          });
        }
      }
    }
    for (const p of payments) {
      entries.push({
        date: p.receivedAt,
        type: p.kind === 'REFUND' ? 'REFUND' : 'PAYMENT',
        ref: p.invoiceNumber,
        description: `${p.kind === 'REFUND' ? 'Refund' : 'Payment'} (${p.method})`,
        debit: p.kind === 'REFUND' ? p.amount : 0,
        credit: p.kind === 'PAYMENT' ? p.amount : 0
      });
    }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    const ledger = entries.map((e) => {
      balance = Math.round((balance + (e.debit || 0) - (e.credit || 0)) * 100) / 100;
      return { ...e, balance };
    });

    res.json({
      success: true,
      data: {
        customer,
        currentBalance: balance,
        statementDate: new Date(),
        ledger
      }
    });
  }

  static async listOutstandings(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
    const search = parseSearch(req.query.search);

    const match = { status: InvoiceStatus.FINALIZED, outstanding: { $gt: 0.005 } };
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      match.$or = [{ customerName: rx }, { customerPhone: rx }, { number: rx }];
    }

    const [rows, total, summary] = await Promise.all([
      Invoice.find(match)
        .populate('customer', 'name phone address creditLimit customerType')
        .sort({ dueDate: 1, date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(match),
      Invoice.aggregate([
        { $match: { status: InvoiceStatus.FINALIZED, outstanding: { $gt: 0.005 } } },
        { $group: { _id: null, totalOutstanding: { $sum: '$outstanding' }, totalInvoices: { $sum: 1 } } }
      ])
    ]);

    const now = new Date();
    const decorated = rows.map((inv) => ({
      ...inv,
      isOverdue: Boolean(inv.dueDate && new Date(inv.dueDate) < now)
    }));

    res.json({
      success: true,
      data: decorated,
      summary: summary[0] || { totalOutstanding: 0, totalInvoices: 0 },
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  }

  /** Billing overview: sales, collections, outstanding balances, best sellers and low stock. */
  static async dashboard(req, res) {
    const today = startOfDayIST();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const live = { status: InvoiceStatus.FINALIZED };
    const settings = await Settings.getSingleton();

    const [sales, todaySales, byStatus, overdue, collected, todayCollected, onlineOrders, recentPayments, recentInvoices, topProducts, lowStock] = await Promise.all([
      Invoice.aggregate([{ $match: live }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$netTotal' }, outstanding: { $sum: '$outstanding' } } }]),
      Invoice.aggregate([{ $match: { ...live, date: { $gte: today } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$netTotal' } } }]),
      Invoice.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 }, outstanding: { $sum: '$outstanding' } } }]),
      Invoice.aggregate([
        { $match: { ...live, paymentStatus: { $in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] }, dueDate: { $lt: now } } },
        { $group: { _id: null, count: { $sum: 1 }, outstanding: { $sum: '$outstanding' } } }
      ]),
      Payment.aggregate([{ $group: { _id: '$kind', amount: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { receivedAt: { $gte: today } } }, { $group: { _id: '$kind', amount: { $sum: '$amount' } } }]),
      Order.countDocuments({ status: { $nin: [OrderStatus.CANCELLED, OrderStatus.REJECTED] } }),
      Payment.find().sort({ receivedAt: -1 }).limit(8).select('invoice invoiceNumber customerName kind amount method receivedAt').lean(),
      Invoice.find().sort({ date: -1 }).limit(8).select('number date customerName grandTotal netTotal outstanding paymentStatus status dueDate').lean(),
      Invoice.aggregate([
        { $match: { ...live, date: { $gte: monthAgo } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, code: { $first: '$items.code' }, quantity: { $sum: { $subtract: ['$items.quantity', '$items.returnedQuantity'] } }, sales: { $sum: '$items.lineTotal' } } },
        { $sort: { quantity: -1 } },
        { $limit: 10 }
      ]),
      Product.find({ stockCount: { $gt: 0, $lte: settings.lowStockThreshold } }).select('name code unit stockCount rackNo').sort({ stockCount: 1, name: 1 }).limit(10).lean()
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s]));
    const totalPaidIn = collected.find((c) => c._id === 'PAYMENT')?.amount || 0;
    const totalRefunded = collected.find((c) => c._id === 'REFUND')?.amount || 0;
    const todayPaidIn = todayCollected.find((c) => c._id === 'PAYMENT')?.amount || 0;
    const todayRefunded = todayCollected.find((c) => c._id === 'REFUND')?.amount || 0;
    const [lowStockCount, outOfStockCount] = await Promise.all([
      Product.countDocuments({ stockCount: { $gt: 0, $lte: settings.lowStockThreshold } }),
      Product.countDocuments({ stockCount: { $lte: 0 } })
    ]);

    res.json({
      success: true,
      data: {
        totalOrders: onlineOrders + (sales[0]?.count || 0),
        onlineOrders,
        totalInvoices: sales[0]?.count || 0,
        totalSales: sales[0]?.total || 0,
        todaySales: todaySales[0]?.total || 0,
        todayInvoices: todaySales[0]?.count || 0,
        todayCollected: Math.round((todayPaidIn - todayRefunded) * 100) / 100,
        collected: Math.round((todayPaidIn - todayRefunded) * 100) / 100,
        totalCollected: Math.round((totalPaidIn - totalRefunded) * 100) / 100,
        refunded: totalRefunded,
        outstanding: sales[0]?.outstanding || 0,
        paidCount: statusMap.PAID?.count || 0,
        partiallyPaid: { count: statusMap.PARTIALLY_PAID?.count || 0, outstanding: statusMap.PARTIALLY_PAID?.outstanding || 0 },
        unpaid: { count: statusMap.UNPAID?.count || 0, outstanding: statusMap.UNPAID?.outstanding || 0 },
        overdue: { count: overdue[0]?.count || 0, outstanding: overdue[0]?.outstanding || 0 },
        cancelledCount: statusMap.CANCELLED?.count || 0,
        refundedCount: statusMap.REFUNDED?.count || 0,
        recentPayments,
        recentInvoices: recentInvoices.map(decorate),
        topProducts,
        lowStock,
        lowStockCount,
        outOfStockCount,
        lowStockThreshold: settings.lowStockThreshold
      }
    });
  }

  /** Stock movements of one invoice (for the invoice page's audit section). */
  static async invoiceMovements(req, res) {
    assertObjectId(req.params.id, 'invoice id');
    const rows = await InventoryTransaction.find({ refId: new mongoose.Types.ObjectId(req.params.id) }).populate('user', 'name').sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: rows });
  }
}

module.exports = { BillingController, invoiceFilter };
