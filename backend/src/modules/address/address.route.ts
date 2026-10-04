import { Router } from 'express';
import { AddressController } from './address.controller';
import { protect } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { UserRole } from '../auth/auth.model';

const router = Router();

// All address routes require authentication as customer
router.use(protect);
router.use(authorize(UserRole.CUSTOMER));

router.get('/', AddressController.getAddresses);
router.post('/', AddressController.createAddress);
router.get('/:id', AddressController.getAddressById);
router.put('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);
router.patch('/:id/default', AddressController.setDefaultAddress);

router.post('/reverse-geocode', AddressController.reverseGeocode);
router.post('/serviceability', AddressController.checkServiceability);

export default router;
