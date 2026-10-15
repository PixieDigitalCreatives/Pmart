import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { shopService } from '@/services/shopService';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/services/apiClient';
import './BulkProductUploadModal.scss';

const TEMPLATE_HEADERS = [
  'Product Name*',
  'Category*',
  'Sub-category',
  'Store',
  'Brand',
  'Unit / Pack Size*',
  'SKU',
  'Selling Price (₹)*',
  'MRP (₹)',
  'Units in Stock*',
  'Visible in Store',
  'Main Image URL',
  'More Image URLs',
  'Description',
  'Home Sections',
  'Search Tags',
  'Specifications',
  'Nutrition'
];

const SAMPLE_ROWS = [
  [
    'Amul Taaza Homogenised Toned Milk',
    'Dairy & Eggs',
    'Milk',
    'PMart',
    'Amul',
    '1 L',
    'AMUL-MILK-1L',
    74,
    76,
    50,
    'TRUE',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150',
    '',
    'Pasteurised toned milk with 3% fat and 8.5% SNF.',
    'Daily Essentials, Fresh Picks',
    'milk, amul, toned milk, daily dairy',
    'Shelf life: 6 months; Storage: Cool and dry place',
    'Energy: 58 kcal; Protein: 3.0 g; Fat: 3.0 g; Carbohydrate: 4.7 g'
  ],
  [
    'Fortune Sunlite Refined Sunflower Oil',
    'Cooking Essentials',
    'Edible Oils',
    'PMart',
    'Fortune',
    '1 L Pouch',
    'FORT-SUN-1L',
    145,
    165,
    30,
    'TRUE',
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5',
    '',
    'Light and healthy sunflower oil rich in Vitamin E.',
    'Best Deals',
    'sunflower oil, cooking oil, fortune',
    'Shelf life: 9 months; FSSAI: 10012021000071',
    'Energy: 900 kcal; Total Fat: 100 g; Saturated Fat: 11 g'
  ]
];

const normalizeKey = (key = '') =>
  key
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const FIELD_MAP = {
  productname: 'name',
  name: 'name',
  itemname: 'name',

  category: 'category',
  categoryname: 'category',

  subcategory: 'subcategory',
  subcat: 'subcategory',

  store: 'shop',
  shop: 'shop',
  storename: 'shop',

  brand: 'brand',

  unitpacksize: 'unit',
  unit: 'unit',
  packsize: 'unit',

  sku: 'sku',
  barcode: 'sku',

  sellingprice: 'price',
  price: 'price',
  sellingpriceinr: 'price',
  cost: 'price',

  mrp: 'mrp',
  mrpinr: 'mrp',

  unitsinstock: 'stockCount',
  stock: 'stockCount',
  stockcount: 'stockCount',
  quantity: 'stockCount',

  visibleinstore: 'isActive',
  visible: 'isActive',
  isactive: 'isActive',
  status: 'isActive',

  mainimageurl: 'imageUrl',
  imageurl: 'imageUrl',
  image: 'imageUrl',

  moreimageurls: 'gallery',
  gallery: 'gallery',
  images: 'gallery',

  description: 'description',
  desc: 'description',

  homesections: 'homeTags',
  homesection: 'homeTags',
  sections: 'homeTags',

  searchtags: 'extraTags',
  tags: 'extraTags',

  specifications: 'specifications',
  specs: 'specifications',

  nutrition: 'nutrition',
  nutritionalinfo: 'nutrition'
};

