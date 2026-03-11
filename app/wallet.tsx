import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Users } from "@/lib/firestore";

const PRESETS = [50, 100, 200, 500, 1000];
const MIN_ADD_AMOUNT = 50;

export default function WalletScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addMoneyVisible, setAddMoneyVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  const loadWalletData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const prof = await Users.getById(user.id);
      setWalletBalance(prof?.walletBalance || 0);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [loadWalletData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadWalletData();
    setRefreshing(false);
  }, [loadWalletData]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/auth" />;

  const rupeeBalance = walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payAmount = parseInt(customAmount, 10) || 0;

  function handlePresetTap(amount: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(amount);
    setCustomAmount(String(amount));
  }

  function handleCustomChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, "");
    setCustomAmount(cleaned);
    const num = parseInt(cleaned, 10);
    if (PRESETS.includes(num)) {
      setSelectedPreset(num);
    } else {
      setSelectedPreset(null);
    }
  }


  function handleProceedPay() {
    if (payAmount < MIN_ADD_AMOUNT) {
      Alert.alert("Minimum Amount", `Minimum add amount is \u20B9${MIN_ADD_AMOUNT}.`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setAddMoneyVisible(false);
    setSelectedPreset(null);
    setCustomAmount("");
    router.push({ pathname: "/upi-payment", params: { amount: String(payAmount) } });
  }

  function handleCloseSheet() {
    Keyboard.dismiss();
    setAddMoneyVisible(false);
    setSelectedPreset(null);
    setCustomAmount("");
  }



  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Wallet</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/transactions"); }}
          hitSlop={12}
          style={s.headerIcon}
        >
          <Ionicons name="receipt-outline" size={22} color={colors.text} />
        </Pressable>
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
              onPress={() => { setError(null); setLoading(true); loadWalletData(); }}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={s.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
        <>
        <LinearGradient
          colors={isDark ? ["#0F2940", "#1A3A5C", "#0D2137"] : ["#1E40AF", "#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.mainCard}
        >
          <View style={s.mainCardInner}>
            <Text style={s.mainCardLabel}>Available Balance</Text>
            {loading ? (
              <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" style={{ marginVertical: 16 }} />
            ) : (
              <Text style={s.mainCardAmount}>{"\u20B9"}{rupeeBalance}</Text>
            )}
          </View>

          <View style={s.mainDeco1} />
          <View style={s.mainDeco2} />
          <View style={s.mainDeco3} />
        </LinearGradient>

        <Pressable
          style={({ pressed }) => [s.inviteBar, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/invite-earn"); }}
        >
          <LinearGradient
            colors={["#7C3AED", "#9333EA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.inviteGradient}
          >
            <View style={s.inviteIconBg}>
              <Ionicons name="gift" size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inviteTitle}>Invite & Earn Coins</Text>
              <Text style={s.inviteSub}>Share your code & earn rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        <View style={s.bottomActions}>
          <View style={s.bottomBtnRow}>
            <Pressable
              style={({ pressed }) => [s.bottomBtn, s.bottomBtnAdd, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAddMoneyVisible(true); }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={s.bottomBtnText}>Add Money</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.bottomBtn, s.bottomBtnWithdraw, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/withdraw"); }}
            >
              <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
              <Text style={s.bottomBtnText}>Withdraw</Text>
            </Pressable>
          </View>
          <View style={s.safeSecure}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
            <Text style={[s.safeSecureText, { color: colors.textSecondary }]}>Safe & Secure Transactions</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
        </>
        )}
      </ScrollView>

      {addMoneyVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={s.sheetBackdrop} onPress={handleCloseSheet} />
          <KeyboardAvoidingView
            style={s.sheetKAV}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View
              style={[
                s.sheetBox,
                {
                  backgroundColor: isDark ? "#111827" : "#FFF",
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={[s.sheetHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />

              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.sheetContent}
              >
                <Text style={[s.sheetTitle, { color: colors.text }]}>Add Money to Wallet</Text>

                <View style={s.presetGrid}>
                  {PRESETS.map((amt) => (
                    <Pressable
                      key={amt}
                      style={[
                        s.presetChip,
                        {
                          backgroundColor: selectedPreset === amt ? colors.tint + "15" : isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
                          borderColor: selectedPreset === amt ? colors.tint : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        },
                      ]}
                      onPress={() => handlePresetTap(amt)}
                    >
                      <Text style={[s.presetText, { color: selectedPreset === amt ? colors.tint : colors.text }]}>
                        {"\u20B9"}{amt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[s.customInputWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}
                  onPress={() => inputRef.current?.focus()}
                >
                  <Text style={[s.customPrefix, { color: colors.textSecondary }]}>{"\u20B9"}</Text>
                  <TextInput
                    ref={inputRef}
                    style={[s.customInput, { color: colors.text }]}
                    placeholder="Enter custom amount"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    value={customAmount}
                    onChangeText={handleCustomChange}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    s.proceedBtn,
                    {
                      backgroundColor: payAmount >= MIN_ADD_AMOUNT ? colors.tint : isDark ? "#374151" : "#D1D5DB",
                      opacity: pressed && payAmount >= MIN_ADD_AMOUNT ? 0.85 : 1,
                    },
                  ]}
                  onPress={handleProceedPay}
                  disabled={payAmount < MIN_ADD_AMOUNT}
                >
                  <Text style={[s.proceedText, { color: payAmount >= MIN_ADD_AMOUNT ? "#FFF" : colors.textSecondary }]}>
                    {payAmount >= MIN_ADD_AMOUNT ? `Proceed to Pay \u20B9${payAmount}` : `Min \u20B9${MIN_ADD_AMOUNT} required`}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
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
  headerIcon: { padding: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  mainCard: { borderRadius: 24, marginBottom: 16, overflow: "hidden" },
  mainCardInner: { padding: 24, alignItems: "center", zIndex: 1 },
  mainCardLabel: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
  },
  mainCardAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#FFF", marginBottom: 24 },
  mainDeco1: {
    position: "absolute", top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mainDeco2: {
    position: "absolute", bottom: -30, left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  mainDeco3: {
    position: "absolute", top: 20, left: -20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.02)",
  },

  inviteBar: { marginBottom: 20, borderRadius: 16, overflow: "hidden" },
  inviteGradient: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  inviteIconBg: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  inviteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  inviteSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 1 },

  bottomActions: { marginTop: 8, marginBottom: 8 },
  bottomBtnRow: { flexDirection: "row", gap: 12 },
  bottomBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  bottomBtnAdd: { backgroundColor: "rgba(16,185,129,0.85)" },
  bottomBtnWithdraw: { backgroundColor: "rgba(239,68,68,0.8)" },
  bottomBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  safeSecure: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 14,
  },
  safeSecureText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetKAV: { flex: 1, justifyContent: "flex-end" },
  sheetBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", overflow: "hidden",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 6 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 18 },

  presetGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  presetChip: {
    flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  presetText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  customInputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, height: 52, marginBottom: 18,
  },
  customPrefix: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  customInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },

  proceedBtn: {
    alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 16,
  },
  proceedText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  errorContainer: { alignItems: "center" as const, paddingVertical: 60 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginTop: 16, marginBottom: 20, paddingHorizontal: 20 },
  retryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
