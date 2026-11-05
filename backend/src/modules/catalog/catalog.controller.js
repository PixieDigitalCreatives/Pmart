'use strict';

const { Category, Product, ImageStatus, slugify } = require('./catalog.model');
const { Shop } = require('../shop/shop.model');
const { Order } = require('../order/order.model');
const { UserRole } = require('../auth/auth.model');
const { Settings } = require('../admin/settings.model');
const { InventoryTransaction, MovementType, RefType } = require('../inventory/inventory.model');
const { adjustStock } = require('../inventory/inventory.service');
const { ProductImage, ImageOrigin } = require('../images/image.model');
const { hasPermission } = require('../../middleware/auth.middleware');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { runInTransaction } = require('../../utils/transaction');
const { scanVariants } = require('../../utils/barcode');
const { escapeRegExp } = require('../../utils/regex');
const { z, assertObjectId, parsePagination, parseSearch } = require('../../utils/validation');
const { notFound, conflict, forbidden, badRequest } = require('../../utils/http-error');
const { memoryCache, MemoryCache } = require('../../utils/cache');

const PUBLIC_PRODUCT_FIELDS =
  'name slug brand unit price mrp discount stockCount imageUrl gallery categorySlug category subcategory tags shop description specifications nutrition isActive sku';
const LIST_PRODUCT_FIELDS = 'name slug brand unit price mrp discount stockCount imageUrl categorySlug category subcategory tags shop';

const SORTS = {
  newest: { createdAt: -1 },
  'price-low': { price: 1, _id: 1 },
  'price-high': { price: -1, _id: 1 },
  discount: { discount: -1, _id: 1 },
  name: { name: 1, _id: 1 }
};

const urlOrEmpty = z.string().trim().url('Must be a valid URL').or(z.literal(''));
const stringMap = z.record(z.string().trim().min(1).max(60), z.string().trim().max(200));

const amount = (label) => z.number().finite().min(0, `${label} cannot be negative`).max(10000000);
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));

// Images are not set through this schema: photos go through the verification workflow (modules/images).
const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  category: z.string().optional().or(z.literal('')),
  shop: z.string().optional(),
  subcategory: optionalText(60),
  brand: optionalText(80),
  sku: optionalText(64),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).optional(),
  description: optionalText(4000),
  unit: z.string().trim().max(40).optional().default(''),
  code: optionalText(64),
  barcode: optionalText(64),
  barcodes: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
  company: optionalText(120),
  manufacturer: optionalText(120),
  rackNo: optionalText(40),
  deal: amount('Deal').optional(),
  free: amount('Free quantity').optional(),
  purDeal: amount('Purchase deal').optional(),
  purFree: amount('Purchase free quantity').optional(),
  cost: amount('Cost price').optional(),
  purRate: amount('Purchase rate').optional(),
  rate: amount('Selling rate').optional().nullable(),
  // Legacy name for the selling price; treated as the selling rate when `rate` is not sent.
  price: amount('Price').optional(),
  mrp: amount('MRP').optional().nullable(),
  taxRate: z.number().finite().min(0).max(100).optional().nullable(),
  hsn: optionalText(16),
  stockCount: z.number().finite().min(0, 'Stock cannot be negative').max(10000000).optional(),
  specifications: stringMap.optional(),
  nutrition: stringMap.optional(),
  isActive: z.boolean().optional()
});

/** Fields whose changes are written to the audit log with their old and new values. */
const PRICE_FIELDS = ['rate', 'price', 'mrp', 'cost', 'purRate', 'taxRate'];

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(80),
  slug: z.string().trim().max(80).optional().or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  imageUrl: urlOrEmpty.optional(),
  subcategories: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional()
});

function isShopOwner(user) {
  return user.role === UserRole.SHOP_OWNER;
}

/** Catalog managers are ADMIN, EMPLOYEE with catalog.manage, or a SHOP_OWNER (own store only). */
function assertCatalogManager(user) {
  if (!isShopOwner(user) && !hasPermission(user, 'catalog.manage')) throw forbidden('Missing permission: catalog.manage');
}

/** Product lists and details may also be read by staff with inventory.read (e.g. store managers). */
function assertCatalogReader(user) {
  if (!isShopOwner(user) && !hasPermission(user, 'catalog.manage') && !hasPermission(user, 'inventory.read')) {
    throw forbidden('Missing permission: inventory.read');
  }
}

function assertCanDelete(user) {
  if (!isShopOwner(user) && !hasPermission(user, 'catalog.delete')) throw forbidden('Missing permission: catalog.delete');
}

/** Stock edits outside restocks/invoices are adjustments: store owners for their store, or inventory.adjust. */
function assertCanAdjust(user) {
  if (!isShopOwner(user) && !hasPermission(user, 'inventory.adjust')) {
    throw forbidden('Stock can only be changed by a restock, an invoice or a stock adjustment (inventory.adjust)', 'STOCK_LOCKED');
  }
}

