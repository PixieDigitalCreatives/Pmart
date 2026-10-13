import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/services/apiClient';
import { User, MapPin, Package, HelpCircle, LogOut, ChevronRight, Check, KeyRound } from 'lucide-react';
import { Button, FormField, Input, Card } from '@/components/ui';
import './ProfilePage.scss';

export const ProfilePage = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const startEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setMessage(null);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Could not update your profile.') });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="pmart-profile-page">
      <div className="container">
        <div className="profile-menu-container" style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(260px, 320px) 1fr', alignItems: 'start' }}>
          <aside className="profile-sidebar">
            <div className="user-card-summary">
              <div className="avatar-wrap">
                <User size={32} />
              </div>
              <h3 className="user-name">{user?.name}</h3>
              <div className="user-phone">{user?.phone}</div>
            </div>
            <nav className="profile-nav-links">
              <Link to="/orders" className="nav-item">
                <Package size={18} />
                <span>My orders</span>
                <ChevronRight size={16} className="arrow" />
              </Link>
              <Link to="/addresses" className="nav-item">
                <MapPin size={18} />
                <span>Saved addresses</span>
                <ChevronRight size={16} className="arrow" />
              </Link>
              <Link to="/account/change-password" className="nav-item">
                <KeyRound size={18} />
                <span>Change password</span>
                <ChevronRight size={16} className="arrow" />
              </Link>
              <Link to="/help" className="nav-item">
                <HelpCircle size={18} />
                <span>Help</span>
                <ChevronRight size={16} className="arrow" />
              </Link>
              <Button className="nav-item logout-link" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Sign out</span>
              </Button>
            </nav>
          </aside>

          <main className="profile-main-content">
            <Card className="content-card">
              <div className="card-header-row">
                <div>
                  <h2 className="card-title">Personal information</h2>
                  <p className="card-subtitle">Your mobile number is used to sign in and cannot be changed here.</p>
                </div>
                {!editing && (
                  <Button variant="secondary" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                )}
              </div>

              {message && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                  {message.type === 'success' && <Check size={16} />}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={save} className="profile-form">
                <FormField label="Full name" htmlFor="profile-name">
                  <Input id="profile-name" value={editing ? name : user?.name || ''} onChange={(e) => setName(e.target.value)} disabled={!editing || saving} maxLength={100} />
                </FormField>
                <FormField label="Mobile number" htmlFor="profile-phone">
                  <Input id="profile-phone" type="tel" value={user?.phone || ''} disabled />
                </FormField>
                <FormField label="Email (optional)" htmlFor="profile-email">
                  <Input id="profile-email" type="email" value={editing ? email : user?.email || ''} onChange={(e) => setEmail(e.target.value)} disabled={!editing || saving} placeholder={editing ? 'you@example.com' : 'Not added'} />
                </FormField>
                {editing && (
                  <div className="form-actions-row">
                    <Button type="submit" variant="primary" isLoading={saving}>
                      Save changes
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};
