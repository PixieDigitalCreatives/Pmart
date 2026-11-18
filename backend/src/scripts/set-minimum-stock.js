'use strict';

const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Product, Category } = require('../modules/catalog/catalog.model');

async function run() {
  await connectDB();

  const total = await Product.countDocuments();
  const lowStock = await Product.countDocuments({ stockCount: { $lt: 20 } });
  const activeCount = await Product.countDocuments({ isActive: true });
  console.log(`Current state: Total products: ${total}, Stock < 20: ${lowStock}, Active: ${activeCount}`);

  // Fetch a default category (e.g. Grocery or first available) in case any product is missing category
  let defaultCategory = await Category.findOne({ slug: 'groceries' }) || await Category.findOne();
  if (!defaultCategory) {
    defaultCategory = await Category.create({
      name: 'Groceries',
      slug: 'groceries',
      description: 'Daily grocery essentials'
    });
    console.log('Created default Groceries category');
  }

  // Update products with stockCount < 20 to at least 20
  const stockResult = await Product.updateMany(
    { stockCount: { $lt: 20 } },
    { $set: { stockCount: 20 } }
  );
  console.log(`Updated stock to at least 20 for ${stockResult.modifiedCount} products.`);

  // If products are missing category, assign default category so they can be isActive
  const catResult = await Product.updateMany(
    { $or: [{ category: null }, { category: { $exists: false } }] },
    { $set: { category: defaultCategory._id, categorySlug: defaultCategory.slug } }
  );
  console.log(`Assigned category to ${catResult.modifiedCount} uncategorized products.`);

  // Activate products so they appear in storefront and stock lists
  const activeResult = await Product.updateMany(
    { isActive: false },
    { $set: { isActive: true } }
  );
  console.log(`Activated ${activeResult.modifiedCount} products for the store.`);

  const afterLow = await Product.countDocuments({ stockCount: { $lt: 20 } });
  const afterActive = await Product.countDocuments({ isActive: true });
  console.log(`Final state: Products with stock < 20: ${afterLow}, Active products: ${afterActive}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

