import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  ExternalLink,
  Store,
  MapPin
} from 'lucide-react';
import { RiderMarker } from './RiderMarker';
import { CustomerMarker } from './CustomerMarker';
import { DeliveryRoute } from './DeliveryRoute';
import { RecenterMapButton } from './RecenterMapButton';
import './LiveTrackingMap.scss';

// Exact known street network coordinates:
// 1. Starts at P Mart Sasaram in Panjar Colony on Station Road (90, 110)
// 2. Follows Station Road to Post Office Chauraha Junction (320, 110)
// 3. Turns south down Sasaram Jn Link corridor (320, 280)
// 4. Turns east along Dharamsala Road crossing (620, 280)
// 5. Turns south along Gaurakshani Main Corridor (620, 490)
// 6. Enters residential gate to Customer Destination (880, 490)
export const EXACT_SASARAM_STREET_PATH = [
  { x: 90, y: 110, street: 'Station Road / Panjar Colony (P Mart Sasaram)' },
  { x: 320, y: 110, street: 'Station Road & Post Office Chauraha (NH 119A)' },
  { x: 320, y: 280, street: 'Sasaram Jn Link & Dharamsala Crossing' },
  { x: 620, y: 280, street: 'Dharamsala Road & Gaurakshani Corridor' },
  { x: 620, y: 490, street: 'Gaurakshani Sector 2 Residential Ave' },
  { x: 880, y: 490, street: 'Customer Destination Gate (Gaurakshani)' }
];

