import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/lib/useTheme";
import { getOttApps } from "@/lib/admin-storage";
import type { OttApp } from "@/lib/admin-storage";
import { cardShadow } from "@/lib/shadows";
import { Settings } from "@/lib/firestore";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 56) / 2;

const CATEGORIES = [
  { key: "popular", label: "Popular", icon: "flame-outline" as const },
  { key: "business", label: "Business Growth", icon: "trending-up-outline" as const },
  { key: "ott", label: "OTT Subscriptions", icon: "tv-outline" as const },
  { key: "offers", label: "Offers", icon: "pricetag-outline" as const },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Choose Service", desc: "Browse our premium services", icon: "search-outline" as const, color: "#6366F1" },
  { step: "2", title: "Place Order", desc: "Complete your purchase securely", icon: "cart-outline" as const, color: "#0D9488" },
  { step: "3", title: "Team Connects", desc: "Our expert team reaches out", icon: "people-outline" as const, color: "#F59E0B" },
  { step: "4", title: "Delivered", desc: "Ready in 24 hours", icon: "checkmark-circle-outline" as const, color: "#10B981" },
];

export default function ServicesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeCategory, setActiveCategory] = useState("popular");
  const scrollRef = useRef<ScrollView>(null);
  const ottSectionY = useRef(0);
  const businessSectionY = useRef(0);
  const [ottApps, setOttApps] = useState<OttApp[]>([]);
  const [ottLoading, setOttLoading] = useState(true);
  const [metaPrice, setMetaPrice] = useState(499);
  const [metaOrigPrice, setMetaOrigPrice] = useState(699);

  useEffect(() => {
    Promise.all([
      getOttApps().catch(() => []),
      Settings.getMetaAdsPricing().catch(() => null),
    ]).then(([apps, pricing]) => {
      setOttApps(apps as OttApp[]);
      setOttLoading(false);
      if (pricing) { setMetaPrice(pricing.weekly); setMetaOrigPrice(pricing.origWeekly); }
    });
  }, []);

  function scrollToSection(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(key);
    if (key === "ott" && scrollRef.current) {
      scrollRef.current.scrollTo({ y: ottSectionY.current - 80, animated: true });
    } else if ((key === "business" || key === "popular") && scrollRef.current) {
      scrollRef.current.scrollTo({ y: businessSectionY.current - 80, animated: true });
    } else if (key === "offers") {
      router.push("/subscriptions");
    }
  }

  const cardBg = isDark ? "#111B2E" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "#EEF2F6";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={isDark ? ["#0F172A", "#0D9488", "#065F46"] : ["#F0FDFA", "#CCFBF1", "#99F6E4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={[styles.heroPill, { backgroundColor: isDark ? "rgba(13,148,136,0.3)" : "rgba(13,148,136,0.15)" }]}>
                <Ionicons name="sparkles" size={11} color={colors.tint} />
                <Text style={[styles.heroPillText, { color: colors.tint }]}>Premium Services</Text>
              </View>
              <Text style={[styles.heroTitle, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
                Grow Faster.{"\n"}Save More.
              </Text>
              <Text style={[styles.heroSubtitle, { color: isDark ? "#94A3B8" : "#475569" }]}>
                Marketing, subscriptions & digital services — all in one platform.
              </Text>

              <View style={styles.heroStatsRow}>
                {[
                  { value: "500+", label: "Campaigns", icon: "rocket" as const, color: "#6366F1" },
                  { value: "98%", label: "Success", icon: "trophy" as const, color: "#F59E0B" },
                  { value: "24/7", label: "Support", icon: "headset" as const, color: "#0D9488" },
                ].map((s) => (
                  <View key={s.label} style={[styles.heroStatCard, { backgroundColor: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.7)" }]}>
                    <Ionicons name={s.icon} size={14} color={s.color} />
                    <Text style={[styles.heroStatValue, { color: isDark ? "#FFF" : "#0F172A" }]}>{s.value}</Text>
                    <Text style={[styles.heroStatLabel, { color: isDark ? "rgba(255,255,255,0.6)" : "#475569" }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.heroBtnRow}>
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, flex: 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    scrollRef.current?.scrollTo({ y: businessSectionY.current - 80, animated: true });
                  }}
                >
                  <LinearGradient colors={["#0D9488", "#14B8A6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroBtnPrimary}>
                    <Ionicons name="rocket-outline" size={15} color="#FFF" />
                    <Text style={styles.heroBtnPrimaryText}>Explore Services</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.heroBtnSecondary,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(13,148,136,0.08)", borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(13,148,136,0.2)", opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/subscriptions");
                  }}
                >
                  <Ionicons name="pricetag-outline" size={14} color={isDark ? "#5EEAD4" : colors.tint} />
                  <Text style={[styles.heroBtnSecondaryText, { color: isDark ? "#5EEAD4" : colors.tint }]}>Offers</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    isActive
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: isDark ? "#334155" : "#E2E8F0", borderWidth: 1 },
                  ]}
                  onPress={() => scrollToSection(cat.key)}
                >
                  <Ionicons name={cat.icon} size={14} color={isActive ? "#FFF" : colors.textSecondary} />
                  <Text style={[styles.categoryChipText, { color: isActive ? "#FFF" : colors.text }]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          onLayout={(e) => { businessSectionY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionLine, { backgroundColor: colors.tint }]} />
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#0F172A" }]}>Business Services</Text>
            </View>
            <View style={[styles.sectionBadge, { backgroundColor: "#EF444415" }]}>
              <Ionicons name="flame" size={11} color="#EF4444" />
              <Text style={[styles.sectionBadgeText, { color: "#EF4444" }]}>Hot</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/meta-ads-category");
            }}
          >
            <LinearGradient
              colors={isDark ? ["#0D9488", "#0F766E", "#115E59"] : ["#14B8A6", "#0D9488", "#0F766E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metaCard}
            >
              <View style={styles.metaCardTop}>
                <View style={styles.metaIconRow}>
                  <View style={styles.metaIconCircle}>
                    <Ionicons name="logo-facebook" size={15} color="#FFF" />
                  </View>
                  <View style={styles.metaIconCircle}>
                    <Ionicons name="logo-instagram" size={15} color="#FFF" />
                  </View>
                </View>
                <View style={styles.metaBadgeRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="star" size={10} color="#FCD34D" />
                    <Text style={styles.metaBadgeText}>4.9</Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: "rgba(239,68,68,0.25)" }]}>
                    <Ionicons name="flame" size={10} color="#FB923C" />
                    <Text style={styles.metaBadgeText}>Popular</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.metaTitle}>Meta Ads Setup</Text>
              <Text style={styles.metaDesc}>
                Professional Facebook & Instagram ad campaigns to grow your business with more leads and sales.
              </Text>

              <View style={styles.metaFeatures}>
                {[
                  { icon: "trending-up-outline" as const, label: "Campaign Setup" },
                  { icon: "people-outline" as const, label: "Audience Targeting" },
                  { icon: "color-palette-outline" as const, label: "Creative Design" },
                  { icon: "analytics-outline" as const, label: "Performance Reports" },
                ].map((f) => (
                  <View key={f.label} style={styles.metaFeatureChip}>
                    <Ionicons name={f.icon} size={12} color="#FFF" />
                    <Text style={styles.metaFeatureText}>{f.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.metaBottom}>
                <View>
                  <Text style={styles.metaStarting}>Starting from</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#94A3B8", textDecorationLine: "line-through" }}>₹{metaOrigPrice}/week</Text>
                  <Text style={styles.metaPrice}>₹{metaPrice}<Text style={styles.metaPriceSuffix}>/week</Text></Text>
                </View>
                <View style={styles.metaCta}>
                  <Text style={styles.metaCtaText}>View Plans</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          <View style={styles.metaTrustRow}>
            {[
              { icon: "shield-checkmark-outline" as const, text: "Money Back Guarantee" },
              { icon: "time-outline" as const, text: "Within 24hrs" },
              { icon: "chatbubble-ellipses-outline" as const, text: "Dedicated Manager" },
            ].map((t) => (
              <View key={t.text} style={[styles.metaTrustItem, { backgroundColor: cardBg, borderColor: cardBorder }, !isDark && cardShadow("rgba(0,0,0,0.04)", 5)]}>
                <Ionicons name={t.icon} size={14} color={colors.tint} />
                <Text style={[styles.metaTrustText, { color: colors.textSecondary }]}>{t.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          onLayout={(e) => { ottSectionY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionLine, { backgroundColor: "#F97316" }]} />
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#0F172A" }]}>OTT Subscriptions</Text>
            </View>
            <Pressable
              style={[styles.viewAllBtn, { backgroundColor: "#F9731612" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/subscriptions");
              }}
            >
              <Text style={[styles.viewAllText, { color: "#F97316" }]}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color="#F97316" />
            </Pressable>
          </View>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Premium subscriptions at the best prices
          </Text>

          <View style={styles.ottGrid}>
            {ottLoading ? (
              <View style={styles.ottLoadingWrap}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : ottApps.length === 0 ? (
              <Text style={[styles.ottEmptyText, { color: colors.textSecondary }]}>No subscriptions available yet</Text>
            ) : (
              ottApps.slice(0, 4).map((app, index) => {
                const isOutOfStock = (app.stockCount ?? 0) <= 0 || app.outOfStock;
                const isLowStock = !isOutOfStock && (app.stockCount ?? 0) <= 5;
                return (
                  <Pressable
                    key={app.id}
                    style={({ pressed }) => [
                      styles.ottCard,
                      { backgroundColor: cardBg, borderColor: cardBorder, opacity: pressed ? 0.92 : 1 },
                      isDark ? cardShadow(colors.cardShadow) : cardShadow("rgba(0,0,0,0.04)", 5),
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/subscriptions");
                    }}
                  >
                    <View style={[styles.ottAccent, { backgroundColor: app.color }]} />
                    {isOutOfStock ? (
                      <View style={[styles.ottBadge, { backgroundColor: "#EF4444" }]}>
                        <Text style={styles.ottBadgeText}>OUT OF STOCK</Text>
                      </View>
                    ) : index === 0 ? (
                      <View style={[styles.ottBadge, { backgroundColor: "#10B981" }]}>
                        <Text style={styles.ottBadgeText}>BEST DEAL</Text>
                      </View>
                    ) : isLowStock ? (
                      <View style={[styles.ottBadge, { backgroundColor: "#F59E0B" }]}>
                        <Text style={styles.ottBadgeText}>LOW STOCK</Text>
                      </View>
                    ) : null}
                    <View style={[styles.ottIconWrap, { backgroundColor: app.color + "15" }]}>
                      <MaterialCommunityIcons name={app.icon as any} size={26} color={app.color} />
                    </View>
                    <Text style={[styles.ottName, { color: colors.text }]} numberOfLines={1}>{app.name}</Text>
                    <Text style={[styles.ottDesc, { color: colors.textSecondary }]} numberOfLines={2}>{app.description}</Text>
                    <View style={styles.ottPriceRow}>
                      <Text style={[styles.ottPrice, { color: app.color }]}>₹{app.price}</Text>
                      <Text style={[styles.ottPeriod, { color: colors.textSecondary }]}>/mo</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionLine, { backgroundColor: "#6366F1" }]} />
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : "#0F172A" }]}>How It Works</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsScroll}>
            {HOW_IT_WORKS.map((step, i) => (
              <View key={step.step} style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }, isDark ? cardShadow(colors.cardShadow) : cardShadow("rgba(0,0,0,0.04)", 5)]}>
                <View style={[styles.stepTopAccent, { backgroundColor: step.color }]} />
                <View style={[styles.stepCircle, { backgroundColor: step.color + "15" }]}>
                  <Ionicons name={step.icon} size={20} color={step.color} />
                </View>
                <Text style={[styles.stepNumber, { color: step.color }]}>Step {step.step}</Text>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
                {i < HOW_IT_WORKS.length - 1 && (
                  <View style={styles.stepArrow}>
                    <Ionicons name="arrow-forward" size={14} color={isDark ? "#334155" : "#CBD5E1"} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={[styles.guaranteeBanner, { backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)" }]}>
            {[
              { icon: "time-outline" as const, text: "24hrs Delivery" },
              { icon: "shield-checkmark-outline" as const, text: "100% Guarantee" },
              { icon: "headset-outline" as const, text: "24/7 Support" },
            ].map((b, i) => (
              <View key={b.text} style={styles.guaranteeItem}>
                <View style={[styles.guaranteeIconBg, { backgroundColor: "#10B98118" }]}>
                  <Ionicons name={b.icon} size={16} color="#10B981" />
                </View>
                <Text style={[styles.guaranteeText, { color: colors.text }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/chat");
            }}
          >
            <LinearGradient
              colors={isDark ? ["#1E293B", "#0F172A"] : ["#F0FDFA", "#ECFDF5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.ctaCard, { borderColor: isDark ? "#334155" : "#A7F3D0" }]}
            >
              <View style={styles.ctaRow}>
                <View style={[styles.ctaIcon, { backgroundColor: colors.tint + "18" }]}>
                  <Ionicons name="chatbubbles" size={24} color={colors.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ctaTitle, { color: colors.text }]}>Need help choosing?</Text>
                  <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
                    Chat with our experts for personalized recommendations
                  </Text>
                </View>
                <View style={[styles.ctaArrow, { backgroundColor: colors.tint }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  heroGradient: {
    borderRadius: 24,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroContent: {
    padding: 22,
    paddingBottom: 24,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  heroStatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  heroBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
  },
  heroBtnPrimaryText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  heroBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroBtnSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  categoryScroll: {
    paddingBottom: 4,
    gap: 8,
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLine: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginLeft: 12,
    marginBottom: 16,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  metaCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
  },
  metaCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  metaIconRow: {
    flexDirection: "row",
    gap: 6,
  },
  metaIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  metaTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  metaDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    marginBottom: 16,
  },
  metaFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 18,
  },
  metaFeatureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  metaFeatureText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  metaBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 14,
  },
  metaStarting: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 1,
  },
  metaPrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  metaPriceSuffix: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  metaCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  metaCtaText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  metaTrustRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  metaTrustItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  metaTrustText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },

  ottGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  ottLoadingWrap: {
    width: "100%",
    paddingVertical: 40,
    alignItems: "center",
  },
  ottEmptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    width: "100%",
    paddingVertical: 30,
  },
  ottCard: {
    width: CARD_W,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  ottAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  ottBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  ottBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  ottIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ottName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  ottDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
  ottPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  ottPrice: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  ottPeriod: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  stepsScroll: {
    gap: 10,
    paddingVertical: 12,
    paddingRight: 20,
  },
  stepCard: {
    width: 140,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  stepTopAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  stepCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
    textAlign: "center",
  },
  stepDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
  stepArrow: {
    position: "absolute",
    right: -5,
    top: "50%",
    marginTop: -7,
  },

  guaranteeBanner: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  guaranteeItem: {
    alignItems: "center",
    gap: 6,
  },
  guaranteeIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  guaranteeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  ctaCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 8,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  ctaSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  ctaArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

});
