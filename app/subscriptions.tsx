import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { getOttApps } from "@/lib/admin-storage";
import type { OttApp } from "@/lib/admin-storage";
import { saveSubRequest } from "@/lib/storage";
import { Orders, Wallet, OttApps, Earnings } from "@/lib/firestore";
import { cardShadow } from "@/lib/shadows";

function renderFormattedText(text: string, baseStyle: any) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  lines.forEach((line, li) => {
    if (li > 0) elements.push(<Text key={`br-${li}`}>{"\n"}</Text>);
    const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
    parts.forEach((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        elements.push(<Text key={`${li}-${pi}`} style={[baseStyle, { fontFamily: "Inter_700Bold" }]}>{part.slice(2, -2)}</Text>);
      } else if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
        elements.push(<Text key={`${li}-${pi}`} style={[baseStyle, { fontStyle: "italic" }]}>{part.slice(1, -1)}</Text>);
      } else {
        elements.push(<Text key={`${li}-${pi}`}>{part}</Text>);
      }
    });
  });
  return elements;
}

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [requestedApps, setRequestedApps] = useState<Set<string>>(new Set());
  const [loadingApp, setLoadingApp] = useState<string | null>(null);
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());
  const [apps, setApps] = useState<OttApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOttApps().then((a) => { setApps(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleRequest(app: OttApp) {
    if (!user) return;
    const stock = typeof app.stockCount === "number" ? app.stockCount : parseInt(String(app.stockCount ?? "0"), 10) || 0;
    if (stock <= 0) {
      Alert.alert("Unavailable", "This app is currently out of stock.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingApp(app.id);

    const priceRs = parseInt(app.price.replace(/,/g, ""), 10) || 0;

    try {
      const balance = await Wallet.getRupeeBalance(user.id);
      if (balance < priceRs) {
        Alert.alert(
          "Insufficient Balance",
          `You need \u20B9${priceRs.toLocaleString("en-IN")} but have only \u20B9${balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in your wallet. Please add money first.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Go to Wallet", onPress: () => router.push("/wallet") },
          ]
        );
        setLoadingApp(null);
        return;
      }

      let newStock: number;
      try {
        newStock = await OttApps.decrementStock(app.id);
      } catch {
        Alert.alert("Unavailable", "This app just went out of stock. Please try again later.");
        setLoadingApp(null);
        return;
      }

      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, stockCount: newStock, outOfStock: newStock <= 0 } : a));

      await saveSubRequest({
        appId: app.id,
        appName: app.name,
        userName: user.name,
        userEmail: user.email,
      });
      const order = await Orders.create({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        service_name: "Premium Subscription",
        plan: app.name,
        price: app.price,
        details: `Duration: ${app.durationMonths ? app.durationMonths + " Month(s)" : app.durationYear ? app.durationYear + " Year(s)" : "N/A"} | Paid via Wallet (\u20B9${priceRs})`,
      });

      await Wallet.addRupees(user.id, -priceRs);
      await Wallet.addTransaction({
        userId: user.id,
        type: "deduction",
        coins: 0,
        amountRupees: -priceRs,
        description: `Subscription: ${app.name}`,
        orderId: order.id,
        createdAt: new Date().toISOString(),
      });
      Earnings.distributeCommissions(user.id, order.id, priceRs).catch(() => {});

      setRequestedApps((prev) => new Set(prev).add(app.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Subscribed!", `Your ${app.name} subscription has been purchased for \u20B9${priceRs}.`);
    } catch {
      Alert.alert("Error", "Failed to process. Please try again.");
    } finally {
      setLoadingApp(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Premium Subscriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>
          Get premium app subscriptions at the best prices. Choose your favorite apps below.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
        ) : apps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={48} color={colors.textSecondary + "60"} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No apps available right now</Text>
          </View>
        ) : (
          apps.map((app) => {
            const isRequested = requestedApps.has(app.id);
            const isLoading = loadingApp === app.id;
            const sc = typeof app.stockCount === "number" ? app.stockCount : parseInt(String(app.stockCount ?? "0"), 10) || 0;
            const isOutOfStock = sc <= 0;
            const stockColor = sc <= 0 ? "#EF4444" : sc <= 5 ? "#F59E0B" : "#22C55E";
            const stockLabel = sc <= 0 ? "Out of Stock" : sc <= 5 ? `Only ${sc} left` : `${sc} in stock`;

            return (
              <View key={app.id} style={[styles.appCard, { backgroundColor: colors.card, opacity: isOutOfStock ? 0.75 : 1 }, cardShadow(colors.cardShadow, 4)]}>
                <View style={styles.appCardHeader}>
                  <View style={[styles.appIconContainer, { backgroundColor: app.color + "15" }]}>
                    <MaterialCommunityIcons name={app.icon as any} size={28} color={app.color} />
                  </View>
                  <View style={styles.appInfo}>
                    <Text style={[styles.appName, { color: colors.text }]}>{app.name}</Text>
                    <Text
                      style={[styles.appDesc, { color: colors.textSecondary }]}
                      numberOfLines={expandedDescs.has(app.id) ? undefined : 2}
                    >
                      {app.description ? renderFormattedText(app.description, styles.appDesc) : ""}
                    </Text>
                    {app.description && app.description.length > 60 && (
                      <Pressable
                        onPress={() => {
                          setExpandedDescs((prev) => {
                            const next = new Set(prev);
                            if (next.has(app.id)) next.delete(app.id);
                            else next.add(app.id);
                            return next;
                          });
                        }}
                        hitSlop={6}
                      >
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.tint, marginTop: 2 }}>
                          {expandedDescs.has(app.id) ? "Show less" : "Read more"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stockColor }} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: stockColor }}>{stockLabel}</Text>
                </View>

                <View style={[styles.appCardFooter, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                      {app.durationYear && parseInt(app.durationYear) > 0 ? "Yearly" : app.durationMonths && parseInt(app.durationMonths) > 1 ? `${app.durationMonths} Months` : "Monthly"}
                    </Text>
                    <Text style={[styles.priceValue, { color: colors.text }]}>
                      Rs. {app.price}
                      <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>
                        {app.durationYear && parseInt(app.durationYear) > 0 ? "/yr" : app.durationMonths && parseInt(app.durationMonths) > 1 ? `/${app.durationMonths}mo` : "/mo"}
                      </Text>
                    </Text>
                  </View>
                  {isOutOfStock ? (
                    <View style={[styles.requestButton, { backgroundColor: "#94A3B8" }]}>
                      <Ionicons name="ban-outline" size={16} color="#FFF" />
                      <Text style={[styles.requestText, { color: "#FFF" }]}>Unavailable</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.requestButton,
                        {
                          backgroundColor: isRequested ? colors.success + "15" : colors.tint,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                      onPress={() => handleRequest(app)}
                      disabled={isRequested || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : isRequested ? (
                        <>
                          <Ionicons name="checkmark" size={16} color={colors.success} />
                          <Text style={[styles.requestText, { color: colors.success }]}>Requested</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                          <Text style={[styles.requestText, { color: "#FFFFFF" }]}>Buy Now</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scrollContent: { paddingHorizontal: 20 },
  pageDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 20 },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  appCard: { borderRadius: 18, marginBottom: 14, overflow: "hidden" },
  appCardHeader: { flexDirection: "row", padding: 18, gap: 14 },
  appIconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  appInfo: { flex: 1, justifyContent: "center" },
  appName: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  appDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  appCardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1,
  },
  priceLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  priceValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  priceUnit: { fontSize: 13, fontFamily: "Inter_400Regular" },
  requestButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  requestText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
