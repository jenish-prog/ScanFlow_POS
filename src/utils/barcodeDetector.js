import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const RETAIL_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

let cachedQrInstance = null;
let nativeDetectorInstance = null;
let nativeDetectorChecked = false;

export function getNativeBarcodeDetector() {
  if (nativeDetectorChecked) return nativeDetectorInstance;
  nativeDetectorChecked = true;
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      nativeDetectorInstance = new window.BarcodeDetector({
        formats: [
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'itf',
          'qr_code',
        ],
      });
    } catch (_) {
      try {
        nativeDetectorInstance = new window.BarcodeDetector();
      } catch (__) {
        nativeDetectorInstance = null;
      }
    }
  }
  return nativeDetectorInstance;
}

export function getFastQrInstance() {
  if (cachedQrInstance) return cachedQrInstance;
  let host = document.getElementById('fast-barcode-detector-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'fast-barcode-detector-host';
    host.style.display = 'none';
    document.body.appendChild(host);
  }
  cachedQrInstance = new Html5Qrcode('fast-barcode-detector-host', {
    formatsToSupport: RETAIL_FORMATS,
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
  return cachedQrInstance;
}

/**
 * High-speed, high-accuracy barcode frame decoder.
 * Reads directly from video element / in-memory canvas WITHOUT lossy JPEG blob compression!
 *
 * 1. Checks native GPU BarcodeDetector on video element directly (5-10ms)
 * 2. Crops centered Region-of-Interest (where the user aligns the barcode laser)
 * 3. Falls back to full video canvas if needed
 */
export async function decodeVideoFrame(video, canvas, ctx) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  // 1. Fast GPU Pass: Native BarcodeDetector
  const nativeDetector = getNativeBarcodeDetector();
  if (nativeDetector) {
    try {
      const results = await nativeDetector.detect(video);
      if (results && results.length > 0 && results[0].rawValue) {
        return results[0].rawValue.trim();
      }
    } catch (_) {
      // Fall through to ZXing
    }
  }

  // 2. Direct In-Memory Canvas Decoding (ZXing via Html5Qrcode Shim)
  const qr = getFastQrInstance();
  if (!qr || !qr.qrcode || !canvas || !ctx) {
    return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Pass 2a: Center Region-of-Interest (Laser Focus Strip)
  // 1D barcodes are held horizontally across the center.
  // Cropping eliminates distracting logos, background clutter, and text, and runs ~4x faster!
  const cropW = Math.round(vw * 0.85);
  const cropH = Math.round(vh * 0.52);
  const cropX = Math.round((vw - cropW) / 2);
  const cropY = Math.round((vh - cropH) / 2);

  canvas.width = cropW;
  canvas.height = cropH;
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  try {
    const res = await qr.qrcode.decodeRobustlyAsync(canvas);
    if (res && res.text) {
      return res.text.trim();
    }
  } catch (_) {
    // Try full frame
  }

  // Pass 2b: Full Frame Scan (if barcode was held outside center strip)
  const maxDim = 960;
  let targetW = vw;
  let targetH = vh;
  if (vw > maxDim) {
    targetW = maxDim;
    targetH = Math.round((vh * maxDim) / vw);
  }

  canvas.width = targetW;
  canvas.height = targetH;
  ctx.drawImage(video, 0, 0, targetW, targetH);

  try {
    const res = await qr.qrcode.decodeRobustlyAsync(canvas);
    if (res && res.text) {
      return res.text.trim();
    }
  } catch (_) {
    return null;
  }

  return null;
}

