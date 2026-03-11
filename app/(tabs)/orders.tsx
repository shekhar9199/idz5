import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Orders as OrdersService, Notifications as NotificationsService } from "@/lib/firestore";
import { cardShadow } from "@/lib/shadows";

interface Order {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  service_name: string;
  plan: string;
  price: string;
  status: string;
  details: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.15)", icon: "time-outline" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "rgba(59,130,246,0.15)", icon: "sync-outline" },
  accepted: { label: "Accepted", color: "#3B82F6", bg: "rgba(59,130,246,0.15)", icon: "checkmark-done-outline" },
  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.15)", icon: "close-circle-outline" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.15)", icon: "close-circle-outline" },
};

const OrderCard = React.memo(function OrderCard({ order, colors, isDark }: { order: Order; colors: any; isDark: boolean }) {
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <View style={[styles.card, { backgroundColor: isDark ? "#111B2E" : "#FFFFFF" }, cardShadow(colors.cardShadow)]}>
      <View style={styles.cardHeader}>
        <View style={styles.serviceInfo}>
          <View style={[styles.serviceIcon, { backgroundColor: isDark ? "rgba(13,148,136,0.15)" : "rgba(13,148,136,0.1)" }]}>
            <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
              {order.service_name}
            </Text>
            <Text style={[styles.planText, { color: colors.textSecondary }]} numberOfLines={1}>
              {order.plan}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
          <Text style={[styles.detailValue, { color: "#0D9488" }]}>Rs. {order.price}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Order ID</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>#{order.id?.slice(-8)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formattedDate}, {formattedTime}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(13,148,136,0.12)" : "rgba(13,148,136,0.08)", flex: 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/order-detail", params: { orderId: order.id } });
          }}
        >
          <Ionicons name="document-text-outline" size={16} color="#0D9488" />
          <Text style={[styles.actionBtnText, { color: "#0D9488" }]}>View Details</Text>
        </Pressable>
        <View style={{ width: 10 }} />
        <Pressable
          style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)", flex: 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/chat", params: { orderChat: "true", orderId: order.id.toString(), orderService: order.service_name, orderPlan: order.plan } });
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Get your Order</Text>
        </Pressable>
      </View>
    </View>
  );
});

export default function OrdersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const hasCachedData = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "accepted", label: "Accepted" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "rejected", label: "Rejected" },
  ];

  const filteredOrders = React.useMemo(() => statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter), [orders, statusFilter]);

  const fetchOrders = useCallback(async (showSpinner: boolean) => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (showSpinner) setLoading(true);
    try {
      const [data, notiData] = await Promise.all([
        OrdersService.getByUser(user.id),
        NotificationsService.getByUser(user.id),
      ]);
      setOrders(data);
      const unread = notiData.filter((n: any) => !n.read);
      const sorted = unread.sort((a: any, b: any) => {
        const ta = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at || 0).getTime();
        const tb = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at || 0).getTime();
        return tb - ta;
      });
      const latest = sorted.slice(0, 3);
      const older = sorted.slice(3);
      setNotifications(latest);
      if (older.length > 0) {
        Promise.all(older.map((n: any) => NotificationsService.markRead(n.id).catch(() => {})));
      }
      hasCachedData.current = true;
      lastUserId.current = user.id;
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      const userChanged = lastUserId.current !== user?.id;
      if (hasCachedData.current && !userChanged) {
        fetchOrders(false);
      } else {
        fetchOrders(true);
      }
    }, [fetchOrders, user?.id])
  );

  const dismissNotification = useCallback(async (notifId: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await NotificationsService.markRead(notifId);
    } catch {}
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchOrders(false);
  };

  const renderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard order={item} colors={colors} isDark={isDark} />
  ), [colors, isDark]);

  function getNotifStyle(notif: any) {
    const t = (notif.title || "") + " " + (notif.message || "");
    if (/cancel/i.test(t) || /rejected/i.test(t))
      return { icon: "close-circle", color: "#EF4444", bg: "rgba(239,68,68,0.15)" };
    if (/spin|unlocked|reward/i.test(t))
      return { icon: "gift", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
    if (/completed|accepted/i.test(t))
      return { icon: "checkmark-circle", color: "#22C55E", bg: "rgba(34,197,94,0.15)" };
    if (/in progress/i.test(t))
      return { icon: "time", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" };
    return { icon: "notifications", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" };
  }

  const keyExtractor = useCallback((item: Order) => item.id, []);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: topPadding + 40, paddingBottom: bottomPadding + 90 }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(13,148,136,0.12)" : "rgba(13,148,136,0.08)" }]}>
            <Ionicons name="lock-closed-outline" size={48} color="#0D9488" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Login Required</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Please login to view your orders
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/auth")}
          >
            <LinearGradient
              colors={["#0D9488", "#065F46"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtnGradient}
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Login</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Track your service requests</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          const filterColor = f.key === "all" ? "#0D9488" : (STATUS_CONFIG[f.key]?.color || "#0D9488");
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(f.key);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active
                    ? filterColor
                    : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: active ? "#FFFFFF" : colors.textSecondary,
                  },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && !hasCachedData.current ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : orders.length === 0 && !loading ? (
        <View style={[styles.emptyContainer, { paddingBottom: insets.bottom + 160 }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(13,148,136,0.12)" : "rgba(13,148,136,0.08)" }]}>
            <Ionicons name="bag-outline" size={48} color="#0D9488" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your service orders will appear here once you book a service
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(tabs)/services");
            }}
          >
            <LinearGradient
              colors={["#0D9488", "#065F46"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtnGradient}
            >
              <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Explore Services</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : filteredOrders.length === 0 && !loading ? (
        <View style={[styles.emptyContainer, { paddingBottom: insets.bottom + 160 }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
            <Ionicons name="filter-outline" size={48} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matching Orders</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No orders found with the selected filter
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStatusFilter("all");
            }}
          >
            <LinearGradient
              colors={["#0D9488", "#065F46"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtnGradient}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Show All Orders</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            notifications.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                {notifications.map((notif) => (
                  <View
                    key={notif.id}
                    style={[
                      styles.notifCard,
                      { backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)", borderColor: isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)" },
                    ]}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: getNotifStyle(notif).bg }]}>
                      <Ionicons name={getNotifStyle(notif).icon as any} size={22} color={getNotifStyle(notif).color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>{notif.title}</Text>
                      <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>{notif.message}</Text>
                    </View>
                    <Pressable
                      onPress={() => dismissNotification(notif.id)}
                      hitSlop={8}
                      style={styles.notifDismiss}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0D9488"
              colors={["#0D9488"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  planText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  cardDetails: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  cardActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  notifDismiss: {
    marginTop: 2,
  },
});
