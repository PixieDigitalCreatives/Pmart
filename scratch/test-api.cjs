const http = require('http');

const data = JSON.stringify({
  idempotencyKey: 'test-checkout-' + Date.now(),
  items: [
    { product: '6abb7f6265d11ee372b9f288', shop: '6abb7f6265d11ee372b9f281', quantity: 1, price: 100 },
    { product: '6abb7f6265d11ee372b9f28e', shop: '6abb7f6265d11ee372b9f281', quantity: 2, price: 50 }
  ],
  deliveryAddress: {
    street: "Test St",
    city: "Test City",
    state: "Test State",
    zipCode: "123456",
    coordinates: { lat: 28.5355, lng: 77.3910 }
  },
  paymentMethod: "COD"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/orders/checkout',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYmJhMDk2ODZkNGZkZjM0NTQyYjg3MiIsInVzZXJJZCI6IjZhYmJhMDk2ODZkNGZkZjM0NTQyYjg3MiIsInJvbGUiOiJDVVNUT01FUiIsImlhdCI6MTc5MDY4Mzg2OCwiZXhwIjoxNzkxMjg4NjY4fQ.EpemQ7G8aOSVbjw9GUFxGxHD2LT9gFXLtL96xaHR9zQ'
  }
};

const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', (d) => { chunks += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${chunks}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
