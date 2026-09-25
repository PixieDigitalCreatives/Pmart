import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, Tag, RotateCcw, Store, Bike, Shield } from 'lucide-react';
import './Footer.scss';

export const Footer = () => {
  return (
    <footer className="pmart-footer">
      {/* Trust Badges Strip */}
      <div className="footer-trust-strip">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon-box">
                <Clock size={20} />
              </div>
              <div className="trust-text">
                <div className="trust-title">10-Minute Superfast Delivery</div>
                <div className="trust-desc">From our local micro-fulfillment darkstores</div>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">
                <ShieldCheck size={20} />
              </div>
              <div className="trust-text">
                <div className="trust-title">100% Fresh & Authentic</div>
                <div className="trust-desc">Direct farm sourcing & strict quality checks</div>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">
                <Tag size={20} />
              </div>
              <div className="trust-text">
                <div className="trust-title">Best Wholesale & Retail Deals</div>
                <div className="trust-desc">Save up to 35% on daily grocery staples</div>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">
                <RotateCcw size={20} />
              </div>
              <div className="trust-text">
                <div className="trust-title">Instant Doorstep Refunds</div>
                <div className="trust-desc">No questions asked return or replacement</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-cols-grid">
            {/* Col 1: Brand Info */}
            <div className="footer-brand-col">
              <Link to="/" className="footer-logo-link">
                <img src="/Pmart.png" alt="PMart" className="footer-logo" />
              </Link>
              <p className="brand-tagline">
                PMart delivers farm-fresh groceries, dairy, pantry staples, and everyday essentials straight to your home in 10 minutes.
              </p>
              <div className="brand-legal-badge">
                <span>© 2026 PMart Technologies Private Limited. All rights reserved.</span>
              </div>
            </div>

            {/* Col 2: Categories */}
            <div className="footer-links-col">
              <h5 className="col-heading">Categories</h5>
              <ul className="links-list">
                <li><Link to="/category/fruits-vegetables">Fruits & Vegetables</Link></li>
                <li><Link to="/category/dairy-breakfast">Dairy & Breakfast</Link></li>
                <li><Link to="/category/atta-rice-dal">Atta, Rice & Dal</Link></li>
                <li><Link to="/category/oil-masala-spices">Oil, Masala & Spices</Link></li>
                <li><Link to="/category/snacks-munchies">Snacks & Munchies</Link></li>
                <li><Link to="/category/cold-drinks-juices">Cold Drinks & Juices</Link></li>
                <li><Link to="/category/home-cleaning">Home & Cleaning</Link></li>
              </ul>
            </div>

            {/* Col 3: Customer Care */}
            <div className="footer-links-col">
              <h5 className="col-heading">Customer Care</h5>
              <ul className="links-list">
                <li><Link to="/orders">My Orders</Link></li>
                <li><Link to="/addresses">Saved Addresses</Link></li>
                <li><Link to="/offers">Promotional Offers</Link></li>
                <li><Link to="/help">Help & Support</Link></li>
                <li><Link to="/help">FAQs</Link></li>
                <li><Link to="/profile">Account Settings</Link></li>
              </ul>
            </div>

            {/* Col 4: PMart Ecosystem Portals */}
            <div className="footer-links-col">
              <h5 className="col-heading">PMart Ecosystem</h5>
              <ul className="links-list ecosystem-links">
                <li>
                  <Link to="/shop" className="partner-link">
                    <Store size={15} />
                    <span>Shop Owner Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/rider" className="partner-link">
                    <Bike size={15} />
                    <span>Delivery Fleet Portal</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="partner-link">
                    <Shield size={15} />
                    <span>Admin Operations</span>
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="partner-link">
                    <span>Unified Auth Login</span>
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
