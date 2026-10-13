'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createRider, createShop, marketplace, placeOrder } = require('./helpers');
const { Product } = require('../src/modules/catalog/catalog.model');
const { Order } = require('../src/modules/order/order.model');
const { RiderProfile } = require('../src/modules/rider/rider.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const setStatus = (user, id, status, reason) => api().put(`/api/orders/${id}/status`).set(auth(user)).send({ status, reason });

async function readyOrder() {
  const m = await marketplace({ stock: 10, price: 100 });
  const placed = await placeOrder(m.customer, m.address, [[m.product, 2]]);
  const id = placed.body.data._id;
  for (const status of ['ACCEPTED', 'PREPARING', 'READY']) {
    const r = await setStatus(m.owner, id, status);
    expect(r.status).toBe(200);
  }
  return { ...m, id };
}

async function otpFor(customer, id) {
  const res = await api().get(`/api/orders/${id}/otp`).set(auth(customer));
  expect(res.status).toBe(200);
  return res.body.data.deliveryOtp;
}

describe('happy path', () => {
  it('goes from placement to delivery with every guard enforced', async () => {
    const { owner, customer, id, product } = await readyOrder();
    const rider = await createRider();

    const assigned = await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(rider._id) });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data).toMatchObject({ status: 'ASSIGNED', rider: { name: rider.name, vehicleType: 'Bike' } });
    expect((await RiderProfile.findOne({ user: rider._id })).availabilityStatus).toBe('BUSY');

    // The rider cannot go offline mid-delivery.
    expect((await api().patch('/api/rider/availability').set(auth(rider)).send({ status: 'OFFLINE' })).status).toBe(409);

    expect((await api().post(`/api/rider/orders/${id}/pickup`).set(auth(rider))).status).toBe(200);
    expect((await setStatus(rider, id, 'OUT_FOR_DELIVERY')).body.data.status).toBe('OUT_FOR_DELIVERY');

    const otp = await otpFor(customer, id);
    expect(otp).toMatch(/^\d{4}$/);

    // Delivery is refused until arrival, OTP and cash collection are all done.
    expect((await api().post(`/api/orders/${id}/deliver`).set(auth(rider))).body.code).toBe('INVALID_TRANSITION');
    expect((await setStatus(rider, id, 'ARRIVED')).status).toBe(200);
    expect((await api().post(`/api/orders/${id}/deliver`).set(auth(rider))).body.code).toBe('OTP_NOT_VERIFIED');

    const verified = await api().post(`/api/orders/${id}/verify-otp`).set(auth(rider)).send({ otp });
    expect(verified.status).toBe(200);
    expect(verified.body.data.deliveryVerificationStatus).toBe('OTP_VERIFIED');
    expect((await api().post(`/api/orders/${id}/deliver`).set(auth(rider))).body.code).toBe('PAYMENT_NOT_COLLECTED');

    expect((await api().put(`/api/orders/${id}/payment-status`).set(auth(rider)).send({ paymentStatus: 'REFUNDED' })).status).toBe(403);
    expect((await api().put(`/api/orders/${id}/payment-status`).set(auth(rider)).send({ paymentStatus: 'COLLECTED' })).status).toBe(200);

    const delivered = await api().post(`/api/orders/${id}/deliver`).set(auth(rider));
    expect(delivered.status).toBe(200);
    expect(delivered.body.data).toMatchObject({ status: 'DELIVERED', paymentStatus: 'COLLECTED' });

    const profile = await RiderProfile.findOne({ user: rider._id });
    expect(profile).toMatchObject({ availabilityStatus: 'AVAILABLE', currentOrder: null, completedDeliveries: 1 });
    expect((await Product.findById(product._id)).stockCount).toBe(8);

    const stored = await Order.findById(id).select('+encryptedOtp +deliveryOtpHash');
    expect(stored.encryptedOtp).toBeUndefined();
    expect(stored.statusHistory.map((h) => h.status)).toEqual(
      expect.arrayContaining(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED'])
    );
  });
});

