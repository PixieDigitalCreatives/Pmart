import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '@/services/apiClient';
import { normalizeAddress } from '@/utils/addressUtils';

const LocationContext = createContext(null);

const STORAGE_KEY = 'pmart_selected_location_id';

export const LocationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [savedLocations, setSavedLocations] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // This state holds the GPS detected location before it is saved
  const [detectedLocation, setDetectedLocation] = useState(null);
  
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);

  // Derived selected address
  const selectedLocation = detectedLocation || savedLocations.find(a => a._id === selectedAddressId) || null;

  // ── Fetch saved addresses from backend when user is authenticated ──
  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'CUSTOMER') {
      setSavedLocations([]);
      return;
    }
    setAddressLoading(true);
    setAddressError(null);
    try {
      const res = await apiClient.get('/addresses');
      const backendAddresses = res.data?.data || [];
      console.log('[LocationContext] backendAddresses:', JSON.stringify(backendAddresses));
      const mapped = backendAddresses.map(normalizeAddress);
      setSavedLocations(mapped);

      // ── Determine which address should be selected ──
      const persistedId = localStorage.getItem(STORAGE_KEY);
      
      let newSelectionId = null;

      // Priority 1: Keep currently selected if it still exists
      if (selectedAddressId && mapped.find(a => a._id === selectedAddressId)) {
        newSelectionId = selectedAddressId;
      }
      // Priority 2: Use persisted ID if it exists
      else if (persistedId && mapped.find(a => a._id === persistedId)) {
        newSelectionId = persistedId;
      } 
      // Priority 3: Use the default address
      else if (mapped.find(a => a.isDefault)) {
        newSelectionId = mapped.find(a => a.isDefault)._id;
      }
      // Priority 4: Use the first available address
      else if (mapped.length > 0) {
        newSelectionId = mapped[0]._id;
      }

      if (newSelectionId) {
        setSelectedAddressId(newSelectionId);
        localStorage.setItem(STORAGE_KEY, newSelectionId);
      } else {
        // If there are no saved addresses, and we have a detected location, we can fallback to it
        if (!detectedLocation) {
          setSelectedAddressId(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('[LocationContext] Failed to fetch addresses:', err);
      setAddressError('Unable to load saved addresses');
    } finally {
      setAddressLoading(false);
    }
  }, [isAuthenticated, user, selectedAddressId, detectedLocation]);

  useEffect(() => {
    fetchAddresses();
  }, [isAuthenticated]); // Only re-fetch automatically on auth change

  // ── Select a location ──
  const selectLocation = (locOrId) => {
    const id = typeof locOrId === 'string' ? locOrId : locOrId._id;
    const loc = savedLocations.find(a => a._id === id);
    
    if (loc) {
      setSelectedAddressId(loc._id);
      setDetectedLocation(null); // Clear temporary location if picking a real one
      localStorage.setItem(STORAGE_KEY, loc._id);
      setLocationModalOpen(false);
    } else if (typeof locOrId === 'object' && locOrId.isDetected) {
      // If it's a temporary detected location (before saving)
      setDetectedLocation(locOrId);
      setSelectedAddressId(null);
      setLocationModalOpen(false);
    }
  };

  // ── Add a new address (wait for backend) ──
  const addLocation = async (newLoc) => {
    console.log('[DEBUG] addLocation called with', newLoc);
    if (!isAuthenticated) {
      console.log('[DEBUG] addLocation aborted: not authenticated');
      return;
    }
    
    try {
      console.log('[DEBUG] addLocation: calling API');
      setAddressLoading(true);
      const res = await apiClient.post('/addresses', {
        label: newLoc.label || newLoc.tag || 'OTHER',
        recipientName: newLoc.recipientName || newLoc.fullName,
        recipientPhone: newLoc.recipientPhone || newLoc.phone,
        houseNumber: newLoc.houseNumber,
        buildingName: newLoc.buildingName,
        floor: newLoc.floor,
        street: newLoc.street || newLoc.address,
        area: newLoc.area,
        landmark: newLoc.landmark,
        city: newLoc.city || '',
        district: newLoc.district || '',
        state: newLoc.state || '',
        pincode: newLoc.pincode || '',
        country: newLoc.country || 'India',
        formattedAddress: newLoc.formattedAddress || newLoc.address,
        location: newLoc.location,
        deliveryInstructions: newLoc.deliveryInstructions,
        isDefault: newLoc.isDefault || false
      });
      
      console.log('[DEBUG] addLocation: API response', res.data);
      if (res.data?.success && res.data?.data) {
        console.log('[DEBUG] addLocation: normalizing and updating state');
        const backendAddr = normalizeAddress(res.data.data);
        
        // Update list
        setSavedLocations((prev) => {
          // If the new address is set as default, remove default from others locally
          let newList = prev;
          if (backendAddr.isDefault) {
            newList = prev.map(a => ({ ...a, isDefault: false }));
          }
          return [backendAddr, ...newList];
        });
        
        // Auto-select the newly added real address
        console.log('[DEBUG] addLocation: setting local storage and closing modal');
        setSelectedAddressId(backendAddr._id);
        localStorage.setItem(STORAGE_KEY, backendAddr._id);
        setLocationModalOpen(false);
        setDetectedLocation(null);
      } else {
        console.log('[DEBUG] addLocation: response was missing success or data', res.data);
      }
    } catch (err) {
      console.error('[LocationContext] Failed to persist address:', err);
      throw err;
    } finally {
      console.log('[DEBUG] addLocation: finally block');
      setAddressLoading(false);
    }
  };

  // ── Edit Address (wait for backend) ──
  const updateLocation = async (id, updatedLoc) => {
    if (!isAuthenticated) return;
    
    try {
      setAddressLoading(true);
      const res = await apiClient.put(`/addresses/${id}`, {
        label: updatedLoc.label || updatedLoc.tag || 'OTHER',
        recipientName: updatedLoc.recipientName || updatedLoc.fullName,
        recipientPhone: updatedLoc.recipientPhone || updatedLoc.phone,
        houseNumber: updatedLoc.houseNumber,
        buildingName: updatedLoc.buildingName,
        floor: updatedLoc.floor,
        street: updatedLoc.street || updatedLoc.address,
        area: updatedLoc.area,
        landmark: updatedLoc.landmark,
        city: updatedLoc.city || '',
        district: updatedLoc.district || '',
        state: updatedLoc.state || '',
        pincode: updatedLoc.pincode || '',
        country: updatedLoc.country || 'India',
        formattedAddress: updatedLoc.formattedAddress || updatedLoc.address,
        location: updatedLoc.location,
        deliveryInstructions: updatedLoc.deliveryInstructions,
        isDefault: updatedLoc.isDefault || false
      });

      if (res.data?.success && res.data?.data) {
        const backendAddr = normalizeAddress(res.data.data);
        
        setSavedLocations(prev => {
          let newList = prev;
          if (backendAddr.isDefault) {
            newList = prev.map(a => ({ ...a, isDefault: false }));
          }
          return newList.map(loc => loc._id === id ? backendAddr : loc);
        });
      }
    } catch (err) {
      console.error('[LocationContext] Failed to update address:', err);
      throw err;
    } finally {
      setAddressLoading(false);
    }
  };

  // ── Delete Address ──
  const deleteLocation = async (id) => {
    if (!isAuthenticated) return;
    
    try {
      // Optimistic delete
      setSavedLocations(prev => prev.filter(loc => loc._id !== id));
      
      // If we deleted the selected address, unset it
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      
      await apiClient.delete(`/addresses/${id}`);
      // Re-fetch to ensure if it was default, backend might have reassigned default
      await fetchAddresses();
    } catch (err) {
      console.error('[LocationContext] Failed to delete address:', err);
      fetchAddresses(); // Restore on fail
    }
  };
  
  // ── Set Default Address ──
  const setDefaultAddress = async (id) => {
    if (!isAuthenticated) return;
    
    try {
      setSavedLocations(prev => prev.map(loc => ({
        ...loc,
        isDefault: loc._id === id
      })));
      
      await apiClient.put(`/addresses/${id}/default`);
      // Also automatically select it since the user usually expects that behavior on the Home screen
      selectLocation(id);
    } catch (err) {
      console.error('[LocationContext] Failed to set default address:', err);
      fetchAddresses();
    }
  }

  // ── GPS current location ──
  const useCurrentLocation = async () => {
    try {
      const { locationService } = await import('@/services/locationService');
      const pos = await locationService.getCurrentLocation();
      const geoData = await locationService.reverseGeocode(pos.lat, pos.lng);

      const detected = {
        _id: 'temp-detected',
        isDetected: true,
        label: 'Current Location',
        tag: 'Detected',
        street: geoData?.formattedAddress || `${pos.lat}, ${pos.lng}`,
        formattedAddress: geoData?.formattedAddress || `${pos.lat}, ${pos.lng}`,
        city: geoData?.city || '',
        state: geoData?.state || '',
        pincode: geoData?.pincode || '',
        isDefault: false,
        location: { type: 'Point', coordinates: [pos.lng, pos.lat] }
      };

      setDetectedLocation(detected);
      setSelectedAddressId(null);
      // We don't save to localStorage, just hold in memory
      setLocationModalOpen(false);
    } catch (err) {
      alert(err.message || 'Location permission denied. Enable location access or place your delivery location manually.');
    }
  };

  // ── Clear on logout ──
  useEffect(() => {
    if (!isAuthenticated) {
      setSavedLocations([]);
      setSelectedAddressId(null);
      setDetectedLocation(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated]);

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        selectedAddressId,
        savedLocations,
        isLocationModalOpen,
        setLocationModalOpen,
        selectLocation,
        addLocation,
        updateLocation,
        deleteLocation,
        setDefaultAddress,
        useCurrentLocation,
        addressLoading,
        addressError,
        refetchAddresses: fetchAddresses
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
