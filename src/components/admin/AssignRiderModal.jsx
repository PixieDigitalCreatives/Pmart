import React, { useState, useEffect } from 'react';
import api from '../../services/apiClient';
import { X, Bike } from 'lucide-react';
import '../../pages/admin/AdminOrdersPage.scss';

export const AssignRiderModal = ({ isOpen, onClose, orderId, onAssign }) => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg('');
      setSelectedRider(null);
      setIsAssigning(false);
      api.get('/admin/riders/eligible')
        .then(res => setRiders(res.data))
        .catch(err => {
          console.error('Failed to load riders', err);
          setErrorMsg('Failed to load available riders.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssignClick = async () => {
    if (!selectedRider) return;
    setIsAssigning(true);
    setErrorMsg('');
    try {
      // The parent handles the API call, so we just pass the ID and wait if it's a promise
      await onAssign(selectedRider.id);
      // Parent is responsible for closing, but we handle the assigning state
      setIsAssigning(false);
    } catch (error) {
      console.error(error);
      setErrorMsg('Assignment failed. Please try again.');
      setIsAssigning(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <h2>Assign Rider</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body p-4" style={{ padding: '16px' }}>
          <p className="text-muted" style={{ marginBottom: '16px', fontSize: '14px' }}>
            Select an available rider for order #{orderId ? (orderId.length > 6 ? orderId.slice(-6).toUpperCase() : orderId) : ''}
          </p>

          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading available riders...</div>
          ) : riders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No eligible riders are currently available.
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {riders.map(rider => {
                const isSelected = selectedRider?.id === rider.id;
                const isBusy = rider.status === 'BUSY';
                return (
                  <button 
                    key={rider.id}
                    type="button"
                    onClick={() => !isBusy && setSelectedRider(rider)}
                    disabled={isBusy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: isSelected ? '2px solid #eb3223' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: isBusy ? '#f1f5f9' : (isSelected ? '#fffafa' : '#ffffff'),
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.2s',
                      opacity: isBusy ? 0.6 : 1
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b', marginBottom: '2px' }}>
                        {rider.name} {isBusy && <span style={{fontSize: '12px', fontWeight: 'normal', color: '#dc2626'}}>(Busy)</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {rider.vehicleType} • {rider.vehicleNumber}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          backgroundColor: isBusy ? '#fee2e2' : '#dcfce7', 
                          color: isBusy ? '#991b1b' : '#166534' 
                        }}>
                          {rider.status}
                        </span>
                        {rider.activeDeliveries > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef9c3', color: '#854d0e' }}>
                            {rider.activeDeliveries} Active
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ color: isSelected ? '#eb3223' : '#cbd5e1' }}>
                      <Bike size={24} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancel
          </button>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleAssignClick}
            disabled={!selectedRider || selectedRider.status === 'BUSY' || isAssigning}
            style={{ opacity: (!selectedRider || selectedRider.status === 'BUSY' || isAssigning) ? 0.6 : 1 }}
          >
            {isAssigning ? 'Assigning...' : 'Assign Rider'}
          </button>
        </div>
      </div>
    </div>
  );
};
