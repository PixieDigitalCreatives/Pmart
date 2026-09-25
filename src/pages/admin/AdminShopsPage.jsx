import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Store, MapPin, Bike, CheckCircle2, MoreVertical, Plus } from 'lucide-react';
import { AddDarkstoreModal } from '@/components/admin/AddDarkstoreModal';

export const AdminShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await adminService.getShops();
      setShops(data);
    };
    load();
  }, []);

  const handleToggleStatus = (id) => {
    setShops(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Active' ? 'Suspended' : 'Active';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  const handleAddShop = (newShop) => {
    setShops(prev => [newShop, ...prev]);
  };

  return (
    <div className="admin-shops-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Darkstore Hub Governance</h1>
          <p className="text-muted text-sm">Monitor regional fulfillment darkstores, stocking capacity, and rider allocation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Provision New Darkstore</span>
        </button>
      </div>

      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Darkstore</th>
              <th>Hub Manager</th>
              <th>Pincode & Location</th>
              <th>Daily Volume</th>
              <th>Today's Revenue</th>
              <th>Fleet Strength</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="font-semibold text-dark">{s.name}</div>
                  <div className="text-muted text-xs">SKU Capacity: {s.inventoryCount} items</div>
                </td>
                <td>
                  <div>{s.ownerName}</div>
                  <div className="text-muted text-xs">{s.phone}</div>
                </td>
                <td>
                  <span className="text-sm">{s.city} ({s.pincode})</span>
                </td>
                <td>
                  <span className="font-medium">{s.metrics.todayOrders} orders</span>
                </td>
                <td>
                  <span className="font-bold">₹{s.metrics.todayRevenue?.toLocaleString('en-IN')}</span>
                </td>
                <td>
                  <span className="badge badge-neutral">{s.activeRidersCount} Active Riders</span>
                </td>
                <td>
                  <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${s.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggleStatus(s.id)}
                  >
                    {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddDarkstoreModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddShop={handleAddShop}
      />
    </div>
  );
};
