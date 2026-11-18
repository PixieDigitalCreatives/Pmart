import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_LANG_KEY = 'pmart_lang';
const STORAGE_VOICE_KEY = 'pmart_voice';

// Comprehensive natural Hindi & English dictionaries
export const DICTIONARY = {
  hi: {
    // Top-level Actions & Sections (Mandatory prompt labels)
    'nav.billing': 'बिल बनाएं',
    'nav.new_invoice': 'नया बिल',
    'nav.stock': 'सामान का स्टॉक',
    'nav.add_stock': 'स्टॉक बढ़ाएं',
    'nav.products': 'सामान',
    'nav.customers': 'ग्राहक',
    'nav.sales': 'बिक्री',
    'nav.payments': 'भुगतान',
    'nav.outstanding': 'बाकी पैसे',
    'nav.invoice_history': 'पुराने बिल',
    'nav.customer_ledger': 'ग्राहक का पूरा हिसाब',
    'nav.low_stock': 'सामान कम बचा है',
    'nav.out_of_stock': 'सामान खत्म हो गया',
    'nav.print_invoice': 'बिल प्रिंट करें',
    'nav.total_amount': 'कुल रकम',
    'nav.save': 'सुरक्षित करें',
    'nav.cancel': 'रद्द करें',

    // Stock Status
    'stock.sufficient': 'पर्याप्त सामान',
    'stock.low': 'सामान कम है',
    'stock.out': 'सामान खत्म है',
    'stock.all': 'सभी सामान',

    // Dashboard Quick Actions
    'dashboard.title': 'दुकान प्रबंधन (ईआरपी)',
    'dashboard.subtitle': 'दुकान का पूरा हिसाब-किताब और बिलिंग',
    'dashboard.action.new_bill': 'नया बिल बनाएं',
    'dashboard.action.add_stock': 'स्टॉक बढ़ाएं',
    'dashboard.action.new_product': 'नया सामान जोड़ें',
    'dashboard.action.view_products': 'सामान देखें',
    'dashboard.action.view_customers': 'ग्राहक देखें',
    'dashboard.action.view_invoices': 'पुराने बिल देखें',
    'dashboard.action.today_sales': 'आज की बिक्री',
    'dashboard.action.view_outstandings': 'बाकी पैसे देखें',

    // Dashboard KPI Cards
    'kpi.today_sales': 'आज की कुल बिक्री',
    'kpi.today_invoices': 'आज बने बिल',
    'kpi.today_collected': 'आज मिले पैसे',
    'kpi.total_outstanding': 'बाकी पैसे',
    'kpi.low_stock': 'कम स्टॉक वाले सामान',
    'kpi.out_of_stock': 'खत्म हो चुके सामान',
    'kpi.total_sales': 'कुल बिक्री',
    'kpi.total_invoices': 'कुल बिल',

    // Contextual Help Instructions
    'help.billing': 'सामान स्कैन करें, मात्रा डालें और बिल बना दें।',
    'help.restock': 'दुकान में नया सामान आया है तो यहां उसकी मात्रा बढ़ाएं।',
    'help.dashboard': 'दुकान के मुख्य काम के लिए नीचे दिए गए बड़े बटनों पर क्लिक करें।',
    'help.outstandings': 'जिन ग्राहकों से पैसे लेने बाकी हैं, उनकी सूची और भुगतान यहां दर्ज करें।',
    'help.customers': 'ग्राहकों की सूची, नया ग्राहक जोड़ना और उनका पूरा खाता यहां देखें।',

    // Voice Prompts
    'voice.scan_product': 'कृपया सामान स्कैन करें।',
    'voice.product_added': 'सामान सफलतापूर्वक जोड़ दिया गया है।',
    'voice.invoice_ready': 'बिल तैयार हो गया है।',
    'voice.stock_low': 'स्टॉक कम है।',
    'voice.stock_updated': 'सामान का स्टॉक सफलतापूर्वक बढ़ गया है।',

    // Billing / POS
    'billing.pos_title': 'नया बिल बनाएं (POS काउंटर)',
    'billing.walk_in': 'आम ग्राहक (Walk-in)',
    'billing.select_customer': 'ग्राहक चुनें या खोजें',
    'billing.search_customer_placeholder': 'ग्राहक का नाम या मोबाइल नंबर लिखें...',
    'billing.quick_add_customer': '+ नया ग्राहक जोड़ें',
    'billing.scan_placeholder': 'बारकोड स्कैन करें या SKU / नाम खोजें...',
    'billing.cart_empty': 'बिल में अभी कोई सामान नहीं है। कृपया बारकोड स्कैन करें या ऊपर से सामान खोजें।',
    'billing.item': 'सामान',
    'billing.qty': 'मात्रा',
    'billing.unit_price': 'दर (प्रति इकाई)',
    'billing.discount': 'छूट (₹)',
    'billing.tax': 'टैक्स (GST)',
    'billing.total': 'रकम (₹)',
    'billing.subtotal': 'कुल योग',
    'billing.round_off': 'राउंड ऑफ',
    'billing.grand_total': 'कुल देय राशि',
    'billing.amount_in_words': 'शब्दों में रकम',
    'billing.payment_options': 'भुगतान का तरीका',
    'billing.cash': 'नकद (Cash)',
    'billing.upi': 'UPI',
    'billing.card': 'कार्ड (Card)',
    'billing.credit': 'उधार (Credit / बाद में भुगतान)',
    'billing.split': 'दो तरीकों से भुगतान (Split)',
    'billing.received_amount': 'मिली रकम',
    'billing.balance_amount': 'बकाया रकम',
    'billing.generate_invoice': 'बिल बनाएं और प्रिंट करें',
    'billing.clear_bill': 'बिल साफ करें',
    'billing.confirm_clear': 'क्या आप सचमुच इस बिल को खाली करना चाहते हैं?',
    'billing.stock_warning': 'स्टॉक उपलब्ध नहीं है',

    // Restock Page
    'restock.title': 'स्टॉक बढ़ाएं (सामान अंदर आया)',
    'restock.scan_method': 'तरीका 1: बारकोड स्कैन करें',
    'restock.search_method': 'तरीका 2: नाम से खोजें',
    'restock.new_product_prompt': 'यह सामान अभी आपकी सूची में नहीं है। क्या आप इसे जोड़ना चाहते हैं?',
    'restock.current_stock': 'दुकान में अभी उपलब्ध स्टॉक',
    'restock.new_stock_arrived': 'नया कितना सामान आया? (मात्रा)',
    'restock.purchase_rate': 'खरीदने की कीमत (वैकल्पिक)',
    'restock.supplier_name': 'सप्लायर / कंपनी का नाम',
    'restock.confirm_btn': 'सामान का स्टॉक बढ़ाएं',
    'restock.success_msg': 'सामान का स्टॉक सफलतापूर्वक बढ़ गया है।',
    'restock.quick_add_title': 'नया सामान सूची में जोड़ें',
    'restock.product_name': 'सामान का नाम',
    'restock.selling_price': 'बेचने की कीमत (MRP / Rate)',
    'restock.initial_stock': 'शुरुआती मात्रा (स्टॉक)',
    'restock.category': 'कैटेगरी (श्रेणी)',

    // Outstandings & Customers
    'outstandings.title': 'बाकी पैसे (उधार का हिसाब)',
    'outstandings.total_pending': 'कुल बाकी रकम',
    'outstandings.pending_invoices': 'बाकी बिल',
    'outstandings.record_payment': 'पैसे जमा करें',
    'outstandings.payment_recorded': 'भुगतान सफलतापूर्वक दर्ज हो गया।',
    'customers.title': 'ग्राहक प्रबंधन',
    'customers.add_new': 'नया ग्राहक जोड़ें',
    'customers.phone': 'मोबाइल नंबर',
    'customers.name': 'नाम',
    'customers.address': 'पता',
    'customers.credit_limit': 'उधार सीमा (Credit Limit)',
    'customers.view_ledger': 'पूरा हिसाब देखें',
    'customers.statement': 'खाता विवरण (Statement)',

    // Invoices Page
    'invoice.title': 'बिल की जानकारी',
    'invoice.print': 'बिल प्रिंट करें',
    'invoice.thermal_print': 'थर्मल रसीद (58/80mm)',
    'invoice.whatsapp': 'WhatsApp पर भेजें',
    'invoice.pdf': 'PDF डाउनलोड करें',
    'invoice.return': 'सामान वापस लें (Return)',
    'invoice.cancel': 'बिल रद्द करें (Cancel)',

    // Common UI
    'ui.search': 'खोजें...',
    'ui.loading': 'लोड हो रहा है...',
    'ui.no_records': 'कोई जानकारी नहीं मिली',
    'ui.back': 'वापस जाएं',
    'ui.date': 'तारीख',
    'ui.status': 'स्थिति',
    'ui.action': 'कार्य'
  },
  en: {
    'nav.billing': 'Billing',
    'nav.new_invoice': 'New Invoice',
    'nav.stock': 'Stock',
    'nav.add_stock': 'Add Stock',
    'nav.products': 'Products',
    'nav.customers': 'Customers',
    'nav.sales': 'Sales',
    'nav.payments': 'Payments',
    'nav.outstanding': 'Outstanding',
    'nav.invoice_history': 'Invoice History',
    'nav.customer_ledger': 'Customer Ledger',
    'nav.low_stock': 'Low Stock',
    'nav.out_of_stock': 'Out of Stock',
    'nav.print_invoice': 'Print Invoice',
    'nav.total_amount': 'Total Amount',
    'nav.save': 'Save',
    'nav.cancel': 'Cancel',

    'stock.sufficient': 'Sufficient Stock',
    'stock.low': 'Low Stock',
    'stock.out': 'Out of Stock',
    'stock.all': 'All Products',

    'dashboard.title': 'Shop ERP & Billing',
    'dashboard.subtitle': 'Complete store operations, billing and stock ledger',
    'dashboard.action.new_bill': 'New Invoice',
    'dashboard.action.add_stock': 'Add Stock',
    'dashboard.action.new_product': 'New Product',
    'dashboard.action.view_products': 'View Products',
    'dashboard.action.view_customers': 'View Customers',
    'dashboard.action.view_invoices': 'Invoice History',
    'dashboard.action.today_sales': "Today's Sales",
    'dashboard.action.view_outstandings': 'View Outstanding',

    'kpi.today_sales': "Today's Sales",
    'kpi.today_invoices': "Today's Invoices",
    'kpi.today_collected': 'Collected Today',
    'kpi.total_outstanding': 'Total Outstanding',
    'kpi.low_stock': 'Low Stock Items',
    'kpi.out_of_stock': 'Out of Stock Items',
    'kpi.total_sales': 'Total Sales',
    'kpi.total_invoices': 'Total Invoices',

    'help.billing': 'Scan products, adjust quantities and generate the bill.',
    'help.restock': 'When new items arrive at your store, increase their stock here.',
    'help.dashboard': 'Click the large buttons below to perform daily shop actions.',
    'help.outstandings': 'Track pending payments from customers and record collections.',
    'help.customers': 'Manage customers, view transaction history, and download statements.',

    'voice.scan_product': 'Please scan the product barcode.',
    'voice.product_added': 'Product added to the bill successfully.',
    'voice.invoice_ready': 'Invoice is ready.',
    'voice.stock_low': 'Product stock is low.',
    'voice.stock_updated': 'Stock has been successfully updated.',

    'billing.pos_title': 'New Invoice (POS Billing)',
    'billing.walk_in': 'Walk-in Customer',
    'billing.select_customer': 'Select or Search Customer',
    'billing.search_customer_placeholder': 'Enter customer name or phone...',
    'billing.quick_add_customer': '+ Quick Add Customer',
    'billing.scan_placeholder': 'Scan barcode or search by name / SKU...',
    'billing.cart_empty': 'No products in the bill yet. Scan a barcode or search above.',
    'billing.item': 'Product',
    'billing.qty': 'Qty',
    'billing.unit_price': 'Price/Unit',
    'billing.discount': 'Discount (₹)',
    'billing.tax': 'Tax (GST)',
    'billing.total': 'Total (₹)',
    'billing.subtotal': 'Subtotal',
    'billing.round_off': 'Round Off',
    'billing.grand_total': 'Grand Total',
    'billing.amount_in_words': 'Amount in Words',
    'billing.payment_options': 'Payment Method',
    'billing.cash': 'Cash',
    'billing.upi': 'UPI',
    'billing.card': 'Card',
    'billing.credit': 'Credit (Pay Later)',
    'billing.split': 'Split Payment',
    'billing.received_amount': 'Amount Received',
    'billing.balance_amount': 'Balance / Due',
    'billing.generate_invoice': 'Generate & Print Invoice',
    'billing.clear_bill': 'Clear Bill',
    'billing.confirm_clear': 'Are you sure you want to clear this invoice?',
    'billing.stock_warning': 'Insufficient stock available',

    'restock.title': 'Add Stock (Goods Inward)',
    'restock.scan_method': 'Method 1: Scan Barcode',
    'restock.search_method': 'Method 2: Search by Name',
    'restock.new_product_prompt': 'This product is not in your catalog yet. Would you like to add it?',
    'restock.current_stock': 'Current Available Stock',
    'restock.new_stock_arrived': 'Quantity Received',
    'restock.purchase_rate': 'Purchase Price (Optional)',
    'restock.supplier_name': 'Supplier / Brand Name',
    'restock.confirm_btn': 'Update & Increase Stock',
    'restock.success_msg': 'Product stock has been updated successfully.',
    'restock.quick_add_title': 'Register New Product',
    'restock.product_name': 'Product Name',
    'restock.selling_price': 'Selling Price (MRP / Rate)',
    'restock.initial_stock': 'Initial Stock Quantity',
    'restock.category': 'Category',

    'outstandings.title': 'Customer Outstandings & Dues',
    'outstandings.total_pending': 'Total Outstanding',
    'outstandings.pending_invoices': 'Pending Invoices',
    'outstandings.record_payment': 'Collect Payment',
    'outstandings.payment_recorded': 'Payment recorded successfully.',
    'customers.title': 'Customer Management',
    'customers.add_new': 'Add New Customer',
    'customers.phone': 'Mobile Phone',
    'customers.name': 'Customer Name',
    'customers.address': 'Billing Address',
    'customers.credit_limit': 'Credit Limit (₹)',
    'customers.view_ledger': 'View Full Ledger',
    'customers.statement': 'Account Statement',

    'invoice.title': 'Invoice Details',
    'invoice.print': 'Print Invoice',
    'invoice.thermal_print': 'Thermal Receipt (58/80mm)',
    'invoice.whatsapp': 'Share on WhatsApp',
    'invoice.pdf': 'Download PDF',
    'invoice.return': 'Process Return',
    'invoice.cancel': 'Cancel Invoice',

    'ui.search': 'Search...',
    'ui.loading': 'Loading...',
    'ui.no_records': 'No records found',
    'ui.back': 'Back',
    'ui.date': 'Date',
    'ui.status': 'Status',
    'ui.action': 'Action'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default language is Hindi as requested
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_LANG_KEY) || 'hi';
  });

  const [voiceEnabled, setVoiceEnabledState] = useState(() => {
    return localStorage.getItem(STORAGE_VOICE_KEY) === 'true';
  });

  const setLang = useCallback((newLang) => {
    const valid = newLang === 'en' ? 'en' : 'hi';
    setLangState(valid);
    localStorage.setItem(STORAGE_LANG_KEY, valid);
  }, []);

  const setVoiceEnabled = useCallback((enabled) => {
    setVoiceEnabledState(Boolean(enabled));
    localStorage.setItem(STORAGE_VOICE_KEY, enabled ? 'true' : 'false');
  }, []);

  // Text lookup function
  const t = useCallback(
    (key, fallback = '') => {
      const current = DICTIONARY[lang] || DICTIONARY.hi;
      if (current[key] !== undefined) return current[key];
      const en = DICTIONARY.en;
      if (en && en[key] !== undefined) return en[key];
      return fallback || key;
    },
    [lang]
  );

  // Optional voice guidance using Browser SpeechSynthesis
  const speak = useCallback(
    (keyOrText) => {
      if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const text = t(keyOrText, keyOrText);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95; // Gentle, clear speed for shop workers
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis not supported or blocked by browser policy
      }
    },
    [voiceEnabled, lang, t]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, voiceEnabled, setVoiceEnabled, speak }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Return safe fallback if used outside provider
    return {
      lang: 'hi',
      setLang: () => {},
      t: (k, fb) => fb || k,
      voiceEnabled: false,
      setVoiceEnabled: () => {},
      speak: () => {}
    };
  }
  return ctx;
};

