import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Vibration,
} from 'react-native';
import {
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  Banknote,
  X,
} from 'lucide-react';
import { NativeBarcodeGraphic } from '../components/NativeBarcodeCard';

const PERIOD_TABS = ['Today', 'This wk', 'This mo', 'Quarter'];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function getPeriodConfig(period, now) {
  if (period === 'Today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end: now,
      labels: ['9a', '11a', '1p', '3p', '5p', '7p', '9p'],
      indexFor: (date) => clamp(Math.floor((date.getHours() - 9) / 2), 0, 6),
    };
  }

  if (period === 'This wk') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return {
      start,
      end: now,
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      indexFor: (date) => date.getDay(),
    };
  }

  if (period === 'This mo') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
      labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
      indexFor: (date) => Math.min(4, Math.floor((date.getDate() - 1) / 7)),
    };
  }

  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return {
    start: new Date(now.getFullYear(), quarterStartMonth, 1),
    end: now,
    labels: [0, 1, 2].map(
      (offset) => MONTH_NAMES[(quarterStartMonth + offset) % 12]
    ),
    indexFor: (date) =>
      clamp((date.getMonth() - quarterStartMonth + 12) % 12, 0, 2),
  };
}

function buildAnalytics(period, transactions, products) {
  const now = new Date();
  const config = getPeriodConfig(period, now);
  const productByBarcode = new Map(
    (products || []).map((product) => [product.barcode, product])
  );

  const bars = config.labels.map((label) => ({
    label,
    cost: 0,
    rev: 0,
  }));
  const soldByBarcode = {};

  let cost = 0;
  let revenue = 0;
  let profit = 0;

  (transactions || []).forEach((tx) => {
    const timestamp = new Date(tx.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;
    if (timestamp < config.start || timestamp > config.end) return;

    const bucketIdx = config.indexFor(timestamp);
    const items = Array.isArray(tx.items) ? tx.items : [];

    const txCost = items.reduce((sum, item) => {
      const product = productByBarcode.get(item.barcode);
      const unitCost = toNumber(
        item.costPrice,
        toNumber(product?.costPrice, 0)
      );
      return sum + unitCost * toNumber(item.qty, 0);
    }, 0);

    const itemsRevenue = items.reduce((sum, item) => {
      const product = productByBarcode.get(item.barcode);
      const unitPrice = toNumber(
        item.sellingPrice,
        toNumber(product?.sellingPrice, 0)
      );
      return sum + unitPrice * toNumber(item.qty, 0);
    }, 0);

    const txRevenue = toNumber(tx.totalAmount, itemsRevenue);
    const txProfit = toNumber(tx.totalProfit, txRevenue - txCost);

    bars[bucketIdx].cost += txCost;
    bars[bucketIdx].rev += txRevenue;

    cost += txCost;
    revenue += txRevenue;
    profit += txProfit;

    items.forEach((item) => {
      const barcode = item.barcode;
      if (!barcode) return;
      if (!soldByBarcode[barcode]) {
        soldByBarcode[barcode] = {
          total: 0,
          buckets: config.labels.map(() => 0),
        };
      }
      const qty = toNumber(item.qty, 0);
      soldByBarcode[barcode].total += qty;
      soldByBarcode[barcode].buckets[bucketIdx] += qty;
    });
  });

  return {
    cost,
    revenue,
    profit,
    bars,
    soldByBarcode,
    hasSales: revenue > 0 || cost > 0,
  };
}

function niceAxisMax(value) {
  if (!value || value <= 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatAxisValue(value) {
  if (value <= 0) return '0';
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) {
    const thousands = value / 1000;
    return `₹${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `₹${Math.round(value)}`;
}

function formatCurrency(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function buildSparkline(values, width = 34, height = 17) {
  const max = Math.max(...values, 1);
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - (value / max) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    line: points.join(' '),
    area: `0,${height} ${points.join(' ')} ${width},${height}`,
  };
}


/**
 * Store Sales Analytics, Stock Movement & Recent POS Invoices Screen
 * Uses the clean white card, vertical bar chart, segmented switcher, and sparkline row components
 * from the reference UI, applied strictly to POS Revenue, Inventory Stock & Invoices.
 */
export default function ProgressAnalyticsScreen({ products, transactions }) {
  const [selectedPeriod, setSelectedPeriod] = useState('This wk');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const stats = useMemo(
    () => buildAnalytics(selectedPeriod, transactions, products),
    [selectedPeriod, transactions, products]
  );

  const axisMax = useMemo(() => {
    const maxValue = stats.bars.reduce(
      (max, bar) => Math.max(max, bar.cost, bar.rev),
      0
    );
    return niceAxisMax(maxValue);
  }, [stats]);

  const gridLevels = [axisMax, (axisMax * 2) / 3, axisMax / 3, 0];

  const productRows = useMemo(() => {
    const emptyBuckets = stats.bars.map(() => 0);
    return (products || [])
      .map((product) => {
        const movement = stats.soldByBarcode[product.barcode];
        return {
          ...product,
          sold: movement ? movement.total : 0,
          spark: buildSparkline(movement ? movement.buckets : emptyBuckets),
        };
      })
      .sort(
        (a, b) => b.sold - a.sold || toNumber(a.stock) - toNumber(b.stock)
      )
      .slice(0, 6);
  }, [products, stats]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Page Header */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Sales & Analytics</Text>
        <Text style={styles.pageSub}>
          Real-time store revenue, profit margins, and inventory metrics
        </Text>
      </View>

      {/* 2. POS Revenue & Cost Bar Chart Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Store Sales & Profit</Text>

        {/* 3-Column POS Financial Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>COGS Cost</Text>
            <View style={styles.summaryValLine}>
              <Text style={styles.summaryVal}>{formatCurrency(stats.cost)}</Text>
            </View>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Gross Billed</Text>
            <View style={styles.summaryValLine}>
              <Text style={styles.summaryVal}>
                {formatCurrency(stats.revenue)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <View style={styles.summaryValLine}>
              <Text
                style={[
                  styles.summaryVal,
                  { color: stats.profit < 0 ? '#E05252' : '#2E9E5B' },
                ]}
              >
                {formatCurrency(stats.profit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Vertical Bar Chart with Dashed Gridlines */}
        <View style={styles.chartContainer}>
          {gridLevels.map((level, idx) => (
            <View key={idx} style={[styles.gridRow, { top: idx * 44 }]}>
              <Text style={styles.yAxisLabel}>
                {formatAxisValue(level)}
              </Text>
              <View style={styles.dashedLine} />
            </View>
          ))}

          <View style={styles.barsOverlay}>
            {stats.bars.map((b) => {
              const costH =
                b.cost > 0
                  ? Math.max(3, Math.round((b.cost / axisMax) * 132))
                  : 0;
              const revH =
                b.rev > 0
                  ? Math.max(3, Math.round((b.rev / axisMax) * 132))
                  : 0;
              return (
                <View key={b.label} style={styles.barDayGroup}>
                  <View style={styles.barPair}>
                    {costH > 0 && (
                      <View style={[styles.barTan, { height: costH }]} />
                    )}
                    {revH > 0 && (
                      <View style={[styles.barGreen, { height: revH }]} />
                    )}
                  </View>
                  <Text style={styles.xAxisDay}>{b.label}</Text>
                </View>
              );
            })}
          </View>

          {!stats.hasSales && (
            <View style={styles.emptyChartOverlay} pointerEvents="none">
              <Text style={styles.emptyChartText}>
                No sales recorded in this period
              </Text>
            </View>
          )}
        </View>

        {/* Legend Dots */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D39B6A' }]} />
            <Text style={styles.legendText}>Inventory Cost</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#48A868' }]} />
            <Text style={styles.legendText}>POS Billed</Text>
          </View>
        </View>

        {/* Segmented Period Switcher Pill */}
        <View style={styles.segmentedTrack}>
          {PERIOD_TABS.map((period) => {
            const active = selectedPeriod === period;
            return (
              <TouchableOpacity
                key={period}
                onPress={() => {
                  Vibration.vibrate(8);
                  setSelectedPeriod(period);
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
                  {period}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Product Sales & Stock Movement Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Sales & Stock</Text>

        {productRows.length === 0 ? (
          <Text style={styles.emptyRowText}>
            No products yet. Add items from the Catalog to see stock movement.
          </Text>
        ) : (
          <View style={styles.changesList}>
            {productRows.map((prod) => {
              const stock = toNumber(prod.stock);
              const isLow = stock < 10;
              const color = isLow
                ? '#E05252'
                : prod.sold > 0
                ? '#2E9E5B'
                : '#D39B6A';
              return (
                <View key={prod.id || prod.barcode} style={styles.changeRow}>
                  <Text style={styles.changeProdName} numberOfLines={1}>
                    {prod.name.split(' ').slice(0, 2).join(' ')}
                  </Text>

                  {/* Sparkline rebuilt from this product's real sales in the selected period */}
                  <View style={styles.sparklineBox}>
                    <svg width="36" height="20" viewBox="0 0 36 20">
                      <polygon
                        points={prod.spark.area}
                        fill={
                          isLow
                            ? 'rgba(224, 82, 82, 0.18)'
                            : 'rgba(46, 158, 91, 0.16)'
                        }
                      />
                      <polyline
                        points={prod.spark.line}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </View>

                  <Text style={styles.changeVal}>{stock} units</Text>

                  <View style={styles.increaseRight}>
                    {prod.sold > 0 ? (
                      <>
                        <ArrowUpRight size={14} color="#2E9E5B" />
                        <Text style={[styles.increaseText, { color: '#2E9E5B' }]}>
                          {prod.sold} sold
                        </Text>
                      </>
                    ) : isLow ? (
                      <>
                        <ArrowDownRight size={14} color="#E05252" />
                        <Text
                          style={[styles.increaseText, { color: '#E05252' }]}
                        >
                          Low Stock
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.increaseText}>No sales</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 3. Recent POS Tax Invoices */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Recent POS Bills ({transactions.length})
        </Text>

        {transactions.length === 0 ? (
          <Text style={styles.emptyRowText}>
            No bills yet. Complete a checkout in the POS to see invoices here.
          </Text>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txRow}
                onPress={() => setSelectedInvoice(tx)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.txTop}>
                    <Text style={styles.txId}>{tx.id}</Text>
                    <View style={styles.txModeBadge}>
                      {tx.paymentMode === 'UPI' ? (
                        <QrCode size={11} color="#18181B" />
                      ) : (
                        <Banknote size={11} color="#18181B" />
                      )}
                      <Text style={styles.txModeText}>{tx.paymentMode}</Text>
                    </View>
                  </View>
                  <Text style={styles.txItems} numberOfLines={1}>
                    {(tx.items || [])
                      .map((i) => `${i.name} ×${i.qty}`)
                      .join(', ') || 'No item details'}
                  </Text>
                </View>

                <Text style={styles.txTotal}>
                  ₹{Number(tx.totalAmount).toFixed(0)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Invoice Receipt Modal */}
      <Modal
        visible={Boolean(selectedInvoice)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        {selectedInvoice && (
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedInvoice.id}</Text>
                <Text style={styles.modalSub}>
                  {new Date(selectedInvoice.timestamp).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedInvoice(null)}
              >
                <X size={18} color="#71717A" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalReceiptBox}>
              {(selectedInvoice.items || []).map((item) => (
                <View key={item.barcode} style={styles.modalItemRow}>
                  <Text style={styles.modalItemName}>
                    {item.name} (×{item.qty})
                  </Text>
                  <Text style={styles.modalItemVal}>
                    ₹{(item.qty * item.sellingPrice).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.modalDivider} />
              <View style={styles.modalItemRow}>
                <Text style={styles.modalGrandLabel}>
                  Paid via {selectedInvoice.paymentMode}
                </Text>
                <Text style={styles.modalGrandVal}>
                  ₹{Number(selectedInvoice.totalAmount).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <NativeBarcodeGraphic
                code={selectedInvoice.id.replace(/[^0-9]/g, '') || '20261041'}
                height={30}
              />
            </View>
          </View>
        )}
      </Modal>
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
    gap: 14,
  },
  headerRow: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  pageTitle: {
    color: '#18181B',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSub: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    gap: 14,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
  },
  cardTitle: {
    color: '#18181B',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    gap: 2,
  },
  summaryLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  summaryVal: {
    color: '#18181B',
    fontSize: 18,
    fontWeight: '800',
  },
  chartContainer: {
    height: 162,
    position: 'relative',
    marginTop: 4,
  },
  emptyChartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: '#A1A1AA',
    fontSize: 11.5,
    fontWeight: '600',
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yAxisLabel: {
    width: 34,
    textAlign: 'right',
    color: '#71717A',
    fontSize: 11,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderColor: '#E4E4E7',
    borderStyle: 'dashed',
  },
  barsOverlay: {
    position: 'absolute',
    left: 42,
    right: 4,
    top: 6,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barDayGroup: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  barPair: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barTan: {
    width: 7,
    borderRadius: 999,
    backgroundColor: '#D39B6A',
  },
  barGreen: {
    width: 7,
    borderRadius: 999,
    backgroundColor: '#48A868',
  },
  xAxisDay: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '600',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F6',
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
  changesList: {
    gap: 12,
  },
  emptyRowText: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  changeProdName: {
    width: 96,
    color: '#18181B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  sparklineBox: {
    width: 40,
    alignItems: 'center',
  },
  changeVal: {
    color: '#18181B',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 62,
    textAlign: 'right',
  },
  increaseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  increaseText: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '600',
  },
  txList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F6',
  },
  txTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txId: {
    color: '#18181B',
    fontSize: 13,
    fontWeight: '700',
  },
  txModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F4F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  txModeText: {
    color: '#18181B',
    fontSize: 10,
    fontWeight: '700',
  },
  txItems: {
    color: '#71717A',
    fontSize: 11.5,
    marginTop: 2,
  },
  txTotal: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 12,
    width: '100%',
    boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: '#71717A',
    fontSize: 11,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalReceiptBox: {
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalItemName: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '600',
  },
  modalItemVal: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 6,
  },
  modalGrandLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
  },
  modalGrandVal: {
    color: '#2E9E5B',
    fontSize: 15,
    fontWeight: '800',
  },
});
