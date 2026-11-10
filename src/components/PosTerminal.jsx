import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  QrCode,
  Banknote,
  CheckCircle2,
  Keyboard,
  Receipt,
  Layers,
} from 'lucide-react';
import BarcodeSvg from './BarcodeSvg';
import BarcodeScannerView from './BarcodeScannerView';

export default function PosTerminal({
  products,
  cart,
  onScanBarcode,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  discountEnabled,
  onToggleDiscount,
  discountPercent,
  onChangeDiscountPercent,
  totals,
  onOpenCheckout,
  lastScanEvent,
}) {
  const [manualInput, setManualInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const manualInputRef = useRef(null);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) return;

    const exactBarcode = products.find((p) => p.barcode === trimmed);
    if (exactBarcode || /^\d{6,14}$/.test(trimmed)) {
      onScanBarcode(trimmed, 'MANUAL');
      setManualInput('');
      setSearchFocused(false);
      return;
    }

    const nameMatch = products.find((p) =>
      p.name.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (nameMatch) {
      onScanBarcode(nameMatch.barcode, 'SEARCH');
      setManualInput('');
      setSearchFocused(false);
    } else {
      onScanBarcode(trimmed, 'MANUAL');
      setManualInput('');
      setSearchFocused(false);
    }
  };

  // Filtered instant search suggestions from pre-saved catalog
  const searchResults = manualInput.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(manualInput.trim().toLowerCase()) ||
            p.barcode.includes(manualInput.trim()) ||
            p.category.toLowerCase().includes(manualInput.trim().toLowerCase())
        )
        .slice(0, 6)
    : [];

  // Currently scanned pre-loaded product details
  const scannedProduct =
    (lastScanEvent?.product &&
      products.find((p) => p.barcode === lastScanEvent.product.barcode)) ||
    (cart.length > 0 &&
      products.find((p) => p.barcode === cart[0].barcode)) ||
    products[0] ||
    null;

  const samplePosBarcodes = products.map((p) => ({
    barcode: p.barcode,
    label: p.name.split(' ').slice(0, 2).join(' '),
    price: p.sellingPrice,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT / TOP PANEL: SCANNER, PRE-LOADED PRODUCT DETAILS & CATALOG LOOKUP (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Unified Optical + Simulated Laser Barcode Scanner */}
        <BarcodeScannerView
          title="POS Barcode Scanner — Instant Bill Generator"
          subtitle="Scan any barcode via live camera, upload a barcode image, or click any product pill below to auto-fetch details & generate bill"
          onDetected={onScanBarcode}
          sampleBarcodes={samplePosBarcodes}
          lastScanBadge={lastScanEvent}
        />

        {/* SCANNED PRODUCT PRE-LOADED DETAILS CARD */}
        {scannedProduct && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] via-white/[0.04] to-indigo-500/[0.08] backdrop-blur-xl border border-emerald-500/30 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Scanned Product Details (Pre-Loaded from Catalog)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                SKU: {scannedProduct.sku || 'N/A'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {scannedProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-white/10 text-slate-200 border border-white/10">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      {scannedProduct.category}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      GTIN: {scannedProduct.barcode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      GST: {scannedProduct.gstRate}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-[10px] uppercase text-slate-400">
                      Unit MRP
                    </div>
                    <div className="font-mono text-sm font-extrabold text-emerald-400">
                      ₹{scannedProduct.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-[10px] uppercase text-slate-400">
                      Tax Slab
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      {scannedProduct.gstRate}% GST
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-[10px] uppercase text-slate-400">
                      Shelf Stock
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-200">
                      {scannedProduct.stock} {scannedProduct.unit || 'pcs'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
                <BarcodeSvg
                  code={scannedProduct.barcode}
                  height={34}
                  className="!p-2"
                />
                <button
                  type="button"
                  onClick={() => onScanBarcode(scannedProduct.barcode, 'RESCAN')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add +1 to Bill (₹{scannedProduct.sellingPrice})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Barcode / GTIN Input & Instant Product Lookup */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 shadow-xl">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={manualInputRef}
                type="text"
                value={manualInput}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Scan or type Barcode / GTIN or search pre-loaded catalog product..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0F]/90 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {manualInput && (
                <button
                  type="button"
                  onClick={() => setManualInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all shrink-0"
            >
              <Keyboard className="w-4 h-4" />
              Add to Bill
            </button>
          </form>

          {/* Instant Search Dropdown */}
          {searchFocused && manualInput.trim().length > 0 && (
            <div className="mt-2 rounded-xl bg-[#111420] border border-white/15 divide-y divide-white/5 overflow-hidden shadow-2xl">
              {searchResults.length > 0 ? (
                searchResults.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onMouseDown={() => {
                      onScanBarcode(prod.barcode, 'SEARCH');
                      setManualInput('');
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {prod.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        GTIN: {prod.barcode} • {prod.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                          prod.stock === 0
                            ? 'bg-rose-500/20 text-rose-300'
                            : prod.stock < 10
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        Stock: {prod.stock}
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        ₹{prod.sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Press Enter or click Add to Bill to auto-resolve barcode{' '}
                    <strong className="text-white font-mono">
                      "{manualInput}"
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT / BOTTOM PANEL: LIVE ITEMIZED TAX INVOICE / BILL (5 cols on Desktop) */}
      <div className="lg:col-span-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Live Bill Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-indigo-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Live Customer Tax Bill
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  AUTO-GENERATED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                ScanFlow Retail Mart • GSTIN: 33AABCS1429B1Z5
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Bill
            </button>
          )}
        </div>

        {/* Bill Table Column Headers */}
        {cart.length > 0 && (
          <div className="grid grid-cols-12 px-4 py-2 bg-white/[0.02] border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-6">Product & Barcode Details</div>
            <div className="col-span-3 text-center">Qty</div>
            <div className="col-span-3 text-right">Amount (₹)</div>
          </div>
        )}

        {/* Scanned Bill Line Items */}
        <div className="divide-y divide-white/10 max-h-[360px] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                No items scanned on current bill
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Scan any barcode or click a pre-loaded product pill on the left to automatically populate the bill.
              </p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={item.barcode}
                className="p-3.5 hover:bg-white/[0.02] transition-colors grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-6 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-mono">
                    <span>{item.barcode}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      ₹{item.sellingPrice.toFixed(2)}/{item.unit || 'unit'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (GST {item.gstRate}%)
                    </span>
                  </div>
                </div>

                {/* Quantity +/- Controls */}
                <div className="col-span-3 flex items-center justify-center">
                  <div className="flex items-center gap-1 bg-[#090A0F] px-1.5 py-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(item.barcode, item.qty - 1)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-white">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(item.barcode, item.qty + 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-300 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Line Total & Delete */}
                <div className="col-span-3 text-right flex items-center justify-end gap-1.5">
                  <div>
                    <div className="font-mono text-sm font-bold text-white">
                      ₹{(item.qty * item.sellingPrice).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      incl. tax
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.barcode)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount Toggle & Itemized Bill Summary */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 space-y-3">
          {/* Discount Toggle Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={discountEnabled}
                onChange={(e) => onToggleDiscount(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all relative peer-checked:bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                Apply Store Discount
              </span>
            </label>

            {discountEnabled && (
              <div className="flex items-center gap-1">
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onChangeDiscountPercent(pct)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition-colors ${
                      discountPercent === pct
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calculation Rows */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>
                Total Qty ({cart.reduce((s, i) => s + i.qty, 0)} units) • Gross MRP
              </span>
              <span className="font-mono text-slate-200">
                ₹{totals.subtotal.toFixed(2)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Store Discount ({totals.discountPercent}%)</span>
                <span className="font-mono">
                  -₹{totals.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>CGST + SGST (Included in MRP)</span>
              <span className="font-mono text-slate-300">
                ₹{totals.gstAmount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
              <span className="text-sm font-bold text-white">
                Net Bill Payable
              </span>
              <span className="font-mono text-2xl font-extrabold text-emerald-400">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onOpenCheckout('CASH')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all"
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              Cash Bill
            </button>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onOpenCheckout('UPI')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_0_25px_-5px_rgba(16,185,129,0.55)] transition-all"
            >
              <QrCode className="w-4 h-4" />
              UPI QR Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
