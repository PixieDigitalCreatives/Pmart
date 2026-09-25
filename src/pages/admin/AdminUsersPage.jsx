import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Users, UserCheck, Shield, Bike, Store, Search } from 'lucide-react';

export const AdminUsersPage = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [shops, setShops] = useState([]);
  const [riders, setRiders] = useState([]);

  useEffect(() => {
    const load = async () => {
      const c = await adminService.getCustomers();
      const s = await adminService.getShops();
      const r = await adminService.getRiders();
      setCustomers(c);
      setShops(s);
      setRiders(r);
    };
    load();
  }, []);

  return (
    <div className="admin-users-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Platform User Directory</h1>
        <p className="text-muted text-sm">Central identity directory across all 4 system roles</p>
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
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Rider Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Assigned Hub</th>
                <th>Deliveries</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {riders.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold text-dark">{r.name}</td>
                  <td>{r.phone}</td>
                  <td>{r.vehicleType} ({r.vehicleNumber})</td>
                  <td>{r.assignedShopName}</td>
                  <td>{r.totalDeliveries} completed</td>
                  <td className="font-bold text-dark">★ {r.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div className="pmart-table-wrapper">
          <table className="pmart-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold text-dark">Ananya Saxena</td>
                <td>+91 98100 11223</td>
                <td>Central Logistics Operations</td>
                <td><span className="badge badge-primary">Super Admin</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
