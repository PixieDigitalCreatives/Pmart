import { Request, Response, NextFunction } from 'express';
import { Category, Product } from './catalog.model';
import { z } from 'zod';
import mongoose from 'mongoose';

export class CatalogController {
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find({ isActive: true });
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find({});
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findOne({ slug: req.params.slug, isActive: true });
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search, tag, minPrice, maxPrice, inStockOnly, page = '1', limit = '20' } = req.query;
      const filter: any = { isActive: true };

      if (category) {
        const catObj = await Category.findOne({ slug: category });
        if (catObj) {
          filter.category = catObj._id;
        } else {
          // If category not found, return empty result
          return res.json({ success: true, data: { products: [], totalCount: 0, page: 1, totalPages: 0 } });
        }
      }
      
      if (tag) filter.tags = tag;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (minPrice !== undefined) filter.price = { ...filter.price, $gte: Number(minPrice) };
      if (maxPrice !== undefined) filter.price = { ...filter.price, $lte: Number(maxPrice) };
      if (inStockOnly === 'true') filter.stockCount = { $gt: 0 };

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const products = await Product.find(filter)
        .populate('category', 'name slug')
        .populate('shop', 'name')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
        
      const total = await Product.countDocuments(filter);

      res.json({ 
        success: true, 
        data: {
          products,
          totalCount: total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search, page = '1', limit = '50' } = req.query;
      const filter: any = {};

      if (category) {
        const catObj = await Category.findOne({ slug: category });
        if (catObj) filter.category = catObj._id;
      }
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const products = await Product.find(filter)
        .populate('category', 'name slug')
        .populate('shop', 'name')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
        
      const total = await Product.countDocuments(filter);

      res.json({ 
        success: true, 
        data: {
          products,
          totalCount: total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      if (!q) return res.json({ success: true, data: [] });
      const search = q.toString();
      const products = await Product.find({
        isActive: true,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } }
        ]
      }).limit(10);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getProductsByTag(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.find({ tags: req.params.tag, isActive: true }).limit(8);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category').populate('shop');
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findById(req.params.id).populate('category').populate('shop');
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  // ==========================
  // Product Management (Admin)
  // ==========================

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, category, price, unit, sku, shop } = req.body;
      if (!name || !category || price === undefined || !unit) {
        return res.status(422).json({ success: false, message: 'Missing required fields: name, category, price, unit' });
      }

      const catObj = await Category.findById(category);
      if (!catObj) return res.status(404).json({ success: false, message: 'Category not found' });

      // Check duplicate SKU if provided
      if (sku) {
        const existing = await Product.findOne({ sku, shop: shop || undefined });
        if (existing) return res.status(409).json({ success: false, message: 'Product with this SKU already exists' });
      }

      // Generate slug
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const existingSlug = await Product.findOne({ slug });
      if (existingSlug) slug += '-' + Date.now();

      const product = new Product({
        ...req.body,
        category: catObj._id,
        categorySlug: catObj.slug,
        slug
      });

      // Prevent mass assignment of protected fields
      product._id = new mongoose.Types.ObjectId();
      product.id = (product._id as any).toString();
      
      await product.save();

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.CREATE,
        resource: 'Product',
        resourceId: (product._id as any).toString(),
        details: { name: product.name, sku: product.sku }
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      const allowedUpdates = ['name', 'brand', 'tags', 'description', 'price', 'mrp', 'discount', 'discountPrice', 'unit', 'inStock', 'stockCount', 'stockQuantity', 'deliveryTime', 'image', 'gallery', 'specifications', 'nutrition', 'imageUrl', 'sku', 'isActive', 'shop'];
      
      const updates = Object.keys(req.body);
      const isAllowed = updates.every(update => allowedUpdates.includes(update) || update === 'category');
      
      if (!isAllowed) {
        return res.status(400).json({ success: false, message: 'Invalid updates specified' });
      }

      if (req.body.category) {
        const catObj = await Category.findById(req.body.category);
        if (!catObj) return res.status(404).json({ success: false, message: 'Category not found' });
        product.category = catObj._id as any;
        product.categorySlug = catObj.slug;
      }

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          (product as any)[field] = req.body[field];
        }
      });

      if (req.body.sku && req.body.sku !== product.sku) {
        const existing = await Product.findOne({ sku: req.body.sku, shop: product.shop });
        if (existing && (existing._id as any).toString() !== (product._id as any).toString()) {
          return res.status(409).json({ success: false, message: 'Product with this SKU already exists' });
        }
      }

      await product.save();

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.UPDATE,
        resource: 'Product',
        resourceId: (product._id as any).toString()
      });

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async updateProductStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const product = await Product.findByIdAndUpdate(id, { isActive }, { new: true });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.UPDATE,
        resource: 'Product',
        resourceId: (product._id as any).toString(),
        details: { isActive }
      });

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // Use soft delete to preserve order history
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      product.isActive = false;
      await product.save();

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.DELETE,
        resource: 'Product',
        resourceId: (product._id as any).toString(),
        details: { softDelete: true }
      });

      res.json({ success: true, message: 'Product archived successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================
  // Category Management (Admin)
  // ==========================

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, shortName, description, icon, image, imageUrl } = req.body;
      if (!name) return res.status(422).json({ success: false, message: 'Name is required' });

      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const existingSlug = await Category.findOne({ slug });
      if (existingSlug) slug += '-' + Date.now();

      const category = new Category({
        name, slug, shortName, description, icon, image, imageUrl, isActive: true
      });
      category.id = (category._id as any).toString();
      await category.save();

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.CREATE,
        resource: 'Category',
        resourceId: (category._id as any).toString(),
        details: { name: category.name }
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      const allowedUpdates = ['name', 'shortName', 'description', 'icon', 'image', 'imageUrl', 'isActive'];
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          (category as any)[field] = req.body[field];
        }
      });

      await category.save();

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.UPDATE,
        resource: 'Category',
        resourceId: (category._id as any).toString()
      });

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategoryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const category = await Category.findByIdAndUpdate(id, { isActive }, { new: true });
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.UPDATE,
        resource: 'Category',
        resourceId: (category._id as any).toString(),
        details: { isActive }
      });

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await Category.findById(id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      // Check if products exist in this category
      const productCount = await Product.countDocuments({ category: id });
      if (productCount > 0) {
        return res.status(409).json({ success: false, message: `Cannot delete category. ${productCount} products are currently linked to it.` });
      }

      await Category.deleteOne({ _id: id });

      const { AuditLog, AuditAction } = await import('../admin/audit.model');
      await AuditLog.create({
        user: (req as any).user?._id,
        action: AuditAction.DELETE,
        resource: 'Category',
        resourceId: id
      });

      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
