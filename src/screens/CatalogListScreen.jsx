import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import {
  Search,
  Barcode,
  Trash2,
  Edit3,
  ShoppingCart,
  Pencil,
  Tag,
  Package,
  Percent,
  RefreshCw,
  X,
  Camera,
  CameraOff,
} from 'lucide-react';
import { CATEGORIES, storageService } from '../services/storageService';
import { soundEngine } from '../utils/sound';
import CircularRing from '../components/CircularRing';
import { decodeVideoFrame } from '../utils/barcodeDetector';

/**
 * Inventory Catalog & Barcode Product Onboarding Screen
 * Uses the clean white card, editable title box (✎), 3-column metric cards, segmented filter pill,
 * and circular stock rings from the reference UI design system.
 */
export default function CatalogListScreen({
  products,
  onSaveProduct,
  onAddToBill,
  onDeleteProduct,
  onOpenSticker,
  onRegisterScanHandler,
}) {
  const [search, setSearch] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | LOW | OUT
  const [savedNotice, setSavedNotice] = useState('');
  const [lastSavedCode, setLastSavedCode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  const cardAnim = useRef(new Animated.Value(1)).current;
  const nameInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const decodingFrameRef = useRef(false);
  const lastCameraCodeRef = useRef({ code: '', time: 0 });
  const laserAnim = useRef(new Animated.Value(0)).current;

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
    if (onRegisterScanHandler) {
      onRegisterScanHandler((code) => {
        handleLoadBarcode(code);
      });
    }
  }, [onRegisterScanHandler]);

  const laserY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 110],
  });

  const stopDecoding = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    decodingFrameRef.current = false;
  };

  const startDecoding = () => {
    stopDecoding();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    scanTimerRef.current = setInterval(async () => {
      if (decodingFrameRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      decodingFrameRef.current = true;
      try {
        const code = await decodeVideoFrame(video, canvas, ctx);
        if (code) {
          const clean = String(code).trim();
          const now = Date.now();
          const isSame = lastCameraCodeRef.current.code === clean;
          const cooldown = isSame ? 2500 : 800;
          if (now - lastCameraCodeRef.current.time >= cooldown) {
            lastCameraCodeRef.current = { code: clean, time: now };
            // Continuous scanning: keep camera active and onboard next item!
            handleLoadBarcode(clean);
          }
        }
      } catch (_) {
        // continue
      } finally {
        decodingFrameRef.current = false;
      }
    }, 110);
  };

  const startCamera = async () => {
    stopCamera();
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
      streamRef.current = stream;

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
      startDecoding();
    } catch (_) {
      setCameraOpen(false);
      setSavedNotice('Camera permission denied or camera not available.');
    }
  };

  const stopCamera = () => {
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

  const EMPTY_FORM = {
    id: null,
    barcode: '',
    name: '',
    sellingPrice: '',
    costPrice: '',
    category: CATEGORIES[0],
    stock: '',
    gstRate: '12',
  };

  const [form, setForm] = useState(EMPTY_FORM);

  const handleClearForm = () => {
    setForm(EMPTY_FORM);
    setSavedNotice('');
    setScanInput('');
  };

  const handleLoadBarcode = (rawCode) => {
    const clean = String(rawCode || '').trim();
    if (!clean) return;

    soundEngine.playScanSuccess();
    Vibration.vibrate(12);

    cardAnim.setValue(0.96);
    Animated.spring(cardAnim, {
      toValue: 1,
      duration: 260,
    }).start();

    const existing = products.find((p) => p.barcode === clean);
    if (existing) {
      setForm({
        id: existing.id,
        barcode: existing.barcode,
        name: existing.name,
        sellingPrice: String(existing.sellingPrice),
        costPrice: String(existing.costPrice),
        category: existing.category,
        stock: String(existing.stock),
        gstRate: String(existing.gstRate ?? 12),
      });
      setSavedNotice(`Loaded existing catalog item "${existing.name}" for editing`);
    } else {
      setForm({
        id: null,
        barcode: clean,
        name: '',
        sellingPrice: '',
        costPrice: '',
        category: CATEGORIES[0],
        stock: '',
        gstRate: '12',
      });
      setSavedNotice(`Barcode ${clean} scanned. Please enter product details.`);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
    }
  };

  const handleScanBarcodeSubmit = (rawCode) => {
    const clean = String(rawCode || scanInput || '').trim();
    if (!clean) return;
    handleLoadBarcode(clean);
    setScanInput('');
  };

  const handleSaveToCatalog = () => {
    const clean = form.barcode.trim();
    if (!clean) {
      setSavedNotice('Please scan or enter a barcode first.');
      return;
    }
    const cleanName = form.name.trim();
    if (!cleanName) {
      setSavedNotice('Please enter a product name.');
      return;
    }
    const selling = parseFloat(form.sellingPrice) || 0;
    const cost =
      parseFloat(form.costPrice) || Number((selling * 0.82).toFixed(2));
    const stock =
      form.stock !== '' && !isNaN(parseInt(form.stock, 10))
        ? Math.max(0, parseInt(form.stock, 10))
        : 0;

    const saved = onSaveProduct({
      id: form.id,
      barcode: clean,
      name: cleanName,
      sellingPrice: selling,
      costPrice: cost,
      category: form.category || CATEGORIES[0],
      stock,
      gstRate: Number(form.gstRate) || 12,
    });

    soundEngine.playCheckoutSuccess();
    Vibration.vibrate(25);
    setSearch('');
    setFilter('ALL');
    setLastSavedCode(saved.barcode);
    setSavedNotice(`Saved "${saved.name}" (₹${saved.sellingPrice}) to Catalog!`);
    setForm(EMPTY_FORM);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchStock =
        filter === 'ALL' ||
        (filter === 'LOW' && p.stock > 0 && p.stock < 10) ||
        (filter === 'OUT' && p.stock === 0);
      return matchQ && matchStock;
    });
  }, [products, search, filter]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <Text style={styles.pageTitle}>Inventory Catalog</Text>
          <Text style={styles.pageSub} numberOfLines={1}>
            Scan barcode to onboard product or manage shelf stock
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newCodeBtn}
          onPress={() =>
            handleLoadBarcode(
              `890${Math.floor(1000000000 + Math.random() * 8999999999)}`
            )
          }
        >
          <RefreshCw size={13} color="#18181B" />
          <Text style={styles.newCodeText}>New GTIN</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Scan & Onboard Product Card (Styled with the Editable Title Box + 3 Attribute Cards from Reference UI) */}
      <Animated.View
        style={[
          styles.onboardCard,
          { transform: [{ scale: cardAnim }] },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionLabel}>
            SCAN & ONBOARD PRODUCT TO CATALOG
          </Text>
          {(form.barcode !== '' || form.name !== '') && (
            <TouchableOpacity
              style={styles.clearCardBtn}
              onPress={handleClearForm}
            >
              <Trash2 size={12} color="#71717A" />
              <Text style={styles.clearCardBtnText}>Clear Form</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dedicated Scan Bar to Scan Barcode & Add Product to Store */}
        <View style={styles.scanBarContainer}>
          <View style={styles.scanBarIconWrap}>
            <Barcode size={17} color="#18181B" strokeWidth={2.4} />
          </View>
          <TextInput
            value={scanInput}
            onChangeText={setScanInput}
            onSubmitEditing={() => handleScanBarcodeSubmit(scanInput)}
            placeholder="Scan barcode with camera/scanner or enter GTIN..."
            style={styles.scanBarInput}
            keyboardType="default"
          />
          {scanInput.length > 0 && (
            <TouchableOpacity
              style={styles.scanBarClearBtn}
              onPress={() => setScanInput('')}
            >
              <X size={14} color="#71717A" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.scanBarCamBtn,
              cameraOpen && styles.scanBarCamBtnActive,
            ]}
            onPress={() => (cameraOpen ? stopCamera() : startCamera())}
          >
            {cameraOpen ? (
              <CameraOff size={15} color="#E05252" />
            ) : (
              <Camera size={15} color="#18181B" />
            )}
            <Text
              style={[
                styles.scanBarCamText,
                cameraOpen && { color: '#E05252' },
              ]}
            >
              {cameraOpen ? 'Stop' : 'Camera'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanBarActionBtn}
            onPress={() => handleScanBarcodeSubmit(scanInput)}
          >
            <Text style={styles.scanBarActionText}>Fetch</Text>
          </TouchableOpacity>
        </View>

        {/* Live Camera Viewfinder for Barcode Scanning */}
        <View style={[styles.viewfinderBox, !cameraOpen && { display: 'none' }]}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Animated Laser Scan Line */}
          <Animated.View
            style={[
              styles.laserLine,
              { transform: [{ translateY: laserY }] },
            ]}
          />
          <View style={styles.viewfinderHintPill}>
            <Text style={styles.viewfinderHintText}>
              Align barcode inside the green laser line
            </Text>
          </View>
        </View>

        {savedNotice !== '' && (
          <View style={styles.noticePill}>
            <Text style={styles.noticeText}>{savedNotice}</Text>
          </View>
        )}

        {/* Editable Product Name & Barcode Box with Pencil Icon */}
        <View style={styles.titleEditBox}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.gtinLabel}>GTIN:</Text>
              <TextInput
                value={form.barcode}
                onChangeText={(v) => setForm({ ...form, barcode: v })}
                onSubmitEditing={() => handleLoadBarcode(form.barcode)}
                placeholder="Scan or enter barcode digits..."
                placeholderTextColor="#A1A1AA"
                style={styles.gtinInput}
              />
            </View>
            <TextInput
              ref={nameInputRef}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="Product Name (e.g. Parle-G 250g)..."
              placeholderTextColor="#A1A1AA"
              style={styles.nameInput}
            />
          </View>
          <TouchableOpacity
            onPress={() => nameInputRef.current?.focus()}
            style={styles.pencilBtn}
          >
            <Pencil size={16} color="#71717A" />
          </TouchableOpacity>
        </View>

        {/* 4-Column Metric Inputs (Selling MRP, Cost, Stock, GST %) */}
        <View style={styles.attrRow}>
          <View style={styles.attrBox}>
            <View style={styles.attrTop}>
              <Tag size={12} color="#2E9E5B" />
              <Text style={styles.attrLabel}>MRP (₹)</Text>
            </View>
            <TextInput
              keyboardType="decimal-pad"
              value={form.sellingPrice}
              onChangeText={(v) => setForm({ ...form, sellingPrice: v })}
              placeholder="0.00"
              placeholderTextColor="#A1A1AA"
              style={styles.attrValInput}
            />
          </View>

          <View style={styles.attrBox}>
            <View style={styles.attrTop}>
              <Tag size={12} color="#DD6B6B" />
              <Text style={styles.attrLabel}>Cost (₹)</Text>
            </View>
            <TextInput
              keyboardType="decimal-pad"
              value={form.costPrice}
              onChangeText={(v) => setForm({ ...form, costPrice: v })}
              placeholder="0.00"
              placeholderTextColor="#A1A1AA"
              style={styles.attrValInput}
            />
          </View>

          <View style={styles.attrBox}>
            <View style={styles.attrTop}>
              <Package size={12} color="#DF9A57" />
              <Text style={styles.attrLabel}>Stock</Text>
            </View>
            <TextInput
              keyboardType="numeric"
              value={form.stock}
              onChangeText={(v) => setForm({ ...form, stock: v })}
              placeholder="0"
              placeholderTextColor="#A1A1AA"
              style={styles.attrValInput}
            />
          </View>

          <View style={styles.attrBox}>
            <View style={styles.attrTop}>
              <Percent size={12} color="#6898E8" />
              <Text style={styles.attrLabel}>GST %</Text>
            </View>
            <TextInput
              keyboardType="numeric"
              value={form.gstRate}
              onChangeText={(v) => setForm({ ...form, gstRate: v })}
              placeholder="12"
              placeholderTextColor="#A1A1AA"
              style={styles.attrValInput}
            />
          </View>
        </View>

        {/* Full-Width Charcoal Pill CTA Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSaveToCatalog}
          style={styles.savePillBtn}
        >
          <Text style={styles.savePillBtnText}>Save Product to Catalog</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 3. Search & Segmented Stock Filter */}
      <View style={styles.searchCard}>
        <Search size={15} color="#71717A" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search catalog by product name or GTIN..."
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            style={styles.searchClearBtn}
          >
            <X size={14} color="#71717A" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.segmentedTrack}>
        {[
          { id: 'ALL', label: `All (${products.length})` },
          {
            id: 'LOW',
            label: `Low Stock (${products.filter((p) => p.stock > 0 && p.stock < 10).length})`,
          },
          {
            id: 'OUT',
            label: `Out (${products.filter((p) => p.stock === 0).length})`,
          },
        ].map((tab) => {
          const active = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                Vibration.vibrate(8);
                setFilter(tab.id);
              }}
              style={[
                styles.segmentBtn,
                active && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. Product Cards with Stock Circular Rings */}
      <View style={styles.list}>
        {filtered.map((prod) => {
          const isSaved = prod.barcode === lastSavedCode;
          const ringColor =
            prod.stock === 0
              ? '#E05252'
              : prod.stock < 10
                ? '#DF9A57'
                : '#2E9E5B';
          const stockProgress = Math.min(1, prod.stock / 50);

          return (
            <View
              key={prod.id}
              style={[
                styles.itemCard,
                isSaved && styles.itemCardSaved,
              ]}
            >
              <View style={styles.topRow}>
                <CircularRing
                  size={44}
                  strokeWidth={4}
                  progress={stockProgress}
                  color={ringColor}
                  trackColor="#F1F2F6"
                >
                  <Text style={styles.ringStockNum}>{prod.stock}</Text>
                </CircularRing>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {prod.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    GTIN: {prod.barcode} • {prod.category}
                  </Text>
                </View>

                <Text style={styles.itemPrice}>₹{prod.sellingPrice}</Text>
              </View>

              {/* Stats Badges: Stock, Cost, GST */}
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statBadge,
                    { backgroundColor: ringColor + '18' },
                  ]}
                >
                  <View
                    style={[styles.dot, { backgroundColor: ringColor }]}
                  />
                  <Text style={[styles.statBadgeText, { color: ringColor }]}>
                    {prod.stock === 0
                      ? 'Out of stock'
                      : prod.stock < 10
                        ? `Low stock (${prod.stock})`
                        : `${prod.stock} in stock`}
                  </Text>
                </View>

                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeMuted}>Cost ₹{prod.costPrice}</Text>
                </View>

                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeMuted}>GST {prod.gstRate}%</Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.bottomRow}>
                <TouchableOpacity
                  style={styles.billBtn}
                  onPress={() => onAddToBill(prod.barcode)}
                  activeOpacity={0.8}
                >
                  <ShoppingCart size={13} color="#FFFFFF" />
                  <Text style={styles.billBtnText}>+ Bill to Cart</Text>
                </TouchableOpacity>

                <View style={styles.actionGroup}>
                  <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() => onOpenSticker(prod)}
                    title="Print Barcode Sticker"
                  >
                    <Barcode size={14} color="#18181B" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() => handleLoadBarcode(prod.barcode)}
                    title="Edit Product"
                  >
                    <Edit3 size={14} color="#52525B" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconCircle, styles.deleteCircle]}
                    onPress={() => onDeleteProduct(prod.id)}
                    title="Delete Product"
                  >
                    <Trash2 size={14} color="#E05252" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 130,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    color: '#18181B',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSub: {
    color: '#71717A',
    fontSize: 11.5,
    marginTop: 1,
  },
  newCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  newCodeText: {
    color: '#18181B',
    fontSize: 11.5,
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  onboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 11,
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.04)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSectionLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  clearCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearCardBtnText: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '600',
  },
  scanBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F4F7',
    borderWidth: 1,
    borderColor: '#EBEBEF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  scanBarIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBarInput: {
    flex: 1,
    color: '#18181B',
    fontSize: 12.5,
    backgroundColor: 'transparent',
    outline: 'none',
  },
  scanBarClearBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBarActionBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  scanBarActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scanBarCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  scanBarCamBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  scanBarCamText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#18181B',
  },
  viewfinderBox: {
    height: 125,
    borderRadius: 16,
    backgroundColor: '#090A0F',
    borderWidth: 1,
    borderColor: '#EBEBEF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 2,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#2E9E5B',
    boxShadow: '0 0 10px 1.5px #2E9E5B',
    zIndex: 5,
    pointerEvents: 'none',
  },
  viewfinderHintPill: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 6,
  },
  viewfinderHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  searchClearBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noticePill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  noticeText: {
    color: '#065F46',
    fontSize: 11.5,
    fontWeight: '700',
  },
  titleEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gtinLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
  },
  gtinInput: {
    color: '#2E9E5B',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  nameInput: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  pencilBtn: {
    padding: 4,
  },
  attrRow: {
    flexDirection: 'row',
    gap: 7,
  },
  attrBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  attrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attrLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '600',
  },
  attrValInput: {
    color: '#18181B',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
    backgroundColor: 'transparent',
  },
  savePillBtn: {
    backgroundColor: '#18181B',
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
  },
  searchInput: {
    flex: 1,
    color: '#18181B',
    fontSize: 13,
    backgroundColor: 'transparent',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#ECECEF',
    borderRadius: 999,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  segmentText: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#18181B',
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    gap: 10,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.035)',
  },
  itemCardSaved: {
    borderWidth: 1.5,
    borderColor: '#2E9E5B',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ringStockNum: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '800',
  },
  itemName: {
    color: '#18181B',
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statBadgeMuted: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F6',
    gap: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    height: 32,
    borderRadius: 999,
  },
  billBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCircle: {
    backgroundColor: '#FEE2E2',
  },
});
