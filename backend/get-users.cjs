const mongoose = require('mongoose');

async function getUsers() {
  await mongoose.connect('mongodb://127.0.0.1:27017/pmart?replicaSet=rs0');
  const users = await mongoose.connection.db.collection('users').find({}).limit(2).toArray();
  console.log("User IDs:", users.map(u => ({ id: u._id.toString(), email: u.email, role: u.role })));
  process.exit(0);
}

getUsers();
