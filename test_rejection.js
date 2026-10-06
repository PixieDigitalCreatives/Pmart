import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  validateStatus: () => true, // Don't throw on error
});

async function runTest() {
  console.log('--- STARTING REJECTION TEST ---');
  
  // 1. Login as customer
  await api.post('/auth/send-otp', { phone: '9999999999', role: 'CUSTOMER' });
  const custLogin = await api.post('/auth/verify-otp', { phone: '9999999999', otp: '123456', role: 'CUSTOMER' });
  
  if (custLogin.status !== 200) {
    console.log('Customer login failed:', custLogin.data);
    return;
  }
  const custToken = custLogin.data.data.token;
  const custConfig = { headers: { Authorization: `Bearer ${custToken}` } };
  console.log('Customer logged in.');

  // 2. Fetch products to get a valid product ID
  const products = await api.get('/catalog/products');
  const product = products.data.data[0];
  console.log(`Selected product: ${product.name} (stock: ${product.stockCount})`);

  // 3. Place order
  const checkoutPayload = {
    items: [
      { product: product._id, name: product.name, price: product.price, quantity: 1 }
    ],
    deliveryAddress: {
      recipientName: 'Test Customer',
      recipientPhone: '9999999999',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      pincode: '123456',
      zipCode: '123456',
      coordinates: { lat: 12.9716, lng: 77.5946 }
    },
    paymentMethod: 'COD',
    idempotencyKey: `test-${Date.now()}`
  };

  const orderRes = await api.post('/orders/checkout', checkoutPayload, custConfig);
  if (orderRes.status !== 201) {
    console.log('Checkout failed:', orderRes.data);
    return;
  }
  const orderId = orderRes.data.data._id;
  console.log(`Order placed successfully: ${orderId}`);

  // Fetch product again to check stock
  const productAfter = await api.get(`/catalog/products/${product._id}`);
  console.log(`Product stock after order: ${productAfter.data.data.stockCount}`);

  // 4. Login as admin
  await api.post('/auth/send-otp', { phone: '9999999999', role: 'ADMIN' });
  const adminLogin = await api.post('/auth/verify-otp', { phone: '9999999999', otp: '123456', role: 'ADMIN' });
  if (adminLogin.status !== 200) {
    console.log('Admin login failed:', adminLogin.data);
    return;
  }
  const adminToken = adminLogin.data.data.token;
  const adminConfig = { headers: { Authorization: `Bearer ${adminToken}` } };
  console.log('Admin logged in.');

  // 5. Reject the order
  const rejectRes = await api.patch(`/admin/orders/${orderId}/status`, {
    status: 'REJECTED'
  }, adminConfig);
  
  if (rejectRes.status !== 200) {
    console.log('Rejection failed:', rejectRes.data);
    return;
  }
  console.log(`Order rejected successfully. Status is now: ${rejectRes.data.data.status}`);
  console.log(`Rejection Reason: ${rejectRes.data.data.rejectionReason}`);

  // Fetch product again to check stock restored
  const productFinal = await api.get(`/catalog/products/${product._id}`);
  console.log(`Product stock after rejection (should be restored): ${productFinal.data.data.stockCount}`);

  // 6. Check order tracking details
  const trackRes = await api.get(`/orders/${orderId}/tracking`, custConfig);
  console.log('Tracking payload status:', trackRes.data.data.status);
  
  console.log('--- TEST FINISHED ---');
}

runTest().catch(console.error);
