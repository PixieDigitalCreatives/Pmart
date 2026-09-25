import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await adminService.getPayments();
      setPayments(data);
    };
    load();
  }, []);

  return (
    <div className="admin-payments-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Payment Settlements & Ledger</h1>
        <p className="text-muted text-sm">Real-time payment gateway transactions and daily darkstore payouts</p>
      </div>

      <div className="pmart-table-wrapper">
        <table className="pmart-table">
          <thead>
            <tr>
              <th>Transaction Ref</th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment Gateway / Mode</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="font-mono font-bold text-dark">{p.id}</td>
                <td className="font-bold text-dark">#{p.orderId}</td>
                <td>{p.customer}</td>
                <td><span className="font-bold">₹{p.amount}</span></td>
                <td><span className="badge badge-neutral">{p.method}</span></td>
                <td>
                  <span className={`badge ${p.status === 'Success' ? 'badge-success' : 'badge-warning'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="text-muted text-xs">{p.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
