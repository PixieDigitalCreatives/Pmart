'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createShop, createRider, marketplace, placeOrder, NEAR } = require('./helpers');
const { User } = require('../src/modules/auth/auth.model');
const { RiderProfile } = require('../src/modules/rider/rider.model');
const { AuditLog } = require('../src/modules/admin/audit.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const shopBody = (owner) => ({
  name: 'PMart Sasaram',
  phone: '9431000000',
  address: { street: 'GT Road', city: 'Sasaram', state: 'Bihar', pincode: '821115' },
  location: { lat: NEAR[1], lng: NEAR[0] },
  openTime: '07:00',
  closeTime: '23:00',
  deliveryRadiusKm: 4,
  owner
});

describe('stores', () => {
  it('creates a store together with a new shop-owner account that must change its password', async () => {
    const admin = await createUser('ADMIN');
    const res = await api().post('/api/admin/shops').set(auth(admin)).send(shopBody({ name: 'Ravi', phone: '9000000001', password: 'TempPass123' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'PMart Sasaram', deliveryRadiusKm: 4, owner: { name: 'Ravi', role: 'SHOP_OWNER' } });

    const owner = await User.findOne({ phone: '+919000000001' });
    expect(owner.mustChangePassword).toBe(true);
    expect(await AuditLog.countDocuments({ resource: 'Shop' })).toBe(1);

    const dup = await api().post('/api/admin/shops').set(auth(admin)).send(shopBody({ name: 'X', phone: '9000000001', password: 'TempPass123' }));
    expect(dup.body.code).toBe('PHONE_TAKEN');
  });

  it('lets the owner edit operations but not location, and reports real metrics', async () => {
    const m = await marketplace({ stock: 3 });
    await placeOrder(m.customer, m.address, [[m.product, 1]]);

    const update = await api().put('/api/shops/mine').set(auth(m.owner)).send({ isAcceptingOrders: false, openTime: '06:00', location: { lat: 1, lng: 1 } });
    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({ isAcceptingOrders: false, openTime: '06:00' });
    expect(update.body.data.location.lat).not.toBe(1);

    const metrics = await api().get('/api/shops/mine/metrics').set(auth(m.owner));
    expect(metrics.status).toBe(200);
    expect(metrics.body.data).toMatchObject({ todayOrders: 1, pendingOrders: 1, todayRevenue: 0 });
    expect(metrics.body.data.lowStockProducts.map((p) => p.name)).toContain(m.product.name);

    expect((await api().get('/api/shops/mine').set(auth(m.customer))).status).toBe(403);
  });
});

describe('riders', () => {
  it('creates riders offline with a forced password change, and refuses duplicate phones', async () => {
    const admin = await createUser('ADMIN');
    const res = await api().post('/api/admin/riders').set(auth(admin)).send({ name: 'Raju', phone: '9123456780', password: 'Rider1234', vehicleType: 'Bike', vehicleNumber: 'br01ab1234' });
    expect(res.status).toBe(201);
    const rider = await User.findById(res.body.data.id);
    expect(rider).toMatchObject({ role: 'RIDER', mustChangePassword: true });
    expect(await RiderProfile.findOne({ user: rider._id })).toMatchObject({ availabilityStatus: 'OFFLINE', vehicleNumber: 'BR01AB1234' });

    expect((await api().post('/api/admin/riders').set(auth(admin)).send({ name: 'X', phone: '+919123456780', password: 'Rider1234', vehicleType: 'Bike', vehicleNumber: 'BR01AB0001' })).body.code).toBe('PHONE_TAKEN');
  });

  it('refuses to deactivate a rider mid-delivery', async () => {
    const admin = await createUser('ADMIN');
    const rider = await createRider({}, { currentOrder: admin._id, availabilityStatus: 'BUSY' });
    const res = await api().patch(`/api/admin/riders/${rider._id}/status`).set(auth(admin)).send({ isActive: false });
    expect(res.status).toBe(409);
  });

  it('shows the fleet to shop owners for dispatch but not to customers', async () => {
    const owner = await createUser('SHOP_OWNER');
    const customer = await createUser('CUSTOMER');
    await createRider();
    expect((await api().get('/api/rider/fleet').set(auth(owner))).body.data).toHaveLength(1);
    expect((await api().get('/api/rider/fleet').set(auth(customer))).status).toBe(403);
  });
});

describe('staff and permissions', () => {
  it('creates an employee who activates through a one-time link', async () => {
    const admin = await createUser('ADMIN');
    const res = await api().post('/api/admin/employees').set(auth(admin)).send({ name: 'Ops', phone: '9988776655', permissions: ['orders.read'] });
    expect(res.status).toBe(201);
    const { setupToken } = res.body.data;

    const list = await api().get('/api/admin/employees').set(auth(admin));
    expect(list.body.data.find((e) => e.name === 'Ops')).toMatchObject({ activationPending: true, permissions: ['orders.read'] });

    expect((await api().post('/api/auth/activate').send({ token: setupToken, password: 'OpsPass123' })).status).toBe(200);
    const login = await api().post('/api/auth/login').send({ phone: '9988776655', password: 'OpsPass123' });
    expect(login.body.user).toMatchObject({ role: 'EMPLOYEE', permissions: ['orders.read'] });
  });

  it('applies permissions to admin routes', async () => {
    const reader = await createUser('EMPLOYEE', { permissions: ['orders.read'] });
    expect((await api().get('/api/admin/orders').set(auth(reader))).status).toBe(200);
    expect((await api().get('/api/admin/dashboard').set(auth(reader))).status).toBe(403);
    expect((await api().put('/api/admin/settings').set(auth(reader)).send({ baseDeliveryFee: 1 })).status).toBe(403);
    const customer = await createUser('CUSTOMER');
    expect((await api().get('/api/admin/orders').set(auth(customer))).status).toBe(403);
  });

  it('validates settings and exposes only public fields publicly', async () => {
    const admin = await createUser('ADMIN');
    expect((await api().put('/api/admin/settings').set(auth(admin)).send({ baseDeliveryFee: -1 })).status).toBe(400);
    const ok = await api().put('/api/admin/settings').set(auth(admin)).send({ baseDeliveryFee: 20, supportPhone: '9431012345', deliverySlaMinutes: 25 });
    expect(ok.body.data).toMatchObject({ baseDeliveryFee: 20, supportPhone: '+919431012345', deliverySlaMinutes: 25 });

    const pub = await api().get('/api/settings/public');
    expect(pub.body.data).toEqual({ freeDeliveryThreshold: 299, baseDeliveryFee: 20, platformHandlingFee: 5, supportPhone: '+919431012345', supportEmail: '', otpLength: 4, googleSignIn: false });
  });
});

describe('reporting', () => {
  it('computes dashboard, reports, customers and payments from real orders', async () => {
    const admin = await createUser('ADMIN');
    const m = await marketplace({ price: 100 });
    await placeOrder(m.customer, m.address, [[m.product, 2]]);

    const dash = await api().get('/api/admin/dashboard').set(auth(admin));
    expect(dash.body.data).toMatchObject({ totalOrders: 1, activeOrders: 1, todayOrders: 1, registeredCustomers: 1, deliveredRevenue: 0 });

    const report = await api().get('/api/admin/reports').query({ period: 'today' }).set(auth(admin));
    expect(report.body.data).toMatchObject({ totalOrders: 1, totalSales: 220 });
    expect(report.body.data.categoryDistribution[0]).toMatchObject({ category: m.category.name, revenue: 200, share: 100 });

    const customers = await api().get('/api/admin/customers').set(auth(admin));
    expect(customers.body.data[0]).toMatchObject({ orders: 1, spent: 0 });

    const payments = await api().get('/api/admin/payments').set(auth(admin));
    expect(payments.body.data[0]).toMatchObject({ totalAmount: 220, paymentStatus: 'PENDING' });

    const csv = await api().get('/api/admin/orders/export.csv').set(auth(admin));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Order Number');
  });
});

describe('store owner isolation', () => {
  it('prevents an owner from assigning riders to another store', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    const intruder = await createUser('SHOP_OWNER');
    await createShop(intruder);
    const rider = await createRider();
    expect((await api().post(`/api/orders/${id}/assign-rider`).set(auth(intruder)).send({ riderId: String(rider._id) })).status).toBe(403);
  });
});
