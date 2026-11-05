'use strict';

const { Product } = require('../catalog/catalog.model');
const { Settings } = require('../admin/settings.model');
const { InventoryTransaction, Restock, MovementType } = require('../inventory/inventory.model');
const { Invoice, Payment, InvoiceStatus } = require('../billing/billing.model');
const { displayPaymentStatus } = require('../billing/billing.calc');
const { badRequest } = require('../../utils/http-error');

const TZ = 'Asia/Kolkata';
const r2 = (n) => Math.round((n || 0) * 100) / 100;
const sum = (rows, key) => r2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

// Column helpers: [key, label, kind] where kind drives alignment and formatting (text | qty | money | date).
const col = (key, label, kind = 'text', weight = 1) => ({ key, label, kind, weight });

function range(query, field) {
  const out = {};
  if (query.from) out.$gte = new Date(`${query.from}T00:00:00+05:30`);
  if (query.to) out.$lte = new Date(`${query.to}T23:59:59.999+05:30`);
  ['$gte', '$lte'].forEach((k) => {
    if (out[k] && Number.isNaN(out[k].getTime())) throw badRequest('Dates must be YYYY-MM-DD', 'INVALID_DATE');
  });
  return Object.keys(out).length ? { [field]: out } : {};
}

const productColumns = [
  col('code', 'Code'),
  col('name', 'Product', 'text', 3),
  col('unit', 'Unit'),
  col('stockCount', 'Stock', 'qty'),
  col('mrp', 'MRP', 'money'),
  col('price', 'Selling price', 'money'),
  col('cost', 'Cost', 'money'),
  col('stockValue', 'Stock value', 'money'),
  col('company', 'Company', 'text', 2),
  col('rackNo', 'Rack'),
  col('barcode', 'Barcode', 'text', 1.5)
];
const PRODUCT_FIELDS = 'code name unit stockCount mrp price cost stockValue purRate company rackNo barcode';

async function productReport(filter, sort) {
  const rows = await Product.find(filter).select(PRODUCT_FIELDS).sort(sort).lean();
  return { columns: productColumns, rows, totals: { stockCount: sum(rows, 'stockCount'), stockValue: sum(rows, 'stockValue') } };
}

