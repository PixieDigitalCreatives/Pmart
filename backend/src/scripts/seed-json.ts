import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Shop } from '../modules/shop/shop.model';
import { Category, Product } from '../modules/catalog/catalog.model';
import { User, UserRole } from '../modules/auth/auth.model';

dotenv.config();

async function seedProductsFromJson() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmart';
  
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Cannot run development seed script in production environment.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Ensure we have a default shop owner and shop
    let shopOwner = await User.findOne({ role: UserRole.SHOP_OWNER });
    if (!shopOwner) {
      shopOwner = await User.create({ phone: '+910000000000', role: UserRole.SHOP_OWNER, isActive: true });
    }

    let shop = await Shop.findOne({});
    if (!shop) {
      shop = await Shop.create({
        owner: shopOwner._id,
        name: 'P Mart Seeded Shop',
        address: { street: 'Main', city: 'City', state: 'State', pincode: '000000', coordinates: { lat: 0, lng: 0 } },
        openTime: '08:00',
        closeTime: '22:00'
      });
      console.log('Created default shop.');
    }

    // Read the JSON file
    const jsonPath = path.resolve(__dirname, '../../../demo-products.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Cannot find demo-products.json at ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const productsData = JSON.parse(rawData);

    let createdCount = 0;

    for (const item of productsData) {
      const categoryImages: Record<string, string> = {
        'fruits-vegetables': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80',
        'bakery-dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
        'grocery-staples': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
        'snacks-beverages': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=300&q=80'
      };

      const productImages: Record<string, string> = {
        'fresh-organic-apples-1kg': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?auto=format&fit=crop&w=300&q=80',
        'whole-wheat-bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
        'amul-taza-toned-milk-1l': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
        'tata-salt-1kg': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=300&q=80',
        'maggi-2-minute-noodles-140g': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=300&q=80',
        'lays-india-s-magic-masala-50g': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=300&q=80',
        'broccoli-250g': 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=300&q=80'
      };

      // Ensure category exists
      let category = await Category.findOne({ slug: item.categorySlug });
      if (!category) {
        category = await Category.create({ 
          name: item.categorySlug.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '), 
          slug: item.categorySlug,
          imageUrl: categoryImages[item.categorySlug]
        });
        console.log(`Created category: ${category.name}`);
      }

      // Auto-generate slug if missing
      if (!item.slug) {
        item.slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-', '').replace(/(^-|-$)+/g, '');
      }
      
      if (!item.imageUrl) {
        item.imageUrl = productImages[item.slug];
      }

      // Check if product exists by SKU
      const existingProduct = await Product.findOne({ sku: item.sku });
      if (existingProduct) {
        console.log(`Product ${item.sku} already exists, updating...`);
        Object.assign(existingProduct, { ...item, shop: shop._id, category: category._id });
        await existingProduct.save();
      } else {
        await Product.create({
          ...item,
          shop: shop._id,
          category: category._id
        });
        createdCount++;
      }
    }

    console.log(`Successfully seeded/updated ${productsData.length} products! (${createdCount} newly created)`);

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedProductsFromJson();
