import React from 'react';
import { TbPhotoOff as ImageOff } from 'react-icons/tb';
import { assetUrl } from '@/utils/format';
import './inventory.scss';

/**
 * Product photo thumbnail. Only a VERIFIED photo is shown; anything else is the neutral
 * "Image Not Available" placeholder, so an unverified image is never presented as the product.
 */
export const ProductThumb = ({ product, size = 44, showLabel = false }) => {
  const verified = product?.image?.status === 'VERIFIED' && product?.imageUrl;
  if (verified) {
    return <img src={assetUrl(product.imageUrl)} alt={product.name} className="product-thumb" style={{ width: size, height: size }} loading="lazy" />;
  }
  return (
    <div className="product-thumb product-thumb--empty" style={{ width: size, height: size }} title="Image Not Available" role="img" aria-label="Image Not Available">
      <ImageOff size={Math.max(14, size / 3)} />
      {showLabel && <span>Image Not Available</span>}
    </div>
  );
};

const IMAGE_STATUS = {
  VERIFIED: { label: 'Verified', className: 'badge-success' },
  PENDING: { label: 'Pending verification', className: 'badge-warning' },
  NOT_AVAILABLE: { label: 'Not available', className: 'badge-neutral' }
};

export const ImageStatusBadge = ({ status = 'NOT_AVAILABLE' }) => {
  const s = IMAGE_STATUS[status] || IMAGE_STATUS.NOT_AVAILABLE;
  return <span className={`badge ${s.className}`}>{s.label}</span>;
};

/** Colour-coded stock figure: red at or below zero, amber when low. */
export const StockBadge = ({ stock, threshold = 10, unit }) => {
  const n = Number(stock || 0);
  const type = n <= 0 ? 'badge-error' : n <= threshold ? 'badge-warning' : 'badge-success';
  return (
    <span className={`badge ${type}`}>
      {n.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
      {unit ? ` ${unit}` : ''}
    </span>
  );
};
