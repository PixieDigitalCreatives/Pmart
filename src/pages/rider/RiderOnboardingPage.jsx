import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, ArrowRight, AlertCircle, CheckCircle2, Car, Key } from 'lucide-react';
import './RiderOnboardingPage.scss';

export const RiderOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, completeRiderProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    licenseNumber: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim() || !formData.vehicleNumber.trim() || !formData.licenseNumber.trim()) {
      setError('Please fill all required fields');
      return;
    }

    // Basic phone validation (E.164)
    const normalizedPhone = formData.phone.trim().startsWith('+') ? formData.phone.trim() : `+91${formData.phone.trim()}`;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setError('Please enter a valid mobile number (e.g. +919876543210)');
      return;
    }

    setLoading(true);
    try {
      const result = await completeRiderProfile({
        ...formData,
        phone: normalizedPhone
      });
      if (result.success) {
        navigate('/rider', { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pmart-auth-page rider-onboarding">
      <div className="auth-card-container">
        {/* Left Side: Brand Narrative */}
        <div className="auth-brand-side">
          <div className="brand-header">
            <img src="/Pmart.png" alt="PMart" className="auth-logo" />
            <span className="brand-tagline">Delivery Partner</span>
          </div>

          <div className="brand-hero-msg">
            <h2>Welcome aboard!</h2>
            <p>
              Complete your PMart Delivery Partner profile to start accepting orders and earning today.
            </p>
          </div>

          <div className="brand-trust-points">
            <div className="trust-point">
              <CheckCircle2 size={18} className="shield-icon" />
              <span>Google account verified</span>
            </div>
            <div className="trust-point">
              <CheckCircle2 size={18} className="shield-icon" />
              <span>Secure profile setup</span>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Form */}
        <div className="auth-form-side">
          <div className="form-wrapper">
            <div className="form-heading-group">
              <h1 className="form-title">Partner Profile</h1>
              <p className="form-subtitle">
                Fill in your details to activate your delivery account
              </p>
            </div>

            {user?.email && (
              <div className="google-email-badge">
                <CheckCircle2 size={14} />
                <span>{user.email}</span>
              </div>
            )}

            {error && (
              <div className="auth-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    type="text"
                    name="fullName"
                    className="form-control"
                    placeholder="e.g. Shyam Mohan"
                    value={formData.fullName}
                    onChange={handleChange}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mobile Number <span className="required">*</span></label>
                <div className="input-with-icon">
                  <Phone size={18} className="field-icon" />
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Vehicle Type <span className="required">*</span></label>
                  <select
                    name="vehicleType"
                    className="form-control"
                    value={formData.vehicleType}
                    onChange={handleChange}
                  >
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Electric Bike">Electric Bike</option>
                  </select>
                </div>
                
                <div className="form-group flex-1">
                  <label>Vehicle Number <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Car size={18} className="field-icon" />
                    <input
                      type="text"
                      name="vehicleNumber"
                      className="form-control uppercase"
                      placeholder="e.g. KA01AB1234"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>License Number <span className="required">*</span></label>
                <div className="input-with-icon">
                  <Key size={18} className="field-icon" />
                  <input
                    type="text"
                    name="licenseNumber"
                    className="form-control uppercase"
                    placeholder="e.g. KA0120200000000"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
                style={{ marginTop: '1rem' }}
              >
                <span>{loading ? 'Activating Profile...' : 'Complete Setup'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
