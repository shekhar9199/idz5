import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  ToastAndroid,
  Linking,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  BackHandler,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAdmin } from "@/lib/admin-context";
import { useTheme } from "@/lib/useTheme";
import {
  getUsers, deleteUser,
  getBookings, deleteBooking, clearAllBookings,
  getContactMessages, deleteContactMessage, clearAllMessages,
  getSubRequests, deleteSubRequest, clearAllSubRequests,
  getWhatsAppNumber, setWhatsAppNumber,
  getOttApps, saveOttApp, updateOttApp, deleteOttApp,
} from "@/lib/admin-storage";
import type { OttApp } from "@/lib/admin-storage";
import type { Booking, ContactMessage, SubRequest } from "@/lib/storage";
import { Chats, Orders as OrdersService, Notifications as NotificationsService, Settings as SettingsService, Referrals, Wallet, Withdrawals, WalletOrders, Users, BusinessOwners } from "@/lib/firestore";
import type { ReferralReward, WithdrawalRequest, WalletOrder, BusinessOwnerData } from "@/lib/firestore";

type TabKey = "overview" | "ott" | "bookings" | "messages" | "users" | "chats" | "orders" | "withdrawals" | "payments" | "bizowners";

const ICON_OPTIONS = [
  "youtube", "movie-open-outline", "television-play", "play-circle-outline",
  "netflix", "spotify", "music-circle-outline", "filmstrip", "video-outline",
  "play-box-outline", "cast-connected", "television", "monitor-cellphone",
];

const COLOR_OPTIONS = [
  "#FF0000", "#00A8E1", "#1A1A2E", "#8B5CF6", "#E50914",
  "#1DB954", "#FF6F00", "#0078D7", "#E91E63", "#00BFA5",
];

const AdminHeader = React.memo(function AdminHeader({ 
  topPadding, isDark, colors, onBack, onLogout 
}: { topPadding: number; isDark: boolean; colors: any; onBack: () => void; onLogout: () => void }) {
  return (
    <View style={[styles.headerBar, { paddingTop: topPadding + 8, backgroundColor: isDark ? "#000000" : "#FFFFFF", borderBottomColor: colors.border }]}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Panel</Text>
      <Pressable onPress={onLogout} hitSlop={12} style={[styles.logoutBtn, { backgroundColor: colors.error + "12" }]}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
      </Pressable>
    </View>
  );
});

const MAIN_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "chats", label: "Chats" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
];
const SUB_TABS: TabKey[] = ["ott", "bookings", "messages", "withdrawals", "payments", "bizowners"];

