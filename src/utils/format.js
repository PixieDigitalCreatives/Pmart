const IN = 'en-IN';
const TZ = 'Asia/Kolkata';

export const money = (n) => `₹${Number(n || 0).toLocaleString(IN, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const qty = (n) => Number(n || 0).toLocaleString(IN, { maximumFractionDigits: 3 });
export const dateTime = (d) => (d ? new Date(d).toLocaleString(IN, { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const date = (d) => (d ? new Date(d).toLocaleDateString(IN, { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : '—');
/** Today's date in IST as YYYY-MM-DD (for date inputs). */
export const todayIso = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' }
];
export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m;

export const PAYMENT_STATUS = {
  PAID: { label: 'Paid', type: 'success' },
  PARTIALLY_PAID: { label: 'Partially paid', type: 'warning' },
  UNPAID: { label: 'Unpaid', type: 'neutral' },
  OVERDUE: { label: 'Overdue', type: 'error' },
  REFUNDED: { label: 'Refunded', type: 'info' },
  CANCELLED: { label: 'Cancelled', type: 'error' }
};

export const MOVEMENT_LABEL = {
  OPENING: 'Opening stock',
  RESTOCK: 'Restock',
  SALE: 'Invoice sale',
  SALE_REVERSAL: 'Invoice cancelled',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  ONLINE_ORDER: 'Online order',
  ONLINE_ORDER_REVERSAL: 'Online order restored'
};

/** Product images are served by the API; prefix relative /api paths when the API lives on another origin. */
export const assetUrl = (url) => {
  if (!url || !url.startsWith('/api/')) return url;
  const base = import.meta.env.VITE_API_BASE_URL;
  return base && /^https?:\/\//.test(base) ? `${base.replace(/\/api\/?$/, '')}${url}` : url;
};
