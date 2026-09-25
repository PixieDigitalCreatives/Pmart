import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext(null);

const defaultLocations = [
  {
    id: 'loc-1',
    tag: 'Home',
    address: 'Flat 402, Blossom Greens, Sector 143, Noida',
    pincode: '201305',
    isDefault: true
  },
  {
    id: 'loc-2',
    tag: 'Work',
    address: 'Plot B-4, Sector 62, Electronic City, Noida',
    pincode: '201309',
    isDefault: false
  },
  {
    id: 'loc-3',
    tag: 'Other',
    address: 'Tower 9, Cyber Hub, DLF Phase 2, Gurugram',
    pincode: '122002',
    isDefault: false
  }
];

export const LocationProvider = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState(defaultLocations[0]);
  const [savedLocations, setSavedLocations] = useState(defaultLocations);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);

  const selectLocation = (loc) => {
    setSelectedLocation(loc);
    setLocationModalOpen(false);
  };

  const addLocation = (newLoc) => {
    const locWithId = {
      ...newLoc,
      id: `loc-${Date.now()}`
    };
    setSavedLocations((prev) => [locWithId, ...prev]);
    setSelectedLocation(locWithId);
    setLocationModalOpen(false);
  };

  const useCurrentLocation = () => {
    const detected = {
      id: `loc-detected-${Date.now()}`,
      tag: 'Current Location',
      address: 'Near Stellar IT Park, Sector 62, Noida',
      pincode: '201309',
      isDefault: false
    };
    setSelectedLocation(detected);
    setLocationModalOpen(false);
  };

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        savedLocations,
        isLocationModalOpen,
        setLocationModalOpen,
        selectLocation,
        addLocation,
        useCurrentLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
