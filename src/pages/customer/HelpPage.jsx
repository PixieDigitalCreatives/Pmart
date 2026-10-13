import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, PhoneCall, Mail, Package, KeyRound, Banknote, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui';
import './HelpPage.scss';

// Answers describe how the app actually works; keep them in sync with the order flow.
const FAQS = [
  {
    icon: Package,
    q: 'How do I track my order?',
    a: 'Open My Orders and select the order. Its status updates as the store prepares it, and once a rider is on the way you can follow them on the map.'
  },
  {
    icon: KeyRound,
    q: 'What is the delivery code?',
    a: 'When your order is out for delivery, a delivery code appears on the order page. Share it with the rider only when you receive your items.'
  },
  {
    icon: Banknote,
    q: 'How do I pay?',
    a: 'PMart currently accepts cash on delivery. The amount to pay is shown on the order page and at checkout.'
  },
  {
    icon: MapPin,
    q: 'Why can’t I order to my address?',
    a: 'Each store delivers within a set distance. If your address is outside it, or the store has paused orders, checkout will tell you.'
  },
  {
    icon: HelpCircle,
    q: 'Can I cancel an order?',
    a: 'Yes, until the store starts preparing it. Open the order and choose Cancel order.'
  }
];

export const HelpPage = () => {
  const { settings } = useCart();
  const hasContact = Boolean(settings.supportPhone || settings.supportEmail);

  return (
    <div className="pmart-help-page">
      <div className="container">
        <div className="help-hero-card">
          <div className="hero-content">
            <h1 className="hero-title">How can we help?</h1>
            <p className="hero-subtitle">Answers about ordering, delivery codes and payment.</p>
          </div>
        </div>

        {hasContact && (
          <div className="contact-channels-grid">
            {settings.supportPhone && (
              <div className="contact-card">
                <div className="card-icon">
                  <PhoneCall size={22} />
                </div>
                <h4 className="card-title">Call support</h4>
                <p className="card-desc">{settings.supportPhone}</p>
                <Button component="a" href={`tel:${settings.supportPhone}`} variant="outline-red" size="sm" className="mt-auto">
                  Call
                </Button>
              </div>
            )}
            {settings.supportEmail && (
              <div className="contact-card">
                <div className="card-icon">
                  <Mail size={22} />
                </div>
                <h4 className="card-title">Email support</h4>
                <p className="card-desc">{settings.supportEmail}</p>
                <Button component="a" href={`mailto:${settings.supportEmail}`} variant="outline-red" size="sm" className="mt-auto">
                  Send email
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="faqs-accordion-section">
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq-categories-list">
            <div className="faq-category-block">
              <div className="questions-accordion">
                {FAQS.map(({ icon: Icon, q, a }) => (
                  <details key={q} className="faq-accordion-item">
                    <summary className="faq-question-btn">
                      <Icon size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                      <span className="question-text">{q}</span>
                    </summary>
                    <div className="faq-answer-panel">
                      <p>{a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
          <p className="muted-note mt-4">
            Need to look at an order? <Link to="/orders">Go to My Orders</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
