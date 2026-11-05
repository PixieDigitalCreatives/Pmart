import React from 'react';
import { TbLoader2 as Loader2 } from 'react-icons/tb';

export const LoadingState = ({ text = 'Loading...', fullHeight = false }) => {
  return (
    <div className={`loading-state ${fullHeight ? 'loading-state--full' : ''}`}>
      <Loader2 size={32} className="spinner" />
      <p>{text}</p>
    </div>
  );
};
