import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import {
  X,
  CheckCircle2,
  QrCode,
  Banknote,
  Printer,
  ShoppingCart,
} from 'lucide-react';
import { generateUpiQrMatrix } from '../utils/barcodeGenerator';
import { NativeBarcodeGraphic } from './NativeBarcodeCard';

/**
 * Inline Payment & Receipt Panel shown at the bottom of the POS bill.
 * (Previously a bottom-sheet popup; the POS now keeps it inline.)
 */
export function InlineCheckoutPanel({
  cart,
  totals,
  initialMode = 'UPI',
  onClose,
  onConfirmPayment,
  onCompleted,
}) {
  const [mode, setMode] = useState(initialMode);
  const [cashTendered, setCashTendered] = useState(
    String(Math.ceil(totals.grandTotal))
  );
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [payError, setPayError] = useState('');

  const upiUri = `upi://pay?pa=scanflow.pos@okaxis&pn=ScanFlow%20Retail&am=${totals.grandTotal.toFixed(
    2
  )}&cu=INR`;
  const qrMatrix = generateUpiQrMatrix(upiUri);

  const numericCash = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCash - totals.grandTotal);

  const handlePay = () => {
    if (cart.length === 0) {
      setPayError('The bill is empty. Scan a product before checkout.');
      return;
    }

    const receipt = onConfirmPayment({
      paymentMode: mode,
      cashReceived: mode === 'CASH' ? numericCash : totals.grandTotal,
      changeDue: mode === 'CASH' ? changeDue : 0,
      upiRef:
        mode === 'UPI'
          ? `UPI${Math.floor(1000000000 + Math.random() * 8999999999)}`
          : null,
    });

    if (!receipt) {
      setPayError(
        'Could not generate the bill. Check stock levels and try again.'
      );
      return;
    }

    setPayError('');
    setCompletedReceipt(receipt);
    onCompleted?.(receipt);
  };

  return (
    <View style={styles.inlineSheet}>
      {!completedReceipt ? (
        <View style={styles.inlineBody}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Complete Customer Bill</Text>
              <Text style={styles.sheetSub}>
                {cart.reduce((s, i) => s + i.qty, 0)} items • GST Included
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* Payable Amount Hero */}
          <View style={styles.amountHero}>
            <Text style={styles.amountHeroLabel}>NET BILL PAYABLE</Text>
            <Text style={styles.amountHeroValue}>
              ₹{totals.grandTotal.toFixed(2)}
            </Text>
          </View>

          {/* Segmented Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'UPI' && styles.modeTabActive]}
              onPress={() => setMode('UPI')}
            >
              <QrCode
                size={15}
                color={mode === 'UPI' ? '#18181B' : '#71717A'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'UPI' && { color: '#18181B', fontWeight: '800' },
                ]}
              >
                UPI QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'CASH' && styles.modeTabActive]}
              onPress={() => setMode('CASH')}
            >
              <Banknote
                size={15}
                color={mode === 'CASH' ? '#18181B' : '#71717A'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'CASH' && { color: '#18181B', fontWeight: '800' },
                ]}
              >
                Cash Tender
              </Text>
            </TouchableOpacity>
          </View>

          {/* UPI QR or Cash Input */}
          {mode === 'UPI' ? (
            <View style={styles.qrWrapper}>
              <View style={styles.qrCard}>
                <svg
                  viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                  style={{ width: 146, height: 146 }}
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
                          fill="#18181B"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </View>
              <Text style={styles.qrHint}>
                Scan with GPay, PhonePe, Paytm or BHIM
              </Text>
            </View>
          ) : (
            <View style={styles.cashBox}>
              <Text style={styles.inputLabel}>Cash Received (₹)</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={cashTendered}
                onChangeText={setCashTendered}
                style={styles.cashInput}
              />
              <View style={styles.denomRow}>
                {[Math.ceil(totals.grandTotal), 100, 200, 500]
                  .filter(
                    (v, i, a) => v >= totals.grandTotal && a.indexOf(v) === i
                  )
                  .map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.denomPill}
                      onPress={() => setCashTendered(String(amt))}
                    >
                      <Text style={styles.denomText}>₹{amt}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change to Return</Text>
                <Text style={styles.changeValue}>₹{changeDue.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Confirm Pill CTA Button */}
          {payError !== '' && (
            <View style={styles.payErrorBox}>
              <Text style={styles.payErrorText}>{payError}</Text>
            </View>
          )}

          <TouchableOpacity
            disabled={
              cart.length === 0 ||
              (mode === 'CASH' && numericCash < totals.grandTotal)
            }
            onPress={handlePay}
            style={[
              styles.confirmBtn,
              (cart.length === 0 ||
                (mode === 'CASH' && numericCash < totals.grandTotal)) &&
                styles.confirmBtnDisabled,
            ]}
          >
            <Text style={styles.confirmBtnText}>
              Confirm {mode} Payment & Create Bill
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Clean Digital Thermal Receipt */
        <View style={styles.inlineBody}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={18} color="#2E9E5B" />
              <Text style={styles.sheetTitle}>Bill Generated & Paid</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          <View style={styles.receiptPaper}>
            <Text style={styles.receiptStoreName}>SCANFLOW RETAIL POS</Text>
            <Text style={styles.receiptStoreMeta}>
              GSTIN: 33AABCS1429B1Z5 • Tax Invoice
            </Text>
            <Text style={styles.receiptInvoiceId}>
              {completedReceipt.id} •{' '}
              {new Date(completedReceipt.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <View style={styles.receiptDivider} />

            {completedReceipt.items.map((item) => (
              <View key={item.barcode} style={styles.receiptLineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptItemName}>{item.name}</Text>
                  <Text style={styles.receiptItemSub}>
                    {item.qty} × ₹{Number(item.sellingPrice).toFixed(2)} (GST{' '}
                    {item.gstRate}%)
                  </Text>
                </View>
                <Text style={styles.receiptItemTotal}>
                  ₹{(item.qty * item.sellingPrice).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.receiptDivider} />

            <View style={styles.receiptSummaryRow}>
              <Text style={styles.receiptSummaryLabel}>Subtotal</Text>
              <Text style={styles.receiptSummaryVal}>
                ₹{Number(completedReceipt.subtotal).toFixed(2)}
              </Text>
            </View>
            <View style={styles.receiptSummaryRow}>
              <Text style={styles.receiptSummaryLabel}>Included GST</Text>
              <Text style={styles.receiptSummaryVal}>
                ₹{Number(completedReceipt.gstAmount).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.receiptSummaryRow, { marginTop: 4 }]}>
              <Text style={styles.receiptGrandLabel}>GRAND TOTAL</Text>
              <Text style={styles.receiptGrandVal}>
                ₹{Number(completedReceipt.totalAmount).toFixed(2)}
              </Text>
            </View>

            <View style={styles.receiptDivider} />

            <Text style={styles.receiptPaymentBadge}>
              PAID VIA {completedReceipt.paymentMode}
            </Text>
            <NativeBarcodeGraphic
              code={completedReceipt.id.replace(/[^0-9]/g, '') || '20261045'}
              height={28}
            />
          </View>

          <View style={styles.receiptActionRow}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => window.print()}
            >
              <Printer size={15} color="#18181B" />
              <Text style={styles.printBtnText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Clean 1D Barcode Label Modal for Inventory Products
 */
export function BarcodeStickerModal({ product, onClose, onAddToBill }) {
  if (!product) return null;
  return (
    <Modal visible={Boolean(product)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handleBar} />
        <View style={styles.sheetBody}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>1D Shelf Barcode Sticker</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          <View style={styles.stickerCard}>
            <Text style={styles.stickerProdName}>{product.name}</Text>
            <Text style={styles.stickerProdPrice}>
              MRP ₹{Number(product.sellingPrice).toFixed(2)} (Incl. GST)
            </Text>
            <NativeBarcodeGraphic code={product.barcode} height={54} />
          </View>

          <View style={styles.receiptActionRow}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => window.print()}
            >
              <Printer size={15} color="#18181B" />
              <Text style={styles.printBtnText}>Print Sticker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                onAddToBill(product.barcode);
                onClose();
              }}
            >
              <ShoppingCart size={15} color="#FFFFFF" />
              <Text style={styles.doneBtnText}>Add to POS Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inlineSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EBEBEF',
    paddingBottom: 16,
    width: '100%',
    boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
  },
  inlineBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 24,
    width: '100%',
    boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.12)',
  },
  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E4E7',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: '#18181B',
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSub: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountHero: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  amountHeroLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountHeroValue: {
    color: '#18181B',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F2F2F6',
    padding: 4,
    borderRadius: 999,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  modeTabText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  qrWrapper: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  qrHint: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '500',
  },
  cashBox: {
    gap: 10,
  },
  inputLabel: {
    color: '#52525B',
    fontSize: 12,
    fontWeight: '600',
  },
  cashInput: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#18181B',
    fontSize: 18,
    fontWeight: '800',
  },
  denomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  denomPill: {
    backgroundColor: '#F4F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  denomText: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  changeLabel: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  changeValue: {
    color: '#2E9E5B',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: '#18181B',
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  payErrorBox: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FECDCA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  payErrorText: {
    color: '#B42318',
    fontSize: 11.5,
    fontWeight: '600',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  receiptPaper: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  receiptStoreName: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '800',
  },
  receiptStoreMeta: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  receiptInvoiceId: {
    color: '#3F3F46',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  receiptDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 10,
  },
  receiptLineRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  receiptItemName: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptItemSub: {
    color: '#71717A',
    fontSize: 10,
  },
  receiptItemTotal: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptSummaryRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  receiptSummaryLabel: {
    color: '#52525B',
    fontSize: 11,
  },
  receiptSummaryVal: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '600',
  },
  receiptGrandLabel: {
    color: '#18181B',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptGrandVal: {
    color: '#2E9E5B',
    fontSize: 15,
    fontWeight: '800',
  },
  receiptPaymentBadge: {
    color: '#52525B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  receiptActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#F4F4F6',
  },
  printBtnText: {
    color: '#18181B',
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#18181B',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  stickerCard: {
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  stickerProdName: {
    color: '#18181B',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  stickerProdPrice: {
    color: '#2E9E5B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
});
