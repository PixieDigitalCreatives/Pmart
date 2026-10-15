'use strict';

const { Category, Product, slugify } = require('./catalog.model');
const { Shop } = require('../shop/shop.model');
const { Order } = require('../order/order.model');
const { UserRole } = require('../auth/auth.model');
const { hasPermission } = require('../../middleware/auth.middleware');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { escapeRegExp } = require('../../utils/regex');
const { z, assertObjectId, parsePagination, parseSearch } = require('../../utils/validation');
const { notFound, conflict, forbidden, badRequest } = require('../../utils/http-error');

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

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  category: z.string().min(1, 'Category is required'),
  shop: z.string().optional(),
  subcategory: z.string().trim().max(60).optional().or(z.literal('')),
  brand: z.string().trim().max(80).optional().or(z.literal('')),
  sku: z.string().trim().max(64).optional().or(z.literal('')),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  unit: z.string().trim().min(1, 'Unit is required').max(40),
  price: z.number().min(0, 'Price cannot be negative').max(1000000),
  mrp: z.number().min(0).max(1000000).optional().nullable(),
  stockCount: z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(1000000),
  imageUrl: urlOrEmpty.optional(),
  gallery: z.array(z.string().trim().url()).max(10).optional(),
  specifications: stringMap.optional(),
  nutrition: stringMap.optional(),
  isActive: z.boolean().optional()
});

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

async function activeShopIds() {
  return Shop.distinct('_id', { isActive: true });
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
  ['subcategory', 'brand', 'sku', 'description', 'imageUrl'].forEach((field) => {
    if (out[field] === '') out[field] = undefined;
  });
  if (out.mrp === null) out.mrp = undefined;
  delete out.category;
  delete out.shop;
  return out;
}

function normalizeBulkProduct(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };

  if (out.price !== undefined && out.price !== '') out.price = Number(out.price);
  if (out.mrp !== undefined && out.mrp !== '') out.mrp = Number(out.mrp);
  else if (out.mrp === '') out.mrp = undefined;
  if (out.stockCount !== undefined && out.stockCount !== '') out.stockCount = Number(out.stockCount);

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

class CatalogController {
  // ---------- Categories (public) ----------

