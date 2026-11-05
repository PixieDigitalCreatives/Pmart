import React from 'react';
import { TbShieldCheck as ShieldCheck, TbSparkles as Sparkles } from 'react-icons/tb';
import '@/pages/auth/LoginPage.scss';

/** Two-panel layout shared by sign-in, sign-up, activation and password pages. */
export const AuthShell = ({ tagline = 'Grocery and More', heading, subheading, title, subtitle, children, footer }) => (
  <div className="pmart-auth-page">
    <div className="auth-card-container">
      <div className="auth-brand-side">
        <div className="brand-header">
          <img src="/Pmart.png" alt="PMart" className="auth-logo" />
          <span className="brand-tagline">{tagline}</span>
        </div>
        <div className="brand-hero-msg">
          <h2>{heading}</h2>
          {subheading && <p>{subheading}</p>}
        </div>
        <div className="brand-trust-points">
          <div className="trust-point">
            <ShieldCheck size={18} className="shield-icon" />
            <span>Secure authentication</span>
          </div>
          <div className="trust-point">
            <Sparkles size={18} className="shield-icon" />
            <span>One account for every PMart portal</span>
          </div>
        </div>
      </div>

      <div className="auth-action-side">
        {/* The brand panel is hidden on small screens, so show the logo above the form there. */}
        <div className="auth-compact-brand">
          <img src="/Pmart.png" alt="PMart" />
          <span>{tagline}</span>
        </div>
        <div className="action-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  </div>
);
