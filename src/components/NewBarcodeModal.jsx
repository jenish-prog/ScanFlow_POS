import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Barcode,
  X,
  PlusCircle,
  IndianRupee,
  Package,
  Tag,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { CATEGORIES } from '../services/storageService';
import BarcodeSvg from './BarcodeSvg';

export default function NewBarcodeModal({
  isOpen,
  barcode,
  onClose,
  onSaveAndAddToCart,
}) {
  const nameInputRef = useRef(null);

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    sellingPrice: '',
    costPrice: '',
    category: CATEGORIES[0],
    stock: '25',
    gstRate: '12',
    unit: 'pkt',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        barcode: barcode || '8909999123456',
        name: '',
        sellingPrice: '',
        costPrice: '',
        category: CATEGORIES[0],
        stock: '25',
        gstRate: '12',
        unit: 'pkt',
      });
      setError('');
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, barcode]);

  if (!isOpen) return null;

  const selling = parseFloat(formData.sellingPrice) || 0;
  const cost = parseFloat(formData.costPrice) || 0;
  const marginPct =
    selling > 0 && cost > 0 ? (((selling - cost) / selling) * 100).toFixed(1) : null;

  const handleQuickPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      sellingPrice: String(preset.sellingPrice),
      costPrice: String(preset.costPrice),
      category: preset.category,
      stock: String(preset.stock),
      gstRate: String(preset.gstRate),
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a product name.');
      return;
    }
    if (!selling || selling <= 0) {
      setError('Please enter a valid selling price (₹).');
      return;
    }
    const finalCost = cost > 0 ? cost : Number((selling * 0.82).toFixed(2));

    onSaveAndAddToCart({
      barcode: formData.barcode.trim(),
      name: formData.name.trim(),
      sellingPrice: selling,
      costPrice: finalCost,
      category: formData.category,
      stock: Math.max(1, parseInt(formData.stock, 10) || 1),
      gstRate: Number(formData.gstRate) || 12,
      unit: formData.unit || 'pkt',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0E1017]/95 backdrop-blur-2xl border border-amber-500/30 shadow-[0_0_60px_-10px_rgba(245,158,11,0.28)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-3 h-3" /> Instant Onboarding
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                New Barcode Detected
              </h2>
              <p className="text-xs text-slate-400">
                Not found in catalog — register once to add to inventory & billing cart
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-4">
          {/* Pre-filled Barcode Banner + Live Mini 1D Preview */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Scanned GTIN / EAN-13
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="bg-transparent font-mono text-base font-bold text-emerald-400 focus:outline-none w-full"
                />
              </div>
            </div>
            <BarcodeSvg
              code={formData.barcode}
              height={28}
              className="!p-1.5 shrink-0"
            />
          </div>

          {/* 1-Click Demo Auto-Fill Pills for Quick Testing */}
          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Quick Demo Presets (1-click autofill):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  name: 'Haldiram Bhujia Sev 200g',
                  sellingPrice: 55,
                  costPrice: 44,
                  category: 'Biscuits & Snacks',
                  stock: 30,
                  gstRate: 12,
                },
                {
                  name: 'Nescafé Classic Instant Coffee 45g',
                  sellingPrice: 175,
                  costPrice: 146,
                  category: 'Beverages & Tea',
                  stock: 18,
                  gstRate: 18,
                },
                {
                  name: 'Dettol Antiseptic Liquid 250ml',
                  sellingPrice: 142,
                  costPrice: 118,
                  category: 'Personal Care',
                  stock: 24,
                  gstRate: 18,
                },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleQuickPreset(preset)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all"
                >
                  + {preset.name} (₹{preset.sellingPrice})
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Product Name <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={nameInputRef}
                type="text"
                required
                placeholder="e.g., Parle-G Original Gluco Biscuits 250g"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Selling & Cost Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Selling Price / MRP (₹) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  required
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, sellingPrice: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cost Price (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Auto (82% MRP)"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, costPrice: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Category, Initial Stock & GST */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-[#141824] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Initial Stock
              </label>
              <div className="relative">
                <Package className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/15 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GST Slab (%)
              </label>
              <select
                value={formData.gstRate}
                onChange={(e) =>
                  setFormData({ ...formData, gstRate: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-[#141824] border border-white/15 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          {/* Live Margin Pill */}
          {marginPct !== null && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <TrendingUp className="w-3.5 h-3.5" /> Estimated Retail Margin
              </span>
              <span className="font-mono font-bold text-emerald-400">
                ₹{(selling - cost).toFixed(2)} / unit ({marginPct}%)
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-[0_0_25px_-5px_rgba(16,185,129,0.6)] transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Save to Catalog & Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
