'use strict';

/** Every Mongoose model in the application. Used by scripts that create collections and indexes. */
module.exports = [
  require('./modules/auth/auth.model').User,
  require('./modules/auth/session.model').Session,
  require('./modules/shop/shop.model').Shop,
  require('./modules/catalog/catalog.model').Category,
  require('./modules/catalog/catalog.model').Product,
  require('./modules/cart/cart.model').Cart,
  require('./modules/address/address.model').Address,
  require('./modules/order/order.model').Order,
  require('./modules/rider/rider.model').RiderProfile,
  require('./modules/rider/rider.model').RiderLocation,
  require('./modules/admin/audit.model').AuditLog,
  require('./modules/admin/settings.model').Settings,
  require('./modules/images/image.model').ProductImage,
  require('./modules/inventory/inventory.model').InventoryTransaction,
  require('./modules/inventory/inventory.model').Supplier,
  require('./modules/inventory/inventory.model').Restock,
  require('./modules/inventory/inventory.model').ImportBatch,
  require('./modules/inventory/inventory.model').Counter,
  require('./modules/billing/billing.model').Customer,
  require('./modules/billing/billing.model').Invoice,
  require('./modules/billing/billing.model').Payment
];
