import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Banknote,
  CheckCircle2,
  Receipt,
  Percent,
} from 'lucide-react';
import NativeScannerCard from '../components/NativeBarcodeCard';

export default function PosScannerScreen({
  products,
  cart,
  onScanBarcode,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  discountEnabled,
  onToggleDiscount,
  totals,
  onOpenCheckout,
  lastScannedItem,
}) {
  const [searchInput, setSearchInput] = useState('');
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Animate the scanned product detail pill whenever a barcode is scanned
  useEffect(() => {
    if (lastScannedItem) {
      bannerAnim.setValue(0.88);
      Animated.spring(bannerAnim, {
        toValue: 1,
        duration: 280,
      }).start();
    }
  }, [lastScannedItem]);

  const quickChips = products.map((p) => ({
    barcode: p.barcode,
    label: p.name.split(' ').slice(0, 2).join(' '),
    price: p.sellingPrice,
  }));

  const currentBannerProduct =
    lastScannedItem?.product ||
    (cart.length > 0
      ? products.find((p) => p.barcode === cart[0].barcode)
      : products[0]);

  const handleManualSubmit = () => {
    const clean = searchInput.trim();
    if (!clean) return;
    const byName = products.find(
      (p) =>
        p.barcode === clean ||
        p.name.toLowerCase().includes(clean.toLowerCase())
    );
    onScanBarcode(byName ? byName.barcode : clean, 'MANUAL');
    setSearchInput('');
  };

  const matchingSuggestions = searchInput.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
            p.barcode.includes(searchInput.trim())
        )
        .slice(0, 4)
    : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Compact Scanner Card with Animated Laser & Quick Product Chips */}
        <NativeScannerCard
          title="POS Barcode Scanner"
          activeCode={currentBannerProduct?.barcode || '8901058851458'}
          activeLabel={
            currentBannerProduct
              ? `${currentBannerProduct.name} • ₹${currentBannerProduct.sellingPrice}`
              : 'Tap to scan barcode'
          }
          chips={quickChips}
          onScan={onScanBarcode}
        />

        {/* 2. Quick Search / Manual Barcode Bar */}
        <View style={styles.searchBox}>
          <View style={styles.searchRow}>
            <Search size={15} color="#64748B" />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleManualSubmit}
              placeholder="Search item or enter barcode..."
              style={styles.searchInput}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                style={styles.addSearchBtn}
                onPress={handleManualSubmit}
              >
                <Text style={styles.addSearchBtnText}>+ Bill</Text>
              </TouchableOpacity>
            )}
          </View>

          {matchingSuggestions.length > 0 && (
            <View style={styles.suggestionDropdown}>
              {matchingSuggestions.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.suggestionRow}
                  onPress={() => {
                    onScanBarcode(prod.barcode, 'SEARCH');
                    setSearchInput('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.suggestionCode}>{prod.barcode}</Text>
                  </View>
                  <Text style={styles.suggestionPrice}>
                    ₹{prod.sellingPrice}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 3. Pre-Loaded Scanned Product Details Banner (Animated) */}
        {currentBannerProduct && (
          <Animated.View
            style={[
              styles.scannedProductBanner,
              { transform: [{ scale: bannerAnim }] },
            ]}
          >
            <View style={styles.bannerLeft}>
              <View style={styles.bannerBadgeRow}>
                <CheckCircle2 size={13} color="#10B981" />
                <Text style={styles.bannerTag}>PRE-LOADED CATALOG ITEM</Text>
              </View>
              <Text style={styles.bannerProdName} numberOfLines={1}>
                {currentBannerProduct.name}
              </Text>
              <Text style={styles.bannerMeta}>
                GTIN: {currentBannerProduct.barcode} • GST{' '}
                {currentBannerProduct.gstRate}% • Stock:{' '}
                {currentBannerProduct.stock}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bannerAddBtn}
              onPress={() =>
                onScanBarcode(currentBannerProduct.barcode, 'BANNER_ADD')
              }
            >
              <Text style={styles.bannerPriceText}>
                ₹{Number(currentBannerProduct.sellingPrice).toFixed(0)}
              </Text>
              <View style={styles.bannerPlusPill}>
                <Plus size={12} color="#090A0F" />
                <Text style={styles.bannerPlusText}>Add</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 4. Clean Customer Tax Bill Section */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billHeaderLeft}>
              <Receipt size={15} color="#10B981" />
              <Text style={styles.billTitle}>
                Customer Bill ({cart.reduce((s, i) => s + i.qty, 0)} items)
              </Text>
            </View>
            {cart.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={onClearCart}
              >
                <Trash2 size={13} color="#FDA4AF" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyBill}>
              <Text style={styles.emptyBillTitle}>Bill is empty</Text>
              <Text style={styles.emptyBillSub}>
                Tap any product chip above to scan & generate the customer bill.
              </Text>
            </View>
          ) : (
            <View style={styles.billList}>
              {cart.map((item) => (
                <View key={item.barcode} style={styles.billItemRow}>
                  <View style={styles.billItemInfo}>
                    <Text style={styles.billItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.billItemSub}>
                      ₹{item.sellingPrice.toFixed(2)} × {item.qty} • GST{' '}
                      {item.gstRate}%
                    </Text>
                  </View>

                  {/* Stepper Controls */}
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => onUpdateQty(item.barcode, item.qty - 1)}
                    >
                      <Minus size={13} color="#CBD5E1" />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{item.qty}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, styles.stepBtnPlus]}
                      onPress={() => onUpdateQty(item.barcode, item.qty + 1)}
                    >
                      <Plus size={13} color="#6EE7B7" />
                    </TouchableOpacity>
                  </View>

                  {/* Line Total */}
                  <View style={styles.billLineRight}>
                    <Text style={styles.billLineTotal}>
                      ₹{(item.qty * item.sellingPrice).toFixed(0)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onRemoveItem(item.barcode)}
                      style={styles.removeIconBtn}
                    >
                      <Trash2 size={13} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 5. Sticky Bottom Checkout Dock */}
      <View style={styles.checkoutDock}>
        <View style={styles.dockTopRow}>
          <TouchableOpacity
            style={[
              styles.discountPill,
              discountEnabled && styles.discountPillActive,
            ]}
            onPress={() => onToggleDiscount(!discountEnabled)}
          >
            <Percent
              size={12}
              color={discountEnabled ? '#090A0F' : '#34D399'}
            />
            <Text
              style={[
                styles.discountPillText,
                discountEnabled && { color: '#090A0F', fontWeight: '800' },
              ]}
            >
              {discountEnabled ? '10% Discount On' : 'Add 10% Discount'}
            </Text>
          </TouchableOpacity>

          <View style={styles.totalBlock}>
            <Text style={styles.totalMetaText}>
              GST ₹{totals.gstAmount.toFixed(1)} incl.
            </Text>
            <Text style={styles.grandTotalValue}>
              ₹{totals.grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.payButtonsRow}>
          <TouchableOpacity
            disabled={cart.length === 0}
            style={styles.cashPayBtn}
            onPress={() => onOpenCheckout('CASH')}
          >
            <Banknote size={16} color="#34D399" />
            <Text style={styles.cashPayText}>Cash Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={cart.length === 0}
            style={styles.upiPayBtn}
            onPress={() => onOpenCheckout('UPI')}
          >
            <QrCode size={16} color="#090A0F" />
            <Text style={styles.upiPayText}>UPI QR Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  searchBox: {
    backgroundColor: '#111420',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    backgroundColor: 'transparent',
  },
  addSearchBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionDropdown: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 6,
    gap: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  suggestionName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionCode: {
    color: '#64748B',
    fontSize: 10,
  },
  suggestionPrice: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  scannedProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bannerTag: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bannerProdName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  bannerMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  bannerAddBtn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bannerPriceText: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '800',
  },
  bannerPlusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerPlusText: {
    color: '#090A0F',
    fontSize: 11,
    fontWeight: '800',
  },
  billCard: {
    backgroundColor: '#111420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  billHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(244,63,94,0.12)',
  },
  clearBtnText: {
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBill: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyBillTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBillSub: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  billList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  billItemInfo: {
    flex: 1,
  },
  billItemName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  billItemSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#090A0F',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  stepQty: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
  billLineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 58,
    justifyContent: 'flex-end',
  },
  billLineTotal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  removeIconBtn: {
    padding: 4,
  },
  checkoutDock: {
    backgroundColor: '#111420',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  dockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  discountPillActive: {
    backgroundColor: '#10B981',
  },
  discountPillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  totalBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalMetaText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  grandTotalValue: {
    color: '#34D399',
    fontSize: 20,
    fontWeight: '800',
  },
  payButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cashPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cashPayText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  upiPayBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: '#10B981',
  },
  upiPayText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '800',
  },
});
