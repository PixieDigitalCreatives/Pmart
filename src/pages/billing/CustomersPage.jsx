import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { billingService } from '@/services/billingService';
import { apiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button, Input, FormField, LoadingState, EmptyState } from '@/components/ui';
import { money, dateTime } from '@/utils/format';
import { TbUserPlus as UserPlus, TbSearch as Search, TbFileText as FileText, TbX as X, TbPrinter as Printer, TbPhone as Phone, TbMapPin as MapPin, TbReceipt as Receipt, TbCash as Cash } from 'react-icons/tb';
import '@/components/inventory/inventory.scss';
import './billing.scss';

export const CustomersPage = () => {
  const { t, lang } = useLanguage();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    shippingAddress: '',
    customerType: 'RETAIL',
    creditLimit: '0',
    gstin: ''
  });
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.customers(search.trim(), true);
      setCustomers(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load customers'));
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 250);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const openLedger = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingLedger(true);
    try {
      const res = await billingService.getCustomerStatement(cust._id);
      setLedger(res);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load customer ledger'));
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(lang === 'hi' ? 'कृपया नाम और मोबाइल नंबर दर्ज करें' : 'Please provide name and phone');
      return;
    }
    setSaving(true);
    try {
      await billingService.createCustomer({
        ...form,
        creditLimit: Number(form.creditLimit) || 0
      });
      toast.success(lang === 'hi' ? 'ग्राहक सफलतापूर्वक जुड़ गया!' : 'Customer added successfully!');
      setShowAddModal(false);
      setForm({ name: '', phone: '', email: '', address: '', shippingAddress: '', customerType: 'RETAIL', creditLimit: '0', gstin: '' });
      loadCustomers();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save customer'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pmart-erp-page">
      <PageHeader
        title={t('customers.title', 'Customer Management')}
        subtitle={t('help.customers', 'Manage customers and view their complete account history')}
        action={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} style={{ marginRight: 6 }} />
            {t('customers.add_new', 'Add Customer')}
          </Button>
        }
      />

      <Card className="mb-4">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('billing.search_customer_placeholder', 'Search customer by name or phone...')}
              style={{ paddingLeft: 34 }}
            />
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
          {search && (
            <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
              {t('nav.cancel', 'Clear')}
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <LoadingState text={t('ui.loading', 'Loading...')} />
      ) : customers.length === 0 ? (
        <EmptyState
          title={lang === 'hi' ? 'कोई ग्राहक नहीं मिला' : 'No customers found'}
          description={lang === 'hi' ? 'बिल बनाते समय ग्राहक का नाम और मोबाइल नंबर दर्ज करें या नया ग्राहक जोड़ें।' : 'Add a new customer or search with another term.'}
          action={
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <UserPlus size={16} style={{ marginRight: 6 }} />
              {t('customers.add_new', 'Add Customer')}
            </Button>
          }
        />
      ) : (
        <div className="card-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>{t('customers.name', 'Name')}</th>
                <th>{t('customers.phone', 'Phone')}</th>
                <th>{lang === 'hi' ? 'प्रकार' : 'Type'}</th>
                <th className="num">{lang === 'hi' ? 'कुल बिल' : 'Total Invoices'}</th>
                <th className="num">{t('nav.sales', 'Total Sales')}</th>
                <th className="num">{t('nav.outstanding', 'Outstanding')}</th>
                <th className="num">{t('ui.action', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name || (lang === 'hi' ? 'अनाम ग्राहक' : 'Unnamed')}</strong>
                    {c.address && <div className="cell-sub"><MapPin size={12} style={{ display: 'inline', marginRight: 2 }} />{c.address}</div>}
                  </td>
                  <td>
                    <span className="mono"><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{c.phone || '—'}</span>
                  </td>
                  <td>
                    <span className={`badge ${c.customerType === 'WHOLESALE' ? 'badge-primary' : 'badge-neutral'}`}>
                      {c.customerType === 'WHOLESALE' ? (lang === 'hi' ? 'थोक (Wholesale)' : 'Wholesale') : (lang === 'hi' ? 'खुदरा (Retail)' : 'Retail')}
                    </span>
                  </td>
                  <td className="num">{c.invoices || 0}</td>
                  <td className="num">{money(c.totalPurchases || 0)}</td>
                  <td className="num">
                    <span className={c.outstanding > 0 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                      {money(c.outstanding || 0)}
                    </span>
                  </td>
                  <td className="num">
                    <Button variant="secondary" size="sm" onClick={() => openLedger(c)}>
                      <FileText size={14} style={{ marginRight: 4 }} />
                      {t('customers.view_ledger', 'View Ledger')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Ledger / Statement Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{selectedCustomer.name} – {t('nav.customer_ledger', 'Customer Ledger')}</h3>
                <p className="cell-sub">{selectedCustomer.phone} | {selectedCustomer.address || 'No address'}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedCustomer(null)}><X size={18} /></Button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loadingLedger ? (
                <LoadingState text={t('ui.loading', 'Loading ledger...')} />
              ) : !ledger ? (
                <p>{t('ui.no_records', 'No records')}</p>
              ) : (
                <>
                  <div className="kpi-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="kpi-tile">
                      <div className="kpi-tile-label">{lang === 'hi' ? 'कुल खरीदारी' : 'Total Purchases'}</div>
                      <div className="kpi-tile-value">{money(selectedCustomer.totalPurchases || 0)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-tile-label">{t('nav.outstanding', 'Outstanding')}</div>
                      <div className="kpi-tile-value text-red-600">{money(ledger.currentBalance)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-tile-label">{t('customers.credit_limit', 'Credit Limit')}</div>
                      <div className="kpi-tile-value">{selectedCustomer.creditLimit ? money(selectedCustomer.creditLimit) : (lang === 'hi' ? 'कोई सीमा नहीं' : 'No Limit')}</div>
                    </div>
                  </div>

                  <h4>{t('customers.statement', 'Account Statement')}</h4>
                  <table className="pmart-table is-dense">
                    <thead>
                      <tr>
                        <th>{t('ui.date', 'Date')}</th>
                        <th>{lang === 'hi' ? 'विवरण' : 'Description'}</th>
                        <th>{lang === 'hi' ? 'संदर्भ' : 'Ref'}</th>
                        <th className="num">{lang === 'hi' ? 'बिल (+)' : 'Debit (+)'}</th>
                        <th className="num">{lang === 'hi' ? 'जमा (-)' : 'Credit (-)'}</th>
                        <th className="num">{lang === 'hi' ? 'बैलेंस' : 'Balance'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.ledger.map((row, idx) => (
                        <tr key={idx}>
                          <td>{dateTime(row.date)}</td>
                          <td>
                            <strong>{row.description}</strong>
                          </td>
                          <td className="mono">{row.ref}</td>
                          <td className="num">{row.debit > 0 ? money(row.debit) : '—'}</td>
                          <td className="num text-emerald-600">{row.credit > 0 ? money(row.credit) : '—'}</td>
                          <td className="num font-bold">{money(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="modal-foot">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} style={{ marginRight: 6 }} />
                {t('nav.print_invoice', 'Print Statement')}
              </Button>
              <Button variant="primary" onClick={() => setSelectedCustomer(null)}>
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-head">
                <h3>{t('customers.add_new', 'Add Customer')}</h3>
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}><X size={18} /></Button>
              </div>

              <div className="modal-body">
                <FormField label={t('customers.name', 'Customer Name')} required>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={lang === 'hi' ? 'उदा. राजेश शर्मा' : 'e.g. Rajesh Sharma'}
                    autoFocus
                  />
                </FormField>

                <FormField label={t('customers.phone', 'Phone Number')} required>
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="9876543210"
                  />
                </FormField>

                <FormField label={t('customers.address', 'Billing Address')}>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={lang === 'hi' ? 'दुकान / घर का पता' : 'Street address'}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label={lang === 'hi' ? 'ग्राहक का प्रकार' : 'Customer Type'}>
                    <select
                      className="form-select"
                      value={form.customerType}
                      onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                    >
                      <option value="RETAIL">{lang === 'hi' ? 'खुदरा (Retail)' : 'Retail'}</option>
                      <option value="WHOLESALE">{lang === 'hi' ? 'थोक (Wholesale)' : 'Wholesale'}</option>
                    </select>
                  </FormField>

                  <FormField label={t('customers.credit_limit', 'Credit Limit (₹)')}>
                    <Input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                    />
                  </FormField>
                </div>

                <FormField label="GSTIN (Optional)">
                  <Input
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    placeholder="07AAAAA0000A1Z5"
                  />
                </FormField>
              </div>

              <div className="modal-foot">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  {t('nav.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? t('ui.loading', 'Saving...') : t('nav.save', 'Save Customer')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

