import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Compass,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Crosshair,
  ExternalLink,
  Clock,
  MapPin,
  Store,
  Bike,
  RotateCcw,
  Play,
  Pause,
  Info
} from 'lucide-react';
import './GoogleDeliveryMap.scss';
import { Button } from '@/components/ui';

export const GoogleDeliveryMap = ({
  order,
  height = '340px',
  showRiderDetails = true,
  interactive = true
}) => {
  const [mapType, setMapType] = useState('navigation'); // 'navigation' | 'google-map' | 'google-satellite'
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isPlaying, setIsPlaying] = useState(true);
  const [riderProgress, setRiderProgress] = useState(0.42); // 0 to 1 along path
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const containerRef = useRef(null);

  const hubName = order?.shop?.name || 'P Mart Sasaram';
  const hubAddress = order?.shop?.address || 'P Mart, Grand Trunk Road (GT Road), Sasaram, Bihar 821115';
  const deliveryAddress = order?.deliveryAddress?.line1
    ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.line2 || ''}, ${order.deliveryAddress.city || 'Sasaram'}`
    : 'Gaurakshani Colony, Sasaram, Bihar 821115';
  const riderName = order?.rider?.name || 'Delivery Partner';
  const vehicleNumber = order?.rider?.vehicleNumber || '';

  // Animate rider along the route
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setRiderProgress((prev) => {
        if (prev >= 0.95) return 0.15; // loop back near start for continuous simulation
        return prev + 0.006;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Route points definition for realistic multi-street navigation
  // Coordinates in percentage viewBox [0, 1000] x [0, 600]
  const hubCoords = { x: 90, y: 110 };
  const destCoords = { x: 880, y: 490 };

  // Route path segments: Hub -> Main Blvd -> Ring Rd Turn -> South Link -> Residential Ave -> Delivery Pin
  const routePoints = [
    { x: 90, y: 110 },
    { x: 320, y: 110 },
    { x: 320, y: 280 },
    { x: 620, y: 280 },
    { x: 620, y: 490 },
    { x: 880, y: 490 }
  ];

  // Helper to calculate rider position & angle along the polyline
  const getRiderPositionAndAngle = (progress) => {
    // Total lengths of segments
    const segments = [];
    let totalLength = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
      const p1 = routePoints[i];
      const p2 = routePoints[i + 1];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segments.push({ p1, p2, len, start: totalLength, end: totalLength + len });
      totalLength += len;
    }

    const currentDist = progress * totalLength;
    const seg = segments.find(s => currentDist >= s.start && currentDist <= s.end) || segments[segments.length - 1];

    const segProgress = seg.len === 0 ? 0 : (currentDist - seg.start) / seg.len;
    const x = seg.p1.x + (seg.p2.x - seg.p1.x) * segProgress;
    const y = seg.p1.y + (seg.p2.y - seg.p1.y) * segProgress;

    // Angle in degrees
    const angleRad = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { x, y, angle: angleDeg };
  };

  const riderPos = getRiderPositionAndAngle(riderProgress);

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    hubAddress
  )}&destination=${encodeURIComponent(deliveryAddress)}&travelmode=two_wheeler`;

  const googleMapsEmbedUrl =
    mapType === 'google-satellite'
      ? `https://maps.google.com/maps?q=24.9588592,84.0155717&t=k&z=${zoomLevel}&output=embed`
      : 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3617.213!2d84.0129968!3d24.9588592!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398db7371ea48525%3A0x9c9c7b3a5cb46215!2sP%20mart%20sasaram!5e0!3m2!1sen!2sin!4v1710000000000';

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleResetSimulation = () => {
    setRiderProgress(0.1);
    setIsPlaying(true);
  };

  return (
    <div
      ref={containerRef}
      className={`google-delivery-map-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Top Left: Google Maps Style Layer Switcher */}
      <div className="gmap-type-selector">
        <Button
          type="button"
          className={`type-btn ${mapType === 'navigation' ? 'active' : ''}`}
          onClick={() => setMapType('navigation')}
          title="Google Maps Navigation View with Live GPS Track"
        >
          <Navigation size={13} className="btn-icon" />
          <span>Live GPS</span>
        </Button>
        <Button
          type="button"
          className={`type-btn ${mapType === 'google-map' ? 'active' : ''}`}
          onClick={() => setMapType('google-map')}
          title="Actual Google Map Road Network"
        >
          <span>Map</span>
        </Button>
        <Button
          type="button"
          className={`type-btn ${mapType === 'google-satellite' ? 'active' : ''}`}
          onClick={() => setMapType('google-satellite')}
          title="Google Maps Satellite Imagery"
        >
          <span>Satellite</span>
        </Button>
      </div>

      {/* Top Center: Floating Google Navigation Banner */}
      <div className="gmap-eta-banner">
        <div className="eta-badge">
          <span className="eta-time">{order?.tracking?.etaMinutes ? `~${order.tracking.etaMinutes} min` : 'Calculating...'}</span>
          <span className="eta-dist">{order?.tracking?.distanceKm ? `${order.tracking.distanceKm} km` : ''}</span>
        </div>
        <div className="eta-subtext">
          <span className="live-dot" />
          <span>Fastest route via GT Road & Station Link • Sasaram</span>
        </div>
      </div>

      {/* Top Right: Traffic & External Navigation Links */}
      <div className="gmap-top-right-actions">
        <Button
          type="button"
          className={`gmap-icon-btn ${showTraffic ? 'active-traffic' : ''}`}
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? 'Traffic layer enabled' : 'Toggle traffic layer'}
        >
          <Layers size={15} />
        </Button>
        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gmap-open-native-btn"
          title="Open Directions in Official Google Maps"
        >
          <ExternalLink size={13} />
          <span>Google Maps</span>
        </a>
      </div>

      {/* MAP BODY */}
      {mapType === 'navigation' ? (
        <div className="gmap-canvas-viewport">
          <svg
            className="gmap-vector-svg"
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Background land */}
            <rect width="1000" height="600" fill="#f4f3f0" />

            {/* Natural Green Parks (Google Maps Green #c8e8c8) */}
            <path
              d="M 40,240 Q 120,200 240,230 L 260,380 Q 140,410 40,360 Z"
              fill="#d4edd4"
              stroke="#c0dfc0"
              strokeWidth="1.5"
            />
            <text x="80" y="300" fill="#6c9b6c" fontSize="12" fontWeight="600" fontFamily="Roboto, sans-serif">
              Sher Shah Suri Heritage Park
            </text>

            <path
              d="M 680,80 Q 820,60 920,120 L 890,260 Q 750,230 670,180 Z"
              fill="#d4edd4"
              stroke="#c0dfc0"
              strokeWidth="1.5"
            />
            <text x="730" y="160" fill="#6c9b6c" fontSize="12" fontWeight="600" fontFamily="Roboto, sans-serif">
              Fazalganj Green Enclave
            </text>

            {/* Water Body / Canal (Google Maps Blue #aad3df) */}
            <path
              d="M 0,540 Q 300,510 520,550 T 1000,530 L 1000,600 L 0,600 Z"
              fill="#aad3df"
            />
            <text x="320" y="580" fill="#588795" fontSize="12" fontWeight="500" letterSpacing="2" fontFamily="Roboto, sans-serif">
              SASARAM LAKE CANAL
            </text>

            {/* City Blocks & Building Footprints (Google Maps Buildings #e9e8e2) */}
            <g fill="#eae7dc" stroke="#dfdbcd" strokeWidth="1">
              <rect x="130" y="40" width="140" height="40" rx="3" />
              <rect x="360" y="50" width="120" height="45" rx="3" />
              <rect x="520" y="40" width="110" height="50" rx="3" />
              <rect x="360" y="140" width="220" height="110" rx="4" />
              <rect x="670" y="320" width="180" height="120" rx="4" />
              <rect x="360" y="330" width="220" height="120" rx="4" />
              <rect x="110" y="440" width="180" height="60" rx="3" />
              <rect x="660" y="520" width="260" height="40" rx="3" />
            </g>

            {/* Local Minor Streets (Google Maps White with borders) */}
            <g stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
              <line x1="0" y1="400" x2="320" y2="400" />
              <line x1="320" y1="400" x2="320" y2="520" />
              <line x1="620" y1="110" x2="1000" y2="110" />
              <line x1="880" y1="110" x2="880" y2="350" />
              <line x1="480" y1="280" x2="480" y2="490" />
              <line x1="90" y1="110" x2="90" y2="240" />
            </g>
            <g stroke="#dedad2" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" style={{ mixBlendMode: 'multiply', opacity: 0.4 }}>
              <line x1="0" y1="400" x2="320" y2="400" />
              <line x1="320" y1="400" x2="320" y2="520" />
              <line x1="620" y1="110" x2="1000" y2="110" />
              <line x1="880" y1="110" x2="880" y2="350" />
              <line x1="480" y1="280" x2="480" y2="490" />
              <line x1="90" y1="110" x2="90" y2="240" />
            </g>

            {/* Major Arterial Roads (Google Maps Arterial Yellow #fcd385 & borders) */}
            <g stroke="#f7b243" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
              {/* Outer glow/border */}
              <polyline points="90,110 320,110 320,280 620,280 620,490 880,490" fill="none" />
              <line x1="0" y1="110" x2="90" y2="110" />
              <line x1="320" y1="0" x2="320" y2="110" />
              <line x1="620" y1="280" x2="620" y2="0" />
              <line x1="880" y1="490" x2="1000" y2="490" />
            </g>
            <g stroke="#fde293" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
              {/* Inner yellow highway */}
              <polyline points="90,110 320,110 320,280 620,280 620,490 880,490" fill="none" />
              <line x1="0" y1="110" x2="90" y2="110" />
              <line x1="320" y1="0" x2="320" y2="110" />
              <line x1="620" y1="280" x2="620" y2="0" />
              <line x1="880" y1="490" x2="1000" y2="490" />
            </g>

            {/* Street Names (Google Maps Typography) */}
            <g fill="#5f6368" fontSize="11" fontWeight="500" fontFamily="Roboto, sans-serif">
              <text x="130" y="98">GT Road (NH 19) — Sasaram</text>
              <text x="330" y="210" transform="rotate(90, 330, 210)">Station Link Rd (Sasaram Jn)</text>
              <text x="390" y="270">Dharamsala Road Crossing</text>
              <text x="630" y="380" transform="rotate(90, 630, 380)">Gaurakshani Main Corridor</text>
              <text x="680" y="478">Gaurakshani Sector 2 Ave</text>
            </g>

            {/* Traffic Overlay (Google Maps Live Traffic Lines) */}
            {showTraffic && (
              <g strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                {/* Fast traffic - Green #00e676 */}
                <line x1="90" y1="106" x2="220" y2="106" stroke="#00c853" strokeWidth="4" />
                {/* Moderate traffic - Orange #ff9100 */}
                <line x1="220" y1="106" x2="320" y2="106" stroke="#ff9100" strokeWidth="4" />
                <line x1="316" y1="110" x2="316" y2="280" stroke="#00c853" strokeWidth="4" />
                <line x1="320" y1="276" x2="480" y2="276" stroke="#00c853" strokeWidth="4" />
                {/* Minor slowdown near intersection */}
                <line x1="480" y1="276" x2="620" y2="276" stroke="#ff9100" strokeWidth="4" />
                <line x1="616" y1="280" x2="616" y2="490" stroke="#00c853" strokeWidth="4" />
                <line x1="620" y1="486" x2="880" y2="486" stroke="#00c853" strokeWidth="4" />
              </g>
            )}

            {/* GOOGLE NAVIGATION ROUTE POLYLINE (Google Blue #1a73e8 with white border) */}
            <polyline
              points="90,110 320,110 320,280 620,280 620,490 880,490"
              fill="none"
              stroke="#1558d6"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            />
            <polyline
              points="90,110 320,110 320,280 620,280 620,490 880,490"
              fill="none"
              stroke="#1a73e8"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner pulsating route chevron line */}
            <polyline
              points="90,110 320,110 320,280 620,280 620,490 880,490"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="6 14"
              strokeLinecap="round"
              className="animated-route-chevrons"
            />

            {/* 1. ORIGIN PIN: PMart Darkstore Hub */}
            <g transform={`translate(${hubCoords.x}, ${hubCoords.y})`}>
              {/* Ground Shadow */}
              <ellipse cx="0" cy="18" rx="14" ry="5" fill="rgba(0,0,0,0.22)" />
              {/* Store Pin Body */}
              <circle cx="0" cy="0" r="16" fill="#F20D18" stroke="#ffffff" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
              <Store size={16} x="-8" y="-8" color="#ffffff" />
              {/* Callout Label */}
              <a href="https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9" target="_blank" rel="noopener noreferrer">
                <g transform="translate(0, -26)">
                  <rect x="-65" y="-12" width="130" height="24" rx="4" fill="#ffffff" stroke="#dadce0" strokeWidth="1" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))" />
                  <text x="0" y="4" textAnchor="middle" fill="#202124" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">
                    P Mart Sasaram
                  </text>
                </g>
              </a>
            </g>

            {/* 2. DESTINATION PIN: Google Maps Iconic Red Pin */}
            <g transform={`translate(${destCoords.x}, ${destCoords.y})`}>
              {/* Ground Shadow */}
              <ellipse cx="0" cy="2" rx="9" ry="4" fill="rgba(0,0,0,0.3)" />
              {/* Google Maps Teardrop Shape */}
              <path
                d="M 0,-34 C -12,-34 -20,-24 -20,-14 C -20,-2 0,2 0,2 C 0,2 20,-2 20,-14 C 20,-24 12,-34 0,-34 Z"
                fill="#ea4335"
                stroke="#c5221f"
                strokeWidth="1.2"
                filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
              />
              <circle cx="0" cy="-17" r="7" fill="#ffffff" />
              <circle cx="0" cy="-17" r="3" fill="#ea4335" />
              {/* Destination Callout Label */}
              <g transform="translate(0, -48)">
                <rect x="-65" y="-12" width="130" height="24" rx="4" fill="#ffffff" stroke="#dadce0" strokeWidth="1" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))" />
                <text x="0" y="4" textAnchor="middle" fill="#202124" fontSize="10.5" fontWeight="700" fontFamily="Roboto, sans-serif">
                  Gaurakshani, Sasaram
                </text>
              </g>
            </g>

            {/* 3. LIVE RIDER BEACON & MOVING VEHICLE */}
            <g transform={`translate(${riderPos.x}, ${riderPos.y})`}>
              {/* Expanding GPS Pulse Wave */}
              <circle cx="0" cy="0" r="16" fill="rgba(66, 133, 244, 0.25)" className="gps-beacon-ripple" />
              <circle cx="0" cy="0" r="28" fill="rgba(66, 133, 244, 0.15)" className="gps-beacon-ripple-outer" />

              {/* Rider Vehicle Heading Base */}
              <g transform={`rotate(${riderPos.angle})`}>
                <circle cx="0" cy="0" r="14" fill="#1a73e8" stroke="#ffffff" strokeWidth="3" filter="drop-shadow(0 2px 6px rgba(26,115,232,0.45))" />
                {/* Navigation forward direction wedge */}
                <polygon points="12,0 3,-5 3,5" fill="#ffffff" />
              </g>

              {/* Floating Rider Info Tag */}
              <g transform="translate(0, -28)">
                <rect x="-58" y="-11" width="116" height="22" rx="11" fill="#202124" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                <circle cx="-46" cy="0" r="4" fill="#34a853" />
                <text x="-36" y="3.5" fill="#ffffff" fontSize="9.5" fontWeight="600" fontFamily="Roboto, sans-serif">
                  {riderName.split(' ')[0]}
                </text>
              </g>
            </g>
          </svg>
        </div>
      ) : (
        /* Real Interactive Google Maps Iframe (Map or Satellite Mode) */
        <div className="gmap-embed-wrapper">
          <iframe
            title="Google Maps Location View"
            src={googleMapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Bottom Left: Official Google Maps Brand Watermark */}
      <div className="gmap-bottom-brand">
        <span className="google-wordmark">
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>o</span>
          <span style={{ color: '#FBBC05' }}>o</span>
          <span style={{ color: '#4285F4' }}>g</span>
          <span style={{ color: '#34A853' }}>l</span>
          <span style={{ color: '#EA4335' }}>e</span>
        </span>
        {mapType === 'navigation' && (
          <span className="nav-engine-pill">Live Navigation Engine</span>
        )}
      </div>

      {/* Bottom Right: Google Maps Standard Map Controls */}
      <div className="gmap-bottom-right-controls">
        {/* Play / Pause live simulation (only in Navigation mode) */}
        {mapType === 'navigation' && (
          <div className="gmap-control-group play-pause-group">
            <Button
              type="button"
              className="gmap-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause rider movement' : 'Resume rider movement'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button
              type="button"
              className="gmap-btn"
              onClick={handleResetSimulation}
              title="Reset simulation to hub"
            >
              <RotateCcw size={14} />
            </Button>
          </div>
        )}

        {/* Re-center GPS */}
        <Button
          type="button"
          className="gmap-btn location-recenter-btn"
          onClick={() => {
            setZoomLevel(15);
            setRiderProgress(0.42);
          }}
          title="Re-center on delivery rider"
        >
          <Crosshair size={16} />
        </Button>

        {/* Zoom In & Out */}
        <div className="gmap-control-group zoom-group">
          <Button
            type="button"
            className="gmap-btn zoom-in"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 19))}
            title="Zoom In"
          >
            <Plus size={16} />
          </Button>
          <div className="btn-divider" />
          <Button
            type="button"
            className="gmap-btn zoom-out"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 10))}
            title="Zoom Out"
          >
            <Minus size={16} />
          </Button>
        </div>

        {/* Pegman Street View & Fullscreen */}
        <div className="gmap-control-group view-group">
          <Button
            type="button"
            className="gmap-btn pegman-btn"
            onClick={() => setMapType(mapType === 'google-satellite' ? 'navigation' : 'google-satellite')}
            title="Toggle Google Satellite / Street Imagery"
          >
            <span className="pegman-icon">🚶</span>
          </Button>
          <div className="btn-divider" />
          <Button
            type="button"
            className="gmap-btn fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </Button>
        </div>
      </div>

      {/* Bottom Legal / Copyright Footer (Exact Google Maps Style) */}
      <div className="gmap-legal-strip">
        <span>Keyboard shortcuts</span>
        <span className="sep">•</span>
        <span>Map data ©2026 Google</span>
        <span className="sep">•</span>
        <span>Terms of Use</span>
        <span className="sep">•</span>
        <span>Report a map error</span>
      </div>

      {/* Rider Status Strip Footer */}
      {showRiderDetails && (
        <div className="gmap-rider-status-bar">
          <div className="rider-avatar-bubble">
            <Bike size={16} />
          </div>
          <div className="rider-quick-meta">
            <span className="rider-title">{riderName}</span>
            <span className="vehicle-desc">
              {vehicleNumber} • Approaching Gaurakshani
            </span>
          </div>
          <div className="speed-pill">
            <span className="pulse-indicator" />
            <span>GPS LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};
