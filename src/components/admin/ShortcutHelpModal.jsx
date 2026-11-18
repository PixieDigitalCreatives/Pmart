import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { TbKeyboard as Keyboard, TbX as X } from 'react-icons/tb';
import { Button } from '@/components/ui';
import './ShortcutHelpModal.scss';

export const ShortcutHelpModal = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  if (!isOpen) return null;

  const isHi = lang === 'hi';

  const globalShortcuts = [
    { key: 'F1 / ?', desc: isHi ? 'शॉर्टकट सहायता सूची खोलें' : 'Open Shortcut Help Sheet' },
    { key: 'F2', desc: isHi ? 'नया बिल बनाएं (POS Billing)' : 'New Invoice (POS Billing)' },
    { key: 'F3', desc: isHi ? 'स्टॉक बढ़ाएं (Goods Inward)' : 'Restock Goods (Method A/B/C)' },
    { key: 'F4', desc: isHi ? 'सामान सूची (Products List)' : 'View Products & Stock' },
    { key: 'Alt + H', desc: isHi ? 'बिलिंग होम डैशबोर्ड' : 'Billing ERP Home' },
    { key: 'F6', desc: isHi ? 'ग्राहक सूची व पूरा खाता' : 'Customers & Ledger' },
    { key: 'F7', desc: isHi ? 'पुराने बिल (Invoice History)' : 'Past Invoices' },
    { key: 'F8', desc: isHi ? 'बाकी पैसे देखें (Outstandings)' : 'Pending Dues' },
    { key: 'F9', desc: isHi ? 'भुगतान विवरण (Payments)' : 'Payment Transactions' },
    { key: 'F10', desc: isHi ? 'व्यापार रिपोर्ट्स (Reports)' : 'Business Reports' },
    { key: 'Alt + L', desc: isHi ? 'भाषा बदलें (हिंदी / English)' : 'Switch Language (HI / EN)' }
  ];

  const posShortcuts = [
    { key: 'F2', desc: isHi ? 'बारकोड स्कैनर बॉक्स पर तुरंत जाएं' : 'Focus Barcode Scanner Box' },
    { key: 'Alt + C', desc: isHi ? 'नया ग्राहक जोड़ें / खोजें' : 'Select or Quick Add Customer' },
    { key: 'Alt + 1', desc: isHi ? 'नकद भुगतान चुनें (Cash)' : 'Select Cash Payment' },
    { key: 'Alt + 2', desc: isHi ? 'UPI भुगतान चुनें (UPI QR)' : 'Select UPI Payment' },
    { key: 'Alt + 3', desc: isHi ? 'कार्ड भुगतान चुनें (Card)' : 'Select Card Payment' },
    { key: 'Alt + 4', desc: isHi ? 'उधार खाता चुनें (Credit/Udhar)' : 'Select Credit (Udhar)' },
    { key: 'Alt + 5', desc: isHi ? 'दो तरीकों से भुगतान (Split)' : 'Select Split Payment' },
    { key: 'Ctrl + Enter', desc: isHi ? 'बिल सुरक्षित और प्रिंट करें' : 'Save & Print Invoice' },
    { key: 'Alt + X', desc: isHi ? 'बिल रद्द या खाली करें' : 'Clear Entire Cart' },
    { key: 'Esc', desc: isHi ? 'खुली हुई विंडो या सर्च बंद करें' : 'Close Modal or Cancel Search' }
  ];

  const qtyShortcuts = [
    { key: 'Alt + Q / F5', desc: isHi ? 'मात्रा (Quantity) बॉक्स पर जाएं और संख्या बदलें' : 'Jump to Quantity box and edit quantity' },
    { key: '+  /  −', desc: isHi ? 'चुने हुए सामान की मात्रा +1 या −1 करें' : 'Increase / Decrease selected quantity by 1' },
    { key: '↑  /  ↓', desc: isHi ? 'बिल में ऊपर या नीचे का सामान चुनें' : 'Move selection up or down between items' },
    { key: 'Delete / Alt+D', desc: isHi ? 'चुना हुआ सामान बिल से हटाएं' : 'Remove selected item from cart' },
    { key: '5*बारकोड', desc: isHi ? 'मल्टी-स्कैन: 5 गुना सामान जोड़ें (उदा. 5*Code)' : 'Multi-scan: Add quantity with code (e.g. 5*Barcode)' },
    { key: 'Enter', desc: isHi ? 'मात्रा लिखकर Enter दबाएं (वापस स्कैनर पर आएंगे)' : 'Confirm Qty and jump back to scanner input' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content shortcut-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="shortcut-head-icon">
              <Keyboard size={20} />
            </div>
            <div>
              <h3>{isHi ? 'कीबोर्ड शॉर्टकट (Marg ERP स्टाइल)' : 'Keyboard Shortcuts (ERP Style)'}</h3>
              <p>{isHi ? 'माउस के बिना कीबोर्ड से पूरी दुकान चलाएं' : 'Operate PMart without touching the mouse'}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Section 1: Global Admin Navigation */}
          <div className="shortcut-section mb-4">
            <h4 className="shortcut-section-title">
              {isHi ? '1. मुख्य नेविगेशन (हर स्क्रीन पर काम करेगा)' : '1. Global Navigation Shortcuts'}
            </h4>
            <div className="shortcut-grid">
              {globalShortcuts.map((sc) => (
                <div key={sc.key} className="shortcut-item">
                  <kbd className="key-tag">{sc.key}</kbd>
                  <span className="key-desc">{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Quantity & Item Shortcuts */}
          <div className="shortcut-section mb-4">
            <h4 className="shortcut-section-title">
              {isHi ? '2. मात्रा प्रबंधन (Quantity & Items)' : '2. Quantity & Cart Items'}
            </h4>
            <div className="shortcut-grid">
              {qtyShortcuts.map((sc) => (
                <div key={sc.key} className="shortcut-item">
                  <kbd className="key-tag" style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}>{sc.key}</kbd>
                  <span className="key-desc">{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: POS Billing Screen Shortcuts */}
          <div className="shortcut-section">
            <h4 className="shortcut-section-title">
              {isHi ? '3. बिलिंग व भुगतान शॉर्टकट (Payment & Actions)' : '3. Payment & Billing Actions'}
            </h4>
            <div className="shortcut-grid">
              {posShortcuts.map((sc) => (
                <div key={sc.key} className="shortcut-item">
                  <kbd className="key-tag key-tag--primary">{sc.key}</kbd>
                  <span className="key-desc">{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {isHi ? 'सुझाव: कभी भी F1 दबाकर यह सूची देख सकते हैं' : 'Tip: Press F1 anytime to view this sheet'}
          </span>
          <Button type="button" variant="primary" onClick={onClose}>
            {isHi ? 'समझ गया' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>
  );
};