/** Each report: { title, dated (uses from/to), build(query) → { columns, rows, totals?, summary? } } */
const REPORTS = {
  inventory: { title: 'Current inventory', dated: false, build: () => productReport({}, { name: 1, code: 1 }) },

  'low-stock': {
    title: 'Low-stock products',
    dated: false,
    build: async () => {
      const { lowStockThreshold } = await Settings.getSingleton();
      const report = await productReport({ stockCount: { $gt: 0, $lte: lowStockThreshold } }, { stockCount: 1, name: 1 });
      return { ...report, summary: [`Threshold: ${lowStockThreshold}`] };
    }
  },

  'out-of-stock': { title: 'Out-of-stock products', dated: false, build: () => productReport({ stockCount: { $lte: 0 } }, { name: 1, code: 1 }) },

  'stock-valuation': {
    title: 'Stock valuation',
    dated: false,
    build: async () => {
      const products = await Product.find({ stockCount: { $gt: 0 } }).select(PRODUCT_FIELDS).lean();
      const rows = products
        .map((p) => ({
          code: p.code,
          name: p.name,
          stockCount: p.stockCount,
          cost: p.cost,
          costValue: r2(p.stockCount * (p.cost || 0)),
          purRate: p.purRate,
          purchaseValue: r2(p.stockCount * (p.purRate || 0)),
          mrp: p.mrp,
          mrpValue: r2(p.stockCount * (p.mrp || 0)),
          company: p.company
        }))
        .sort((a, b) => b.costValue - a.costValue);
      return {
        columns: [
          col('code', 'Code'),
          col('name', 'Product', 'text', 3),
          col('stockCount', 'Stock', 'qty'),
          col('cost', 'Cost', 'money'),
          col('costValue', 'Value at cost', 'money'),
          col('purRate', 'Purchase rate', 'money'),
          col('purchaseValue', 'Value at purchase rate', 'money'),
          col('mrp', 'MRP', 'money'),
          col('mrpValue', 'Value at MRP', 'money'),
          col('company', 'Company', 'text', 2)
        ],
        rows,
        totals: { stockCount: sum(rows, 'stockCount'), costValue: sum(rows, 'costValue'), purchaseValue: sum(rows, 'purchaseValue'), mrpValue: sum(rows, 'mrpValue') },
        summary: ['Products with stock above zero only.']
      };
    }
  },

  purchases: {
    title: 'Purchase history by supplier',
    dated: true,
    build: async (q) => {
      const rows = (
        await Restock.aggregate([
          { $match: range(q, 'createdAt') },
          {
            $group: {
              _id: { $ifNull: ['$supplierName', '(no supplier)'] },
              restocks: { $sum: 1 },
              received: { $sum: '$receivedQuantity' },
              free: { $sum: '$freeQuantity' },
              amount: { $sum: '$amount' },
              last: { $max: '$createdAt' }
            }
          },
          { $sort: { amount: -1 } }
        ])
      ).map((r) => ({ supplier: r._id, restocks: r.restocks, received: r.received, free: r.free, amount: r2(r.amount), last: r.last }));
      return {
        columns: [col('supplier', 'Supplier', 'text', 3), col('restocks', 'Restocks', 'qty'), col('received', 'Qty received', 'qty'), col('free', 'Free qty', 'qty'), col('amount', 'Purchase amount', 'money'), col('last', 'Last restock', 'date', 1.5)],
        rows,
        totals: { restocks: sum(rows, 'restocks'), received: sum(rows, 'received'), free: sum(rows, 'free'), amount: sum(rows, 'amount') }
      };
    }
  },

  restocks: {
    title: 'Restocking history',
    dated: true,
    build: async (q) => {
      const rows = await Restock.find(range(q, 'createdAt')).populate('user', 'name').sort({ createdAt: -1 }).lean();
      return {
        columns: [
          col('createdAt', 'Date', 'date', 1.5),
          col('number', 'Restock no.'),
          col('productCode', 'Code'),
          col('productName', 'Product', 'text', 3),
          col('receivedQuantity', 'Received', 'qty'),
          col('freeQuantity', 'Free', 'qty'),
          col('purchaseRate', 'Rate', 'money'),
          col('amount', 'Amount', 'money'),
          col('supplierName', 'Supplier', 'text', 2),
          col('referenceNumber', 'Reference'),
          col('userName', 'By')
        ],
        rows: rows.map((r) => ({ ...r, userName: r.user?.name || '' })),
        totals: { receivedQuantity: sum(rows, 'receivedQuantity'), freeQuantity: sum(rows, 'freeQuantity'), amount: sum(rows, 'amount') }
      };
    }
  },

  sales: {
    title: 'Sales history (invoices)',
    dated: true,
    build: async (q) => {
      const rows = (await Invoice.find(range(q, 'date')).select('-items -returns').sort({ date: -1 }).lean()).map((i) => ({ ...i, status: i.status === InvoiceStatus.CANCELLED ? 'CANCELLED' : displayPaymentStatus(i) }));
      const live = rows.filter((r) => r.status !== 'CANCELLED');
      return {
        columns: [
          col('date', 'Date', 'date', 1.5),
          col('number', 'Invoice'),
          col('customerName', 'Customer', 'text', 2),
          col('customerPhone', 'Phone', 'text', 1.3),
          col('grandTotal', 'Total', 'money'),
          col('returnedTotal', 'Returned', 'money'),
          col('netTotal', 'Net', 'money'),
          col('amountPaid', 'Paid', 'money'),
          col('outstanding', 'Outstanding', 'money'),
          col('status', 'Status', 'text', 1.3)
        ],
        rows,
        totals: { grandTotal: sum(live, 'grandTotal'), returnedTotal: sum(live, 'returnedTotal'), netTotal: sum(live, 'netTotal'), amountPaid: sum(live, 'amountPaid'), outstanding: sum(live, 'outstanding') },
        summary: ['Totals exclude cancelled invoices.']
      };
    }
  },

  'product-sales': {
    title: 'Product-wise sales',
    dated: true,
    build: async (q) => {
      const rows = (
        await Invoice.aggregate([
          { $match: { status: InvoiceStatus.FINALIZED, ...range(q, 'date') } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              code: { $first: '$items.code' },
              name: { $first: '$items.name' },
              unit: { $first: '$items.unit' },
              sold: { $sum: '$items.quantity' },
              returned: { $sum: '$items.returnedQuantity' },
              gross: { $sum: '$items.lineTotal' },
              returnedValue: { $sum: { $cond: [{ $gt: ['$items.quantity', 0] }, { $multiply: ['$items.lineTotal', { $divide: ['$items.returnedQuantity', '$items.quantity'] }] }, 0] } },
              invoices: { $sum: 1 }
            }
          },
          { $sort: { gross: -1 } }
        ])
      ).map((r) => ({ code: r.code, name: r.name, unit: r.unit, invoices: r.invoices, sold: r.sold, returned: r.returned, netQty: r.sold - r.returned, sales: r2(r.gross - r.returnedValue) }));
      return {
        columns: [col('code', 'Code'), col('name', 'Product', 'text', 3), col('unit', 'Unit'), col('invoices', 'Invoices', 'qty'), col('sold', 'Qty sold', 'qty'), col('returned', 'Returned', 'qty'), col('netQty', 'Net qty', 'qty'), col('sales', 'Net sales', 'money')],
        rows,
        totals: { sold: sum(rows, 'sold'), returned: sum(rows, 'returned'), netQty: sum(rows, 'netQty'), sales: sum(rows, 'sales') }
      };
    }
  },

  'daily-sales': { title: 'Daily sales', dated: true, build: (q) => periodSales(q, '%Y-%m-%d', 'Day') },
  'monthly-sales': { title: 'Monthly sales', dated: true, build: (q) => periodSales(q, '%Y-%m', 'Month') },

  collections: {
    title: 'Payment collection',
    dated: true,
    build: async (q) => {
      const rows = await Payment.find(range(q, 'receivedAt')).populate('recordedBy', 'name').sort({ receivedAt: -1 }).lean();
      const byMethod = {};
      rows.forEach((p) => {
        byMethod[p.method] = r2((byMethod[p.method] || 0) + (p.kind === 'REFUND' ? -p.amount : p.amount));
      });
      return {
        columns: [col('receivedAt', 'Date', 'date', 1.5), col('invoiceNumber', 'Invoice'), col('customerName', 'Customer', 'text', 2), col('kind', 'Type'), col('method', 'Method'), col('reference', 'Reference', 'text', 1.5), col('signedAmount', 'Amount', 'money'), col('by', 'Recorded by')],
        rows: rows.map((p) => ({ ...p, signedAmount: p.kind === 'REFUND' ? -p.amount : p.amount, by: p.recordedBy?.name || '' })),
        totals: { signedAmount: r2(rows.reduce((s, p) => s + (p.kind === 'REFUND' ? -p.amount : p.amount), 0)) },
        summary: Object.entries(byMethod).map(([m, v]) => `${m}: ${v.toFixed(2)}`)
      };
    }
  },

  outstanding: {
    title: 'Outstanding payments',
    dated: false,
    build: async () => {
      const now = Date.now();
      const rows = (await Invoice.find({ status: InvoiceStatus.FINALIZED, outstanding: { $gt: 0 } }).select('-items -returns').sort({ dueDate: 1 }).lean()).map((i) => ({
        ...i,
        status: displayPaymentStatus(i),
        daysOverdue: i.dueDate && new Date(i.dueDate).getTime() < now ? Math.floor((now - new Date(i.dueDate).getTime()) / 86400000) + 1 : 0
      }));
      return {
        columns: [col('number', 'Invoice'), col('date', 'Date', 'date', 1.5), col('customerName', 'Customer', 'text', 2), col('customerPhone', 'Phone', 'text', 1.3), col('netTotal', 'Net total', 'money'), col('amountPaid', 'Paid', 'money'), col('outstanding', 'Outstanding', 'money'), col('dueDate', 'Due', 'date', 1.5), col('daysOverdue', 'Days overdue', 'qty'), col('status', 'Status', 'text', 1.3)],
        rows,
        totals: { netTotal: sum(rows, 'netTotal'), amountPaid: sum(rows, 'amountPaid'), outstanding: sum(rows, 'outstanding') }
      };
    }
  },

  adjustments: {
    title: 'Inventory adjustments',
    dated: true,
    build: async (q) => {
      const rows = await InventoryTransaction.find({ type: MovementType.ADJUSTMENT, ...range(q, 'createdAt') }).populate('user', 'name').sort({ createdAt: -1 }).lean();
      return {
        columns: [col('createdAt', 'Date', 'date', 1.5), col('productCode', 'Code'), col('productName', 'Product', 'text', 3), col('stockBefore', 'Before', 'qty'), col('quantity', 'Change', 'qty'), col('stockAfter', 'After', 'qty'), col('reason', 'Reason', 'text', 3), col('by', 'By')],
        rows: rows.map((r) => ({ ...r, by: r.user?.name || '' })),
        totals: { quantity: sum(rows, 'quantity') }
      };
    }
  }
};

