import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import './Footer.scss';

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
              <h5 className="col-heading">Your account</h5>
              <ul className="links-list">
                <li><Link to="/orders">My orders</Link></li>
                <li><Link to="/addresses">Saved addresses</Link></li>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/offers">Deals</Link></li>
                <li><Link to="/help">Help</Link></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h5 className="col-heading">Contact</h5>
              <ul className="links-list">
                {settings.supportPhone && <li><a href={`tel:${settings.supportPhone}`}>{settings.supportPhone}</a></li>}
                {settings.supportEmail && <li><a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></li>}
                <li><Link to="/login">Partner &amp; staff sign-in</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
