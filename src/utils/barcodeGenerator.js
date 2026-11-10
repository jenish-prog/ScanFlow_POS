/**
 * Deterministic 1D Barcode (Code-128 style + EAN guard bars) pattern generator
 * Renders crisp high-contrast SVG bars for any GTIN/EAN-13/SKU string.
 */
export function generateBarcodeBars(code = '8901058851458') {
  const clean = String(code || '').trim() || '0000000000000';
  const bars = [];

  // Start guard pattern (101)
  bars.push({ bit: 1, guard: true }, { bit: 0, guard: true }, { bit: 1, guard: true });

  // Encode each character deterministically into a 7-module bar/space pattern
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const seed = (charCode * 31 + i * 17) & 0x7f;
    // Ensure alternating dark/light density for realistic 1D barcode appearance
    const pattern = [
      1,
      (seed >> 0) & 1,
      0,
      (seed >> 1) & 1,
      1,
      (seed >> 2) & 1 ? 0 : 1,
      0,
    ];
    pattern.forEach((bit) => bars.push({ bit, guard: false }));

    // Center guard bar in the middle
    if (i === Math.floor(clean.length / 2) - 1) {
      bars.push(
        { bit: 0, guard: true },
        { bit: 1, guard: true },
        { bit: 0, guard: true },
        { bit: 1, guard: true },
        { bit: 0, guard: true }
      );
    }
  }

  //Checksum / End guard pattern (101)
  bars.push({ bit: 1, guard: true }, { bit: 0, guard: true }, { bit: 1, guard: true });

  return bars;
}

/**
 * Deterministic QR Code matrix generator for UPI Payment Modal
 */
export function generateUpiQrMatrix(upiUri = '') {
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern at bottom-right
  const ar = size - 9;
  const ac = size - 9;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
      const isCenter = r === 2 && c === 2;
      matrix[ar + r][ac + c] = isBorder || isCenter;
    }
  }

  // Hash UPI string into remaining modules
  let hash = 2166136261;
  for (let i = 0; i < upiUri.length; i++) {
    hash ^= upiUri.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const inAlign = r >= ar && r < ar + 5 && c >= ac && c < ac + 5;
      if (inTopLeft || inTopRight || inBottomLeft || inAlign || r === 6 || c === 6) {
        continue;
      }
      const charIdx = (r * size + c) % Math.max(1, upiUri.length);
      const v = (hash ^ (r * 131 + c * 97 + upiUri.charCodeAt(charIdx) * 17)) & 0xff;
      matrix[r][c] = v % 2 === 0;
    }
  }

  return matrix;
}
