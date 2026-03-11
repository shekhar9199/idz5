import React, { useState, useEffect } from "react";
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
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { WalletOrders, Settings as SettingsService } from "@/lib/firestore";
import type { WalletOrder } from "@/lib/firestore";

export default function UpiPaymentScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ amount: string; orderId?: string; mode?: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const amount = parseInt(params.amount || "0", 10);
  const existingOrderId = params.orderId;
  const isWaitingMode = params.mode === "waiting";

  const [walletOrder, setWalletOrder] = useState<WalletOrder | null>(null);
  const [creating, setCreating] = useState(true);
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [upiLoading, setUpiLoading] = useState(true);

  useEffect(() => {
    SettingsService.getUpiSettings().then((s) => {
      setUpiId(s.upiId);
      setUpiName(s.upiName);
    }).catch(() => {
      setUpiId("shekhar9267@ibl");
      setUpiName("Shekhar Cricket Club");
    }).finally(() => setUpiLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setCreating(false);
      return;
    }

    if (existingOrderId) {
      (async () => {
        try {
          const order = await WalletOrders.getById(existingOrderId);
          if (order) {
            setWalletOrder(order);
            if (order.utr) {
              setUtr(order.utr);
              setSubmitted(true);
            }
          } else {
            Alert.alert("Error", "Order not found.", [
              { text: "Go Back", onPress: () => router.back() },
            ]);
          }
        } catch {
          Alert.alert("Error", "Failed to load order.", [
            { text: "Go Back", onPress: () => router.back() },
          ]);
        } finally {
          setCreating(false);
        }
      })();
      return;
    }

    if (!amount || amount <= 0) {
      setCreating(false);
      Alert.alert("Invalid Amount", "Please select a valid amount to add.", [
        { text: "Go Back", onPress: () => router.back() },
      ]);
      return;
    }
    (async () => {
      try {
        const order = await WalletOrders.create({
          orderId: `WO-${Date.now()}`,
          userId: user.id,
          userName: user.name || "User",
          userEmail: user.email || "",
          amount,
          status: "pending",
          utr: "",
          createdAt: new Date().toISOString(),
        });
        setWalletOrder(order);
      } catch {
        Alert.alert("Error", "Failed to create order. Please try again.", [
          { text: "Go Back", onPress: () => router.back() },
        ]);
      } finally {
        setCreating(false);
      }
    })();
  }, [user, amount, existingOrderId]);

  function handlePayViaUPI() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Wallet Recharge ${walletOrder?.orderId || ""}`)}`;
    Linking.openURL(upiUrl).catch(() => {
      Alert.alert("No UPI App Found", "Please install a UPI app (GPay, PhonePe, Paytm) or pay manually using the UPI ID shown.");
    });
  }

  async function handleCopyUPI() {
    await Clipboard.setStringAsync(upiId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied", "UPI ID copied to clipboard");
  }

  async function handleSubmitUTR() {
    if (!utr.trim() || utr.trim().length < 6) {
      Alert.alert("Invalid UTR", "Please enter a valid UTR/Transaction ID (at least 6 characters)");
      return;
    }
    if (!walletOrder) return;

    Alert.alert(
      "Confirm UTR Submission",
      `UTR: ${utr.trim()}\nAmount: \u20B9${amount}\n\nOnce submitted, our team will verify your payment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await WalletOrders.updateUtr(walletOrder.id, utr.trim());
              setSubmitted(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("Error", "Failed to submit UTR. Please try again.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  if (creating || upiLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{upiLoading ? "Loading payment details..." : "Creating order..."}</Text>
      </View>
    );
  }

  const displayAmount = walletOrder?.amount || amount;

  if ((submitted || isWaitingMode) && walletOrder) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.replace("/wallet")} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Status</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.waitingScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.waitingPulse, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
            <View style={[styles.waitingPulseInner, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
              <Ionicons name="hourglass-outline" size={48} color="#F59E0B" />
            </View>
          </View>
          <Text style={[styles.waitingTitle, { color: colors.text }]}>Verification In Progress</Text>
          <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
            Our team is verifying your payment. The amount will be credited to your wallet once confirmed.
          </Text>

          <View style={[styles.waitingCard, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border }]}>
            <View style={styles.waitingAmountRow}>
              <Text style={[styles.waitingAmountLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.waitingAmountValue, { color: colors.tint }]}>{"\u20B9"}{displayAmount}</Text>
            </View>
            <View style={[styles.detailSep, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Order ID</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{walletOrder?.orderId}</Text>
            </View>
            <View style={[styles.detailSep, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>UTR</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{utr || walletOrder?.utr}</Text>
            </View>
            <View style={[styles.detailSep, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={{ backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#F59E0B" }}>Verifying</Text>
              </View>
            </View>
          </View>

          <View style={[styles.waitingTimeline, { borderLeftColor: colors.border }]}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: "#10B981" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineTitle, { color: colors.text }]}>Payment Made</Text>
                <Text style={[styles.timelineSub, { color: colors.textSecondary }]}>UPI payment completed</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: "#10B981" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineTitle, { color: colors.text }]}>UTR Submitted</Text>
                <Text style={[styles.timelineSub, { color: colors.textSecondary }]}>Transaction reference shared</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDotActive, { borderColor: "#F59E0B" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineTitle, { color: "#F59E0B" }]}>Under Verification</Text>
                <Text style={[styles.timelineSub, { color: colors.textSecondary }]}>Team is reviewing your payment</Text>
              </View>
              <ActivityIndicator size="small" color="#F59E0B" />
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDotPending, { borderColor: colors.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineTitle, { color: colors.textSecondary }]}>Wallet Credited</Text>
                <Text style={[styles.timelineSub, { color: colors.textSecondary }]}>Balance added to your wallet</Text>
              </View>
            </View>
          </View>

          <View style={[styles.noteBox, { backgroundColor: isDark ? "#78350F20" : "#FFFBEB", borderColor: "#F59E0B40" }]}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
            <Text style={[styles.noteText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
              Usually takes 5-10 minutes. Contact support if not credited within 30 minutes.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1, marginTop: 20 }]}
            onPress={() => router.replace("/wallet")}
          >
            <Text style={styles.doneBtnText}>Back to Wallet</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>UPI Payment</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.amountCard, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to Pay</Text>
          <Text style={[styles.amountValue, { color: colors.tint }]}>{"\u20B9"}{amount}</Text>
          <Text style={[styles.orderId, { color: colors.textSecondary }]}>Order: {walletOrder?.orderId}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Step 1: Pay via UPI</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Copy the UPI ID below, open any UPI app (GPay, PhonePe, Paytm), and send {"\u20B9"}{displayAmount} to this ID.
          </Text>

          <Pressable
            style={[styles.upiIdRow, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9", borderColor: colors.border }]}
            onPress={handleCopyUPI}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.upiIdLabel, { color: colors.textSecondary }]}>UPI ID</Text>
              <Text style={[styles.upiIdValue, { color: colors.text }]}>{upiId}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 3 }}>Pay to: {upiName}</Text>
            </View>
            <Pressable
              style={[styles.copyBtnLarge, { backgroundColor: colors.tint }]}
              onPress={handleCopyUPI}
            >
              <Ionicons name="copy-outline" size={16} color="#FFF" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" }}>Copy</Text>
            </Pressable>
          </Pressable>

          <View style={[styles.howToBox, { backgroundColor: isDark ? "#0F172A" : "#F0F9FF", borderColor: isDark ? "#1E3A5F" : "#BAE6FD" }]}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.tint, marginBottom: 8 }}>How to pay:</Text>
            {[
              "Copy the UPI ID above",
              "Open GPay / PhonePe / Paytm / any UPI app",
              `Send exactly \u20B9${displayAmount} to the copied UPI ID`,
              "Note down your UTR / Transaction ID",
              "Come back here and enter it below",
            ].map((step, i) => (
              <View key={i} style={styles.howToStep}>
                <View style={[styles.howToNum, { backgroundColor: colors.tint }]}>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: 17 }}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.orDivider]}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textSecondary }]}>OR TRY QUICK PAY</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.quickPayBtn, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={handlePayViaUPI}
          >
            <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Open UPI App Directly</Text>
          </Pressable>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", marginTop: 6 }}>
            May not work with all UPI apps due to security policies
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Step 2: Enter UTR / Transaction ID</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            After completing payment, enter your UTR or Transaction Reference Number below for verification.
          </Text>

          <View style={[styles.utrInputWrap, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9", borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.utrInput, { color: colors.text }]}
              placeholder="Enter UTR / Transaction ID"
              placeholderTextColor={colors.textSecondary}
              value={utr}
              onChangeText={setUtr}
              autoCapitalize="characters"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: utr.trim().length >= 6 ? "#10B981" : isDark ? "#374151" : "#D1D5DB",
                opacity: pressed && utr.trim().length >= 6 ? 0.85 : 1,
              },
            ]}
            onPress={handleSubmitUTR}
            disabled={utr.trim().length < 6 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={[styles.submitBtnText, { color: utr.trim().length >= 6 ? "#FFF" : colors.textSecondary }]}>
                Submit for Verification
              </Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.noteBox, { backgroundColor: isDark ? "#78350F20" : "#FFFBEB", borderColor: "#F59E0B40" }]}>
          <Ionicons name="information-circle-outline" size={18} color="#F59E0B" />
          <Text style={[styles.noteText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
            Your wallet will be credited within 10 minutes after verification. Contact support if not credited within 30 minutes.
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
  loadingText: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 12 },

  amountCard: {
    alignItems: "center", paddingVertical: 24, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  amountLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  amountValue: { fontSize: 36, fontFamily: "Inter_700Bold" },
  orderId: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },

  section: {
    borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, lineHeight: 18 },

  copyBtnLarge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  howToBox: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 14,
  },
  howToStep: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8,
  },
  howToNum: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  quickPayBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },

  orDivider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 11, fontFamily: "Inter_500Medium", marginHorizontal: 10 },

  upiIdRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  upiIdLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  upiIdValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  copyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  copyText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  upiName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "center" },

  utrInputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 14,
  },
  utrInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  submitBtn: { alignItems: "center", paddingVertical: 15, borderRadius: 12 },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  noteBox: {
    flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  waitingScroll: { paddingHorizontal: 20, paddingTop: 30, alignItems: "center" },
  waitingPulse: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  waitingPulseInner: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  waitingTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  waitingDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  waitingCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  waitingAmountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  waitingAmountLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  waitingAmountValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  waitingTimeline: { width: "100%", borderLeftWidth: 2, paddingLeft: 20, marginBottom: 20, marginLeft: 10 },
  timelineItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, position: "relative" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, position: "absolute", left: -27 },
  timelineDotActive: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, position: "absolute", left: -27, backgroundColor: "transparent" },
  timelineDotPending: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, position: "absolute", left: -27, backgroundColor: "transparent" },
  timelineTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  timelineSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  detailSep: { height: StyleSheet.hairlineWidth },
  doneBtn: { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 14, alignItems: "center", width: "100%" },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
