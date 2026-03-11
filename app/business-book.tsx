import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useAdmin } from "@/lib/admin-context";
import { useTheme } from "@/lib/useTheme";
import { Orders as OrdersService, Expenses } from "@/lib/firestore";
import type { OrderData, ExpenseData } from "@/lib/firestore";
import { cardShadow } from "@/lib/shadows";

type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";
type ViewTab = "overview" | "orders" | "expenses";

const EXPENSE_CATEGORIES = ["Operations", "Marketing", "Software", "Salaries", "Infrastructure", "Other"];

function getDateRange(filter: DateFilter, customStart?: Date, customEnd?: Date): { start: Date | null; end: Date | null } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  switch (filter) {
    case "today":
      return { start: todayStart, end: todayEnd };
    case "week": {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: todayEnd };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: todayEnd };
    }
    case "custom":
      return { start: customStart || null, end: customEnd || todayEnd };
    default:
      return { start: null, end: null };
  }
}

function isInRange(dateStr: string, start: Date | null, end: Date | null): boolean {
  if (!start) return true;
  const d = new Date(dateStr);
  if (end) return d >= start && d <= end;
  return d >= start;
}

function formatCurrency(val: number): string {
  return "Rs. " + val.toLocaleString("en-IN");
}

export default function BusinessBookScreen() {
  const { colors, isDark } = useTheme();
  const { isAdmin, isAdminLoading } = useAdmin();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 20 : insets.top;

  const [viewTab, setViewTab] = useState<ViewTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Operations");
  const [savingExpense, setSavingExpense] = useState(false);

  const cardBg = isDark ? "#111B2E" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [ordersData, expensesData] = await Promise.all([
        OrdersService.getAll(),
        Expenses.getAll(),
      ]);
      setOrders(ordersData);
      setExpenses(expensesData);
    } catch (e) {
      console.error("Failed to fetch business book data:", e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const customStartDate = customStart ? new Date(customStart) : undefined;
  const customEndDate = customEnd ? new Date(customEnd + "T23:59:59") : undefined;
  const { start: rangeStart, end: rangeEnd } = getDateRange(dateFilter, customStartDate, customEndDate);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!isInRange(o.created_at, rangeStart, rangeEnd)) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          o.id?.toLowerCase().includes(q) ||
          o.user_name?.toLowerCase().includes(q) ||
          o.user_email?.toLowerCase().includes(q) ||
          o.service_name?.toLowerCase().includes(q) ||
          o.plan?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, rangeStart, rangeEnd, statusFilter, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isInRange(e.createdAt, rangeStart, rangeEnd));
  }, [expenses, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === "completed");
    const pipelineOrders = filteredOrders.filter((o) => o.status === "pending" || o.status === "in_progress");
    const totalRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
    const pipelineValue = pipelineOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    return { totalOrders, totalRevenue, totalExpenses, netProfit, pipelineValue, pipelineCount: pipelineOrders.length };
  }, [filteredOrders, filteredExpenses]);

  async function handleAddExpense() {
    if (!expenseTitle.trim() || !expenseAmount.trim()) {
      Alert.alert("Missing Info", "Please fill in title and amount");
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }
    setSavingExpense(true);
    try {
      const expense = await Expenses.create({
        title: expenseTitle.trim(),
        amount,
        category: expenseCategory,
        createdAt: new Date().toISOString(),
      });
      setExpenses((prev) => [expense, ...prev]);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseCategory("Operations");
      setExpenseModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to add expense");
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await Expenses.delete(id);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to delete expense");
          }
        },
      },
    ]);
  }

  function copyOrderId(id: string) {
    Clipboard.setStringAsync(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied", "Order ID copied");
  }

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "all", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (isAdminLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Book</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "Inter_500Medium" }}>Loading data...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Book</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "Inter_500Medium" }}>Admin access required</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Book</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: "Inter_500Medium" }}>Failed to load data</Text>
          <Pressable onPress={() => { setLoading(true); fetchData(); }} style={{ marginTop: 16, backgroundColor: "#0D9488", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Business Book</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabRow}>
        {([
          { key: "overview" as ViewTab, label: "Overview", icon: "stats-chart-outline" },
          { key: "orders" as ViewTab, label: "Orders", icon: "receipt-outline" },
          { key: "expenses" as ViewTab, label: "Expenses", icon: "wallet-outline" },
        ]).map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, viewTab === t.key && { backgroundColor: "#0D9488" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewTab(t.key); }}
          >
            <Ionicons name={t.icon as any} size={14} color={viewTab === t.key ? "#FFF" : colors.textSecondary} />
            <Text style={[styles.tabBtnText, { color: viewTab === t.key ? "#FFF" : colors.textSecondary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {DATE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, dateFilter === f.key && { backgroundColor: "#0D9488" }, dateFilter !== f.key && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDateFilter(f.key); }}
            >
              <Text style={[styles.filterChipText, { color: dateFilter === f.key ? "#FFF" : colors.textSecondary }]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {dateFilter === "custom" && (
          <View style={[styles.customDateRow, { borderColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customDateLabel, { color: colors.textSecondary }]}>From (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.customDateInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor }]}
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customDateLabel, { color: colors.textSecondary }]}>To (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.customDateInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor }]}
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="2026-12-31"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        )}

        {viewTab === "overview" && (
          <>
            <View style={styles.summaryGrid}>
              <LinearGradient colors={["#3B82F6", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
                <Ionicons name="bag-outline" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryValue}>{stats.totalOrders}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </LinearGradient>
              <LinearGradient colors={["#10B981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
                <Ionicons name="cash-outline" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryValue}>{formatCurrency(stats.totalRevenue)}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </LinearGradient>
              <LinearGradient colors={["#EF4444", "#DC2626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
                <Ionicons name="arrow-down-outline" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryValue}>{formatCurrency(stats.totalExpenses)}</Text>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
              </LinearGradient>
            </View>

            {stats.pipelineCount > 0 && (
              <View style={[styles.pipelineCard, { backgroundColor: cardBg, borderColor: isDark ? "#F59E0B30" : "#F59E0B25" }]}>
                <View style={styles.pipelineHeader}>
                  <View style={[styles.pipelineIconWrap, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                    <Ionicons name="hourglass-outline" size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pipelineTitle, { color: colors.text }]}>Pipeline</Text>
                    <Text style={[styles.pipelineSub, { color: colors.textSecondary }]}>
                      {stats.pipelineCount} order{stats.pipelineCount !== 1 ? "s" : ""} pending or in progress
                    </Text>
                  </View>
                  <Text style={[styles.pipelineValue, { color: "#F59E0B" }]}>{formatCurrency(stats.pipelineValue)}</Text>
                </View>
                <Text style={[styles.pipelineNote, { color: colors.textSecondary }]}>
                  Not included in revenue or net profit until completed
                </Text>
              </View>
            )}

            <LinearGradient
              colors={stats.netProfit >= 0 ? ["#10B981", "#059669"] : ["#EF4444", "#DC2626"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.netProfitCard}
            >
              <View style={styles.netProfitIcon}>
                <Ionicons name={stats.netProfit >= 0 ? "trending-up" : "trending-down"} size={20} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.netProfitLabel}>Net Profit</Text>
                <Text style={styles.netProfitValue}>{formatCurrency(stats.netProfit)}</Text>
              </View>
            </LinearGradient>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown</Text>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              {[
                { label: "Revenue (Completed)", value: formatCurrency(stats.totalRevenue), color: "#10B981" },
                ...(stats.pipelineValue > 0 ? [{ label: "Pipeline (Pending/In Progress)", value: formatCurrency(stats.pipelineValue), color: "#F59E0B" }] : []),
                { label: "Expenses", value: `- ${formatCurrency(stats.totalExpenses)}`, color: "#EF4444" },
                { label: "Net Profit", value: formatCurrency(stats.netProfit), color: stats.netProfit >= 0 ? "#10B981" : "#EF4444" },
              ].map((item, i, arr) => (
                <View key={i} style={[styles.breakdownRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.breakdownValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              {filteredOrders.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
              ) : (
                filteredOrders.slice(0, 5).map((o) => (
                  <View key={o.id} style={[styles.recentRow, { borderBottomColor: borderColor }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>{o.service_name}</Text>
                      <Text style={[styles.recentSub, { color: colors.textSecondary }]}>{o.user_name} - {o.plan}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.recentPrice, { color: "#0D9488" }]}>Rs. {o.price}</Text>
                      <View style={[styles.miniStatus, { backgroundColor: o.status === "completed" ? "rgba(16,185,129,0.12)" : o.status === "pending" ? "rgba(245,158,11,0.12)" : o.status === "cancelled" ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)" }]}>
                        <Text style={[styles.miniStatusText, { color: o.status === "completed" ? "#10B981" : o.status === "pending" ? "#F59E0B" : o.status === "cancelled" ? "#EF4444" : "#3B82F6" }]}>{o.status}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {viewTab === "orders" && (
          <>
            <View style={[styles.searchWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search orders..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, statusFilter === f.key && { backgroundColor: "#0D9488" }, statusFilter !== f.key && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatusFilter(f.key); }}
                >
                  <Text style={[styles.filterChipText, { color: statusFilter === f.key ? "#FFF" : colors.textSecondary }]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found</Text>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders match your filters</Text>
              </View>
            ) : (
              filteredOrders.map((o) => {
                const statusColor = o.status === "completed" ? "#10B981" : o.status === "pending" ? "#F59E0B" : o.status === "cancelled" ? "#EF4444" : "#3B82F6";
                const date = new Date(o.created_at);
                const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <View key={o.id} style={[styles.orderCard, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
                    <View style={styles.orderCardHeader}>
                      <Pressable onPress={() => copyOrderId(o.id)} style={styles.orderIdRow}>
                        <Text style={[styles.orderIdText, { color: colors.textSecondary }]}>#{o.id?.slice(-8)}</Text>
                        <Ionicons name="copy-outline" size={10} color="#0D9488" />
                      </Pressable>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{o.status}</Text>
                      </View>
                    </View>

                    <View style={styles.orderCardBody}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.orderService, { color: colors.text }]} numberOfLines={1}>{o.service_name}</Text>
                        <Text style={[styles.orderPlan, { color: colors.textSecondary }]}>{o.plan}</Text>
                        <Text style={[styles.orderUser, { color: colors.textSecondary }]}>{o.user_name}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.orderAmount}>Rs. {o.price}</Text>
                        <Text style={[styles.orderDate, { color: colors.textSecondary }]}>{dateStr}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {viewTab === "expenses" && (
          <>
            <Pressable
              style={styles.addExpenseBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setExpenseModal(true); }}
            >
              <LinearGradient colors={["#0D9488", "#065F46"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addExpenseBtnGradient}>
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.addExpenseBtnText}>Add Expense</Text>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""} - Total: {formatCurrency(stats.totalExpenses)}</Text>

            {filteredExpenses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="wallet-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses recorded</Text>
              </View>
            ) : (
              filteredExpenses.map((e) => {
                const date = new Date(e.createdAt);
                const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <View key={e.id} style={[styles.expenseCard, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow)]}>
                    <View style={[styles.expenseCatDot, { backgroundColor: e.category === "Marketing" ? "#8B5CF6" : e.category === "Salaries" ? "#3B82F6" : e.category === "Software" ? "#F59E0B" : e.category === "Infrastructure" ? "#EC4899" : "#0D9488" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expenseTitle, { color: colors.text }]}>{e.title}</Text>
                      <View style={styles.expenseMetaRow}>
                        <Text style={[styles.expenseCat, { color: colors.textSecondary }]}>{e.category}</Text>
                        <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>{dateStr}</Text>
                      </View>
                    </View>
                    <Text style={styles.expenseAmount}>- Rs. {e.amount.toLocaleString("en-IN")}</Text>
                    <Pressable onPress={() => handleDeleteExpense(e.id)} hitSlop={8} style={styles.expenseDeleteBtn}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={expenseModal} transparent animationType="slide" onRequestClose={() => setExpenseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Expense</Text>
              <Pressable onPress={() => setExpenseModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor }]}
              value={expenseTitle}
              onChangeText={setExpenseTitle}
              placeholder="e.g. Facebook Ads Spend"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (Rs.)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor }]}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.catGrid}>
              {EXPENSE_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.catChip, expenseCategory === c && { backgroundColor: "#0D9488" }, expenseCategory !== c && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                  onPress={() => setExpenseCategory(c)}
                >
                  <Text style={[styles.catChipText, { color: expenseCategory === c ? "#FFF" : colors.textSecondary }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleAddExpense} disabled={savingExpense} style={{ borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
              <LinearGradient colors={["#0D9488", "#065F46"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalSaveBtn}>
                {savingExpense ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalSaveBtnText}>Save Expense</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 14 },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  customDateRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  customDateLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
  customDateInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_500Medium" },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  summaryCard: { width: "47.5%", borderRadius: 18, padding: 16, gap: 4 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },

  pipelineCard: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 14 },
  pipelineHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  pipelineIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pipelineTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pipelineSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  pipelineValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pipelineNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10, fontStyle: "italic" as const },

  netProfitCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 18, gap: 14, marginBottom: 14 },
  netProfitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  netProfitLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  netProfitValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },

  card: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  divider: { height: 1, marginVertical: 14 },

  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  breakdownLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  breakdownValue: { fontSize: 14, fontFamily: "Inter_700Bold" },

  recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  recentName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  recentSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  recentPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  miniStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  miniStatusText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", padding: 0 },
  resultCount: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 10 },

  orderCard: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 10 },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderIdText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  orderCardBody: { flexDirection: "row", alignItems: "flex-start" },
  orderService: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  orderPlan: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  orderUser: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  orderAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0D9488" },
  orderProfit: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  orderDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },

  addExpenseBtn: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  addExpenseBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  addExpenseBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },

  expenseCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  expenseCatDot: { width: 8, height: 8, borderRadius: 4 },
  expenseTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  expenseMetaRow: { flexDirection: "row", gap: 10, marginTop: 3 },
  expenseCat: { fontSize: 11, fontFamily: "Inter_500Medium" },
  expenseDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expenseAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#EF4444" },
  expenseDeleteBtn: { padding: 6 },

  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_500Medium" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalSaveBtn: { paddingVertical: 14, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  modalSaveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
