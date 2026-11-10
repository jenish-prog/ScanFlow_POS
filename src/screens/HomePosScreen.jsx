import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  Barcode,
  Plus,
  Minus,
  Tag,
  Package,
  TrendingUp,
  Trash2,
  Search,
  Camera,
  CameraOff,
  QrCode,
  Banknote,
  Percent,
  Volume2,
  VolumeX,
  Receipt,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import CircularRing from '../components/CircularRing';
import { NativeBarcodeGraphic } from '../components/NativeBarcodeCard';
import { decodeVideoFrame } from '../utils/barcodeDetector';

/**
 * Main POS Terminal & Customer Billing Screen
 * Uses the clean white card design system, circular progress gauges, and soft shadows from the reference UI,
 * applied 100% to Barcode Scanning, Pre-Loaded Product Lookup, and Customer Tax Billing.
 */
export default function HomePosScreen({
  products,
  cart,
  totals,
  discountEnabled,
  onToggleDiscount,
  muted,
  onToggleMute,
  onScanBarcode,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onConfirmPayment,
  lastScannedItem,
  scanNotice,
  onScanNotice,
  onShowBill,
}) {
  const [searchInput, setSearchInput] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);

  const heroScale = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;
  const checkoutPopAnim = useRef(
    new Animated.Value(cart.length > 0 ? 1 : 0)
  ).current;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const billScrollRef = useRef(null);
  const scanTimerRef = useRef(null);
  const decodingFrameRef = useRef(false);
  const qrReaderRef = useRef(null);
  const cameraSessionRef = useRef(0);
  const lastCameraCodeRef = useRef({ code: '', time: 0 });
  const onScanRef = useRef(onScanBarcode);
  onScanRef.current = onScanBarcode;

  // The web ScrollView shim exposes a DOM node, not scrollToEnd().
  const scrollBillToEnd = () => {
    const el = billScrollRef.current;
    if (!el) return;
    if (typeof el.scrollToEnd === 'function') {
      el.scrollToEnd({ animated: true });
    } else if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
        }),
      ])
    );
    loop.start();
    startCamera();
    return () => {
      loop.stop();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const showBill = () => scrollBillToEnd();
    window.addEventListener('scanflow:show-bill', showBill);
    return () => window.removeEventListener('scanflow:show-bill', showBill);
  }, []);

  // Bring the inline checkout panel into view when it opens.
  useEffect(() => {
    if (!checkoutMode) return undefined;
    const timer = setTimeout(scrollBillToEnd, 140);
    return () => clearTimeout(timer);
  }, [checkoutMode]);

  // A new scan after payment starts a fresh bill, so hide the old receipt.
  useEffect(() => {
    if (checkoutCompleted && cart.length > 0) {
      setCheckoutMode(null);
      setCheckoutCompleted(false);
    }
  }, [cart.length, checkoutCompleted]);

  const openCheckout = (mode) => {
    setCheckoutCompleted(false);
    setCheckoutMode(mode);
  };

  const closeCheckout = () => {
    setCheckoutMode(null);
    setCheckoutCompleted(false);
  };

  useEffect(() => {
    Animated.spring(checkoutPopAnim, {
      toValue: cart.length > 0 ? 1 : 0,
      tension: 65,
      friction: 9,
    }).start();
  }, [cart.length > 0]);

  useEffect(() => {
    if (lastScannedItem) {
      heroScale.setValue(0.96);
      Animated.spring(heroScale, {
        toValue: 1,
        duration: 260,
      }).start();
    }
  }, [lastScannedItem]);

  const handleCameraDetected = (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code) return;
    const now = Date.now();
    const isSameCode = lastCameraCodeRef.current.code === code;
    const cooldown = isSameCode ? 1800 : 700;
    if (now - lastCameraCodeRef.current.time < cooldown) {
      return;
    }
    lastCameraCodeRef.current = { code, time: now };
    // Continuous multi-item scanning: keep camera running for rapid checkout!
    onScanRef.current?.(code, 'CAMERA');
  };

  const stopDecoding = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    decodingFrameRef.current = false;
  };

  const startDecoding = (session) => {
    stopDecoding();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // High-speed 110ms frame loop (~9-10 scans/second) with zero lossy compression
    scanTimerRef.current = setInterval(async () => {
      if (session !== cameraSessionRef.current) return;
      if (decodingFrameRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      decodingFrameRef.current = true;
      try {
        const code = await decodeVideoFrame(video, canvas, ctx);
        if (code && session === cameraSessionRef.current) {
          handleCameraDetected(code);
        }
      } catch (_) {
        // Continue scanning next frame
      } finally {
        decodingFrameRef.current = false;
      }
    }, 110);
  };

  const startCamera = async () => {
    stopCamera();
    const session = cameraSessionRef.current;
    setCameraOpen(true);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (_) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      // Enable continuous focus on mobile cameras if supported
      const track = stream.getVideoTracks()[0];
      if (track?.applyConstraints) {
        track
          .applyConstraints({
            advanced: [{ focusMode: 'continuous' }],
          })
          .catch(() => {});
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      startDecoding(session);
    } catch (_) {
      if (session !== cameraSessionRef.current) return;
      setCameraOpen(false);
      onScanNotice?.(
        'error',
        'Camera permission denied or unavailable. Use a USB/Bluetooth scanner or type the barcode.'
      );
    }
  };

  const stopCamera = () => {
    cameraSessionRef.current += 1;
    stopDecoding();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const handleManualSearchSubmit = () => {
    const clean = searchInput.trim();
    if (!clean) return;

    const query = clean.toLowerCase();
    const match = products.find(
      (p) =>
        p.barcode === clean || (p.name || '').toLowerCase().includes(query)
    );

    if (match) {
      onScanBarcode(match.barcode, 'SEARCH');
      setSearchInput('');
      return;
    }

    if (/^\d{6,}$/.test(clean)) {
      onScanBarcode(clean, 'SEARCH');
      setSearchInput('');
    }
  };

  const cleanSearchQuery = searchInput.trim().toLowerCase();
  const searchMatches = searchInput.trim()
    ? products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const barcode = String(p.barcode || '');
        const category = (p.category || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return (
          name.includes(cleanSearchQuery) ||
          barcode.includes(cleanSearchQuery) ||
          category.includes(cleanSearchQuery) ||
          sku.includes(cleanSearchQuery)
        );
      })
    : [];

  const activeScannedProduct =
    lastScannedItem?.product ||
    (cart.length > 0
      ? products.find((p) => p.barcode === cart[0].barcode)
      : products[0]);

  const totalUnits = cart.reduce((s, i) => s + i.qty, 0);
  const marginPct =
    totals.grandTotal > 0
      ? Math.round((totals.totalProfit / totals.grandTotal) * 100)
      : 0;

  const laserY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 88],
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={billScrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          cart.length > 0 && { paddingBottom: 156 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      {/* 1. Top POS Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandGroup}>
          <View style={styles.logoMark}>
            <Barcode size={19} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.brandTitle}>ScanFlow POS</Text>
            <Text style={styles.brandSub}>Retail Barcode Billing</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconPill} onPress={onToggleMute}>
            {muted ? (
              <VolumeX size={15} color="#E05252" />
            ) : (
              <Volume2 size={15} color="#18181B" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cameraPill}
            onPress={() => (cameraOpen ? stopCamera() : startCamera())}
          >
            {cameraOpen ? (
              <CameraOff size={14} color="#E05252" />
            ) : (
              <Camera size={14} color="#18181B" />
            )}
            <Text style={styles.cameraPillText}>
              {cameraOpen ? 'Stop Cam' : 'Live Cam'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Barcode Laser Scanner Viewfinder + 1-Tap Pre-Loaded Product Chips */}
      <View style={styles.scannerCard}>
        <View style={styles.viewfinderBox}>
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

          {!cameraOpen && activeScannedProduct && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                onScanBarcode(activeScannedProduct.barcode, 'VIEWFINDER_TAP')
              }
              style={styles.barcodeTapArea}
            >
              <NativeBarcodeGraphic
                code={activeScannedProduct.barcode}
                height={34}
              />
              <Text style={styles.barcodeTapSub} numberOfLines={1}>
                {activeScannedProduct.name} • MRP ₹
                {activeScannedProduct.sellingPrice} (Tap to scan +1)
              </Text>
            </TouchableOpacity>
          )}

          {/* Animated Laser Scan Line */}
          <Animated.View
            style={[
              styles.laserLine,
              { transform: [{ translateY: laserY }] },
            ]}
          />

          {cameraOpen && (
            <View style={styles.cameraHintWrap}>
              <View style={styles.cameraHint}>
                <Text style={styles.cameraHintText}>
                  Align the barcode inside the frame
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Manual Barcode / Product Search Bar */}
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrap}>
            <Search size={14} color="#71717A" />
          </View>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleManualSearchSubmit}
            placeholder="Scan or type GTIN barcode / product name..."
            style={styles.searchInput}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearBtn}
              onPress={() => setSearchInput('')}
            >
              <X size={13} color="#71717A" />
            </TouchableOpacity>
          )}
          {searchInput.length > 0 && (
            <TouchableOpacity
              style={styles.searchGoBtn}
              onPress={handleManualSearchSubmit}
            >
              <Text style={styles.searchGoText}>+ Bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Search Results Dropdown / Panel */}
        {searchInput.trim().length > 0 && (
          <View style={styles.searchResultsPanel}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsHeaderText}>
                {searchMatches.length > 0
                  ? `MATCHING PRODUCTS (${searchMatches.length})`
                  : 'SEARCH RESULT'}
              </Text>
              {searchMatches.length > 0 && (
                <Text style={styles.searchResultsHint}>Tap to add to bill</Text>
              )}
            </View>

            {searchMatches.length > 0 ? (
              <ScrollView
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
              >
                {searchMatches.map((prod) => (
                  <TouchableOpacity
                    key={prod.id || prod.barcode}
                    activeOpacity={0.72}
                    style={styles.searchResultItem}
                    onPress={() => {
                      onScanBarcode(prod.barcode, 'SEARCH');
                      setSearchInput('');
                    }}
                  >
                    <View style={styles.searchResultIconBox}>
                      <Barcode size={15} color="#18181B" strokeWidth={2.2} />
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <View style={styles.searchResultMetaRow}>
                        <Text style={styles.searchResultBarcode}>
                          {prod.barcode}
                        </Text>
                        <Text style={styles.searchResultDot}>•</Text>
                        <Text style={styles.searchResultCategory} numberOfLines={1}>
                          {prod.category || 'Retail'}
                        </Text>
                        {prod.stock !== undefined && (
                          <>
                            <Text style={styles.searchResultDot}>•</Text>
                            <Text
                              style={[
                                styles.searchResultStock,
                                prod.stock <= 0 && { color: '#E05252' },
                              ]}
                            >
                              {prod.stock <= 0 ? 'Out of stock' : `${prod.stock} left`}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={styles.searchResultAction}>
                      <Text style={styles.searchResultPrice}>
                        ₹{prod.sellingPrice}
                      </Text>
                      <View style={styles.searchResultAddBadge}>
                        <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.searchResultAddText}>Bill</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.searchNoResultBox}>
                <View style={styles.searchNoResultIcon}>
                  {/^[0-9A-Za-z-]{4,}$/.test(searchInput.trim()) ? (
                    <Sparkles size={16} color="#2563EB" />
                  ) : (
                    <Package size={16} color="#A1A1AA" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  {/^[0-9A-Za-z-]{4,}$/.test(searchInput.trim()) ? (
                    <>
                      <Text style={styles.searchNotFoundTitle}>
                        Barcode "{searchInput.trim()}" not in catalog
                      </Text>
                      <Text style={styles.searchNotFoundSub}>
                        Add it in the Catalog tab, then scan again to bill
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.searchNotFoundTitle}>
                        No products match "{searchInput.trim()}"
                      </Text>
                      <Text style={styles.searchNotFoundSub}>
                        Check product name or enter barcode number
                      </Text>
                    </>
                  )}
                </View>
                {/^[0-9A-Za-z-]{4,}$/.test(searchInput.trim()) && (
                  <TouchableOpacity
                    style={styles.searchLookupBtn}
                    onPress={handleManualSearchSubmit}
                  >
                    <Text style={styles.searchLookupBtnText}>Lookup & Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Scan feedback banner */}
      {scanNotice && (
        <View
          style={[
            styles.scanNotice,
            scanNotice.type === 'error'
              ? styles.scanNoticeError
              : styles.scanNoticeSuccess,
          ]}
        >
          {scanNotice.type === 'error' ? (
            <AlertTriangle size={15} color="#B42318" />
          ) : (
            <CheckCircle2 size={15} color="#067647" />
          )}
          <Text
            style={[
              styles.scanNoticeText,
              scanNotice.type === 'error'
                ? { color: '#B42318' }
                : { color: '#067647' },
            ]}
          >
            {scanNotice.message}
          </Text>
        </View>
      )}

      {/* 3. Main POS Bill Hero Card (Clean White Card with Circular Ring Gauge) */}
      <Animated.View
        style={[
          styles.heroCard,
          { transform: [{ scale: heroScale }] },
        ]}
      >
        <View style={styles.heroLeft}>
          <Text style={styles.heroOverline}>NET BILL PAYABLE</Text>
          <View style={styles.heroNumberLine}>
            <Text style={styles.heroMainVal}>
              ₹{totals.grandTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.heroSubRow}>
            <Text style={styles.heroSubLabel}>
              Subtotal ₹{totals.subtotal.toFixed(0)}
            </Text>
            <TouchableOpacity
              onPress={() => onToggleDiscount(!discountEnabled)}
              style={[
                styles.discountBadge,
                discountEnabled && styles.discountBadgeActive,
              ]}
            >
              <Percent
                size={10}
                color={discountEnabled ? '#FFFFFF' : '#18181B'}
              />
              <Text
                style={[
                  styles.discountBadgeText,
                  discountEnabled && { color: '#FFFFFF' },
                ]}
              >
                {discountEnabled ? '10% Off Applied' : '10% Discount'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <CircularRing
          size={92}
          strokeWidth={8}
          progress={Math.min(1, totalUnits / 10)}
          color="#18181B"
          trackColor="#F1F2F6"
        >
          <View style={styles.heroRingInner}>
            <Receipt size={20} color="#18181B" />
            <Text style={styles.heroRingCount}>{totalUnits}u</Text>
          </View>
        </CircularRing>
      </Animated.View>

      {/* 4. 3-Column POS Metric Cards with Colored Circular Rings */}
      <View style={styles.triGrid}>
        {/* Card 1: Line Items & Units (Coral Ring) */}
        <View style={styles.miniCard}>
          <View style={styles.miniValLine}>
            <Text style={styles.miniMainVal}>{totalUnits}</Text>
            <Text style={styles.miniSubVal}>/{cart.length} SKU</Text>
          </View>
          <Text style={styles.miniLabel}>Qty in Bill</Text>
          <View style={styles.miniRingWrap}>
            <CircularRing
              size={52}
              strokeWidth={4.5}
              progress={Math.min(1, totalUnits / 12)}
              color="#DD6B6B"
              trackColor="#F1F2F6"
            >
              <Package size={15} color="#DD6B6B" />
            </CircularRing>
          </View>
        </View>

        {/* Card 2: Included GST Tax (Amber Ring) */}
        <View style={styles.miniCard}>
          <View style={styles.miniValLine}>
            <Text style={styles.miniMainVal}>
              ₹{totals.gstAmount.toFixed(0)}
            </Text>
            <Text style={styles.miniSubVal}>GST</Text>
          </View>
          <Text style={styles.miniLabel}>CGST + SGST</Text>
          <View style={styles.miniRingWrap}>
            <CircularRing
              size={52}
              strokeWidth={4.5}
              progress={0.55}
              color="#DF9A57"
              trackColor="#F1F2F6"
            >
              <Tag size={15} color="#DF9A57" />
            </CircularRing>
          </View>
        </View>

        {/* Card 3: Retail Margin (Blue Ring) */}
        <View style={styles.miniCard}>
          <View style={styles.miniValLine}>
            <Text style={styles.miniMainVal}>
              ₹{totals.totalProfit.toFixed(0)}
            </Text>
            <Text style={styles.miniSubVal}>/{marginPct}%</Text>
          </View>
          <Text style={styles.miniLabel}>Bill Profit</Text>
          <View style={styles.miniRingWrap}>
            <CircularRing
              size={52}
              strokeWidth={4.5}
              progress={Math.min(1, marginPct / 30)}
              color="#6898E8"
              trackColor="#F1F2F6"
            >
              <TrendingUp size={15} color="#6898E8" />
            </CircularRing>
          </View>
        </View>
      </View>

      {/* 5. Active Customer Bill Items List + Checkout Action Bar */}
      <View style={styles.billSectionHeader}>
        <Text style={styles.sectionHeading}>
          Scanned Bill Items ({cart.length})
        </Text>
        {cart.length > 0 && (
          <TouchableOpacity onPress={onClearCart}>
            <Text style={styles.clearAllText}>Reset Bill</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.billList}>
        {cart.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No items scanned yet</Text>
            <Text style={styles.emptyCardSub}>
              Tap any product chip above to scan its barcode and generate the customer bill.
            </Text>
          </View>
        ) : (
          cart.map((item) => {
            const stockProduct = products.find(
              (p) => p.barcode === item.barcode
            );
            const stockLeft = stockProduct
              ? Math.max(0, Number(stockProduct.stock) || 0)
              : null;
            const atMax = stockLeft !== null && item.qty >= stockLeft;

            return (
              <View key={item.barcode} style={styles.billItemCard}>
                <View style={styles.billTopRow}>
                  <Text style={styles.billItemTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.billItemGtin}>{item.barcode}</Text>
                </View>

                <View style={styles.billMidRow}>
                  <View style={styles.priceGroup}>
                    <Barcode size={16} color="#18181B" />
                    <Text style={styles.billLineTotal}>
                      ₹{(item.qty * item.sellingPrice).toFixed(2)}
                    </Text>
                    <Text style={styles.billUnitRate}>
                      ({item.qty} × ₹{item.sellingPrice})
                    </Text>
                  </View>

                  {/* Quantity Stepper */}
                  <View style={styles.stepperPill}>
                    <TouchableOpacity
                      style={styles.stepCircle}
                      onPress={() => onUpdateQty(item.barcode, item.qty - 1)}
                    >
                      <Minus size={12} color="#18181B" />
                    </TouchableOpacity>
                    <Text style={styles.stepQtyText}>{item.qty}</Text>
                    <TouchableOpacity
                      disabled={atMax}
                      style={[
                        styles.stepCircle,
                        styles.stepCircleDark,
                        atMax && { opacity: 0.35 },
                      ]}
                      onPress={() => onUpdateQty(item.barcode, item.qty + 1)}
                    >
                      <Plus size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.billBottomMeta}>
                  <View style={styles.metaBadge}>
                    <View
                      style={[styles.metaDot, { backgroundColor: '#DD6B6B' }]}
                    />
                    <Text style={styles.metaText}>MRP ₹{item.sellingPrice}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <View
                      style={[styles.metaDot, { backgroundColor: '#DF9A57' }]}
                    />
                    <Text style={styles.metaText}>GST {item.gstRate}%</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <View
                      style={[styles.metaDot, { backgroundColor: '#6898E8' }]}
                    />
                    <Text style={styles.metaText}>
                      +₹{((item.sellingPrice - (item.costPrice || 0)) * item.qty).toFixed(0)} margin
                    </Text>
                  </View>

                  {stockLeft !== null && (
                    <View style={styles.metaBadge}>
                      <View
                        style={[
                          styles.metaDot,
                          {
                            backgroundColor:
                              stockLeft === 0
                                ? '#E05252'
                                : stockLeft < 10
                                ? '#DF9A57'
                                : '#2E9E5B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          stockLeft === 0 && { color: '#E05252' },
                        ]}
                      >
                        {stockLeft === 0
                          ? 'Out of stock'
                          : `${stockLeft} in stock`}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={{ marginLeft: 'auto' }}
                    onPress={() => onRemoveItem(item.barcode)}
                  >
                    <Trash2 size={14} color="#A1A1AA" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 160,
    gap: 12,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 2,
    minHeight: 44,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#18181B',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  cameraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  cameraPillText: {
    color: '#18181B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  scannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    gap: 10,
    boxShadow: '0 8px 26px rgba(15, 23, 42, 0.04)',
  },
  scanNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
  },
  scanNoticeSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#A6F4C5',
  },
  scanNoticeError: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
  },
  scanNoticeText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  viewfinderBox: {
    height: 104,
    borderRadius: 16,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#EBEBEF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  barcodeTapArea: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  barcodeTapSub: {
    color: '#52525B',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: '#2E9E5B',
    boxShadow: '0 0 10px 1.5px #2E9E5B',
    zIndex: 5,
    pointerEvents: 'none',
  },
  cameraHintWrap: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 6,
  },
  cameraHint: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.62)',
  },
  cameraHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F4F7',
    borderWidth: 1,
    borderColor: '#EBEBEF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIconWrap: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    color: '#18181B',
    fontSize: 12.5,
    backgroundColor: 'transparent',
    outline: 'none',
  },
  searchClearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  searchGoBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  searchGoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchResultsPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 10,
    marginTop: 2,
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.06)',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    marginBottom: 4,
  },
  searchResultsHeaderText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  searchResultsHint: {
    fontSize: 10,
    fontWeight: '500',
    color: '#16A34A',
  },
  searchResultsList: {
    maxHeight: 210,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  searchResultIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchResultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchResultName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#18181B',
  },
  searchResultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  searchResultBarcode: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    color: '#71717A',
    fontWeight: '500',
  },
  searchResultDot: {
    fontSize: 9,
    color: '#D4D4D8',
  },
  searchResultCategory: {
    fontSize: 10.5,
    color: '#71717A',
  },
  searchResultStock: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  searchResultAction: {
    alignItems: 'flex-end',
    gap: 3,
    flexShrink: 0,
  },
  searchResultPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18181B',
  },
  searchResultAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  searchResultAddText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchNoResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 10,
  },
  searchNoResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchNotFoundTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181B',
  },
  searchNotFoundSub: {
    fontSize: 10.5,
    color: '#71717A',
    marginTop: 2,
  },
  searchLookupBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  searchLookupBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.04)',
  },
  heroLeft: {
    gap: 4,
    flex: 1,
  },
  heroOverline: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroNumberLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroMainVal: {
    color: '#18181B',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  heroSubLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F4F7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  discountBadgeActive: {
    backgroundColor: '#2E9E5B',
  },
  discountBadgeText: {
    color: '#18181B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingCount: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  triGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.035)',
  },
  miniValLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  miniMainVal: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '800',
  },
  miniSubVal: {
    color: '#A1A1AA',
    fontSize: 10.5,
    fontWeight: '600',
    marginLeft: 2,
  },
  miniLabel: {
    color: '#71717A',
    fontSize: 10.5,
    marginTop: 1,
  },
  miniRingWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  billSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionHeading: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  clearAllText: {
    color: '#E05252',
    fontSize: 12,
    fontWeight: '700',
  },
  billList: {
    gap: 9,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  emptyCardTitle: {
    color: '#18181B',
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyCardSub: {
    color: '#71717A',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
  billItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 8,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
  },
  billTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  billItemTitle: {
    color: '#18181B',
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
  },
  billItemGtin: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '600',
  },
  billMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billLineTotal: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '800',
  },
  billUnitRate: {
    color: '#71717A',
    fontSize: 11,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F4F4F7',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDark: {
    backgroundColor: '#18181B',
  },
  stepQtyText: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 14,
    textAlign: 'center',
  },
  billBottomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metaText: {
    color: '#52525B',
    fontSize: 11,
    fontWeight: '600',
  },
});