describe('guards', () => {
  it('locks the delivery code after 5 wrong attempts and allows a new code', async () => {
    const { owner, customer, id } = await readyOrder();
    const rider = await createRider();
    await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(rider._id) });
    await api().post(`/api/rider/orders/${id}/pickup`).set(auth(rider));
    await setStatus(rider, id, 'OUT_FOR_DELIVERY');
    const otp = await otpFor(customer, id);
    const wrong = otp === '0000' ? '1111' : '0000';

    for (let i = 0; i < 5; i += 1) {
      expect((await api().post(`/api/orders/${id}/verify-otp`).set(auth(rider)).send({ otp: wrong })).body.code).toBe('OTP_INVALID');
    }
    expect((await api().post(`/api/orders/${id}/verify-otp`).set(auth(rider)).send({ otp })).body.code).toBe('OTP_LOCKED');

    expect((await api().post(`/api/orders/${id}/resend-otp`).set(auth(rider))).status).toBe(200);
    const fresh = await otpFor(customer, id);
    expect((await api().post(`/api/orders/${id}/verify-otp`).set(auth(rider)).send({ otp: fresh })).status).toBe(200);
  });

  it('lets customers cancel only before preparation, restocking exactly once', async () => {
    const m = await marketplace({ stock: 5 });
    const placed = await placeOrder(m.customer, m.address, [[m.product, 2]]);
    const id = placed.body.data._id;
    expect((await Product.findById(m.product._id)).stockCount).toBe(3);

    const cancelled = await setStatus(m.customer, id, 'CANCELLED');
    expect(cancelled.status).toBe(200);
    expect((await Product.findById(m.product._id)).stockCount).toBe(5);
    expect((await setStatus(m.customer, id, 'CANCELLED')).status).toBe(400);
    expect((await Product.findById(m.product._id)).stockCount).toBe(5);

    const second = await placeOrder(m.customer, m.address, [[m.product, 1]]);
    await setStatus(m.owner, second.body.data._id, 'ACCEPTED');
    await setStatus(m.owner, second.body.data._id, 'PREPARING');
    expect((await setStatus(m.customer, second.body.data._id, 'CANCELLED')).body.code).toBe('TRANSITION_NOT_ALLOWED');
  });

  it('requires a reason to reject and blocks customers from store actions', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    expect((await setStatus(m.customer, id, 'ACCEPTED')).status).toBe(403);
    expect((await setStatus(m.owner, id, 'REJECTED')).body.code).toBe('REASON_REQUIRED');
    expect((await setStatus(m.owner, id, 'REJECTED', 'Out of stock')).body.data).toMatchObject({ status: 'REJECTED', cancellationReason: 'Out of stock' });
  });

  it('re-dispatches a failed delivery without restocking, then restocks on cancellation', async () => {
    const { owner, id, product } = await readyOrder();
    const rider = await createRider();
    const admin = await createUser('ADMIN');
    await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(rider._id) });
    await api().post(`/api/rider/orders/${id}/pickup`).set(auth(rider));
    await setStatus(rider, id, 'OUT_FOR_DELIVERY');

    expect((await setStatus(rider, id, 'DELIVERY_FAILED')).body.code).toBe('REASON_REQUIRED');
    expect((await setStatus(rider, id, 'DELIVERY_FAILED', 'Customer unreachable')).status).toBe(200);
    expect((await RiderProfile.findOne({ user: rider._id })).availabilityStatus).toBe('AVAILABLE');
    expect((await Product.findById(product._id)).stockCount).toBe(8);

    const redispatched = await setStatus(owner, id, 'READY');
    expect(redispatched.body.data).toMatchObject({ status: 'READY', rider: null });

    const rider2 = await createRider();
    expect((await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(rider2._id) })).status).toBe(200);
    expect((await setStatus(admin, id, 'CANCELLED', 'Customer asked to cancel')).status).toBe(200);
    expect((await Product.findById(product._id)).stockCount).toBe(10);
    expect((await RiderProfile.findOne({ user: rider2._id })).availabilityStatus).toBe('AVAILABLE');
  });

  it('refuses busy or offline riders and supports re-assignment before pickup', async () => {
    const { owner, id } = await readyOrder();
    const offline = await createRider({}, { availabilityStatus: 'OFFLINE' });
    expect((await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(offline._id) })).body.code).toBe('RIDER_UNAVAILABLE');

    const first = await createRider();
    const second = await createRider();
    await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(first._id) });
    expect((await api().post(`/api/orders/${id}/assign-rider`).set(auth(owner)).send({ riderId: String(second._id) })).status).toBe(200);
    expect((await RiderProfile.findOne({ user: first._id })).availabilityStatus).toBe('AVAILABLE');
    expect((await api().post(`/api/rider/orders/${id}/pickup`).set(auth(first))).status).toBe(403);
  });

  it('allows staff transitions only with orders.manage', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    const reader = await createUser('EMPLOYEE', { permissions: ['orders.read'] });
    const manager = await createUser('EMPLOYEE', { permissions: ['orders.read', 'orders.manage'] });
    expect((await api().get(`/api/orders/${id}`).set(auth(reader))).status).toBe(200);
    expect((await setStatus(reader, id, 'ACCEPTED')).status).toBe(403);
    expect((await setStatus(manager, id, 'ACCEPTED')).status).toBe(200);
  });
});

describe('access control', () => {
  it('keeps orders private to their customer, store, assigned rider and staff', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    const otherCustomer = await createUser('CUSTOMER');
    const otherOwner = await createUser('SHOP_OWNER');
    await createShop(otherOwner);
    const rider = await createRider();

    expect((await api().get(`/api/orders/${id}`).set(auth(m.customer))).status).toBe(200);
    expect((await api().get(`/api/orders/${id}`).set(auth(m.owner))).status).toBe(200);
    expect((await api().get(`/api/orders/${id}`).set(auth(otherCustomer))).status).toBe(403);
    expect((await api().get(`/api/orders/${id}`).set(auth(otherOwner))).status).toBe(403);
    expect((await api().get(`/api/orders/${id}`).set(auth(rider))).status).toBe(403);
    expect((await api().get(`/api/orders/${id}/otp`).set(auth(otherCustomer))).status).toBe(403);

    const list = await api().get('/api/orders').set(auth(otherCustomer));
    expect(list.body.data).toHaveLength(0);
    expect((await api().get('/api/orders').set(auth(m.owner))).body.data).toHaveLength(1);
  });
});
