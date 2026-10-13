import React from 'react';

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
  { title: 'Catalog', permissions: [{ key: 'catalog.manage', label: 'Manage products and categories' }] },
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
  { title: 'Reports', permissions: [{ key: 'reports.read', label: 'View reports, payments and audit log' }] },
  {
    title: 'Settings',
    permissions: [
      { key: 'settings.read', label: 'View platform settings' },
      { key: 'settings.manage', label: 'Change platform settings' }
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export const PermissionSelector = ({ value = [], onChange, disabled = false }) => {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key]);
  return (
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
  );
};
