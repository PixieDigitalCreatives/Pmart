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
  ShieldCheck,
  Check
} from 'lucide-react';
import './ProfilePage.scss';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <div className="profile-layout-grid">
          {/* Left: User Overview & Navigation Shortcuts */}
          <aside className="profile-sidebar">
            <div className="user-card-summary">
              <div className="avatar-wrap">
                <User size={32} />
              </div>
              <h3 className="user-name">{name}</h3>
              <div className="user-phone">{user?.phone || '+91 98765 43210'}</div>
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

          {/* Right: Personal Info Settings */}
          <main className="profile-main-content">
            <div className="content-card">
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
                      value={user?.phone || '+91 98765 43210'}
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

            {/* Notification Preferences */}
            <div className="content-card mt-6">
              <h3 className="card-title">Notification Preferences</h3>
              <div className="preferences-list">
                <label className="pref-item">
                  <div>
                    <div className="pref-label">Order status via SMS & WhatsApp</div>
                    <div className="pref-desc">Receive real-time OTP and delivery tracking alerts</div>
                  </div>
                  <input type="checkbox" defaultChecked className="pref-toggle" />
                </label>
                <label className="pref-item">
                  <div>
                    <div className="pref-label">Daily Deals & Promotional Offers</div>
                    <div className="pref-desc">Be the first to hear about fresh produce discounts</div>
                  </div>
                  <input type="checkbox" defaultChecked className="pref-toggle" />
                </label>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
