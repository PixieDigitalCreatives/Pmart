import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbX as X, TbNavigation as Navigation, TbMapPin as MapPin, TbLoader2 as Loader2, TbAlertCircle as AlertCircle, TbSearch as Search } from 'react-icons/tb';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import apiClient, { apiErrorMessage } from '@/services/apiClient';
import { locationService } from '@/services/locationService';
import { useAuth } from '@/context/AuthContext';
import './AddressFormModal.scss';
import { Input, Button } from '@/components/ui';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
// Initial map view default to Sasaram (P-Mart operational hub)
const DEFAULT_VIEW = { center: [84.0156, 24.9589], zoom: 14 };

const toTenDigits = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const EMPTY_FORM = {
  recipientName: '',
  recipientPhone: '',
  houseNumber: '',
  buildingName: '',
  floor: '',
  street: '',
  area: '',
  landmark: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  label: 'HOME',
  deliveryInstructions: '',
  isDefault: false,
  location: null,
  formattedAddress: ''
};

export const AddressFormModal = ({ isOpen, onClose, onSave, initialData, autoDetect }) => {
  const { user } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Map/Location, 2: Details
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [geocodeNotice, setGeocodeNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setGeocodeNotice('');
      if (initialData) {
        setFormData({
          ...EMPTY_FORM,
          ...initialData,
          label: initialData.label || 'OTHER',
          recipientName: initialData.recipientName || user?.name || '',
          recipientPhone: toTenDigits(initialData.recipientPhone || user?.phone || ''),
          location: initialData.location || null
        });
        setStep(2); // Jump to details if editing
      } else {
        setFormData({ ...EMPTY_FORM, recipientName: user?.name || '', recipientPhone: toTenDigits(user?.phone || '') });
        setStep(1);
        if (autoDetect) {
          setTimeout(() => {
            handleUseCurrentLocation();
          }, 100);
        }
      }
    } else {
       // Reset search state on close
       setSearchQuery('');
       setSearchResults([]);
    }
  }, [isOpen, initialData, user, autoDetect]);

  useEffect(() => {
    if (isOpen && step === 1 && mapContainer.current && !map.current && MAPTILER_KEY) {
      const start = formData.location?.coordinates;
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
        center: start || DEFAULT_VIEW.center,
        zoom: start ? 15 : DEFAULT_VIEW.zoom
      });

      marker.current = new maplibregl.Marker({ color: '#F20D18', draggable: true })
        .setLngLat(start || DEFAULT_VIEW.center)
        .addTo(map.current);

      let dragTimeout;
      marker.current.on('dragend', () => {
        clearTimeout(dragTimeout);
        dragTimeout = setTimeout(() => {
          const lngLat = marker.current.getLngLat();
          handleMapMove(lngLat.lng, lngLat.lat);
        }, 300);
      });

      map.current.on('click', (e) => {
        marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        handleMapMove(e.lngLat.lng, e.lngLat.lat);
      });

      // Resize after load to fix blank map in hidden modals
      setTimeout(() => {
         if (map.current) map.current.resize();
      }, 200);
    }

    // The map container only exists on step 1, so drop the map whenever the step changes or the modal closes;
    // it is recreated (at the pinned location) when the user returns to the map.
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, [isOpen, step]);

  const applyGeocode = (data) =>
    setFormData((prev) => ({
      ...prev,
      formattedAddress: data.formattedAddress || prev.formattedAddress,
      street: data.street || prev.street,
      area: data.area || prev.area,
      city: data.city || prev.city,
      district: data.district || prev.district,
      state: data.state || prev.state,
      pincode: String(data.pincode || '').replace(/\D/g, '') || prev.pincode,
      country: data.country || 'India'
    }));

  // The pin position is always kept; looking up the street address is best effort.
  const handleMapMove = async (lng, lat) => {
    setLoading(true);
    setError('');
    setGeocodeNotice('');
    setFormData((prev) => ({ ...prev, location: { type: 'Point', coordinates: [lng, lat] } }));
    try {
      const res = await apiClient.post('/addresses/reverse-geocode', { lat, lng });
      if (res.data?.success) {
        applyGeocode(res.data.data);
        return;
      }
      throw new Error('no result');
    } catch {
      try {
        const data = await locationService.reverseGeocode(lat, lng);
        if (data) {
          applyGeocode(data);
          return;
        }
      } catch {
        // fall through
      }
      setGeocodeNotice('We could not look up this address. Please type the details on the next step.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map.current) {
            map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          }
          if (marker.current) {
            marker.current.setLngLat([longitude, latitude]);
          }
          handleMapMove(longitude, latitude);
        },
        () => {
          setError('Location permission was denied. Enable location access and try again.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  };

  // MapTiler Geocoding Search
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&country=in&limit=5`);
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSearchResult = (feature) => {
    setSearchQuery('');
    setSearchResults([]);
    
    const [lng, lat] = feature.center;
    
    if (map.current) {
       map.current.flyTo({ center: [lng, lat], zoom: 16 });
    }
    if (marker.current) {
       marker.current.setLngLat([lng, lat]);
    }
    
    // Instead of duplicating logic, run reverse geocode for authoritative data
    handleMapMove(lng, lat);
  };

  const handleSave = async () => {
    if (!formData.location?.coordinates) {
      setError('Place the pin on your location first.');
      setStep(1);
      return;
    }
    if (!formData.recipientName || !formData.recipientPhone || !formData.houseNumber || !formData.city || !formData.state || !formData.pincode) {
      setError('Please fill in all required fields (name, phone, house number, city, state, pincode).');
      return;
    }
    if (!/^\d{10}$/.test(toTenDigits(formData.recipientPhone))) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    const pincode = String(formData.pincode).replace(/\s/g, '');
    if (!/^\d{6}$/.test(pincode)) {
      setError('Enter a valid 6-digit pincode.');
      return;
    }

    setLoading(true);
    try {
      const [lng, lat] = formData.location.coordinates;
      const srvRes = await apiClient.post('/addresses/serviceability', { lat, lng });
      if (!srvRes.data?.data?.serviceable) {
        setError(srvRes.data?.data?.message || 'We do not deliver to this location yet.');
        return;
      }
      await onSave({ ...formData, pincode, recipientPhone: toTenDigits(formData.recipientPhone) });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save address.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="address-form-modal-overlay" onClick={onClose}>
        <motion.div
          className="address-form-modal-content"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="modal-header">
            <h3>{initialData ? 'Edit Address' : 'Add New Address'}</h3>
            <Button onClick={onClose} className="close-btn"><X size={20} /></Button>
          </div>

          <div className="modal-body">
            {error && (
              <div className="error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <div className="step-1-map">
                <div className="search-box-container">
                  <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <Input 
                      type="text" 
                      placeholder="Search area, apartment, street or pincode..." 
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="search-input"
                    />
                    {searchLoading && <Loader2 size={16} className="spinning loading-icon" />}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="search-results-dropdown">
                      {searchResults.map((result, index) => (
                        <div
                          key={`${result.id}-${index}`}
                          className="search-result-item"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectSearchResult(result)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectSearchResult(result);
                            }
                          }}
                        >
                          <MapPin size={16} className="pin-icon" />
                          <div className="result-text">
                            <strong>{result.text}</strong>
                            <p>{result.place_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button className="gps-btn" onClick={handleUseCurrentLocation} disabled={loading}>
                  {loading ? <Loader2 className="spinning" size={18} /> : <Navigation size={18} />}
                  Use Current Location
                </Button>
                {MAPTILER_KEY ? (
                  <div className="map-container" ref={mapContainer}></div>
                ) : (
                  <div className="alert alert-warning">The map is not configured. Use "Use Current Location" to place your address.</div>
                )}
                {geocodeNotice && <div className="alert alert-info mt-2">{geocodeNotice}</div>}
                <div className="map-address-preview">
                  <p className="preview-label">{formData.location ? 'Pinned location' : 'Tap the map or search to place the pin'}</p>
                  {formData.formattedAddress ? (
                    <div className="location-summary">
                      {formData.street && <strong>{formData.street}</strong>}
                      {(formData.area || formData.city) && <p>{[formData.area, formData.city].filter(Boolean).join(', ')}</p>}
                      {formData.district && <p>{formData.district}</p>}
                      <p>{formData.state} - {formData.pincode}</p>
                      <p>{formData.country}</p>
                    </div>
                  ) : (
                    <p className="preview-text">Move marker to select location</p>
                  )}
                </div>
                <Button
                  className="w-100"
                  disabled={loading || !formData.location}
                  onClick={() => setStep(2)}
                >
                  Enter Complete Address
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="step-2-details">
                
                <h4 className="section-title">Address Details</h4>
                <div className="form-group">
                  <label htmlFor="addr-houseNumber">House / Flat / Building *</label>
                  <Input id="addr-houseNumber" type="text" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} />
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="addr-buildingName">Apartment / Society</label>
                    <Input id="addr-buildingName" type="text" value={formData.buildingName} onChange={e => setFormData({...formData, buildingName: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="addr-floor">Floor</label>
                    <Input id="addr-floor" type="text" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} />
                  </div>
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="addr-street">Street / Road</label>
                    <Input id="addr-street" type="text" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="addr-area">Area / Locality</label>
                    <Input id="addr-area" type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="addr-landmark">Landmark</label>
                  <Input id="addr-landmark" type="text" value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="addr-city">City *</label>
                    <Input id="addr-city" type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="addr-state">State *</label>
                    <Input id="addr-state" type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="addr-pincode">Pincode *</label>
                    <Input id="addr-pincode" type="text" inputMode="numeric" maxLength={7} value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="addr-district">District</label>
                    <Input id="addr-district" type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                  </div>
                </div>
                
                <h4 className="section-title mt-4">Deliver to</h4>
                <div className="form-group">
                  <label htmlFor="addr-recipientName">Full Name *</label>
                  <Input id="addr-recipientName" type="text" value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label htmlFor="addr-recipientPhone">Phone Number *</label>
                  <Input id="addr-recipientPhone" type="tel" inputMode="numeric" maxLength={14} value={formData.recipientPhone} onChange={e => setFormData({...formData, recipientPhone: e.target.value})} />
                </div>

                <div className="form-group">
                  <label htmlFor="addr-deliveryInstructions">Delivery Instructions (Optional)</label>
                  <Input id="addr-deliveryInstructions" type="text" placeholder="e.g. Leave at security gate" value={formData.deliveryInstructions} onChange={e => setFormData({...formData, deliveryInstructions: e.target.value})} />
                </div>
                
                <div className="label-selector">
                  <span className="field-label" id="addr-label-type">Address Type</span>
                  <div className="tags" role="group" aria-labelledby="addr-label-type">
                    {['HOME', 'WORK', 'OTHER'].map(label => (
                      <Button
                        key={label}
                        className={`tag-btn ${formData.label === label ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, label})}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="default-toggle">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} />
                    Make this my default address
                  </label>
                </div>

                <div className="actions">
                  {!initialData && <Button  onClick={() => setStep(1)}>Back to Map</Button>}
                  <Button  onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="spinning" size={18} /> : 'Save Address'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
