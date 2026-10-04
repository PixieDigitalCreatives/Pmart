import { Request, Response, NextFunction } from 'express';
import { Category, Product } from './catalog.model';
import { z } from 'zod';

export class CatalogController {
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find({ isActive: true });
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
}
