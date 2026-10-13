'use strict';

/** Every Mongoose model in the application. Used by scripts that create collections and indexes. */
module.exports = [
  require('./modules/auth/auth.model').User,
  require('./modules/shop/shop.model').Shop,
  require('./modules/catalog/catalog.model').Category,
  require('./modules/catalog/catalog.model').Product,
  require('./modules/cart/cart.model').Cart,
  require('./modules/address/address.model').Address,
  require('./modules/order/order.model').Order,
  require('./modules/rider/rider.model').RiderProfile,
  require('./modules/rider/rider.model').RiderLocation,
  require('./modules/admin/audit.model').AuditLog,
  require('./modules/admin/settings.model').Settings
];
