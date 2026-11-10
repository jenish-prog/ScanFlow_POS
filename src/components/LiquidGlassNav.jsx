import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { Receipt, Package, BarChart2, Banknote, QrCode } from 'lucide-react';

const TABS = [
  { id: 'POS', label: 'POS Bill', Icon: Receipt },
  { id: 'CATALOG', label: 'Catalog', Icon: Package },
  { id: 'ANALYTICS', label: 'Analytics', Icon: BarChart2 },
];

/**
 * Responsive Fixed Bottom Navigation Bar & POS Quick Checkout Dock
 * Stays permanently fixed at the bottom with safe-area spacing across all mobile screen sizes.
 */
export default function LiquidGlassNav({
  activeTab,
  onSelectTab,
  cartCount = 0,
  cartTotal = 0,
  lowStockCount = 0,
  onOpenCashBill,
  onOpenUpiBill,
}) {
  const handleTabPress = (tabId) => {
    Vibration.vibrate(10);
    onSelectTab(tabId);
  };

  return (
    <View style={styles.fixedDockContainer}>
      {/* 1. Quick Checkout Action Row - Fixed directly above tabs when on POS and cart has items */}
      {activeTab === 'POS' && cartCount > 0 && (
        <View style={styles.checkoutBar}>
          <TouchableOpacity
            style={styles.cashBtn}
            activeOpacity={0.8}
            onPress={onOpenCashBill}
          >
            <Banknote size={15} color="#18181B" strokeWidth={2.2} />
            <Text style={styles.cashBtnText}>Cash Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.upiBtn}
            activeOpacity={0.8}
            onPress={onOpenUpiBill}
          >
            <QrCode size={15} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.upiBtnText}>
              UPI QR Bill • ₹{Math.round(cartTotal)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Responsive Bottom Navigation Tabs */}
      <View style={styles.tabBarRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.Icon;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => handleTabPress(tab.id)}
              style={styles.tabButton}
            >
              {/* Centered Icon with active pill indicator */}
              <View
                style={[
                  styles.iconPill,
                  isActive && styles.iconPillActive,
                ]}
              >
                <IconComp
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.9}
                  color={isActive ? '#18181B' : '#71717A'}
                />

                {tab.id === 'POS' && cartCount > 0 && (
                  <View style={styles.badgeDotGreen}>
                    <Text style={styles.badgeDotText}>{cartCount}</Text>
                  </View>
                )}
                {tab.id === 'CATALOG' && lowStockCount > 0 && (
                  <View style={styles.badgeDotAmber}>
                    <Text style={styles.badgeDotText}>{lowStockCount}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedDockContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 600,
    marginHorizontal: 'auto',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)',
    zIndex: 50,
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    backgroundColor: '#FFFFFF',
  },
  cashBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 8,
  },
  cashBtnText: {
    color: '#18181B',
    fontSize: 13,
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  upiBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#18181B',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
    paddingHorizontal: 8,
  },
  upiBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 12,
    paddingVertical: 2,
  },
  tabButtonActive: {
    backgroundColor: '#F4F4F5',
  },
  iconPill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: '#F4F4F5',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
    whiteSpace: 'nowrap',
  },
  tabLabelActive: {
    color: '#18181B',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#71717A',
    fontWeight: '500',
  },
  badgeDotGreen: {
    position: 'absolute',
    top: -3,
    right: 2,
    backgroundColor: '#10B981',
    borderRadius: 999,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotAmber: {
    position: 'absolute',
    top: -3,
    right: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 999,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
});
