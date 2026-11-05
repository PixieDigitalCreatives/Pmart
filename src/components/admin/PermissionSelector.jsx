import React from 'react';
import { Button } from '@/components/ui';

// Must match PERMISSIONS in backend/src/modules/auth/auth.model.js.
const PERMISSION_GROUPS = [
  { title: 'Dashboard', permissions: [{ key: 'dashboard.read', label: 'View dashboard' }] },
  {
    title: 'Orders',
    permissions: [
      { key: 'orders.read', label: 'View orders and live deliveries' },
      { key: 'orders.manage', label: 'Change order status and assign riders' }
    ]
  },
  {
    title: 'Products',
    permissions: [
      { key: 'catalog.manage', label: 'Add and edit products and categories' },
      { key: 'catalog.delete', label: 'Delete products' },
      { key: 'catalog.import', label: 'Import inventory CSV' },
      { key: 'images.verify', label: 'Verify, upload and remove product photos' }
    ]
  },
  {
    title: 'Inventory',
    permissions: [
      { key: 'inventory.read', label: 'Search products, view stock and stock ledger' },
      { key: 'inventory.restock', label: 'Restock inventory' },
      { key: 'inventory.adjust', label: 'Adjust stock manually' },
      { key: 'inventory.negative_stock', label: 'Bill below zero stock' }
    ]
  },
  {
    title: 'In-store billing',
    permissions: [
      { key: 'invoices.create', label: 'Create invoices' },
      { key: 'invoices.read', label: 'View invoices' },
      { key: 'invoices.cancel', label: 'Cancel invoices, returns and refunds' },
      { key: 'billing.price_override', label: 'Change prices and give discounts on invoices' },
      { key: 'payments.record', label: 'Record payments' },
      { key: 'payments.read', label: 'View payment history' }
    ]
  },
  { title: 'Stores', permissions: [{ key: 'shops.manage', label: 'Create and edit stores' }] },
  { title: 'Customers', permissions: [{ key: 'customers.read', label: 'View customers' }] },
  {
    title: 'Riders',
    permissions: [
      { key: 'riders.read', label: 'View riders' },
      { key: 'riders.manage', label: 'Add and edit riders' }
    ]
  },
  { title: 'Staff', permissions: [{ key: 'employees.manage', label: 'Manage staff accounts' }] },
  { title: 'Reports', permissions: [{ key: 'reports.read', label: 'View reports, exports, payments and audit log' }] },
  {
    title: 'Settings',
    permissions: [
      { key: 'settings.read', label: 'View platform settings' },
      { key: 'settings.manage', label: 'Change platform settings' }
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

// Must match STORE_MANAGER_PERMISSIONS in backend/src/modules/auth/auth.model.js.
export const STORE_MANAGER_PERMISSIONS = ['dashboard.read', 'inventory.read', 'inventory.restock', 'invoices.create', 'invoices.read', 'payments.record', 'payments.read'];

export const PermissionSelector = ({ value = [], onChange, disabled = false }) => {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key]);
  return (
    <div>
      {!disabled && (
        <div className="actions-row mb-2">
          <Button size="sm" variant="secondary" onClick={() => onChange([...new Set([...value, ...STORE_MANAGER_PERMISSIONS])])} title="Search products, restock, create invoices and record payments">
            Add Store Manager permissions
          </Button>
          <span className="muted-note">Store managers cannot delete products, import, adjust stock, cancel invoices or change prices unless you tick those too.</span>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.title} className="border rounded-md p-2" disabled={disabled}>
            <legend className="text-xs font-semibold px-1">{group.title}</legend>
            {group.permissions.map((p) => (
              <label key={p.key} htmlFor={`perm-${p.key}`} className="flex items-center gap-2 text-sm py-0.5">
                <input id={`perm-${p.key}`} type="checkbox" checked={value.includes(p.key)} onChange={() => toggle(p.key)} />
                {p.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
};
