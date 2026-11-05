'use strict';

/**
 * Invoice arithmetic. Pure functions, mirrored line for line by src/utils/invoiceCalc.js in the web app so the
 * on-screen preview matches what the server stores. The server result is always the one that is saved.
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * lines: [{ quantity, unitPrice, discount, taxRate }]
 * options: { taxMode: 'NONE'|'EXCLUSIVE'|'INCLUSIVE', invoiceDiscount, roundTotal }
 *
 * Per line: gross = qty × price; line discount (capped at gross); the invoice discount is shared across lines in
 * proportion to their value after line discounts; tax is then added (EXCLUSIVE) or taken out (INCLUSIVE).
 */
function computeInvoice(lines, { taxMode = 'NONE', invoiceDiscount = 0, roundTotal = false } = {}) {
  const prepared = lines.map((l) => {
    const gross = round2(l.quantity * l.unitPrice);
    const discount = round2(Math.min(Math.max(l.discount || 0, 0), gross));
    return { ...l, gross, discount, afterLine: round2(gross - discount) };
  });
  const base = round2(prepared.reduce((s, l) => s + l.afterLine, 0));
  const totalShare = round2(Math.min(Math.max(invoiceDiscount || 0, 0), base));

  let allocated = 0;
  const lastIndex = prepared.reduce((idx, l, i) => (l.afterLine > 0 ? i : idx), -1);
  const items = prepared.map((l, i) => {
    let share = 0;
    if (totalShare > 0 && l.afterLine > 0) {
      share = i === lastIndex ? round2(totalShare - allocated) : round2((totalShare * l.afterLine) / base);
      allocated = round2(allocated + share);
    }
    const net = round2(l.afterLine - share);
    const rate = taxMode === 'NONE' ? 0 : Math.max(l.taxRate || 0, 0);
    let taxableValue = net;
    let taxAmount = 0;
    let lineTotal = net;
    if (taxMode === 'EXCLUSIVE') {
      taxAmount = round2((net * rate) / 100);
      lineTotal = round2(net + taxAmount);
    } else if (taxMode === 'INCLUSIVE') {
      taxableValue = round2(net / (1 + rate / 100));
      taxAmount = round2(net - taxableValue);
    }
    return { ...l, taxRate: rate, invoiceDiscountShare: share, taxableValue, taxAmount, lineTotal };
  });

  const sum = (key) => round2(items.reduce((s, l) => s + l[key], 0));
  const preRound = sum('lineTotal');
  const grandTotal = roundTotal ? Math.round(preRound) : preRound;
  return {
    items: items.map(({ gross, afterLine, ...rest }) => rest),
    subtotal: sum('gross'),
    itemDiscountTotal: sum('discount'),
    invoiceDiscount: totalShare,
    taxableTotal: sum('taxableValue'),
    taxTotal: sum('taxAmount'),
    roundOff: round2(grandTotal - preRound),
    grandTotal: round2(grandTotal)
  };
}

const EPS = 0.005;

/** Recomputes netTotal, outstanding, refundDue and paymentStatus from the totals on an invoice (mutates it). */
function applyPaymentState(inv) {
  inv.netTotal = round2(inv.grandTotal - (inv.returnedTotal || 0));
  const paid = round2(inv.amountPaid || 0);
  // A cancelled invoice is owed by nobody; anything still paid on it is due back to the customer.
  if (inv.status === 'CANCELLED') {
    inv.outstanding = 0;
    inv.refundDue = round2(Math.max(0, paid));
    inv.paymentStatus = 'CANCELLED';
    return inv;
  }
  inv.outstanding = round2(Math.max(0, inv.netTotal - paid));
  inv.refundDue = round2(Math.max(0, paid - inv.netTotal));
  if ((inv.returnedTotal || 0) > 0 && inv.netTotal <= EPS) inv.paymentStatus = 'REFUNDED';
  else if (inv.outstanding <= EPS) inv.paymentStatus = 'PAID';
  else if (paid > EPS) inv.paymentStatus = 'PARTIALLY_PAID';
  else inv.paymentStatus = 'UNPAID';
  return inv;
}

/** OVERDUE is not stored: an unpaid or partly paid invoice is overdue once its due date has passed. */
function displayPaymentStatus(inv, now = new Date()) {
  const open = inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIALLY_PAID';
  return open && inv.dueDate && new Date(inv.dueDate) < now ? 'OVERDUE' : inv.paymentStatus;
}

module.exports = { computeInvoice, applyPaymentState, displayPaymentStatus, round2, EPS };
