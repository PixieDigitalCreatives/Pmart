import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { FileBarChart, Download, Calendar, Filter, TrendingUp } from 'lucide-react';
import { ExportDataModal } from '@/components/admin/ExportDataModal';

export const AdminReportsPage = () => {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('today');
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      const res = await adminService.getReports(period);
      setReport(res);
    };
    fetchReports();
  }, [period]);

  return (
    <div className="admin-reports-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Enterprise Intelligence & Reports</h1>
          <p className="text-muted text-sm">Downloadable executive analytics on sales throughput, SLA adherence, and demand trends</p>
        </div>
        <div className="flex gap-2">
          <select
            className="form-select text-sm"
            style={{ width: '150px' }}
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsExportOpen(true)}>
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="pmart-card">
          <span className="text-muted text-xs font-semibold">GROSS PERIOD SALES</span>
          <div className="text-2xl font-extrabold text-dark mt-1">₹{report?.totalSales?.toLocaleString('en-IN') || '0'}</div>
          <span className="text-success text-xs font-semibold mt-1 block"></span>
        </div>
        <div className="pmart-card">
          <span className="text-muted text-xs font-semibold">TOTAL ORDERS PROCESSED</span>
          <div className="text-2xl font-extrabold text-dark mt-1">{report?.totalOrders || 0}</div>
          <span className="text-muted text-xs mt-1 block"></span>
        </div>
        <div className="pmart-card">
          <span className="text-muted text-xs font-semibold">AVERAGE ORDER VALUE</span>
          <div className="text-2xl font-extrabold text-dark mt-1">₹{report?.avgTicketSize || 0}</div>
          <span className="text-muted text-xs mt-1 block"></span>
        </div>
        <div className="pmart-card">
          <span className="text-muted text-xs font-semibold">SLA BREACHES</span>
          <div className="text-2xl font-extrabold text-dark mt-1">{report?.slaBreaches || 0}</div>
          <span className="text-xs text-muted mt-1 block"></span>
        </div>
      </div>

      {/* Category Contribution Breakdown */}
      <div className="pmart-card">
        <h3 className="font-bold text-dark text-base mb-3">Gross Merchandise Value (GMV) by Category</h3>
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Revenue Share</th>
                <th>Performance Indicator</th>
              </tr>
            </thead>
            <tbody>
              {report?.categoryDistribution?.map((c, i) => (
                <tr key={i}>
                  <td className="font-semibold text-dark">{c.category}</td>
                  <td>
                    <span className="font-bold">{c.share}</span>
                  </td>
                  <td>
                    <div style={{ height: '8px', width: '200px', backgroundColor: '#F1F3F5', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: c.share, backgroundColor: '#F20D18', borderRadius: '999px' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Enterprise Analytics"
        description="Configure report period and metrics breakdown for download"
        defaultFilename={`PMart_Analytics_${period}`}
      />
    </div>
  );
};