async function periodSales(q, format, label) {
  const match = { status: InvoiceStatus.FINALIZED, ...range(q, 'date') };
  const [sales, pay] = await Promise.all([
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$date', timezone: TZ } },
          invoices: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          discounts: { $sum: { $add: ['$itemDiscountTotal', '$invoiceDiscount'] } },
          tax: { $sum: '$taxTotal' },
          returned: { $sum: '$returnedTotal' },
          net: { $sum: '$netTotal' },
          outstanding: { $sum: '$outstanding' }
        }
      }
    ]),
    Payment.aggregate([
      { $match: range(q, 'receivedAt') },
      { $group: { _id: { $dateToString: { format, date: '$receivedAt', timezone: TZ } }, collected: { $sum: { $cond: [{ $eq: ['$kind', 'REFUND'] }, { $multiply: ['$amount', -1] }, '$amount'] } } } }
    ])
  ]);
  const collected = new Map(pay.map((p) => [p._id, p.collected]));
  const keys = [...new Set([...sales.map((s) => s._id), ...collected.keys()])].sort().reverse();
  const byKey = new Map(sales.map((s) => [s._id, s]));
  const rows = keys.map((k) => {
    const s = byKey.get(k) || {};
    return { period: k, invoices: s.invoices || 0, subtotal: r2(s.subtotal), discounts: r2(s.discounts), tax: r2(s.tax), returned: r2(s.returned), net: r2(s.net), collected: r2(collected.get(k)), outstanding: r2(s.outstanding) };
  });
  return {
    columns: [col('period', label), col('invoices', 'Invoices', 'qty'), col('subtotal', 'Subtotal', 'money'), col('discounts', 'Discounts', 'money'), col('tax', 'Tax', 'money'), col('returned', 'Returns', 'money'), col('net', 'Net sales', 'money'), col('collected', 'Collected', 'money'), col('outstanding', 'Outstanding now', 'money')],
    rows,
    totals: Object.fromEntries(['invoices', 'subtotal', 'discounts', 'tax', 'returned', 'net', 'collected', 'outstanding'].map((k) => [k, sum(rows, k)])),
    summary: ['Collected counts payments received in the period, whichever invoice they belong to.']
  };
}

async function buildReport(type, query) {
  const def = REPORTS[type];
  if (!def) throw badRequest(`Unknown report "${type}"`, 'UNKNOWN_REPORT');
  const result = await def.build(query);
  return { type, title: def.title, dated: def.dated, from: query.from || null, to: query.to || null, generatedAt: new Date(), ...result };
}

const REPORT_LIST = Object.entries(REPORTS).map(([type, d]) => ({ type, title: d.title, dated: d.dated }));

module.exports = { buildReport, REPORT_LIST };
