import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { PageHeader, Button, Card, LoadingState, StatusBadge } from '@/components/ui';
import { money, dateTime, PAYMENT_STATUS } from '@/utils/format';
import {
  TbFileInvoice as ReceiptText,
  TbPackageImport as PackagePlus,
  TbPlus as Plus,
  TbPackage as Package,
  TbUsers as Users,
  TbReceipt as Receipt,
  TbChartBar as BarChart3,
  TbCreditCard as CreditCard,
  TbAlertTriangle as AlertTriangle,
  TbInfoCircle as InfoCircle,
  TbCash as Cash
} from 'react-icons/tb';
import '@/components/inventory/inventory.scss';
import './BillingDashboardPage.scss';

const BigActionCard = ({ number, title, subtitle, to, icon: Icon, color = 'blue', shortcut }) => (
  <Link to={to} className={`erp-action-card color-${color}`}>
    <div className="card-badge">{number}</div>
    {shortcut && <kbd className="shortcut-kbd-badge">{shortcut}</kbd>}
    <div className="card-icon-wrap">
      <Icon size={32} />
    </div>
    <div className="card-text">
      <h3 className="card-title">{title}</h3>
      <p className="card-sub">{subtitle}</p>
    </div>
  </Link>
);

const MetricTile = ({ label, value, hint, to, alert = false, success = false }) => {
  const content = (
    <div className={`kpi-tile ${alert ? 'is-alert' : ''} ${success ? 'is-success' : ''}`}>
      <div className="kpi-tile-label">{label}</div>
      <div className="kpi-tile-value">{value}</div>
      {hint && <div className="kpi-tile-hint">{hint}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
};

export const BillingDashboardPage = () => {
  const { t, lang, speak } = useLanguage();
  const { can } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    billingService
      .dashboard()
      .then(setD)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the billing overview.')));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <LoadingState text={t('ui.loading', 'Loading shop ERP...')} />;

  return (
    <div className="erp-dashboard-container">
      {/* Friendly Contextual Help Banner */}
      <div className="erp-welcome-banner">
        <div className="banner-icon">
          <InfoCircle size={24} />
        </div>
        <div className="banner-content">
          <h2>{t('dashboard.title', 'PMart ERP & Billing')}</h2>
          <p>{t('help.dashboard', 'Click on any of the large action buttons below to manage your store effortlessly.')}</p>
        </div>
        <div className="banner-quick-stats">
          <span className="badge badge-success">
            {lang === 'hi' ? 'दुकान सक्रिय है' : 'Store Active'}
          </span>
        </div>
      </div>

      {/* 8 Main Large Action Buttons (Requirement 3) */}
      <div className="erp-actions-grid mb-6">
        <BigActionCard
          number="1"
          title={t('dashboard.action.new_bill', 'नया बिल बनाएं')}
          subtitle={lang === 'hi' ? 'बारकोड स्कैन करें और तुरंत बिल प्रिंट करें' : 'Fast POS counter billing'}
          to="/admin/billing/new"
          icon={ReceiptText}
          color="emerald"
          shortcut="F2"
        />

        <BigActionCard
          number="2"
          title={t('dashboard.action.add_stock', 'स्टॉक बढ़ाएं')}
          subtitle={lang === 'hi' ? 'नया आया सामान स्कैन करें या जोड़ें' : 'Goods inward & restocking'}
          to="/admin/inventory/restock"
          icon={PackagePlus}
          color="blue"
          shortcut="F3"
        />

        <BigActionCard
          number="3"
          title={t('dashboard.action.new_product', 'नया सामान जोड़ें')}
          subtitle={lang === 'hi' ? 'सूची में नया उत्पाद रजिस्टर करें' : 'Register new catalog item'}
          to="/admin/products/new"
          icon={Plus}
          color="indigo"
          shortcut="Alt+N"
        />

        <BigActionCard
          number="4"
          title={t('dashboard.action.view_products', 'सामान देखें')}
          subtitle={lang === 'hi' ? 'दुकान के सभी सामान की सूची' : 'View products & stock counts'}
          to="/admin/products"
          icon={Package}
          color="sky"
          shortcut="F4"
        />

        <BigActionCard
          number="5"
          title={t('dashboard.action.view_customers', 'ग्राहक देखें')}
          subtitle={lang === 'hi' ? 'ग्राहक सूची और उनका पूरा खाता' : 'Customer profiles & ledgers'}
          to="/admin/customers"
          icon={Users}
          color="purple"
          shortcut="F6"
        />

        <BigActionCard
          number="6"
          title={t('dashboard.action.view_invoices', 'पुराने बिल देखें')}
          subtitle={lang === 'hi' ? 'बने हुए सभी पुराने बिलों की सूची' : 'Past sales & tax invoices'}
          to="/admin/billing/invoices"
          icon={Receipt}
          color="amber"
          shortcut="F7"
        />

        <BigActionCard
          number="7"
          title={t('dashboard.action.today_sales', 'आज की बिक्री')}
          subtitle={lang === 'hi' ? 'आज के कुल बिल और कमाई' : "Today's sales transactions"}
          to="/admin/billing/invoices?today=1"
          icon={BarChart3}
          color="teal"
          shortcut="Alt+S"
        />

        <BigActionCard
          number="8"
          title={t('dashboard.action.view_outstandings', 'बाकी पैसे देखें')}
          subtitle={lang === 'hi' ? 'ग्राहकों पर बकाया उधार और भुगतान' : 'Customer dues & collection'}
          to="/admin/billing/outstandings"
          icon={CreditCard}
          color="rose"
          shortcut="F8"
        />
      </div>

      {/* Important Business Information KPIs */}
      <h3 className="section-title mb-3">{lang === 'hi' ? 'महत्वपूर्ण व्यापार जानकारी' : 'Key Business Metrics'}</h3>
      <div className="kpi-grid mb-6">
        <MetricTile
          label={t('kpi.today_sales', "Today's Sales")}
          value={money(d.todaySales)}
          hint={`${d.todayInvoices} ${lang === 'hi' ? 'बिल आज बने' : 'invoices today'}`}
          success
        />

        <MetricTile
          label={t('kpi.today_invoices', "Today's Invoices")}
          value={d.todayInvoices.toLocaleString('en-IN')}
          hint={lang === 'hi' ? 'आज काटे गए बिल' : 'Generated today'}
          to="/admin/billing/invoices?today=1"
        />

        <MetricTile
          label={t('kpi.today_collected', 'Collected Today')}
          value={money(d.todayCollected ?? d.collected)}
          hint={lang === 'hi' ? 'आज नकद एवं UPI प्राप्त' : 'Cash & UPI collected today'}
          to="/admin/billing/payments?today=1"
          success
        />

        <MetricTile
          label={t('kpi.total_outstanding', 'Total Outstanding')}
          value={money(d.outstanding)}
          hint={lang === 'hi' ? 'ग्राहकों पर बाकी उधार' : 'Pending from customers'}
          to="/admin/billing/outstandings"
          alert={d.outstanding > 0}
        />

        <MetricTile
          label={t('kpi.low_stock', 'Low Stock Items')}
          value={d.lowStockCount.toLocaleString('en-IN')}
          hint={lang === 'hi' ? 'जल्द मंगाने की ज़रूरत है' : 'Reorder soon'}
          to="/admin/products?stock=low"
          alert={d.lowStockCount > 0}
        />

        <MetricTile
          label={t('kpi.out_of_stock', 'Out of Stock Items')}
          value={d.outOfStockCount.toLocaleString('en-IN')}
          hint={lang === 'hi' ? 'स्टॉक खत्म हो चुका है' : 'Zero quantity left'}
          to="/admin/products?stock=out"
          alert={d.outOfStockCount > 0}
        />
      </div>

      {/* Recent Invoices & Top Selling Items */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="card-head-bar mb-3">
            <h3 className="section-heading">{lang === 'hi' ? 'हाल में बने बिल' : 'Recent Invoices'}</h3>
            <Link to="/admin/billing/invoices" className="btn-link">
              {lang === 'hi' ? 'सभी देखें →' : 'View all →'}
            </Link>
          </div>
          {d.recentInvoices.length === 0 ? (
            <p className="muted-note">{lang === 'hi' ? 'अभी कोई बिल नहीं बना है।' : 'No invoices yet.'}</p>
          ) : (
            <table className="pmart-table is-dense">
              <tbody>
                {d.recentInvoices.map((i) => (
                  <tr key={i._id}>
                    <td className="mono font-bold">
                      <Link to={`/admin/billing/invoices/${i._id}`}>{i.number}</Link>
                      <span className="cell-sub">{dateTime(i.date)}</span>
                    </td>
                    <td>{i.customerName || (lang === 'hi' ? 'आम ग्राहक' : 'Walk-in')}</td>
                    <td className="num font-bold">{money(i.netTotal)}</td>
                    <td>
                      <StatusBadge text={PAYMENT_STATUS[i.displayStatus]?.label} type={PAYMENT_STATUS[i.displayStatus]?.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <div className="card-head-bar mb-3">
            <h3 className="section-heading">{lang === 'hi' ? 'सबसे ज्यादा बिकने वाला सामान' : 'Best Selling Products'}</h3>
            <Link to="/admin/reports" className="btn-link">
              {lang === 'hi' ? 'रिपोर्ट्स →' : 'Reports →'}
            </Link>
          </div>
          {d.topProducts.length === 0 ? (
            <p className="muted-note">{lang === 'hi' ? 'अभी बिक्री का डेटा उपलब्ध नहीं है।' : 'No sales data yet.'}</p>
          ) : (
            <table className="pmart-table is-dense">
              <thead>
                <tr>
                  <th>{t('billing.item', 'Product')}</th>
                  <th className="num">{t('billing.qty', 'Quantity')}</th>
                  <th className="num">{t('nav.total_amount', 'Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {d.topProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td className="num">{p.quantity}</td>
                    <td className="num font-bold">{money(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
};
