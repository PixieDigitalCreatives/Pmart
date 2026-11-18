import React, { useMemo } from 'react';
import { Barcode } from '@/components/common/Barcode';

/**
 * SupermarketReceipt - Authentic Indian retail supermarket thermal receipt
 * inspired by DMart / Reliance Smart / More tax invoices (80mm thermal roll format).
 */
export const SupermarketReceipt = ({ invoice, settings = {}, lang = 'en' }) => {
  if (!invoice) return null;

  const seller = settings.businessName || invoice.shop?.name || 'PMART SUPERMARKET';
  const address1 = settings.businessAddress || invoice.shop?.address?.street || 'Shop No. 12-14, Main Market Road';
  const address2 = settings.businessCity || invoice.shop?.address?.city ? `${invoice.shop?.address?.city || 'Hyderabad'} - 500013` : 'Amberpet, Hyderabad - 500013';
  const phone = settings.businessPhone || invoice.shop?.phone || '040-27420336';
  const gstin = settings.gstin || '36AACCA8432H1ZR';
  const fssai = settings.fssai || '13620011000659';
  const cin = settings.cin || 'L51900MH2000PLC126473';

  // Group items into GST slabs (DMart signature layout)
  const { slabs, totalQty, totalItems, totalMrp, totalSavings } = useMemo(() => {
    const items = invoice.items || [];
    let qSum = 0;
    let mrpSum = 0;
    const slabMap = new Map();

    items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      qSum += q;
      const rate = Number(item.taxRate) || 0;
      const itemMrp = Number(item.mrp || item.unitPrice || 0) * q;
      mrpSum += itemMrp;

      if (!slabMap.has(rate)) {
        slabMap.set(rate, {
          rate,
          halfRate: (rate / 2).toFixed(2),
          items: [],
          taxable: 0,
          cgst: 0,
          sgst: 0,
          total: 0
        });
      }

      const slab = slabMap.get(rate);
      slab.items.push(item);
      const taxable = Number(item.taxableValue || (item.lineTotal - (item.taxAmount || 0))) || 0;
      const tax = Number(item.taxAmount || 0);
      slab.taxable += taxable;
      slab.cgst += tax / 2;
      slab.sgst += tax / 2;
      slab.total += Number(item.lineTotal || 0);
    });

    // Sort slabs by rate ascending (0%, 5%, 12%, 18%, 28%)
    const sortedSlabs = Array.from(slabMap.values()).sort((a, b) => a.rate - b.rate);

    const net = Number(invoice.netTotal || invoice.grandTotal || 0);
    const savings = Math.max(0, mrpSum - net);

    return {
      slabs: sortedSlabs,
      totalQty: qSum % 1 === 0 ? qSum : qSum.toFixed(3),
      totalItems: items.length,
      totalMrp: mrpSum,
      totalSavings: savings
    };
  }, [invoice]);

  const billDate = new Date(invoice.date || Date.now());
  const dateStr = billDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = billDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const primaryPayment = (invoice.payments && invoice.payments[0]) || {
    method: invoice.paymentMethod || 'CASH',
    amount: invoice.amountPaid || invoice.netTotal
  };

  return (
    <div className="supermarket-receipt">
      {/* 1. BRAND HEADER */}
      <div className="receipt-header text-center">
        <div className="receipt-logo">
          PMart
        </div>
        <div className="receipt-company font-bold">{seller} Ltd</div>
        <div className="receipt-meta-small">
          <div>CIN No : {cin}</div>
          <div>GSTIN : {gstin}</div>
          <div>FSSAI No : {fssai}</div>
        </div>
        <div className="receipt-store-title font-bold mt-1">
          PMART {invoice.shop?.name ? invoice.shop.name.toUpperCase() : 'AMBERPET'}
        </div>
        <div className="receipt-store-address">
          <div>{address1}</div>
          <div>{address2}</div>
          <div>Phone: {phone}</div>
        </div>
      </div>

      <div className="receipt-divider-dashed" />

      {/* 2. INVOICE META */}
      <div className="receipt-doc-title text-center font-bold">TAX INVOICE</div>
      <div className="receipt-meta-grid">
        <div className="receipt-meta-row">
          <span>Bill No : {invoice.number}</span>
          <span>Bill Dt : {dateStr} {timeStr}</span>
        </div>
        {invoice.customerName && (
          <div className="receipt-meta-row">
            <span>Customer : {invoice.customerName}</span>
            <span>{invoice.customerPhone || ''}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider-dashed" />

      {/* 3. ITEM COLUMNS HEADER */}
      <div className="receipt-items-head">
        <span className="col-hsn">HSN</span>
        <span className="col-part">Particulars</span>
        <span className="col-qty text-right">Qty/Kg</span>
        <span className="col-rate text-right">N/Rate</span>
        <span className="col-val text-right">Value</span>
      </div>

      {/* 4. ITEMS GROUPED BY GST SLABS */}
      <div className="receipt-items-body">
        {slabs.map((slab, sIdx) => (
          <div key={slab.rate} className="receipt-slab-group">
            <div className="receipt-slab-header font-bold">
              {sIdx + 1}) CGST @ {slab.halfRate}%, SGST @ {slab.halfRate}%
            </div>
            {slab.items.map((it, iIdx) => {
              const hsn = it.hsn || it.code || String(100000 + iIdx * 1111);
              const qtyVal = Number(it.quantity) % 1 === 0 ? it.quantity : Number(it.quantity).toFixed(3);
              const rateVal = Number(it.unitPrice || 0).toFixed(2);
              const valTotal = Number(it.lineTotal || 0).toFixed(2);
              const cleanName = String(it.name || '').toUpperCase().slice(0, 22);

              return (
                <div key={it.lineNo || iIdx} className="receipt-item-row">
                  <span className="col-hsn">{hsn}</span>
                  <span className="col-part" title={it.name}>{cleanName}</span>
                  <span className="col-qty text-right">{qtyVal}</span>
                  <span className="col-rate text-right">{rateVal}</span>
                  <span className="col-val text-right">{valTotal}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="receipt-divider-solid" />

      {/* 5. ITEMS & QUANTITY TOTAL */}
      <div className="receipt-summary-line font-bold">
        <span>Items: {totalItems}</span>
        <span>Qty: {totalQty}</span>
        <span className="text-right">{Number(invoice.netTotal || invoice.grandTotal || 0).toFixed(2)}</span>
      </div>

      <div className="receipt-divider-dashed" />

      {/* 6. GST BREAKUP DETAILS (AMOUNT INR) */}
      <div className="receipt-gst-box">
        <div className="text-center font-bold" style={{ fontSize: 11 }}>
          &lt;---------- GST Breakup Details ----------&gt; (Amount INR)
        </div>
        <div className="receipt-gst-table-head mt-1">
          <span>GST IND</span>
          <span className="text-right">Taxable</span>
          <span className="text-right">CGST</span>
          <span className="text-right">SGST</span>
          <span className="text-right">Total</span>
        </div>
        <div className="receipt-divider-dotted my-1" />
        {slabs.map((slab, sIdx) => (
          <div key={slab.rate} className="receipt-gst-row">
            <span>{sIdx + 1}</span>
            <span className="text-right">{slab.taxable.toFixed(2)}</span>
            <span className="text-right">{slab.cgst > 0 ? slab.cgst.toFixed(2) : '....'}</span>
            <span className="text-right">{slab.sgst > 0 ? slab.sgst.toFixed(2) : '....'}</span>
            <span className="text-right">{slab.total.toFixed(2)}</span>
          </div>
        ))}
        <div className="receipt-divider-dotted my-1" />
        <div className="receipt-gst-row font-bold">
          <span>T:</span>
          <span className="text-right">
            {slabs.reduce((acc, s) => acc + s.taxable, 0).toFixed(2)}
          </span>
          <span className="text-right">
            {slabs.reduce((acc, s) => acc + s.cgst, 0).toFixed(2)}
          </span>
          <span className="text-right">
            {slabs.reduce((acc, s) => acc + s.sgst, 0).toFixed(2)}
          </span>
          <span className="text-right">
            {Number(invoice.netTotal || invoice.grandTotal || 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="receipt-divider-dashed" />

      {/* 7. AMOUNT RECEIVED FROM CUSTOMER */}
      <div className="receipt-payment-box text-center">
        <div style={{ fontSize: 11 }}>&lt;----- Amount Received From Customer -----&gt;</div>
        <div className="receipt-tender-row font-bold mt-1">
          <span>{primaryPayment.method || 'UPI'} Payment :</span>
          <span>{Number(invoice.amountPaid || invoice.netTotal || 0).toFixed(2)} /-</span>
        </div>
        {invoice.outstanding > 0 && (
          <div className="receipt-tender-row font-bold text-red-600 mt-1">
            <span>Remaining Due :</span>
            <span>{Number(invoice.outstanding).toFixed(2)} /-</span>
          </div>
        )}
      </div>

      <div className="receipt-divider-solid" />

      {/* 8. DMART SIGNATURE CUSTOMER SAVINGS BANNER */}
      {totalSavings > 0 && (
        <div className="receipt-savings-banner text-center font-bold">
          ** Saved Rs. {totalSavings.toFixed(2)}/- On MRP **
        </div>
      )}

      {/* 9. BARCODE & FOOTER */}
      <div className="receipt-barcode-box text-center">
        <Barcode value={invoice.number} height={40} barWidth={1.5} showText={false} />
        <div className="receipt-small-note mt-1">This is computer generated invoice.</div>
      </div>

      <div className="receipt-divider-dashed" />
      <div className="receipt-footer-msg text-center font-bold">
        *** THANK YOU! VISIT AGAIN ***
      </div>
    </div>
  );
};

