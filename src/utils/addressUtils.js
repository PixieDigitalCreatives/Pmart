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
    street: addr.street || addr.address || '',
    area: addr.area || '',
    landmark: addr.landmark || '',
    city: addr.city || '',
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

export const getFullAddressString = (addr) => {
  if (!addr) return '';
  
  const prefixParts = [
    addr.houseNumber,
    addr.buildingName,
    addr.landmark ? `(Opp. ${addr.landmark})` : ''
  ].filter(Boolean);

  if (addr.formattedAddress) {
    if (prefixParts.length > 0) {
      return `${prefixParts.join(', ')}, ${addr.formattedAddress}`;
    }
    return addr.formattedAddress;
  }
  
  const allParts = [
    ...prefixParts,
    addr.street,
    addr.area,
    addr.city,
    addr.state,
    addr.pincode
  ].filter(Boolean);
  
  return allParts.join(', ');
};
