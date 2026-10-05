import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  type = 'button',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props 
}) => {
  const baseClass = variant === 'icon' ? 'btn-icon' : 'btn';
  const variantClass = variant !== 'icon' && variant !== 'base' ? `btn-${variant}` : '';
  const sizeClass = size !== 'md' && size !== 'full' ? `btn-${size}` : '';
  const fullWidthClass = size === 'full' ? 'btn-full' : '';

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim().replace(/\s+/g, ' ')}
      disabled={isLoading || disabled}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Loader2 className="spinner" size={size === 'sm' ? 14 : 18} />
          {children}
        </span>
      ) : children}
    </button>
  );
};