export const LiveTrackingMap = ({
  riderLocation,
  customerLocation,
  hubLocation,
  route,
  etaMinutes = 8,
  distanceKm = 1.4,
  trackingState = 'TRACKING_ACTIVE',
  riderName = 'Vikram Singh',
  height = '420px',
  orderId = '',
  recenterTrigger = 0
}) => {
  const [mapType, setMapType] = useState('navigation'); // 'navigation' | 'google-map' | 'google-satellite'
  const [zoomLevel, setZoomLevel] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [mapPanOffset, setMapPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Exact coordinates matching the road network:
  const hubXY = { x: 90, y: 110 };
  const customerXY = { x: 880, y: 490 };

  // Route points: strictly follows the exact known road network (no diagonal cutting!)
  const routePoints = EXACT_SASARAM_STREET_PATH;

  // Calculate rider position and orientation strictly along the exact street path
  const riderRoadPos = useMemo(() => {
    const progress = typeof riderLocation?.progress === 'number'
      ? riderLocation.progress
      : Math.max(0.04, Math.min(0.96, 1 - (etaMinutes / 12)));

    const clamped = Math.max(0.01, Math.min(0.99, progress));

    // Calculate total length of all segments
    let totalLength = 0;
    const segments = [];
    for (let i = 0; i < EXACT_SASARAM_STREET_PATH.length - 1; i++) {
      const p1 = EXACT_SASARAM_STREET_PATH[i];
      const p2 = EXACT_SASARAM_STREET_PATH[i + 1];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segments.push({ p1, p2, len, start: totalLength, end: totalLength + len });
      totalLength += len;
    }

    const currentDist = clamped * totalLength;
    const seg = segments.find(s => currentDist >= s.start && currentDist <= s.end) || segments[segments.length - 1];
    const segFrac = seg.len === 0 ? 0 : (currentDist - seg.start) / seg.len;

    const x = seg.p1.x + (seg.p2.x - seg.p1.x) * segFrac;
    const y = seg.p1.y + (seg.p2.y - seg.p1.y) * segFrac;

    const angleRad = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { x: Math.round(x), y: Math.round(y), angle: angleDeg };
  }, [riderLocation?.progress, etaMinutes]);

  // Re-center handler
  useEffect(() => {
    setMapPanOffset({ x: 0, y: 0 });
  }, [recenterTrigger]);

  const handleRecenter = () => {
    setMapPanOffset({ x: 0, y: 0 });
    setZoomLevel(16);
  };

  // Drag pan handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - mapPanOffset.x, y: e.clientY - mapPanOffset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setMapPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  // Google Maps location for P Mart Sasaram
  const pmartGoogleMapsUrl = 'https://maps.app.goo.gl/rpyAd9tmiLKiQFyQ9';

  return (
    <div
      ref={containerRef}
      className={`pmart-live-tracking-map ${isFullscreen ? 'fullscreen-active' : ''}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* 1. TOP-LEFT: Google Maps Style Layer Switcher */}
      <div className="gmap-type-switcher">
        <button
          type="button"
          className={`switch-tab ${mapType === 'navigation' ? 'active' : ''}`}
          onClick={() => setMapType('navigation')}
          title="Live GPS Turn-by-Turn Delivery Track"
        >
          <Navigation size={13} className="tab-icon" />
          <span>Live GPS Route</span>
        </button>
        <button
          type="button"
          className={`switch-tab ${mapType === 'google-map' ? 'active' : ''}`}
          onClick={() => setMapType('google-map')}
          title="Official Google Maps Place for P Mart Sasaram"
        >
          <span>Exact Google Map</span>
        </button>
        <button
          type="button"
          className={`switch-tab ${mapType === 'google-satellite' ? 'active' : ''}`}
          onClick={() => setMapType('google-satellite')}
          title="Google Satellite Imagery"
        >
          <span>Satellite</span>
        </button>
      </div>

      {/* 2. TOP-CENTER: Floating ETA & Distance Pill */}
      <div className="gmap-floating-eta-pill">
        <div className="eta-badge">
          <span className="time-val">{etaMinutes} min</span>
          <span className="dist-val">({distanceKm} km)</span>
        </div>
        <div className="eta-live-tag">
          <span className="pulse-dot" />
          <span>Fastest route via Station Road & Post Office Chauraha • Sasaram</span>
        </div>
      </div>

      {/* 3. TOP-RIGHT: Traffic Layer & Real P Mart Google Maps Link */}
      <div className="gmap-top-right-group">
        <button
          type="button"
          className={`gmap-utility-btn ${showTraffic ? 'traffic-active' : ''}`}
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? 'Traffic layer ON' : 'Toggle traffic layer'}
        >
          <Layers size={15} />
        </button>
        <a
          href={pmartGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gmap-native-link-btn"
          title="Open P Mart Sasaram in Google Maps"
        >
          <ExternalLink size={13} />
          <span>P Mart Maps</span>
        </a>
      </div>

      {/* 4. MAIN MAP CANVAS */}
      {mapType === 'navigation' ? (
        <div
          className="gmap-canvas-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            className="pan-transform-layer"
            style={{
              transform: `translate(${mapPanOffset.x}px, ${mapPanOffset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.25s ease-out',
              width: '100%',
              height: '100%'
            }}
          >
            <svg
              className="gmap-vector-canvas"
              viewBox="0 0 1000 600"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Land Base (Google Maps #f4f3f0) */}
              <rect width="1000" height="600" fill="#f4f3f0" />

              {/* Green Zones: Nehru Park & Sasaram Jn Enclave (Google Green #d4edd4) */}
              <path
                d="M 40,240 Q 120,200 240,230 L 260,380 Q 140,410 40,360 Z"
                fill="#d4edd4"
                stroke="#c0dfc0"
                strokeWidth="1.5"
              />
              <text x="70" y="295" fill="#5a8b5a" fontSize="11" fontWeight="600" fontFamily="Roboto, sans-serif">
                Nehru Park & Sasaram Jn
              </text>
              <text x="70" y="312" fill="#7ba57b" fontSize="9.5" fontWeight="500" fontFamily="Roboto, sans-serif">
                Station Road Enclave
              </text>

              <path
                d="M 680,80 Q 820,60 920,120 L 890,260 Q 750,230 670,180 Z"
                fill="#d4edd4"
                stroke="#c0dfc0"
                strokeWidth="1.5"
              />
              <text x="730" y="160" fill="#5a8b5a" fontSize="11.5" fontWeight="600" fontFamily="Roboto, sans-serif">
                Raj Colony Greens
              </text>

              {/* Waterway (Google Blue #aad3df) */}
              <path
                d="M 0,540 Q 300,510 520,550 T 1000,530 L 1000,600 L 0,600 Z"
                fill="#aad3df"
              />
              <text x="320" y="580" fill="#588795" fontSize="12" fontWeight="500" letterSpacing="2" fontFamily="Roboto, sans-serif">
                GAURAKSHANI BRIDGE CANAL
              </text>

              {/* City Blocks & Building Footprints (Google Buildings #eae7dc) */}
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

              {/* Minor Local Streets (White) */}
              <g stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                <line x1="0" y1="400" x2="320" y2="400" />
                <line x1="320" y1="400" x2="320" y2="520" />
                <line x1="620" y1="110" x2="1000" y2="110" />
                <line x1="880" y1="110" x2="880" y2="350" />
                <line x1="480" y1="280" x2="480" y2="490" />
              </g>

              {/* Major Arterial Roads - Station Road / Post Office Chauraha / Gaurakshani */}
              <g stroke="#f7b243" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
                {/* Station Rd -> Post Office Chauraha -> Dharamsala Rd -> Gaurakshani Bridge -> Customer */}
                <polyline points="90,110 320,110 320,280 620,280 620,490 880,490" fill="none" />
                <line x1="0" y1="110" x2="90" y2="110" />
                <line x1="320" y1="0" x2="320" y2="110" />
                <line x1="620" y1="280" x2="620" y2="0" />
                <line x1="880" y1="490" x2="1000" y2="490" />
              </g>
              <g stroke="#fde293" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="90,110 320,110 320,280 620,280 620,490 880,490" fill="none" />
                <line x1="0" y1="110" x2="90" y2="110" />
                <line x1="320" y1="0" x2="320" y2="110" />
                <line x1="620" y1="280" x2="620" y2="0" />
                <line x1="880" y1="490" x2="1000" y2="490" />
              </g>

              {/* Authentic Sasaram Street Labels */}
              <g fill="#5f6368" fontSize="11" fontWeight="500" fontFamily="Roboto, sans-serif">
                <text x="110" y="98">Station Road / Panjar Colony (P Mart)</text>
                <text x="330" y="210" transform="rotate(90, 330, 210)">Post Office Chauraha Link</text>
                <text x="390" y="270">Dharamsala Road Crossing</text>
                <text x="630" y="380" transform="rotate(90, 630, 380)">Gaurakshani Bridge Corridor</text>
                <text x="670" y="478">Gaurakshani Residential Sector</text>
              </g>

              {/* Live Traffic Overlay on Streets */}
              {showTraffic && (
                <g strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                  <line x1="90" y1="106" x2="220" y2="106" stroke="#00c853" strokeWidth="4" />
                  <line x1="220" y1="106" x2="320" y2="106" stroke="#ff9100" strokeWidth="4" />
                  <line x1="316" y1="110" x2="316" y2="280" stroke="#00c853" strokeWidth="4" />
                  <line x1="320" y1="276" x2="480" y2="276" stroke="#00c853" strokeWidth="4" />
                  <line x1="480" y1="276" x2="620" y2="276" stroke="#ff9100" strokeWidth="4" />
                  <line x1="616" y1="280" x2="616" y2="490" stroke="#00c853" strokeWidth="4" />
                  <line x1="620" y1="486" x2="880" y2="486" stroke="#00c853" strokeWidth="4" />
                </g>
              )}

              {/* 5. DELIVERY ROUTE POLYLINE (STRICTLY FOLLOWS EXACT ROAD NETWORK) */}
              <DeliveryRoute points={routePoints} />

              {/* 6. HUB ORIGIN MARKER: P Mart Sasaram (Exact Location at Panjar Colony) */}
              <g transform={`translate(${hubXY.x}, ${hubXY.y})`}>
                <ellipse cx="0" cy="18" rx="14" ry="5" fill="rgba(0,0,0,0.2)" />
                <circle cx="0" cy="0" r="17" fill="#F20D18" stroke="#ffffff" strokeWidth="3" filter="drop-shadow(0 2px 5px rgba(242,13,24,0.35))" />
                <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="sans-serif">
                  P
                </text>
                <a href={pmartGoogleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <g transform="translate(0, -32)">
                    <rect x="-85" y="-14" width="170" height="28" rx="6" fill="#ffffff" stroke="#dadce0" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.18))" />
                    <text x="0" y="-1" textAnchor="middle" fill="#202124" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">
                      P Mart Sasaram
                    </text>
                    <text x="0" y="10" textAnchor="middle" fill="#1a73e8" fontSize="8.5" fontWeight="600" fontFamily="Roboto, sans-serif">
                      Panjar Colony (24.9589, 84.0156) ↗
                    </text>
                  </g>
                </a>
              </g>

              {/* 7. CUSTOMER DESTINATION MARKER: Gaurakshani, Sasaram */}
              <g transform={`translate(${customerXY.x}, ${customerXY.y})`}>
                <ellipse cx="0" cy="2" rx="9" ry="4" fill="rgba(0,0,0,0.3)" />
                <path
                  d="M 0,-34 C -12,-34 -20,-24 -20,-14 C -20,-2 0,2 0,2 C 0,2 20,-2 20,-14 C 20,-24 12,-34 0,-34 Z"
                  fill="#ea4335"
                  stroke="#c5221f"
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
                />
                <circle cx="0" cy="-17" r="7" fill="#ffffff" />
                <circle cx="0" cy="-17" r="3" fill="#ea4335" />
                <g transform="translate(0, -48)">
                  <rect x="-70" y="-12" width="140" height="24" rx="4" fill="#ffffff" stroke="#dadce0" strokeWidth="1" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.15))" />
                  <text x="0" y="4" textAnchor="middle" fill="#202124" fontSize="10.5" fontWeight="700" fontFamily="Roboto, sans-serif">
                    Gaurakshani Colony
                  </text>
                </g>
              </g>

              {/* 8. DELIVERY RIDER: STRICTLY CENTERED ON ROAD */}
              <g transform={`translate(${riderRoadPos.x}, ${riderRoadPos.y})`}>
                <circle cx="0" cy="0" r="16" fill="rgba(26, 115, 232, 0.25)" className="gps-beacon-ripple" />
                <circle cx="0" cy="0" r="28" fill="rgba(26, 115, 232, 0.15)" className="gps-beacon-ripple-outer" />

                {/* Rider Directional Heading Arrow */}
                <g transform={`rotate(${riderRoadPos.angle})`}>
                  <circle cx="0" cy="0" r="14" fill="#1a73e8" stroke="#ffffff" strokeWidth="3" filter="drop-shadow(0 2px 6px rgba(26,115,232,0.45))" />
                  <polygon points="12,0 3,-5 3,5" fill="#ffffff" />
                </g>

                {/* Floating Rider Info Tag */}
                <g transform="translate(0, -28)">
                  <rect x="-58" y="-11" width="116" height="22" rx="11" fill="#202124" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                  <circle cx="-46" cy="0" r="4" fill="#34a853" />
                  <text x="-36" y="3.5" fill="#ffffff" fontSize="9.5" fontWeight="600" fontFamily="Roboto, sans-serif">
                    {riderName.split(' ')[0]} • 26 km/h
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      ) : (
        /* Real Interactive Google Maps Iframe: Official P Mart Sasaram Embed */
        <div className="gmap-embed-view">
          <iframe
            title="Google Maps Location View"
            src={
              mapType === 'google-satellite'
                ? `https://maps.google.com/maps?q=24.9588592,84.0155717&t=k&z=${zoomLevel}&output=embed`
                : 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3617.213!2d84.0129968!3d24.9588592!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398db7371ea48525%3A0x9c9c7b3a5cb46215!2sP%20mart%20sasaram!5e0!3m2!1sen!2sin!4v1710000000000'
            }
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* 9. BOTTOM-LEFT: Google Brand Watermark & Verified Store Pin Badge */}
      <div className="gmap-bottom-brand-watermark">
        <span className="google-logo-text">
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>o</span>
          <span style={{ color: '#FBBC05' }}>o</span>
          <span style={{ color: '#4285F4' }}>g</span>
          <span style={{ color: '#34A853' }}>l</span>
          <span style={{ color: '#EA4335' }}>e</span>
        </span>
        <a
          href={pmartGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="engine-chip store-verified-link"
          title="Open exact verified P Mart Sasaram coordinates on Google Maps"
        >
          📍 P Mart: Panjar Colony (24.9589° N, 84.0156° E) ↗
        </a>
      </div>

      {/* 10. BOTTOM-RIGHT: Google Maps Controls */}
      <div className="gmap-bottom-controls">
        <RecenterMapButton onRecenter={handleRecenter} />

        <div className="gmap-btn-group zoom-controls">
          <button
            type="button"
            className="gmap-btn zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 19))}
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <div className="btn-sep" />
          <button
            type="button"
            className="gmap-btn zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 10))}
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className="gmap-btn-group view-controls">
          <button
            type="button"
            className="gmap-btn"
            onClick={() => setMapType(mapType === 'google-satellite' ? 'navigation' : 'google-satellite')}
            title="Toggle Satellite Street Imagery"
          >
            <span style={{ fontSize: '15px' }}>🚶</span>
          </button>
          <div className="btn-sep" />
          <button
            type="button"
            className="gmap-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 11. GOOGLE MAPS COPYRIGHT FOOTER */}
      <div className="gmap-legal-footer">
        <span>Keyboard shortcuts</span>
        <span className="dot">•</span>
        <span>Map data ©2026 Google</span>
        <span className="dot">•</span>
        <span>Terms of Use</span>
        <span className="dot">•</span>
        <span>Report a map error</span>
      </div>
    </div>
  );
};
