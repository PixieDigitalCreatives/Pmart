import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbUpload as Upload, TbFileDownload as FileDown, TbChevronLeft as ChevronLeft, TbAlertTriangle as AlertTriangle, TbCircleCheck as CheckCircle2, TbRefresh as RefreshCw } from 'react-icons/tb';
import { inventoryService } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Select, ConfirmDialog, LoadingState } from '@/components/ui';
import { Pagination } from '@/components/inventory/Pagination';
import { dateTime, qty, money } from '@/utils/format';
import '@/components/inventory/inventory.scss';

const OUTCOME = {
  FAILED: { label: 'Failed', className: 'badge-error' },
  DUPLICATE: { label: 'Duplicate (not imported)', className: 'badge-warning' },
  SKIPPED: { label: 'Skipped', className: 'badge-neutral' },
  CREATED: { label: 'Imported with warning', className: 'badge-info' }
};

const Totals = ({ totals, done }) => (
  <div className="kpi-grid mb-4">
    {[
      ['Rows in file', totals.rows],
      [done ? 'Imported' : 'Will be imported', totals.created],
      ['Duplicates', totals.duplicate],
      ['Failed', totals.failed],
      ['Skipped', totals.skipped],
      ['With warnings', totals.warnings]
    ].map(([label, value]) => (
      <div className="kpi-tile" key={label}>
        <div className="kpi-tile-label">{label}</div>
        <div className="kpi-tile-value">{Number(value || 0).toLocaleString('en-IN')}</div>
      </div>
    ))}
  </div>
);

