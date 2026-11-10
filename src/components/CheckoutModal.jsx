import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  QrCode,
  Banknote,
  Printer,
  X,
  Sparkles,
  Smartphone,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { generateUpiQrMatrix } from '../utils/barcodeGenerator';
import BarcodeSvg from './BarcodeSvg';

export default function CheckoutModal({
  isOpen,
  cart,
  totals,
  initialMode = 'UPI',
  onClose,
  onConfirmPayment,
}) {
  const [mode, setMode] = useState(initialMode);
  const [cashTendered, setCashTendered] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setCashTendered(String(Math.ceil(totals.grandTotal)));
      setCustomerPhone('');
      setCompletedReceipt(null);
    }
  }, [isOpen, initialMode, totals.grandTotal]);

  if (!isOpen) return null;

  const upiUri = `upi://pay?pa=scanflow.kirana@okaxis&pn=ScanFlow%20Retail%20Mart&am=${totals.grandTotal.toFixed(
    2
  )}&cu=INR`;
  const qrMatrix = generateUpiQrMatrix(upiUri);

  const numericCash = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCash - totals.grandTotal);

  const handleComplete = () => {
    const receipt = onConfirmPayment({
      paymentMode: mode,
      cashReceived: mode === 'CASH' ? numericCash : totals.grandTotal,
      changeDue: mode === 'CASH' ? changeDue : 0,
      upiRef:
        mode === 'UPI'
          ? `UPI${Math.floor(100000000000 + Math.random() * 899999999999)}`
          : null,
      customerPhone: customerPhone.trim(),
    });
    setCompletedReceipt(receipt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0D1018]/95 backdrop-blur-2xl border border-white/15 shadow-[0_0_70px_-15px_rgba(16,185,129,0.3)] overflow-hidden">
        {/* Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {!completedReceipt ? (
          <>
            {/* Payment Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Complete POS Checkout
                </h2>
                <p className="text-xs text-slate-400">
                  {cart.reduce((s, i) => s + i.qty, 0)} items • Inclusive of GST
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total Payable Hero */}
              <div className="text-center py-3 px-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-white/[0.03] to-indigo-500/15 border border-emerald-500/30">
                <span className="text-[11px] uppercase tracking-widest text-emerald-300 font-semibold">
                  Net Payable Amount
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-0.5">
                  ₹{totals.grandTotal.toFixed(2)}
                </div>
                {totals.discountAmount > 0 && (
                  <span className="inline-block mt-1 text-[11px] text-emerald-400 font-medium">
                    Saved ₹{totals.discountAmount.toFixed(2)} ({totals.discountPercent}% store discount)
                  </span>
                )}
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('UPI')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'UPI'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  UPI Dynamic QR
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CASH')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'CASH'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash Tender
                </button>
              </div>

              {/* Mode Content */}
              {mode === 'UPI' ? (
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white shadow-xl border-4 border-indigo-500/30">
                    <svg
                      viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                      className="w-40 h-40"
                    >
                      {qrMatrix.map((row, rIdx) =>
                        row.map((cell, cIdx) =>
                          cell ? (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx}
                              y={rIdx}
                              width={0.95}
                              height={0.95}
                              rx={0.15}
                              fill="#090A0F"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">
                      Scan with GPay, PhonePe, Paytm or BHIM
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      VPA: scanflow.kirana@okaxis
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 font-mono text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* Quick Denomination Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      Math.ceil(totals.grandTotal),
                      100,
                      200,
                      500,
                      2000,
                    ]
                      .filter((v, i, a) => v >= totals.grandTotal && a.indexOf(v) === i)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(String(amt))}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 font-mono text-xs text-slate-200 transition-colors"
                        >
                          ₹{amt}
                        </button>
                      ))}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <span className="text-xs font-medium text-emerald-200">
                      Change to Return
                    </span>
                    <span className="font-mono text-lg font-extrabold text-emerald-400">
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Customer WhatsApp/Phone for Digital Bill */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Customer Mobile (Optional for Digital Receipt)
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+91 98400 XXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleComplete}
                disabled={mode === 'CASH' && numericCash < totals.grandTotal}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-[0_0_25px_-5px_rgba(16,185,129,0.65)] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm {mode} Payment & Issue Receipt
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Digital Thermal Receipt View */
          <div className="p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">
                  Payment Verified & Stock Updated
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crisp Receipt Card */}
            <div className="p-5 rounded-2xl bg-white text-slate-900 font-mono text-xs space-y-3 shadow-2xl">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-sans font-extrabold text-base tracking-tight text-slate-950">
                  SCANFLOW SMART RETAIL MART
                </div>
                <div className="text-[11px] text-slate-500">
                  GSTIN: 33AABCS1429B1Z5 • Chennai, TN
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  <Receipt className="w-3 h-3" /> {completedReceipt.id} •{' '}
                  {new Date(completedReceipt.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <span>Item (Qty × Rate)</span>
                  <span>Amount</span>
                </div>
                {completedReceipt.items.map((item) => (
                  <div
                    key={item.barcode}
                    className="flex justify-between items-start gap-2"
                  >
                    <div>
                      <div className="font-sans font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.qty} × ₹{item.sellingPrice.toFixed(2)} (GST {item.gstRate}%)
                      </div>
                    </div>
                    <div className="font-bold">
                      ₹{(item.qty * item.sellingPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal</span>
                  <span>₹{completedReceipt.subtotal.toFixed(2)}</span>
                </div>
                {completedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({completedReceipt.discountPercent}%)</span>
                    <span>-₹{completedReceipt.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Included CGST + SGST</span>
                  <span>₹{completedReceipt.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1">
                  <span>GRAND TOTAL</span>
                  <span>₹{completedReceipt.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Meta + Barcode */}
              <div className="text-center space-y-2 pt-1">
                <div className="text-[11px] font-sans font-semibold text-slate-700">
                  Paid via {completedReceipt.paymentMode}{' '}
                  {completedReceipt.upiRef
                    ? `• Ref: ${completedReceipt.upiRef}`
                    : `• Tendered: ₹${Number(completedReceipt.cashReceived).toFixed(2)} (Change: ₹${Number(completedReceipt.changeDue).toFixed(2)})`}
                </div>
                <div className="flex justify-center">
                  <BarcodeSvg
                    code={completedReceipt.id.replace(/[^0-9]/g, '') || '20261043'}
                    height={30}
                    lightTheme
                    className="!border-none !shadow-none !p-0"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Thank you for shopping with ScanFlow POS!
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Thermal Bill
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
              >
                New Customer Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
