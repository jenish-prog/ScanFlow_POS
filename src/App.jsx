import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { storageService } from './services/storageService';
import { soundEngine } from './utils/sound';
import LiquidGlassNav from './components/LiquidGlassNav';
import HomePosScreen from './screens/HomePosScreen';
import ProgressAnalyticsScreen from './screens/ProgressAnalyticsScreen';
import CatalogListScreen from './screens/CatalogListScreen';
import {
  BarcodeStickerModal,
  InlineCheckoutPanel,
} from './components/MobileModals';

export default function App() {
  // 3 POS Tabs in the Apple Liquid Glass Menu Bar: 'POS' | 'CATALOG' | 'ANALYTICS'
  const [activeTab, setActiveTab] = useState('POS');
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [products, setProducts] = useState(() => storageService.getProducts());
  const [transactions, setTransactions] = useState(() =>
    storageService.getTransactions()
  );

  // A POS bill starts empty; every line must come from a real catalog product.
  const [cart, setCart] = useState([]);

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [stickerProduct, setStickerProduct] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);
  const noticeTimer = useRef(null);
  const catalogScanRef = useRef(null);

  // Mirror live state in refs so rapid successive scans never read a stale cart.
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const productsRef = useRef(products);
  productsRef.current = products;

  const showScanNotice = (type, message) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setScanNotice({ type, message, time: Date.now() });
    noticeTimer.current = setTimeout(() => setScanNotice(null), 3400);
  };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const registerCatalogScanHandler = useCallback((handler) => {
    catalogScanRef.current = handler;
  }, []);

  // Smooth spring transition when switching menus in the Apple Liquid Glass bar
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

  const handleSelectTab = (nextTab) => {
    if (nextTab === activeTab) return;
    screenOpacity.setValue(0.35);
    screenTranslateY.setValue(10);
    setActiveTab(nextTab);

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(screenTranslateY, {
        toValue: 0,
        duration: 300,
      }),
    ]).start();
  };

  // Global USB / Bluetooth barcode scanner listener
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (stickerProduct) return;
      const now = Date.now();
      if (now - lastTime > 120) buffer = '';
      lastTime = now;
      if (e.key === 'Enter' && buffer.length >= 6) {
        e.preventDefault();
        // On the Catalog tab a hardware scan should fill the onboarding form,
        // not create a POS bill line.
        if (activeTab === 'CATALOG' && catalogScanRef.current) {
          catalogScanRef.current(buffer);
        } else {
          handleScanBarcode(buffer, 'SCANNER');
        }
        buffer = '';
      } else if (/^[0-9A-Za-z-]$/.test(e.key)) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const commitCart = (nextCart) => {
    cartRef.current = nextCart;
    setCart(nextCart);
  };

  /**
   * Scan Barcode -> Fetches pre-loaded product details & updates Customer Bill.
   * Only catalogued products (or known GTINs) can be billed, and stock is enforced.
   */
  const handleScanBarcode = (rawCode, source = 'SCAN') => {
    const clean = String(rawCode || '').trim();
    if (!clean) return;

    const cartNow = cartRef.current;
    const cartLine = cartNow.find((i) => i.barcode === clean);
    let prod = productsRef.current.find((p) => p.barcode === clean);

    if (!prod) {
      if (cartLine) {
        commitCart(
          cartNow.map((i) =>
            i.barcode === clean ? { ...i, qty: i.qty + 1 } : i
          )
        );
        soundEngine.playScanSuccess();
        Vibration.vibrate(15);
        showScanNotice('success', `${cartLine.name} +1`);
        return;
      }

      soundEngine.playUnknownAlert();
      Vibration.vibrate([15, 45, 15]);
      showScanNotice(
        'error',
        `Barcode ${clean} is not in the catalog. Add it from the Catalog tab (price & stock), then scan again.`
      );
      return;
    }

    const stock = Math.max(0, Number(prod.stock) || 0);
    const qtyInCart = cartLine ? cartLine.qty : 0;

    if (stock <= 0) {
      soundEngine.playUnknownAlert();
      Vibration.vibrate([15, 45, 15]);
      showScanNotice('error', `${prod.name} is out of stock.`);
      setLastScannedItem({
        barcode: clean,
        product: prod,
        source,
        time: Date.now(),
      });
      return;
    }

    if (qtyInCart >= stock) {
      soundEngine.playUnknownAlert();
      Vibration.vibrate([15, 45, 15]);
      showScanNotice(
        'error',
        `Only ${stock} unit${stock === 1 ? '' : 's'} of ${prod.name} in stock.`
      );
      return;
    }

    soundEngine.playScanSuccess();
    Vibration.vibrate(15);

    setLastScannedItem({
      barcode: clean,
      product: prod,
      source,
      time: Date.now(),
    });

    if (cartLine) {
      commitCart(
        cartNow.map((i) =>
          i.barcode === clean ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      commitCart([
        {
          barcode: prod.barcode,
          name: prod.name,
          sellingPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          gstRate: prod.gstRate ?? 12,
          qty: 1,
        },
        ...cartNow,
      ]);
    }

    showScanNotice(
      'success',
      `${prod.name} • ₹${Number(prod.sellingPrice).toFixed(2)} • ${stock} in stock`
    );
  };

  const handleUpdateQty = (barcode, nextQty) => {
    Vibration.vibrate(8);
    const cartNow = cartRef.current;

    if (nextQty <= 0) {
      commitCart(cartNow.filter((i) => i.barcode !== barcode));
      return;
    }

    const prod = productsRef.current.find((p) => p.barcode === barcode);
    if (prod) {
      const stock = Math.max(0, Number(prod.stock) || 0);
      if (nextQty > stock) {
        soundEngine.playUnknownAlert();
        showScanNotice(
          'error',
          `Only ${stock} unit${stock === 1 ? '' : 's'} of ${prod.name} in stock.`
        );
        return;
      }
    }

    commitCart(
      cartNow.map((i) => (i.barcode === barcode ? { ...i, qty: nextQty } : i))
    );
  };

  const handleRemoveItem = (barcode) => {
    commitCart(cartRef.current.filter((i) => i.barcode !== barcode));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.qty, 0);
    const discountPercent = discountEnabled ? 10 : 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    const gstAmount = cart.reduce((s, i) => {
      const net = i.sellingPrice * i.qty * (1 - discountPercent / 100);
      const rate = i.gstRate ?? 12;
      return s + (net - net / (1 + rate / 100));
    }, 0);

    const totalProfit = cart.reduce((s, i) => {
      const netUnit = i.sellingPrice * (1 - discountPercent / 100);
      return s + (netUnit - (i.costPrice || 0)) * i.qty;
    }, 0);

    return {
      subtotal,
      discountPercent,
      discountAmount,
      gstAmount,
      grandTotal,
      totalProfit,
    };
  }, [cart, discountEnabled]);

  const handleConfirmPayment = (paymentDetails) => {
    if (cart.length === 0) {
      showScanNotice('error', 'Add at least one item before creating a bill.');
      return null;
    }

    const shortage = cart.find((item) => {
      const product = products.find((p) => p.barcode === item.barcode);
      return product && item.qty > Math.max(0, Number(product.stock) || 0);
    });

    if (shortage) {
      const product = products.find((p) => p.barcode === shortage.barcode);
      soundEngine.playUnknownAlert();
      showScanNotice(
        'error',
        `Cannot bill ${shortage.name}: only ${Number(
          product?.stock || 0
        )} left in stock.`
      );
      return null;
    }

    const res = storageService.recordTransaction({
      ...paymentDetails,
      subtotal: totals.subtotal,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      gstAmount: totals.gstAmount,
      totalAmount: totals.grandTotal,
      totalProfit: totals.totalProfit,
      items: cart,
    });

    soundEngine.playCheckoutSuccess();
    Vibration.vibrate([20, 40, 20]);
    productsRef.current = res.products;
    setProducts(res.products);
    setTransactions(res.transactions);
    commitCart([]);
    setDiscountEnabled(false);
    return res.transaction;
  };

  const handleSaveCatalogProduct = (prodData) => {
    const saved = storageService.upsertProduct(prodData);
    productsRef.current = storageService.getProducts();
    setProducts(productsRef.current);
    commitCart(
      cartRef.current.map((item) =>
        item.barcode === saved.barcode
          ? {
              ...item,
              name: saved.name,
              sellingPrice: saved.sellingPrice,
              costPrice: saved.costPrice,
              gstRate: saved.gstRate,
            }
          : item
      )
    );
    return saved;
  };

  const handleDeleteCatalogProduct = (id) => {
    productsRef.current = storageService.deleteProduct(id);
    setProducts(productsRef.current);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const lowStockCount = products.filter((p) => p.stock < 10).length;

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F8" />

      {/* Soft Warm Alabaster Ambient Gradient Background */}
      <View style={styles.ambientTopRight} />
      <View style={styles.ambientTopLeft} />

      {/* Animated Main Screen Viewport */}
      <Animated.View
        style={[
          styles.screenContainer,
          {
            opacity: screenOpacity,
            transform: [{ translateY: screenTranslateY }],
          },
        ]}
      >
          {activeTab === 'POS' && (
            <HomePosScreen
              products={products}
              cart={cart}
              totals={totals}
              discountEnabled={discountEnabled}
              onToggleDiscount={setDiscountEnabled}
              muted={muted}
              onToggleMute={handleToggleMute}
              onScanBarcode={handleScanBarcode}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
              onClearCart={() => commitCart([])}
              onConfirmPayment={handleConfirmPayment}
              lastScannedItem={lastScannedItem}
              scanNotice={scanNotice}
              onScanNotice={showScanNotice}
              onShowBill={() => {}}
            />
          )}

          {activeTab === 'CATALOG' && (
            <CatalogListScreen
              products={products}
              onSaveProduct={handleSaveCatalogProduct}
              onAddToBill={(barcode) => {
                handleScanBarcode(barcode, 'CATALOG');
                handleSelectTab('POS');
              }}
              onDeleteProduct={handleDeleteCatalogProduct}
              onOpenSticker={(prod) => setStickerProduct(prod)}
              onRegisterScanHandler={registerCatalogScanHandler}
            />
          )}

          {activeTab === 'ANALYTICS' && (
            <ProgressAnalyticsScreen
              products={products}
              transactions={transactions}
            />
          )}
        </Animated.View>

        {/* Floating Apple Liquid Glass Bottom Menu Bar with Integrated Quick Checkout */}
        <LiquidGlassNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          cartCount={cartCount}
          cartTotal={totals.grandTotal}
          lowStockCount={lowStockCount}
          onOpenCashBill={() => setCheckoutMode('CASH')}
          onOpenUpiBill={() => setCheckoutMode('UPI')}
        />

        {/* Barcode Sticker Modal */}
        <BarcodeStickerModal
          product={stickerProduct}
          onClose={() => setStickerProduct(null)}
          onAddToBill={(barcode) => {
            handleScanBarcode(barcode, 'STICKER');
            handleSelectTab('POS');
          }}
        />

        {/* Payment & Receipt Bottom Sheet Modal */}
        {checkoutMode && (
          <View style={styles.checkoutOverlay}>
            <TouchableOpacity
              style={styles.checkoutBackdrop}
              activeOpacity={1}
              onPress={() => setCheckoutMode(null)}
            />
            <View style={styles.checkoutSheetWrap}>
              <ScrollView
                style={{ maxHeight: '85vh' }}
                showsVerticalScrollIndicator={false}
              >
                <InlineCheckoutPanel
                  key={checkoutMode}
                  initialMode={checkoutMode}
                  cart={cart}
                  totals={totals}
                  onClose={() => setCheckoutMode(null)}
                  onConfirmPayment={handleConfirmPayment}
                  onCompleted={() => {
                    commitCart([]);
                  }}
                />
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    height: '100%',
    backgroundColor: '#F5F5F8',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 'var(--safe-top, 48px)',
  },
  ambientTopRight: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(253, 224, 205, 0.45)',
    filter: 'blur(45px)',
    pointerEvents: 'none',
  },
  ambientTopLeft: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(232, 236, 255, 0.55)',
    filter: 'blur(50px)',
    pointerEvents: 'none',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    height: '100%',
    overflow: 'hidden',
    zIndex: 5,
  },
  checkoutOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  checkoutBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  checkoutSheetWrap: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
    maxHeight: '90%',
    position: 'relative',
    zIndex: 10000,
  },
});
