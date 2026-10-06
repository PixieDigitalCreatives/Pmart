const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Cart = mongoose.connection.collection('carts');
    
    const carts = await Cart.find({}).toArray();
    console.log(`Found ${carts.length} carts.`);
    
    for (const cart of carts) {
      console.log(JSON.stringify(cart, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
