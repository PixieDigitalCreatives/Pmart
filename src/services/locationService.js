// PMart Rider Location Service Abstraction
// Handles GPS acquisition, watchPosition, and transmission to backend

let activeWatchId = null;

export const locationService = {
  /**
   * Start broadcasting GPS coordinates for an order
   */
  startLocationTracking(orderId, onLocationReceived) {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation API not supported in this browser.');
      return false;
    }

    if (activeWatchId !== null) {
      this.stopLocationTracking();
    }

    try {
      activeWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            orderId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading || 0,
            speed: position.coords.speed || 0,
            timestamp: position.timestamp
          };
          this.sendLocationUpdate(location);
          if (onLocationReceived) onLocationReceived(location);
        },
        (error) => {
          console.warn('Geolocation watch error (using fallback coordinates):', error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000
        }
      );
      return true;
    } catch (e) {
      console.warn('Failed to start geolocation tracking:', e);
      return false;
    }
  },

  /**
   * Stop broadcasting location
   */
  stopLocationTracking() {
    if (activeWatchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(activeWatchId);
      activeWatchId = null;
    }
  },

  /**
   * Send coordinate payload to backend API / socket
   */
  sendLocationUpdate(location) {
    // API placeholder: In production this will dispatch to WebSocket or POST /api/rider/location
    return location;
  }
};
