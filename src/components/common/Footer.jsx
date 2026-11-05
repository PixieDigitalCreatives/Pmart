import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { TbPackage, TbMapPin, TbUser, TbTag, TbHelpCircle, TbMail, TbPhone, TbHeartHandshake } from 'react-icons/tb';
import './Footer.scss';

const ACCOUNT_LINKS = [
  { to: '/orders', label: 'My Orders', icon: TbPackage },
  { to: '/addresses', label: 'Saved Addresses', icon: TbMapPin },
  { to: '/profile', label: 'Profile', icon: TbUser },
  { to: '/offers', label: 'Deals', icon: TbTag },
  { to: '/help', label: 'Help', icon: TbHelpCircle }
];

export const Footer = () => {
  const { settings } = useCart();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryService
      .getCategories()
      .then((cats) => setCategories((cats || []).slice(0, 8)))
      .catch(() => setCategories([]));
  }, []);

  return (
    <footer className="pmart-footer">
      <div className="footer-main">
        <div className="container">
          <div className="footer-cols-grid">
            <div className="footer-brand-col">
              <Link to="/" className="footer-logo-link">
                <img src="/Pmart.png" alt="PMart" className="footer-logo" />
              </Link>
              <p className="brand-tagline">Groceries and everyday essentials from your nearby PMart store.</p>
              <div className="brand-legal-badge">
                <span>© {new Date().getFullYear()} PMart</span>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="footer-links-col">
                <h5 className="col-heading">Categories</h5>
                <ul className="links-list">
                  {categories.map((c) => (
                    <li key={c._id}>
                      <Link to={`/category/${c.slug}`}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="footer-links-col">
              <h5 className="col-heading">Your Account</h5>
              <ul className="links-list with-icons">
                {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <Link to={to}>
                      <Icon size={20} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-links-col">
              <h5 className="col-heading">Contact</h5>
              <ul className="links-list with-icons">
                {settings.supportEmail && (
                  <li>
                    <a href={`mailto:${settings.supportEmail}`}>
                      <TbMail size={20} aria-hidden="true" />
                      <span>{settings.supportEmail}</span>
                    </a>
                  </li>
                )}
                {settings.supportPhone && (
                  <li>
                    <a href={`tel:${settings.supportPhone}`}>
                      <TbPhone size={20} aria-hidden="true" />
                      <span>{settings.supportPhone}</span>
                    </a>
                  </li>
                )}
                <li>
                  <Link to="/login">
                    <TbHeartHandshake size={20} aria-hidden="true" />
                    <span>Partner &amp; Staff Sign-in</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
