import React from 'react';
import { mockCategories } from '@/data/mockCategories';
import { Layers, ChevronRight } from 'lucide-react';

export const ShopCategoriesPage = () => {
  return (
    <div className="shop-categories-page">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark">Darkstore Category Mapping</h1>
        <p className="text-muted text-sm">Active category aisles and subcategories stocked in Sector 62 Hub</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {mockCategories.map((c) => (
          <div key={c.id} className="pmart-card flex gap-3 items-center">
            <img
              src={c.image}
              alt={c.name}
              style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 className="font-semibold text-dark text-sm">{c.name}</h4>
              <div className="text-muted text-xs mt-1">{c.subcategories.length} subcategories</div>
              <div className="text-muted text-xs truncate mt-0.5">{c.subcategories.slice(0, 3).join(', ')}...</div>
            </div>
            <span className="badge badge-success text-xs">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
};
