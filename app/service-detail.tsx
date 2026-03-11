import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, FadeOutUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { saveBooking } from "@/lib/storage";
import { cardShadow } from "@/lib/shadows";
import { Orders, Wallet, Settings, Earnings } from "@/lib/firestore";

type AdsPlan = null | "one-time" | "manage-weekly" | "manage-15days" | "manage-monthly";

export default function ServiceDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [selectedPlan, setSelectedPlan] = useState<AdsPlan>(null);
  const [selectedManagePlan, setSelectedManagePlan] = useState<AdsPlan>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [igId, setIgId] = useState("");
  const [igPassword, setIgPassword] = useState("");
  const [showIgPass, setShowIgPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);

  const [pricing, setPricing] = useState({
    oneTime: 349, weekly: 499, fifteenDays: 849, monthly: 1499,
    origOneTime: 500, origWeekly: 699, origFifteenDays: 1399, origMonthly: 2999,
  });

  const [stock, setStock] = useState({ oneTime: 0, weekly: 0, fifteenDays: 0, monthly: 0, boSetupManage: 0, boOneTime: 0 });
  const [showStockBanner, setShowStockBanner] = useState(false);

  useEffect(() => {
    Settings.getMetaAdsPricing().then(setPricing).catch(() => {});
    Settings.getMetaAdsStock().then((s) => {
      setStock(s);
      const totalStock = s.oneTime + s.weekly + s.fifteenDays + s.monthly;
      if (totalStock > 0 && totalStock <= 50) {
        setShowStockBanner(true);
      }
    }).catch(() => {});
  }, []);

  function getPlanLabel(plan: AdsPlan): string {
    if (plan === "one-time") return `One Time Ads Setup - Rs. ${pricing.oneTime}`;
    if (plan === "manage-weekly") return `Manage Ads - 1 Week (Rs. ${pricing.weekly})`;
    if (plan === "manage-15days") return `Manage Ads - 15 Days (Rs. ${pricing.fifteenDays})`;
    if (plan === "manage-monthly") return `Manage Ads - 1 Month (Rs. ${pricing.monthly})`;
    return "";
  }

  function getPlanPrice(plan: AdsPlan): string {
    if (plan === "one-time") return String(pricing.oneTime);
    if (plan === "manage-weekly") return String(pricing.weekly);
    if (plan === "manage-15days") return String(pricing.fifteenDays);
    if (plan === "manage-monthly") return String(pricing.monthly);
    return "0";
  }

  function getPlanName(plan: AdsPlan): string {
    if (plan === "one-time") return "One Time Ads Setup";
    if (plan === "manage-weekly") return "Manage Ads - 1 Week";
    if (plan === "manage-15days") return "Manage Ads - 15 Days";
    if (plan === "manage-monthly") return "Manage Ads - 1 Month";
    return "";
  }

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showCredentials && !booked) {
        handleBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [showCredentials, booked]);

  const manageFeatures = React.useMemo(() => [
    "Daily Monitoring",
    "Performance Optimization",
    "Audience Testing",
    "Budget Scaling",
    "Weekly Performance Report",
  ], []);

  const fmtPrice = (n: number) => n >= 1000 ? n.toLocaleString("en-IN") : String(n);

  const managePlans: {
    key: AdsPlan;
    duration: string;
    price: string;
    origPrice: string;
    saving: number;
    badge?: string;
    badgeColor?: string;
    recommended?: boolean;
  }[] = [
    { key: "manage-weekly", duration: "1 Week", price: fmtPrice(pricing.weekly), origPrice: fmtPrice(pricing.origWeekly), saving: pricing.origWeekly - pricing.weekly },
    { key: "manage-15days", duration: "15 Days", price: fmtPrice(pricing.fifteenDays), origPrice: fmtPrice(pricing.origFifteenDays), saving: pricing.origFifteenDays - pricing.fifteenDays, badge: "Recommended", badgeColor: "#0D9488", recommended: true },
    { key: "manage-monthly", duration: "1 Month", price: fmtPrice(pricing.monthly), origPrice: fmtPrice(pricing.origMonthly), saving: pricing.origMonthly - pricing.monthly },
  ];

  function getStockKeyForPlan(plan: AdsPlan): string {
    if (plan === "one-time") return "oneTime";
    if (plan === "manage-weekly") return "weekly";
    if (plan === "manage-15days") return "fifteenDays";
    if (plan === "manage-monthly") return "monthly";
    return "";
  }

  function handleSelectPlan(plan: AdsPlan) {
    const stockKey = getStockKeyForPlan(plan);
    const count = stock[stockKey as keyof typeof stock] || 0;
    if (count <= 0) {
      Alert.alert("Out of Stock", "This plan is currently out of stock. Please try again later.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(plan);
    setShowCredentials(true);
  }

  function handleSelectManagePlan(plan: AdsPlan) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedManagePlan(plan === selectedManagePlan ? null : plan);
  }

  function handleContinueManagePlan() {
    if (selectedManagePlan) {
      handleSelectPlan(selectedManagePlan);
    }
  }

  function handleBack() {
    setShowCredentials(false);
    setSelectedPlan(null);
    setSelectedManagePlan(null);
    setCustomerName(user?.name || "");
    setCustomerPhone(user?.phone || "");
    setIgId("");
    setIgPassword("");
  }

  async function handleSubmit() {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert("Missing Fields", "Please enter your name and phone number");
      return;
    }
    if (customerPhone.replace(/[^0-9]/g, "").length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number");
      return;
    }
    if (!igId.trim() || !igPassword.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please enter your Instagram ID and password",
      );
      return;
    }
    if (!user) return;

    const priceRs = parseInt(getPlanPrice(selectedPlan), 10) || 0;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
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
        setLoading(false);
        return;
      }

      const stockKey = getStockKeyForPlan(selectedPlan);
      if (stockKey) {
        const remaining = await Settings.decrementMetaAdsStock(stockKey);
        if (remaining < 0) {
          Alert.alert("Out of Stock", "Sorry, this plan just went out of stock. Please try again later.");
          setStock((prev) => ({ ...prev, [stockKey]: 0 }));
          setLoading(false);
          return;
        }
        setStock((prev) => ({ ...prev, [stockKey]: remaining }));
      }

      const requirement = `Plan: ${getPlanLabel(selectedPlan)} | Phone: ${customerPhone.trim()} | IG ID: ${igId.trim()} | IG Pass: ${igPassword.trim()}`;
      await saveBooking({
        serviceId: `meta-ads-${selectedPlan}`,
        name: customerName.trim(),
        email: user?.email || "",
        requirement,
      });

      const order = await Orders.create({
        user_id: user.id,
        user_name: customerName.trim(),
        user_email: user?.email || "",
        service_name: "Meta Ads Setup",
        plan: getPlanName(selectedPlan),
        price: getPlanPrice(selectedPlan),
        details: `Phone: ${customerPhone.trim()} | IG ID: ${igId.trim()} | IG Pass: ${igPassword.trim()} | Paid via Wallet (\u20B9${priceRs})`,
        ig_id: igId.trim() || undefined,
        ig_password: igPassword.trim() || undefined,
        customer_phone: customerPhone.trim(),
      });

      await Wallet.addRupees(user.id, -priceRs);
      await Wallet.addTransaction({
        userId: user.id,
        type: "deduction",
        coins: 0,
        amountRupees: -priceRs,
        description: `Payment for ${getPlanName(selectedPlan)}`,
        orderId: order.id,
        createdAt: new Date().toISOString(),
      });

      Earnings.distributeCommissions(user.id, order.id, priceRs).catch(() => {});

      setBooked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => {
          if (showCredentials && !booked) {
            handleBack();
          } else {
            router.back();
          }
        }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Meta Ads Setup
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 24}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <LinearGradient
          colors={isDark ? ["#0D9488", "#065F46"] : ["#0D9488", "#0F766E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="megaphone" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Meta Ads Setup</Text>
          <Text style={styles.heroSubtitle}>
            Instagram Advertising
          </Text>
        </LinearGradient>

        {!showCredentials && !booked && showStockBanner && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInUp.delay(300).springify() : undefined}
            exiting={Platform.OS !== "web" ? FadeOutUp.springify() : undefined}
            style={{
              marginTop: 12, marginBottom: 2, alignSelf: "center",
              borderRadius: 16, overflow: "hidden",
              shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
            }}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Ionicons name="flame" size={16} color="#FFF" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                Only {stock.oneTime + stock.weekly + stock.fifteenDays + stock.monthly} slots left!
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)" }}>
                Book now
              </Text>
              <Pressable
                onPress={() => setShowStockBanner(false)}
                hitSlop={10}
                style={{ marginLeft: 2 }}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}

        {!showCredentials && !booked && (
          <>
            <Animated.Text
              entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
              style={[styles.sectionTitle, { color: colors.text }]}
            >
              Choose Your Plan
            </Animated.Text>

            {/* One Time Ads Setup Card */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(150).springify() : undefined}>
              <Pressable
                style={({ pressed }) => [
                  styles.oneTimeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? "#2A2A3E" : "#E2E8F0",
                    borderWidth: 1,
                    opacity: pressed ? 0.95 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                  cardShadow(colors.cardShadow, 3),
                ]}
                onPress={() => handleSelectPlan("one-time")}
              >
                <LinearGradient
                  colors={["#6366F1", "#818CF8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.basicPlanBadge}
                >
                  <Text style={styles.basicPlanBadgeText}>Basic Plan</Text>
                </LinearGradient>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                  <View style={[styles.oneTimeInfo, { flex: 1, marginRight: 12 }]}>
                    <Text style={[styles.oneTimeTitle, { color: colors.text }]}>One Time Ads Setup</Text>
                    <Text style={[styles.oneTimeDesc, { color: colors.textSecondary }]}>
                      Complete one-time Instagram ad campaign setup with targeting, creatives, and launch
                    </Text>
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
                      alignSelf: "flex-start",
                      backgroundColor: stock.oneTime > 0 ? "#10B98112" : "#EF444412",
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                    }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: stock.oneTime > 0 ? "#10B981" : "#EF4444" }} />
                      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: stock.oneTime > 0 ? "#10B981" : "#EF4444" }}>
                        {stock.oneTime > 0 ? `${stock.oneTime} left` : "Out of stock"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#94A3B8", textDecorationLine: "line-through", marginBottom: 2 }}>&#8377;{fmtPrice(pricing.origOneTime)}</Text>
                    <Text style={[styles.oneTimePrice, { color: colors.tint }]}>&#8377;{pricing.oneTime}</Text>
                    <Text style={[styles.oneTimeSuffix, { color: colors.textSecondary, marginTop: 2 }]}>one time</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981", marginTop: 2 }}>Save &#8377;{pricing.origOneTime - pricing.oneTime}</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            {/* Manage Ads Setup - Premium Section */}
            <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(250).springify() : undefined}>
              <LinearGradient
                colors={isDark ? ["#111827", "#1A1A2E", "#0F172A"] : ["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.manageSection, { borderColor: isDark ? "#1E293B" : "#CBD5E1" }]}
              >
                <LinearGradient
                  colors={["#F97316", "#FB923C"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.growthBadge}
                >
                  <Text style={styles.growthBadgeText}>Premium Plan</Text>
                </LinearGradient>

                <View style={styles.manageTitleRow}>
                  <View style={[styles.manageIconWrap, { backgroundColor: isDark ? "#0D948820" : "#0D948815" }]}>
                    <Ionicons name="trending-up" size={22} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageTitle, { color: colors.text }]}>Manage Ads Setup</Text>
                    <Text style={[styles.manageDesc, { color: colors.textSecondary }]}>
                      Ongoing ad management with optimization, monitoring & performance tracking
                    </Text>
                  </View>
                </View>

                <View style={[styles.featuresDivider, { backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }]} />

                {manageFeatures.map((feat, fi) => (
                  <View key={fi} style={styles.manageFeatureRow}>
                    <View style={[styles.featureCheck, { backgroundColor: "#0D948815" }]}>
                      <Ionicons name="checkmark" size={13} color="#0D9488" />
                    </View>
                    <Text style={[styles.manageFeatureText, { color: colors.text }]}>{feat}</Text>
                  </View>
                ))}

                <View style={[styles.featuresDivider, { backgroundColor: isDark ? "#1E293B" : "#E2E8F0", marginTop: 12 }]} />

                <Text style={[styles.pickPlanLabel, { color: colors.textSecondary }]}>Pick your duration</Text>

                <View style={styles.durationList}>
                  {managePlans.map((mp) => {
                    const isSelected = selectedManagePlan === mp.key;
                    const isRec = mp.recommended === true;
                    const isBest = mp.badge === "Best Value";
                    const accentColor = isSelected ? "#0D9488" : isRec ? "#0D948860" : isBest ? "#F59E0B60" : (isDark ? "#4B5563" : "#D1D5DB");
                    return (
                      <Pressable
                        key={mp.key}
                        style={({ pressed }) => [
                          styles.durationCard,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? "#0D948815" : "#0D948810")
                              : (isDark ? "#1A1A2E" : "#FFFFFF"),
                            borderColor: accentColor,
                            borderWidth: isSelected ? 2 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                          isSelected && {
                            shadowColor: "#0D9488",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 4,
                          },
                        ]}
                        onPress={() => handleSelectManagePlan(mp.key)}
                      >
                        <View style={styles.durationLeft}>
                          <View style={[styles.durationRadio, { borderColor: isSelected ? "#0D9488" : (isDark ? "#4B5563" : "#CBD5E1") }]}>
                            {isSelected && <View style={[styles.durationRadioInner, { backgroundColor: "#0D9488" }]} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.durationLabelRow}>
                              <Text style={[styles.durationTitle, { color: colors.text }]}>{mp.duration}</Text>
                              {mp.badge && (
                                <View style={[styles.durationBadge, { backgroundColor: mp.badgeColor }]}>
                                  <Text style={styles.durationBadgeText}>{mp.badge}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.durationSub, { color: colors.textSecondary }]}>
                              {isRec ? "Most popular choice" : isBest ? "Maximum savings" : "Quick trial"}
                            </Text>
                            {(() => {
                              const stockKey = mp.key === "manage-weekly" ? "weekly" : mp.key === "manage-15days" ? "fifteenDays" : "monthly";
                              const count = stock[stockKey as keyof typeof stock] || 0;
                              return (
                                <View style={{
                                  flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4,
                                  alignSelf: "flex-start",
                                  backgroundColor: count > 0 ? "#10B98112" : "#EF444412",
                                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                                }}>
                                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: count > 0 ? "#10B981" : "#EF4444" }} />
                                  <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: count > 0 ? "#10B981" : "#EF4444" }}>
                                    {count > 0 ? `${count} left` : "Out of stock"}
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                        <View style={styles.durationRight}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#94A3B8", textDecorationLine: "line-through", textAlign: "right" }}>&#8377;{mp.origPrice}</Text>
                          <View style={styles.durationPriceRow}>
                            <Text style={styles.durationCurrency}>&#8377;</Text>
                            <Text style={[styles.durationPrice, { color: colors.text }]}>{mp.price}</Text>
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#10B981", textAlign: "right" }}>Save &#8377;{fmtPrice(mp.saving)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedManagePlan && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.continueBtn,
                      { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                    onPress={handleContinueManagePlan}
                  >
                    <LinearGradient
                      colors={["#0D9488", "#14B8A6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.continueBtnGradient}
                    >
                      <Text style={styles.continueBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                  </Pressable>
                )}
              </LinearGradient>
            </Animated.View>

            <Animated.View
              entering={Platform.OS !== "web" ? FadeInDown.delay(400).springify() : undefined}
              style={styles.trustRow}
            >
              <Ionicons name="shield-checkmark" size={16} color="#0D9488" />
              <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                Designed to reduce cost per lead and maximize ROI.
              </Text>
            </Animated.View>
          </>
        )}

        {booked && (
          <View
            style={[
              styles.successCard,
              { backgroundColor: colors.success + "15" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.success}
            />
            <Text style={[styles.successTitle, { color: colors.success }]}>
              Submitted Successfully!
            </Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              We've received your {getPlanLabel(selectedPlan)} request. Our team
              will set up your ads and reach out shortly.
            </Text>
          </View>
        )}

        {showCredentials && !booked && (
          <View
            style={[
              styles.credForm,
              { backgroundColor: colors.card, marginBottom: Platform.OS === "android" ? 60 : 0 },
              cardShadow(colors.cardShadow, 4),
            ]}
          >
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                Account Details
              </Text>
              <Pressable onPress={handleBack} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View
              style={[
                styles.selectedPlanBadge,
                { backgroundColor: colors.tintLight },
              ]}
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.tint} />
              <Text style={[styles.selectedPlanText, { color: colors.tint }]}>
                {getPlanLabel(selectedPlan)}
              </Text>
            </View>

            <View style={styles.credSectionHeader}>
              <Ionicons name="person-circle-outline" size={20} color={colors.tint} />
              <Text style={[styles.credSectionTitle, { color: colors.text }]}>
                Customer Info
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Customer Name
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.placeholder}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Phone Number
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={colors.placeholder} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.placeholder}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View
              style={[
                styles.sectionDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.credSectionHeader}>
              <Ionicons name="logo-instagram" size={20} color="#E4405F" />
              <Text style={[styles.credSectionTitle, { color: colors.text }]}>
                Instagram
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Instagram ID / Username
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter Instagram ID"
                  placeholderTextColor={colors.placeholder}
                  value={igId}
                  onChangeText={setIgId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Instagram Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter Your password"
                  placeholderTextColor={colors.placeholder}
                  value={igPassword}
                  onChangeText={setIgPassword}
                  secureTextEntry={!showIgPass}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowIgPass(!showIgPass)}
                  hitSlop={12}
                >
                  <Ionicons
                    name={showIgPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.placeholder}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Pay with Wallet</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={{ height: keyboardOpen ? 200 : 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scrollContent: { paddingHorizontal: 20 },
  heroBanner: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 16, letterSpacing: -0.3 },
  oneTimeCard: { borderRadius: 18, padding: 18, marginBottom: 18, position: "relative" as const, overflow: "hidden" as const },
  basicPlanBadge: {
    position: "absolute" as const,
    top: 0,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  basicPlanBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  oneTimeInfo: { marginBottom: 12 },
  oneTimeTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  oneTimeDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  oneTimePriceRow: { flexDirection: "row" as const, alignItems: "baseline" as const, gap: 6 },
  oneTimePrice: { fontSize: 24, fontFamily: "Inter_700Bold" },
  oneTimeSuffix: { fontSize: 13, fontFamily: "Inter_400Regular" },
  manageSection: { borderRadius: 22, padding: 20, marginBottom: 16, borderWidth: 1, overflow: "hidden" as const },
  growthBadge: {
    position: "absolute" as const,
    top: 0,
    right: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  growthBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  manageTitleRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 14, marginTop: 12 },
  manageIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
  manageTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  manageDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  featuresDivider: { height: 1, marginVertical: 14 },
  manageFeatureRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 4 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center" as const, justifyContent: "center" as const },
  manageFeatureText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  pickPlanLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 0.8 },
  durationList: { gap: 10 },
  durationCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  durationLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  durationRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  durationRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  durationLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  durationTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" as const, letterSpacing: 0.3 },
  durationSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  durationRight: { alignItems: "flex-end" as const },
  durationPriceRow: { flexDirection: "row" as const, alignItems: "baseline" as const, gap: 1 },
  durationCurrency: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0D9488" },
  durationPrice: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  continueBtn: { marginTop: 16 },
  continueBtnGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  continueBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  trustRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  trustText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" as const, flex: 1 },
  successCard: { borderRadius: 20, padding: 32, alignItems: "center", gap: 12 },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  successDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  credForm: { borderRadius: 20, padding: 20, gap: 14 },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  selectedPlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectedPlanText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionDivider: { height: 1, marginVertical: 2 },
  credSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  credSectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
