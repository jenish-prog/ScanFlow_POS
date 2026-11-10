import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import {
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  QrCode,
  Banknote,
  Receipt,
  X,
} from 'lucide-react';
import { NativeBarcodeGraphic } from '../components/NativeBarcodeCard';

export default function AnalyticsScreen({
  products,
  transactions,
  onGoToInventory,
}) {
  const [selectedTx, setSelectedTx] = useState(null);

  const totalRevenue = transactions.reduce(
    (s, tx) => s + (Number(tx.totalAmount) || 0),
    0
  );
  const totalProfit = transactions.reduce(
    (s, tx) => s + (Number(tx.totalProfit) || 0),
    0
  );
  const totalUnitsSold = transactions.reduce(
    (s, tx) => s + tx.items.reduce((is, i) => is + (i.qty || 0), 0),
    0
  );
  const lowStockItems = products.filter((p) => p.stock < 10);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Clean 2x2 KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>TODAY'S REVENUE</Text>
            <IndianRupee size={14} color="#10B981" />
          </View>
          <Text style={styles.kpiValue}>₹{totalRevenue.toFixed(0)}</Text>
          <Text style={styles.kpiSub}>
            {transactions.length} completed bills
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>NET PROFIT</Text>
            <TrendingUp size={14} color="#6366F1" />
          </View>
          <Text style={[styles.kpiValue, { color: '#34D399' }]}>
            ₹{totalProfit.toFixed(0)}
          </Text>
          <Text style={styles.kpiSub}>{totalUnitsSold} units sold</Text>
        </View>
      </View>

      {/* 2. Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={onGoToInventory}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#FBBF24" />
            <View>
              <Text style={styles.alertTitle}>
                {lowStockItems.length} Products Low on Stock (&lt;10 units)
              </Text>
              <Text style={styles.alertSub} numberOfLines={1}>
                {lowStockItems.map((i) => `${i.name.split(' ')[0]} (${i.stock})`).join(', ')}
              </Text>
            </View>
          </View>
          <Text style={styles.alertAction}>Restock →</Text>
        </TouchableOpacity>
      )}

      {/* 3. Recent Transactions List */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Receipt size={15} color="#10B981" />
          <Text style={styles.sectionTitle}>Recent Customer Bills</Text>
        </View>

        <View style={styles.txList}>
          {transactions.map((tx) => {
            const units = tx.items.reduce((s, i) => s + i.qty, 0);
            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txRow}
                onPress={() => setSelectedTx(tx)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.txTopLine}>
                    <Text style={styles.txId}>{tx.id}</Text>
                    <View
                      style={[
                        styles.modePill,
                        tx.paymentMode === 'UPI'
                          ? styles.modeUpi
                          : styles.modeCash,
                      ]}
                    >
                      {tx.paymentMode === 'UPI' ? (
                        <QrCode size={10} color="#A5B4FC" />
                      ) : (
                        <Banknote size={10} color="#6EE7B7" />
                      )}
                      <Text
                        style={[
                          styles.modePillText,
                          {
                            color:
                              tx.paymentMode === 'UPI' ? '#A5B4FC' : '#6EE7B7',
                          },
                        ]}
                      >
                        {tx.paymentMode}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.txItems} numberOfLines={1}>
                    {tx.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txTotal}>
                    ₹{Number(tx.totalAmount).toFixed(0)}
                  </Text>
                  <Text style={styles.txMeta}>{units} units</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Invoice Inspection Modal */}
      <Modal
        visible={Boolean(selectedTx)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx && (
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedTx.id}</Text>
                <Text style={styles.modalSub}>
                  {new Date(selectedTx.timestamp).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedTx(null)}
              >
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalReceiptBox}>
              {selectedTx.items.map((item) => (
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
                  Total Paid ({selectedTx.paymentMode})
                </Text>
                <Text style={styles.modalGrandVal}>
                  ₹{Number(selectedTx.totalAmount).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <NativeBarcodeGraphic
                code={selectedTx.id.replace(/[^0-9]/g, '') || '20261041'}
                height={32}
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#111420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  kpiSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  alertTitle: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
  },
  alertSub: {
    color: '#D97706',
    fontSize: 11,
    marginTop: 1,
    maxWidth: 230,
  },
  alertAction: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#111420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  txList: {
    paddingHorizontal: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  txTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txId: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeUpi: {
    backgroundColor: 'rgba(99,102,241,0.18)',
  },
  modeCash: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  modePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  txItems: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 3,
  },
  txTotal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  txMeta: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  modalSheet: {
    backgroundColor: '#111420',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalReceiptBox: {
    backgroundColor: '#090A0F',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalItemName: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  modalItemVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  modalGrandLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalGrandVal: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '800',
  },
});
