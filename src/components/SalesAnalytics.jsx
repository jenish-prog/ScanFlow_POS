import React, { useState } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
  QrCode,
  Banknote,
  Clock,
  Receipt,
  TrendingUp,
  ChevronRight,
  X,
} from 'lucide-react';
import BarcodeSvg from './BarcodeSvg';

export default function SalesAnalytics({
  products,
  transactions,
  onNavigateToInventory,
}) {
  const [selectedTx, setSelectedTx] = useState(null);

  // KPI computations
  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + (Number(tx.totalAmount) || 0),
    0
  );
  const totalProfit = transactions.reduce(
    (sum, tx) => sum + (Number(tx.totalProfit) || 0),
    0
  );
  const totalOrders = transactions.length;
  const totalItemsSold = transactions.reduce(
    (sum, tx) =>
      sum + tx.items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0),
    0
  );

  const lowStockItems = products.filter((p) => p.stock < 10);
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const upiRevenue = transactions
    .filter((t) => t.paymentMode === 'UPI')
    .reduce((s, t) => s + t.totalAmount, 0);
  const cashRevenue = transactions
    .filter((t) => t.paymentMode === 'CASH')
    .reduce((s, t) => s + t.totalAmount, 0);

  return (
    <div className="space-y-5">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 overflow-hidden shadow-xl">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-white">
            ₹{totalRevenue.toFixed(2)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Est. Net Profit: ₹{totalProfit.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 overflow-hidden shadow-xl">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Orders
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-white">
            {totalOrders}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>UPI: ₹{upiRevenue.toFixed(0)}</span>
            <span>•</span>
            <span>Cash: ₹{cashRevenue.toFixed(0)}</span>
          </div>
        </div>

        {/* Items Sold */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Items Sold
            </span>
            <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-white">
            {totalItemsSold} <span className="text-sm font-normal text-slate-400">units</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Avg Basket:{' '}
            <span className="font-mono text-slate-200 font-semibold">
              ₹{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-amber-500/25 p-5 overflow-hidden shadow-xl">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Low Stock Alerts
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-amber-400">
            {lowStockItems.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-rose-400 font-medium">
              {outOfStockCount} Out of Stock
            </span>
            <button
              type="button"
              onClick={onNavigateToInventory}
              className="text-indigo-300 hover:text-indigo-200 font-semibold inline-flex items-center gap-0.5"
            >
              Restock <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Transactions Log + Low Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Transactions Log (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Recent Transactions Log
              </h3>
              <p className="text-xs text-slate-400">
                Real-time billing ledger with payment mode & itemized receipt view
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {transactions.length} records
            </span>
          </div>

          <div className="divide-y divide-white/10">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No transactions recorded yet. Complete a bill on the POS Terminal to see it here!
              </div>
            ) : (
              transactions.map((tx) => {
                const unitCount = tx.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="p-4 hover:bg-white/[0.03] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {tx.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.paymentMode === 'UPI'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {tx.paymentMode === 'UPI' ? (
                            <QrCode className="w-3 h-3" />
                          ) : (
                            <Banknote className="w-3 h-3" />
                          )}
                          {tx.paymentMode}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.timestamp).toLocaleString([], {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300">
                        {tx.items
                          .map((i) => `${i.name} (×${i.qty})`)
                          .join(', ')}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                      <div className="font-mono text-base font-extrabold text-white">
                        ₹{Number(tx.totalAmount).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {unitCount} units • Click for receipt
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Alert Watchlist (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Reorder Watchlist (&lt; 10 Units)
            </h3>
            <p className="text-xs text-slate-400">
              Automatically updated as POS bills deduct inventory
            </p>
          </div>

          <div className="divide-y divide-white/10 flex-1">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-emerald-400">
                All catalog items are well-stocked (10+ units)!
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      GTIN: {item.barcode}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                      item.stock === 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.stock === 0 ? 'OUT (0)' : `${item.stock} left`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction Receipt Inspection Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0E111B] border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Invoice {selectedTx.id}
                </h4>
                <p className="text-xs text-slate-400">
                  {new Date(selectedTx.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedTx.items.map((item) => (
                <div
                  key={item.barcode}
                  className="flex justify-between text-xs py-1.5 border-b border-white/5"
                >
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {item.qty} × ₹{Number(item.sellingPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-400">
                    ₹{(item.qty * item.sellingPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Payment Mode</span>
                <span className="font-mono font-bold text-white">
                  {selectedTx.paymentMode}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Included GST</span>
                <span className="font-mono">
                  ₹{Number(selectedTx.gstAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
                <span>Grand Total</span>
                <span className="font-mono text-emerald-400">
                  ₹{Number(selectedTx.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <BarcodeSvg
                code={selectedTx.id.replace(/[^0-9]/g, '') || '20261041'}
                height={32}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
