import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Orders as OrdersService } from "@/lib/firestore";
import { cardShadow } from "@/lib/shadows";

const STATUS_CONFIG: Record<string, { label: string; color: string; gradient: [string, string]; icon: string; desc: string }> = {
  pending: { label: "Pending", color: "#F59E0B", gradient: ["#F59E0B", "#D97706"], icon: "time-outline", desc: "Your order is being reviewed" },
  accepted: { label: "Accepted", color: "#3B82F6", gradient: ["#3B82F6", "#2563EB"], icon: "checkmark-done-outline", desc: "Your order has been accepted" },
  in_progress: { label: "In Progress", color: "#3B82F6", gradient: ["#3B82F6", "#2563EB"], icon: "sync-outline", desc: "Your order is being processed" },
  completed: { label: "Completed", color: "#10B981", gradient: ["#10B981", "#059669"], icon: "checkmark-circle-outline", desc: "Your order has been completed" },
  rejected: { label: "Rejected", color: "#EF4444", gradient: ["#EF4444", "#DC2626"], icon: "close-circle-outline", desc: "This order has been rejected" },
  cancelled: { label: "Cancelled", color: "#EF4444", gradient: ["#EF4444", "#DC2626"], icon: "close-circle-outline", desc: "This order has been cancelled" },
};

export default function OrderDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 20 : insets.top;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user?.id) return;
    OrdersService.getByUser(user.id).then((userOrders) => {
      const found = userOrders.find((o: any) => o.id === orderId);
      setOrder(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orderId, user?.id]);

  function copyOrderId() {
    if (!order) return;
    Clipboard.setStringAsync(order.id?.slice(-8) || order.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const cardBg = isDark ? "#111B2E" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Order not found</Text>
        </View>
      </View>
    );
  }

  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const detailParts: { label: string; value: string }[] = [];
  if (order.details) {
    order.details.split(" | ").forEach((part: string) => {
      const idx = part.indexOf(": ");
      if (idx > -1) {
        detailParts.push({ label: part.slice(0, idx).trim(), value: part.slice(idx + 2).trim() });
      } else {
        detailParts.push({ label: "Info", value: part.trim() });
      }
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <LinearGradient
          colors={statusInfo.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusIconWrap}>
            <Ionicons name={statusInfo.icon as any} size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusDesc}>{statusInfo.desc}</Text>
          </View>
        </LinearGradient>

        {order.cancellationReason && (order.status === "cancelled" || order.status === "rejected") && (
          <View style={[styles.card, { backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }, cardShadow(colors.cardShadow)]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="information-circle" size={18} color="#EF4444" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#EF4444" }}>Reason</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 20 }}>{order.cancellationReason}</Text>
          </View>
        )}

        <View style={[styles.serviceCard, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{order.service_name}</Text>
          <View style={styles.serviceMeta}>
            <View style={[styles.planBadge, { backgroundColor: isDark ? "rgba(13,148,136,0.12)" : "rgba(13,148,136,0.08)" }]}>
              <Ionicons name="layers-outline" size={12} color="#0D9488" />
              <Text style={styles.planBadgeText}>{order.plan}</Text>
            </View>
            <Text style={[styles.priceValue]}>Rs. {typeof order.price === "number" ? order.price.toLocaleString("en-IN") : order.price}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.summaryGrid}>
            <Pressable style={[styles.summaryItem, { borderColor }]} onPress={copyOrderId}>
              <Ionicons name="receipt-outline" size={14} color="#6366F1" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Order ID</Text>
              <View style={styles.summaryValueRow}>
                <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>#{order.id?.slice(-8)}</Text>
                <Ionicons name="copy-outline" size={10} color="#0D9488" />
              </View>
            </Pressable>
            <View style={[styles.summaryItem, { borderColor }]}>
              <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formattedDate}</Text>
            </View>
            <View style={[styles.summaryItem, { borderColor }]}>
              <Ionicons name="time-outline" size={14} color="#3B82F6" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formattedTime}</Text>
            </View>
            <View style={[styles.summaryItem, { borderColor }]}>
              <Ionicons name="wallet-outline" size={14} color="#10B981" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Payment</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>Wallet</Text>
            </View>
          </View>
        </View>

        {detailParts.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Plan Details</Text>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.detailsGrid}>
              {detailParts.map((d, i) => (
                <View key={i} style={[styles.detailCell, { borderColor }]}>
                  <Text style={[styles.detailCellLabel, { color: colors.textSecondary }]}>{d.label}</Text>
                  <Text style={[styles.detailCellValue, { color: colors.text }]}>{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer</Text>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.customerRow}>
            <View style={[styles.customerAvatar, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)" }]}>
              <Ionicons name="person" size={16} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: colors.text }]}>{order.user_name}</Text>
              <Text style={[styles.customerEmail, { color: colors.textSecondary }]}>{order.user_email}</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.chatBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/chat", params: { orderChat: "true", orderId: order.id.toString(), orderService: order.service_name, orderPlan: order.plan } });
          }}
        >
          <LinearGradient colors={["#0D9488", "#065F46"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatBtnGradient}>
            <View style={styles.chatBtnContent}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <View>
                <Text style={styles.chatBtnTitle}>Track your Service Request</Text>
                <Text style={styles.chatBtnSub}>Chat with us for help</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    gap: 14,
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  statusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },

  serviceCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  serviceName: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 10 },
  serviceMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  planBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0D9488" },
  priceValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#0D9488" },

  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  divider: { height: 1, marginVertical: 14 },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryItem: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCell: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  detailCellLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  detailCellValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  customerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  customerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customerEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  chatBtn: { borderRadius: 18, overflow: "hidden" },
  chatBtnGradient: { paddingVertical: 16, paddingHorizontal: 20 },
  chatBtnContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  chatBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  chatBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 1 },
});
