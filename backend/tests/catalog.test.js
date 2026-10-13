'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createShop, createCategory, createProduct } = require('./helpers');
const { Product } = require('../src/modules/catalog/catalog.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

async function storeWithProducts() {
  const owner = await createUser('SHOP_OWNER');
  const shop = await createShop(owner);
  const category = await createCategory();
  return { owner, shop, category };
}

describe('storefront', () => {
  it('publishes fee settings, the delivery code length and whether Google sign-in is available', async () => {
    const res = await api().get('/api/settings/public');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ otpLength: 4, googleSignIn: false });
    expect(typeof res.body.data.freeDeliveryThreshold).toBe('number');
  });

  it('lists only active products from active stores', async () => {
    const { shop, category } = await storeWithProducts();
    await createProduct(shop, category, { name: 'Visible Milk' });
    await createProduct(shop, category, { name: 'Archived Milk', isActive: false });
    const closedOwner = await createUser('SHOP_OWNER');
    const closed = await createShop(closedOwner, { isActive: false });
    await createProduct(closed, category, { name: 'Closed Store Milk' });

    const res = await api().get('/api/products').query({ search: 'milk' });
    expect(res.status).toBe(200);
    expect(res.body.data.products.map((p) => p.name)).toEqual(['Visible Milk']);
  });

  it('treats regex metacharacters in search literally', async () => {
    const { shop, category } = await storeWithProducts();
    await createProduct(shop, category, { name: 'Plain Rice' });
    const res = await api().get('/api/products/search').query({ q: '.*' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect((await api().get('/api/products').query({ search: 'a'.repeat(101) })).status).toBe(400);
    // Repeated params arrive as arrays and must be rejected rather than passed into a query.
    expect((await api().get('/api/products?search=a&search=b')).status).toBe(400);
  });

  it('caps page size and supports price sorting', async () => {
    const { shop, category } = await storeWithProducts();
    await createProduct(shop, category, { price: 50, mrp: 50 });
    await createProduct(shop, category, { price: 20, mrp: 25 });
    const res = await api().get('/api/products').query({ limit: 100000, sort: 'price-low' });
    expect(res.body.data.products.map((p) => p.price)).toEqual([20, 50]);
    expect(res.body.data.totalPages).toBe(1);
  });

  it('derives the discount percentage from MRP and price', async () => {
    const { shop, category } = await storeWithProducts();
    const product = await createProduct(shop, category, { price: 75, mrp: 100 });
    expect(product.discount).toBe(25);
    const noMrp = await createProduct(shop, category, { price: 75, mrp: undefined });
    expect(noMrp.mrp).toBe(75);
    expect(noMrp.discount).toBe(0);
  });

  it('hides an archived product from direct links', async () => {
    const { shop, category } = await storeWithProducts();
    const product = await createProduct(shop, category, { isActive: false });
    expect((await api().get(`/api/products/${product._id}`)).status).toBe(404);
    expect((await api().get(`/api/products/slug/${product.slug}`)).status).toBe(404);
    expect((await api().get('/api/products/not-an-id')).status).toBe(400);
  });
});

describe('catalog management', () => {
  it('lets an admin create products and categories but not a customer', async () => {
    const admin = await createUser('ADMIN');
    const customer = await createUser('CUSTOMER');
    const owner = await createUser('SHOP_OWNER');
    const shop = await createShop(owner);

    const denied = await api().post('/api/manage/categories').set(auth(customer)).send({ name: 'Dairy' });
    expect(denied.status).toBe(403);

    const cat = await api().post('/api/manage/categories').set(auth(admin)).send({ name: 'Dairy & Eggs', subcategories: ['Milk'] });
    expect(cat.status).toBe(201);
    expect(cat.body.data.slug).toBe('dairy-eggs');

    const product = await api()
      .post('/api/manage/products')
      .set(auth(admin))
      .send({ name: 'Toned Milk', category: cat.body.data._id, shop: String(shop._id), unit: '1 L', price: 54, mrp: 56, stockCount: 30, tags: ['Daily-Essentials'] });
    expect(product.status).toBe(201);
    expect(product.body.data).toMatchObject({ categorySlug: 'dairy-eggs', discount: 4, tags: ['daily-essentials'] });

    expect((await api().post('/api/manage/products').set(auth(customer)).send({})).status).toBe(403);
  });

  it('requires catalog.manage for employees', async () => {
    const without = await createUser('EMPLOYEE', { permissions: ['orders.read'] });
    const withPerm = await createUser('EMPLOYEE', { permissions: ['catalog.manage'] });
    expect((await api().post('/api/manage/categories').set(auth(without)).send({ name: 'X' })).status).toBe(403);
    expect((await api().post('/api/manage/categories').set(auth(withPerm)).send({ name: 'X' })).status).toBe(201);
  });

  it('scopes shop owners to their own store', async () => {
    const { owner, shop, category } = await storeWithProducts();
    const otherOwner = await createUser('SHOP_OWNER');
    const otherShop = await createShop(otherOwner);
    const foreign = await createProduct(otherShop, category);

    const created = await api()
      .post('/api/manage/products')
      .set(auth(owner))
      .send({ name: 'Bread', category: String(category._id), shop: String(otherShop._id), unit: '400 g', price: 40, stockCount: 5 });
    expect(created.status).toBe(201);
    expect(created.body.data.shop).toBe(String(shop._id));

    expect((await api().put(`/api/manage/products/${foreign._id}`).set(auth(owner)).send({ price: 1 })).status).toBe(403);
    const list = await api().get('/api/manage/products').set(auth(owner));
    expect(list.body.data.products).toHaveLength(1);
    // Shop owners cannot change categories.
    expect((await api().post('/api/manage/categories').set(auth(owner)).send({ name: 'Y' })).status).toBe(403);
  });

  it('enforces SKU uniqueness per store while allowing products without a SKU', async () => {
    const { shop, category } = await storeWithProducts();
    await createProduct(shop, category);
    await createProduct(shop, category);
    await createProduct(shop, category, { sku: 'SKU-1' });
    await expect(createProduct(shop, category, { sku: 'SKU-1' })).rejects.toThrow(/duplicate key/);
  });

  it('archives instead of deleting, and refuses to delete a category in use', async () => {
    const admin = await createUser('ADMIN');
    const { shop, category } = await storeWithProducts();
    const product = await createProduct(shop, category);

    expect((await api().delete(`/api/manage/products/${product._id}`).set(auth(admin))).status).toBe(200);
    expect((await Product.findById(product._id)).isActive).toBe(false);

    const inUse = await api().delete(`/api/manage/categories/${category._id}`).set(auth(admin));
    expect(inUse.status).toBe(409);
    expect(inUse.body.code).toBe('CATEGORY_IN_USE');
  });

  it('validates product input', async () => {
    const admin = await createUser('ADMIN');
    const { category } = await storeWithProducts();
    const res = await api().post('/api/manage/products').set(auth(admin)).send({ name: 'X', category: String(category._id), unit: '1', price: -5, stockCount: 1.5 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
