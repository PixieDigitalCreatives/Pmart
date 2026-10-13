/**
 * Normalizes an address document from the backend to ensure a consistent shape
 * is used throughout the frontend.
 * 
 * Maps directly to the backend IAddress schema:
 * {
 *   _id, user, label, recipientName, recipientPhone, houseNumber, buildingName,
 *   street, area, landmark, city, state, pincode, country, formattedAddress,
 *   location: { type: 'Point', coordinates: [lng, lat] }, deliveryInstructions,
 *   isDefault, isActive, createdAt, updatedAt
 * }
 */
export const normalizeAddress = (addr) => {
  if (!addr) return null;
  
  return {
    _id: addr._id || addr.id,
    user: addr.user,
    label: addr.label || 'OTHER',
    recipientName: addr.recipientName || addr.fullName || '',
    recipientPhone: addr.recipientPhone || addr.phone || '',
    houseNumber: addr.houseNumber || '',
    buildingName: addr.buildingName || '',
    floor: addr.floor || '',
    street: addr.street || addr.address || '',
    area: addr.area || '',
    landmark: addr.landmark || '',
    city: addr.city || '',
    district: addr.district || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    country: addr.country || 'India',
    formattedAddress: addr.formattedAddress || '',
    location: addr.location || {
      type: 'Point',
      coordinates: addr.coordinates ? [addr.coordinates.lng, addr.coordinates.lat] : [0, 0]
    },
    deliveryInstructions: addr.deliveryInstructions || '',
    isDefault: !!addr.isDefault,
    isActive: addr.isActive !== false,
    createdAt: addr.createdAt,
    updatedAt: addr.updatedAt,
    
    // Derived properties for easy UI rendering
    tag: (addr.label || 'OTHER').charAt(0) + (addr.label || 'OTHER').slice(1).toLowerCase()
  };
};

/**
 * One-line address from the structured fields the customer confirmed (same format the server stores in
 * formattedAddress). Falls back to formattedAddress only for records without structured fields.
 */
export const getFullAddressString = (addr) => {
  if (!addr) return '';
  const parts = [
    addr.houseNumber,
    addr.buildingName,
    addr.floor && `Floor ${addr.floor}`,
    addr.street,
    addr.area,
    addr.city,
    addr.state && addr.pincode ? `${addr.state} - ${addr.pincode}` : addr.state || addr.pincode
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : addr.formattedAddress || '';
};
