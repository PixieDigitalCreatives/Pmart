import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { TbBarcode as ScanBarcode, TbCamera as Camera, TbLoader2 as Loader2 } from 'react-icons/tb';
import { Button } from '@/components/ui';
import { useBarcodeScanner, cameraScanSupported } from '@/hooks/useBarcodeScanner';
import { CameraScanner } from './CameraScanner';
import './inventory.scss';

/**
 * The one scanner control used on every inventory and billing screen.
 * - Type or scan into the box and press Enter (USB scanners send Enter themselves).
 * - Scans are also caught while focus is elsewhere on the page (not inside another text field).
 * - Camera scanning appears when the browser supports it.
 * Call ref.focus() after an action to put the cursor back for the next scan.
 */
export const ScannerInput = forwardRef(({ onScan, busy = false, placeholder = 'Scan a barcode or type a product code, then press Enter', autoFocus = true, label, captureGlobal = true }, ref) => {
  const input = useRef(null);
  const [value, setValue] = useState('');
  const [camera, setCamera] = useState(false);

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus(), clear: () => setValue('') }));

  const submit = useCallback(
    (raw) => {
      const code = String(raw || '').trim();
      if (!code) return;
      setValue('');
      onScan(code);
    },
    [onScan]
  );

  useBarcodeScanner(submit, { enabled: captureGlobal && !camera });

  return (
    <div className="scanner-input">
      {label && <label htmlFor="scanner-box" className="scanner-input-label">{label}</label>}
      <div className="scanner-input-row">
        <div className="scanner-input-box">
          {busy ? <Loader2 size={18} className="spinner scanner-input-icon" /> : <ScanBarcode size={18} className="scanner-input-icon" />}
          <input
            id="scanner-box"
            ref={input}
            data-scanner-input=""
            className="form-control"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit(value);
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            aria-label={label || 'Barcode or product code'}
          />
        </div>
        {cameraScanSupported() && (
          <Button variant="secondary" onClick={() => setCamera(true)} aria-label="Scan with camera" title="Scan with camera">
            <Camera size={18} />
          </Button>
        )}
      </div>
      <CameraScanner
        isOpen={camera}
        onClose={() => setCamera(false)}
        onDetected={(code) => {
          setCamera(false);
          submit(code);
        }}
      />
    </div>
  );
});
ScannerInput.displayName = 'ScannerInput';
