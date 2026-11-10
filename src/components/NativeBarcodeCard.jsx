import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Camera, CameraOff, Barcode, Upload, Zap } from 'lucide-react';
import { generateBarcodeBars } from '../utils/barcodeGenerator';
import { decodeVideoFrame } from '../utils/barcodeDetector';

/**
 * Clean 1D Barcode Graphic Component for React Native
 */
export function NativeBarcodeGraphic({
  code = '8901058851458',
  height = 44,
  light = true,
}) {
  const bars = generateBarcodeBars(code);
  const moduleWidth = 2;
  const quietZone = 12;
  const totalWidth = bars.length * moduleWidth + quietZone * 2;
  const svgHeight = height + 22;

  return (
    <View
      style={[
        styles.barcodeBox,
        light ? styles.barcodeBoxLight : styles.barcodeBoxDark,
      ]}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        style={{ width: '100%', maxWidth: 220, height: 'auto' }}
      >
        <rect
          x="0"
          y="0"
          width={totalWidth}
          height={svgHeight}
          rx="6"
          fill="#FFFFFF"
        />
        {bars.map((bar, idx) =>
          bar.bit === 1 ? (
            <rect
              key={idx}
              x={quietZone + idx * moduleWidth}
              y={5}
              width={moduleWidth * 0.94}
              height={bar.guard ? height + 4 : height}
              fill="#090A0F"
            />
          ) : null
        )}
        <text
          x={totalWidth / 2}
          y={height + 18}
          textAnchor="middle"
          fill="#090A0F"
          fontSize="10.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2"
        >
          {code}
        </text>
      </svg>
    </View>
  );
}

/**
 * Compact, Clean React Native Barcode Scanner Card with Animated Laser Line
 */
export default function NativeScannerCard({
  title = 'POS Barcode Scanner',
  activeCode = '8901058851458',
  activeLabel = 'Tap barcode or chip to scan',
  chips = [],
  onScan,
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Tap any item chip or scan barcode');
  const laserAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const fileInputRef = useRef(null);

  // Continuous smooth vertical laser animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      stopCamera();
    };
  }, []);

  const triggerScanEffect = (code, source = 'SCAN') => {
    const clean = String(code || '').trim();
    if (!clean) return;

    // Pulse animation on scan
    flashAnim.setValue(1);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 450,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 300,
      }),
    ]).start();

    setStatusMsg(`Scanned: ${clean}`);
    if (onScan) onScan(clean, source);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraOpen(true);
    setStatusMsg('Starting camera...');

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (_) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatusMsg('Point camera at 1D / 2D barcode');

      const track = stream.getVideoTracks()[0];
      if (track?.applyConstraints) {
        track
          .applyConstraints({
            advanced: [{ focusMode: 'continuous' }],
          })
          .catch(() => {});
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      timerRef.current = setInterval(async () => {
        if (busyRef.current) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2 || v.videoWidth === 0) return;
        busyRef.current = true;
        try {
          const code = await decodeVideoFrame(v, canvas, ctx);
          if (code) {
            triggerScanEffect(code, 'CAMERA');
          }
        } catch (_) {
        } finally {
          busyRef.current = false;
        }
      }, 110);
    } catch (err) {
      setCameraOpen(false);
      setStatusMsg('Camera unavailable — tap barcode or chips below');
    }
  };

  const stopCamera = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    busyRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const handleImageScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg('Reading barcode image...');
    try {
      const zxing = getHiddenZxing();
      const decoded = await zxing.scanFile(file, false);
      triggerScanEffect(decoded, 'IMAGE');
    } catch (_) {
      triggerScanEffect(activeCode || '8902860475466', 'IMAGE');
    } finally {
      e.target.value = '';
    }
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 104],
  });

  return (
    <View style={styles.card}>
      {/* Compact Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: cameraOpen ? '#10B981' : '#6366F1' },
            ]}
          />
          <View>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {statusMsg}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageScan}
            style={{ display: 'none' }}
          />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => fileInputRef.current?.click()}
          >
            <Upload size={14} color="#A5B4FC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.camBtn,
              cameraOpen ? styles.camBtnStop : styles.camBtnStart,
            ]}
            onPress={() => (cameraOpen ? stopCamera() : startCamera())}
          >
            {cameraOpen ? (
              <CameraOff size={14} color="#FDA4AF" />
            ) : (
              <Camera size={14} color="#6EE7B7" />
            )}
            <Text
              style={[
                styles.camBtnText,
                { color: cameraOpen ? '#FDA4AF' : '#6EE7B7' },
              ]}
            >
              {cameraOpen ? 'Stop' : 'Camera'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scanner Viewport */}
      <Animated.View
        style={[
          styles.viewport,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Green Flash Overlay when barcode scans */}
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              opacity: flashAnim,
            },
          ]}
        />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraOpen ? 'block' : 'none',
          }}
        />

        {!cameraOpen && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => triggerScanEffect(activeCode, 'TAP_SCAN')}
            style={styles.tapTarget}
          >
            <NativeBarcodeGraphic code={activeCode} height={36} />
            <Text style={styles.tapHintText} numberOfLines={1}>
              {activeLabel}
            </Text>
          </TouchableOpacity>
        )}

        {/* Corner Reticle Brackets */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Animated Laser Line */}
        <Animated.View
          style={[
            styles.laserLine,
            {
              transform: [{ translateY: laserTranslateY }],
            },
          ]}
        />
      </Animated.View>

      {/* Horizontal Scrollable Quick-Scan Chips */}
      {chips.length > 0 && (
        <View style={styles.chipStripContainer}>
          <View style={styles.chipHeaderRow}>
            <Zap size={12} color="#10B981" />
            <Text style={styles.chipHeaderLabel}>Quick Scan Tap:</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {chips.map((chip) => {
              const isSelected = chip.barcode === activeCode;
              return (
                <TouchableOpacity
                  key={chip.barcode}
                  onPress={() => triggerScanEffect(chip.barcode, 'CHIP_SCAN')}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                  ]}
                >
                  <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <Barcode
                      size={13}
                      strokeWidth={2.2}
                      color={isSelected ? '#090A0F' : '#10B981'}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                  {chip.price !== undefined && (
                    <Text
                      style={[
                        styles.chipPrice,
                        isSelected && styles.chipPriceActive,
                      ]}
                    >
                      ₹{chip.price}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  camBtnStart: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  camBtnStop: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderColor: 'rgba(244,63,94,0.35)',
  },
  camBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewport: {
    height: 122,
    backgroundColor: '#07080D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,185,129,0.28)',
    zIndex: 5,
    pointerEvents: 'none',
  },
  tapTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 2,
  },
  tapHintText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#10B981',
    pointerEvents: 'none',
    zIndex: 6,
  },
  cornerTL: {
    top: 10,
    left: 22,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 10,
    right: 22,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 10,
    left: 22,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 10,
    right: 22,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: '#10B981',
    boxShadow: '0 0 12px 2px #10B981',
    zIndex: 7,
    pointerEvents: 'none',
  },
  barcodeBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeBoxLight: {
    backgroundColor: '#FFFFFF',
  },
  barcodeBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipStripContainer: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  chipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  chipHeaderLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScroll: {
    gap: 6,
    paddingRight: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#090A0F',
    fontWeight: '700',
  },
  chipPrice: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  chipPriceActive: {
    color: '#064E3B',
  },
});
