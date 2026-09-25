import React from 'react';
import { motion } from 'framer-motion';
import { Navigation2 } from 'lucide-react';
import './RiderMarker.scss';

export const RiderMarker = ({
  x,
  y,
  heading = 45,
  riderName = 'Vikram Singh',
  speed = '26 km/h',
  showLabel = true
}) => {
  return (
    <motion.div
      className="pmart-rider-marker"
      animate={{ x, y }}
      transition={{
        type: 'spring',
        stiffness: 80,
        damping: 18,
        mass: 0.8
      }}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Outer subtle GPS radar beacon */}
      <div className="gps-beacon-ring" />
      <div className="gps-beacon-ring-outer" />

      {/* Directional Heading Carrier */}
      <motion.div
        className="rider-pin-core"
        animate={{ rotate: heading }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="pin-circle">
          <Navigation2 size={13} className="heading-arrow" />
        </div>
      </motion.div>

      {/* Clean Professional Information Chip */}
      {showLabel && (
        <div className="rider-floating-chip">
          <span className="live-status-dot" />
          <span className="rider-text">
            {riderName.split(' ')[0]} • {speed}
          </span>
        </div>
      )}
    </motion.div>
  );
};
