'use strict';

const { Router } = require('express');
const { AddressController } = require('./address.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');

const router = Router();

router.use(protect);

// Any signed-in user may look up an address or check delivery coverage.
router.post('/reverse-geocode', AddressController.reverseGeocode);
router.post('/serviceability', AddressController.checkServiceability);

// The address book belongs to customers.
router.use(authorize(UserRole.CUSTOMER));
router.get('/', AddressController.getAddresses);
router.post('/', AddressController.createAddress);
router.get('/:id', AddressController.getAddressById);
router.put('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);
router.patch('/:id/default', AddressController.setDefaultAddress);

module.exports = router;
