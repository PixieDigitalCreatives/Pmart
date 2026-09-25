import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Store, Bike, ShieldCheck, LogIn, ChevronDown, Sparkles } from 'lucide-react';
import './DemoRoleBar.scss';

export const DemoRoleBar = () => {
  const { role, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { id: 'customer', name: 'Customer Portal', icon: ShoppingBag, path: '/', color: '#F20D18' },
    { id: 'shop_owner', name: 'Shop Owner Portal', icon: Store, path: '/shop', color: '#0284C7' },
    { id: 'rider', name: 'Rider Portal', icon: Bike, path: '/rider', color: '#16A34A' },
    { id: 'admin', name: 'Admin Enterprise', icon: ShieldCheck, path: '/admin', color: '#7C3AED' }
  ];

  const handleRoleSelect = (r) => {
    switchRole(r.id);
    navigate(r.path);
    setIsOpen(false);
  };

  const currentRoleObj = roles.find((r) => r.id === role) || roles[0];
  const IconComponent = currentRoleObj.icon;

  return (
    <div className="demo-role-bar">
      <div className="demo-role-container">
        <div className="demo-badge">
          <Sparkles size={13} className="sparkle-icon" />
          <span>PMART PROTOTYPE</span>
        </div>

        <div className="role-selector-dropdown">
          <button
            className="current-role-btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Switch User Portal"
          >
            <IconComponent size={15} style={{ color: currentRoleObj.color }} />
            <span className="role-label">{currentRoleObj.name}</span>
            <ChevronDown size={14} className={`arrow ${isOpen ? 'open' : ''}`} />
          </button>

          {isOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">SWITCH ECOSYSTEM PORTAL</div>
              {roles.map((r) => {
                const ItemIcon = r.icon;
                const isSelected = r.id === role;
                return (
                  <button
                    key={r.id}
                    className={`dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleRoleSelect(r)}
                  >
                    <div className="icon-wrapper" style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                      <ItemIcon size={16} />
                    </div>
                    <div className="item-text">
                      <div className="portal-name">{r.name}</div>
                      <div className="portal-path">{r.path}</div>
                    </div>
                    {isSelected && <span className="active-dot" style={{ backgroundColor: r.color }} />}
                  </button>
                );
              })}
              <div className="dropdown-divider" />
              <button
                className="dropdown-item auth-link"
                onClick={() => {
                  navigate('/login');
                  setIsOpen(false);
                }}
              >
                <LogIn size={15} />
                <span>Unified Login & OTP Screen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