let cachedActiveShopIds = null;
let activeShopIdsExpiresAt = 0;

async function activeShopIds() {
  const now = Date.now();
  if (cachedActiveShopIds && now < activeShopIdsExpiresAt) {
    return cachedActiveShopIds;
  }
  const ids = await Shop.distinct('_id', { isActive: true });
  cachedActiveShopIds = ids;
  activeShopIdsExpiresAt = now + 60 * 1000;
  return ids;
}

function invalidateActiveShopCache() {
  cachedActiveShopIds = null;
  activeShopIdsExpiresAt = 0;
}

async function resolveProductShop(user, requestedShop) {
  if (isShopOwner(user)) {
    const shop = await Shop.findOne({ owner: user._id }).select('_id');
    if (!shop) throw forbidden('No store is linked to your account', 'NO_SHOP');
    return shop._id;
  }
  if (requestedShop) {
    const reqStr = String(requestedShop).trim();
    if (/^[0-9a-fA-F]{24}$/.test(reqStr)) {
      const shop = await Shop.findById(reqStr).select('_id');
      if (shop) return shop._id;
    }
    const shopByName = await Shop.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(reqStr)}$`, 'i') } }).select('_id');
    if (shopByName) return shopByName._id;
    throw badRequest('Store not found', 'INVALID_SHOP');
  }
  const shops = await Shop.find().select('_id').limit(2).lean();
  if (shops.length === 1) return shops[0]._id;
  throw badRequest(shops.length === 0 ? 'Create a store before adding products' : 'Select which store this product belongs to', 'SHOP_REQUIRED');
}

async function loadManagedProduct(user, id) {
  assertObjectId(id, 'product id');
  const product = await Product.findById(id);
  if (!product) throw notFound('Product not found');
  if (isShopOwner(user)) {
    const owns = await Shop.exists({ _id: product.shop, owner: user._id });
    if (!owns) throw forbidden('This product belongs to another store');
  }
  return product;
}

async function uniqueSlug(Model, base, excludeId) {
  const root = base || 'item';
  let slug = root;
  for (let i = 2; await Model.exists(excludeId ? { slug, _id: { $ne: excludeId } } : { slug }); i += 1) {
    slug = `${root}-${i}`;
  }
  return slug;
}

function productPayload(data) {
  const out = { ...data };
  ['subcategory', 'sku', 'description', 'hsn', 'code'].forEach((field) => {
    if (out[field] === '') out[field] = undefined;
  });
  if (out.mrp === null) out.mrp = undefined;
  if (out.taxRate === null) out.taxRate = undefined;
  // `price` is the legacy selling-price field: it becomes the selling rate, from which price is derived.
  if (out.rate === undefined && out.price !== undefined) out.rate = out.price;
  if (out.rate === null) out.rate = undefined;
  delete out.price;
  delete out.category;
  delete out.shop;
  delete out.stockCount;
  return out;
}

/** New codes must not clash with an existing code, ignoring case and surrounding spaces. */
async function assertCodeFree(shopId, code, excludeId) {
  if (!code) return;
  const filter = { shop: shopId, codeKey: code.trim().toUpperCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) throw conflict(`Product code ${code} is already used in this store`, 'CODE_TAKEN');
}

/** Other products that scan with the same barcode(s), returned as warnings (barcodes may be shared). */
async function barcodeWarnings(product) {
  const codes = (product.barcodes || []).flatMap(scanVariants);
  if (!codes.length) return [];
  const others = await Product.find({ _id: { $ne: product._id }, barcodes: { $in: codes } }).select('name code barcode').limit(5).lean();
  return others.map((o) => `Barcode also used by ${o.name}${o.code ? ` (code ${o.code})` : ''}`);
}

async function resolveCategory(id) {
  if (!id) return null;
  assertObjectId(id, 'category id');
  const category = await Category.findById(id);
  if (!category) throw notFound('Category not found');
  return category;
}

function normalizeBulkProduct(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };

  if (out.price !== undefined && out.price !== '') out.price = Number(out.price);
  if (out.mrp !== undefined && out.mrp !== '') out.mrp = Number(out.mrp);
  else if (out.mrp === '') out.mrp = undefined;
  if (out.stockCount !== undefined && out.stockCount !== '') out.stockCount = Number(out.stockCount);
  ['rate', 'cost', 'purRate', 'deal', 'free', 'purDeal', 'purFree', 'taxRate'].forEach((field) => {
    if (out[field] === '') delete out[field];
    else if (out[field] !== undefined) out[field] = Number(out[field]);
  });
  ['code', 'barcode', 'company', 'manufacturer', 'rackNo', 'unit', 'hsn'].forEach((field) => {
    if (out[field] !== undefined && out[field] !== null) out[field] = String(out[field]);
  });

  if (typeof out.isActive === 'string') {
    const s = out.isActive.trim().toLowerCase();
    out.isActive = s === 'true' || s === 'yes' || s === '1' || s === 'active';
  } else if (out.isActive === undefined) {
    out.isActive = true;
  }

  if (typeof out.tags === 'string') {
    out.tags = out.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof out.gallery === 'string') {
    out.gallery = out.gallery
      .split(/[\n,;]+/)
      .map((u) => u.trim())
      .filter(Boolean);
  }

  if (typeof out.specifications === 'string') {
    out.specifications = Object.fromEntries(
      out.specifications
        .split(/[\n;]+/)
        .map((l) => l.split(':'))
        .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join(':').trim())
        .map((parts) => [parts[0].trim().slice(0, 60), parts.slice(1).join(':').trim().slice(0, 200)])
    );
  }

  if (typeof out.nutrition === 'string') {
    out.nutrition = Object.fromEntries(
      out.nutrition
        .split(/[\n;]+/)
        .map((l) => l.split(':'))
        .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join(':').trim())
        .map((parts) => [parts[0].trim().slice(0, 60), parts.slice(1).join(':').trim().slice(0, 200)])
    );
  }

  return out;
}

/** Writes OPENING stock-ledger rows for newly created products that start with stock. */
async function recordOpeningStock(products, user, reason, session) {
  const rows = products
    .filter((p) => p.stockCount)
    .map((p) => ({
      shop: p.shop,
      product: p._id,
      productName: p.name,
      productCode: p.code,
      type: MovementType.OPENING,
      quantity: p.stockCount,
      stockBefore: 0,
      stockAfter: p.stockCount,
      unitCost: p.cost,
      refType: RefType.PRODUCT,
      refId: p._id,
      reason,
      user: user._id,
      dedupeKey: `OPEN:${p._id}`
    }));
  if (rows.length) await InventoryTransaction.insertMany(rows, { session });
}

/** Image URLs in a bulk upload become PENDING candidates; they are never shown until someone verifies them. */
async function addUploadedImageCandidates(created, candidates, user) {
  const urlBySlug = new Map();
  candidates.forEach((c) => {
    const url = String(c.raw?.imageUrl || '').trim();
    if (/^https:\/\/\S+$/i.test(url)) urlBySlug.set(`${c.shopId}|${c.data.name}`, url);
  });
  const docs = created
    .filter((p) => urlBySlug.has(`${p.shop}|${p.name}`))
    .map((p) => ({ product: p._id, shop: p.shop, origin: ImageOrigin.URL, matchedBy: 'MANUAL', remoteUrl: urlBySlug.get(`${p.shop}|${p.name}`), uploadedBy: user._id }));
  if (!docs.length) return;
  await ProductImage.insertMany(docs);
  await Product.updateMany({ _id: { $in: docs.map((d) => d.product) }, 'image.status': ImageStatus.NOT_AVAILABLE }, { $set: { 'image.status': ImageStatus.PENDING } });
}

/** Search and filter options shared by the managed product list. */
function managedProductFilter(query) {
  const filter = {};
  const search = parseSearch(query.search);
  if (search) {
    const rx = { $regex: escapeRegExp(search), $options: 'i' };
    const codePrefix = { codeKey: { $regex: `^${escapeRegExp(search.toUpperCase())}` } };
    const exact = scanVariants(search);
    const byField = {
      name: [{ name: rx }],
      code: [codePrefix],
      barcode: [{ barcodes: { $in: exact } }],
      company: [{ company: rx }],
      manufacturer: [{ manufacturer: rx }]
    };
    filter.$or = byField[query.field] || [{ name: rx }, codePrefix, { barcodes: { $in: exact } }, { sku: rx }, { brand: rx }, { company: rx }, { manufacturer: rx }];
  }
  if (query.status === 'active' || query.online === 'listed') filter.isActive = true;
  if (query.status === 'inactive' || query.online === 'hidden') filter.isActive = false;
  if (Object.values(ImageStatus).includes(query.image)) filter['image.status'] = query.image;
  return filter;
}

const MANAGED_SORTS = {
  newest: { createdAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
  code: { code: 1, _id: 1 },
  stock: { stockCount: 1, _id: 1 },
  '-stock': { stockCount: -1, _id: 1 },
  price: { price: 1, _id: 1 },
  '-price': { price: -1, _id: 1 },
  updated: { updatedAt: -1, _id: -1 }
};

class CatalogController {
  // ---------- Categories (public) ----------

  static async getCategories(req, res) {
    const cacheKey = 'categories:all';
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cached });
    }

    const categories = await Category.find({ isActive: true })
      .select('name slug description imageUrl subcategories sortOrder')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    memoryCache.set(cacheKey, categories, 300);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: categories });
  }

  static async getCategoryBySlug(req, res) {
    const slug = String(req.params.slug);
    const cacheKey = `categories:${slug}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cached });
    }

    const category = await Category.findOne({ slug, isActive: true }).lean();
    if (!category) throw notFound('Category not found');

    memoryCache.set(cacheKey, category, 300);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: category });
  }

  // ---------- Products (public) ----------

  static async getProducts(req, res) {
    const cacheKey = MemoryCache.makeKey('catalog:list', req.query);
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.json({ success: true, data: cached });
    }

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 60 });
    const search = parseSearch(req.query.search);
    const filter = { isActive: true, shop: { $in: await activeShopIds() } };

    if (req.query.category) {
      const catVal = String(req.query.category).trim();
      if (/^[0-9a-fA-F]{24}$/.test(catVal)) {
        filter.category = catVal;
      } else {
        filter.categorySlug = catVal;
      }
    }
    if (req.query.subcategory) filter.subcategory = String(req.query.subcategory).trim();
    if (req.query.brand) filter.brand = String(req.query.brand).trim();
    if (req.query.tag) filter.tags = String(req.query.tag).toLowerCase().trim();

    if (req.query.discountOnly === 'true' || req.query.hasDiscount === 'true') {
      filter.discount = { $gt: 0 };
    }

    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ name: rx }, { brand: rx }, { tags: rx }];
    }

    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (req.query.minPrice !== undefined && Number.isFinite(minPrice)) filter.price = { ...filter.price, $gte: minPrice };
    if (req.query.maxPrice !== undefined && Number.isFinite(maxPrice)) filter.price = { ...filter.price, $lte: maxPrice };
    if (req.query.inStockOnly === 'true') filter.stockCount = { $gt: 0 };

    const sort = SORTS[req.query.sort] || SORTS.newest;

    const products = await Product.find(filter)
      .select(LIST_PRODUCT_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Fast count optimization: if page 1 has fewer products than limit, count is products.length
    let totalCount;
    if (page === 1 && products.length < limit) {
      totalCount = products.length;
    } else {
      totalCount = await Product.countDocuments(filter);
    }

    const totalPages = Math.ceil(totalCount / limit);
    const result = {
      products,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages
    };

    memoryCache.set(cacheKey, result, 30);
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ success: true, data: result });
  }

  static async searchProducts(req, res) {
    const q = parseSearch(req.query.q);
    if (!q) return res.json({ success: true, data: [] });

    const cacheKey = `catalog:search:${q.toLowerCase()}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.json({ success: true, data: cached });
    }

    const rx = { $regex: escapeRegExp(q), $options: 'i' };
    const products = await Product.find({ isActive: true, shop: { $in: await activeShopIds() }, $or: [{ name: rx }, { brand: rx }] })
      .select(LIST_PRODUCT_FIELDS)
      .limit(10)
      .lean();

    memoryCache.set(cacheKey, products, 30);
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ success: true, data: products });
  }

  static async getProductsByTag(req, res) {
    const tag = String(req.params.tag).toLowerCase();
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const cacheKey = `catalog:tag:${tag}:${limit}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cached });
    }

    const products = await Product.find({ tags: tag, isActive: true, shop: { $in: await activeShopIds() } })
      .select(LIST_PRODUCT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    memoryCache.set(cacheKey, products, 60);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: products });
  }

  static async getProductBySlug(req, res) {
    const slug = String(req.params.slug);
    const cacheKey = `catalog:slug:${slug}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cached });
    }

    const product = await Product.findOne({ slug, isActive: true, shop: { $in: await activeShopIds() } })
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .populate('shop', 'name isAcceptingOrders')
      .lean();
    if (!product) throw notFound('Product not found');

    memoryCache.set(cacheKey, product, 60);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: product });
  }

  static async getProductById(req, res) {
    assertObjectId(req.params.id, 'product id');
    const cacheKey = `catalog:id:${req.params.id}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cached });
    }

    const product = await Product.findOne({ _id: req.params.id, isActive: true, shop: { $in: await activeShopIds() } })
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .populate('shop', 'name isAcceptingOrders')
      .lean();
    if (!product) throw notFound('Product not found');

    memoryCache.set(cacheKey, product, 60);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: product });
  }

  // ---------- Catalog management ----------

  static async getManagedProducts(req, res) {
    assertCatalogReader(req.user);
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const filter = managedProductFilter(req.query);

    if (isShopOwner(req.user)) {
      const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
      if (!shop) return res.json({ success: true, data: { products: [], totalCount: 0, page, totalPages: 0 } });
      filter.shop = shop._id;
    } else if (req.query.shop) {
      filter.shop = assertObjectId(req.query.shop, 'shop id');
    }
    if (req.query.category) {
      const category = await Category.findOne({ slug: String(req.query.category) }).select('_id');
      if (category) filter.category = category._id;
    }
    const threshold = Number(req.query.threshold) || (await Settings.getSingleton()).lowStockThreshold;
    const stock = req.query.lowStock === 'true' ? 'low' : req.query.stock;
    if (stock === 'low') filter.stockCount = { $gt: 0, $lte: threshold };
    if (stock === 'out') filter.stockCount = { $lte: 0 };
    if (stock === 'in') filter.stockCount = { $gt: 0 };

    const sort = MANAGED_SORTS[req.query.sort] || MANAGED_SORTS.newest;
    const [products, totalCount] = await Promise.all([
      Product.find(filter).select('-importSource.raw -specifications -nutrition -description').populate('category', 'name slug').populate('shop', 'name').sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, data: { products, totalCount, page, totalPages: Math.ceil(totalCount / limit), lowStockThreshold: threshold } });
  }

  static async getManagedProduct(req, res) {
    assertCatalogReader(req.user);
    const product = await loadManagedProduct(req.user, req.params.id);
    await product.populate([{ path: 'category', select: 'name slug' }, { path: 'shop', select: 'name' }]);
    res.json({ success: true, data: product, warnings: await barcodeWarnings(product) });
  }

  /** Creates a product. Opening stock is written to the stock ledger in the same transaction. */
  static async createProduct(req, res) {
    assertCatalogManager(req.user);
    const data = productSchema.parse(req.body);
    const category = await resolveCategory(data.category);
    const shopId = await resolveProductShop(req.user, data.shop);

    if (data.sku && (await Product.exists({ shop: shopId, sku: data.sku }))) {
      throw conflict('A product with this SKU already exists in this store', 'SKU_TAKEN');
    }
    await assertCodeFree(shopId, data.code);

    const stock = Math.round((data.stockCount || 0) * 1000) / 1000;
    const slugBase = slugify(data.code ? `${data.name} ${data.code}` : data.name);
    const slug = await uniqueSlug(Product, slugBase);
    const product = await runInTransaction(async (session) => {
      const [created] = await Product.create(
        [
          {
            ...productPayload(data),
            isActive: data.isActive ?? Boolean(category),
            shop: shopId,
            category: category ? category._id : undefined,
            categorySlug: category ? category.slug : undefined,
            stockCount: stock,
            stockValue: Math.round(Math.max(stock, 0) * (data.cost || 0) * 100) / 100,
            image: { status: ImageStatus.NOT_AVAILABLE },
            slug
          }
        ],
        { session }
      );
      await recordOpeningStock([created], req.user, 'Opening stock entered on the product form', session);
      return created;
    });
    await recordAudit(req, AuditAction.CREATE, 'Product', product._id, { name: product.name, code: product.code, barcode: product.barcode, openingStock: stock });
    memoryCache.delByPrefix('catalog:');
    res.status(201).json({ success: true, data: product, warnings: await barcodeWarnings(product) });
  }

  static async bulkCreateProducts(req, res) {
    assertCatalogManager(req.user);
    const body = Array.isArray(req.body) ? { products: req.body } : req.body;
    const { products } = z
      .object({
        products: z.array(z.any()).min(1, 'At least one product is required').max(200, 'Maximum 200 products per bulk upload')
      })
      .parse(body);

    const created = [];
    const errors = [];
    const seenBatchSkus = new Set();

    // 1. Fetch categories and shops once in parallel
    const [allCategories, allShops] = await Promise.all([
      Category.find().select('_id name slug').lean(),
      Shop.find().select('_id name owner').lean()
    ]);

    const categoryMap = new Map();
    allCategories.forEach((c) => {
      categoryMap.set(String(c._id), c);
      categoryMap.set(c.slug.toLowerCase(), c);
      categoryMap.set(c.name.toLowerCase().trim(), c);
    });

    let ownerShopId = null;
    if (isShopOwner(req.user)) {
      const ownerShop = allShops.find((s) => String(s.owner) === String(req.user._id));
      if (!ownerShop) throw forbidden('No store is linked to your account', 'NO_SHOP');
      ownerShopId = ownerShop._id;
    }

    const shopMap = new Map();
    allShops.forEach((s) => {
      shopMap.set(String(s._id), s._id);
      shopMap.set(s.name.toLowerCase().trim(), s._id);
    });
    const defaultShopId = allShops.length === 1 ? allShops[0]._id : null;

    const resolveShopFast = (requestedShop) => {
      if (ownerShopId) return ownerShopId;
      if (requestedShop) {
        const reqStr = String(requestedShop).trim();
        const found = shopMap.get(reqStr) || shopMap.get(reqStr.toLowerCase());
        if (found) return found;
        throw badRequest(`Store '${requestedShop}' not found`, 'INVALID_SHOP');
      }
      if (defaultShopId) return defaultShopId;
      throw badRequest(allShops.length === 0 ? 'Create a store before adding products' : 'Select which store this product belongs to', 'SHOP_REQUIRED');
    };

    // 2. Validate and normalize candidates in-memory
    const validCandidates = [];
    for (let i = 0; i < products.length; i += 1) {
      const raw = products[i];
      try {
        const normalized = normalizeBulkProduct(raw);
        const data = productSchema.parse(normalized);

        if (!data.category) throw badRequest('Category is required', 'CATEGORY_REQUIRED');
        let category = categoryMap.get(String(data.category)) || categoryMap.get(String(data.category).toLowerCase().trim());
        if (!category && /^[0-9a-fA-F]{24}$/.test(String(data.category))) {
          category = categoryMap.get(String(data.category));
        }
        if (!category) {
          throw notFound(`Category '${data.category}' not found`);
        }

        const shopId = resolveShopFast(data.shop);

        if (data.sku) {
          const skuKey = `${shopId}_${data.sku.toLowerCase()}`;
          if (seenBatchSkus.has(skuKey)) {
            throw conflict(`Product with SKU '${data.sku}' is duplicated in this file`, 'SKU_TAKEN');
          }
          seenBatchSkus.add(skuKey);
        }

        validCandidates.push({
          row: i + 1,
          raw,
          data,
          shopId,
          category,
          baseSlug: slugify(data.name) || 'item'
        });
      } catch (err) {
        errors.push({
          row: i + 1,
          name: raw?.name || `Item #${i + 1}`,
          sku: raw?.sku || '',
          message: err.errors ? err.errors.map((e) => e.message).join(', ') : err.message || 'Validation error'
        });
      }
    }

    // 3. Batch check for existing SKUs in DB
    const candidateSkus = validCandidates.filter((c) => c.data.sku);
    const existingDbSkus = new Set();
    if (candidateSkus.length > 0) {
      const distinctShops = Array.from(new Set(candidateSkus.map((c) => c.shopId)));
      const rawSkus = candidateSkus.map((c) => c.data.sku);
      const existingInDb = await Product.find({
        shop: { $in: distinctShops },
        sku: { $in: rawSkus }
      }).select('shop sku').lean();

      existingInDb.forEach((p) => {
        existingDbSkus.add(`${p.shop}_${p.sku.toLowerCase()}`);
      });
    }

    const uniqueCandidates = [];
    for (const c of validCandidates) {
      if (c.data.sku) {
        const skuKey = `${c.shopId}_${c.data.sku.toLowerCase()}`;
        if (existingDbSkus.has(skuKey)) {
          errors.push({
            row: c.row,
            name: c.raw?.name || `Item #${c.row}`,
            sku: c.data.sku,
            message: `Product with SKU '${c.data.sku}' already exists`
          });
          continue;
        }
      }
      uniqueCandidates.push(c);
    }

    // 4. Batch generate unique slugs
    const baseSlugs = Array.from(new Set(uniqueCandidates.map((c) => c.baseSlug)));
    const takenSlugs = new Set();
    if (baseSlugs.length > 0) {
      const existingSlugs = await Product.find({
        $or: baseSlugs.map((b) => ({ slug: new RegExp(`^${escapeRegExp(b)}(-\\d+)?$`) }))
      }).select('slug').lean();
      existingSlugs.forEach((p) => takenSlugs.add(p.slug));
    }

    const docsToInsert = [];
    for (const c of uniqueCandidates) {
      const root = c.baseSlug;
      let slug = root;
      let counter = 2;
      while (takenSlugs.has(slug)) {
        slug = `${root}-${counter}`;
        counter += 1;
      }
      takenSlugs.add(slug);

      docsToInsert.push({
        ...productPayload(c.data),
        stockCount: c.data.stockCount || 0,
        shop: c.shopId,
        category: c.category._id,
        categorySlug: c.category.slug,
        slug
      });
    }

    // 5. Batch insert valid items
    if (docsToInsert.length > 0) {
      try {
        const inserted = await Product.insertMany(docsToInsert, { ordered: false });
        created.push(...inserted);
      } catch (err) {
        if (err.insertedDocs && err.insertedDocs.length > 0) {
          created.push(...err.insertedDocs);
        }
        if (err.writeErrors) {
          err.writeErrors.forEach((we) => {
            const idx = we.index;
            const c = uniqueCandidates[idx];
            errors.push({
              row: c ? c.row : idx + 1,
              name: c?.raw?.name || `Item #${idx + 1}`,
              sku: c?.raw?.sku || '',
              message: we.errmsg || 'Failed to insert product'
            });
          });
        }
      }

      if (created.length > 0) {
        await recordOpeningStock(created, req.user, 'Opening stock from bulk upload');
        await addUploadedImageCandidates(created, uniqueCandidates, req.user);
        await recordAudit(req, AuditAction.CREATE, 'Product', null, {
          bulk: true,
          count: created.length
        });
        memoryCache.delByPrefix('catalog:');
      }
    }

    errors.sort((a, b) => a.row - b.row);

    res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      data: {
        total: products.length,
        createdCount: created.length,
        failedCount: errors.length,
        created,
        errors
      }
    });
  }

  static async updateProduct(req, res) {
    assertCatalogManager(req.user);
    const product = await loadManagedProduct(req.user, req.params.id);
    const data = productSchema.partial().parse(req.body);

    if (data.category !== undefined) {
      const category = await resolveCategory(data.category);
      product.category = category ? category._id : undefined;
      product.categorySlug = category ? category.slug : undefined;
    }
    if (data.shop && !isShopOwner(req.user)) product.shop = await resolveProductShop(req.user, data.shop);
    if (data.sku && data.sku !== product.sku && (await Product.exists({ shop: product.shop, sku: data.sku, _id: { $ne: product._id } }))) {
      throw conflict('A product with this SKU already exists in this store', 'SKU_TAKEN');
    }
    if (data.code && data.code !== product.code) await assertCodeFree(product.shop, data.code, product._id);

    const before = Object.fromEntries(PRICE_FIELDS.map((f) => [f, product[f]]));
    const stockChange = data.stockCount !== undefined && Math.round(data.stockCount * 1000) / 1000 !== product.stockCount;
    if (stockChange) assertCanAdjust(req.user);

    // Only keys present in the request are applied; '' clears an optional field.
    product.set(productPayload(data));
    if (data.cost !== undefined) product.stockValue = Math.round(Math.max(product.stockCount, 0) * product.cost * 100) / 100;
    await product.save();

    if (stockChange) {
      await runInTransaction((session) =>
        adjustStock(session, {
          productId: product._id,
          mode: 'SET',
          quantity: data.stockCount,
          reason: 'Stock edited on the product form',
          user: req.user,
          idempotencyKey: `form:${product._id}:${Date.now()}`
        })
      );
    }

    const priceChanges = {};
    PRICE_FIELDS.forEach((f) => {
      if ((before[f] ?? null) !== (product[f] ?? null)) priceChanges[f] = { from: before[f] ?? null, to: product[f] ?? null };
    });
    await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, {
      fields: Object.keys(data),
      ...(Object.keys(priceChanges).length ? { priceChanges } : {}),
      ...(stockChange ? { stockSetTo: data.stockCount } : {})
    });
    memoryCache.delByPrefix('catalog:');
    const fresh = await Product.findById(product._id);
    res.json({ success: true, data: fresh, warnings: await barcodeWarnings(fresh) });
  }

  static async updateProductStatus(req, res) {
    assertCatalogManager(req.user);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const product = await loadManagedProduct(req.user, req.params.id);
    product.isActive = isActive;
    await product.save();
    await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, { isActive });
    memoryCache.delByPrefix('catalog:');
    res.json({ success: true, data: product });
  }

  /** Permanently removes a product. Invoices and the stock ledger keep their own copies of its details. */
  static async archiveProduct(req, res) {
    assertCanDelete(req.user);
    const product = await loadManagedProduct(req.user, req.params.id);
    await Product.deleteOne({ _id: product._id });
    await ProductImage.deleteMany({ product: product._id });
    await recordAudit(req, AuditAction.DELETE, 'Product', product._id, { name: product.name, sku: product.sku, code: product.code, barcode: product.barcode, stock: product.stockCount });
    memoryCache.delByPrefix('catalog:');
    res.json({ success: true, message: 'Product removed from products' });
  }

  static async bulkDeleteProducts(req, res) {
    assertCanDelete(req.user);
    const { ids } = z
      .object({
        ids: z.array(z.string().min(1)).min(1, 'At least one product id is required').max(100, 'Maximum 100 products per bulk delete')
      })
      .parse(req.body);

    let deletedCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const product = await loadManagedProduct(req.user, id);
        await Product.deleteOne({ _id: product._id });
        await ProductImage.deleteMany({ product: product._id });
        await recordAudit(req, AuditAction.DELETE, 'Product', product._id, { name: product.name, sku: product.sku, code: product.code, bulk: true });
        deletedCount += 1;
      } catch (err) {
        errors.push({ id, message: err.message || 'Could not delete product' });
      }
    }

    if (deletedCount > 0) {
      memoryCache.delByPrefix('catalog:');
    }

    res.json({
      success: true,
      data: {
        totalRequested: ids.length,
        deletedCount,
        failedCount: errors.length,
        errors
      }
    });
  }

  static async bulkUpdateProducts(req, res) {
    assertCatalogManager(req.user);
    const { ids, isActive, stockCount } = z
      .object({
        ids: z.array(z.string().min(1)).min(1, 'At least one product id is required').max(200, 'Maximum 200 products per bulk update'),
        isActive: z.boolean().optional(),
        stockCount: z.number().finite().min(0, 'Stock count must be at least 0').optional()
      })
      .refine((data) => data.isActive !== undefined || data.stockCount !== undefined, {
        message: 'At least one field to update (isActive or stockCount) must be provided'
      })
      .parse(req.body);
    if (stockCount !== undefined) assertCanAdjust(req.user);

    let updatedCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const product = await loadManagedProduct(req.user, id);
        const updates = {};
        if (isActive !== undefined) {
          product.isActive = isActive;
          updates.isActive = isActive;
          await product.save();
        }
        if (stockCount !== undefined && product.stockCount !== stockCount) {
          await runInTransaction((session) =>
            adjustStock(session, { productId: product._id, mode: 'SET', quantity: stockCount, reason: 'Bulk stock update', user: req.user, idempotencyKey: `bulk:${product._id}:${Date.now()}` })
          );
          updates.stockCount = stockCount;
        }
        await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, { ...updates, bulk: true });
        updatedCount += 1;
      } catch (err) {
        errors.push({ id, message: err.message || 'Could not update product' });
      }
    }

    if (updatedCount > 0) {
      memoryCache.delByPrefix('catalog:');
    }

    res.json({
      success: true,
      data: {
        totalRequested: ids.length,
        updatedCount,
        failedCount: errors.length,
        errors
      },
      message: `Updated ${updatedCount} product${updatedCount !== 1 ? 's' : ''}`
    });
  }

  // ---------- Category management (ADMIN / catalog.manage) ----------

  static async getManagedCategories(req, res) {
    assertCatalogManager(req.user);
    const filter = isShopOwner(req.user) ? { isActive: true } : {};
    const [categories, counts] = await Promise.all([
      Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean(),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    ]);
    const byCategory = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ success: true, data: categories.map((c) => ({ ...c, productCount: byCategory.get(String(c._id)) || 0 })) });
  }

  static async createCategory(req, res) {
    const data = categorySchema.parse(req.body);
    const base = slugify(data.slug || data.name);
    if (!base) throw badRequest('Category name must contain letters or numbers', 'INVALID_NAME');
    if (data.slug && (await Category.exists({ slug: base }))) throw conflict('A category with this slug already exists', 'SLUG_TAKEN');
    const category = await Category.create({
      ...data,
      imageUrl: data.imageUrl || undefined,
      description: data.description || undefined,
      slug: data.slug ? base : await uniqueSlug(Category, base)
    });
    await recordAudit(req, AuditAction.CREATE, 'Category', category._id, { name: category.name });
    memoryCache.delByPrefix('categories:');
    memoryCache.delByPrefix('catalog:');
    res.status(201).json({ success: true, data: category });
  }

  static async updateCategory(req, res) {
    assertObjectId(req.params.id, 'category id');
    const category = await Category.findById(req.params.id);
    if (!category) throw notFound('Category not found');
    const { slug: _slug, ...data } = categorySchema.partial().parse(req.body);
    category.set({ ...data, imageUrl: data.imageUrl === '' ? undefined : data.imageUrl ?? category.imageUrl });
    await category.save();
    await recordAudit(req, AuditAction.UPDATE, 'Category', category._id, { fields: Object.keys(data) });
    memoryCache.delByPrefix('categories:');
    memoryCache.delByPrefix('catalog:');
    res.json({ success: true, data: category });
  }

  static async updateCategoryStatus(req, res) {
    assertObjectId(req.params.id, 'category id');
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!category) throw notFound('Category not found');
    await recordAudit(req, AuditAction.UPDATE, 'Category', category._id, { isActive });
    memoryCache.delByPrefix('categories:');
    memoryCache.delByPrefix('catalog:');
    res.json({ success: true, data: category });
  }

  static async deleteCategory(req, res) {
    assertObjectId(req.params.id, 'category id');
    const category = await Category.findById(req.params.id);
    if (!category) throw notFound('Category not found');
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      throw conflict(`This category has ${productCount} product(s). Move or archive them, or deactivate the category instead.`, 'CATEGORY_IN_USE');
    }
    await category.deleteOne();
    await recordAudit(req, AuditAction.DELETE, 'Category', category._id, { name: category.name });
    memoryCache.delByPrefix('categories:');
    memoryCache.delByPrefix('catalog:');
    res.json({ success: true, message: 'Category deleted' });
  }
}

module.exports = { CatalogController, invalidateActiveShopCache };
