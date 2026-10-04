import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Check
} from 'lucide-react';
import './ProfilePage.scss';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'account_details'
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || 'Rohan Sharma');
  const [email, setEmail] = useState(user?.email || 'rohan.sharma@example.com');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="pmart-profile-page">
      <div className="container">
        {/* Main Menu View (Default) */}
        {activeTab === 'menu' ? (
          <div className="profile-menu-container">
            <aside className="profile-sidebar">
              <div className="user-card-summary">
                <div className="avatar-wrap">
                  <User size={32} />
                </div>
                <h3 className="user-name">{name}</h3>
                <div className="user-phone">{user?.phone || 'Not available'}</div>
                <span className="member-badge">PMart Silver Member</span>
              </div>

              <nav className="profile-nav-links">
                <Link to="/orders" className="nav-item">
                  <Package size={18} />
                  <span>Orders History</span>
                  <ChevronRight size={16} className="arrow" />
                </Link>
                <Link to="/addresses" className="nav-item">
                  <MapPin size={18} />
                  <span>Saved Addresses</span>
                  <ChevronRight size={16} className="arrow" />
                </Link>
                <Link to="/offers" className="nav-item">
                  <CreditCard size={18} />
                  <span>Coupons & Rewards</span>
                  <ChevronRight size={16} className="arrow" />
                </Link>
                <button
                  type="button"
                  className="nav-item active-account-btn"
                  onClick={() => setActiveTab('account_details')}
                >
                  <User size={18} />
                  <span>Account Details</span>
                  <ChevronRight size={16} className="arrow" />
                </button>
                <Link to="/help" className="nav-item">
                  <HelpCircle size={18} />
                  <span>Help & Support</span>
                  <ChevronRight size={16} className="arrow" />
                </Link>
                <button className="nav-item logout-link" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </nav>
            </aside>
          </div>
        ) : (
          /* Dedicated Account Details View (Opened when clicking Account Details) */
          <div className="account-details-view">
            <div className="details-header-nav">
              <button
                type="button"
                className="back-to-menu-btn"
                onClick={() => {
                  setActiveTab('menu');
                  setIsEditing(false);
                }}
              >
                <ChevronLeft size={18} />
                <span>Back to Account</span>
              </button>
            </div>

            <main className="profile-main-content">
              <div id="account-personal-info-card" className="content-card">
                <div className="card-header-row">
                  <div>
                    <h2 className="card-title">Personal Information</h2>
                    <p className="card-subtitle">Manage your account details and contact preferences</p>
                  </div>
                  {!isEditing && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                      Edit Details
                    </button>
                  )}
                </div>

                {savedSuccess && (
                  <div className="alert-success-banner">
                    <Check size={16} />
                    <span>Your profile details were updated successfully!</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="profile-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mobile Number (Verified)</label>
                    <div className="verified-input-wrap">
                      <input
                        type="tel"
                        className="form-control"
                        value={user?.phone || 'Not available'}
                        disabled
                      />
                      <span className="verified-tag">
                        <ShieldCheck size={14} />
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  {isEditing && (
                    <div className="form-actions-row">
                      <button type="submit" className="btn btn-primary">
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
