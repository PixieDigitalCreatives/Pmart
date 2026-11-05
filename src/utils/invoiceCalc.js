/**
 * On-screen invoice preview. Mirrors backend/src/modules/billing/billing.calc.js line for line; the server's
 * calculation is what gets saved, so keep the two identical.
 */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeInvoice(lines, { taxMode = 'NONE', invoiceDiscount = 0, roundTotal = false } = {}) {
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
    items,
    subtotal: sum('gross'),
    itemDiscountTotal: sum('discount'),
    invoiceDiscount: totalShare,
    taxableTotal: sum('taxableValue'),
    taxTotal: sum('taxAmount'),
    roundOff: round2(grandTotal - preRound),
    grandTotal: round2(grandTotal)
  };
}
