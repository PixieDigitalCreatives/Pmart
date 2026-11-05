import React from 'react';
import { Button } from '@/components/ui';

export const Pagination = ({ page, pages, total, onChange }) => {
  if (!pages || pages <= 1) return total !== undefined ? <div className="muted-note mt-3">{total.toLocaleString('en-IN')} records</div> : null;
  return (
    <div className="actions-row mt-3" style={{ justifyContent: 'space-between' }}>
      <span className="muted-note">{total !== undefined ? `${total.toLocaleString('en-IN')} records` : ''}</span>
      <div className="actions-row">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="muted-note">
          Page {page} of {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

/** A table header cell that sorts by `field`; clicking again reverses the order. */
export const SortTh = ({ field, sort, onSort, children, align }) => {
  const active = sort === field || sort === `-${field}`;
  const next = sort === field ? `-${field}` : field;
  return (
    <th style={align ? { textAlign: align } : undefined}>
      <button type="button" className="sort-th" onClick={() => onSort(next)} aria-sort={active ? (sort.startsWith('-') ? 'descending' : 'ascending') : 'none'}>
        {children}
        <span className="sort-th-arrow">{active ? (sort.startsWith('-') ? '▼' : '▲') : ''}</span>
      </button>
    </th>
  );
};
