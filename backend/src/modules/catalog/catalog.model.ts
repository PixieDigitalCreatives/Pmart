import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  id?: string;
  name: string;
  slug: string;
  shortName?: string;
  icon?: string;
  image?: string;
  description?: string;
  subcategories?: string[];
  itemCount?: number;
  imageUrl?: string;
  isActive: boolean;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: String },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortName: { type: String },
    icon: { type: String },
    image: { type: String },
    description: { type: String },
    subcategories: [{ type: String }],
    itemCount: { type: Number },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

export interface IProduct extends Document {
  id?: string;
  shop?: mongoose.Types.ObjectId;
  category?: mongoose.Types.ObjectId;
  categorySlug: string;
  subcategory?: string;
  name: string;
  slug: string;
  brand?: string;
  tags?: string[];
  description?: string;
  price: number;
  mrp?: number;
  discount?: number;
  discountPrice?: number;
  unit: string;
  rating?: number;
  reviewsCount?: number;
  inStock?: boolean;
  stockCount?: number;
  stockQuantity?: number;
  deliveryTime?: string;
  image?: string;
  gallery?: string[];
  specifications?: Record<string, any>;
  nutrition?: Record<string, any>;
  imageUrl?: string;
  isActive?: boolean;
  sku?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop' },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    categorySlug: { type: String, required: true },
    subcategory: { type: String },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    brand: { type: String, default: '' },
    tags: [{ type: String }],
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    discount: { type: Number, min: 0 },
    discountPrice: { type: Number, min: 0 },
    unit: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    stockCount: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    deliveryTime: { type: String },
    image: { type: String },
    gallery: [{ type: String }],
    specifications: { type: Schema.Types.Mixed },
    nutrition: { type: Schema.Types.Mixed },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    sku: { type: String }
  },
  { timestamps: true }
);

// Ensure SKU is unique per shop
ProductSchema.index({ shop: 1, sku: 1 }, { unique: true });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
