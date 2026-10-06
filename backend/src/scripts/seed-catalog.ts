import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category, Product } from '../modules/catalog/catalog.model';
import { Shop } from '../modules/shop/shop.model';
import { User, UserRole } from '../modules/auth/auth.model';
import { mockCategories, mockProducts } from './mockData';

dotenv.config();

async function seedCatalog() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmart';
  
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Cannot run development seed script in production environment.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Remove existing catalog data (optional, but requested: "do not delete existing user/order data")
    // Let's use upsert or just clear Categories and Products. The user didn't ask to delete users or orders.
    console.log('Upserting categories...');
    const categoryMap = new Map();
    for (const cat of mockCategories) {
      const updatedCat = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
      categoryMap.set(updatedCat.slug, updatedCat._id);
    }

    // Ensure we have a default shop
    let shopOwner = await User.findOneAndUpdate(
      { phone: '+910000000000' },
      { role: UserRole.SHOP_OWNER, isActive: true },
      { upsert: true, new: true }
    );

    let shop = await Shop.findOneAndUpdate(
      { owner: shopOwner._id },
      {
        name: 'P Mart Seeded Shop',
        address: { street: 'Main', city: 'City', state: 'State', pincode: '000000', coordinates: { lat: 0, lng: 0 } },
        openTime: '08:00',
        closeTime: '22:00'
      },
      { upsert: true, new: true }
    );

    console.log(`Upserting ${mockProducts.length} products...`);
    for (const prod of mockProducts) {
      const catId = categoryMap.get(prod.categorySlug);
      
      const updateData: any = {
        $set: {
          name: prod.name,
          category: catId,
          categorySlug: prod.categorySlug,
          shop: shop._id,
          sku: (prod as any).sku || prod.id,
          brand: prod.brand,
          tags: prod.tags,
          description: prod.description,
          price: prod.price,
          mrp: prod.mrp,
          discount: prod.discount,
          unit: prod.unit,
          rating: prod.rating,
          reviewsCount: prod.reviewsCount,
          deliveryTime: prod.deliveryTime,
          image: prod.image,
          gallery: prod.gallery,
          specifications: prod.specifications,
          nutrition: prod.nutrition,
          isActive: (prod as any).isActive !== undefined ? (prod as any).isActive : true,
          inStock: (prod as any).inStock !== undefined ? (prod as any).inStock : true,
        },
        $setOnInsert: {
          stockCount: (prod as any).stockCount ?? 0,
        }
      };

      await Product.updateOne(
        { slug: prod.slug },
        updateData,
        { upsert: true }
      );
    }

    console.log('Catalog seeding complete.');

  } catch (error) {
    console.error('Error seeding catalog:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedCatalog();
