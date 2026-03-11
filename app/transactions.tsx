import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Wallet, WalletOrders } from "@/lib/firestore";
import type { WalletTransaction, WalletOrder } from "@/lib/firestore";

const INITIAL_COUNT = 5;

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [pendingOrders, setPendingOrders] = useState<WalletOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [txns, wOrders] = await Promise.all([
        Wallet.getTransactions(user.id),
        WalletOrders.getByUser(user.id),
      ]);
      setTransactions(txns);
      setPendingOrders(wOrders.filter((o) => o.status !== "paid"));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/auth" />;

  const displayTxns = showAll ? transactions : transactions.slice(0, INITIAL_COUNT);
  const hasMore = transactions.length > INITIAL_COUNT && !showAll;
  const remaining = transactions.length - INITIAL_COUNT;

  function formatTxnDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }

  function handleCancelOrder(order: WalletOrder) {
    Alert.alert(
      "Cancel Request",
      `Cancel this \u20B9${order.amount} add money request?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await WalletOrders.delete(order.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadData();
            } catch {
              Alert.alert("Error", "Failed to cancel request. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {error ? (
          <View style={s.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.errorText, { color: colors.text }]}>{error}</Text>
            <Pressable
              style={[s.retryBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setError(null); setLoading(true); loadData(); }}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={s.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
        ) : (pendingOrders.length === 0 && transactions.length === 0) ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9" }]}>
              <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No transactions yet</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>Your transaction history will appear here</Text>
          </View>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>PENDING</Text>
                <View style={[s.txnCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
                  {pendingOrders.map((order, oi) => {
                    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
                      pending: { label: "Pending", color: "#6B7280", bg: "rgba(107,114,128,0.12)", icon: "time-outline" },
                      verification_pending: { label: "Verifying", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "hourglass-outline" },
                      rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: "close-circle-outline" },
                    };
                    const st = statusConfig[order.status] || statusConfig.pending;
                    const handleCardPress = () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (order.status === "pending") {
                        router.push({ pathname: "/upi-payment", params: { amount: String(order.amount), orderId: order.id } });
                      } else if (order.status === "verification_pending") {
                        router.push({ pathname: "/upi-payment", params: { amount: String(order.amount), orderId: order.id, mode: "waiting" } });
                      }
                    };
                    const isClickable = order.status === "pending" || order.status === "verification_pending";
                    return (
                      <View key={order.id}>
                        {oi > 0 && <View style={[s.txnSep, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]} />}
                        <Pressable
                          style={({ pressed }) => [s.txnRow, { opacity: pressed && isClickable ? 0.7 : 1 }]}
                          onPress={isClickable ? handleCardPress : undefined}
                        >
                          <View style={[s.txnIcon, { backgroundColor: st.bg }]}>
                            <Ionicons name={st.icon as any} size={16} color={st.color} />
                          </View>
                          <View style={s.txnInfo}>
                            <Text style={[s.txnDesc, { color: colors.text }]} numberOfLines={1}>Add Money Request</Text>
                            <Text style={[s.txnDate, { color: colors.textSecondary }]}>
                              {formatTxnDate(order.createdAt)}
                              {order.status === "pending" ? "  \u2022  Tap to submit UTR" : ""}
                              {order.status === "verification_pending" ? "  \u2022  Tap to view status" : ""}
                            </Text>
                          </View>
                          <View style={s.txnRight}>
                            <Text style={[s.txnAmount, { color: st.color }]}>{"\u20B9"}{order.amount}</Text>
                            <View style={[s.badge, { backgroundColor: st.bg }]}>
                              <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                            </View>
                          </View>
                        </Pressable>
                        {order.status === "pending" && (
                          <Pressable
                            style={[s.cancelBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)" }]}
                            onPress={() => handleCancelOrder(order)}
                            hitSlop={6}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            <Text style={s.cancelBtnText}>Cancel Request</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {transactions.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>COMPLETED</Text>
                <View style={[s.txnCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
                  {displayTxns.map((txn, i) => {
                    const rupeeAmt = txn.amountRupees != null ? txn.amountRupees : (txn.coins > 0 ? (txn.coins / 100) * 10 : -((Math.abs(txn.coins) / 100) * 10));
                    const isPositive = rupeeAmt > 0 || (txn.type === "admin_credit" || txn.type === "referral_reward" || txn.type === "bonus");
                    const displayAmt = txn.amountRupees != null ? rupeeAmt : Math.abs(rupeeAmt) * (isPositive ? 1 : -1);
                    return (
                      <View key={txn.id}>
                        {i > 0 && <View style={[s.txnSep, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]} />}
                        <View style={s.txnRow}>
                          <View style={[s.txnIcon, { backgroundColor: isPositive ? "#10B98110" : "#EF444410" }]}>
                            <Ionicons
                              name={isPositive ? "arrow-down" : "arrow-up"}
                              size={16}
                              color={isPositive ? "#10B981" : "#EF4444"}
                            />
                          </View>
                          <View style={s.txnInfo}>
                            <Text style={[s.txnDesc, { color: colors.text }]} numberOfLines={1}>{txn.description}</Text>
                            <Text style={[s.txnDate, { color: colors.textSecondary }]}>{formatTxnDate(txn.createdAt)}</Text>
                          </View>
                          <View style={s.txnRight}>
                            <Text style={[s.txnAmount, { color: isPositive ? "#10B981" : "#EF4444" }]}>
                              {isPositive ? "+" : "-"}{"\u20B9"}{Math.abs(displayAmt).toLocaleString("en-IN")}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {hasMore && (
                  <Pressable
                    style={({ pressed }) => [
                      s.showMoreBtn,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAll(true); }}
                  >
                    <Text style={[s.showMoreText, { color: colors.tint }]}>
                      Show {remaining} more transaction{remaining > 1 ? "s" : ""}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.tint} />
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },

  txnCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  txnIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  txnDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txnRight: { alignItems: "flex-end" as const },
  txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txnSep: { height: StyleSheet.hairlineWidth, marginLeft: 66 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, borderRadius: 10, marginHorizontal: 16, marginBottom: 12,
  },
  cancelBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#EF4444" },

  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: 12,
  },
  showMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  errorContainer: { alignItems: "center" as const, paddingVertical: 60 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginTop: 16, marginBottom: 20, paddingHorizontal: 20 },
  retryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
