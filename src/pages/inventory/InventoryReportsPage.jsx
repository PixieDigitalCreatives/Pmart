import React, { useEffect, useState } from 'react';
import { TbFileDownload as FileDown, TbFileText as FileText } from 'react-icons/tb';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Button, Input, Select, LoadingState, EmptyState } from '@/components/ui';
import { Pagination } from '@/components/inventory/Pagination';
import { money, qty, dateTime, todayIso } from '@/utils/format';
import '@/components/inventory/inventory.scss';

const cell = (row, c) => {
  const v = row[c.key];
  if (v === undefined || v === null || v === '') return '—';
  if (c.kind === 'money') return money(v);
  if (c.kind === 'qty') return qty(v);
  if (c.kind === 'date') return dateTime(v);
  return String(v);
};

const monthStart = () => `${todayIso().slice(0, 8)}01`;

/** Inventory, purchase, sales and payment reports with CSV and PDF export. */
export const InventoryReportsPage = () => {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('inventory');
  const [range, setRange] = useState({ from: monthStart(), to: todayIso() });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    billingService.reportTypes().then(setTypes).catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const def = types.find((t) => t.type === type);
  const params = def?.dated ? { from: range.from || undefined, to: range.to || undefined } : {};

  useEffect(() => {
    if (!types.length) return;
    setLoading(true);
    billingService
      .report(type, { ...params, page, limit: 100 })
      .then(setData)
      .catch((err) => toast.error(apiErrorMessage(err, 'Could not build the report.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, range, page, types.length]);

  const exportAs = async (format) => {
    setExporting(format);
    try {
      await billingService.downloadReport(type, params, format);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting('');
    }
  };

  const report = data?.report;
  return (
    <div>
      <PageHeader title="Inventory and sales reports" subtitle="Figures come straight from products, the stock ledger, invoices and payments." />
      <div className="toolbar">
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Report" style={{ width: 260 }}>
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {t.title}
            </option>
          ))}
        </Select>
        {def?.dated && (
          <>
            <Input type="date" value={range.from} onChange={(e) => { setRange({ ...range, from: e.target.value }); setPage(1); }} aria-label="From date" style={{ width: 150 }} />
            <Input type="date" value={range.to} onChange={(e) => { setRange({ ...range, to: e.target.value }); setPage(1); }} aria-label="To date" style={{ width: 150 }} />
          </>
        )}
        <div className="toolbar-grow" />
        <Button variant="secondary" isLoading={exporting === 'csv'} onClick={() => exportAs('csv')}>
          <FileDown size={16} style={{ marginRight: 6 }} />
          CSV
        </Button>
        <Button variant="secondary" isLoading={exporting === 'pdf'} onClick={() => exportAs('pdf')}>
          <FileText size={16} style={{ marginRight: 6 }} />
          PDF
        </Button>
      </div>

      {loading || !report ? (
        <LoadingState text="Building report…" />
      ) : (
        <>
          {report.summary?.length > 0 && <p className="muted-note mb-2">{report.summary.join(' · ')}</p>}
          {report.totals && (
            <div className="kpi-grid mb-4">
              {report.columns
                .filter((c) => report.totals[c.key] !== undefined)
                .map((c) => (
                  <div className="kpi-tile" key={c.key}>
                    <div className="kpi-tile-label">{c.label}</div>
                    <div className="kpi-tile-value">{c.kind === 'money' ? money(report.totals[c.key]) : qty(report.totals[c.key])}</div>
                  </div>
                ))}
            </div>
          )}
          {report.rows.length === 0 ? (
            <EmptyState icon={FileText} title="No records" description="Nothing matches this report for the chosen period." />
          ) : (
            <div className="pmart-table-wrapper overflow-x-auto">
              <table className="pmart-table is-dense">
                <thead>
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key} className={c.kind === 'money' || c.kind === 'qty' ? 'num' : undefined}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={r._id || `${i}-${r.code || r.period || ''}`}>
                      {report.columns.map((c) => (
                        <td key={c.key} className={c.kind === 'money' || c.kind === 'qty' ? 'num' : c.key === 'code' || c.key === 'barcode' ? 'mono' : undefined}>
                          {cell(r, c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />
        </>
      )}
    </div>
  );
};
