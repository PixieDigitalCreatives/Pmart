'use strict';

const PDFDocument = require('pdfkit');

// The built-in PDF fonts have no ₹ glyph, so amounts are printed as "Rs.".
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '');
const time = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

const STATUS_LABEL = { PAID: 'Paid', PARTIALLY_PAID: 'Partially paid', UNPAID: 'Unpaid', OVERDUE: 'Overdue', REFUNDED: 'Refunded', CANCELLED: 'Cancelled' };
const METHOD_LABEL = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', OTHER: 'Other' };

/** Writes an A4 invoice PDF for `invoice` to the writable stream `out` (an Express response). */
function renderInvoicePdf({ invoice, payments, billing = {}, shop }, out) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, info: { Title: `Invoice ${invoice.number}`, Author: billing.businessName || shop?.name || 'PMart' } });
  doc.pipe(out);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom - 40;
  const taxed = invoice.taxMode !== 'NONE';

  // ---- Seller and invoice header ----
  const seller = billing.businessName || shop?.name || 'PMart';
  const addr = billing.businessAddress || [shop?.address?.street, shop?.address?.area, shop?.address?.city, shop?.address?.state, shop?.address?.pincode].filter(Boolean).join(', ');
  doc.font('Helvetica-Bold').fontSize(16).text(seller, left, 36, { width: width * 0.6 });
  doc.font('Helvetica').fontSize(9);
  if (addr) doc.text(addr, { width: width * 0.6 });
  if (billing.businessPhone || shop?.phone) doc.text(`Phone: ${billing.businessPhone || shop.phone}`);
  if (billing.gstin) doc.text(`GSTIN: ${billing.gstin}`);
  const sellerBottom = doc.y;

  doc.font('Helvetica-Bold').fontSize(14).text(taxed ? 'TAX INVOICE' : 'INVOICE', left + width * 0.6, 36, { width: width * 0.4, align: 'right' });
  doc.font('Helvetica').fontSize(9);
  [
    `Invoice no: ${invoice.number}`,
    `Date: ${time(invoice.date)}`,
    invoice.dueDate && invoice.paymentStatus !== 'PAID' ? `Due: ${day(invoice.dueDate)}` : null,
    `Payment: ${STATUS_LABEL[invoice.displayStatus || invoice.paymentStatus] || invoice.paymentStatus}`
  ]
    .filter(Boolean)
    .forEach((line) => doc.text(line, left + width * 0.6, doc.y, { width: width * 0.4, align: 'right' }));
  if (invoice.status === 'CANCELLED') {
    doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`CANCELLED ${day(invoice.cancelledAt)}`, left + width * 0.6, doc.y, { width: width * 0.4, align: 'right' }).fillColor('black');
  }

  let y = Math.max(sellerBottom, doc.y) + 10;
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor('#cccccc').stroke();
  y += 8;
  doc.font('Helvetica-Bold').fontSize(9).text('Bill to', left, y);
  doc.font('Helvetica').text([invoice.customerName || 'Walk-in customer', invoice.customerPhone, invoice.customerGstin ? `GSTIN: ${invoice.customerGstin}` : null].filter(Boolean).join('   '), left + 50, y);
  y = doc.y + 10;

  // ---- Line items ----
  const cols = taxed
    ? [['#', 18, 'left'], ['Item', 170, 'left'], ['Qty', 40, 'right'], ['MRP', 50, 'right'], ['Rate', 50, 'right'], ['Disc', 45, 'right'], ['Tax %', 35, 'right'], ['Tax', 45, 'right'], ['Amount', 70, 'right']]
    : [['#', 18, 'left'], ['Item', 225, 'left'], ['Qty', 45, 'right'], ['MRP', 55, 'right'], ['Rate', 55, 'right'], ['Disc', 55, 'right'], ['Amount', 70, 'right']];
  const scale = width / cols.reduce((s, c) => s + c[1], 0);
  const colX = [];
  cols.reduce((x, c, i) => {
    colX[i] = x;
    return x + c[1] * scale;
  }, left);

  const header = () => {
    doc.rect(left, y, width, 16).fill('#f1f5f9').fillColor('black');
    doc.font('Helvetica-Bold').fontSize(8);
    cols.forEach(([label, w, align], i) => doc.text(label, colX[i] + 2, y + 4, { width: w * scale - 4, align }));
    y += 18;
  };
  header();
  doc.font('Helvetica').fontSize(8);
  invoice.items.forEach((item) => {
    const meta = [item.code && `Code ${item.code}`, item.barcode && `Barcode ${item.barcode}`, item.hsn && `HSN ${item.hsn}`].filter(Boolean).join('  ');
    const itemText = `${item.name}${item.unit ? ` (${item.unit})` : ''}`;
    const h = Math.max(doc.heightOfString(itemText, { width: cols[1][1] * scale - 4 }) + (meta ? 9 : 0), 12) + (item.returnedQuantity ? 9 : 0);
    if (y + h > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
      doc.font('Helvetica').fontSize(8);
    }
    const values = taxed
      ? [item.lineNo, null, num(item.quantity), rs(item.mrp), rs(item.unitPrice), rs(item.discount + item.invoiceDiscountShare), `${num(item.taxRate)}%`, rs(item.taxAmount), rs(item.lineTotal)]
      : [item.lineNo, null, num(item.quantity), rs(item.mrp), rs(item.unitPrice), rs(item.discount + item.invoiceDiscountShare), rs(item.lineTotal)];
    values.forEach((v, i) => {
      if (i === 1) {
        doc.font('Helvetica').fontSize(8).text(itemText, colX[1] + 2, y, { width: cols[1][1] * scale - 4 });
        if (meta) doc.fontSize(6.5).fillColor('#555555').text(meta, colX[1] + 2, doc.y, { width: cols[1][1] * scale - 4 }).fillColor('black').fontSize(8);
        if (item.returnedQuantity) doc.fontSize(6.5).fillColor('#b91c1c').text(`Returned: ${num(item.returnedQuantity)}`, colX[1] + 2, doc.y).fillColor('black').fontSize(8);
      } else {
        doc.text(String(v), colX[i] + 2, y, { width: cols[i][1] * scale - 4, align: cols[i][2] });
      }
    });
    y += h + 4;
    doc.moveTo(left, y - 2).lineTo(left + width, y - 2).strokeColor('#eeeeee').stroke();
  });

  // ---- Totals ----
  const totals = [
    ['Subtotal', invoice.subtotal],
    invoice.itemDiscountTotal ? ['Item discounts', -invoice.itemDiscountTotal] : null,
    invoice.invoiceDiscount ? ['Invoice discount', -invoice.invoiceDiscount] : null,
    taxed ? ['Taxable value', invoice.taxableTotal] : null,
    ...(taxed
      ? invoice.gstSplit === 'CGST_SGST'
        ? [[`C${invoice.taxLabel}`, invoice.taxTotal / 2], [`S${invoice.taxLabel}`, invoice.taxTotal / 2]]
        : [[invoice.gstSplit === 'IGST' ? `I${invoice.taxLabel}` : invoice.taxLabel, invoice.taxTotal]]
      : []),
    invoice.roundOff ? ['Round off', invoice.roundOff] : null,
    ['Grand total', invoice.grandTotal, true],
    invoice.returnedTotal ? ['Returned goods', -invoice.returnedTotal] : null,
    invoice.returnedTotal ? ['Net total', invoice.netTotal, true] : null,
    ['Paid', invoice.amountPaid],
    invoice.refundDue ? ['Refund due to customer', invoice.refundDue, true] : ['Outstanding', invoice.outstanding, true]
  ].filter(Boolean);
  if (y + totals.length * 13 + 20 > bottom()) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  y += 6;
  totals.forEach(([label, value, bold]) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(label, left + width - 230, y, { width: 140, align: 'right' });
    doc.text(rs(value), left + width - 90, y, { width: 90, align: 'right' });
    y += 13;
  });

  // ---- Payments ----
  if (payments.length) {
    y += 8;
    if (y + payments.length * 11 + 20 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font('Helvetica-Bold').fontSize(9).text('Payments', left, y);
    y += 13;
    doc.font('Helvetica').fontSize(8);
    payments.forEach((p) => {
      doc.text(`${time(p.receivedAt)}   ${p.kind === 'REFUND' ? 'Refund' : 'Payment'} — ${METHOD_LABEL[p.method] || p.method}${p.reference ? ` (${p.reference})` : ''}`, left, y, { width: width - 100 });
      doc.text(`${p.kind === 'REFUND' ? '-' : ''}${rs(p.amount)}`, left + width - 100, y, { width: 100, align: 'right' });
      y += 11;
    });
  }

  if (invoice.notes) doc.font('Helvetica').fontSize(8).text(`Note: ${invoice.notes}`, left, y + 8, { width });
  const footer = billing.invoiceFooter || '';
  if (footer) doc.font('Helvetica-Oblique').fontSize(8).text(footer, left, doc.page.height - doc.page.margins.bottom - 20, { width, align: 'center' });
  doc.end();
}

module.exports = { renderInvoicePdf };
