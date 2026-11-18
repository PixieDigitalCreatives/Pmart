'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const InvoiceStatus = Object.freeze({ FINALIZED: 'FINALIZED', CANCELLED: 'CANCELLED' });

/** Stored payment states. OVERDUE is derived at read time (unpaid or partly paid past the due date). */
const PaymentStatus = Object.freeze({
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
});

const PaymentMethod = Object.freeze({
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER'
});

const TaxMode = Object.freeze({ NONE: 'NONE', EXCLUSIVE: 'EXCLUSIVE', INCLUSIVE: 'INCLUSIVE' });

const money = { type: Number, default: 0 };

// ---------- Walk-in customers ----------

const CustomerSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    address: { type: String, trim: true, maxlength: 300 },
    shippingAddress: { type: String, trim: true, maxlength: 300 },
    customerType: { type: String, enum: ['RETAIL', 'WHOLESALE'], default: 'RETAIL' },
    creditLimit: { type: Number, default: 0, min: 0 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15 }
  },
  { timestamps: true }
);

CustomerSchema.index({ shop: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
CustomerSchema.index({ shop: 1, name: 1 });

const Customer = mongoose.model('Customer', CustomerSchema);

// ---------- Invoices ----------

const InvoiceItemSchema = new Schema(
  {
    lineNo: { type: Number, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    code: { type: String },
    barcode: { type: String },
    name: { type: String, required: true },
    unit: { type: String },
    hsn: { type: String },
    quantity: { type: Number, required: true, min: 0.001 },
    mrp: money,
    // Product selling price when billed; differs from unitPrice only when an authorised user changed the price.
    listPrice: money,
    unitPrice: { type: Number, required: true, min: 0 },
    // Line discount (absolute amount) and this line's share of the invoice-level discount.
    discount: money,
    invoiceDiscountShare: money,
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxableValue: money,
    taxAmount: money,
    lineTotal: money,
    returnedQuantity: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const ReturnSchema = new Schema(
  {
    number: { type: String, required: true },
    date: { type: Date, default: Date.now },
    items: [{ _id: false, lineNo: Number, quantity: Number, amount: Number }],
    amount: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 300 },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    idempotencyKey: { type: String }
  },
  { _id: true }
);

const InvoiceSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    number: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.FINALIZED },
    taxMode: { type: String, enum: Object.values(TaxMode), default: TaxMode.NONE },
    taxLabel: { type: String, default: 'GST' },
    gstSplit: { type: String, enum: ['NONE', 'CGST_SGST', 'IGST'], default: 'NONE' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, trim: true, maxlength: 120 },
    customerPhone: { type: String, trim: true, maxlength: 20 },
    customerGstin: { type: String, trim: true, uppercase: true, maxlength: 15 },
    items: { type: [InvoiceItemSchema], validate: (v) => Array.isArray(v) && v.length > 0 },
    // Sum of quantity × unit price, before any discount or tax.
    subtotal: money,
    itemDiscountTotal: money,
    invoiceDiscount: money,
    taxableTotal: money,
    taxTotal: money,
    roundOff: money,
    grandTotal: money,
    // Value of returned goods; netTotal = grandTotal − returnedTotal is what the customer owes.
    returnedTotal: money,
    netTotal: money,
    // Payments received minus refunds given.
    amountPaid: money,
    refundedTotal: money,
    outstanding: money,
    // Amount owed back to the customer (returns after payment) that has not been refunded yet.
    refundDue: money,
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.UNPAID },
    dueDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
    negativeStockAllowedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    priceOverridden: { type: Boolean, default: false },
    returns: { type: [ReturnSchema], default: [] },
    idempotencyKey: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

InvoiceSchema.index({ shop: 1, number: 1 }, { unique: true });
InvoiceSchema.index({ idempotencyKey: 1 }, { unique: true });
InvoiceSchema.index({ shop: 1, date: -1 });
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ paymentStatus: 1, date: -1 });
InvoiceSchema.index({ status: 1, date: -1 });
InvoiceSchema.index({ customer: 1, date: -1 });
InvoiceSchema.index({ customerPhone: 1 });
InvoiceSchema.index({ 'items.product': 1, date: -1 });
InvoiceSchema.index({ 'returns.idempotencyKey': 1 }, { unique: true, partialFilterExpression: { 'returns.idempotencyKey': { $type: 'string' } } });

const Invoice = mongoose.model('Invoice', InvoiceSchema);

// ---------- Payments and refunds ----------

const PaymentSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    invoiceNumber: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    kind: { type: String, enum: ['PAYMENT', 'REFUND'], default: 'PAYMENT' },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: Object.values(PaymentMethod), required: true },
    reference: { type: String, trim: true, maxlength: 80 },
    note: { type: String, trim: true, maxlength: 300 },
    receivedAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true }
  },
  { timestamps: true }
);

PaymentSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ invoice: 1, receivedAt: 1 });
PaymentSchema.index({ shop: 1, receivedAt: -1 });
PaymentSchema.index({ receivedAt: -1 });
PaymentSchema.index({ method: 1, receivedAt: -1 });

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { Invoice, Payment, Customer, InvoiceStatus, PaymentStatus, PaymentMethod, TaxMode };
