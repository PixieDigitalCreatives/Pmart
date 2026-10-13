import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Bike, Shield, Plus, Search, KeyRound, Link as LinkIcon } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { RiderFormModal } from '@/components/admin/RiderFormModal';
import { StaffFormModal, ActivationLink } from '@/components/admin/StaffFormModal';
import { PageHeader, StatusBadge, Button, EmptyState, Input, Modal, FormField, LoadingState } from '@/components/ui';

const RIDER_TONE = { AVAILABLE: 'success', BUSY: 'warning', OFFLINE: 'neutral' };
const RIDER_LABEL = { AVAILABLE: 'Online', BUSY: 'Delivering', OFFLINE: 'Offline' };

const CustomersTab = ({ canToggle }) => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ customers: [], pagination: { pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminService
      .getCustomers({ search: query || undefined, page, limit: 25 })
      .then(setData)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page]);

  useEffect(load, [load]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = async (c) => {
    try {
      await adminService.setCustomerActive(c.id, !c.isActive);
      toast.success(`${c.name || 'Customer'} ${c.isActive ? 'deactivated' : 'reactivated'}.`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-3" style={{ maxWidth: 360 }}>
        <Input icon={Search} placeholder="Search name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <LoadingState />
      ) : data.customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers" description={query ? 'No customer matches this search.' : 'Customers appear here when they sign up.'} />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Delivered spend</th>
                <th>Joined</th>
                <th>Status</th>
                {canToggle && <th />}
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.orders}</td>
                  <td>₹{c.spent.toLocaleString('en-IN')}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <StatusBadge status={c.isActive ? 'Active' : 'Deactivated'} type={c.isActive ? 'success' : 'error'} />
                  </td>
                  {canToggle && (
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => toggle(c)}>
                        {c.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.pagination.pages > 1 && (
        <div className="actions-row mt-3" style={{ justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="muted-note">
            {page} / {data.pagination.pages}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
};

const RidersTab = ({ canManage }) => {
  const toast = useToast();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(() => {
    adminService
      .getRiders()
      .then(setRiders)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  const toggle = async (r) => {
    try {
      const res = await adminService.setRiderActive(r.id, !r.isActive);
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const resetPassword = async () => {
    try {
      const res = await adminService.resetRiderPassword(resetFor.id, newPassword);
      toast.success(res.message);
      setResetFor(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <>
      {canManage && (
        <div className="mb-3">
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus size={16} style={{ marginRight: 6 }} />
            Add rider
          </Button>
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : riders.length === 0 ? (
        <EmptyState icon={Bike} title="No riders yet" description="Add riders so orders can be delivered." />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Deliveries</th>
                <th>Availability</th>
                <th>Account</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">
                    {r.name}
                    {r.mustChangePassword && <div className="muted-note">Has not signed in yet</div>}
                  </td>
                  <td>{r.phone}</td>
                  <td>
                    {r.vehicleType} {r.vehicleNumber}
                  </td>
                  <td>{r.completedDeliveries}</td>
                  <td>
                    <StatusBadge status={RIDER_LABEL[r.availabilityStatus]} type={RIDER_TONE[r.availabilityStatus]} />
                  </td>
                  <td>
                    <StatusBadge status={r.isActive ? 'Active' : 'Deactivated'} type={r.isActive ? 'success' : 'error'} />
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                        Edit
                      </Button>{' '}
                      <Button size="sm" variant="secondary" onClick={() => { setNewPassword(''); setResetFor(r); }} aria-label={`Reset password for ${r.name}`}>
                        <KeyRound size={14} />
                      </Button>{' '}
                      <Button size="sm" variant="secondary" onClick={() => toggle(r)} disabled={r.isActive && r.availabilityStatus === 'BUSY'}>
                        {r.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RiderFormModal
        isOpen={editing !== undefined}
        rider={editing || null}
        onClose={() => setEditing(undefined)}
        onSaved={(msg) => {
          toast.success(msg);
          setEditing(undefined);
          load();
        }}
      />

      <Modal isOpen={Boolean(resetFor)} onClose={() => setResetFor(null)} title={`Reset password for ${resetFor?.name || ''}`}>
        <FormField label="Temporary password" htmlFor="reset-pass" hint="The rider must change it at next sign-in">
          <Input id="reset-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </FormField>
        <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setResetFor(null)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={newPassword.length < 8} onClick={resetPassword}>
            Set password
          </Button>
        </div>
      </Modal>
    </>
  );
};

const StaffTab = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [linkFor, setLinkFor] = useState(null);

  const load = useCallback(() => {
    adminService
      .getEmployees()
      .then((res) => setStaff(res.employees))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  const newLink = async (s) => {
    try {
      const res = await adminService.regenerateActivationLink(s.id);
      setLinkFor({ name: s.name, path: res.activationPath });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-3">
        <Button variant="primary" onClick={() => setEditing(null)}>
          <Plus size={16} style={{ marginRight: 6 }} />
          Add employee
        </Button>
      </div>
      {loading ? (
        <LoadingState />
      ) : (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Permissions</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td>
                    <StatusBadge status={s.role === 'ADMIN' ? 'Admin' : 'Employee'} type={s.role === 'ADMIN' ? 'primary' : 'neutral'} />
                  </td>
                  <td>
                    <div>{s.phone}</div>
                    <div className="muted-note">{s.email}</div>
                  </td>
                  <td className="text-sm">{s.role === 'ADMIN' ? 'All' : s.permissions.length ? s.permissions.join(', ') : 'None'}</td>
                  <td>
                    {s.activationPending ? (
                      <StatusBadge status="Not activated" type="warning" />
                    ) : (
                      <StatusBadge status={s.isActive ? 'Active' : 'Deactivated'} type={s.isActive ? 'success' : 'error'} />
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                      Edit
                    </Button>{' '}
                    {s.activationPending && (
                      <Button size="sm" variant="secondary" onClick={() => newLink(s)} title="New activation link" aria-label={`New activation link for ${s.name}`}>
                        <LinkIcon size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <StaffFormModal
        isOpen={editing !== undefined}
        staff={editing || null}
        onClose={() => {
          setEditing(undefined);
          load();
        }}
        onSaved={(msg, opts) => {
          toast.success(msg);
          if (!opts?.keepOpen) setEditing(undefined);
          load();
        }}
      />
      <Modal isOpen={Boolean(linkFor)} onClose={() => setLinkFor(null)} title={`Activation link for ${linkFor?.name || ''}`}>
        {linkFor && <ActivationLink path={linkFor.path} />}
      </Modal>
    </>
  );
};

export const AdminUsersPage = () => {
  const { can, role } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabs = [
    can('customers.read') && { id: 'customers', label: 'Customers', icon: Users },
    can('riders.read') && { id: 'riders', label: 'Riders', icon: Bike },
    can('employees.manage') && { id: 'staff', label: 'Staff', icon: Shield }
  ].filter(Boolean);
  const active = tabs.find((t) => t.id === params.get('tab')) ? params.get('tab') : tabs[0]?.id;

  if (tabs.length === 0) return <EmptyState icon={Shield} title="No access" description="You do not have permission to view people." />;

  return (
    <div>
      <PageHeader title="People" subtitle="Customers, delivery riders and staff accounts" />
      <div className="tab-bar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button key={id} size="sm" variant={active === id ? 'dark' : 'secondary'} onClick={() => setParams({ tab: id })}>
            <Icon size={14} style={{ marginRight: 6 }} />
            {label}
          </Button>
        ))}
      </div>
      {active === 'customers' && <CustomersTab canToggle={role === 'ADMIN'} />}
      {active === 'riders' && <RidersTab canManage={can('riders.manage')} />}
      {active === 'staff' && <StaffTab />}
    </div>
  );
};
