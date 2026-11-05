import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

/** Reads one barcode from the device camera using the browser's BarcodeDetector, then closes. */
export const CameraScanner = ({ isOpen, onClose, onDetected }) => {
  const video = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let stream;
    let timer;
    let stopped = false;
    setError('');

    const start = async () => {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const detector = new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes.length && codes[0].rawValue) {
              stopped = true;
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // A frame that cannot be read yet; try the next one.
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (err) {
        setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'The camera could not be started.');
      }
    };
    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isOpen, onDetected]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan with camera">
      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <>
          <video ref={video} className="camera-scanner-video" muted playsInline />
          <p className="muted-note mt-2">Hold the barcode inside the frame. It is read automatically.</p>
        </>
      )}
    </Modal>
  );
};
