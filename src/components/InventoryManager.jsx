import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Barcode,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Printer,
  X,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Tag,
  IndianRupee,
  Layers,
  Check,
  ScanLine,
} from 'lucide-react';
import { CATEGORIES, storageService } from '../services/storageService';
import { soundEngine } from '../utils/sound';
import BarcodeSvg from './BarcodeSvg';
import BarcodeScannerView from './BarcodeScannerView';

const CATALOG_SAMPLE_BARCODES = [
  {
    barcode: '8902860475466',
    label: 'Parle-G 250g (8902860475466)',
    price: 35,
  },
  {
    barcode: '8909999123456',
    label: 'Haldiram Bhujia (8909999123456)',
    price: 55,
  },
  {
    barcode: '8908888654321',
    label: 'Nescafé Classic (8908888654321)',
    price: 175,
  },
  {
    barcode: '8907777112233',
    label: 'Dettol Liquid (8907777112233)',
    price: 142,
  },
  {
    barcode: '8901526101214',
    label: 'Dabur Honey (8901526101214)',
    price: 135,
  },
  {
    barcode: '8901030711237',
    label: 'Vim Dishwash Gel (8901030711237)',
    price: 115,
  },
];

export default function InventoryManager({
  products,
  onSaveProduct,
  onDeleteProduct,
  onQuickAddToCart,
  pendingBarcodeToRegister,
  onClearPendingBarcode,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL | LOW | OUT
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewBarcodeProduct, setPreviewBarcodeProduct] = useState(null);
  const [recentlySavedBarcode, setRecentlySavedBarcode] = useState('');
  const [lastCatalogScanBadge, setLastCatalogScanBadge] = useState(null);

  const [onboardingStatus, setOnboardingStatus] = useState({
    type: 'DETECTED',
    message:
      'Barcode 8902860475466 loaded — review or edit Product Name, Price, and Stock below, then click "Save to Catalog".',
  });

  const [onboardingForm, setOnboardingForm] = useState(() => {
    const initialTemplate = storageService.lookupBarcodeTemplate('8902860475466');
    return {
      id: null,
      barcode: '8902860475466',
      name: initialTemplate.name,
      sellingPrice: String(initialTemplate.sellingPrice),
      costPrice: String(initialTemplate.costPrice),
      category: initialTemplate.category,
      stock: String(initialTemplate.stock || 40),
      gstRate: String(initialTemplate.gstRate || 18),
      unit: initialTemplate.unit || 'pkt',
    };
  });

  const nameInputRef = useRef(null);

  // If redirected from POS Terminal with a barcode, pre-fill the Inventory Onboarding form
  useEffect(() => {
    if (pendingBarcodeToRegister) {
      handleScanForCatalogOnboarding(pendingBarcodeToRegister, 'POS_REDIRECT');
      if (onClearPendingBarcode) onClearPendingBarcode();
    }
  }, [pendingBarcodeToRegister]);

  /**
   * Scans or looks up a barcode inside Inventory Catalog:
   * - Plays audio scan beep
   * - Fetches product details from local catalog or Master Indian GTIN Database
   * - Populates the onboarding form AND optionally auto-saves or lets the shopkeeper save in 1 click
   */
  const handleScanForCatalogOnboarding = (rawCode, source = 'SCANNER') => {
    const clean = String(rawCode || '').trim();
    if (!clean) return;

    soundEngine.playScanSuccess();
    const existing = products.find((p) => p.barcode === clean);

    if (existing) {
      setOnboardingForm({
        id: existing.id,
        barcode: existing.barcode,
        name: existing.name,
        sellingPrice: String(existing.sellingPrice),
        costPrice: String(existing.costPrice),
        category: existing.category,
        stock: String(existing.stock),
        gstRate: String(existing.gstRate ?? 12),
        unit: existing.unit || 'pkt',
      });
      setLastCatalogScanBadge({
        barcode: clean,
        label: `In Catalog: ${existing.name} (₹${existing.sellingPrice})`,
        status: 'KNOWN',
        source,
      });
      setOnboardingStatus({
        type: 'INFO',
        message: `Scanned existing catalog item "${existing.name}" (${existing.barcode}) — update price or stock and click "Save to Catalog".`,
      });
    } else {
      const template = storageService.lookupBarcodeTemplate(clean);
      setOnboardingForm({
        id: null,
        barcode: clean,
        name: template.name,
        sellingPrice: String(template.sellingPrice),
        costPrice: String(template.costPrice),
        category: template.category,
        stock: String(template.stock || 30),
        gstRate: String(template.gstRate || 12),
        unit: template.unit || 'pkt',
      });
      setLastCatalogScanBadge({
        barcode: clean,
        label: `Detected: ${template.name} (MRP ₹${template.sellingPrice})`,
        status: 'KNOWN',
        source,
      });
      setOnboardingStatus({
        type: 'DETECTED',
        message: `Barcode ${clean} scanned! Auto-loaded "${template.name}" (MRP ₹${template.sellingPrice}) — edit details or click "Save to Catalog".`,
      });
    }
  };

  /**
   * Handle typing/pasting directly into the Scanned Barcode (GTIN) input box
   */
  const handleBarcodeInputChange = (e) => {
    const nextVal = e.target.value;
    setOnboardingForm((prev) => ({
      ...prev,
      barcode: nextVal,
    }));

    // As soon as a valid 8-14 digit barcode is typed or pasted, auto-lookup its product template
    const clean = nextVal.trim();
    if (clean.length >= 8) {
      const existing = products.find((p) => p.barcode === clean);
      if (existing) {
        setOnboardingForm({
          id: existing.id,
          barcode: existing.barcode,
          name: existing.name,
          sellingPrice: String(existing.sellingPrice),
          costPrice: String(existing.costPrice),
          category: existing.category,
          stock: String(existing.stock),
          gstRate: String(existing.gstRate ?? 12),
          unit: existing.unit || 'pkt',
        });
        setOnboardingStatus({
          type: 'INFO',
          message: `Matched catalog item "${existing.name}" (₹${existing.sellingPrice}).`,
        });
      } else {
        const template = storageService.lookupBarcodeTemplate(clean);
        setOnboardingForm((prev) => ({
          ...prev,
          id: null,
          barcode: clean,
          name: template.name,
          sellingPrice: String(template.sellingPrice),
          costPrice: String(template.costPrice),
          category: template.category,
          stock: String(template.stock || 30),
          gstRate: String(template.gstRate || 12),
        }));
        setOnboardingStatus({
          type: 'DETECTED',
          message: `Barcode ${clean} ready — pre-filled "${template.name}" (₹${template.sellingPrice}). Click "Save to Catalog" to add!`,
        });
      }
    }
  };

  const saveOnboardingProduct = (alsoAddToPosBill = false) => {
    const cleanBarcode = onboardingForm.barcode.trim();
    if (!cleanBarcode) {
      setOnboardingStatus({
        type: 'ERROR',
        message: 'Please enter or scan a valid Barcode (GTIN).',
      });
      return;
    }

    const template = storageService.lookupBarcodeTemplate(cleanBarcode);
    const finalName = onboardingForm.name.trim() || template.name;
    const selling =
      parseFloat(onboardingForm.sellingPrice) > 0
        ? parseFloat(onboardingForm.sellingPrice)
        : Number(template.sellingPrice) || 25;
    const cost =
      parseFloat(onboardingForm.costPrice) > 0
        ? parseFloat(onboardingForm.costPrice)
        : Number((selling * 0.82).toFixed(2));
    const stock =
      onboardingForm.stock !== '' && !isNaN(parseInt(onboardingForm.stock, 10))
        ? Math.max(0, parseInt(onboardingForm.stock, 10))
        : 25;

    const saved = onSaveProduct({
      id: onboardingForm.id,
      barcode: cleanBarcode,
      name: finalName,
      sellingPrice: selling,
      costPrice: cost,
      category: onboardingForm.category || CATEGORIES[0],
      stock,
      gstRate: Number(onboardingForm.gstRate) || 12,
      unit: onboardingForm.unit || 'pkt',
    });

    setSearchQuery('');
    setSelectedCategory('ALL');
    setStockFilter('ALL');
    setRecentlySavedBarcode(saved.barcode);

    soundEngine.playCheckoutSuccess();
    setLastCatalogScanBadge({
      barcode: saved.barcode,
      label: `Saved to Catalog: ${saved.name} (₹${saved.sellingPrice})`,
      status: 'KNOWN',
      source: 'SAVED',
    });
    setOnboardingStatus({
      type: 'SAVED',
      message: `Saved "${saved.name}" (GTIN: ${saved.barcode} • MRP ₹${saved.sellingPrice} • Stock: ${saved.stock}) to Inventory Catalog!`,
    });

    if (alsoAddToPosBill) {
      onQuickAddToCart(saved.barcode);
    }
  };

  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    saveOnboardingProduct(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'ALL' || p.category === selectedCategory;

      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'LOW' && p.stock > 0 && p.stock < 10) ||
        (stockFilter === 'OUT' && p.stock === 0);

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!editingProduct.name.trim() || !editingProduct.barcode.trim()) return;
    const saved = onSaveProduct({
      ...editingProduct,
      costPrice: parseFloat(editingProduct.costPrice) || 0,
      sellingPrice: parseFloat(editingProduct.sellingPrice) || 0,
      stock: parseInt(editingProduct.stock, 10) || 0,
      gstRate: Number(editingProduct.gstRate) || 12,
    });
    setRecentlySavedBarcode(saved.barcode);
    setEditingProduct(null);
  };

  const sellingVal = parseFloat(onboardingForm.sellingPrice) || 0;
  const costVal = parseFloat(onboardingForm.costPrice) || 0;
  const liveMarginPct =
    sellingVal > 0 && costVal > 0
      ? (((sellingVal - costVal) / sellingVal) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-5">
      {/* TOP MODULE: LIVE CATALOG BARCODE SCANNER + PRODUCT ONBOARDING FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Optical / Simulated Catalog Barcode Scanner (5 cols) */}
        <div className="lg:col-span-5">
          <BarcodeScannerView
            title="Catalog Barcode Scanner"
            subtitle="Scan any new or existing barcode via webcam, upload a barcode image, or click a barcode pill below"
            onDetected={handleScanForCatalogOnboarding}
            sampleBarcodes={CATALOG_SAMPLE_BARCODES}
            lastScanBadge={lastCatalogScanBadge}
          />
        </div>

        {/* Right: Scan & Onboard Product Form (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-indigo-500/[0.09] via-white/[0.04] to-emerald-500/[0.09] backdrop-blur-xl border border-indigo-500/30 p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Scan & Onboard Product to Catalog
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Catalog Scanner
                  </span>
                </div>

                <p
                  className={`text-xs mt-0.5 font-medium ${
                    onboardingStatus.type === 'SAVED'
                      ? 'text-emerald-400'
                      : onboardingStatus.type === 'DETECTED'
                      ? 'text-amber-300'
                      : onboardingStatus.type === 'ERROR'
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {onboardingStatus.message}
                </p>
              </div>
            </div>

            {/* Live 1D SVG Barcode Preview of the current form barcode */}
            <div className="shrink-0 hidden sm:block">
              <BarcodeSvg
                code={onboardingForm.barcode || '8902860475466'}
                height={26}
                className="!p-1.5"
              />
            </div>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Scanned Barcode Input + Lookup & Random Generator Buttons */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Scanned Barcode (GTIN / EAN-13) *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={onboardingForm.barcode}
                    onChange={handleBarcodeInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanForCatalogOnboarding(
                          onboardingForm.barcode,
                          'MANUAL_SCAN'
                        );
                      }
                    }}
                    placeholder="e.g. 8902860475466"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 font-mono text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleScanForCatalogOnboarding(
                        onboardingForm.barcode,
                        'LOOKUP'
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                    title="Scan & Lookup Barcode Details"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    Scan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleScanForCatalogOnboarding(
                        `890${Math.floor(
                          1000000000 + Math.random() * 8999999999
                        )}`,
                        'GENERATED'
                      )
                    }
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 text-xs font-semibold inline-flex items-center shrink-0"
                    title="Generate New Random Barcode"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    placeholder="Enter product name..."
                    value={onboardingForm.name}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Category, Selling MRP, Cost Price, Stock, GST */}
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
              <div className="col-span-2 sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Category
                </label>
                <div className="relative">
                  <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={onboardingForm.category}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Selling MRP (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    required
                    value={onboardingForm.sellingPrice}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        sellingPrice: e.target.value,
                      })
                    }
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 font-mono text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Cost Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={onboardingForm.costPrice}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        costPrice: e.target.value,
                      })
                    }
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Stock Units *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={onboardingForm.stock}
                  onChange={(e) =>
                    setOnboardingForm({
                      ...onboardingForm,
                      stock: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 font-mono text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  GST Slab
                </label>
                <select
                  value={onboardingForm.gstRate}
                  onChange={(e) =>
                    setOnboardingForm({
                      ...onboardingForm,
                      gstRate: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-2.5 rounded-xl bg-[#090A0F] border border-white/15 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>

            {/* Footer Bar: Profit Margin Preview + Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                {liveMarginPct ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Profit: ₹{(sellingVal - costVal).toFixed(2)}/unit ({liveMarginPct}%)
                  </span>
                ) : (
                  <span>Enter MRP & Cost Price to see unit profit margin</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_0_25px_-5px_rgba(16,185,129,0.65)] transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Save to Catalog
                </button>

                <button
                  type="button"
                  onClick={() => saveOnboardingProduct(true)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Save & Send to POS Bill
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog by GTIN barcode, product name, or SKU..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#090A0F]/80 border border-white/15 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories ({products.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5 bg-[#090A0F]/70 p-1 rounded-xl border border-white/10">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'LOW', label: 'Low (<10)' },
              { id: 'OUT', label: 'Out (0)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === tab.id
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Barcode (GTIN)</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Cost Price</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Profit Margin</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const profit = prod.sellingPrice - prod.costPrice;
                  const marginPct =
                    prod.sellingPrice > 0
                      ? ((profit / prod.sellingPrice) * 100).toFixed(1)
                      : '0.0';
                  const isJustSaved = recentlySavedBarcode === prod.barcode;

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors group ${
                        isJustSaved
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/20'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono">
                        <button
                          type="button"
                          onClick={() => setPreviewBarcodeProduct(prod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/40 text-slate-200 hover:text-indigo-200 transition-colors"
                          title="Click to preview 1D barcode label"
                        >
                          <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{prod.barcode}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {prod.name}
                          </span>
                          {isJustSaved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500 text-slate-950">
                              Saved
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          SKU: {prod.sku || 'N/A'} • GST {prod.gstRate}%
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px]">
                          {prod.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        ₹{prod.costPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{prod.sellingPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">
                          <TrendingUp className="w-3 h-3" />
                          {marginPct}%
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          +₹{profit.toFixed(2)}/unit
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {prod.stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px]">
                            <PackageX className="w-3.5 h-3.5" />
                            Out of Stock (0)
                          </span>
                        ) : prod.stock < 10 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Stock ({prod.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {prod.stock} in stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickAddToCart(prod.barcode)}
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
                            title="Send to POS Bill"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewBarcodeProduct(prod)}
                            className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-colors"
                            title="Generate & Preview 1D Barcode Label"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProduct({ ...prod })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(prod.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E111B] border border-white/15 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                Edit Catalog Product
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Barcode (GTIN / EAN-13)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        barcode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GST Slab (%)
                  </label>
                  <select
                    value={editingProduct.gstRate}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        gstRate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/15 font-mono text-sm text-white"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Selling MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stock Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#141824] border border-white/15 text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center pt-1">
                <BarcodeSvg
                  code={editingProduct.barcode}
                  label={editingProduct.name || 'Preview Label'}
                  price={editingProduct.sellingPrice || 0}
                  height={42}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1D Barcode Label Generator & Print Preview Modal */}
      {previewBarcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E111B] border border-white/15 p-6 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Barcode className="w-4 h-4 text-emerald-400" />
                1D Retail Shelf Sticker
              </h3>
              <button
                onClick={() => setPreviewBarcodeProduct(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <BarcodeSvg
                code={previewBarcodeProduct.barcode}
                label={previewBarcodeProduct.name}
                price={previewBarcodeProduct.sellingPrice}
                height={68}
                lightTheme
                className="w-full"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Standard EAN-13 / Code-128 compatible sticker for thermal label printers.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold"
              >
                <Printer className="w-4 h-4" />
                Print Sticker
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAddToCart(previewBarcodeProduct.barcode);
                  setPreviewBarcodeProduct(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to POS Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