export const BulkProductUploadModal = ({ isOpen, onClose, onSuccess, isStaff = false }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [initLoading, setInitLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const fetchMetadata = async () => {
      setInitLoading(true);
      try {
        const [cats, shopList] = await Promise.all([
          categoryService.getManagedCategories(),
          isStaff ? shopService.getPublicShops() : Promise.resolve([])
        ]);
        if (!cancelled) {
          setCategories(cats);
          setShops(shopList);
        }
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not fetch catalog metadata.'));
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    };

    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isStaff, toast]);

  const handleClose = () => {
    if (uploading) return;
    setFile(null);
    setParsedRows([]);
    setUploadResults(null);
    onClose();
  };

  const downloadTemplate = (format = 'xlsx') => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);

    // Style column widths for convenience
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 16) }));

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pmart_products_bulk_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'pmart_products_bulk_template.xlsx');
    }
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setUploadResults(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        toast.error('The selected file is empty.');
        setParsedRows([]);
        setIsParsing(false);
        return;
      }

      // Map rows and validate
      const categoryLookup = new Map();
      categories.forEach((c) => {
        categoryLookup.set(String(c._id), c);
        categoryLookup.set(c.name.toLowerCase().trim(), c);
        categoryLookup.set(c.slug.toLowerCase().trim(), c);
      });

      const shopLookup = new Map();
      shops.forEach((s) => {
        shopLookup.set(String(s._id), s);
        shopLookup.set(s.name.toLowerCase().trim(), s);
      });

      const seenSkus = new Set();
      const mapped = rawRows.map((row, idx) => {
        const item = { _rowNum: idx + 2, raw: row, errors: [], warnings: [] };
        const cleanObj = {};

        Object.entries(row).forEach(([colName, val]) => {
          const norm = normalizeKey(colName);
          const mappedProp = FIELD_MAP[norm];
          if (mappedProp) {
            cleanObj[mappedProp] = typeof val === 'string' ? val.trim() : val;
          }
        });

        // 1. Name validation
        item.name = cleanObj.name || '';
        if (!item.name) item.errors.push('Product name is required.');

        // 2. Category validation
        item.categoryRaw = cleanObj.category || '';
        if (!item.categoryRaw) {
          item.errors.push('Category is required.');
        } else {
          const cat = categoryLookup.get(String(item.categoryRaw).toLowerCase());
          if (cat) {
            item.categoryId = cat._id;
            item.categoryName = cat.name;
          } else {
            item.errors.push(`Category "${item.categoryRaw}" not found.`);
          }
        }

        // 3. Unit validation
        item.unit = cleanObj.unit || '';
        if (!item.unit) item.errors.push('Unit / pack size is required.');

        // 4. Price & MRP validation
        const priceNum = Number(cleanObj.price);
        if (cleanObj.price === '' || isNaN(priceNum)) {
          item.errors.push('Valid selling price is required.');
        } else if (priceNum < 0) {
          item.errors.push('Selling price cannot be negative.');
        } else {
          item.price = priceNum;
        }

        if (cleanObj.mrp !== '' && cleanObj.mrp !== undefined) {
          const mrpNum = Number(cleanObj.mrp);
          if (isNaN(mrpNum) || mrpNum < 0) {
            item.errors.push('MRP must be a positive number.');
          } else {
            item.mrp = mrpNum;
          }
        } else {
          item.mrp = item.price;
        }

        // 5. Stock count validation
        const stockNum = Number(cleanObj.stockCount);
        if (cleanObj.stockCount === '' || isNaN(stockNum)) {
          item.errors.push('Units in stock is required.');
        } else if (stockNum < 0 || !Number.isInteger(stockNum)) {
          item.errors.push('Stock must be a non-negative whole number.');
        } else {
          item.stockCount = stockNum;
        }

        // 6. SKU validation
        item.sku = cleanObj.sku ? String(cleanObj.sku).trim() : '';
        if (item.sku) {
          const skuLower = item.sku.toLowerCase();
          if (seenSkus.has(skuLower)) {
            item.errors.push(`Duplicate SKU "${item.sku}" in this file.`);
          } else {
            seenSkus.add(skuLower);
          }
        }

        // 7. Store / Shop
        item.shop = cleanObj.shop || '';

        // 8. Other properties
        item.subcategory = cleanObj.subcategory || '';
        item.brand = cleanObj.brand || '';
        item.description = cleanObj.description || '';
        item.imageUrl = cleanObj.imageUrl || '';
        item.gallery = cleanObj.gallery || '';
        item.homeTags = cleanObj.homeTags || '';
        item.extraTags = cleanObj.extraTags || '';
        item.specifications = cleanObj.specifications || '';
        item.nutrition = cleanObj.nutrition || '';

        // Active state
        if (cleanObj.isActive !== undefined && cleanObj.isActive !== '') {
          const s = String(cleanObj.isActive).toLowerCase().trim();
          item.isActive = s === 'true' || s === 'yes' || s === '1';
        } else {
          item.isActive = true;
        }

        item.isValid = item.errors.length === 0;
        return item;
      });

      setParsedRows(mapped);
    } catch (err) {
      toast.error('Failed to parse file: ' + err.message);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const executeBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid products to import.');
      return;
    }

    setUploading(true);
    setUploadResults(null);

    // Prepare payload objects
    const HOME_SLUG_MAP = {
      'daily essentials': 'daily-essentials',
      'fresh picks': 'fresh-picks',
      'best deals': 'best-deals',
      'under 99': 'under-99',
      'under ₹99': 'under-99'
    };

    const payload = validRows.map((r) => {
      // Collect tags
      const tags = [];
      if (r.homeTags) {
        r.homeTags
          .split(/[,;]+/)
          .map((t) => t.trim().toLowerCase())
          .forEach((t) => {
            const slug = HOME_SLUG_MAP[t] || t;
            if (slug && !tags.includes(slug)) tags.push(slug);
          });
      }
      if (r.extraTags) {
        r.extraTags
          .split(/[,;]+/)
          .map((t) => t.trim().toLowerCase())
          .forEach((t) => {
            if (t && !tags.includes(t)) tags.push(t);
          });
      }

      return {
        name: r.name,
        category: r.categoryId || r.categoryRaw,
        subcategory: r.subcategory || undefined,
        shop: r.shop || undefined,
        brand: r.brand || undefined,
        sku: r.sku || undefined,
        unit: r.unit,
        price: r.price,
        mrp: r.mrp && r.mrp !== r.price ? r.mrp : undefined,
        stockCount: r.stockCount,
        imageUrl: r.imageUrl || undefined,
        gallery: r.gallery || undefined,
        description: r.description || undefined,
        tags: tags.length > 0 ? tags : undefined,
        specifications: r.specifications || undefined,
        nutrition: r.nutrition || undefined,
        isActive: r.isActive
      };
    });

    try {
      const res = await productService.bulkCreateProducts(payload);
      setUploadResults(res);
      if (res.createdCount > 0) {
        toast.success(`Successfully imported ${res.createdCount} products!`);
        if (onSuccess) onSuccess();
      } else {
        toast.error('No products were imported. Check the error list.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Bulk upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <AnimatePresence>
      <div className="bulk-upload-overlay" onClick={() => !uploading && handleClose()}>
        <motion.div
          className="bulk-upload-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="bulk-modal-header">
            <div className="bulk-title-group">
              <div className="bulk-header-icon">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2>Bulk Product Upload</h2>
                <p>Import products in bulk using an Excel spreadsheet (.xlsx) or CSV file.</p>
              </div>
            </div>
            <button
              type="button"
              className="bulk-close-btn"
              onClick={() => !uploading && handleClose()}
              disabled={uploading}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="bulk-modal-body">
            {initLoading ? (
              <LoadingState text="Loading categories and stores..." />
            ) : (
              <>
                {/* Step 1: Download Templates */}
                <div className="bulk-template-card">
                  <div className="template-info">
                    <Download size={18} className="template-icon" />
                    <div>
                      <h4>Step 1: Download the product template</h4>
                      <p>Use our structured template containing all 18 product fields and sample entries.</p>
                    </div>
                  </div>
                  <div className="template-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate('xlsx')}
                      className="download-btn"
                    >
                      <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
                      Excel Template (.xlsx)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate('csv')}
                      className="download-btn"
                    >
                      <FileText size={15} style={{ marginRight: 6 }} />
                      CSV Template (.csv)
                    </Button>
                  </div>
                </div>

                {/* Step 2: Upload Dropzone */}
                <div
                  className={`bulk-dropzone ${isDragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                  />

                  <div className="dropzone-content">
                    <div className="dropzone-icon-ring">
                      <Upload size={24} />
                    </div>
                    {file ? (
                      <div className="file-info-view">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        <span className="reselect-hint">Click or drop another file to replace</span>
                      </div>
                    ) : (
                      <>
                        <p className="dropzone-prompt">
                          <strong>Click to browse</strong> or drag & drop your Excel or CSV file here
                        </p>
                        <span className="dropzone-limits">Supported formats: .xlsx, .xls, .csv (up to 10 MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Parsing indicator */}
                {isParsing && <LoadingState text="Analyzing and validating spreadsheet rows..." />}

                {/* Upload summary banner (after API response) */}
                {uploadResults && (
                  <div className={`upload-summary-banner ${uploadResults.failedCount > 0 ? 'has-errors' : 'success'}`}>
                    <div className="summary-status-icon">
                      {uploadResults.failedCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div className="summary-details">
                      <strong>
                        {uploadResults.createdCount} product{uploadResults.createdCount !== 1 ? 's' : ''} created successfully!
                      </strong>
                      {uploadResults.failedCount > 0 && (
                        <span>
                          {' '}{uploadResults.failedCount} product{uploadResults.failedCount !== 1 ? 's' : ''} could not be created.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Server Errors (if any returned) */}
                {uploadResults?.errors?.length > 0 && (
                  <div className="server-errors-box">
                    <h5>Errors occurred during import:</h5>
                    <ul>
                      {uploadResults.errors.map((err, idx) => (
                        <li key={idx}>
                          <strong>Row {err.row} ({err.name}):</strong> {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step 3: Preview Table */}
                {parsedRows.length > 0 && !uploadResults && (
                  <div className="preview-container">
                    <div className="preview-header-bar">
                      <div className="preview-stats">
                        <span className="stat-pill total">
                          <Layers size={14} /> Total: {parsedRows.length}
                        </span>
                        <span className="stat-pill valid">
                          <CheckCircle2 size={14} /> Ready: {validCount}
                        </span>
                        {errorCount > 0 && (
                          <span className="stat-pill invalid">
                            <AlertCircle size={14} /> Issues: {errorCount}
                          </span>
                        )}
                      </div>
                      {errorCount > 0 && (
                        <span className="skip-notice">
                          * Rows with issues will be skipped automatically during import.
                        </span>
                      )}
                    </div>

                    <div className="preview-table-wrapper">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Status</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>MRP</th>
                            <th>Stock</th>
                            <th>SKU</th>
                            <th>Issues</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((row) => (
                            <tr key={row._rowNum} className={row.isValid ? 'row-valid' : 'row-invalid'}>
                              <td className="row-num">{row._rowNum}</td>
                              <td className="row-status">
                                {row.isValid ? (
                                  <span className="status-badge valid" title="Ready to import">
                                    <CheckCircle2 size={15} /> Valid
                                  </span>
                                ) : (
                                  <span className="status-badge invalid" title="Has issues">
                                    <AlertCircle size={15} /> Error
                                  </span>
                                )}
                              </td>
                              <td className="cell-name">{row.name || <span className="empty-val">—</span>}</td>
                              <td className="cell-cat">
                                {row.categoryName || row.categoryRaw || <span className="empty-val">—</span>}
                              </td>
                              <td>{row.unit || <span className="empty-val">—</span>}</td>
                              <td className="cell-num">₹{row.price ?? '—'}</td>
                              <td className="cell-num">{row.mrp ? `₹${row.mrp}` : '—'}</td>
                              <td className="cell-num">{row.stockCount ?? '—'}</td>
                              <td className="cell-sku">{row.sku || <span className="empty-val">—</span>}</td>
                              <td className="cell-errors">
                                {row.errors.length > 0 ? (
                                  <span className="error-text">{row.errors.join('; ')}</span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bulk-modal-footer">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              {uploadResults ? 'Done' : 'Cancel'}
            </Button>

            {!uploadResults && (
              <Button
                type="button"
                variant="primary"
                onClick={executeBulkImport}
                disabled={uploading || validCount === 0 || isParsing}
                className="import-submit-btn"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="spinning" style={{ marginRight: 8 }} />
                    Importing {validCount} Products...
                  </>
                ) : (
                  <>
                    Import {validCount} Product{validCount !== 1 ? 's' : ''}
                    <ArrowRight size={16} style={{ marginLeft: 8 }} />
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
