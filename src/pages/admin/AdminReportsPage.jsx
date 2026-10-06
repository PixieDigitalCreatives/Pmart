import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { FileBarChart, Download, Calendar, Filter, TrendingUp, ShieldAlert } from 'lucide-react';
import { ExportDataModal } from '@/components/admin/ExportDataModal';

export const AdminReportsPage = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  
  // Analytics State
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('today');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const fetchReports = async () => {
        const res = await adminService.getReports(period);
        setReport(res);
      };
      fetchReports();
    }
  }, [period, activeTab]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs(1);
    }
  }, [activeTab]);

  const loadAuditLogs = async (page) => {
    setAuditLoading(true);
    const res = await adminService.getAuditLogs(page, 50);
    setAuditLogs(res.logs || []);
    setAuditPagination(res.pagination || { page: 1, total: 0, pages: 1 });
    setAuditLoading(false);
  };

  return (
    <div className="admin-reports-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Enterprise Intelligence & Reports</h1>
          <p className="text-muted text-sm">Downloadable executive analytics and system audit trails</p>
        </div>
        
        {activeTab === 'analytics' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="pmart-tabs mb-6 flex gap-4 border-b border-gray-200">
        <button 
          className={`tab-btn pb-2 px-1 font-semibold ${activeTab === 'analytics' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FileBarChart size={16} className="inline mr-2" /> Analytics
        </button>
        <button 
          className={`tab-btn pb-2 px-1 font-semibold ${activeTab === 'audit' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldAlert size={16} className="inline mr-2" /> Audit Logs
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
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
        </>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="pmart-card">
          <h3 className="font-bold text-dark text-base mb-3">System Audit Trail</h3>
          {auditLoading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : (
            <div className="pmart-table-wrapper">
              <table className="pmart-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="font-semibold">
                        {log.user?.name || 'Unknown'} 
                        <span className="text-xs text-gray-400 block">{log.user?.role}</span>
                      </td>
                      <td>
                        <span className={`badge badge-secondary`}>{log.action}</span>
                      </td>
                      <td>{log.resource}</td>
                      <td className="font-mono text-xs">{log.resourceId || '-'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-500">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {auditPagination.pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing page {auditPagination.page} of {auditPagination.pages}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-sm btn-secondary" 
                      disabled={auditPagination.page <= 1}
                      onClick={() => loadAuditLogs(auditPagination.page - 1)}
                    >
                      Previous
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      disabled={auditPagination.page >= auditPagination.pages}
                      onClick={() => loadAuditLogs(auditPagination.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