  static async getCategories(req, res) {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, data: categories });
  }

  static async getCategoryBySlug(req, res) {
    const category = await Category.findOne({ slug: String(req.params.slug), isActive: true });
    if (!category) throw notFound('Category not found');
    res.json({ success: true, data: category });
  }

  // ---------- Products (public) ----------

  static async getProducts(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 60 });
    const search = parseSearch(req.query.search);
    const filter = { isActive: true, shop: { $in: await activeShopIds() } };

    if (req.query.category) {
      const category = await Category.findOne({ slug: String(req.query.category), isActive: true }).select('_id');
      if (!category) return res.json({ success: true, data: { products: [], totalCount: 0, page, totalPages: 0 } });
      filter.category = category._id;
    }
    if (req.query.subcategory) filter.subcategory = String(req.query.subcategory);
    if (req.query.tag) filter.tags = String(req.query.tag).toLowerCase();
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
    const [products, totalCount] = await Promise.all([
      Product.find(filter).select(LIST_PRODUCT_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, data: { products, totalCount, page, totalPages: Math.ceil(totalCount / limit) } });
  }

  static async searchProducts(req, res) {
    const q = parseSearch(req.query.q);
    if (!q) return res.json({ success: true, data: [] });
    const rx = { $regex: escapeRegExp(q), $options: 'i' };
    const products = await Product.find({ isActive: true, shop: { $in: await activeShopIds() }, $or: [{ name: rx }, { brand: rx }] })
      .select(LIST_PRODUCT_FIELDS)
      .limit(10)
      .lean();
    res.json({ success: true, data: products });
  }

  static async getProductsByTag(req, res) {
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const products = await Product.find({ tags: String(req.params.tag).toLowerCase(), isActive: true, shop: { $in: await activeShopIds() } })
      .select(LIST_PRODUCT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: products });
  }

  static async getProductBySlug(req, res) {
    const product = await Product.findOne({ slug: String(req.params.slug), isActive: true, shop: { $in: await activeShopIds() } })
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .populate('shop', 'name isAcceptingOrders');
    if (!product) throw notFound('Product not found');
    res.json({ success: true, data: product });
  }

  static async getProductById(req, res) {
    assertObjectId(req.params.id, 'product id');
    const product = await Product.findOne({ _id: req.params.id, isActive: true, shop: { $in: await activeShopIds() } })
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .populate('shop', 'name isAcceptingOrders');
    if (!product) throw notFound('Product not found');
    res.json({ success: true, data: product });
  }

  // ---------- Catalog management ----------

  static async getManagedProducts(req, res) {
    assertCatalogManager(req.user);
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const search = parseSearch(req.query.search);
    const filter = {};

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
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.lowStock === 'true') filter.stockCount = { $lte: Number(req.query.threshold) || 10 };
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ name: rx }, { sku: rx }, { brand: rx }];
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').populate('shop', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, data: { products, totalCount, page, totalPages: Math.ceil(totalCount / limit) } });
  }

  static async getManagedProduct(req, res) {
    assertCatalogManager(req.user);
    const product = await loadManagedProduct(req.user, req.params.id);
    await product.populate([{ path: 'category', select: 'name slug' }, { path: 'shop', select: 'name' }]);
    res.json({ success: true, data: product });
  }

  static async createProduct(req, res) {
    assertCatalogManager(req.user);
    const data = productSchema.parse(req.body);
    assertObjectId(data.category, 'category id');
    const category = await Category.findById(data.category);
    if (!category) throw notFound('Category not found');
    const shopId = await resolveProductShop(req.user, data.shop);

    if (data.sku && (await Product.exists({ shop: shopId, sku: data.sku }))) {
      throw conflict('A product with this SKU already exists in this store', 'SKU_TAKEN');
    }

    const product = await Product.create({
      ...productPayload(data),
      shop: shopId,
      category: category._id,
      categorySlug: category.slug,
      slug: await uniqueSlug(Product, slugify(data.name))
    });
    await recordAudit(req, AuditAction.CREATE, 'Product', product._id, { name: product.name, sku: product.sku });
    res.status(201).json({ success: true, data: product });
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
        await recordAudit(req, AuditAction.CREATE, 'Product', null, {
          bulk: true,
          count: created.length
        });
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

    if (data.category) {
      assertObjectId(data.category, 'category id');
      const category = await Category.findById(data.category);
      if (!category) throw notFound('Category not found');
      product.category = category._id;
      product.categorySlug = category.slug;
    }
    if (data.shop && !isShopOwner(req.user)) product.shop = await resolveProductShop(req.user, data.shop);
    if (data.sku && data.sku !== product.sku && (await Product.exists({ shop: product.shop, sku: data.sku, _id: { $ne: product._id } }))) {
      throw conflict('A product with this SKU already exists in this store', 'SKU_TAKEN');
    }

    // Only keys present in the request are applied; '' clears an optional field.
    product.set(productPayload(data));
    await product.save();
    await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, { fields: Object.keys(data) });
    res.json({ success: true, data: product });
  }

  static async updateProductStatus(req, res) {
    assertCatalogManager(req.user);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const product = await loadManagedProduct(req.user, req.params.id);
    product.isActive = isActive;
    await product.save();
    await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, { isActive });
    res.json({ success: true, data: product });
  }

  /** Permanently remove a product from the products collection on delete. */
  static async archiveProduct(req, res) {
    assertCatalogManager(req.user);
    const product = await loadManagedProduct(req.user, req.params.id);
    await Product.deleteOne({ _id: product._id });
    await recordAudit(req, AuditAction.DELETE, 'Product', product._id, { name: product.name, sku: product.sku });
    res.json({ success: true, message: 'Product removed from products' });
  }

  static async bulkDeleteProducts(req, res) {
    assertCatalogManager(req.user);
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
        await recordAudit(req, AuditAction.DELETE, 'Product', product._id, { name: product.name, sku: product.sku, bulk: true });
        deletedCount += 1;
      } catch (err) {
        errors.push({ id, message: err.message || 'Could not delete product' });
      }
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
        stockCount: z.number().int().min(0, 'Stock count must be at least 0').optional()
      })
      .refine((data) => data.isActive !== undefined || data.stockCount !== undefined, {
        message: 'At least one field to update (isActive or stockCount) must be provided'
      })
      .parse(req.body);

    let updatedCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const product = await loadManagedProduct(req.user, id);
        const updates = {};
        if (isActive !== undefined) {
          product.isActive = isActive;
          updates.isActive = isActive;
        }
        if (stockCount !== undefined) {
          product.stockCount = stockCount;
          updates.stockCount = stockCount;
        }
        await product.save();
        await recordAudit(req, AuditAction.UPDATE, 'Product', product._id, { ...updates, bulk: true });
        updatedCount += 1;
      } catch (err) {
        errors.push({ id, message: err.message || 'Could not update product' });
      }
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
    res.json({ success: true, data: category });
  }

  static async updateCategoryStatus(req, res) {
    assertObjectId(req.params.id, 'category id');
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!category) throw notFound('Category not found');
    await recordAudit(req, AuditAction.UPDATE, 'Category', category._id, { isActive });
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
    res.json({ success: true, message: 'Category deleted' });
  }
}

module.exports = { CatalogController };
