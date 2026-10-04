const mongoose = require('mongoose');

const uri = 'mongodb+srv://pmart:Pmart%402026@pmart.sdws2dd.mongodb.net/pmart_e2e_real_test?appName=pmart';

mongoose.connect(uri)
  .then(() => {
    console.log('SUCCESS: Connected to Atlas!');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
