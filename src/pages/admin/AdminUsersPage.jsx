import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Users, UserCheck, Shield, Bike, Store, Search, Plus } from 'lucide-react';
import { AddRiderModal } from '../../components/admin/AddRiderModal';
import { EditRiderModal } from '../../components/admin/EditRiderModal';
import { AddEmployeeModal } from '../../components/admin/AddEmployeeModal';
import { EditEmployeeModal } from '../../components/admin/EditEmployeeModal';

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Platform User Directory</h1>
          <p className="text-muted text-sm">Central identity directory across all 4 system roles</p>
        </div>
        {activeTab === 'riders' && (
          <button className="btn btn-primary" onClick={() => setIsAddRiderOpen(true)}>
            <Plus size={16} /> Add Rider
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3 mb-5">
        {[
          { id: 'customers', label: 'Customers' },
          { id: 'shops', label: 'Darkstore Managers' },
          { id: 'riders', label: 'Fleet Riders' },
          { id: 'admins', label: 'System Administrators' }
        ].map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${activeTab === t.id ? 'btn-dark' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
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
                  <td><span className="badge badge-success">{c.status}</span></td>
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
                  <td><span className="badge badge-success">{s.status}</span></td>
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
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No riders found.</p>
              <button className="btn btn-primary" onClick={() => setIsAddRiderOpen(true)}>
                <Plus size={16} /> Add Rider
              </button>
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
                    <td><span className={`badge ${r.isActive ? 'badge-success' : 'badge-danger'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button 
                        className="btn btn-sm btn-secondary mr-2"
                        onClick={() => {
                          setSelectedRider(r);
                          setIsEditRiderOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className={`btn btn-sm ${r.isActive ? 'btn-danger' : 'btn-success'} mr-2`}
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
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
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
                      </button>
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
            <button className="btn btn-primary" onClick={() => setIsAddEmployeeOpen(true)}>
              <Plus size={16} /> Add Employee
            </button>
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
                    <span className={`badge ${e.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                      {e.role}
                    </span>
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
                  <td><span className={`badge ${e.isActive ? 'badge-success' : 'badge-danger'}`}>{e.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button 
                      className="btn btn-sm btn-secondary mr-2"
                      onClick={() => {
                        setSelectedEmployee(e);
                        setIsEditEmployeeOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    {e.role !== 'ADMIN' && (
                      <button 
                        className="btn btn-sm btn-danger"
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
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">No employees found.</td>
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
