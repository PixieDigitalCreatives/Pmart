import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Users, UserCheck, Shield, Bike, Store, Search, Plus } from 'lucide-react';
import { AddRiderModal } from '../../components/admin/AddRiderModal';
import { EditRiderModal } from '../../components/admin/EditRiderModal';
import { AddEmployeeModal } from '../../components/admin/AddEmployeeModal';
import { EditEmployeeModal } from '../../components/admin/EditEmployeeModal';
import { PageHeader, StatusBadge, Button, EmptyState } from '@/components/ui';

export const AdminUsersPage = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [shops, setShops] = useState([]);
  const [riders, setRiders] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isAddRiderOpen, setIsAddRiderOpen] = useState(false);
  const [isEditRiderOpen, setIsEditRiderOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const loadData = async () => {
    const c = await adminService.getCustomers();
    const s = await adminService.getShops();
    const r = await adminService.getRiders();
    const e = await adminService.getEmployees();
    setCustomers(c);
    setShops(s);
    setRiders(r);
    setEmployees(e);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="admin-users-page">
      <PageHeader
        title="Platform User Directory"
        subtitle="Central identity directory across all 4 system roles"
        action={
          activeTab === 'riders' && (
            <Button variant="primary" onClick={() => setIsAddRiderOpen(true)}>
              <Plus size={16} style={{ marginRight: '8px' }} /> Add Rider
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3 mb-5">
        {[
          { id: 'customers', label: 'Customers' },
          { id: 'shops', label: 'Darkstore Managers' },
          { id: 'riders', label: 'Fleet Riders' },
          { id: 'admins', label: 'System Administrators' }
        ].map(t => (
          <Button
            key={t.id}
            variant={activeTab === t.id ? 'dark' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Orders</th>
                <th>Lifetime Spend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold text-dark">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email}</td>
                  <td>{c.orders} orders</td>
                  <td className="font-bold">₹{c.spent?.toLocaleString()}</td>
                  <td><StatusBadge status={c.status} type={c.status === 'Active' ? 'success' : 'neutral'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shops Tab */}
      {activeTab === 'shops' && (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th>Hub Name</th>
                <th>Contact</th>
                <th>Operating Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shops.map(s => (
                <tr key={s.id}>
                  <td className="font-semibold text-dark">{s.ownerName}</td>
                  <td>{s.name}</td>
                  <td>{s.phone}</td>
                  <td>{s.operatingHours}</td>
                  <td><StatusBadge status={s.status} type={s.status === 'Active' ? 'success' : 'neutral'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Riders Tab */}
      {activeTab === 'riders' && (
        <div className="pmart-table-wrapper">
          {riders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Bike}
                title="No riders found"
                description="There are currently no riders in the system."
                action={
                  <Button variant="primary" onClick={() => setIsAddRiderOpen(true)}>
                    <Plus size={16} style={{ marginRight: '8px' }} /> Add Rider
                  </Button>
                }
              />
            </div>
          ) : (
            <table className="pmart-table">
              <thead>
                <tr>
                  <th>Rider Name</th>
                  <th>Phone</th>
                  <th>Vehicle</th>
                  <th>Assigned Hub</th>
                  <th>Deliveries</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {riders.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold text-dark">{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.vehicleType} ({r.vehicleNumber})</td>
                    <td>{r.assignedShopName || 'Unassigned'}</td>
                    <td>{r.totalDeliveries || 0} completed</td>
                    <td className="font-bold text-dark">★ {r.rating || '5.0'}</td>
                    <td><StatusBadge status={r.isActive ? 'Active' : 'Inactive'} type={r.isActive ? 'success' : 'danger'} /></td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        style={{ marginRight: '8px' }}
                        onClick={() => {
                          setSelectedRider(r);
                          setIsEditRiderOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm"
                        variant={r.isActive ? 'danger' : 'success'}
                        style={{ marginRight: '8px' }}
                        onClick={async () => {
                          if (r.status === 'BUSY' && r.isActive) {
                            alert('Cannot deactivate a rider with an active delivery.');
                            return;
                          }
                          try {
                            await adminService.updateRiderStatus(r.id, !r.isActive);
                            loadData();
                          } catch(err) {
                            alert(err.response?.data?.message || 'Failed to update rider status');
                          }
                        }}
                      >
                        {r.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (r.status === 'BUSY') {
                            alert('Cannot delete a rider with an active delivery.');
                            return;
                          }
                          if (!window.confirm(`Are you sure you want to delete rider ${r.name}? This cannot be undone.`)) {
                            return;
                          }
                          try {
                            await adminService.deleteRider(r.id);
                            loadData();
                          } catch(err) {
                            alert(err.response?.data?.message || 'Failed to delete rider');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Rider Modal */}
      <AddRiderModal 
        isOpen={isAddRiderOpen} 
        onClose={() => setIsAddRiderOpen(false)} 
        onSuccess={loadData} 
      />

      {/* Edit Rider Modal */}
      <EditRiderModal 
        isOpen={isEditRiderOpen} 
        onClose={() => { setIsEditRiderOpen(false); setSelectedRider(null); }}
        onSuccess={loadData} 
        rider={selectedRider}
      />

      {/* Admins & Employees Tab */}
      {activeTab === 'admins' && (
        <div className="pmart-table-wrapper">
          <div className="flex justify-end mb-4 pr-4">
            <Button variant="primary" onClick={() => setIsAddEmployeeOpen(true)}>
              <Plus size={16} style={{ marginRight: '8px' }} /> Add Employee
            </Button>
          </div>
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td className="font-semibold text-dark">{e.name}</td>
                  <td>
                    <StatusBadge status={e.role} type={e.role === 'ADMIN' ? 'primary' : 'neutral'} />
                  </td>
                  <td>
                    <div>{e.phone}</div>
                    <div className="text-sm text-gray-500">{e.email}</div>
                  </td>
                  <td>
                    {e.role === 'ADMIN' ? (
                      <span className="text-sm text-gray-500">All Access</span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {e.permissions?.length || 0} permissions
                      </span>
                    )}
                  </td>
                  <td><StatusBadge status={e.isActive ? 'Active' : 'Inactive'} type={e.isActive ? 'success' : 'danger'} /></td>
                  <td>
                    <Button 
                      size="sm"
                      variant="secondary"
                      style={{ marginRight: '8px' }}
                      onClick={() => {
                        setSelectedEmployee(e);
                        setIsEditEmployeeOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    {e.role !== 'ADMIN' && (
                      <Button 
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete employee ${e.name}?`)) return;
                          try {
                            await adminService.deleteEmployee(e.id);
                            loadData();
                          } catch(err) {
                            alert(err.response?.data?.message || 'Failed to delete employee');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: 0 }}>
                    <EmptyState
                      icon={Shield}
                      title="No employees found"
                      description="There are currently no employees in the system."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Modals */}
      <AddEmployeeModal 
        isOpen={isAddEmployeeOpen} 
        onClose={() => setIsAddEmployeeOpen(false)} 
        onSuccess={loadData} 
      />

      <EditEmployeeModal 
        isOpen={isEditEmployeeOpen} 
        onClose={() => { setIsEditEmployeeOpen(false); setSelectedEmployee(null); }}
        onSuccess={loadData} 
        employee={selectedEmployee}
      />
    </div>
  );
};
