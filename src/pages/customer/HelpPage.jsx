import React, { useState } from 'react';
// FAQs will be fetched from API in the future
import { LiveChatModal } from '@/components/common/LiveChatModal';
import {
  HelpCircle,
  ChevronDown,
  MessageSquare,
  PhoneCall,
  Mail,
  ShieldCheck,
  Search
} from 'lucide-react';
import './HelpPage.scss';

export const HelpPage = () => {
  const [expandedIndex, setExpandedIndex] = useState('0-0');
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleAccordion = (id) => {
    setExpandedIndex(expandedIndex === id ? null : id);
  };

  return (
    <div className="pmart-help-page">
      <div className="container">
        {/* Help Hero */}
        <div className="help-hero-card">
          <div className="hero-content">
            <h1 className="hero-title">How can we help you today?</h1>
            <p className="hero-subtitle">Find fast answers to questions regarding your groceries, OTPs, and delivery</p>
            <div className="help-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search FAQs, refunds, delivery issues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contact Channels Grid */}
        <div className="contact-channels-grid">
          <div className="contact-card">
            <div className="card-icon">
              <MessageSquare size={22} />
            </div>
            <h4 className="card-title">24x7 Live Chat</h4>
            <p className="card-desc">Average response in under 60 seconds for active orders</p>
            <button className="btn btn-outline-red btn-sm mt-auto" onClick={() => setIsChatOpen(true)}>
              Start Chat
            </button>
          </div>

          <div className="contact-card">
            <div className="card-icon">
              <PhoneCall size={22} />
            </div>
            <h4 className="card-title">Priority Phone Support</h4>
            <p className="card-desc">Call toll-free 1800-889-PMART for urgent grocery assistance</p>
            <a href="tel:18008897627" className="btn btn-outline-red btn-sm mt-auto">
              Call Hotline
            </a>
          </div>

          <div className="contact-card">
            <div className="card-icon">
              <Mail size={22} />
            </div>
            <h4 className="card-title">Email Customer Care</h4>
            <p className="card-desc">Write to care@pmart.in for billing queries and invoices</p>
            <a href="mailto:care@pmart.in" className="btn btn-outline-red btn-sm mt-auto">
              Send Email
            </a>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="faqs-accordion-section">
          <h2 className="section-title">Frequently Asked Questions</h2>

          <div className="faq-categories-list">
            {[]?.map((cat, catIdx) => (
              <div key={catIdx} className="faq-category-block">
                <h3 className="category-block-title">{cat.category}</h3>
                <div className="questions-accordion">
                  {cat.questions.map((faq, qIdx) => {
                    const id = `${catIdx}-${qIdx}`;
                    const isOpen = expandedIndex === id;
                    return (
                      <div key={qIdx} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                        <button
                          className="faq-question-btn"
                          onClick={() => toggleAccordion(id)}
                          aria-expanded={isOpen}
                        >
                          <span className="question-text">{faq.q}</span>
                          <ChevronDown size={18} className={`chevron-arrow ${isOpen ? 'rotated' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="faq-answer-panel">
                            <p>{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LiveChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
