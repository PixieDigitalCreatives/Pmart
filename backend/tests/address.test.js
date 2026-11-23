'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createShop, NEAR, FAR } = require('./helpers');
const { Address } = require('../src/modules/address/address.model');
const { Shop } = require('../src/modules/shop/shop.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const body = (overrides = {}) => ({
  label: 'HOME',
  recipientName: 'Asha',
  recipientPhone: '9876543210',
  houseNumber: '12',
  street: 'Station Road',
  city: 'Sasaram',
  state: 'Bihar',
  pincode: '821115',
  location: { type: 'Point', coordinates: NEAR },
  ...overrides
});

describe('address book', () => {
  it('makes the first address the default and keeps exactly one default', async () => {
    const customer = await createUser('CUSTOMER');
    const first = await api().post('/api/addresses').set(auth(customer)).send(body());
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ isDefault: true, recipientPhone: '+919876543210' });

    const second = await api().post('/api/addresses').set(auth(customer)).send(body({ houseNumber: '14', isDefault: true }));
    expect(second.body.data.isDefault).toBe(true);
    expect(await Address.countDocuments({ user: customer._id, isDefault: true, isActive: true })).toBe(1);

    await api().patch(`/api/addresses/${first.body.data._id}/default`).set(auth(customer));
    const list = await api().get('/api/addresses').set(auth(customer));
    expect(list.body.data[0]._id).toBe(first.body.data._id);
    expect(list.body.data.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it('stores a formatted address built from the confirmed fields, not the client-supplied geocoder text', async () => {
    const customer = await createUser('CUSTOMER');
    const res = await api()
      .post('/api/addresses')
      .set(auth(customer))
      .send(body({ area: 'Gaurakshini', floor: '2', formattedAddress: '119A, Bihar, India' }));
    expect(res.status).toBe(201);
    expect(res.body.data.formattedAddress).toBe('12, Floor 2, Station Road, Gaurakshini, Sasaram, Bihar - 821115');

    const updated = await api().put(`/api/addresses/${res.body.data._id}`).set(auth(customer)).send(body({ area: 'Gaurakshini', floor: '2', houseNumber: '14B' }));
    expect(updated.body.data.formattedAddress).toMatch(/^14B, Floor 2, Station Road/);
  });

  it('promotes another address when the default is deleted', async () => {
    const customer = await createUser('CUSTOMER');
    const a = await api().post('/api/addresses').set(auth(customer)).send(body());
    const b = await api().post('/api/addresses').set(auth(customer)).send(body({ houseNumber: '99' }));
    await api().delete(`/api/addresses/${a.body.data._id}`).set(auth(customer));
    expect((await Address.findById(b.body.data._id)).isDefault).toBe(true);
  });

  it('ignores mass-assigned fields and rejects bad coordinates and duplicates', async () => {
    const customer = await createUser('CUSTOMER');
    const victim = await createUser('CUSTOMER');
    const res = await api().post('/api/addresses').set(auth(customer)).send(body({ user: String(victim._id), isActive: false }));
    expect(res.status).toBe(201);
    expect(res.body.data.user).toBe(String(customer._id));
    expect(res.body.data.isActive).toBe(true);

    expect((await api().post('/api/addresses').set(auth(customer)).send(body())).body.code).toBe('ADDRESS_EXISTS');
    expect((await api().post('/api/addresses').set(auth(customer)).send(body({ location: { coordinates: [0, 0] } }))).status).toBe(400);
    expect((await api().post('/api/addresses').set(auth(customer)).send(body({ pincode: '12' }))).status).toBe(400);
  });

  it("does not expose or modify another customer's address", async () => {
    const owner = await createUser('CUSTOMER');
    const other = await createUser('CUSTOMER');
    const created = await api().post('/api/addresses').set(auth(owner)).send(body());
    const id = created.body.data._id;
    expect((await api().get(`/api/addresses/${id}`).set(auth(other))).status).toBe(404);
    expect((await api().put(`/api/addresses/${id}`).set(auth(other)).send(body())).status).toBe(404);
    expect((await api().delete(`/api/addresses/${id}`).set(auth(other))).status).toBe(404);
  });

  it('checks serviceability against store delivery radius and order acceptance', async () => {
    const customer = await createUser('CUSTOMER');
    const owner = await createUser('SHOP_OWNER');
    const shop = await createShop(owner);

    const near = await api().post('/api/addresses/serviceability').set(auth(customer)).send({ lat: NEAR[1], lng: NEAR[0] });
    expect(near.body.data).toMatchObject({ serviceable: true, nearestShop: { name: shop.name } });
    const far = await api().post('/api/addresses/serviceability').set(auth(customer)).send({ lat: FAR[1], lng: FAR[0] });
    expect(far.body.data.serviceable).toBe(false);

    await Shop.updateOne({ _id: shop._id }, { isAcceptingOrders: false });
    const paused = await api().post('/api/addresses/serviceability').set(auth(customer)).send({ lat: NEAR[1], lng: NEAR[0] });
    expect(paused.body.data.serviceable).toBe(false);
  });

  it('reports reverse geocoding as unavailable without an API key', async () => {
    const { env } = require('../src/config/env');
    const originalKey = env.MAPTILER_API_KEY;
    delete env.MAPTILER_API_KEY;
    try {
      const customer = await createUser('CUSTOMER');
      const res = await api().post('/api/addresses/reverse-geocode').set(auth(customer)).send({ lat: 24.9, lng: 84.0 });
      expect(res.status).toBe(503);
    } finally {
      if (originalKey !== undefined) env.MAPTILER_API_KEY = originalKey;
    }
  });
});
