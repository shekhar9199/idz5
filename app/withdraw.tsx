import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { router, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Users, Wallet, Withdrawals, Settings as SettingsService } from "@/lib/firestore";
import type { WithdrawalRequest } from "@/lib/firestore";

const MIN_WITHDRAWAL = 200;
const INITIAL_COUNT = 5;

export default function WithdrawScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [walletBalance, setWalletBalance] = useState(0);
  const [taxPercent, setTaxPercent] = useState(18);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [prof, tax, pending, hist] = await Promise.all([
        Users.getById(user.id),
        SettingsService.getWithdrawalTaxPercent(),
        Withdrawals.hasPendingWithdrawal(user.id),
        Withdrawals.getByUser(user.id),
      ]);
      setWalletBalance(prof?.walletBalance || 0);
      setTaxPercent(tax);
      setHasPending(pending);
      setHistory(hist);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/auth" />;

  const amountNum = parseInt(amount, 10) || 0;
  const taxAmount = Math.round((amountNum * taxPercent) / 100 * 100) / 100;
  const finalAmount = Math.round((amountNum - taxAmount) * 100) / 100;
  const isValid = amountNum >= MIN_WITHDRAWAL && amountNum <= walletBalance && upiId.trim().length >= 5 && !hasPending;

  function handleAmountChange(text: string) {
    setAmount(text.replace(/[^0-9]/g, ""));
  }

  async function handleSubmit() {
    if (!user || !isValid) return;
    Keyboard.dismiss();

    if (hasPending) {
      Alert.alert("Pending Request", "You already have a pending withdrawal request. Please wait for it to be processed.");
      return;
    }

    if (amountNum > walletBalance) {
      Alert.alert("Insufficient Balance", `Your wallet balance is \u20B9${walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    if (amountNum < MIN_WITHDRAWAL) {
      Alert.alert("Minimum Amount", `Minimum withdrawal is \u20B9${MIN_WITHDRAWAL}.`);
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Amount: \u20B9${amountNum.toLocaleString("en-IN")}\nTax (${taxPercent}%): -\u20B9${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nYou'll receive: \u20B9${finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nUPI: ${upiId.trim()}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSubmitting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await Wallet.addRupees(user.id, -amountNum);

              try {
                await Wallet.addTransaction({
                  userId: user.id,
                  type: "withdrawal",
                  coins: 0,
                  amountRupees: -amountNum,
                  description: `Withdrawal request - \u20B9${amountNum} (UPI: ${upiId.trim()})`,
                  createdAt: new Date().toISOString(),
                });

                await Withdrawals.create({
                  userId: user.id,
                  userName: user.name || "",
                  userEmail: user.email || "",
                  amount: amountNum,
                  taxPercent,
                  taxAmount,
                  finalAmount,
                  upiId: upiId.trim(),
                  status: "pending",
                });
              } catch {
                await Wallet.addRupees(user.id, amountNum);
                throw new Error("Failed to create withdrawal request");
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Request Submitted", `Your withdrawal of \u20B9${finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been submitted. It will be processed after admin approval.`);
              setAmount("");
              setUpiId("");
              await loadData();
            } catch {
              Alert.alert("Error", "Something went wrong. Please try again.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }

  const statusColors: Record<string, string> = {
    pending: "#F59E0B",
    approved: "#10B981",
    failed: "#EF4444",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Withdraw Money</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} progressBackgroundColor={colors.card} />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              <Pressable
                style={[styles.errorRetryBtn, { backgroundColor: colors.tint }]}
                onPress={() => { setError(null); setLoading(true); loadData(); }}
              >
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.errorRetryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <View style={[styles.balanceCard, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border }]}>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Available Balance</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.balanceAmount, { color: colors.text }]}>{"\u20B9"}{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>

              {hasPending && (
                <View style={[styles.warningCard, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
                  <Ionicons name="time-outline" size={18} color="#F59E0B" />
                  <Text style={[styles.warningText, { color: "#F59E0B" }]}>
                    You have a pending withdrawal request. Please wait for it to be processed.
                  </Text>
                </View>
              )}

              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Withdrawal Amount</Text>
                <View style={[styles.inputWrap, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: colors.border }]}>
                  <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>{"\u20B9"}</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder={`Min \u20B9${MIN_WITHDRAWAL}`}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    value={amount}
                    onChangeText={handleAmountChange}
                    editable={!hasPending}
                  />
                </View>
                {amountNum > 0 && amountNum < MIN_WITHDRAWAL && (
                  <Text style={styles.errorHint}>Minimum withdrawal is {"\u20B9"}{MIN_WITHDRAWAL}</Text>
                )}
                {amountNum > walletBalance && (
                  <Text style={styles.errorHint}>Amount exceeds your balance</Text>
                )}

                <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 16 }]}>UPI ID</Text>
                <View style={[styles.inputWrap, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: colors.border }]}>
                  <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="yourname@upi"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={upiId}
                    onChangeText={setUpiId}
                    editable={!hasPending}
                  />
                </View>

                {amountNum >= MIN_WITHDRAWAL && amountNum <= walletBalance && (
                  <View style={[styles.breakdownCard, { backgroundColor: isDark ? "#06492420" : "#ECFDF5", borderColor: isDark ? "#10B98130" : "#10B98140" }]}>
                    <Text style={[styles.breakdownTitle, { color: colors.text }]}>Tax Breakdown</Text>
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Amount</Text>
                      <Text style={[styles.breakdownValue, { color: colors.text }]}>{"\u20B9"}{amountNum.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: "#EF4444" }]}>Tax ({taxPercent}%)</Text>
                      <Text style={[styles.breakdownValue, { color: "#EF4444" }]}>-{"\u20B9"}{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownFinalLabel, { color: "#10B981" }]}>You'll Receive</Text>
                      <Text style={[styles.breakdownFinalValue, { color: "#10B981" }]}>{"\u20B9"}{finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    {
                      backgroundColor: isValid ? colors.tint : isDark ? "#374151" : "#D1D5DB",
                      opacity: pressed && isValid ? 0.85 : 1,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={!isValid || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={[styles.submitText, { color: isValid ? "#FFF" : colors.textSecondary }]}>
                      {hasPending ? "Withdrawal Pending..." : isValid ? `Withdraw \u20B9${finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Enter details to withdraw"}
                    </Text>
                  )}
                </Pressable>
              </View>

              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Withdrawal History</Text>
                  <View style={[styles.historyCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
                    {(showAllHistory ? history : history.slice(0, INITIAL_COUNT)).map((w, i) => (
                      <View key={w.id}>
                        {i > 0 && <View style={[styles.sep, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }]} />}
                        <View style={styles.historyRow}>
                          <View style={[styles.historyIcon, { backgroundColor: (statusColors[w.status] || "#999") + "15" }]}>
                            <Ionicons
                              name={w.status === "approved" ? "checkmark-circle" : w.status === "failed" ? "close-circle" : "time"}
                              size={18}
                              color={statusColors[w.status] || "#999"}
                            />
                          </View>
                          <View style={styles.historyInfo}>
                            <Text style={[styles.historyAmount, { color: colors.text }]}>{"\u20B9"}{typeof w.amount === "number" ? w.amount.toLocaleString("en-IN") : w.amount} → {"\u20B9"}{w.finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>{w.upiId} · {formatDate(w.createdAt)}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: (statusColors[w.status] || "#999") + "15" }]}>
                            <Text style={[styles.statusText, { color: statusColors[w.status] || "#999" }]}>
                              {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  {history.length > INITIAL_COUNT && !showAllHistory && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.showMoreBtn,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
                          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAllHistory(true); }}
                    >
                      <Text style={[styles.showMoreText, { color: colors.tint }]}>
                        Show {history.length - INITIAL_COUNT} more withdrawal{history.length - INITIAL_COUNT > 1 ? "s" : ""}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.tint} />
                    </Pressable>
                  )}
                </View>
              )}

              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  balanceCard: {
    alignItems: "center", paddingVertical: 24, borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  balanceLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  balanceAmount: { fontSize: 32, fontFamily: "Inter_700Bold" },

  warningCard: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },

  formCard: {
    padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  formLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 50, gap: 8,
  },
  inputPrefix: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  inputField: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  errorHint: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#EF4444", marginTop: 6 },

  breakdownCard: {
    padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 18,
  },
  breakdownTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  breakdownLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  breakdownValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  breakdownDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  breakdownFinalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  breakdownFinalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },

  submitBtn: { alignItems: "center", paddingVertical: 16, borderRadius: 14, marginTop: 18 },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  historySection: { marginBottom: 10 },
  historyCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 14 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1 },
  historyAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: 12,
  },
  showMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  errorContainer: { alignItems: "center" as const, paddingVertical: 60 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginTop: 16, marginBottom: 20, paddingHorizontal: 20 },
  errorRetryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorRetryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
