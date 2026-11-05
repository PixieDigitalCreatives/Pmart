import React, { useEffect, useRef, useState } from 'react';
import { TbSearch as Search } from 'react-icons/tb';
import { productService } from '@/services/productService';
import { Modal, Select } from '@/components/ui';
import { ProductThumb, StockBadge } from './ProductThumb';
import { money } from '@/utils/format';
import './inventory.scss';

const FIELDS = [
  { value: 'all', label: 'All fields' },
  { value: 'name', label: 'Name' },
  { value: 'code', label: 'Product code' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'company', label: 'Company' },
  { value: 'manufacturer', label: 'Manufacturer' }
];

const ResultRow = ({ p, active, onPick }) => (
  <button type="button" className={`product-result ${active ? 'is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(p)}>
    <ProductThumb product={p} size={36} />
    <span className="product-result-main">
      <span className="product-result-name">{p.name}</span>
      <span className="product-result-meta">
        {p.code && <>Code {p.code}</>}
        {p.barcode && <> · {p.barcode}</>}
        {p.company && <> · {p.company}</>}
        {p.rackNo && <> · Rack {p.rackNo}</>}
      </span>
    </span>
    <span className="product-result-side">
      <StockBadge stock={p.stockCount} unit={p.unit} />
      <span className="product-result-price">{money(p.price)}</span>
    </span>
  </button>
);

/** Manual product search (name, code, barcode, company, manufacturer) with keyboard navigation. */
export const ProductSearch = ({ onSelect, placeholder = 'Search by name, code, barcode, company…' }) => {
  const [term, setTerm] = useState('');
  const [field, setField] = useState('all');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const id = (seq.current += 1);
    setLoading(true);
    const t = setTimeout(() => {
      productService
        .getManagedProducts({ search: q, field: field === 'all' ? undefined : field, limit: 10, sort: 'name' })
        .then((d) => {
          if (id !== seq.current) return;
          setResults(d.products);
          setActive(0);
          setOpen(true);
        })
        .catch(() => id === seq.current && setResults([]))
        .finally(() => id === seq.current && setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [term, field]);

  const pick = (p) => {
    setOpen(false);
    setTerm('');
    setResults([]);
    onSelect(p);
  };

  return (
    <div className="product-search">
      <div className="product-search-row">
        <div className="scanner-input-box">
          <Search size={16} className="scanner-input-icon" />
          <input
            className="form-control"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !results.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                pick(results[active]);
              } else if (e.key === 'Escape') setOpen(false);
            }}
            placeholder={placeholder}
            aria-label="Search products"
            autoComplete="off"
          />
        </div>
        <Select value={field} onChange={(e) => setField(e.target.value)} aria-label="Search in" style={{ width: 150 }}>
          {FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      {open && term.trim().length >= 2 && (
        <div className="product-results" role="listbox">
          {loading && results.length === 0 && <div className="product-results-empty">Searching…</div>}
          {!loading && results.length === 0 && <div className="product-results-empty">No products match “{term.trim()}”.</div>}
          {results.map((p, i) => (
            <ResultRow key={p._id} p={p} active={i === active} onPick={pick} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Several products share a scanned barcode: ask which one. */
export const MatchChooser = ({ matches, code, onPick, onClose }) => (
  <Modal isOpen={Boolean(matches && matches.length)} onClose={onClose} title={`${matches?.length || 0} products use ${code}`}>
    <p className="muted-note mb-2">This barcode or code is shared. Choose the product in hand.</p>
    <div className="product-results product-results--static">
      {(matches || []).map((p) => (
        <ResultRow key={p._id} p={p} onPick={onPick} />
      ))}
    </div>
  </Modal>
);
