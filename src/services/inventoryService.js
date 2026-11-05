import api from './apiClient';

const data = (res) => res.data.data;
const page = (res) => ({ rows: res.data.data, pagination: res.data.pagination, ...(res.data.summary ? { summary: res.data.summary } : {}), ...(res.data.counts ? { counts: res.data.counts } : {}) });

/** A fresh key per user action, so a retried request is recognised by the server and never applied twice. */
export const newIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/** Saves a file returned by an authenticated GET. */
export async function downloadFile(url, params, fileName) {
  const res = await api.get(url, { params, responseType: 'blob', timeout: 120000 });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const inventoryService = {
  fields: async () => data(await api.get('/inventory/fields')),

  /** Exact barcode / product-code lookup used by every scanner. */
  lookup: async (code) => data(await api.get('/inventory/lookup', { params: { code } })),
  barcodeCheck: async (barcode, exclude) => data(await api.get('/inventory/barcode-check', { params: { barcode, exclude } })),
  externalLookup: async (barcode) => data(await api.get('/inventory/external-lookup', { params: { barcode }, timeout: 45000 })),
  exportCsv: () => downloadFile('/inventory/export.csv', {}, `pmart-inventory-${new Date().toISOString().slice(0, 10)}.csv`),

  // CSV import
  previewImport: async (body) => data(await api.post('/inventory/imports/preview', body, { timeout: 120000 })),
  commitImport: async (id, mapping) => {
    const res = await api.post(`/inventory/imports/${id}/commit`, { mapping }, { timeout: 300000 });
    return res.data.data;
  },
  listImports: async (params) => page(await api.get('/inventory/imports', { params })),
  getImport: async (id, params) => {
    const res = await api.get(`/inventory/imports/${id}`, { params });
    return { batch: res.data.data, pagination: res.data.pagination };
  },
  downloadImportReport: (id) => downloadFile(`/inventory/imports/${id}/report.csv`, {}, `import-report-${id}.csv`),

  // Restock, ledger, adjustments
  restock: async (body) => data(await api.post('/inventory/restocks', body)),
  listRestocks: async (params) => page(await api.get('/inventory/restocks', { params })),
  suppliers: async (search) => data(await api.get('/inventory/suppliers', { params: { search } })),
  adjust: async (body) => data(await api.post('/inventory/adjustments', body)),
  transactions: async (params) => page(await api.get('/inventory/transactions', { params })),

  // Images
  imageQueue: async (params) => page(await api.get('/inventory/images', { params })),
  productImages: async (id) => data(await api.get(`/inventory/products/${id}/images`)),
  findCandidates: async (body) => data(await api.post('/inventory/images/find-candidates', body, { timeout: 120000 })),
  uploadImage: async (id, body) => data(await api.post(`/inventory/products/${id}/images/upload`, body, { timeout: 60000 })),
  addImageUrl: async (id, body) => data(await api.post(`/inventory/products/${id}/images/url`, body)),
  approveImage: async (imageId) => data(await api.post(`/inventory/images/${imageId}/approve`, {}, { timeout: 45000 })),
  rejectImage: async (imageId, reason) => data(await api.post(`/inventory/images/${imageId}/reject`, { reason })),
  /** Object URL (or remote URL) to preview any image, including ones not yet approved. */
  async imagePreviewUrl(imageId) {
    const res = await api.get(`/inventory/images/${imageId}/file`, { responseType: 'blob' });
    if (res.data.type && res.data.type.includes('json')) return JSON.parse(await res.data.text()).data.remoteUrl;
    return URL.createObjectURL(res.data);
  }
};
