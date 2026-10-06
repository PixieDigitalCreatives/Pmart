import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category, Product } from '../modules/catalog/catalog.model';

dotenv.config();

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

async function seedImages() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmart';
  
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Cannot run development seed script in production environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    for (const [slug, imageUrl] of Object.entries(categoryImages)) {
      await Category.updateOne({ slug }, { imageUrl });
      console.log(`Updated category: ${slug}`);
    }

    for (const [slug, imageUrl] of Object.entries(productImages)) {
      await Product.updateOne({ slug }, { imageUrl });
      console.log(`Updated product: ${slug}`);
    }

    console.log('Images seeded successfully!');
  } catch (error) {
    console.error('Error seeding images:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedImages();
