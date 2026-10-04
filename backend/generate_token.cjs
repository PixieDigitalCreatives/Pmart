const jwt = require('jsonwebtoken');

// A valid mock payload
const payload = {
  id: '6abba09686d4fdf34542b872',
  userId: '6abba09686d4fdf34542b872',
  role: 'CUSTOMER'
};

const secret = process.env.JWT_SECRET || 'production_secret_key_change_me_in_real_prod';
const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log("TEST_TOKEN=" + token);
