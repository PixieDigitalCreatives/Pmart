// PMart Mock Orders for Customer, Shop, Rider, and Admin Portals

export const mockOrders = [
  {
    id: 'PM10291',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    customer: {
      id: 'cust-shivam',
      name: 'Shivam',
      phone: '+91 98765 10291',
      email: 'shivam@example.com'
    },
    shop: {
      id: 'shop-101',
      name: 'PMart Darkstore Hub — Sector 62',
      address: 'Plot B-4, Sector 62, Noida, UP 201309',
      googleMapsUrl: 'https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9'
    },
    deliveryAddress: {
      tag: 'Home',
      line1: 'Flat 402, Tower B, Blossom Greens',
      line2: 'Sector 143',
      city: 'Noida',
      pincode: '201305',
      phone: '+91 98765 10291'
    },
    deliveryInstructions: 'Call upon reaching gate. Keep change for cash.',
    rider: {
      id: 'rider-201',
      name: 'Vikram Singh',
      phone: '+91 98112 34567',
      vehicleNumber: 'UP 16 AX 4492',
      vehicleType: 'Electric Scooter (Hero Electric)',
      rating: 4.9,
      deliveriesCompleted: 1420
    },
    orderStatus: 'OUT_FOR_DELIVERY',
    status: 'OUT_FOR_DELIVERY',
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    deliveryVerificationStatus: 'OTP_PENDING',
    deliveryOtp: '5821',
    timeline: [
      { status: 'ORDER PLACED', time: '15 mins ago', completed: true },
      { status: 'ORDER CONFIRMED', time: '13 mins ago', completed: true },
      { status: 'PREPARING', time: '10 mins ago', completed: true },
      { status: 'READY FOR PICKUP', time: '7 mins ago', completed: true },
      { status: 'OUT FOR DELIVERY', time: '4 mins ago', completed: true, current: true },
      { status: 'ARRIVED', time: 'Pending arrival', completed: false },
      { status: 'DELIVERED', time: 'Pending verification', completed: false }
    ],
    items: [
      {
        id: 'prod-101',
        name: 'Amul Taaza Fresh Toned Milk',
        unit: '1 L',
        price: 56,
        quantity: 3,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-201',
        name: 'Fresh Hybrid Tomatoes (Tamatar)',
        unit: '1 kg',
        price: 36,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-401',
        name: 'Aashirvaad Shudh Chakki Atta',
        unit: '5 kg',
        price: 244,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-501',
        name: 'Fortune Sunlite Refined Sunflower Oil',
        unit: '1 L',
        price: 150,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-801',
        name: 'Maggi 2-Minute Masala Instant Noodles (Pack of 4)',
        unit: '4 x 70 g',
        price: 50,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=150&q=80'
      }
    ],
    billing: {
      itemTotal: 684,
      deliveryFee: 0,
      platformFee: 0,
      discount: 0,
      grandTotal: 684
    },
    payment: {
      method: 'COD',
      status: 'PENDING',
      transactionId: 'COD-PM10291'
    },
    estimatedDeliveryTime: '3 mins'
  },
  {
    id: 'PM-88291',
    createdAt: '2026-09-25T17:45:00.000Z',
    customer: {
      id: 'cust-1',
      name: 'Rohan Sharma',
      phone: '+91 98765 43210',
      email: 'rohan.sharma@example.com'
    },
    shop: {
      id: 'shop-101',
      name: 'P Mart Sasaram',
      address: 'P Mart, Panjar Colony, Near Sasaram Junction, Rohtas, Bihar 821115',
      googleMapsUrl: 'https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9'
    },
    deliveryAddress: {
      tag: 'Home',
      line1: 'House #14, Gaurakshani Colony',
      line2: 'Near Post Office, Gaurakshani',
      city: 'Sasaram',
      pincode: '821115',
      phone: '+91 98765 43210'
    },
    deliveryInstructions: 'Ring the doorbell at the front gate.',
    rider: {
      id: 'rider-201',
      name: 'Vikram Singh',
      phone: '+91 98112 34567',
      vehicleNumber: 'BR 24 AX 4492',
      vehicleType: 'Electric Scooter (Hero Electric)',
      rating: 4.9,
      deliveriesCompleted: 1420
    },
    status: 'out_for_delivery', // 'placed' | 'accepted' | 'preparing' | 'ready' | 'rider_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled'
    deliveryOtp: '4829', // Prominently displayed for customer & entered by rider
    timeline: [
      { status: 'Order Placed', time: '5:45 PM', completed: true },
      { status: 'Order Accepted', time: '5:46 PM', completed: true },
      { status: 'Preparing', time: '5:48 PM', completed: true },
      { status: 'Ready', time: '5:51 PM', completed: true },
      { status: 'Rider Assigned', time: '5:52 PM', completed: true },
      { status: 'Picked Up', time: '5:54 PM', completed: true },
      { status: 'Out for Delivery', time: '5:56 PM', completed: true, current: true },
      { status: 'Delivered', time: 'Expected by 6:05 PM', completed: false }
    ],
    items: [
      {
        id: 'prod-101',
        name: 'Amul Taaza Fresh Toned Milk',
        unit: '1 L',
        price: 56,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-201',
        name: 'Fresh Hybrid Tomatoes (Tamatar)',
        unit: '1 kg',
        price: 32,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-801',
        name: 'Maggi 2-Minute Masala Instant Noodles (Pack of 4)',
        unit: '4 x 70 g',
        price: 56,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=150&q=80'
      }
    ],
    billing: {
      itemTotal: 200,
      deliveryFee: 15,
      platformFee: 5,
      discount: 20,
      grandTotal: 200
    },
    payment: {
      method: 'UPI (Google Pay)',
      status: 'Paid',
      transactionId: 'UPI-PM-948291048'
    },
    estimatedDeliveryTime: '8 mins'
  },
  {
    id: 'PM-88285',
    createdAt: '2026-09-25T16:10:00.000Z',
    customer: {
      id: 'cust-2',
      name: 'Pooja Verma',
      phone: '+91 97110 54321',
      email: 'pooja.verma@example.com'
    },
    shop: {
      id: 'shop-101',
      name: 'PMart Darkstore Hub — Sector 62',
      address: 'Plot B-4, Sector 62, Noida, UP 201309'
    },
    deliveryAddress: {
      tag: 'Work',
      line1: 'Floor 5, Oxygen Business Park',
      line2: 'Sector 144, Expressway',
      city: 'Noida',
      pincode: '201304',
      phone: '+91 97110 54321'
    },
    deliveryInstructions: 'Call upon arrival at reception.',
    rider: {
      id: 'rider-202',
      name: 'Amit Kumar',
      phone: '+91 98991 12345',
      vehicleNumber: 'UP 16 BZ 9821',
      rating: 4.8,
      deliveriesCompleted: 980
    },
    status: 'delivered',
    deliveryOtp: '7104',
    timeline: [
      { status: 'Order Placed', time: '4:10 PM', completed: true },
      { status: 'Order Accepted', time: '4:11 PM', completed: true },
      { status: 'Preparing', time: '4:13 PM', completed: true },
      { status: 'Ready', time: '4:16 PM', completed: true },
      { status: 'Rider Assigned', time: '4:17 PM', completed: true },
      { status: 'Picked Up', time: '4:19 PM', completed: true },
      { status: 'Out for Delivery', time: '4:21 PM', completed: true },
      { status: 'Delivered', time: '4:29 PM', completed: true, current: true }
    ],
    items: [
      {
        id: 'prod-301',
        name: 'Aashirvaad Superior MP Shudh Chakki Atta',
        unit: '5 kg',
        price: 248,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-401',
        name: 'Fortune Sunlite Refined Sunflower Oil Pouch',
        unit: '1 L',
        price: 138,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=150&q=80'
      }
    ],
    billing: {
      itemTotal: 386,
      deliveryFee: 0,
      platformFee: 5,
      discount: 30,
      grandTotal: 361
    },
    payment: {
      method: 'Credit Card (HDFC)',
      status: 'Paid',
      transactionId: 'TXN-HDFC-99214'
    },
    estimatedDeliveryTime: 'Delivered in 19 mins'
  },
  {
    id: 'PM-88295',
    createdAt: '2026-09-25T18:15:00.000Z',
    customer: {
      id: 'cust-3',
      name: 'Sunil Nair',
      phone: '+91 99401 23456',
      email: 'sunil.nair@example.com'
    },
    shop: {
      id: 'shop-101',
      name: 'PMart Darkstore Hub — Sector 62',
      address: 'Plot B-4, Sector 62, Noida, UP 201309'
    },
    deliveryAddress: {
      tag: 'Home',
      line1: 'House 112, Sector 50',
      line2: 'Near Central Park',
      city: 'Noida',
      pincode: '201301',
      phone: '+91 99401 23456'
    },
    deliveryInstructions: 'Do not ring bell, baby is sleeping.',
    rider: null,
    status: 'preparing',
    deliveryOtp: '6319',
    timeline: [
      { status: 'Order Placed', time: '6:15 PM', completed: true },
      { status: 'Order Accepted', time: '6:16 PM', completed: true },
      { status: 'Preparing', time: '6:18 PM', completed: true, current: true },
      { status: 'Ready', time: 'Pending', completed: false },
      { status: 'Rider Assigned', time: 'Pending', completed: false },
      { status: 'Picked Up', time: 'Pending', completed: false },
      { status: 'Out for Delivery', time: 'Pending', completed: false },
      { status: 'Delivered', time: 'Pending', completed: false }
    ],
    items: [
      {
        id: 'prod-701',
        name: 'Coca-Cola Zero Sugar Can',
        unit: '300 ml Can',
        price: 40,
        quantity: 4,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-501',
        name: 'Lay\'s Classic Salted Potato Chips',
        unit: '50 g',
        price: 20,
        quantity: 3,
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=150&q=80'
      },
      {
        id: 'prod-1201',
        name: 'Cadbury Dairy Milk Silk Chocolate Bar',
        unit: '150 g',
        price: 165,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=150&q=80'
      }
    ],
    billing: {
      itemTotal: 385,
      deliveryFee: 15,
      platformFee: 5,
      discount: 25,
      grandTotal: 380
    },
    payment: {
      method: 'Cash on Delivery',
      status: 'Pending',
      transactionId: 'COD-PENDING'
    },
    estimatedDeliveryTime: '12 mins'
  }
];
