// PMart Delivery Fleet & Rider Profiles

export const mockRiders = [
  {
    id: 'rider-201',
    name: 'Vikram Singh',
    phone: '+91 98112 34567',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    vehicleNumber: 'BR 24 AX 4492',
    vehicleType: 'Hero Electric Nyx',
    assignedShopId: 'shop-101',
    assignedShopName: 'P Mart Sasaram',
    status: 'on_delivery', // 'available' | 'on_delivery' | 'offline'
    rating: 4.9,
    totalDeliveries: 1420,
    todayDeliveries: 18,
    todayEarnings: 1260,
    currentOrder: 'PM-88291',
    joinedDate: 'Jan 2025'
  },
  {
    id: 'rider-202',
    name: 'Amit Kumar',
    phone: '+91 98991 12345',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    vehicleNumber: 'BR 24 BZ 9821',
    vehicleType: 'Honda Activa 6G',
    assignedShopId: 'shop-101',
    assignedShopName: 'P Mart Sasaram',
    status: 'available',
    rating: 4.8,
    totalDeliveries: 980,
    todayDeliveries: 14,
    todayEarnings: 980,
    currentOrder: null,
    joinedDate: 'Mar 2025'
  },
  {
    id: 'rider-203',
    name: 'Deepak Yadav',
    phone: '+91 98711 77889',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    vehicleNumber: 'BR 24 CK 1209',
    vehicleType: 'Bajaj Chetak EV',
    assignedShopId: 'shop-101',
    assignedShopName: 'P Mart Sasaram',
    status: 'available',
    rating: 4.9,
    totalDeliveries: 1840,
    todayDeliveries: 22,
    todayEarnings: 1540,
    currentOrder: null,
    joinedDate: 'Aug 2024'
  }
];
