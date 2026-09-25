// PMart Mock Users across all 4 Roles

export const mockUsers = {
  customer: {
    id: 'user-cust-1',
    name: 'Rohan Sharma',
    phone: '+91 98765 43210',
    email: 'rohan.sharma@example.com',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    memberSince: 'May 2024',
    savedAddresses: [
      {
        id: 'addr-1',
        tag: 'Home',
        isDefault: true,
        line1: 'Flat 402, Tower B, Blossom Greens',
        line2: 'Sector 143, Expressway',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201305',
        phone: '+91 98765 43210'
      },
      {
        id: 'addr-2',
        tag: 'Work',
        isDefault: false,
        line1: 'Building 4, Tech Boulevard',
        line2: 'Sector 127',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        phone: '+91 98765 43210'
      }
    ]
  },
  shopOwner: {
    id: 'user-shop-1',
    name: 'Manish Tyagi',
    phone: '+91 98102 99881',
    email: 'manish.tyagi@pmart.in',
    role: 'shop_owner',
    shopId: 'shop-101',
    shopName: 'PMart Darkstore Hub — Sector 62',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
  },
  rider: {
    id: 'user-rider-1',
    name: 'Vikram Singh',
    phone: '+91 98112 34567',
    email: 'vikram.singh@pmart.in',
    role: 'rider',
    vehicleNumber: 'UP 16 AX 4492',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  admin: {
    id: 'user-admin-1',
    name: 'Ananya Saxena',
    phone: '+91 98100 11223',
    email: 'ananya.admin@pmart.in',
    role: 'admin',
    department: 'Central Operations & Logistics',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
  }
};
