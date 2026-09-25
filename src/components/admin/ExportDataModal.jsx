import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import './ExportDataModal.scss';

export const ExportDataModal = ({
  isOpen,
  onClose,
  title = 'Export Dataset',
  description = 'Configure parameters to generate your enterprise audit dump',
  defaultFilename = 'PMart_Export'
}) => {
  const [format, setFormat] = useState('xlsx');
  const [range, setRange] = useState('today');
  const [includePII, setIncludePII] = useState(false);
  const [includeFinancials, setIncludeFinancials] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const toast = useToast();

  if (!isOpen) return null;

  const handleStartExport = () => {
    setIsExporting(true);
    setProgress(15);

    const step1 = setTimeout(() => setProgress(55), 400);
    const step2 = setTimeout(() => setProgress(90), 800);
    const step3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
        onClose();
        toast.success(
          `Generated ${defaultFilename}_${range}.${format.toLowerCase()} successfully!`,
          'Export Complete'
        );
      }, 400);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={() => !isExporting && onClose()}>
        <motion.div
          className="modal-content export-data-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="export-modal-header">
            <div className="header-info">
              <div className="icon-badge">
                <Download size={20} />
              </div>
              <div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-desc">{description}</p>
              </div>
            </div>
            <button
              type="button"
              className="close-btn"
              onClick={() => !isExporting && onClose()}
              disabled={isExporting}
            >
              <X size={18} />
            </button>
          </div>

          <div className="export-modal-body">
            {/* Format Selection */}
            <div className="form-group">
              <label className="form-label">Export File Format</label>
              <div className="format-options-grid">
                <label className={`format-card ${format === 'xlsx' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="xlsx"
                    checked={format === 'xlsx'}
                    onChange={() => setFormat('xlsx')}
                    disabled={isExporting}
                  />
                  <FileSpreadsheet size={22} className="format-icon excel" />
                  <span className="format-name">Excel (.xlsx)</span>
                  <span className="format-sub">Formatted tables</span>
                </label>

                <label className={`format-card ${format === 'csv' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    disabled={isExporting}
                  />
                  <FileText size={22} className="format-icon csv" />
                  <span className="format-name">CSV (.csv)</span>
                  <span className="format-sub">Raw structured rows</span>
                </label>

                <label className={`format-card ${format === 'pdf' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={() => setFormat('pdf')}
                    disabled={isExporting}
                  />
                  <FileText size={22} className="format-icon pdf" />
                  <span className="format-name">PDF (.pdf)</span>
                  <span className="format-sub">Executive summary</span>
                </label>
              </div>
            </div>

            {/* Time Period */}
            <div className="form-group">
              <label className="form-label">Dataset Time Range</label>
              <select
                className="form-select"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                disabled={isExporting}
              >
                <option value="today">Today's Transactions (Live)</option>
                <option value="this-week">Past 7 Days</option>
                <option value="this-month">Month to Date (MTD)</option>
                <option value="all-time">Complete FY Audit Log</option>
              </select>
            </div>

            {/* Inclusions */}
            <div className="form-group">
              <label className="form-label">Export Inclusions</label>
              <div className="checkboxes-stack">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeFinancials}
                    onChange={(e) => setIncludeFinancials(e.target.checked)}
                    disabled={isExporting}
                  />
                  <span>Include gross margin, tax rates, and rider commissions</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={includePII}
                    onChange={(e) => setIncludePII(e.target.checked)}
                    disabled={isExporting}
                  />
                  <span>Include customer phone numbers and full address (Restricted)</span>
                </label>
              </div>
            </div>

            {/* Progress bar when exporting */}
            {isExporting && (
              <div className="export-progress-container">
                <div className="progress-info">
                  <span className="progress-label">Packaging dataset...</span>
                  <span className="progress-percentage">{progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="export-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download File</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
