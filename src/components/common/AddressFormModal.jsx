import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, Loader2, AlertCircle, Search } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import './AddressFormModal.scss';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'Ex3uk6dmjLzOoVUhieWZ';

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

  // Form state
  const [formData, setFormData] = useState({
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
    tag: 'HOME',
    deliveryInstructions: '',
    isDefault: false,
    location: { type: 'Point', coordinates: [77.3910, 28.5355] },
    formattedAddress: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          recipientName: initialData.recipientName || user?.name || '',
          recipientPhone: initialData.recipientPhone || user?.phone || '',
          location: initialData.location || { type: 'Point', coordinates: [77.3910, 28.5355] }
        });
        setStep(2); // Jump to details if editing
      } else {
        setFormData(prev => ({
          ...prev,
          recipientName: user?.name || '',
          recipientPhone: user?.phone || ''
        }));
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
    if (isOpen && step === 1 && mapContainer.current && !map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
        center: formData.location.coordinates,
        zoom: 15
      });

      marker.current = new maplibregl.Marker({ color: '#F20D18', draggable: true })
        .setLngLat(formData.location.coordinates)
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

    return () => {
      if (!isOpen && map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, step]);

  const handleMapMove = async (lng, lat) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/addresses/reverse-geocode', { lat, lng });
      if (res.data?.success) {
        const data = res.data.data;
        setFormData(prev => ({
          ...prev,
          location: { type: 'Point', coordinates: [lng, lat] },
          formattedAddress: data.formattedAddress,
          street: data.street || prev.street,
          area: data.area || prev.area,
          city: data.city || prev.city,
          district: data.district || prev.district,
          state: data.state || prev.state,
          pincode: data.pincode || prev.pincode,
          country: data.country || 'India'
        }));
      }
    } catch (err) {
      console.error('Reverse geocode failed:', err);
      setError('Couldn\'t identify this location. Move the pin or search for your area.');
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
        (err) => {
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
    console.log('[DEBUG] handleSave called');
    if (!formData.recipientName || !formData.recipientPhone || !formData.houseNumber || !formData.city || !formData.state || !formData.pincode) {
      console.log('[DEBUG] handleSave validation failed: missing fields');
      setError('Please fill in all required fields (Name, Phone, House Number, City, State, Pincode)');
      return;
    }
    
    if (!/^\d{10}$/.test(formData.recipientPhone.replace(/\D/g, ''))) {
      console.log('[DEBUG] handleSave validation failed: invalid phone');
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      console.log('[DEBUG] handleSave validation failed: invalid pincode');
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    // Check serviceability
    console.log('[DEBUG] handleSave: setting loading true');
    setLoading(true);
    try {
      console.log('[DEBUG] handleSave: checking serviceability');
      const srvRes = await apiClient.post('/addresses/serviceability', {
        lat: formData.location.coordinates[1],
        lng: formData.location.coordinates[0]
      });
      console.log('[DEBUG] handleSave: serviceability response', srvRes.data);
      if (!srvRes.data?.data?.serviceable) {
        console.log('[DEBUG] handleSave: not serviceable');
        setError(srvRes.data?.data?.message || 'Currently not delivering to this location');
        setLoading(false);
        return;
      }
      
      console.log('[DEBUG] handleSave: calling onSave');
      await onSave(formData);
      console.log('[DEBUG] handleSave: onSave completed, calling onClose');
      onClose();
    } catch (err) {
      console.log('[DEBUG] handleSave: caught error', err);
      setError(err.response?.data?.message || 'Failed to save address');
    } finally {
      console.log('[DEBUG] handleSave: finally block');
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
            <button onClick={onClose} className="close-btn"><X size={20} /></button>
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
                    <input 
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
                      {searchResults.map((result) => (
                        <div 
                          key={result.id} 
                          className="search-result-item"
                          onClick={() => handleSelectSearchResult(result)}
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

                <button className="gps-btn" onClick={handleUseCurrentLocation} disabled={loading}>
                  {loading ? <Loader2 className="spinning" size={18} /> : <Navigation size={18} />}
                  Use Current Location
                </button>
                <div className="map-container" ref={mapContainer}></div>
                <div className="map-address-preview">
                  <p className="preview-label">Location detected</p>
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
                <button 
                  className="btn btn-primary w-100" 
                  disabled={loading || !formData.formattedAddress}
                  onClick={() => setStep(2)}
                >
                  Enter Complete Address
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="step-2-details">
                
                <h4 className="section-title">Address Details</h4>
                <div className="form-group">
                  <label>House / Flat / Building *</label>
                  <input type="text" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} />
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label>Apartment / Society</label>
                    <input type="text" value={formData.buildingName} onChange={e => setFormData({...formData, buildingName: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label>Floor</label>
                    <input type="text" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} />
                  </div>
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label>Street / Road</label>
                    <input type="text" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label>Area / Locality</label>
                    <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Landmark</label>
                  <input type="text" value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label>City *</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label>State *</label>
                    <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                </div>
                <div className="row">
                  <div className="form-group col">
                    <label>Pincode *</label>
                    <input type="text" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                  </div>
                  <div className="form-group col">
                    <label>District</label>
                    <input type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                  </div>
                </div>
                
                <h4 className="section-title mt-4">Deliver to</h4>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="text" value={formData.recipientPhone} onChange={e => setFormData({...formData, recipientPhone: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Delivery Instructions (Optional)</label>
                  <input type="text" placeholder="e.g. Leave at security gate" value={formData.deliveryInstructions} onChange={e => setFormData({...formData, deliveryInstructions: e.target.value})} />
                </div>
                
                <div className="label-selector">
                  <label>Address Type</label>
                  <div className="tags">
                    {['HOME', 'WORK', 'OTHER'].map(tag => (
                      <button 
                        key={tag} 
                        className={`tag-btn ${formData.tag === tag ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, tag})}
                      >
                        {tag}
                      </button>
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
                  {!initialData && <button className="btn btn-outline" onClick={() => setStep(1)}>Back to Map</button>}
                  <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="spinning" size={18} /> : 'Save Address'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
