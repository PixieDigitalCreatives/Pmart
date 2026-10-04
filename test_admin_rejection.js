import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  validateStatus: () => true,
});

async function findAndRejectOrder() {
  console.log('--- STARTING ADMIN REJECTION TEST ---');
  
  // Login as admin
  await api.post('/auth/send-otp', { phone: '9999999999', role: 'ADMIN' });
  const adminLogin = await api.post('/auth/verify-otp', { phone: '9999999999', otp: '123456', role: 'ADMIN' });
  
  if (adminLogin.status !== 200) {
    // If OTP login fails, try the email/pass route
    console.log('OTP login failed, trying email/pass...');
    const emailLogin = await api.post('/auth/admin/login', { email: 'admin@pmart.com', password: 'admin123' });
    if (emailLogin.status !== 200) {
      console.log('Admin login failed:', emailLogin.data);
      return;
    }
    var adminToken = emailLogin.data.data.token;
  } else {
    var adminToken = adminLogin.data.data.token;
  }
  
  const adminConfig = { headers: { Authorization: `Bearer ${adminToken}` } };
  console.log('Admin logged in.');

  // Fetch orders to find a PENDING one
  const ordersRes = await api.get('/admin/orders?limit=50', adminConfig);
  if (ordersRes.status !== 200) {
    console.log('Failed to fetch orders:', ordersRes.data);
    return;
  }
  
  const pendingOrder = ordersRes.data.data.orders.find(o => o.status === 'PENDING' || o.orderStatus === 'PENDING');
  if (!pendingOrder) {
    console.log('No PENDING order found to reject. Please create one.');
    return;
  }
  
  console.log(`Found PENDING order: ${pendingOrder._id}, attempting to reject...`);
  
  const rejectRes = await api.patch(`/admin/orders/${pendingOrder._id}/status`, {
    status: 'REJECTED'
  }, adminConfig);
  
  console.log(`Rejection API response status: ${rejectRes.status}`);
  console.log('Rejection API response body:', JSON.stringify(rejectRes.data, null, 2));
}

findAndRejectOrder().catch(console.error);
