import React from 'react';

const PERMISSION_GROUPS = [
  {
    title: 'Dashboard',
    permissions: [
      { key: 'dashboard.read', label: 'View Dashboard' }
    ]
  },
  {
    title: 'Orders',
    permissions: [
      { key: 'orders.read', label: 'View Orders' },
      { key: 'orders.manage', label: 'Manage Orders' }
    ]
  },
  {
    title: 'Catalog',
    permissions: [
      { key: 'catalog.read', label: 'View Catalog' },
      { key: 'catalog.manage', label: 'Manage Catalog' }
    ]
  },
  {
    title: 'Customers',
    permissions: [
      { key: 'customers.read', label: 'View Customers' },
      { key: 'customers.manage', label: 'Manage Customers' }
    ]
  },
  {
    title: 'Riders',
    permissions: [
      { key: 'riders.read', label: 'View Riders' },
      { key: 'riders.manage', label: 'Manage Riders' }
    ]
  },
  {
    title: 'Employee Management',
    permissions: [
      { key: 'employees.manage', label: 'Manage Employees' }
    ]
  },
  {
    title: 'Reports',
    permissions: [
      { key: 'reports.read', label: 'View Reports' }
    ]
  },
  {
    title: 'System Settings',
    permissions: [
      { key: 'settings.read', label: 'View Settings' },
      { key: 'settings.manage', label: 'Manage Settings' }
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

const formatFallbackLabel = (key) => {
  if (!key) return 'Unknown';
  return key
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const PermissionSelector = ({ selectedPermissions = [], onChange }) => {
  const togglePermission = (perm) => {
    if (selectedPermissions.includes(perm)) {
      onChange(selectedPermissions.filter(p => p !== perm));
    } else {
      onChange([...selectedPermissions, perm]);
    }
  };

  const knownKeys = new Set(ALL_PERMISSIONS);
  const unknownKeys = selectedPermissions.filter(k => !knownKeys.has(k));

  return (
    <div className="permissions-selector max-h-[300px] overflow-y-auto p-4 border rounded bg-white mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.title} className="permission-group">
            <h4 className="font-bold text-sm mb-2 text-gray-700 border-b pb-1">{group.title}</h4>
            <div className="space-y-1">
              {group.permissions.map(perm => (
                <label htmlFor="auto-id-needed" key={perm.key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                  <input 
                    type="checkbox" 
                    className="form-checkbox text-primary rounded border-gray-300"
                    checked={selectedPermissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                  />
                  <span className="text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {unknownKeys.length > 0 && (
          <div className="permission-group">
            <h4 className="font-bold text-sm mb-2 text-gray-700 border-b pb-1">Other Permissions</h4>
            <div className="space-y-1">
              {unknownKeys.map(key => (
                <label htmlFor="auto-id-needed" key={key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                  <input 
                    type="checkbox" 
                    className="form-checkbox text-primary rounded border-gray-300"
                    checked={true}
                    onChange={() => togglePermission(key)}
                  />
                  <span className="text-sm">{formatFallbackLabel(key)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
