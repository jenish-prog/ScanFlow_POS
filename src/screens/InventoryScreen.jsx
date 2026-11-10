import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import {
  Search,
  Plus,
  Barcode,
  Trash2,
  Edit3,
  ShoppingCart,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES, storageService } from '../services/storageService';
import { soundEngine } from '../utils/sound';
import NativeScannerCard from '../components/NativeBarcodeCard';

const ONBOARD_SAMPLE_CHIPS = [
  { barcode: '8902860475466', label: 'Parle-G 250g', price: 35 },
  { barcode: '8909999123456', label: 'Haldiram Bhujia', price: 55 },
  { barcode: '8908888654321', label: 'Nescafé Classic', price: 175 },
  { barcode: '8907777112233', label: 'Dettol 250ml', price: 142 },
  { barcode: '8901526101214', label: 'Dabur Honey', price: 135 },
];

export default function InventoryScreen({
  products,
  onSaveProduct,
  onDeleteProduct,
  onAddToBill,
  onOpenSticker,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL | LOW | OUT
  const [savedToast, setSavedToast] = useState('');
  const [lastSavedBarcode, setLastSavedBarcode] = useState('');

  const formPulse = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState(() => {
    const t = storageService.lookupBarcodeTemplate('8902860475466');
    return {
      id: null,
      barcode: '8902860475466',
      name: t.name,
      sellingPrice: String(t.sellingPrice),
      costPrice: String(t.costPrice),
      category: t.category,
      stock: String(t.stock || 40),
      gstRate: String(t.gstRate || 18),
    };
  });

  const animateFormHighlight = () => {
    formPulse.setValue(0.96);
    Animated.spring(formPulse, {
      toValue: 1,
      duration: 280,
    }).start();
  };

  /**
   * Scan or load any barcode into the Catalog Onboarding form
   */
  const handleScanIntoForm = (rawCode) => {
    const clean = String(rawCode || '').trim();
    if (!clean) return;

    soundEngine.playScanSuccess();
    Vibration.vibrate(15);
    animateFormHighlight();

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
      setSavedToast(`Loaded "${existing.name}" for editing`);
    } else {
      const t = storageService.lookupBarcodeTemplate(clean);
      setForm({
        id: null,
        barcode: clean,
        name: t.name,
        sellingPrice: String(t.sellingPrice),
        costPrice: String(t.costPrice),
        category: t.category,
        stock: String(t.stock || 30),
        gstRate: String(t.gstRate || 12),
      });
      setSavedToast(`Scanned ${clean} • Auto-filled "${t.name}"`);
    }
  };

  const handleBarcodeTextChange = (val) => {
    setForm((prev) => ({ ...prev, barcode: val }));
    const clean = val.trim();
    if (clean.length >= 8) {
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
      } else {
        const t = storageService.lookupBarcodeTemplate(clean);
        setForm((prev) => ({
          ...prev,
          id: null,
          barcode: clean,
          name: t.name,
          sellingPrice: String(t.sellingPrice),
          costPrice: String(t.costPrice),
          category: t.category,
        }));
      }
    }
  };

  const handleSave = () => {
    const cleanBarcode = form.barcode.trim();
    if (!cleanBarcode) return;
    const t = storageService.lookupBarcodeTemplate(cleanBarcode);
    const finalName = form.name.trim() || t.name;
    const selling = parseFloat(form.sellingPrice) || t.sellingPrice || 25;
    const cost =
      parseFloat(form.costPrice) || Number((selling * 0.82).toFixed(2));
    const stock =
      form.stock !== '' && !isNaN(parseInt(form.stock, 10))
        ? Math.max(0, parseInt(form.stock, 10))
        : 25;

    const saved = onSaveProduct({
      id: form.id,
      barcode: cleanBarcode,
      name: finalName,
      sellingPrice: selling,
      costPrice: cost,
      category: form.category || CATEGORIES[0],
      stock,
      gstRate: Number(form.gstRate) || 12,
    });

    soundEngine.playCheckoutSuccess();
    Vibration.vibrate(25);
    setSearchQuery('');
    setStockFilter('ALL');
    setLastSavedBarcode(saved.barcode);
    setSavedToast(`Saved "${saved.name}" (₹${saved.sellingPrice}) to Catalog!`);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'LOW' && p.stock > 0 && p.stock < 10) ||
        (stockFilter === 'OUT' && p.stock === 0);
      return matchesSearch && matchesStock;
    });
  }, [products, searchQuery, stockFilter]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Catalog Barcode Scanner */}
      <NativeScannerCard
        title="Catalog Barcode Scanner"
        activeCode={form.barcode}
        activeLabel={`${form.name || 'New Product'} • MRP ₹${form.sellingPrice || 0}`}
        chips={ONBOARD_SAMPLE_CHIPS}
        onScan={handleScanIntoForm}
      />

      {/* 2. Clean Product Onboarding / Edit Card */}
      <Animated.View
        style={[
          styles.onboardCard,
          { transform: [{ scale: formPulse }] },
        ]}
      >
        <View style={styles.onboardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} color="#10B981" />
            <Text style={styles.onboardTitle}>
              {form.id ? 'Update Catalog Product' : 'Scan & Save Product to Catalog'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.randomBtn}
            onPress={() =>
              handleScanIntoForm(
                `890${Math.floor(1000000000 + Math.random() * 8999999999)}`
              )
            }
          >
            <RefreshCw size={12} color="#A5B4FC" />
            <Text style={styles.randomBtnText}>New Code</Text>
          </TouchableOpacity>
        </View>

        {savedToast !== '' && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText} numberOfLines={1}>
              {savedToast}
            </Text>
          </View>
        )}

        {/* Row 1: Barcode & Product Name */}
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Barcode (GTIN)</Text>
            <TextInput
              value={form.barcode}
              onChangeText={handleBarcodeTextChange}
              placeholder="890..."
              style={[styles.input, styles.monoInput]}
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <Text style={styles.fieldLabel}>Product Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="Product name"
              style={styles.input}
            />
          </View>
        </View>

        {/* Row 2: MRP, Cost, Stock, Save Button */}
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>MRP (₹)</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={form.sellingPrice}
              onChangeText={(v) => setForm({ ...form, sellingPrice: v })}
              style={[styles.input, styles.monoInput]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Cost (₹)</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={form.costPrice}
              onChangeText={(v) => setForm({ ...form, costPrice: v })}
              style={[styles.input, styles.monoInput]}
            />
          </View>
          <View style={{ flex: 0.9 }}>
            <Text style={styles.fieldLabel}>Stock</Text>
            <TextInput
              keyboardType="numeric"
              value={form.stock}
              onChangeText={(v) => setForm({ ...form, stock: v })}
              style={[styles.input, styles.monoInput]}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Check size={16} color="#090A0F" />
          <Text style={styles.saveBtnText}>Save Product to Catalog</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 3. Search & Filter Strip */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Search size={14} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search catalog products..."
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterPills}>
          {[
            { id: 'ALL', label: `All (${products.length})` },
            { id: 'LOW', label: 'Low' },
            { id: 'OUT', label: 'Out' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setStockFilter(tab.id)}
              style={[
                styles.filterPill,
                stockFilter === tab.id && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  stockFilter === tab.id && { color: '#FFFFFF' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. Clean Mobile Product Catalog Cards */}
      <View style={styles.catalogList}>
        {filteredProducts.map((prod) => {
          const isSaved = prod.barcode === lastSavedBarcode;
          const margin =
            prod.sellingPrice > 0
              ? Math.round(
                  ((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) *
                    100
                )
              : 0;

          return (
            <View
              key={prod.id}
              style={[
                styles.prodCard,
                isSaved && styles.prodCardHighlighted,
              ]}
            >
              <View style={styles.prodTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.prodName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    {isSaved && (
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedBadgeText}>SAVED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.prodMeta}>
                    {prod.barcode} • {prod.category}
                  </Text>
                </View>

                <Text style={styles.prodPrice}>
                  ₹{prod.sellingPrice.toFixed(0)}
                </Text>
              </View>

              <View style={styles.prodBottomRow}>
                {/* Stock & Margin Badges */}
                <View style={styles.badgeGroup}>
                  <View
                    style={[
                      styles.stockBadge,
                      prod.stock === 0
                        ? styles.stockOut
                        : prod.stock < 10
                        ? styles.stockLow
                        : styles.stockOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockBadgeText,
                        prod.stock === 0
                          ? { color: '#FDA4AF' }
                          : prod.stock < 10
                          ? { color: '#FCD34D' }
                          : { color: '#6EE7B7' },
                      ]}
                    >
                      {prod.stock === 0
                        ? 'Out of Stock'
                        : `${prod.stock} in stock`}
                    </Text>
                  </View>

                  <Text style={styles.marginText}>
                    Cost ₹{prod.costPrice} ({margin}% margin)
                  </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actBtnPrimary}
                    onPress={() => onAddToBill(prod.barcode)}
                  >
                    <ShoppingCart size={13} color="#090A0F" />
                    <Text style={styles.actBtnPrimaryText}>+ Bill</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actBtnIcon}
                    onPress={() => onOpenSticker(prod)}
                  >
                    <Barcode size={14} color="#A5B4FC" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actBtnIcon}
                    onPress={() => handleScanIntoForm(prod.barcode)}
                  >
                    <Edit3 size={14} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actBtnIcon}
                    onPress={() => onDeleteProduct(prod.id)}
                  >
                    <Trash2 size={14} color="#FDA4AF" />
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  onboardCard: {
    backgroundColor: '#111420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    padding: 14,
    gap: 10,
  },
  onboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onboardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  randomBtnText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '700',
  },
  toastBanner: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toastText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#090A0F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  monoInput: {
    color: '#34D399',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 2,
  },
  saveBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '800',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 12,
    backgroundColor: 'transparent',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#111420',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  filterPillActive: {
    backgroundColor: '#6366F1',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  catalogList: {
    gap: 8,
  },
  prodCard: {
    backgroundColor: '#111420',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 9,
  },
  prodCardHighlighted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  prodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  prodName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  savedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedBadgeText: {
    color: '#090A0F',
    fontSize: 9,
    fontWeight: '800',
  },
  prodMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  prodPrice: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '800',
  },
  prodBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockOk: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  stockLow: {
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  stockOut: {
    backgroundColor: 'rgba(244,63,94,0.15)',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  marginText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actBtnPrimaryText: {
    color: '#090A0F',
    fontSize: 11,
    fontWeight: '800',
  },
  actBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
