const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/pmart?replicaSet=rs0');
  const dbs = await mongoose.connection.db.admin().listDatabases();
  console.log("Databases:", dbs.databases.map(d => d.name));
  
  const products = await mongoose.connection.db.collection('products').countDocuments();
  const users = await mongoose.connection.db.collection('users').countDocuments();
  console.log(`Products: ${products}, Users: ${users}`);
  
  process.exit(0);
}

verify();
