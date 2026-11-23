'use strict';

const { Router } = require('express');
const { AddressController } = require('./address.controller');
const { protect, optionalProtect, authorize } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');

const router = Router();

// Public / visitor endpoints (optional user context for serviceability & geocoding)
router.get('/autocomplete', optionalProtect, AddressController.autocomplete);
router.post('/reverse-geocode', optionalProtect, AddressController.reverseGeocode);
router.post('/serviceability', optionalProtect, AddressController.checkServiceability);

// The address book strictly belongs to authenticated customers.
router.use(protect);
router.use(authorize(UserRole.CUSTOMER));
router.get('/', AddressController.getAddresses);
router.post('/', AddressController.createAddress);
router.get('/:id', AddressController.getAddressById);
router.put('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);
router.patch('/:id/default', AddressController.setDefaultAddress);

module.exports = router;