const ReportTable = ({ rows }) => (
  <div className="pmart-table-wrapper overflow-x-auto">
    <table className="pmart-table is-dense">
      <thead>
        <tr>
          <th className="num">Row</th>
          <th>Code</th>
          <th>Name</th>
          <th>Result</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.row}-${r.outcome}`}>
            <td className="num">{r.row}</td>
            <td className="mono">{r.code ? `“${r.code}”` : '—'}</td>
            <td>{r.name || '—'}</td>
            <td>
              <span className={`badge ${OUTCOME[r.outcome]?.className}`}>{OUTCOME[r.outcome]?.label || r.outcome}</span>
            </td>
            <td className="text-sm">{(r.messages || []).join(' · ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Bulk import of the 17-column inventory CSV: upload → check mapping and preview → import → report. */
export const InventoryImportPage = () => {
  const toast = useToast();
  const [fields, setFields] = useState([]);
  const [file, setFile] = useState(null);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('FAILED');
  const [history, setHistory] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewPage, setViewPage] = useState(1);
  const [viewOutcome, setViewOutcome] = useState('');

  const loadHistory = () => inventoryService.listImports({ limit: 10 }).then(setHistory).catch(() => setHistory({ rows: [], pagination: {} }));
  useEffect(() => {
    inventoryService.fields().then(setFields).catch(() => setFields([]));
    loadHistory();
  }, []);

  const [viewData, setViewData] = useState(null);
  useEffect(() => {
    if (!viewing) return;
    inventoryService
      .getImport(viewing, { page: viewPage, limit: 100, outcome: viewOutcome || undefined })
      .then(setViewData)
      .catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, viewPage, viewOutcome]);

  const runPreview = async (text, nextMapping) => {
    setBusy(true);
    setError('');
    try {
      const data = await inventoryService.previewImport({ csv: text, fileName: file?.name, mapping: nextMapping });
      setPreview(data);
      setMapping(data.batch.mapping);
      setFilter(data.batch.totals.failed ? 'FAILED' : data.batch.totals.duplicate ? 'DUPLICATE' : 'CREATED');
    } catch (err) {
      setError(apiErrorMessage(err, 'The file could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result));
      runPreview(String(reader.result));
    };
    reader.onerror = () => setError('The file could not be read.');
    reader.readAsText(f);
  };

  const commit = async () => {
    setConfirm(false);
    setBusy(true);
    setError('');
    try {
      const batch = await inventoryService.commitImport(preview.batch._id, mapping);
      setResult(batch);
      setPreview(null);
      toast.success(`Imported ${batch.totals.created.toLocaleString('en-IN')} products`);
      loadHistory();
    } catch (err) {
      setError(apiErrorMessage(err, 'The import failed. Nothing was overwritten.'));
    } finally {
      setBusy(false);
    }
  };

  const mappedFields = new Set(Object.values(mapping));
  const report = (result || preview?.batch)?.report || [];
  const shown = report.filter((r) => r.outcome === filter).slice(0, 300);

  return (
    <div>
      <Link to="/admin/products" className="flex items-center gap-1 text-sm mb-3">
        <ChevronLeft size={16} />
        <span>Back to products</span>
      </Link>
      <PageHeader
        title="Import inventory CSV"
        subtitle="Products are matched on product code. Codes already in the store are reported as duplicates and never overwritten."
        action={
          <Button variant="secondary" onClick={() => inventoryService.exportCsv().catch((err) => toast.error(apiErrorMessage(err)))}>
            <FileDown size={16} style={{ marginRight: 6 }} />
            Export current inventory
          </Button>
        }
      />

      <Card className="mb-4">
        <label htmlFor="csv-file" className="block font-semibold mb-2">
          1. Choose the CSV file
        </label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
        <p className="muted-note mt-2">
          Expected columns: {fields.map((f) => f.column).join(', ')}. Other column names can be mapped below. Negative numbers are imported as 0; the original text of every column is kept with
          each product.
        </p>
        {busy && <LoadingState text={preview || !csv ? 'Working…' : 'Checking the file…'} />}
        {error && (
          <div className="alert alert-error mt-3">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {preview && !busy && (
        <>
          {preview.previouslyImported && (
            <div className="alert alert-warning mb-4">
              <AlertTriangle size={16} />
              <span>This exact file was imported before. Its products already exist and will be reported as duplicates.</span>
            </div>
          )}
          <Card className="mb-4">
            <h3 className="section-heading mb-2">2. Check the column mapping</h3>
            <div className="pmart-table-wrapper overflow-x-auto mb-3">
              <table className="pmart-table is-dense">
                <thead>
                  <tr>
                    <th>Column in file</th>
                    <th>Product field</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.batch.headers.map((h) => (
                    <tr key={h}>
                      <td className="mono">{h}</td>
                      <td>
                        <Select value={mapping[h] || ''} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })} aria-label={`Field for ${h}`} style={{ maxWidth: 280 }}>
                          <option value="">— Do not import —</option>
                          {fields.map((f) => (
                            <option key={f.field} value={f.field} disabled={mapping[h] !== f.field && mappedFields.has(f.field)}>
                              {f.label} ({f.column})
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" onClick={() => runPreview(csv, mapping)}>
              <RefreshCw size={16} style={{ marginRight: 6 }} />
              Re-check with this mapping
            </Button>
          </Card>

          <h3 className="section-heading mb-2">3. Preview</h3>
          <Totals totals={preview.batch.totals} />
          <div className="pmart-table-wrapper overflow-x-auto mb-4">
            <table className="pmart-table is-dense">
              <thead>
                <tr>
                  <th className="num">Row</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Unit</th>
                  <th className="num">Stock</th>
                  <th className="num">MRP</th>
                  <th className="num">Rate</th>
                  <th className="num">Pur. rate</th>
                  <th>Company</th>
                  <th>Rack</th>
                  <th>Barcode</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((r) => (
                  <tr key={r.row}>
                    <td className="num">{r.row}</td>
                    <td className="mono">{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.unit}</td>
                    <td className="num">{qty(r.stockCount)}</td>
                    <td className="num">{money(r.mrp)}</td>
                    <td className="num">{money(r.rate)}</td>
                    <td className="num">{money(r.purRate)}</td>
                    <td>{r.company}</td>
                    <td>{r.rackNo}</td>
                    <td className="mono">{r.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(preview || result) && !busy && report.length > 0 && (
        <Card className="mb-4">
          <div className="tab-bar">
            {Object.entries(OUTCOME).map(([key, o]) => (
              <Button key={key} size="sm" variant={filter === key ? 'dark' : 'secondary'} onClick={() => setFilter(key)}>
                {o.label} ({report.filter((r) => r.outcome === key).length.toLocaleString('en-IN')})
              </Button>
            ))}
          </div>
          {shown.length === 0 ? <p className="muted-note">Nothing here.</p> : <ReportTable rows={shown} />}
          {report.filter((r) => r.outcome === filter).length > shown.length && <p className="muted-note mt-2">Showing the first 300. Download the full report for all rows.</p>}
        </Card>
      )}

      {preview && !busy && (
        <div className="actions-row mb-4">
          <Button variant="primary" disabled={preview.batch.totals.created === 0} onClick={() => setConfirm(true)}>
            <Upload size={16} style={{ marginRight: 6 }} />
            Import {preview.batch.totals.created.toLocaleString('en-IN')} products
          </Button>
          <span className="muted-note">Imported products are not listed on the storefront until you assign a category and switch them on.</span>
        </div>
      )}

      {result && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={20} className="text-success" />
            <h3 className="section-heading">Import finished</h3>
          </div>
          <Totals totals={result.totals} done />
          <Button variant="secondary" onClick={() => inventoryService.downloadImportReport(result._id).catch((err) => toast.error(apiErrorMessage(err)))}>
            <FileDown size={16} style={{ marginRight: 6 }} />
            Download full report (CSV)
          </Button>
        </Card>
      )}

      <h3 className="section-heading mb-2 mt-4">Import history</h3>
      {!history ? (
        <LoadingState />
      ) : history.rows.length === 0 ? (
        <p className="muted-note">No imports yet.</p>
      ) : (
        <div className="pmart-table-wrapper overflow-x-auto">
          <table className="pmart-table is-dense">
            <thead>
              <tr>
                <th>When</th>
                <th>File</th>
                <th>Status</th>
                <th className="num">Rows</th>
                <th className="num">Imported</th>
                <th className="num">Duplicates</th>
                <th className="num">Failed</th>
                <th>By</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.rows.map((b) => (
                <tr key={b._id}>
                  <td>{dateTime(b.committedAt || b.createdAt)}</td>
                  <td>{b.fileName || '—'}</td>
                  <td>{b.status === 'PREVIEW' ? 'Preview only' : b.status.replace('_', ' ').toLowerCase()}</td>
                  <td className="num">{b.totals.rows.toLocaleString('en-IN')}</td>
                  <td className="num">{b.status === 'COMMITTED' ? b.totals.created.toLocaleString('en-IN') : '—'}</td>
                  <td className="num">{b.totals.duplicate}</td>
                  <td className="num">{b.totals.failed}</td>
                  <td>{b.createdBy?.name || '—'}</td>
                  <td>
                    {b.status === 'COMMITTED' && (
                      <div className="actions-row">
                        <Button size="sm" variant="secondary" onClick={() => { setViewPage(1); setViewOutcome(''); setViewing(b._id); }}>
                          View report
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => inventoryService.downloadImportReport(b._id).catch((err) => toast.error(apiErrorMessage(err)))}>
                          CSV
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && viewData && (
        <Card className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="section-heading">Report: {viewData.batch.fileName}</h3>
            <Button size="sm" variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
          </div>
          <Totals totals={viewData.batch.totals} done />
          <div className="tab-bar">
            {[['', 'All'], ...Object.entries(OUTCOME).map(([k, o]) => [k, o.label])].map(([k, label]) => (
              <Button key={k || 'all'} size="sm" variant={viewOutcome === k ? 'dark' : 'secondary'} onClick={() => { setViewOutcome(k); setViewPage(1); }}>
                {label}
              </Button>
            ))}
          </div>
          <ReportTable rows={viewData.batch.report} />
          <Pagination page={viewData.pagination.page} pages={viewData.pagination.pages} total={viewData.pagination.total} onChange={setViewPage} />
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={commit}
        title="Import these products?"
        message={`${preview?.batch.totals.created.toLocaleString('en-IN')} new products will be created. Duplicates and failed rows are skipped; no existing product is changed.`}
        confirmText="Import"
      />
    </div>
  );
};
