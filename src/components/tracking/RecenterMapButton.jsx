import React from 'react';
import { Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export const RecenterMapButton = ({ onRecenter, title = 'Re-center on delivery route' }) => {
  return (
    <motion.button
      type="button"
      className="gmap-btn recenter-map-btn"
      onClick={onRecenter}
      whileTap={{ scale: 0.92 }}
      title={title}
      aria-label="Re-center map"
    >
      <Crosshair size={16} />
    </motion.button>
  );
};
