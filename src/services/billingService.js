import api from './apiClient';
import { downloadFile } from './inventoryService';

const data = (res) => res.data.data;
const page = (res) => ({ rows: res.data.data, pagination: res.data.pagination, ...(res.data.summary ? { summary: res.data.summary } : {}) });

export const billingService = {
  dashboard: async () => data(await api.get('/billing/dashboard')),
  settings: async () => data(await api.get('/billing/settings')),
  customers: async (search) => data(await api.get('/billing/customers', { params: { search } })),

  createInvoice: async (body) => {
    const res = await api.post('/billing/invoices', body, { timeout: 30000 });
    return { invoice: res.data.data, replayed: res.data.replayed };
  },
  listInvoices: async (params) => page(await api.get('/billing/invoices', { params })),
  getInvoice: async (id) => data(await api.get(`/billing/invoices/${id}`)),
  invoiceMovements: async (id) => data(await api.get(`/billing/invoices/${id}/movements`)),
  recordPayment: async (id, body) => data(await api.post(`/billing/invoices/${id}/payments`, body)),
  recordRefund: async (id, body) => data(await api.post(`/billing/invoices/${id}/refunds`, body)),
  cancelInvoice: async (id, body) => data(await api.post(`/billing/invoices/${id}/cancel`, body)),
  returnItems: async (id, body) => data(await api.post(`/billing/invoices/${id}/returns`, body)),
  /** Admin only. Body: { reason, refundMethod? }. Returns { number, stockRestored, refunded, paymentsDeleted, replayed }. */
  deleteInvoice: async (id, body) => {
    const res = await api.delete(`/billing/invoices/${id}`, { data: body });
    return { ...res.data.data, replayed: res.data.replayed };
  },
  downloadPdf: (id, number) => downloadFile(`/billing/invoices/${id}/pdf`, { download: 1 }, `${number}.pdf`),
  /** Opens the PDF in a new tab (for printing from the browser's PDF viewer). */
  async openPdf(id) {
    const win = window.open('', '_blank');
    const res = await api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(res.data);
    if (win) win.location.href = url;
    else window.location.assign(url);
  },

  listPayments: async (params) => page(await api.get('/billing/payments', { params })),

  // Reports (reports.read)
  reportTypes: async () => data(await api.get('/reports')),
  report: async (type, params) => {
    const res = await api.get(`/reports/${type}`, { params, timeout: 60000 });
    return { report: res.data.data, pagination: res.data.pagination };
  },
  downloadReport: (type, params, format) => downloadFile(`/reports/${type}`, { ...params, format }, `pmart-${type}-${new Date().toISOString().slice(0, 10)}.${format}`)
};
