import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';

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
      <PageHeader
        title="Payment Settlements & Ledger"
        subtitle="Real-time payment gateway transactions and daily darkstore payouts"
      />

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
                  <StatusBadge 
                    status={p.status} 
                    type={p.status === 'Success' ? 'success' : 'warning'} 
                  />
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
