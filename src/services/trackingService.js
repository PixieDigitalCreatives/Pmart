// PMart Live Delivery Tracking Service Abstraction
// Features actual P Mart Sasaram store location (https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9)
// and street-following navigation waypoints

const activeSubscriptions = new Map();

// Authentic Sasaram, Bihar Delivery Coordinates:
// P Mart Sasaram (GT Road): 24.9588592, 84.0155717
// Destination: Gaurakshani, Sasaram: 24.9490, 84.0295
export const SASARAM_PMART_HUB = {
  name: 'P Mart Sasaram',
  address: 'P Mart, Panjar Colony, Near Sasaram Junction & Post Office, Sasaram, Bihar 821115',
  lat: 24.9588592,
  lng: 84.0155717,
  googleMapsUrl: 'https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9'
};

export const SASARAM_CUSTOMER_DESTINATION = {
  name: 'House #14, Gaurakshani Colony, Sasaram, Bihar 821115',
  lat: 24.9490,
  lng: 84.0295
};

// Exact road-following street waypoints:
// Station Road (Panjar Colony) -> Post Office Chauraha -> Dharamsala Rd -> Gaurakshani Bridge -> Customer
export const MOCK_ROUTE_WAYPOINTS = [
  { lat: 24.9588592, lng: 84.0155717, street: 'Station Road / Panjar Colony — P Mart Hub' },
  { lat: 24.9588592, lng: 84.0210000, street: 'Station Road & Post Office Chauraha' },
  { lat: 24.9542000, lng: 84.0210000, street: 'Station Link Road Corridor' },
  { lat: 24.9542000, lng: 84.0268000, street: 'Dharamsala Road Crossing' },
  { lat: 24.9490000, lng: 84.0268000, street: 'Gaurakshani Bridge Mainway' },
  { lat: 24.9490000, lng: 84.0295000, street: 'Gaurakshani Residential Sector (Destination)' }
];

export const trackingService = {
  /**
   * Fetch current tracking snapshot for an order
   */
  async getTracking(orderId) {
    return {
      orderId,
      status: 'OUT_FOR_DELIVERY',
      trackingState: 'TRACKING_ACTIVE',
      rider: {
        id: 'rider_201',
        name: 'Vikram Singh',
        phone: '+91 98112 34567',
        vehicleNumber: 'BR 24 AX 4492',
        vehicleType: 'Electric Scooter (Hero Electric)',
        rating: 4.9,
        location: { ...MOCK_ROUTE_WAYPOINTS[2] },
        progress: 0.42
      },
      hubLocation: {
        ...SASARAM_PMART_HUB
      },
      customerLocation: {
        ...SASARAM_CUSTOMER_DESTINATION
      },
      etaMinutes: 8,
      distanceKm: 1.4,
      route: {
        waypoints: MOCK_ROUTE_WAYPOINTS
      },
      deliveryOtp: '4829'
    };
  },

  /**
   * Subscribe to live location updates along the exact street path
   */
  subscribeToTracking(orderId, callback) {
    if (activeSubscriptions.has(orderId)) {
      this.unsubscribeFromTracking(orderId);
    }

    let segmentIndex = 1; // start on second segment of route
    let segmentFraction = 0.2; // 0.0 to 1.0 along current segment
    const stepSize = 0.08;

    const emitUpdate = () => {
      const p1 = MOCK_ROUTE_WAYPOINTS[segmentIndex];
      const p2 = MOCK_ROUTE_WAYPOINTS[Math.min(segmentIndex + 1, MOCK_ROUTE_WAYPOINTS.length - 1)];

      // Interpolate along the exact road segment
      const currentLat = p1.lat + (p2.lat - p1.lat) * segmentFraction;
      const currentLng = p1.lng + (p2.lng - p1.lng) * segmentFraction;

      const totalSegments = MOCK_ROUTE_WAYPOINTS.length - 1;
      const overallProgress = (segmentIndex + segmentFraction) / totalSegments;
      const remainingProgress = Math.max(0, 1 - overallProgress);

      const distanceKm = Math.max(0.1, +(remainingProgress * 2.2).toFixed(1));
      const etaMinutes = Math.max(1, Math.ceil(remainingProgress * 12));

      let trackingState = 'TRACKING_ACTIVE';
      if (etaMinutes <= 2) {
        trackingState = 'DELIVERY_ARRIVING';
      } else if (etaMinutes <= 4) {
        trackingState = 'RIDER_NEARBY';
      }

      const snapshot = {
        orderId,
        status: 'OUT_FOR_DELIVERY',
        trackingState,
        rider: {
          id: 'rider_201',
          name: 'Vikram Singh',
          phone: '+91 98112 34567',
          vehicleNumber: 'BR 24 AX 4492',
          vehicleType: 'Electric Scooter (Hero Electric)',
          rating: 4.9,
          location: {
            lat: currentLat,
            lng: currentLng
          },
          progress: overallProgress
        },
        hubLocation: {
          ...SASARAM_PMART_HUB
        },
        customerLocation: {
          ...SASARAM_CUSTOMER_DESTINATION
        },
        etaMinutes,
        distanceKm,
        route: {
          waypoints: MOCK_ROUTE_WAYPOINTS
        },
        deliveryOtp: '4829'
      };

      callback(snapshot);

      // Advance along road
      segmentFraction += stepSize;
      if (segmentFraction >= 1.0) {
        segmentFraction = 0;
        segmentIndex++;
        if (segmentIndex >= totalSegments) {
          // Loop back for continuous live demo
          segmentIndex = 0;
          segmentFraction = 0.1;
        }
      }
    };

    emitUpdate();
    const intervalId = setInterval(emitUpdate, 1200);
    activeSubscriptions.set(orderId, intervalId);

    return () => this.unsubscribeFromTracking(orderId);
  },

  /**
   * Unsubscribe from order tracking
   */
  unsubscribeFromTracking(orderId) {
    if (activeSubscriptions.has(orderId)) {
      clearInterval(activeSubscriptions.get(orderId));
      activeSubscriptions.delete(orderId);
    }
  }
};
