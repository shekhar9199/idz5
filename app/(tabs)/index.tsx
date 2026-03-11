import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { router, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withSequence, withDelay } from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { services } from "@/lib/data";
import { cardShadow } from "@/lib/shadows";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ChatFAB() {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withDelay(3000, withSpring(1.15, { damping: 4 })),
        withSpring(1, { damping: 8 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View style={fabStyles.container}>
      <Animated.View style={[fabStyles.pulseRing, { backgroundColor: colors.tint }, pulseStyle]} />
      <AnimatedPressable
        style={[fabStyles.button, { backgroundColor: colors.tint }, animatedStyle]}
        onPressIn={() => { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/chat");
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
      </AnimatedPressable>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 120 : 100,
    right: 20,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)" } as any,
      default: {
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
});

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/auth" />;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
            progressViewOffset={topPadding}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "User"}</Text>
          </View>
          <Pressable
            style={[styles.avatarButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/profile");
            }}
          >
            <Text style={styles.avatarText}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <LinearGradient
          colors={isDark ? ["#0D9488", "#065F46"] : ["#0D9488", "#0F766E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Grow your business with our best plan</Text>
            <Text style={styles.heroSubtitle}>
              You're one step away from growing your business online.
            </Text>
            <Pressable
              style={styles.heroButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/services");
              }}
            >
              <Text style={styles.heroButtonText}>Explore Services</Text>
              <Ionicons name="arrow-forward" size={16} color="#0D9488" />
            </Pressable>
          </View>
          <View style={styles.heroDecoration}>
            <View style={[styles.heroCircle, styles.heroCircle1]} />
            <View style={[styles.heroCircle, styles.heroCircle2]} />
          </View>
        </LinearGradient>

        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1, marginBottom: 24 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/invite-earn");
          }}
        >
          <LinearGradient
            colors={isDark ? ["#312E81", "#4C1D95", "#581C87"] : ["#8B5CF6", "#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inviteBanner}
          >
            <View style={styles.inviteCoinWrap}>
              <Ionicons name="gift" size={20} color="#FCD34D" />
            </View>
            <View style={styles.inviteLeft}>
              <Text style={styles.inviteTitle}>Refer & Earn <Text style={styles.inviteRupee}>₹10</Text></Text>
              <Text style={styles.inviteDesc}>Invite friends & earn for every new member</Text>
            </View>
            <View style={styles.inviteBtn}>
              <Text style={styles.inviteBtnText}>Invite</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Services</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/services")}
            hitSlop={12}
          >
            <Text style={[styles.seeAll, { color: colors.tint }]}>See All</Text>
          </Pressable>
        </View>

        {services.map((service) => (
          <Pressable
            key={service.id}
            style={({ pressed }) => [
              styles.serviceCard,
              {
                backgroundColor: colors.card,
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
              cardShadow(colors.cardShadow),
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (service.id === "subscriptions") {
                router.push("/subscriptions");
              } else {
                router.push("/meta-ads-category");
              }
            }}
          >
            <View style={[styles.serviceIconContainer, { backgroundColor: colors.tintLight }]}>
              <Ionicons name={service.icon as any} size={24} color={colors.tint} />
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceTitleRow}>
                <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.title}</Text>
              </View>
              <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {service.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        ))}

        <View style={styles.trustBadge}>
          <View style={[styles.trustDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]} />
          <View style={styles.trustContent}>
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={[styles.trustText, { color: colors.textSecondary }]}>100% Safe & Secure</Text>
            </View>
            <View style={styles.trustRow}>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              <Text style={[styles.trustSubText, { color: colors.textSecondary }]}>Encrypted Payments</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ChatFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  avatarButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  heroBanner: {
    borderRadius: 20, padding: 24, marginBottom: 28, overflow: "hidden", position: "relative" as const,
  },
  heroContent: { zIndex: 1 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 30, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 20, marginBottom: 20 },
  heroButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", alignSelf: "flex-start",
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8,
  },
  heroButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0D9488" },
  heroDecoration: { position: "absolute" as const, top: 0, right: 0, bottom: 0, width: 150 },
  heroCircle: { position: "absolute" as const, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.1)" },
  heroCircle1: { width: 120, height: 120, top: -20, right: -30 },
  heroCircle2: { width: 80, height: 80, bottom: -10, right: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  serviceCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 12 },
  serviceIconContainer: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  serviceInfo: { flex: 1 },
  serviceTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  serviceTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  serviceDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  inviteBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
    overflow: "hidden",
  },
  inviteDotTL: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    zIndex: 0,
  },
  inviteDotBR: {
    position: "absolute",
    bottom: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inviteCoinWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 3,
  },
  inviteLeft: { flex: 1 },
  inviteTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    marginBottom: 2,
  },
  inviteRupee: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FCD34D",
  },
  inviteDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  inviteBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  inviteBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  trustBadge: { marginTop: 12, alignItems: "center" },
  trustDivider: { width: "40%", height: 1, marginBottom: 16 },
  trustContent: { alignItems: "center", gap: 8 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  trustSubText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
