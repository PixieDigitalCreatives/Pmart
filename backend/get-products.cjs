const mongoose = require('mongoose');

async function getProducts() {
  await mongoose.connect('mongodb://127.0.0.1:27017/pmart?replicaSet=rs0');
  const products = await mongoose.connection.db.collection('products').find({}).limit(2).toArray();
  const shops = await mongoose.connection.db.collection('shops').find({}).limit(1).toArray();
  console.log("Product IDs:", products.map(p => p._id.toString()));
  console.log("Shop IDs:", shops.map(s => s._id.toString()));
  process.exit(0);
}

getProducts();