const SegmentedTabBar = React.memo(function SegmentedTabBar({
  activeTab, colors, isDark, onTabChange,
}: { activeTab: TabKey; colors: any; isDark: boolean; onTabChange: (key: TabKey) => void }) {
  const isSubTab = SUB_TABS.includes(activeTab);
  const effectiveActive = isSubTab ? "overview" : activeTab;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: isDark ? "#000000" : "#F8FAFC" }}>
      <View style={[styles.segmentedContainer, { backgroundColor: isDark ? "#1C1C1E" : "#E5E7EB" }]}>
        {MAIN_TABS.map((tab) => {
          const isActive = effectiveActive === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.segmentedTab, isActive && { backgroundColor: colors.tint, shadowColor: colors.tint, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTabChange(tab.key); }}
            >
              <Text style={[styles.segmentedTabText, { color: isActive ? "#FFF" : colors.textSecondary }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export default function AdminDashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAdmin, isAdminLoading, adminLogout } = useAdmin();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [activeTab, setActiveTabRaw] = useState<TabKey>("overview");
  const [tabReady, setTabReady] = useState(true);
  const setActiveTab = useCallback((tab: TabKey) => {
    if (tab === "orders") setOrdersVisibleCount(15);
    setTabReady(false);
    setActiveTabRaw(tab);
    requestAnimationFrame(() => {
      setTabReady(true);
    });
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; phone: string; uniqueId?: string; createdAt?: string }>>([]);
  const [userSearch, setUserSearch] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subRequests, setSubRequests] = useState<SubRequest[]>([]);
  const [ottApps, setOttApps] = useState<OttApp[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [adminOrderFilter, setAdminOrderFilter] = useState("all");
  const [orderCategory, setOrderCategory] = useState<"all" | "meta_ads" | "premium">("all");
  const [metaAdsSubFilter, setMetaAdsSubFilter] = useState<"all" | "business_owner" | "direct_seller">("all");

  const [referralRewardCoins, setReferralRewardCoins] = useState(500);
  const [referralCoinsInput, setReferralCoinsInput] = useState("500");
  const [referralSaved, setReferralSaved] = useState(false);
  const [referralStats, setReferralStats] = useState<{ totalReferrals: number; totalCoinsAwarded: number; rewards: ReferralReward[] }>({ totalReferrals: 0, totalCoinsAwarded: 0, rewards: [] });

  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalTaxPercent, setWithdrawalTaxPercent] = useState(18);
  const [withdrawalTaxInput, setWithdrawalTaxInput] = useState("18");
  const [taxSaved, setTaxSaved] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const [allWalletOrders, setAllWalletOrders] = useState<WalletOrder[]>([]);
  const [allBusinessOwners, setAllBusinessOwners] = useState<BusinessOwnerData[]>([]);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [upiIdInput, setUpiIdInput] = useState("shekhar9267@ibl");
  const [upiNameInput, setUpiNameInput] = useState("Shekhar Cricket Club");
  const [upiSaved, setUpiSaved] = useState(false);

  const [userDetailModal, setUserDetailModal] = useState<{ visible: boolean; userId: string; userName: string; loading: boolean; balance: number; coinBalance: number; transactions: any[]; orders: any[]; uniqueId: string; sponsorId: string; email: string; phone: string; suspended: boolean; createdAt: string }>({ visible: false, userId: "", userName: "", loading: false, balance: 0, coinBalance: 0, transactions: [], orders: [], uniqueId: "", sponsorId: "", email: "", phone: "", suspended: false, createdAt: "" });

  const [metaPricing, setMetaPricing] = useState({
    oneTime: "349", weekly: "499", fifteenDays: "849", monthly: "1499",
    origOneTime: "500", origWeekly: "699", origFifteenDays: "1399", origMonthly: "2999",
  });
  const [pricingSaved, setPricingSaved] = useState(false);
  const [boPricing, setBoPricing] = useState({ setupManage: "499", oneTime: "349" });
  const [boPricingSaved, setBoPricingSaved] = useState(false);
  const [metaStock, setMetaStock] = useState({ oneTime: "0", weekly: "0", fifteenDays: "0", monthly: "0", boSetupManage: "0", boOneTime: "0" });
  const [stockSaved, setStockSaved] = useState(false);

  const [ordersVisibleCount, setOrdersVisibleCount] = useState(15);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [walletTarget, setWalletTarget] = useState<{ id: string; name: string } | null>(null);
  const [walletAmountInput, setWalletAmountInput] = useState("");
  const [walletNoteInput, setWalletNoteInput] = useState("");
  const [walletAdding, setWalletAdding] = useState(false);

  const [cancelReasonModal, setCancelReasonModal] = useState<{ visible: boolean; orderId: string; newStatus: string; doRefund: boolean; reason: string }>({ visible: false, orderId: "", newStatus: "", doRefund: false, reason: "" });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const [ottModalVisible, setOttModalVisible] = useState(false);
  const [editingOtt, setEditingOtt] = useState<OttApp | null>(null);
  const [ottForm, setOttForm] = useState({ name: "", description: "", price: "", icon: "play-circle-outline", color: "#8B5CF6", durationMonths: "1", durationYear: "", outOfStock: false, stockCount: "0" });
  const descSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const insertFormatting = (type: "bold" | "italic" | "bullet") => {
    const desc = ottForm.description;
    const { start, end } = descSelectionRef.current;
    const selected = desc.substring(start, end);
    let newText = "";
    let cursorOffset = 0;
    if (type === "bold") {
      newText = desc.substring(0, start) + `**${selected || "text"}**` + desc.substring(end);
      cursorOffset = selected ? end + 4 : start + 6;
    } else if (type === "italic") {
      newText = desc.substring(0, start) + `_${selected || "text"}_` + desc.substring(end);
      cursorOffset = selected ? end + 2 : start + 5;
    } else if (type === "bullet") {
      const beforeCursor = desc.substring(0, start);
      const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith("\n");
      const prefix = needsNewline ? "\n" : "";
      newText = beforeCursor + `${prefix}• ` + desc.substring(end);
      cursorOffset = start + prefix.length + 2;
    }
    setOttForm((p) => ({ ...p, description: newText }));
  };

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) router.replace("/admin-login");
  }, [isAdmin, isAdminLoading]);

  const loadData = useCallback(async () => {
    try {
      const [u, b, m, s, w, o, chats, orders, refCoins, refStats, withdrawals, wTax, metaPrices, walletOrd, upiSettings, boPrices, bizOwners, metaStockData] = await Promise.all([
        getUsers(), getBookings(), getContactMessages(),
        getSubRequests(), getWhatsAppNumber(), getOttApps(),
        Chats.getAll(), OrdersService.getAll(),
        SettingsService.getReferralRewardCoins().catch(() => 500),
        Referrals.getReferralStats().catch(() => ({ totalReferrals: 0, totalCoinsAwarded: 0, rewards: [] })),
        Withdrawals.getAll().catch(() => []),
        SettingsService.getWithdrawalTaxPercent().catch(() => 18),
        SettingsService.getMetaAdsPricing().catch(() => ({ oneTime: 349, weekly: 499, fifteenDays: 849, monthly: 1499, origOneTime: 500, origWeekly: 699, origFifteenDays: 1399, origMonthly: 2999 })),
        WalletOrders.getAll().catch(() => []),
        SettingsService.getUpiSettings().catch(() => ({ upiId: "shekhar9267@ibl", upiName: "Shekhar Cricket Club" })),
        SettingsService.getBusinessOwnerPricing().catch(() => ({ setupManage: 499, oneTime: 349 })),
        BusinessOwners.getAll().catch(() => []),
        SettingsService.getMetaAdsStock().catch(() => ({ oneTime: 0, weekly: 0, fifteenDays: 0, monthly: 0, boSetupManage: 0, boOneTime: 0 })),
      ]);
      setUsers(u); setBookings(b); setMessages(m);
      setSubRequests(s); setWhatsapp(w); setWhatsappInput(w); setOttApps(o);
      setAdminChats(chats);
      setAllOrders(orders);
      setReferralRewardCoins(refCoins);
      setReferralCoinsInput(String(refCoins));
      setReferralStats(refStats);
      setAllWithdrawals(withdrawals);
      setAllWalletOrders(walletOrd);
      setAllBusinessOwners(bizOwners);
      setUpiIdInput(upiSettings.upiId);
      setUpiNameInput(upiSettings.upiName);
      setWithdrawalTaxPercent(wTax);
      setWithdrawalTaxInput(String(wTax));
      setMetaPricing({
        oneTime: String(metaPrices.oneTime),
        weekly: String(metaPrices.weekly),
        fifteenDays: String(metaPrices.fifteenDays),
        monthly: String(metaPrices.monthly),
        origOneTime: String(metaPrices.origOneTime),
        origWeekly: String(metaPrices.origWeekly),
        origFifteenDays: String(metaPrices.origFifteenDays),
        origMonthly: String(metaPrices.origMonthly),
      });
      setBoPricing({
        setupManage: String(boPrices.setupManage),
        oneTime: String(boPrices.oneTime),
      });
      setMetaStock({
        oneTime: String(metaStockData.oneTime),
        weekly: String(metaStockData.weekly),
        fifteenDays: String(metaStockData.fifteenDays),
        monthly: String(metaStockData.monthly),
        boSetupManage: String(metaStockData.boSetupManage),
        boOneTime: String(metaStockData.boOneTime),
      });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (SUB_TABS.includes(activeTab)) {
        setActiveTab("overview");
        return true;
      }
      if (settingsModalVisible) {
        setSettingsModalVisible(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [activeTab, settingsModalVisible]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    adminLogout();
    router.replace("/(tabs)");
  }

  function confirmDelete(type: string, id: string, name: string) {
    setDeleteTarget({ type, id, name });
    setDeleteModalVisible(true);
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      if (deleteTarget.type === "booking") await deleteBooking(deleteTarget.id);
      else if (deleteTarget.type === "message") await deleteContactMessage(deleteTarget.id);
      else if (deleteTarget.type === "subscription") await deleteSubRequest(deleteTarget.id);
      else if (deleteTarget.type === "user") await deleteUser(deleteTarget.id);
      else if (deleteTarget.type === "ott") await deleteOttApp(deleteTarget.id);
      else if (deleteTarget.type === "chat") {
        await Chats.deleteChat(deleteTarget.id);
      }
      await loadData();
    } catch { Alert.alert("Error", "Failed to delete item"); }
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  }

  async function handleClearAll(type: "bookings" | "messages" | "subscriptions") {
    const labels = { bookings: "bookings", messages: "messages", subscriptions: "subscription requests" };
    Alert.alert("Clear All", `Delete all ${labels[type]}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete All", style: "destructive", onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (type === "bookings") await clearAllBookings();
        if (type === "messages") await clearAllMessages();
        if (type === "subscriptions") await clearAllSubRequests();
        await loadData();
      }},
    ]);
  }

  async function handleSaveReferralCoins() {
    const coins = parseInt(referralCoinsInput, 10);
    if (isNaN(coins) || coins < 0) {
      Alert.alert("Invalid", "Please enter a valid number of coins.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setReferralRewardCoins(coins);
      setReferralRewardCoins(coins);
      setReferralSaved(true);
      setTimeout(() => setReferralSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save referral reward setting");
    }
  }

  async function handleSaveWhatsApp() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setWhatsAppNumber(whatsappInput);
    setWhatsapp(whatsappInput);
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 2000);
  }

  async function handleUserLongPress(userId: string, userName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setUserDetailModal({ visible: true, userId, userName, loading: true, balance: 0, coinBalance: 0, transactions: [], orders: [], uniqueId: "", sponsorId: "", email: "", phone: "", suspended: false, createdAt: "" });
    try {
      const [balance, transactions, userOrders, userDoc] = await Promise.all([
        Wallet.getRupeeBalance(userId),
        Wallet.getTransactions(userId),
        OrdersService.getByUser(userId),
        Users.getById(userId),
      ]);
      const coinBalance = userDoc?.coins || 0;
      setUserDetailModal((prev) => ({
        ...prev,
        loading: false,
        balance,
        coinBalance,
        transactions: transactions.slice(0, 20),
        orders: userOrders.slice(0, 20),
        uniqueId: userDoc?.uniqueId || "",
        sponsorId: userDoc?.sponsorId || "",
        email: userDoc?.email || "",
        phone: userDoc?.phone || "",
        suspended: userDoc?.suspended || false,
        createdAt: userDoc?.createdAt || "",
      }));
    } catch (e) {
      console.error("Error loading user details:", e);
      setUserDetailModal((prev) => ({ ...prev, loading: false }));
    }
  }

  async function handleToggleSuspend() {
    const { userId, userName, suspended } = userDetailModal;
    if (!userId) return;
    const newStatus = !suspended;
    Alert.alert(
      newStatus ? "Suspend Account" : "Reactivate Account",
      newStatus
        ? `Are you sure you want to suspend ${userName}'s account? They won't be able to use the app.`
        : `Reactivate ${userName}'s account? They will be able to use the app again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newStatus ? "Suspend" : "Reactivate",
          style: newStatus ? "destructive" : "default",
          onPress: async () => {
            try {
              await Users.update(userId, { suspended: newStatus });
              setUserDetailModal((prev) => ({ ...prev, suspended: newStatus }));
              Haptics.notificationAsync(
                newStatus ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
              );
              Alert.alert(
                newStatus ? "Account Suspended" : "Account Reactivated",
                newStatus ? `${userName}'s account has been suspended.` : `${userName}'s account is now active.`
              );
            } catch {
              Alert.alert("Error", "Failed to update account status.");
            }
          },
        },
      ]
    );
  }

  function openWalletModal(userId: string, userName: string) {
    setWalletTarget({ id: userId, name: userName });
    setWalletAmountInput("");
    setWalletNoteInput("");
    setWalletModalVisible(true);
  }

  async function handleAddMoney() {
    if (!walletTarget) return;
    const rupees = parseInt(walletAmountInput, 10);
    if (isNaN(rupees) || rupees <= 0) {
      Alert.alert("Invalid", "Please enter a valid amount in rupees.");
      return;
    }
    setWalletAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Wallet.addRupees(walletTarget.id, rupees);
      await Wallet.addTransaction({
        userId: walletTarget.id,
        type: "admin_credit",
        coins: 0,
        amountRupees: rupees,
        description: walletNoteInput.trim() || "Admin wallet credit",
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Done", `Added \u20B9${rupees} to ${walletTarget.name}'s wallet.`);
      setWalletModalVisible(false);
      setWalletTarget(null);
      setWalletAmountInput("");
      setWalletNoteInput("");
    } catch {
      Alert.alert("Error", "Failed to add money. Please try again.");
    } finally {
      setWalletAdding(false);
    }
  }

  function openOttModal(app?: OttApp) {
    if (app) {
      setEditingOtt(app);
      setOttForm({ name: app.name, description: app.description, price: app.price, icon: app.icon, color: app.color, durationMonths: app.durationMonths || "1", durationYear: app.durationYear || "", outOfStock: app.outOfStock || false, stockCount: String(app.stockCount ?? 0) });
    } else {
      setEditingOtt(null);
      setOttForm({ name: "", description: "", price: "", icon: "play-circle-outline", color: "#8B5CF6", durationMonths: "1", durationYear: "", outOfStock: false, stockCount: "0" });
    }
    setOttModalVisible(true);
  }

  async function handleSaveOtt() {
    if (!ottForm.name.trim() || !ottForm.price.trim()) {
      Alert.alert("Missing Fields", "Name and price are required.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stockNum = parseInt(ottForm.stockCount, 10) || 0;
    const saveData = {
      name: ottForm.name,
      description: ottForm.description,
      price: ottForm.price,
      icon: ottForm.icon,
      color: ottForm.color,
      durationMonths: ottForm.durationMonths,
      durationYear: ottForm.durationYear,
      stockCount: stockNum,
      outOfStock: stockNum <= 0,
    };
    try {
      if (editingOtt) {
        await updateOttApp(editingOtt.id, saveData);
      } else {
        await saveOttApp(saveData);
      }
      await loadData();
      setOttModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Failed to save app"); }
  }

  async function handleChatWithUser(order: any) {
    try {
      const userChats = await Chats.getByUser(order.user_id);
      const orderChat = userChats.find((c: any) => 
        c.issueType?.includes(`Order #${order.id}`) && c.status === "open"
      );
      if (orderChat) {
        router.push({ pathname: "/admin-chat", params: { chatId: orderChat.chatId } });
        return;
      }
      const data = await Chats.create(
        order.user_id,
        order.user_name || "User",
        order.service_name,
        `Order #${order.id} - ${order.plan}`
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({ pathname: "/admin-chat", params: { chatId: data.chat.chatId } });
    } catch {
      Alert.alert("Error", "Failed to start chat");
    }
  }

  function isMetaAdsOrder(order: any) {
    return order.service_name?.toLowerCase().includes("meta ads");
  }

  function isPremiumOrder(order: any) {
    return order.service_name?.toLowerCase().includes("premium");
  }

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    let filtered = allOrders;
    if (orderCategory === "meta_ads") {
      filtered = filtered.filter((o: any) => o.service_name?.toLowerCase().includes("meta ads"));
      if (metaAdsSubFilter === "business_owner") filtered = filtered.filter((o: any) => o.service_name?.includes("Business Owner"));
      else if (metaAdsSubFilter === "direct_seller") filtered = filtered.filter((o: any) => o.service_name === "Meta Ads Setup");
    } else if (orderCategory === "premium") {
      filtered = filtered.filter((o: any) => o.service_name?.toLowerCase().includes("premium"));
    }
    if (adminOrderFilter !== "all") filtered = filtered.filter((o: any) => o.status === adminOrderFilter);
    if (q) filtered = filtered.filter((o: any) =>
      o.id?.toLowerCase().includes(q) ||
      o.user_name?.toLowerCase().includes(q) ||
      o.user_email?.toLowerCase().includes(q) ||
      o.service_name?.toLowerCase().includes(q) ||
      o.plan?.toLowerCase().includes(q)
    );
    return filtered;
  }, [allOrders, orderCategory, metaAdsSubFilter, adminOrderFilter, orderSearch]);

  function getStatusLabel(status: string, order: any) {
    if (isMetaAdsOrder(order)) {
      const labels: Record<string, string> = {
        pending: "Pending", accepted: "Accepted", completed: "Completed", rejected: "Rejected"
      };
      return labels[status] || status;
    }
    const labels: Record<string, string> = {
      pending: "Pending", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled"
    };
    return labels[status] || status;
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const orderBefore = allOrders.find((o: any) => o.id === orderId);
      const isCancelOrReject =
        (isMetaAdsOrder(orderBefore) && newStatus === "rejected") ||
        (isPremiumOrder(orderBefore) && newStatus === "cancelled");

      if (isCancelOrReject) {
        const needsRefund = orderBefore && !orderBefore.refunded;
        setCancelReasonModal({ visible: true, orderId, newStatus, doRefund: !!needsRefund, reason: "" });
        return;
      }

      await executeStatusChange(orderId, newStatus, false, "");
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  }

  async function executeStatusChange(orderId: string, newStatus: string, doRefund: boolean, reason: string) {
    try {
      const order = await OrdersService.updateStatus(orderId, newStatus);
      if (order) {
        if (reason.trim()) {
          await OrdersService.updateFields(orderId, { cancellationReason: reason.trim() });
        }
        const shortId = order.id?.slice(-8) || order.id;
        const label = getStatusLabel(newStatus, order);
        const reasonNote = reason.trim() ? `\nReason: ${reason.trim()}` : "";

        if (newStatus === "completed" && order.user_id) {
          const u = await Users.getById(order.user_id);
          if (u) {
            const earned = (u.spinsEarned || 0) + 1;
            await Users.update(order.user_id, { spinsEarned: earned });
          }
          await NotificationsService.create({
            user_id: order.user_id,
            title: "Order Completed — Spin & Win Unlocked!",
            message: `Your order #${shortId} (${order.service_name} - ${order.plan}) is completed! You've earned a free spin. Go to Profile to spin and win Digi coins!`,
            type: "order_update",
            order_id: order.id,
          });
        } else {
          await NotificationsService.create({
            user_id: order.user_id,
            title: "Order Status Updated",
            message: `Your order #${shortId} (${order.service_name} - ${order.plan}) has been updated to ${label}.${reasonNote}`,
            type: "order_update",
            order_id: order.id,
          });
        }

        if (doRefund && order.user_id) {
          const refundAmount = parseInt(order.price, 10) || 0;
          if (refundAmount > 0) {
            await OrdersService.updateFields(orderId, { refunded: true });
            await Wallet.addRupees(order.user_id, refundAmount);
            await Wallet.addTransaction({
              userId: order.user_id,
              type: "admin_credit",
              coins: 0,
              amountRupees: refundAmount,
              description: `Refund for ${order.service_name} - ${order.plan} (Order #${shortId})`,
              orderId: order.id,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  }

  async function handleSaveWithdrawalTax() {
    const pct = parseInt(withdrawalTaxInput, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert("Invalid", "Please enter a valid tax percentage (0-100).");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setWithdrawalTaxPercent(pct);
      setWithdrawalTaxPercent(pct);
      setTaxSaved(true);
      setTimeout(() => setTaxSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save tax setting");
    }
  }

  async function handleSaveUpiSettings() {
    if (!upiIdInput.trim() || !upiNameInput.trim()) {
      Alert.alert("Invalid", "Please enter both UPI ID and Name.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setUpiSettings(upiIdInput, upiNameInput);
      setUpiSaved(true);
      setTimeout(() => setUpiSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save UPI settings");
    }
  }

  async function handleSaveBoPricing() {
    const setupManage = parseInt(boPricing.setupManage, 10);
    const oneTime = parseInt(boPricing.oneTime, 10);
    if ([setupManage, oneTime].some((v) => isNaN(v) || v <= 0)) {
      Alert.alert("Invalid", "All prices must be positive numbers.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setBusinessOwnerPricing({ setupManage, oneTime });
      setBoPricingSaved(true);
      setTimeout(() => setBoPricingSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save pricing");
    }
  }

  async function handleSaveMetaPricing() {
    const oneTime = parseInt(metaPricing.oneTime, 10);
    const weekly = parseInt(metaPricing.weekly, 10);
    const fifteenDays = parseInt(metaPricing.fifteenDays, 10);
    const monthly = parseInt(metaPricing.monthly, 10);
    const origOneTime = parseInt(metaPricing.origOneTime, 10);
    const origWeekly = parseInt(metaPricing.origWeekly, 10);
    const origFifteenDays = parseInt(metaPricing.origFifteenDays, 10);
    const origMonthly = parseInt(metaPricing.origMonthly, 10);
    const all = [oneTime, weekly, fifteenDays, monthly, origOneTime, origWeekly, origFifteenDays, origMonthly];
    if (all.some((v) => isNaN(v) || v <= 0)) {
      Alert.alert("Invalid", "All prices must be positive numbers.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setMetaAdsPricing({ oneTime, weekly, fifteenDays, monthly, origOneTime, origWeekly, origFifteenDays, origMonthly });
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save pricing");
    }
  }

  async function handleSaveMetaStock() {
    const parsed = {
      oneTime: parseInt(metaStock.oneTime, 10) || 0,
      weekly: parseInt(metaStock.weekly, 10) || 0,
      fifteenDays: parseInt(metaStock.fifteenDays, 10) || 0,
      monthly: parseInt(metaStock.monthly, 10) || 0,
      boSetupManage: parseInt(metaStock.boSetupManage, 10) || 0,
      boOneTime: parseInt(metaStock.boOneTime, 10) || 0,
    };
    if (Object.values(parsed).some((v) => v < 0)) {
      Alert.alert("Invalid", "Stock values cannot be negative.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await SettingsService.setMetaAdsStock(parsed);
      setStockSaved(true);
      setTimeout(() => setStockSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save stock");
    }
  }

  async function handleWithdrawalAction(withdrawal: WithdrawalRequest, action: "approved" | "failed") {
    const actionLabel = action === "approved" ? "Approve" : "Reject & Refund";
    Alert.alert(
      `${actionLabel} Withdrawal`,
      action === "approved"
        ? `Approve \u20B9${withdrawal.finalAmount.toFixed(2)} to ${withdrawal.upiId}?`
        : `Reject and refund \u20B9${withdrawal.amount} to ${withdrawal.userName}'s wallet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: action === "failed" ? "destructive" : "default",
          onPress: async () => {
            setProcessingWithdrawal(withdrawal.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              if (action === "failed") {
                await Withdrawals.refund(withdrawal);
              }
              await Withdrawals.updateStatus(withdrawal.id, action);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadData();
            } catch {
              Alert.alert("Error", "Failed to process withdrawal");
            } finally {
              setProcessingWithdrawal(null);
            }
          },
        },
      ]
    );
  }

  async function handlePaymentAction(order: WalletOrder, action: "paid" | "rejected") {
    const actionLabel = action === "paid" ? "Approve" : "Reject";
    const displayAmount = order.amount ?? 0;
    const displayName = order.userName || "Unknown User";
    Alert.alert(
      `${actionLabel} Payment`,
      action === "paid"
        ? `Approve \u20B9${displayAmount} wallet recharge for ${displayName}?`
        : `Reject wallet recharge of \u20B9${displayAmount} from ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: action === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setProcessingPayment(order.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const currentOrders = await WalletOrders.getAll();
              const current = currentOrders.find((o) => o.id === order.id);
              if (!current || current.status !== "verification_pending") {
                Alert.alert("Already Processed", "This payment has already been processed.");
                await loadData();
                return;
              }
              await WalletOrders.updateStatus(order.id, action);
              if (action === "paid" && order.amount && order.userId) {
                await Wallet.addRupees(order.userId, order.amount);
                await Wallet.addTransaction({
                  userId: order.userId,
                  type: "admin_credit",
                  coins: 0,
                  amountRupees: order.amount,
                  description: `Wallet recharge via UPI (${order.orderId || order.id})`,
                  createdAt: new Date().toISOString(),
                });
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadData();
            } catch {
              Alert.alert("Error", "Failed to process payment");
            } finally {
              setProcessingPayment(null);
            }
          },
        },
      ]
    );
  }

  function formatDate(iso: string) {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDateTime(iso: string) {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "N/A";
    const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${date}, ${time}`;
  }

  if (isAdminLoading || !isAdmin) return null;
  if (loading) return (
    <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );

  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === "pending");

  const quickActionCards: { key: TabKey; label: string; icon: string; color: string; count: number; badge?: boolean }[] = [
    { key: "bookings", label: "Bookings", icon: "calendar-outline", color: "#0D9488", count: bookings.length },
    { key: "messages", label: "Premium Orders", icon: "diamond-outline", color: "#F97316", count: subRequests.length },
    { key: "withdrawals", label: "Withdrawals", icon: "arrow-up-circle-outline", color: "#EF4444", count: allWithdrawals.length, badge: pendingWithdrawals.length > 0 },
    { key: "payments", label: "Payments", icon: "wallet-outline", color: "#6366F1", count: allWalletOrders.length },
    { key: "ott", label: "OTT Apps", icon: "tv-outline", color: "#EC4899", count: ottApps.length },
    { key: "bizowners", label: "Biz Owners", icon: "briefcase-outline", color: "#F59E0B", count: allBusinessOwners.length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminHeader
        topPadding={topPadding}
        isDark={isDark}
        colors={colors}
        onBack={() => router.back()}
        onLogout={handleLogout}
      />

      <SegmentedTabBar
        activeTab={activeTab}
        colors={colors}
        isDark={isDark}
        onTabChange={setActiveTab}
      />

      {SUB_TABS.includes(activeTab) && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("overview"); }}
          style={[styles.subTabBackBar, { backgroundColor: isDark ? "#111111" : "#F1F5F9", borderBottomColor: isDark ? "#222222" : "#E2E8F0" }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.tint} />
          <Text style={[styles.subTabBackText, { color: colors.tint }]}>
            {({ ott: "OTT Apps", bookings: "Bookings", messages: "Premium Orders", withdrawals: "Withdrawals", payments: "Payments", bizowners: "Biz Owners" } as Record<string, string>)[activeTab] ?? "Back"}
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {!tabReady && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        )}

        {tabReady && activeTab === "overview" && (
          <>
            <View style={styles.actionCardGrid}>
              {quickActionCards.map((card) => (
                <Pressable
                  key={card.key}
                  style={[styles.actionCard, { backgroundColor: isDark ? "#111111" : "#FFFFFF", borderColor: isDark ? "#222222" : "#E5E7EB" }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(card.key); }}
                >
                  {card.badge && (
                    <View style={styles.actionCardBadge} />
                  )}
                  <View style={[styles.actionCardIconWrap, { backgroundColor: card.color + "18" }]}>
                    <Ionicons name={card.icon as any} size={24} color={card.color} />
                  </View>
                  <Text style={[styles.actionCardCount, { color: colors.text }]}>{card.count}</Text>
                  <Text style={[styles.actionCardLabel, { color: colors.textSecondary }]}>{card.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/business-book");
              }}
              style={[styles.businessBookBtn, { borderColor: colors.border }]}
            >
              <View style={[styles.businessBookIcon, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
                <Ionicons name="book-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.businessBookTitle, { color: colors.text }]}>Business Book</Text>
                <Text style={[styles.businessBookSub, { color: colors.textSecondary }]}>Revenue, expenses & profit reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSettingsModalVisible(true);
              }}
              style={[styles.businessBookBtn, { borderColor: colors.border, marginBottom: 0 }]}
            >
              <View style={[styles.businessBookIcon, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
                <Ionicons name="settings-outline" size={20} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.businessBookTitle, { color: colors.text }]}>App Settings</Text>
                <Text style={[styles.businessBookSub, { color: colors.textSecondary }]}>Referral, pricing & more</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <Modal
              visible={settingsModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setSettingsModalVisible(false)}
            >
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View style={{ flex: 1, backgroundColor: isDark ? "#000000" : "#F8FAFC" }}>
                  <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: isDark ? "#000000" : "#FFFFFF", borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>App Settings</Text>
                    <Pressable onPress={() => setSettingsModalVisible(false)} hitSlop={12}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Referral System</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: "#8B5CF615" }]}>
                          <Ionicons name="gift-outline" size={20} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardLabel, { color: colors.text }]}>Reward Per Referral</Text>
                          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Coins awarded when a referred user makes their first purchase</Text>
                        </View>
                      </View>
                      <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        <Ionicons name="logo-bitcoin" size={16} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.inputField, { color: colors.text }]}
                          placeholder="500"
                          placeholderTextColor={colors.placeholder}
                          value={referralCoinsInput}
                          onChangeText={setReferralCoinsInput}
                          keyboardType="number-pad"
                        />
                        <Pressable
                          style={[styles.saveBtn, { backgroundColor: referralSaved ? "#22C55E" : colors.tint }]}
                          onPress={handleSaveReferralCoins}
                        >
                          <Ionicons name={referralSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                          <Text style={styles.saveBtnText}>{referralSaved ? "Saved" : "Save"}</Text>
                        </Pressable>
                      </View>
                      <View style={[styles.referralStatsRow, { borderTopColor: colors.border }]}>
                        <View style={styles.referralStatItem}>
                          <Text style={[styles.referralStatNum, { color: "#8B5CF6" }]}>{referralStats.totalReferrals}</Text>
                          <Text style={[styles.referralStatLbl, { color: colors.textSecondary }]}>Referrals</Text>
                        </View>
                        <View style={[styles.referralStatDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.referralStatItem}>
                          <Text style={[styles.referralStatNum, { color: "#F59E0B" }]}>{referralStats.totalCoinsAwarded}</Text>
                          <Text style={[styles.referralStatLbl, { color: colors.textSecondary }]}>Coins Given</Text>
                        </View>
                        <View style={[styles.referralStatDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.referralStatItem}>
                          <Text style={[styles.referralStatNum, { color: "#10B981" }]}>Rs.{((referralStats.totalCoinsAwarded / 100) * 10).toFixed(0)}</Text>
                          <Text style={[styles.referralStatLbl, { color: colors.textSecondary }]}>Value</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Withdrawal Tax</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: "#EF444415" }]}>
                          <Ionicons name="calculator-outline" size={20} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardLabel, { color: colors.text }]}>Tax Percentage</Text>
                          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Applied to all withdrawal requests</Text>
                        </View>
                      </View>
                      <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.inputField, { color: colors.text }]}
                          placeholder="18"
                          placeholderTextColor={colors.placeholder}
                          value={withdrawalTaxInput}
                          onChangeText={setWithdrawalTaxInput}
                          keyboardType="number-pad"
                        />
                        <Text style={[{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginRight: 8 }]}>%</Text>
                        <Pressable
                          style={[styles.saveBtn, { backgroundColor: taxSaved ? "#22C55E" : colors.tint }]}
                          onPress={handleSaveWithdrawalTax}
                        >
                          <Ionicons name={taxSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                          <Text style={styles.saveBtnText}>{taxSaved ? "Saved" : "Save"}</Text>
                        </Pressable>
                      </View>
                      {pendingWithdrawals.length > 0 && (
                        <Pressable
                          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#F59E0B15" }}
                          onPress={() => { setSettingsModalVisible(false); setActiveTab("withdrawals"); }}
                        >
                          <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F59E0B" }}>{pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length > 1 ? "s" : ""}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
                        </Pressable>
                      )}
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Owner Pricing</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: "#F59E0B15" }]}>
                          <Ionicons name="diamond-outline" size={20} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardLabel, { color: colors.text }]}>Business Owner Plans</Text>
                          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Setup + Managing and One Time Setup prices</Text>
                        </View>
                      </View>
                      {[
                        { label: "Setup + Managing", key: "setupManage" as const },
                        { label: "One Time Setup", key: "oneTime" as const },
                      ].map((item) => (
                        <View key={item.key} style={{ flexDirection: "row", alignItems: "center", marginTop: 10, paddingHorizontal: 4 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>{item.label}</Text>
                          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: "#F59E0B40", flex: 0, width: 100 }]}>
                            <Text style={{ fontSize: 12, color: "#F59E0B" }}>{"\u20B9"}</Text>
                            <TextInput
                              style={[styles.inputField, { color: "#F59E0B", flex: 1, minWidth: 40, fontSize: 14, fontFamily: "Inter_600SemiBold" }]}
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                              value={boPricing[item.key]}
                              onChangeText={(v) => setBoPricing((prev) => ({ ...prev, [item.key]: v }))}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      ))}
                      <Pressable
                        style={[styles.saveBtn, { backgroundColor: boPricingSaved ? "#22C55E" : "#F59E0B", alignSelf: "flex-end", marginTop: 14 }]}
                        onPress={handleSaveBoPricing}
                      >
                        <Ionicons name={boPricingSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                        <Text style={styles.saveBtnText}>{boPricingSaved ? "Saved" : "Save Pricing"}</Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Direct Seller Pricing</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: "#0D948815" }]}>
                          <Ionicons name="megaphone-outline" size={20} color="#0D9488" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardLabel, { color: colors.text }]}>Service Prices (Rs.)</Text>
                          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Original (strikethrough) and discounted prices</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", marginTop: 12, paddingHorizontal: 4 }}>
                        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Plan</Text>
                        <Text style={{ width: 90, fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#94A3B8", textAlign: "center" }}>Original</Text>
                        <Text style={{ width: 90, fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0D9488", textAlign: "center" }}>Sale Price</Text>
                      </View>
                      {[
                        { label: "One Time", discKey: "oneTime" as const, origKey: "origOneTime" as const },
                        { label: "Weekly", discKey: "weekly" as const, origKey: "origWeekly" as const },
                        { label: "15 Days", discKey: "fifteenDays" as const, origKey: "origFifteenDays" as const },
                        { label: "Monthly", discKey: "monthly" as const, origKey: "origMonthly" as const },
                      ].map((item) => (
                        <View key={item.discKey} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 4 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>{item.label}</Text>
                          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 0, width: 85, marginRight: 5 }]}>
                            <Text style={{ fontSize: 12, color: "#94A3B8" }}>{"\u20B9"}</Text>
                            <TextInput
                              style={[styles.inputField, { color: "#94A3B8", flex: 1, minWidth: 40, fontSize: 13 }]}
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                              value={metaPricing[item.origKey]}
                              onChangeText={(v) => setMetaPricing((prev) => ({ ...prev, [item.origKey]: v }))}
                              keyboardType="number-pad"
                            />
                          </View>
                          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: "#0D948840", flex: 0, width: 85 }]}>
                            <Text style={{ fontSize: 12, color: "#0D9488" }}>{"\u20B9"}</Text>
                            <TextInput
                              style={[styles.inputField, { color: "#0D9488", flex: 1, minWidth: 40, fontSize: 13, fontFamily: "Inter_600SemiBold" }]}
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                              value={metaPricing[item.discKey]}
                              onChangeText={(v) => setMetaPricing((prev) => ({ ...prev, [item.discKey]: v }))}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      ))}
                      <Pressable
                        style={[styles.saveBtn, { backgroundColor: pricingSaved ? "#22C55E" : colors.tint, alignSelf: "flex-end", marginTop: 14 }]}
                        onPress={handleSaveMetaPricing}
                      >
                        <Ionicons name={pricingSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                        <Text style={styles.saveBtnText}>{pricingSaved ? "Saved" : "Save Pricing"}</Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Meta Ads Stock</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: "#F59E0B15" }]}>
                          <Ionicons name="cube-outline" size={20} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardLabel, { color: colors.text }]}>Stock Available</Text>
                          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Set how many slots are available for each plan</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginTop: 12, marginBottom: 4 }}>Direct Seller Plans</Text>
                      {[
                        { label: "One Time", key: "oneTime" as const },
                        { label: "Weekly", key: "weekly" as const },
                        { label: "15 Days", key: "fifteenDays" as const },
                        { label: "Monthly", key: "monthly" as const },
                      ].map((item) => (
                        <View key={item.key} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 4 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>{item.label}</Text>
                          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 0, width: 85 }]}>
                            <TextInput
                              style={[styles.inputField, { color: colors.text, flex: 1, minWidth: 40, fontSize: 13, fontFamily: "Inter_600SemiBold" }]}
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                              value={metaStock[item.key]}
                              onChangeText={(v) => setMetaStock((prev) => ({ ...prev, [item.key]: v }))}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      ))}
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginTop: 14, marginBottom: 4 }}>Business Owner Plans</Text>
                      {[
                        { label: "Setup + Manage", key: "boSetupManage" as const },
                        { label: "One Time Setup", key: "boOneTime" as const },
                      ].map((item) => (
                        <View key={item.key} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 4 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>{item.label}</Text>
                          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 0, width: 85 }]}>
                            <TextInput
                              style={[styles.inputField, { color: colors.text, flex: 1, minWidth: 40, fontSize: 13, fontFamily: "Inter_600SemiBold" }]}
                              placeholder="0"
                              placeholderTextColor={colors.placeholder}
                              value={metaStock[item.key]}
                              onChangeText={(v) => setMetaStock((prev) => ({ ...prev, [item.key]: v }))}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      ))}
                      <Pressable
                        style={[styles.saveBtn, { backgroundColor: stockSaved ? "#22C55E" : "#F59E0B", alignSelf: "flex-end", marginTop: 14 }]}
                        onPress={handleSaveMetaStock}
                      >
                        <Ionicons name={stockSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                        <Text style={styles.saveBtnText}>{stockSaved ? "Saved" : "Save Stock"}</Text>
                      </Pressable>
                    </View>

                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              {[
                { label: "Clear Bookings", icon: "calendar-outline", onPress: () => handleClearAll("bookings"), count: bookings.length },
                { label: "Clear Premium Orders", icon: "diamond-outline", onPress: () => handleClearAll("subscriptions"), count: subRequests.length },
              ].map((a) => (
                <Pressable key={a.label} style={[styles.quickCard, { backgroundColor: colors.error + "08", borderColor: colors.error + "25" }]} onPress={a.onPress}>
                  <Ionicons name={a.icon as any} size={20} color={colors.error} />
                  <Text style={[styles.quickLabel, { color: colors.error }]}>{a.label}</Text>
                  <Text style={[styles.quickCount, { color: colors.textSecondary }]}>{a.count} items</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {tabReady && activeTab === "ott" && (
          <>
            <View style={styles.sectionRow}>
              <Pressable style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={() => openOttModal()}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>Add App</Text>
              </Pressable>
            </View>

            {ottApps.length === 0 ? (
              <EmptyState icon="tv-outline" text="No OTT apps added yet" colors={colors} />
            ) : (
              ottApps.map((app) => (
                <View key={app.id} style={[styles.ottCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.ottCardTop}>
                    <View style={[styles.ottIcon, { backgroundColor: app.color + "18" }]}>
                      <MaterialCommunityIcons name={app.icon as any} size={24} color={app.color} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.ottName, { color: colors.text }]} numberOfLines={1}>{app.name}</Text>
                      <Text style={[styles.ottDesc, { color: colors.textSecondary }]} numberOfLines={1}>{app.description}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {(() => {
                          const sc = app.stockCount ?? 0;
                          const stockColor = sc <= 0 ? "#EF4444" : sc <= 5 ? "#F59E0B" : "#22C55E";
                          const stockLabel = sc <= 0 ? "Out of Stock" : `${sc} in stock`;
                          return (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: stockColor + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: stockColor }} />
                              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: stockColor }}>{stockLabel}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                      <Text style={[styles.ottPrice, { color: colors.tint }]}>Rs.{app.price}</Text>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 }}>
                        {app.durationMonths && parseInt(app.durationMonths) > 0 ? `${app.durationMonths} mo` : ""}{app.durationYear && parseInt(app.durationYear) > 0 ? `${app.durationMonths && parseInt(app.durationMonths) > 0 ? " / " : ""}${app.durationYear} yr` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.ottActions, { borderTopColor: colors.border }]}>
                    <Pressable style={[styles.ottActionBtn, { backgroundColor: colors.tint + "12" }]} onPress={() => openOttModal(app)}>
                      <Ionicons name="create-outline" size={16} color={colors.tint} />
                      <Text style={[styles.ottActionText, { color: colors.tint }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.ottActionBtn, { backgroundColor: colors.error + "12" }]} onPress={() => confirmDelete("ott", app.id, app.name)}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={[styles.ottActionText, { color: colors.error }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tabReady && activeTab === "bookings" && (
          <>
            <View style={styles.sectionRow}>
              {bookings.length > 0 && (
                <Pressable style={[styles.clearAllBtn, { backgroundColor: colors.error + "12" }]} onPress={() => handleClearAll("bookings")}>
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
                </Pressable>
              )}
            </View>
            {bookings.length === 0 ? (
              <EmptyState icon="calendar-outline" text="No bookings yet" colors={colors} />
            ) : (
              <>
                {(() => {
                  const boBookings = bookings.filter((b) => b.requirement?.includes("Business Owner") || b.serviceId?.includes("business"));
                  const dsBookings = bookings.filter((b) => !b.requirement?.includes("Business Owner") && !b.serviceId?.includes("business"));

                  const renderBooking = (b: any, accentColor: string) => {
                    const fields: { label: string; value: string }[] = [];
                    if (b.requirement) {
                      b.requirement.split(" | ").forEach((part: string) => {
                        const idx = part.indexOf(": ");
                        if (idx > -1) fields.push({ label: part.slice(0, idx).trim(), value: part.slice(idx + 2).trim() });
                      });
                    }
                    return (
                      <View key={b.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.listCardTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.listName, { color: colors.text }]}>{b.name}</Text>
                            <Text style={[styles.listSub, { color: colors.textSecondary }]}>{b.email}</Text>
                          </View>
                          <Pressable onPress={() => confirmDelete("booking", b.id, b.name)} hitSlop={8}>
                            <Ionicons name="close-circle" size={22} color={colors.error + "70"} />
                          </Pressable>
                        </View>
                        <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(b.createdAt)}</Text>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        {fields.length > 0 ? (
                          <View style={{ gap: 8 }}>
                            {fields.map((f, fi) => (
                              <View key={fi} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: accentColor, marginBottom: 2 }}>{f.label}</Text>
                                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text }}>{f.value}</Text>
                                </View>
                                <Pressable
                                  onPress={() => { Clipboard.setStringAsync(f.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert("Copied", `${f.label} copied!`); }}
                                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: accentColor + "12", borderRadius: 8 }}
                                  hitSlop={4}
                                >
                                  <Ionicons name="copy-outline" size={16} color={accentColor} />
                                </Pressable>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <>
                            <Text style={[styles.reqLabel, { color: accentColor }]}>Requirement</Text>
                            <Text style={[styles.reqText, { color: colors.text }]}>{b.requirement}</Text>
                          </>
                        )}
                      </View>
                    );
                  };

                  return (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 }}>
                        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: "#F59E0B" }} />
                        <Ionicons name="diamond" size={14} color="#F59E0B" />
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.text }}>Business Owner ({boBookings.length})</Text>
                      </View>
                      {boBookings.length === 0 ? (
                        <View style={{ paddingVertical: 16, alignItems: "center" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary }}>No business owner bookings</Text>
                        </View>
                      ) : boBookings.map((b) => renderBooking(b, "#F59E0B"))}

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 16 }}>
                        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: "#0D9488" }} />
                        <Ionicons name="person" size={14} color="#0D9488" />
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.text }}>Direct Seller ({dsBookings.length})</Text>
                      </View>
                      {dsBookings.length === 0 ? (
                        <View style={{ paddingVertical: 16, alignItems: "center" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary }}>No direct seller bookings</Text>
                        </View>
                      ) : dsBookings.map((b) => renderBooking(b, "#0D9488"))}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}

        {tabReady && activeTab === "messages" && (
          <>
            <View style={styles.sectionRow}>
              {subRequests.length > 0 && (
                <Pressable style={[styles.clearAllBtn, { backgroundColor: colors.error + "12" }]} onPress={() => handleClearAll("subscriptions")}>
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
                </Pressable>
              )}
            </View>
            {subRequests.length === 0 ? (
              <EmptyState icon="diamond-outline" text="No premium orders yet" colors={colors} />
            ) : (
              subRequests.map((sr) => (
                <View key={sr.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.listCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="diamond" size={14} color="#F97316" />
                        <Text style={[styles.listName, { color: colors.text }]}>{sr.appName}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{sr.userName}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                        <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{sr.userEmail}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => confirmDelete("subscription", sr.id, sr.appName)} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color={colors.error + "70"} />
                    </Pressable>
                  </View>
                  <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(sr.createdAt)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tabReady && activeTab === "users" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Registered Users ({users.length})</Text>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, email, phone or DZ ID..."
                placeholderTextColor={colors.textSecondary}
                value={userSearch}
                onChangeText={setUserSearch}
                autoCapitalize="none"
              />
              {userSearch.length > 0 && (
                <Pressable onPress={() => setUserSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
            {(() => {
              const q = userSearch.toLowerCase().trim();
              const filtered = q ? users.filter((u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.phone && u.phone.includes(q)) ||
                (u.uniqueId && u.uniqueId.toLowerCase().includes(q))
              ) : users;
              return filtered.length === 0 ? (
                <EmptyState icon="people-outline" text={q ? "No users match your search" : "No registered users yet"} colors={colors} />
              ) : (
                filtered.map((u) => (
                  <Pressable key={u.id} onLongPress={() => handleUserLongPress(u.id, u.name)} delayLongPress={500} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.userRow}>
                      <View style={[styles.userAvatar, { backgroundColor: colors.tint }]}>
                        <Text style={styles.userAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.listName, { color: colors.text }]}>{u.name}</Text>
                          {!!u.uniqueId && (
                            <View style={{ backgroundColor: colors.tint + "20", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.tint, letterSpacing: 0.5 }}>{u.uniqueId}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{u.email}</Text>
                        </View>
                        {!!u.phone && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{u.phone}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        onPress={() => openWalletModal(u.id, u.name)}
                        hitSlop={8}
                        style={{ marginRight: 8 }}
                      >
                        <Ionicons name="wallet-outline" size={20} color={colors.tint} />
                      </Pressable>
                      <Pressable onPress={() => confirmDelete("user", u.id, u.name)} hitSlop={8}>
                        <Ionicons name="close-circle" size={22} color={colors.error + "70"} />
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              );
            })()}
          </>
        )}

        {tabReady && activeTab === "chats" && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Chats ({adminChats.length})</Text>
            </View>
            {adminChats.length === 0 ? (
              <EmptyState icon="chatbubbles-outline" text="No chats yet" colors={colors} />
            ) : (
              adminChats.map((chat: any) => (
                <View key={chat.chatId} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.listCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Text style={[styles.listName, { color: colors.text }]}>{chat.userName}</Text>
                        {(chat.unreadAdmin || 0) > 0 && (
                          <View style={{ backgroundColor: colors.tint, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" }}>{chat.unreadAdmin}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.listSub, { color: colors.textSecondary }]}>{chat.issueCategory} - {chat.issueType}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        backgroundColor: chat.status === "open" ? colors.success + "18" : colors.textSecondary + "18",
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                      }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: chat.status === "open" ? colors.success : colors.textSecondary }} />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: chat.status === "open" ? colors.success : colors.textSecondary }}>{chat.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(chat.createdAt)}</Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Last Message</Text>
                  <Text style={[styles.reqText, { color: colors.text }]} numberOfLines={2}>{chat.lastMessage}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Pressable
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.tint + "12" }}
                      onPress={() => { router.push(`/admin-chat?chatId=${chat.chatId}`); }}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={colors.tint} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.tint }}>Reply</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: (chat.status === "open" ? colors.success : colors.warning) + "12" }}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        try {
                          await Chats.updateStatus(chat.chatId, chat.status === "open" ? "resolved" : "open");
                          await loadData();
                        } catch {}
                      }}
                    >
                      <Ionicons name={chat.status === "open" ? "checkmark-circle-outline" : "refresh-outline"} size={16} color={chat.status === "open" ? colors.success : colors.warning} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: chat.status === "open" ? colors.success : colors.warning }}>{chat.status === "open" ? "Resolve" : "Reopen"}</Text>
                    </Pressable>
                    <Pressable
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.error + "12" }}
                      onPress={() => confirmDelete("chat", chat.chatId, chat.userName)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tabReady && activeTab === "withdrawals" && (
          <>
            {allWithdrawals.length === 0 ? (
              <EmptyState icon="arrow-up-circle-outline" text="No withdrawal requests yet" colors={colors} />
            ) : (
              allWithdrawals.map((w) => {
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
                  approved: { label: "Approved", color: "#10B981", bg: "rgba(16,185,129,0.15)" },
                  failed: { label: "Failed", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
                };
                const st = statusConfig[w.status] || statusConfig.pending;
                const isProcessing = processingWithdrawal === w.id;
                return (
                  <View key={w.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.listCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listName, { color: colors.text }]}>{w.userName}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{w.userEmail}</Text>
                        </View>
                        <Pressable
                          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}
                          onPress={async () => {
                            await Clipboard.setStringAsync(w.upiId);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (Platform.OS === "android") {
                              ToastAndroid.show("UPI ID copied!", ToastAndroid.SHORT);
                            } else {
                              Alert.alert("Copied", `UPI ID "${w.upiId}" copied to clipboard`);
                            }
                          }}
                        >
                          <Ionicons name="card-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>UPI: {w.upiId}</Text>
                          <View style={{ backgroundColor: colors.tint + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 }}>
                            <Ionicons name="copy-outline" size={11} color={colors.tint} />
                          </View>
                        </Pressable>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[styles.ottPrice, { color: colors.tint }]}>{"\u20B9"}{w.amount}</Text>
                        <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: st.color }}>{st.label}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Tax ({w.taxPercent}%)</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#EF4444" }}>-{"\u20B9"}{w.taxAmount.toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={[styles.reqLabel, { color: "#10B981" }]}>Final Amount</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#10B981" }}>{"\u20B9"}{w.finalAmount.toFixed(2)}</Text>
                    </View>
                    <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(w.createdAt)}</Text>
                    {w.status === "pending" && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 8 }]} />
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                          <Pressable
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#10B98115", opacity: isProcessing ? 0.5 : 1 }}
                            onPress={() => handleWithdrawalAction(w, "approved")}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <ActivityIndicator size="small" color="#10B981" /> : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>Approve</Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#EF444415", opacity: isProcessing ? 0.5 : 1 }}
                            onPress={() => handleWithdrawalAction(w, "failed")}
                            disabled={isProcessing}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>Reject & Refund</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {tabReady && activeTab === "payments" && (
          <>
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>UPI Settings</Text>
              <Text style={[styles.reqLabel, { color: colors.textSecondary, marginBottom: 6 }]}>UPI ID</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }]}>
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Enter UPI ID"
                  placeholderTextColor={colors.textSecondary}
                  value={upiIdInput}
                  onChangeText={setUpiIdInput}
                  autoCapitalize="none"
                />
              </View>
              <Text style={[styles.reqLabel, { color: colors.textSecondary, marginBottom: 6, marginTop: 10 }]}>UPI Name</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }]}>
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Enter UPI Name"
                  placeholderTextColor={colors.textSecondary}
                  value={upiNameInput}
                  onChangeText={setUpiNameInput}
                />
              </View>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: upiSaved ? "#22C55E" : colors.tint, marginTop: 12 }]}
                onPress={handleSaveUpiSettings}
              >
                <Ionicons name={upiSaved ? "checkmark" : "save-outline"} size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>{upiSaved ? "Saved" : "Save UPI"}</Text>
              </Pressable>
            </View>

            {(() => {
              const visibleOrders = allWalletOrders.filter((wo) => wo.status !== "pending");
              return (
                <>
            {visibleOrders.length === 0 ? (
              <EmptyState icon="wallet-outline" text="No wallet payment requests yet" colors={colors} />
            ) : (
              visibleOrders.map((wo, woIndex) => {
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  pending: { label: "Pending", color: "#6B7280", bg: "rgba(107,114,128,0.15)" },
                  verification_pending: { label: "Awaiting Verification", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
                  paid: { label: "Approved", color: "#10B981", bg: "rgba(16,185,129,0.15)" },
                  rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
                };
                const st = statusConfig[wo.status] || statusConfig.pending;
                const isProcessing = processingPayment === wo.id;
                const isBroken = !wo.amount || !wo.userId;

                if (isBroken) {
                  return (
                    <View key={wo.id || `wo-${woIndex}`} style={[styles.listCard, { backgroundColor: colors.card, borderColor: "#EF444440" }]}>
                      <View style={styles.listCardTop}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="warning-outline" size={16} color="#EF4444" />
                            <Text style={[styles.listName, { color: "#EF4444" }]}>Invalid Entry</Text>
                          </View>
                          <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                            This record has missing data and cannot be processed.
                          </Text>
                          {wo.utr ? (
                            <Text style={[styles.listSub, { color: colors.textSecondary }]}>UTR: {wo.utr}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Pressable
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#EF444415", marginTop: 10 }}
                        onPress={() => {
                          Alert.alert("Delete Entry", "This is a broken record with no valid data. Delete it?", [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  await WalletOrders.delete(wo.id);
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  await loadData();
                                } catch {
                                  Alert.alert("Error", "Failed to delete entry");
                                }
                              },
                            },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>Delete Invalid Entry</Text>
                      </Pressable>
                    </View>
                  );
                }

                return (
                  <View key={wo.id || `wo-${woIndex}`} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.listCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listName, { color: colors.text }]}>{wo.userName || "User"}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{wo.userEmail || "N/A"}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{wo.orderId || wo.id}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[styles.ottPrice, { color: colors.tint }]}>{"\u20B9"}{wo.amount}</Text>
                        <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: st.color }}>{st.label}</Text>
                        </View>
                      </View>
                    </View>
                    {wo.utr ? (
                      <View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Pressable
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                          onPress={async () => {
                            await Clipboard.setStringAsync(wo.utr);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (Platform.OS === "android") {
                              ToastAndroid.show("UTR copied!", ToastAndroid.SHORT);
                            } else {
                              Alert.alert("Copied", `UTR "${wo.utr}" copied to clipboard`);
                            }
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="receipt-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>UTR: {wo.utr}</Text>
                          </View>
                          <View style={{ backgroundColor: colors.tint + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Ionicons name="copy-outline" size={11} color={colors.tint} />
                          </View>
                        </Pressable>
                      </View>
                    ) : null}
                    <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(wo.createdAt)}</Text>
                    {wo.status === "verification_pending" && (
                      <View>
                        <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 8 }]} />
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                          <Pressable
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#10B98115", opacity: isProcessing ? 0.5 : 1 }}
                            onPress={() => handlePaymentAction(wo, "paid")}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <ActivityIndicator size="small" color="#10B981" /> : (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>Approve</Text>
                              </View>
                            )}
                          </Pressable>
                          <Pressable
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#EF444415", opacity: isProcessing ? 0.5 : 1 }}
                            onPress={() => handlePaymentAction(wo, "rejected")}
                            disabled={isProcessing}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>Reject</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
                </>
              );
            })()}
          </>
        )}

        {tabReady && activeTab === "orders" && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Orders ({allOrders.length})</Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.inputBg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.text }}
                  placeholder="Search by Order ID, name, or email..."
                  placeholderTextColor={colors.placeholder}
                  value={orderSearch}
                  onChangeText={setOrderSearch}
                  autoCapitalize="none"
                />
                {orderSearch.length > 0 && (
                  <Pressable onPress={() => setOrderSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8 }}>
              {[
                { key: "all" as const, label: "All Orders", icon: "grid-outline" as const, color: colors.tint },
                { key: "meta_ads" as const, label: "Meta Ads Setup", icon: "megaphone-outline" as const, color: "#8B5CF6" },
                { key: "premium" as const, label: "Premium Subscription", icon: "diamond-outline" as const, color: "#F97316" },
              ].map((cat) => {
                const active = orderCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOrderCategory(cat.key); setAdminOrderFilter("all"); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 14, height: 36, borderRadius: 20,
                      backgroundColor: active ? cat.color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                      borderWidth: active ? 0 : 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <Ionicons name={cat.icon} size={14} color={active ? "#FFF" : colors.textSecondary} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? "#FFF" : colors.textSecondary }}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {orderCategory === "meta_ads" && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
                {[
                  { key: "all" as const, label: "All", color: "#8B5CF6" },
                  { key: "business_owner" as const, label: "Business Owner", color: "#F59E0B" },
                  { key: "direct_seller" as const, label: "Direct Seller", color: "#0D9488" },
                ].map((sf) => {
                  const active = metaAdsSubFilter === sf.key;
                  return (
                    <Pressable
                      key={sf.key}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMetaAdsSubFilter(sf.key); }}
                      style={{
                        paddingHorizontal: 12, height: 30, justifyContent: "center", alignItems: "center", borderRadius: 16,
                        backgroundColor: active ? sf.color + "20" : "transparent",
                        borderWidth: 1, borderColor: active ? sf.color : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? sf.color : colors.textSecondary }}>{sf.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
              {(() => {
                const isMetaCategory = orderCategory === "meta_ads";
                const statusOptions = isMetaCategory ? [
                  { key: "all", label: "All", color: colors.tint },
                  { key: "pending", label: "Pending", color: "#F59E0B" },
                  { key: "accepted", label: "Accepted", color: "#3B82F6" },
                  { key: "completed", label: "Completed", color: "#10B981" },
                  { key: "rejected", label: "Rejected", color: "#EF4444" },
                ] : [
                  { key: "all", label: "All", color: colors.tint },
                  { key: "pending", label: "Pending", color: "#F59E0B" },
                  { key: "in_progress", label: "In Progress", color: "#3B82F6" },
                  { key: "completed", label: "Completed", color: "#10B981" },
                  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
                ];
                return statusOptions.map((f) => {
                  const active = adminOrderFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAdminOrderFilter(f.key); }}
                      style={{
                        paddingHorizontal: 14, height: 30, justifyContent: "center", alignItems: "center", borderRadius: 16,
                        backgroundColor: active ? f.color : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: active ? "#FFF" : colors.textSecondary }}>{f.label}</Text>
                    </Pressable>
                  );
                });
              })()}
            </ScrollView>

            {(() => {
              if (filteredOrders.length === 0) {
                const q = orderSearch.trim();
                return (
                  <EmptyState icon={(q || adminOrderFilter !== "all") ? "search-outline" : "bag-outline"} text={q ? `No orders matching "${q}"` : adminOrderFilter !== "all" ? "No orders with this status" : "No orders yet"} colors={colors} />
                );
              }

              const visible = filteredOrders.slice(0, ordersVisibleCount);
              const hasMore = filteredOrders.length > ordersVisibleCount;

              return (<>{visible.map((order: any) => {
                const isMetaAds = isMetaAdsOrder(order);
                const isBO = order.service_name?.includes("Business Owner");
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = isMetaAds ? {
                  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
                  accepted: { label: "Accepted", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
                  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.15)" },
                  rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
                } : {
                  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
                  in_progress: { label: "In Progress", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
                  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.15)" },
                  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
                };
                const st = statusConfig[order.status] || statusConfig.pending;
                const categoryBadge = isMetaAds
                  ? { label: isBO ? "Business Owner" : "Direct Seller", color: isBO ? "#F59E0B" : "#0D9488", icon: isBO ? "diamond" : "person" }
                  : { label: "Premium", color: "#F97316", icon: "diamond-outline" };

                const statusButtons = isMetaAds ? [
                  { key: "pending", label: "Pending", color: "#F59E0B" },
                  { key: "accepted", label: "Accepted", color: "#3B82F6" },
                  { key: "completed", label: "Completed", color: "#10B981" },
                  { key: "rejected", label: "Rejected", color: "#EF4444" },
                ] : [
                  { key: "pending", label: "Pending", color: "#F59E0B" },
                  { key: "in_progress", label: "In Progress", color: "#3B82F6" },
                  { key: "completed", label: "Completed", color: "#10B981" },
                  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
                ];

                return (
                  <View key={order.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: categoryBadge.color + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Ionicons name={categoryBadge.icon as any} size={11} color={categoryBadge.color} />
                        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: categoryBadge.color, letterSpacing: 0.3 }}>{categoryBadge.label}</Text>
                      </View>
                      {order.refunded && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#10B98115", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Ionicons name="checkmark-circle" size={10} color="#10B981" />
                          <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>Refunded</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.listCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listName, { color: colors.text }]}>{order.service_name}</Text>
                        <Text style={[styles.listSub, { color: colors.textSecondary }]}>{order.plan}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{order.user_name}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{order.user_email}</Text>
                        </View>
                        {order.customer_phone && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.listSub, { color: colors.textSecondary, marginTop: 0 }]}>{order.customer_phone}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <Text style={[styles.ottPrice, { color: colors.tint }]}>{"\u20B9"}{order.price}</Text>
                        <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: st.color }}>{st.label}</Text>
                        </View>
                      </View>
                    </View>

                    {order.details && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 8 }]} />
                        <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Details</Text>
                        {order.details.split(" | ").map((part: string, pi: number) => {
                          const idx = part.indexOf(": ");
                          if (idx > -1) {
                            const lbl = part.slice(0, idx).trim();
                            const val = part.slice(idx + 2).trim();
                            return (
                              <View key={pi} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: colors.tint, marginBottom: 1 }}>{lbl}</Text>
                                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>{val}</Text>
                                </View>
                                <Pressable
                                  onPress={() => { Clipboard.setStringAsync(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                  style={{ padding: 6, backgroundColor: colors.tint + "12", borderRadius: 6 }}
                                  hitSlop={4}
                                >
                                  <Ionicons name="copy-outline" size={14} color={colors.tint} />
                                </Pressable>
                              </View>
                            );
                          }
                          return <Text key={pi} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.text, marginTop: 2 }}>{part}</Text>;
                        })}
                      </>
                    )}

                    {isBO && order.video_url && !order.video_url.startsWith("[upload-pending]") && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 8 }]} />
                        <Text style={[styles.reqLabel, { color: "#F59E0B" }]}>Video Attachment</Text>
                        <Pressable
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6,
                            padding: 12, borderRadius: 12, backgroundColor: isDark ? "#F59E0B10" : "#FEF3C720",
                            borderWidth: 1, borderColor: "#F59E0B30",
                          }}
                          onPress={async () => {
                            const url = order.video_url!;
                            if (Platform.OS === "web") {
                              const link = document.createElement("a");
                              link.href = url;
                              link.target = "_blank";
                              link.download = `video_${order.id}`;
                              link.click();
                            } else {
                              try {
                                await Linking.openURL(url);
                              } catch {
                                await Clipboard.setStringAsync(url);
                                Alert.alert("Link Copied", "Video link copied to clipboard. Paste it in your browser to view.");
                              }
                            }
                          }}
                        >
                          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#F59E0B20", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="videocam" size={20} color="#F59E0B" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>Download Video</Text>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textSecondary }}>Tap to view/download uploaded video</Text>
                          </View>
                          <Ionicons name="download-outline" size={20} color="#F59E0B" />
                        </Pressable>
                      </>
                    )}

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <Text style={[styles.listDate, { color: colors.textSecondary, marginTop: 0 }]}>{formatDateTime(order.created_at)}</Text>
                      <Pressable
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.tint + "12", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                        onPress={() => { Clipboard.setStringAsync(order.id?.slice(-8) || order.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.tint }}>#{order.id?.slice(-8)}</Text>
                        <Ionicons name="copy-outline" size={12} color={colors.tint} />
                      </Pressable>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Change Status</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {statusButtons.map((s) => (
                        <Pressable
                          key={s.key}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 4,
                            paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                            backgroundColor: order.status === s.key ? s.color + "25" : colors.surfaceSecondary,
                            borderWidth: order.status === s.key ? 1 : 0,
                            borderColor: s.color,
                          }}
                          onPress={() => {
                            if (order.status !== s.key) handleStatusChange(order.id, s.key);
                          }}
                        >
                          {order.status === s.key && <Ionicons name="checkmark-circle" size={14} color={s.color} />}
                          <Text style={{ fontSize: 12, fontFamily: order.status === s.key ? "Inter_600SemiBold" : "Inter_400Regular", color: order.status === s.key ? s.color : colors.textSecondary }}>{s.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 10 }]} />
                    <Pressable
                      style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
                        backgroundColor: colors.tint + "15", marginTop: 4,
                      }}
                      onPress={() => handleChatWithUser(order)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.tint} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.tint }}>Chat with {order.user_name || "User"}</Text>
                    </Pressable>
                  </View>
                );
              })}{hasMore && (
                <Pressable
                  style={{ alignItems: "center", paddingVertical: 14, marginTop: 8, borderRadius: 12, backgroundColor: colors.tint + "12" }}
                  onPress={() => setOrdersVisibleCount((c) => c + 15)}
                >
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.tint }}>Show More ({filteredOrders.length - ordersVisibleCount} remaining)</Text>
                </Pressable>
              )}</>);
            })()}
          </>
        )}

        {tabReady && activeTab === "bizowners" && (
          <>
            {allBusinessOwners.length === 0 ? (
              <EmptyState icon="briefcase-outline" text="No business owner submissions yet" colors={colors} />
            ) : (
              allBusinessOwners
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((bo) => (
                <View key={bo.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.listCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listName, { color: colors.text }]}>{bo.businessName}</Text>
                      <Text style={[styles.listSub, { color: colors.textSecondary }]}>{bo.ownerName}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.tint + "18" }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.tint }}>{bo.businessType || "N/A"}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.reqText, { color: colors.text }]}>{bo.contactNumber}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="mail-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.reqText, { color: colors.text }]}>{bo.email}</Text>
                    </View>
                    {!!bo.location && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.reqText, { color: colors.text }]}>{bo.location}</Text>
                      </View>
                    )}
                    {!!bo.website && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="globe-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.reqText, { color: colors.text }]}>{bo.website}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {!!bo.industry && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#8B5CF6" + "18" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#8B5CF6" }}>{bo.industry}</Text>
                      </View>
                    )}
                    {!!bo.sellMode && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#10B981" + "18" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#10B981" }}>{bo.sellMode}</Text>
                      </View>
                    )}
                    {!!bo.adGoal && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#F59E0B" + "18" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#F59E0B" }}>{bo.adGoal}</Text>
                      </View>
                    )}
                    {!!bo.audienceType && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#06B6D4" + "18" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#06B6D4" }}>{bo.audienceType}</Text>
                      </View>
                    )}
                    {!!bo.targetGender && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#EC4899" + "18" }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#EC4899" }}>{bo.targetGender}</Text>
                      </View>
                    )}
                  </View>

                  {(!!bo.targetAgeRange || !!bo.targetLocation) && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Target Audience</Text>
                      <Text style={[styles.reqText, { color: colors.text }]}>
                        {[bo.targetAgeRange && `Age: ${bo.targetAgeRange}`, bo.targetLocation && `Location: ${bo.targetLocation}`].filter(Boolean).join(" • ")}
                      </Text>
                    </>
                  )}

                  {!!bo.usp && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>USP</Text>
                      <Text style={[styles.reqText, { color: colors.text }]}>{bo.usp}</Text>
                    </>
                  )}

                  {!!bo.problemSolved && (
                    <>
                      <Text style={[styles.reqLabel, { color: colors.textSecondary, marginTop: 6 }]}>Problem Solved</Text>
                      <Text style={[styles.reqText, { color: colors.text }]}>{bo.problemSolved}</Text>
                    </>
                  )}

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name={bo.ranAdsBefore ? "checkmark-circle" : "close-circle"} size={14} color={bo.ranAdsBefore ? "#10B981" : "#EF4444"} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Ran Ads</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name={bo.creativesReady ? "checkmark-circle" : "close-circle"} size={14} color={bo.creativesReady ? "#10B981" : "#EF4444"} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Creatives</Text>
                    </View>
                    {!!bo.monthlyAdBudget && (
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Budget: ₹{bo.monthlyAdBudget}</Text>
                    )}
                    {!!bo.yearsInBusiness && (
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>{bo.yearsInBusiness}yr exp</Text>
                    )}
                  </View>

                  {bo.platformsUsed && bo.platformsUsed.length > 0 && (
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                      {bo.platformsUsed.map((p) => (
                        <View key={p} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.tint + "12" }}>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: colors.tint }}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!!bo.socialLinks && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.reqLabel, { color: colors.textSecondary }]}>Social Links</Text>
                      <Text style={[styles.reqText, { color: colors.text }]}>{bo.socialLinks}</Text>
                    </>
                  )}

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.listDate, { color: colors.textSecondary }]}>
                      Submitted: {new Date(bo.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Pressable
                      onPress={() => {
                        Alert.alert("Delete Submission", `Remove "${bo.businessName}" by ${bo.ownerName}? The user will be able to submit a new form after this.`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await BusinessOwners.delete(bo.id);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                await loadData();
                              } catch {
                                Alert.alert("Error", "Failed to delete submission");
                              }
                            },
                          },
                        ]);
                      }}
                      hitSlop={8}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.error + "12" }}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.error} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.error }}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.error + "15" }]}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete {deleteTarget?.type}?</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              "{deleteTarget?.name}" will be permanently removed.
            </Text>
            <View style={styles.modalBtns}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={executeDelete}>
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelReasonModal.visible} transparent animationType="fade" onRequestClose={() => setCancelReasonModal((p) => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalBox, { backgroundColor: colors.card, paddingHorizontal: 20, width: "90%" }]}>
                <View style={[styles.modalIconCircle, { backgroundColor: "#EF444415" }]}>
                  <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {cancelReasonModal.newStatus === "rejected" ? "Reject Order" : "Cancel Order"}
                </Text>
                <Text style={[styles.modalDesc, { color: colors.textSecondary, marginBottom: 4 }]}>
                  {cancelReasonModal.doRefund
                    ? `The order amount will be refunded to the user's wallet automatically.`
                    : "This order has already been refunded."}
                </Text>
                <Text style={[styles.modalDesc, { color: colors.textSecondary, marginBottom: 12 }]}>
                  Optionally specify a reason below (visible to user).
                </Text>
                <TextInput
                  style={{
                    width: "100%",
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: colors.text,
                    backgroundColor: colors.surfaceSecondary,
                    textAlignVertical: "top",
                  }}
                  placeholder="Reason (optional)..."
                  placeholderTextColor={colors.textSecondary}
                  value={cancelReasonModal.reason}
                  onChangeText={(t) => setCancelReasonModal((p) => ({ ...p, reason: t }))}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
                <View style={[styles.modalBtns, { marginTop: 16 }]}>
                  <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => { Keyboard.dismiss(); setCancelReasonModal((p) => ({ ...p, visible: false })); }}>
                    <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Go Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
                    onPress={async () => {
                      Keyboard.dismiss();
                      const { orderId, newStatus, doRefund, reason } = cancelReasonModal;
                      setCancelReasonModal((p) => ({ ...p, visible: false }));
                      await executeStatusChange(orderId, newStatus, doRefund, reason);
                    }}
                  >
                    <Text style={[styles.modalBtnText, { color: "#FFF" }]}>
                      {cancelReasonModal.newStatus === "rejected" ? "Reject" : "Cancel"}{cancelReasonModal.doRefund ? " & Refund" : ""}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={userDetailModal.visible} transparent animationType="fade" onRequestClose={() => setUserDetailModal((p) => ({ ...p, visible: false }))}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, paddingHorizontal: 20, maxHeight: "85%", width: "92%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={[styles.userAvatar, { backgroundColor: userDetailModal.suspended ? colors.error : colors.tint, width: 40, height: 40, borderRadius: 20 }]}>
                  <Text style={[styles.userAvatarText, { fontSize: 16 }]}>{(userDetailModal.userName || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 }]}>{userDetailModal.userName}</Text>
                  {userDetailModal.suspended && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="ban" size={12} color={colors.error} />
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.error }}>Suspended</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable onPress={() => setUserDetailModal((p) => ({ ...p, visible: false }))} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {userDetailModal.loading ? (
              <ActivityIndicator size="large" color={colors.tint} style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderRadius: 12, padding: 14, marginBottom: 14, marginTop: 8, gap: 8 }}>
                  {!!userDetailModal.email && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="mail-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.text, flex: 1 }}>{userDetailModal.email}</Text>
                    </View>
                  )}
                  {!!userDetailModal.phone && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="call-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.text }}>{userDetailModal.phone}</Text>
                    </View>
                  )}
                  {!!userDetailModal.uniqueId && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="finger-print-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.text }}>DZ ID: </Text>
                      <View style={{ backgroundColor: colors.tint + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.tint, letterSpacing: 1 }}>{userDetailModal.uniqueId}</Text>
                      </View>
                    </View>
                  )}
                  {!!userDetailModal.sponsorId && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.text }}>Referred By: </Text>
                      <View style={{ backgroundColor: "#8B5CF620", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#8B5CF6", letterSpacing: 1 }}>{userDetailModal.sponsorId}</Text>
                      </View>
                    </View>
                  )}
                  {!!userDetailModal.createdAt && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary }}>
                        Joined {formatDateTime(userDetailModal.createdAt)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1, backgroundColor: colors.tint + "12", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center" }}>
                    <Ionicons name="wallet-outline" size={20} color={colors.tint} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, marginTop: 4, textAlign: "center" }}>{"\u20B9"}{userDetailModal.balance.toLocaleString("en-IN")}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Wallet</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#F59E0B15", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center" }}>
                    <Ionicons name="star-outline" size={20} color="#F59E0B" />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, marginTop: 4, textAlign: "center" }}>{userDetailModal.coinBalance.toLocaleString("en-IN")}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Coins</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.success + "15", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center" }}>
                    <Ionicons name="receipt-outline" size={20} color={colors.success} />
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, marginTop: 4, textAlign: "center" }}>{userDetailModal.orders.length}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>Orders</Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleToggleSuspend}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                    paddingVertical: 12, borderRadius: 12, marginBottom: 16,
                    backgroundColor: userDetailModal.suspended
                      ? (pressed ? colors.success : colors.success + "18")
                      : (pressed ? colors.error : colors.error + "12"),
                    borderWidth: 1,
                    borderColor: userDetailModal.suspended ? colors.success + "40" : colors.error + "30",
                  })}
                >
                  <Ionicons
                    name={userDetailModal.suspended ? "checkmark-circle" : "ban"}
                    size={18}
                    color={userDetailModal.suspended ? colors.success : colors.error}
                  />
                  <Text style={{
                    fontSize: 14, fontFamily: "Inter_600SemiBold",
                    color: userDetailModal.suspended ? colors.success : colors.error,
                  }}>
                    {userDetailModal.suspended ? "Reactivate Account" : "Suspend Account"}
                  </Text>
                </Pressable>

                {userDetailModal.transactions.length > 0 && (
                  <>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text, marginBottom: 8 }}>Recent Transactions</Text>
                    {userDetailModal.transactions.map((tx: any, i: number) => (
                      <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: i < userDetailModal.transactions.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.text }} numberOfLines={1}>{tx.description || tx.type}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: (tx.amountRupees || 0) >= 0 ? colors.success : colors.error }}>
                          {(tx.amountRupees || 0) >= 0 ? "+" : ""}{"\u20B9"}{(tx.amountRupees || 0).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {userDetailModal.orders.length > 0 && (
                  <>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text, marginTop: 16, marginBottom: 8 }}>Recent Orders</Text>
                    {userDetailModal.orders.map((order: any, i: number) => (
                      <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: i < userDetailModal.orders.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.text }} numberOfLines={1}>{order.serviceName || order.service_name || "Order"}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{order.status || "pending"}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>{"\u20B9"}{(order.price || order.amount || 0).toLocaleString("en-IN")}</Text>
                      </View>
                    ))}
                  </>
                )}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={walletModalVisible} transparent animationType="fade" onRequestClose={() => setWalletModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, paddingHorizontal: 24 }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.tint + "15" }]}>
              <Ionicons name="wallet-outline" size={28} color={colors.tint} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Money</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Add money to {walletTarget?.name}'s wallet
            </Text>

            <View style={{ width: "100%", gap: 12, marginTop: 8 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount ({"\u20B9"}) *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  value={walletAmountInput}
                  onChangeText={(t) => setWalletAmountInput(t.replace(/[^0-9]/g, ""))}
                />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Bonus reward"
                  placeholderTextColor={colors.placeholder}
                  value={walletNoteInput}
                  onChangeText={setWalletNoteInput}
                />
              </View>
            </View>

            <View style={[styles.modalBtns, { marginTop: 16 }]}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setWalletModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.tint, opacity: walletAdding ? 0.6 : 1 }]}
                onPress={handleAddMoney}
                disabled={walletAdding}
              >
                {walletAdding ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Add Money</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={ottModalVisible} transparent animationType="slide" onRequestClose={() => setOttModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.ottModalBox, { backgroundColor: colors.card }]}>
            <View style={styles.ottModalHeader}>
              <Text style={[styles.ottModalTitle, { color: colors.text }]}>{editingOtt ? "Edit App" : "Add New App"}</Text>
              <Pressable onPress={() => setOttModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>App Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Netflix"
                  placeholderTextColor={colors.placeholder}
                  value={ottForm.name}
                  onChangeText={(t) => setOttForm((p) => ({ ...p, name: t }))}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
                <View style={[styles.formatToolbar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Pressable style={[styles.formatBtn, { borderColor: colors.border }]} onPress={() => insertFormatting("bold")}>
                    <Text style={[styles.formatBtnText, { color: colors.text, fontFamily: "Inter_700Bold" }]}>B</Text>
                  </Pressable>
                  <Pressable style={[styles.formatBtn, { borderColor: colors.border }]} onPress={() => insertFormatting("italic")}>
                    <Text style={[styles.formatBtnText, { color: colors.text, fontStyle: "italic", fontFamily: "Inter_400Regular" }]}>I</Text>
                  </Pressable>
                  <Pressable style={[styles.formatBtn, { borderColor: colors.border }]} onPress={() => insertFormatting("bullet")}>
                    <Text style={[styles.formatBtnText, { color: colors.text }]}>• List</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.formInput, styles.formTextarea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 }]}
                  placeholder="Brief description of the app. Use **bold**, _italic_, or • bullets"
                  placeholderTextColor={colors.placeholder}
                  value={ottForm.description}
                  onChangeText={(t) => setOttForm((p) => ({ ...p, description: t }))}
                  onSelectionChange={(e) => { descSelectionRef.current = e.nativeEvent.selection; }}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Price (Rs.) *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 199"
                  placeholderTextColor={colors.placeholder}
                  value={ottForm.price}
                  onChangeText={(t) => setOttForm((p) => ({ ...p, price: t }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration (Months)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. 1"
                    placeholderTextColor={colors.placeholder}
                    value={ottForm.durationMonths}
                    onChangeText={(t) => setOttForm((p) => ({ ...p, durationMonths: t }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration (Year)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. 1"
                    placeholderTextColor={colors.placeholder}
                    value={ottForm.durationYear}
                    onChangeText={(t) => setOttForm((p) => ({ ...p, durationYear: t }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Stock Count *</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 6 }}>Set to 0 for out of stock. Decreases automatically on purchase.</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, flex: 1 }]}
                    placeholder="e.g. 10"
                    placeholderTextColor={colors.placeholder}
                    value={ottForm.stockCount}
                    onChangeText={(t) => setOttForm((p) => ({ ...p, stockCount: t.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                  />
                  {(() => {
                    const sc = parseInt(ottForm.stockCount, 10) || 0;
                    const stockColor = sc <= 0 ? "#EF4444" : sc <= 5 ? "#F59E0B" : "#22C55E";
                    const stockLabel = sc <= 0 ? "Out of Stock" : sc <= 5 ? "Low Stock" : "In Stock";
                    return (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: stockColor + "15", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stockColor }} />
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: stockColor }}>{stockLabel}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconPicker}>
                  {ICON_OPTIONS.map((ic) => (
                    <Pressable
                      key={ic}
                      style={[styles.iconOption, ottForm.icon === ic && { backgroundColor: colors.tint + "20", borderColor: colors.tint }]}
                      onPress={() => setOttForm((p) => ({ ...p, icon: ic }))}
                    >
                      <MaterialCommunityIcons name={ic as any} size={22} color={ottForm.icon === ic ? colors.tint : colors.textSecondary} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Color</Text>
                <View style={styles.colorPicker}>
                  {COLOR_OPTIONS.map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.colorOption, { backgroundColor: c }, ottForm.color === c && styles.colorSelected]}
                      onPress={() => setOttForm((p) => ({ ...p, color: c }))}
                    >
                      {ottForm.color === c && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.previewCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Preview</Text>
                <View style={styles.previewRow}>
                  <View style={[styles.previewIcon, { backgroundColor: ottForm.color + "18" }]}>
                    <MaterialCommunityIcons name={ottForm.icon as any} size={28} color={ottForm.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewName, { color: colors.text }]}>{ottForm.name || "App Name"}</Text>
                    <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={1}>{ottForm.description || "Description"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.previewPrice, { color: colors.tint }]}>Rs.{ottForm.price || "0"}</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 }}>
                      {ottForm.durationMonths && parseInt(ottForm.durationMonths) > 0 ? `${ottForm.durationMonths} mo` : ""}{ottForm.durationYear && parseInt(ottForm.durationYear) > 0 ? `${ottForm.durationMonths && parseInt(ottForm.durationMonths) > 0 ? " / " : ""}${ottForm.durationYear} yr` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.ottModalBtns}>
              <Pressable style={[styles.ottModalBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setOttModalVisible(false)}>
                <Text style={[styles.ottModalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.ottModalBtn, { backgroundColor: colors.tint }]} onPress={handleSaveOtt}>
                <Ionicons name={editingOtt ? "checkmark" : "add"} size={18} color="#FFF" />
                <Text style={[styles.ottModalBtnText, { color: "#FFF" }]}>{editingOtt ? "Update" : "Add App"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptyState({ icon, text, colors }: { icon: any; text: string; colors: any }) {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name={icon} size={40} color={colors.textSecondary + "60"} />
      <Text style={[emptyStyles.text, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 48, gap: 10 },
  text: { fontSize: 14, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
    zIndex: 10,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  logoutBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segmentedContainer: { flexDirection: "row", borderRadius: 14, padding: 4 },
  segmentedTab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentedTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  actionCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  actionCard: { width: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 18, alignItems: "flex-start", gap: 8, position: "relative" },
  actionCardIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionCardCount: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 },
  actionCardLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionCardBadge: { position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  subTabBackBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  subTabBackText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingLeft: 12, height: 44, gap: 4 },
  inputPrefix: { fontSize: 15, fontFamily: "Inter_500Medium" },
  inputField: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 44 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, height: 34, borderRadius: 8, marginRight: 5 },
  saveBtnText: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  quickCount: { fontSize: 10, fontFamily: "Inter_400Regular" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clearAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ottCard: { borderRadius: 14, marginBottom: 12, borderWidth: 1, overflow: "hidden" },
  ottCardTop: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  ottIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ottName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  ottDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ottPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ottActions: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1 },
  ottActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8 },
  ottActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  listCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  listCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  listName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  listSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  listDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  divider: { height: 1, marginVertical: 10 },
  reqLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  reqText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 24, alignItems: "center", gap: 12 },
  modalIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ottModalBox: { width: "100%", maxWidth: 400, maxHeight: "85%", borderRadius: 20, padding: 20 },
  ottModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  ottModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 },
  formInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, height: 44, fontSize: 15, fontFamily: "Inter_400Regular" },
  formTextarea: { height: 100, paddingTop: 12, textAlignVertical: "top" as const },
  formatToolbar: { flexDirection: "row" as const, gap: 6, padding: 8, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  formatBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, minWidth: 36, alignItems: "center" as const, justifyContent: "center" as const },
  formatBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  iconPicker: { gap: 8, paddingVertical: 4 },
  iconOption: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  colorPicker: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorOption: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: "#FFF", ...Platform.select({ web: { boxShadow: "0 0 0 2px rgba(0,0,0,0.3)" } as any, default: {} }) },
  previewCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  previewName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  previewPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ottModalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  ottModalBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  ottModalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  businessBookBtn: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  businessBookIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  businessBookTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  businessBookSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  referralStatsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  referralStatItem: { flex: 1, alignItems: "center" as const },
  referralStatNum: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2 },
  referralStatLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  referralStatDivider: { width: 1, height: 30 },
});
