import React from 'react';

/**
 * Pure SVG Barcode (Code 39) with zero external dependencies.
 * Encodes uppercase alphanumeric strings (invoice numbers, SKUs, etc.)
 * into crisp, high-resolution SVG vector bars for screen and thermal printing.
 */
const CODE39_PATTERNS = {
  '0': 'bwbwbwBwb', '1': 'BwbwbwbwB', '2': 'bwBwbwbwB', '3': 'BwBwbwbwb',
  '4': 'bwbwBwbwB', '5': 'BwbwBwbwb', '6': 'bwBwBwbwb', '7': 'bwbwbwBwB',
  '8': 'BwbwbwBwb', '9': 'bwBwbwBwb', 'A': 'BwbwbwbWb', 'B': 'bwBwbwbWb',
  'C': 'BwBwbwbwb', 'D': 'bwbwBwbWb', 'E': 'BwbwBwbwb', 'F': 'bwBwBwbwb',
  'G': 'bwbwbwBWb', 'H': 'BwbwbwBwb', 'I': 'bwBwbwBwb', 'J': 'bwbwBwBwb',
  'K': 'Bwbwbwbwb', 'L': 'bwBwbwbwb', 'M': 'BwBwbwbwb', 'N': 'bwbwBwbwb',
  'O': 'BwbwBwbwb', 'P': 'bwBwBwbwb', 'Q': 'bwbwbwBwb', 'R': 'BwbwbwBwb',
  'S': 'bwBwbwBwb', 'T': 'bwbwBwBwb', 'U': 'BWbwbwbwB', 'V': 'bwBWbwbwB',
  'W': 'BWBwbwbwb', 'X': 'bwBwBwbwB', 'Y': 'BwBwBwbwB', 'Z': 'bwBWbwbwb',
  '-': 'bwBwbwBwB', '.': 'BwBwbwBwb', ' ': 'bwBWbwBwb', '$': 'bWbWbWbwb',
  '/': 'bWbWbwbWb', '+': 'bWbwbWbWb', '%': 'bwbWbWbWb', '*': 'bwBwBwBwb'
};

export const Barcode = ({
  value = '',
  height = 42,
  barWidth = 1.6,
  showText = false,
  className = ''
}) => {
  const sanitized = String(value || '')
    .toUpperCase()
    .replace(/[^0-9A-Z\-.$/+% ]/g, '-');
  const code = `*${sanitized || 'PMART'}*`;

  const bars = [];
  let currentX = 0;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let j = 0; j < pattern.length; j++) {
      const p = pattern[j];
      const isBar = p === 'b' || p === 'B';
      const isWide = p === 'B' || p === 'W';
      const w = isWide ? barWidth * 2.2 : barWidth;

      if (isBar) {
        bars.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={w}
            height={height}
            fill="#000000"
          />
        );
      }
      currentX += w;
    }
    // Inter-character narrow white space
    currentX += barWidth;
  }

  return (
    <div
      className={`barcode-wrapper ${className}`.trim()}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <svg
        width={currentX}
        height={height}
        viewBox={`0 0 ${currentX} ${height}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {bars}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            marginTop: 2,
            letterSpacing: 2,
            color: '#000000'
          }}
        >
          {sanitized}
        </span>
      )}
    </div>
  );
};

