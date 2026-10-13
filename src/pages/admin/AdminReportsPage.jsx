import React, { useState, useEffect } from 'react';
import { FileBarChart, ShieldAlert, FileText, Download } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useToast } from '@/context/ToastContext';
import { ORDER_STATUS_LABELS } from '@/types/orderTypes';
import { PageHeader, Card, StatusBadge, Button, Select, LoadingState, EmptyState } from '@/components/ui';

const Kpi = ({ label, value, hint }) => (
  <div className="kpi-tile">
    <div className="kpi-tile-label">{label}</div>
    <div className="kpi-tile-value">{value}</div>
    {hint && <div className="kpi-tile-hint">{hint}</div>}
  </div>
);

/** Builds a CSV of the report's category breakdown in the browser. */
const downloadReportCsv = (report) => {
  const rows = [['Category', 'Units', 'Revenue (INR)', 'Share %'], ...report.categoryDistribution.map((c) => [c.category, c.units, c.revenue, c.share])];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `pmart-report-${report.period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const AdminReportsPage = () => {
  const toast = useToast();
  const [tab, setTab] = useState('analytics');
  const [period, setPeriod] = useState('today');
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState({ logs: [], pagination: { page: 1, pages: 1 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== 'analytics') return;
    setLoading(true);
    adminService
      .getReports(period)
      .then(setReport)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, tab]);

  const loadLogs = (page) => {
    setLoading(true);
    adminService
      .getAuditLogs(page, 50)
      .then(setLogs)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'audit') loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales performance and the audit trail of admin actions"
        action={
          tab === 'analytics' && (
            <div className="actions-row">
              <Select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 160 }}>
                <option value="today">Today</option>
                <option value="this-week">Last 7 days</option>
                <option value="this-month">Last 30 days</option>
              </Select>
              <Button variant="secondary" size="sm" disabled={!report || report.categoryDistribution.length === 0} onClick={() => downloadReportCsv(report)}>
                <Download size={14} style={{ marginRight: 6 }} />
                Export CSV
              </Button>
            </div>
          )
        }
      />

      <div className="tab-bar">
        <Button size="sm" variant={tab === 'analytics' ? 'dark' : 'secondary'} onClick={() => setTab('analytics')}>
          <FileBarChart size={14} style={{ marginRight: 6 }} />
          Sales
        </Button>
        <Button size="sm" variant={tab === 'audit' ? 'dark' : 'secondary'} onClick={() => setTab('audit')}>
          <ShieldAlert size={14} style={{ marginRight: 6 }} />
          Audit log
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : tab === 'analytics' && report ? (
        <>
          <div className="kpi-grid mb-4">
            <Kpi label="Order value" value={`₹${report.totalSales.toLocaleString('en-IN')}`} hint="Excludes cancelled and rejected orders" />
            <Kpi label="Orders" value={report.totalOrders} hint={`${report.deliveredOrders} delivered`} />
            <Kpi label="Average order value" value={`₹${report.avgOrderValue.toLocaleString('en-IN')}`} />
            <Kpi label="Average delivery time" value={report.avgDeliveryMinutes != null ? `${report.avgDeliveryMinutes} min` : 'No data'} />
            <Kpi label={`Deliveries over ${report.slaMinutes} min`} value={report.slaBreaches} hint="Target set in Settings" />
          </div>

          {Object.keys(report.statusBreakdown).length > 0 && (
            <Card className="mb-4">
              <h3 className="font-bold mb-2">Orders by status</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.statusBreakdown).map(([status, count]) => (
                  <StatusBadge key={status} status={`${ORDER_STATUS_LABELS[status] || status}: ${count}`} type="neutral" />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-bold mb-2">Sales by category</h3>
            {report.categoryDistribution.length === 0 ? (
              <p className="text-sm text-muted">No sales in this period.</p>
            ) : (
              <table className="pmart-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Units</th>
                    <th>Revenue</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categoryDistribution.map((c) => (
                    <tr key={c.category}>
                      <td className="font-semibold">{c.category}</td>
                      <td>{c.units}</td>
                      <td>₹{c.revenue.toLocaleString('en-IN')}</td>
                      <td>{c.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : tab === 'audit' ? (
        logs.logs.length === 0 ? (
          <EmptyState icon={FileText} title="No audit entries yet" description="Admin actions such as creating products or changing settings are recorded here." />
        ) : (
          <Card>
            <table className="pmart-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.logs.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                    <td>
                      {log.user?.name || '—'}
                      <span className="muted-note block">{log.user?.role}</span>
                    </td>
                    <td>
                      <StatusBadge status={log.action} type="neutral" />
                    </td>
                    <td>{log.resource}</td>
                    <td className="font-mono text-xs">{log.resourceId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.pagination.pages > 1 && (
              <div className="actions-row mt-3" style={{ justifyContent: 'flex-end' }}>
                <Button size="sm" variant="secondary" disabled={logs.pagination.page <= 1} onClick={() => loadLogs(logs.pagination.page - 1)}>
                  Previous
                </Button>
                <span className="muted-note">
                  {logs.pagination.page} / {logs.pagination.pages}
                </span>
                <Button size="sm" variant="secondary" disabled={logs.pagination.page >= logs.pagination.pages} onClick={() => loadLogs(logs.pagination.page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </Card>
        )
      ) : null}
    </div>
  );
};
