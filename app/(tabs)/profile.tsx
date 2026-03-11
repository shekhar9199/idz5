import React, { useState, useEffect, useCallback, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import Svg, { G, Path, Text as SvgText, Circle, Defs, RadialGradient, Stop, Line } from "react-native-svg";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Settings, Users, Wallet } from "@/lib/firestore";
import type { UserProfile } from "@/lib/firestore";

const SPIN_SEGMENTS = [
  { label: "5", coins: 5, color: "#EF4444" },
  { label: "10", coins: 10, color: "#F59E0B" },
  { label: "2", coins: 2, color: "#10B981" },
  { label: "20", coins: 20, color: "#3B82F6" },
  { label: "1", coins: 1, color: "#8B5CF6" },
  { label: "15", coins: 15, color: "#EC4899" },
  { label: "3", coins: 3, color: "#14B8A6" },
  { label: "50", coins: 50, color: "#F97316" },
];
const SEGMENT_ANGLE = 360 / SPIN_SEGMENTS.length;
const SCREEN_W = Dimensions.get("window").width;
const WHEEL_SIZE = Math.min(SCREEN_W * 0.82, 320);
const WHEEL_RADIUS = WHEEL_SIZE / 2;

export default function ProfileScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinVisible, setSpinVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinAngleRef = useRef(0);
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const spinBtnScale = useRef(new Animated.Value(1)).current;

  const spinsAvailable = Math.max(0, (profile?.spinsEarned || 0) - (profile?.spinsUsed || 0));

  useEffect(() => {
    if (spinsAvailable <= 0) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleScale, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bubbleScale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [spinsAvailable]);

  function getWheelPath(index: number) {
    const startAngle = (index * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const x1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(startAngle);
    const y1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(startAngle);
    const x2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(endAngle);
    const y2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(endAngle);
    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
    return `M${WHEEL_RADIUS},${WHEEL_RADIUS} L${x1},${y1} A${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArc} 1 ${x2},${y2} Z`;
  }

  function getTextPosition(index: number) {
    const midAngle = ((index + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const r = WHEEL_RADIUS * 0.65;
    return {
      x: WHEEL_RADIUS + r * Math.cos(midAngle),
      y: WHEEL_RADIUS + r * Math.sin(midAngle),
      rotation: (index + 0.5) * SEGMENT_ANGLE,
    };
  }

  async function handleSpin() {
    if (!user || spinning || spinsAvailable <= 0) return;

    const freshProfile = await Users.getById(user.id);
    const freshAvailable = Math.max(0, (freshProfile?.spinsEarned || 0) - (freshProfile?.spinsUsed || 0));
    if (freshAvailable <= 0) {
      setProfile(freshProfile);
      Alert.alert("No Spins", "You don't have any spins available. Complete an order to earn a spin!");
      return;
    }

    setSpinning(true);
    setSpinResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const winIndex = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const winCoins = SPIN_SEGMENTS[winIndex].coins;
    const padding = SEGMENT_ANGLE * 0.15;
    const randomOffset = padding + Math.random() * (SEGMENT_ANGLE - 2 * padding);
    const targetSegmentAngle = 360 - (winIndex * SEGMENT_ANGLE + randomOffset);
    const totalRotation = 360 * 5 + targetSegmentAngle;
    const prevAngle = spinAngleRef.current;
    const newAngle = prevAngle + totalRotation;
    spinAngleRef.current = newAngle;

    Animated.timing(spinAnim, {
      toValue: newAngle,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      setSpinResult(winCoins);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        const now = new Date().toISOString();
        const currentUser = await Users.getById(user.id);
        const currentCoins = currentUser?.walletCoins || 0;
        const usedNow = (currentUser?.spinsUsed || 0) + 1;
        await Users.update(user.id, {
          walletCoins: currentCoins + winCoins,
          spinsUsed: usedNow,
          lastSpinDate: now,
        });
        await Wallet.addTransaction({
          userId: user.id,
          type: "spin_reward",
          coins: winCoins,
          description: `Spin & Win reward: ${winCoins} Digi coins`,
          createdAt: now,
        });
        const updatedProfile = await Users.getById(user.id);
        setProfile(updatedProfile);
      } catch {
        Alert.alert("Error", "Could not save reward. Please try again.");
      }
      setSpinning(false);
    });
  }

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [wp, prof] = await Promise.all([
        Settings.getWhatsAppNumber(),
        Users.getById(user.id),
      ]);
      setWhatsappNumber(wp);
      setProfile(prof);
      setWalletBalance(prof?.walletBalance || 0);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setWalletLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProfileData(); }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setWalletLoading(true);
    await loadProfileData();
    setRefreshing(false);
  }, [loadProfileData]);

  function handleWhatsApp() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!whatsappNumber) {
      Alert.alert("Not Available", "WhatsApp contact is not set up yet.");
      return;
    }
    Linking.openURL(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`).catch(() => {
      Alert.alert("Error", "Could not open WhatsApp.");
    });
  }

  if (isLoading || !isAuthenticated) return null;

  function handleLogout() {
    setSettingsVisible(false);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/auth");
        },
      },
    ]);
  }

  const initials = (user?.name || "U").charAt(0).toUpperCase();
  const rupeeBalance = React.useMemo(() => walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [walletBalance]);

  const menuItems = React.useMemo(() => [
    { icon: "bag-handle-outline" as const, label: "My Orders", color: "#3B82F6", onPress: () => router.push("/(tabs)/orders") },
    { icon: "diamond-outline" as const, label: "Subscriptions", color: "#8B5CF6", onPress: () => router.push("/subscriptions") },
    { icon: "call-outline" as const, label: "Contact Us", color: "#25D366", onPress: () => router.push("/contact-us" as any) },
    { icon: "document-text-outline" as const, label: "Legal & Policies", color: "#6366F1", onPress: () => router.push("/legal" as any) },
    {
      icon: "information-circle-outline" as const,
      label: "About App",
      color: "#64748B",
      value: "v1.0.0",
      onPress: () => {},
      isAbout: true,
    },
  ], []);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPadding + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} />
        }
      >
        {error ? (
          <View style={s.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.errorText, { color: colors.text }]}>{error}</Text>
            <Pressable
              style={[s.retryBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setError(null); setWalletLoading(true); loadProfileData(); }}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={s.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
        <>
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <View style={[s.avatar, { backgroundColor: colors.tint }]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: colors.text }]} numberOfLines={1}>{user?.name}</Text>
              <Text style={[s.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
          <Pressable
            style={[s.settingsBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSettingsVisible(true); }}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.referCard, { opacity: pressed ? 0.93 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/invite-earn"); }}
        >
          <LinearGradient
            colors={["#2E1065", "#5B21B6", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.referGradient}
          >
            <View style={s.referGlassHighlight} />
            <View style={s.referGlowBlob} />

            <View style={s.referTopRow}>
              <Text style={s.referSectionLabel}>MY PROFILE</Text>
              <Pressable
                style={s.deIdRow}
                onPress={async () => {
                  if (!profile?.uniqueId) return;
                  await Clipboard.setStringAsync(profile.uniqueId);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setIdCopied(true);
                  setTimeout(() => setIdCopied(false), 2000);
                }}
              >
                <View style={s.deIdCapsule}>
                  <Text style={s.deIdCapsuleText}>DZ ID : {profile?.uniqueId || "—"}</Text>
                </View>
                <Ionicons
                  name={idCopied ? "checkmark-circle" : "copy-outline"}
                  size={14}
                  color={idCopied ? "#86EFAC" : "rgba(255,255,255,0.5)"}
                />
                {idCopied && <Text style={s.copiedLabel}>Copied!</Text>}
              </Pressable>
            </View>

            <View style={s.referTaglineBlock}>
              <View style={s.referTaglineOneLine}>
                <Text style={s.referTaglineMain}>The Platform we build</Text>
                <Text style={s.referTaglineDot}> · </Text>
                <Text style={s.referTaglineMid}>Your Trust</Text>
              </View>

              <View style={s.referDivider} />
              <View style={s.referBottomRow}>
                <Text style={s.referBottomText}>🚀 Grow & Earn with us</Text>
                <Ionicons name="arrow-forward-outline" size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={[s.menuCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
          <Pressable
            style={({ pressed }) => [s.menuRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/wallet"); }}
          >
            <View style={[s.menuIconWrap, { backgroundColor: "#3B82F612" }]}>
              <Ionicons name="wallet-outline" size={18} color="#3B82F6" />
            </View>
            <Text style={[s.menuLabel, { color: colors.text }]}>Wallet</Text>
            {walletLoading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 4 }} />
            ) : (
              <Text style={[s.walletBalanceText, { color: colors.text }]}>
                {balanceVisible ? `\u20B9${rupeeBalance}` : "\u20B9\u2022\u2022\u2022\u2022"}
              </Text>
            )}
            <Pressable
              onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBalanceVisible(!balanceVisible); }}
              hitSlop={8}
              style={s.walletActionBtn}
            >
              <Ionicons name={balanceVisible ? "eye-outline" : "eye-off-outline"} size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/wallet"); }}
              hitSlop={8}
              style={[s.walletAddBtn, { backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)" }]}
            >
              <Ionicons name="add" size={18} color="#3B82F6" />
            </Pressable>
          </Pressable>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <View style={[s.menuSep, { backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)" }]} />
              <Pressable
                style={({ pressed }) => [s.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
                onLongPress={item.isAbout ? () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  router.push("/admin-login");
                } : undefined}
                delayLongPress={800}
              >
                <View style={[s.menuIconWrap, { backgroundColor: item.color + "12" }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[s.menuLabel, { color: colors.text }]}>{item.label}</Text>
                {item.value && <Text style={[s.menuValue, { color: colors.textSecondary }]}>{item.value}</Text>}
                <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 100 }} />
        </>
        )}
      </ScrollView>

      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setSettingsVisible(false)}>
          <Pressable style={[s.modalBox, { backgroundColor: isDark ? "#111827" : "#FFF" }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
            <Text style={[s.modalTitle, { color: colors.text }]}>Settings</Text>

            <Pressable
              style={({ pressed }) => [s.modalRow, { backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSettingsVisible(false);
                router.push("/edit-profile");
              }}
            >
              <View style={[s.modalIconWrap, { backgroundColor: "#3B82F612" }]}>
                <Ionicons name="person-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={[s.modalRowLabel, { color: colors.text }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>

            <View style={[s.menuSep, { backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)", marginHorizontal: 0 }]} />

            <View style={s.modalThemeSection}>
              <Text style={[s.modalThemeLabel, { color: colors.textSecondary }]}>Appearance</Text>
              <View style={s.themeRow}>
                {([
                  { key: "light" as const, label: "Light", icon: "sunny" as const },
                  { key: "dark" as const, label: "Dark", icon: "moon" as const },
                  { key: "system" as const, label: "System", icon: "phone-portrait" as const },
                ]).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      s.themeOption,
                      {
                        backgroundColor: themeMode === opt.key
                          ? colors.tint + "15"
                          : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        borderColor: themeMode === opt.key ? colors.tint + "40" : "transparent",
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setThemeMode(opt.key);
                    }}
                  >
                    <Ionicons name={opt.icon} size={16} color={themeMode === opt.key ? colors.tint : colors.textSecondary} />
                    <Text style={[s.themeOptionText, { color: themeMode === opt.key ? colors.tint : colors.textSecondary }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[s.menuSep, { backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)", marginHorizontal: 0 }]} />

            <Pressable
              style={({ pressed }) => [s.modalRow, { backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent" }]}
              onPress={handleLogout}
            >
              <View style={[s.modalIconWrap, { backgroundColor: "#EF444412" }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[s.modalRowLabel, { color: "#EF4444" }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={16} color="#EF444480" />
            </Pressable>

            <View style={{ height: insets.bottom + 8 }} />
          </Pressable>
        </Pressable>
      </Modal>

      <Animated.View style={[sw.bubble, { bottom: insets.bottom + 90, transform: [{ scale: spinsAvailable > 0 ? bubbleScale : 1 }] }]}>
        <Pressable
          style={sw.bubbleBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSpinResult(null);
            setSpinVisible(true);
          }}
        >
          <LinearGradient
            colors={spinsAvailable > 0 ? ["#F59E0B", "#F97316"] : ["#6B7280", "#9CA3AF"]}
            style={sw.bubbleGrad}
          >
            <Ionicons name="gift-outline" size={26} color="#FFF" />
          </LinearGradient>
          {spinsAvailable > 0 && (
            <View style={sw.badge}>
              <Text style={sw.badgeText}>{spinsAvailable}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      <Modal visible={spinVisible} transparent animationType="fade" onRequestClose={() => { if (!spinning) setSpinVisible(false); }}>
        <View style={sw.overlay}>
          <View style={sw.glowBorder}>
            <LinearGradient colors={["#7C3AED", "#3B82F6", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sw.glowGrad}>
              <ScrollView style={sw.container} contentContainerStyle={sw.containerContent} bounces={false} showsVerticalScrollIndicator={false}>
                <View style={sw.header}>
                  <View style={sw.titleRow}>
                    <Text style={sw.title}>Spin & Win</Text>
                    <Text style={{ fontSize: 16 }}>🪙</Text>
                  </View>
                  <Pressable onPress={() => { if (!spinning) setSpinVisible(false); }} hitSlop={12} style={sw.closeBtn}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>

                <Text style={sw.subtitle}>
                  {spinsAvailable > 0
                    ? `You have ${spinsAvailable} spin${spinsAvailable > 1 ? "s" : ""} available!`
                    : "Complete an order to earn spins and win Digi coins!"}
                </Text>

                <View style={sw.sparkleRow}>
                  <Text style={sw.sparkle}>✨</Text>
                  <Text style={sw.sparkle}>⭐</Text>
                  <Text style={sw.sparkle}>✨</Text>
                </View>

                <View style={sw.wheelOuter}>
                  <View style={sw.pointer}>
                    <View style={sw.pointerGlow} />
                    <Svg width={36} height={28} viewBox="0 0 36 28">
                      <Path d="M18 28L0 0h36L18 28z" fill="#EF4444" />
                      <Path d="M18 22L6 4h24L18 22z" fill="#F87171" />
                    </Svg>
                  </View>

                  <View style={sw.wheelGlow}>
                    {spinResult !== null && (
                      <View style={sw.resultOverlay}>
                        <View style={sw.resultPopup}>
                          <Text style={sw.resultEmoji}>🎉</Text>
                          <Text style={sw.resultLabel}>Congratulations!</Text>
                          <View style={sw.resultCoinRow}>
                            <Text style={sw.resultCoins}>{spinResult}</Text>
                            <Text style={sw.resultCoinLabel}> Digi Coins</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                        <Defs>
                          <RadialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#1E1B4B" />
                            <Stop offset="100%" stopColor="#312E81" />
                          </RadialGradient>
                        </Defs>
                        <G>
                          {SPIN_SEGMENTS.map((seg, i) => (
                            <Path key={i} d={getWheelPath(i)} fill={seg.color} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                          ))}
                          {SPIN_SEGMENTS.map((_seg, i) => {
                            const angle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
                            const x2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(angle);
                            const y2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(angle);
                            return (
                              <Line key={`d${i}`} x1={WHEEL_RADIUS} y1={WHEEL_RADIUS} x2={x2} y2={y2} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                            );
                          })}
                          {SPIN_SEGMENTS.map((seg, i) => {
                            const pos = getTextPosition(i);
                            return (
                              <SvgText
                                key={`t${i}`}
                                x={pos.x}
                                y={pos.y}
                                fill="#FFF"
                                fontSize={18}
                                fontWeight="bold"
                                textAnchor="middle"
                                alignmentBaseline="central"
                                transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                              >
                                {seg.label}
                              </SvgText>
                            );
                          })}
                        </G>
                        <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={WHEEL_RADIUS} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
                        <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={28} fill="url(#centerGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                        <SvgText x={WHEEL_RADIUS} y={WHEEL_RADIUS - 6} fill="#FCD34D" fontSize={11} fontWeight="bold" textAnchor="middle" alignmentBaseline="central">Digi</SvgText>
                        <SvgText x={WHEEL_RADIUS} y={WHEEL_RADIUS + 7} fill="rgba(255,255,255,0.8)" fontSize={8} fontWeight="bold" textAnchor="middle" alignmentBaseline="central">Coins</SvgText>
                      </Svg>
                    </Animated.View>
                  </View>
                </View>

                <View style={sw.sparkleRow}>
                  <Text style={sw.sparkle}>⭐</Text>
                  <Text style={sw.sparkle}>✨</Text>
                  <Text style={sw.sparkle}>⭐</Text>
                </View>

                {spinsAvailable > 0 ? (
                  <Animated.View style={[sw.spinBtnWrap, { transform: [{ scale: spinBtnScale }] }]}>
                    <Pressable
                      onPressIn={() => { Animated.spring(spinBtnScale, { toValue: 0.93, useNativeDriver: true }).start(); }}
                      onPressOut={() => { Animated.spring(spinBtnScale, { toValue: 1, useNativeDriver: true }).start(); }}
                      onPress={handleSpin}
                      disabled={spinning}
                      style={{ opacity: spinning ? 0.6 : 1 }}
                    >
                      <LinearGradient colors={["#8B5CF6", "#6366F1", "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sw.spinBtn}>
                        <View style={sw.spinBtnGlow} />
                        {spinning ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={sw.spinBtnText}>SPIN NOW</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                ) : (
                  <Pressable
                    style={sw.orderBtn}
                    onPress={() => { setSpinVisible(false); router.push("/(tabs)/services"); }}
                  >
                    <LinearGradient colors={["#0D9488", "#0F766E"]} style={sw.orderBtnGrad}>
                      <Ionicons name="bag-handle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={sw.orderBtnText}>Come back after next order</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sw = StyleSheet.create({
  bubble: {
    position: "absolute",
    right: 20,
    zIndex: 100,
  },
  bubbleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bubbleGrad: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  glowBorder: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  glowGrad: {
    borderRadius: 24,
    padding: 2,
  },
  container: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    maxHeight: Dimensions.get("window").height * 0.8,
  },
  containerContent: {
    padding: 20,
    paddingTop: 16,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  sparkleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginVertical: 4,
  },
  sparkle: {
    fontSize: 14,
    opacity: 0.7,
  },
  wheelOuter: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  pointer: {
    zIndex: 10,
    marginBottom: -6,
    alignItems: "center",
  },
  pointerGlow: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.4)",
    top: 4,
  },
  wheelGlow: {
    borderRadius: WHEEL_SIZE / 2 + 8,
    padding: 6,
    backgroundColor: "rgba(124,58,237,0.15)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 3,
    borderColor: "rgba(139,92,246,0.35)",
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: WHEEL_SIZE / 2 + 8,
  },
  resultPopup: {
    backgroundColor: "#1E1B4B",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(252,211,77,0.4)",
    shadowColor: "#FCD34D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  resultEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  resultLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  resultCoinRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  resultCoins: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FCD34D",
  },
  resultCoinLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FBBF24",
  },
  spinBtnWrap: {
    width: "100%",
  },
  spinBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  spinBtnGlow: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  spinBtnText: {
    color: "#FFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  orderBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  orderBtnGrad: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  orderBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },

  walletBalanceText: { fontSize: 14, fontFamily: "Inter_700Bold", marginRight: 4 },
  walletActionBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  walletAddBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },

  referCard: {
    marginBottom: 16, borderRadius: 24, overflow: "hidden",
    shadowColor: "#6A11CB", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45, shadowRadius: 32, elevation: 16,
  },
  referGradient: { padding: 18, paddingBottom: 20 },
  referGlassHighlight: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: "rgba(255,255,255,0.22)", borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  referGlowBlob: {
    position: "absolute", top: -40, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: "rgba(109,40,217,0.22)",
  },
  referTopRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 14,
  },
  referSectionLabel: {
    fontSize: 16, fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.85)", letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  deIdRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  deIdCapsule: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  deIdCapsuleText: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    color: "#FFF", letterSpacing: 0.5,
  },
  copiedLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: "#86EFAC",
  },
  referTaglineBlock: {
    gap: 10, marginTop: 2,
  },
  referTaglineOneLine: {
    flexDirection: "row", alignItems: "baseline", flexWrap: "nowrap",
  },
  referTaglineMain: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.72)", letterSpacing: 0.1,
  },
  referTaglineDot: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  referTaglineMid: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    color: "#FFF", letterSpacing: 0.1,
  },
  referDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 2,
  },
  referBottomRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  referBottomText: {
    fontSize: 14, fontFamily: "Inter_600SemiBold",
    color: "#FFF", letterSpacing: 0.3,
  },

  menuCard: {
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, gap: 12,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginRight: 4 },
  menuSep: { height: 1, marginHorizontal: 18 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 16 },
  modalRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12,
  },
  modalIconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  modalRowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  modalThemeSection: { paddingVertical: 12 },
  modalThemeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  themeOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  errorContainer: { alignItems: "center" as const, paddingVertical: 60 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginTop: 16, marginBottom: 20, paddingHorizontal: 20 },
  retryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
