import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { cardShadow } from "@/lib/shadows";
import { Orders, Wallet, Settings, Earnings } from "@/lib/firestore";
import { saveBooking } from "@/lib/storage";

type PlanKey = "setup-manage" | "one-time";

const EXCLUSIVE_BENEFITS = [
  "Professional Video Editing Included",
  "Text & CTA Added to Video",
  "Background Music Optimization",
  "Ad Copy Writing (Primary Text + Headline)",
  "15-Minute Strategy Consultation Call",
];

const PLAN_DEFS: { key: PlanKey; title: string; description: string; icon: string; features: string[]; badge?: string }[] = [
  {
    key: "setup-manage",
    title: "Meta Ads Setup + Managing",
    description: "Complete setup with ongoing campaign management",
    icon: "rocket",
    badge: "Most Popular",
    features: [
      "Complete Ads Setup",
      "Ongoing Campaign Management",
      "Daily Monitoring",
      "Performance Optimization",
      "Weekly Report",
      "All Exclusive Business Owner Benefits",
    ],
  },
  {
    key: "one-time",
    title: "One Time Ads Setup",
    description: "We set up your ads, you manage them",
    icon: "flash",
    features: [
      "Complete Ads Setup",
      "Basic Targeting",
      "Campaign Launch",
      "Video Editing Included",
      "Ad Copy Writing",
    ],
  },
];

export default function MetaAdsBusinessScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [videoFile, setVideoFile] = useState<{ name: string; uri: string; size?: number; duration?: number } | null>(null);
  const [videoError, setVideoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [booked, setBooked] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [igId, setIgId] = useState("");
  const [igPassword, setIgPassword] = useState("");
  const [showIgPass, setShowIgPass] = useState(false);
  const [planPrices, setPlanPrices] = useState<Record<PlanKey, number>>({
    "setup-manage": 499,
    "one-time": 349,
  });
  const [stock, setStock] = useState({ oneTime: 0, weekly: 0, fifteenDays: 0, monthly: 0, boSetupManage: 0, boOneTime: 0 });

  useEffect(() => {
    Settings.getBusinessOwnerPricing().then((p) => {
      setPlanPrices({
        "setup-manage": p.setupManage || 499,
        "one-time": p.oneTime || 349,
      });
    }).catch(() => {});
    Settings.getMetaAdsStock().then(setStock).catch(() => {});
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const selectedPlanDef = PLAN_DEFS.find((p) => p.key === selectedPlan);
  const selectedPrice = selectedPlan ? planPrices[selectedPlan] : 0;

  async function handlePickVideo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      const fileSizeMB = (file.size || 0) / (1024 * 1024);

      if (fileSizeMB > 100) {
        setVideoError("File is too large. Maximum size is 100MB.");
        setVideoFile(null);
        return;
      }

      let durationSec = 0;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: file.uri }, { shouldPlay: false });
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          durationSec = Math.round(status.durationMillis / 1000);
        }
        await sound.unloadAsync();
      } catch {
        durationSec = 0;
      }

      if (durationSec > 60) {
        setVideoError(`Video is ${durationSec} seconds long. Maximum duration is 60 seconds.`);
        setVideoFile(null);
        return;
      }

      setVideoFile({ name: file.name, uri: file.uri, size: file.size, duration: durationSec });
      setVideoError("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Error", "Failed to pick video. Please try again.");
    }
  }

  function handleRemoveVideo() {
    setVideoFile(null);
    setVideoError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function getBoStockKey(key: PlanKey): string {
    return key === "setup-manage" ? "boSetupManage" : "boOneTime";
  }

  function handleSelectPlan(key: PlanKey) {
    const stockKey = getBoStockKey(key);
    const count = stock[stockKey as keyof typeof stock] || 0;
    if (count <= 0) {
      Alert.alert("Out of Stock", "This plan is currently out of stock. Please try again later.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(key === selectedPlan ? null : key);
  }

  async function handleProceed() {
    if (!selectedPlan || !selectedPlanDef) {
      Alert.alert("Select a Plan", "Please select an ads plan to continue.");
      return;
    }
    if (!videoFile) {
      Alert.alert("Upload Video", "Please upload your video clip to continue.");
      return;
    }
    if (!customerName.trim()) {
      Alert.alert("Missing Name", "Please enter your name to continue.");
      return;
    }
    if (customerPhone.replace(/[^0-9]/g, "").length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number (at least 10 digits).");
      return;
    }
    if (!user) {
      Alert.alert("Login Required", "Please log in to continue.");
      return;
    }

    const priceRs = selectedPrice;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setUploadStatus("Checking wallet balance...");

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

      setUploadStatus("Uploading your video... This may take a minute, please wait.");
      let videoUrl = "";
      try {
        const apiBase = Platform.OS === "web"
          ? ""
          : (process.env.EXPO_PUBLIC_DOMAIN
              ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
              : "https://0ef2197d-1b07-4b1f-90f0-6898cf9ffece-00-wxo46zb3kuje.riker.replit.dev:5000");

        const formData = new FormData();
        if (Platform.OS === "web") {
          const response = await fetch(videoFile.uri);
          const blob = await response.blob();
          formData.append("video", blob, videoFile.name);
        } else {
          formData.append("video", {
            uri: videoFile.uri,
            name: videoFile.name,
            type: "video/mp4",
          } as any);
        }

        const uploadRes = await fetch(`${apiBase}/api/upload-video`, {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          videoUrl = uploadData.url;
        } else {
          const errText = await uploadRes.text();
          console.warn("Video upload failed:", uploadRes.status, errText);
          videoUrl = `[upload-pending] ${videoFile.name}`;
        }
      } catch (uploadErr: any) {
        console.warn("Video upload failed:", uploadErr?.message);
        videoUrl = `[upload-pending] ${videoFile.name}`;
      }

      setUploadStatus("Processing your order...");

      const stockKey = getBoStockKey(selectedPlan);
      const remaining = await Settings.decrementMetaAdsStock(stockKey);
      if (remaining < 0) {
        Alert.alert("Out of Stock", "Sorry, this plan just went out of stock. Please try again later.");
        setStock((prev) => ({ ...prev, [stockKey]: 0 }));
        setLoading(false);
        setUploadStatus("");
        return;
      }
      setStock((prev) => ({ ...prev, [stockKey]: remaining }));

      const requirement = `Plan: ${selectedPlanDef.title} (\u20B9${priceRs}) | Phone: ${customerPhone.trim()} | Video: ${videoFile.name} | Category: Business Owner`;

      await saveBooking({
        serviceId: `meta-ads-business-${selectedPlan}`,
        name: customerName.trim(),
        email: user.email || "",
        requirement,
      });

      const detailParts = [
        `Phone: ${customerPhone.trim()}`,
        igId.trim() ? `IG ID: ${igId.trim()}` : "",
        igPassword.trim() ? `IG Pass: ${igPassword.trim()}` : "",
        `Video: ${videoFile.name}`,
        `Paid via Wallet (\u20B9${priceRs})`,
      ].filter(Boolean).join(" | ");

      const order = await Orders.create({
        user_id: user.id,
        user_name: customerName.trim(),
        user_email: user.email || "",
        service_name: "Meta Ads Setup (Business Owner)",
        plan: selectedPlanDef.title,
        price: String(priceRs),
        details: detailParts,
        video_url: videoUrl,
        customer_phone: customerPhone.trim(),
        ig_id: igId.trim() || undefined,
        ig_password: igPassword.trim() || undefined,
      });

      await Wallet.addRupees(user.id, -priceRs);
      await Wallet.addTransaction({
        userId: user.id,
        type: "deduction",
        coins: 0,
        amountRupees: -priceRs,
        description: `Payment for ${selectedPlanDef.title}`,
        orderId: order.id,
        createdAt: new Date().toISOString(),
      });

      Earnings.distributeCommissions(user.id, order.id, priceRs).catch(() => {});

      setBooked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Business Owner order error:", err);
      Alert.alert("Error", err?.message || "Failed to process. Please try again.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  }

  if (booked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Placed</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={[styles.successCircle, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
            <View style={[styles.successCircleInner, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Order Placed Successfully!</Text>
          <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
            Our team will review your video and set up your ad campaign. You'll be notified once it's ready.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.successBtn, { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace("/(tabs)/orders")}
          >
            <Text style={styles.successBtnText}>View My Orders</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.successBtnOutline, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={[styles.successBtnOutlineText, { color: colors.text }]}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const canProceed = selectedPlan && videoFile && customerName.trim() && customerPhone.replace(/[^0-9]/g, "").length >= 10;
  const fileSizeStr = videoFile?.size ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : "";
  const durationStr = videoFile?.duration ? `${videoFile.duration}s` : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="diamond" size={16} color="#F59E0B" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Owner</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 24}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.sectionCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, cardShadow(colors.cardShadow, 4)]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload Video</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Upload a short video clip (max 1 minute) for your ad campaign
          </Text>

          {!videoFile ? (
            <Pressable
              style={({ pressed }) => [styles.uploadArea, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", opacity: pressed ? 0.8 : 1 }]}
              onPress={handlePickVideo}
            >
              <View style={[styles.uploadIconWrap, { backgroundColor: colors.tint + "15" }]}>
                <Ionicons name="videocam" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.uploadText, { color: colors.text }]}>Tap to Upload Video</Text>
              <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>MP4, MOV, AVI - Max 100MB</Text>
            </Pressable>
          ) : (
            <View style={[styles.videoPreview, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderColor: "#10B98130" }]}>
              <View style={[styles.videoThumb, { backgroundColor: "#10B98115" }]}>
                <Ionicons name="videocam" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.videoName, { color: colors.text }]} numberOfLines={1}>{videoFile.name}</Text>
                {(fileSizeStr || durationStr) ? <Text style={[styles.videoSize, { color: colors.textSecondary }]}>{[fileSizeStr, durationStr].filter(Boolean).join(" \u2022 ")}</Text> : null}
              </View>
              <Pressable
                style={[styles.videoRemove, { backgroundColor: "#EF444415" }]}
                onPress={handleRemoveVideo}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
              </Pressable>
            </View>
          )}

          {videoError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{videoError}</Text>
            </View>
          ) : null}
        </View>

        <LinearGradient
          colors={isDark ? ["#1A1A2E", "#16213E"] : ["#FFFBEB", "#FEF3C7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.exclusiveCard, { borderColor: isDark ? "#F59E0B30" : "#F59E0B40" }]}
        >
          <View style={styles.exclusiveHeader}>
            <View style={styles.exclusiveBadge}>
              <Ionicons name="diamond" size={12} color="#FFF" />
              <Text style={styles.exclusiveBadgeText}>Exclusive Benefits</Text>
            </View>
          </View>
          <Text style={[styles.exclusiveTitle, { color: isDark ? "#FDE68A" : "#92400E" }]}>
            Exclusive for Business Owners
          </Text>
          <Text style={[styles.exclusiveSubtitle, { color: isDark ? "rgba(253,230,138,0.6)" : "#B45309" }]}>
            Premium perks included with every order
          </Text>
          <View style={styles.exclusiveList}>
            {EXCLUSIVE_BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.exclusiveRow}>
                <View style={[styles.exclusiveCheck, { backgroundColor: isDark ? "#F59E0B20" : "#F59E0B15" }]}>
                  <Ionicons name="checkmark" size={12} color="#F59E0B" />
                </View>
                <Text style={[styles.exclusiveText, { color: isDark ? "#FDE68A" : "#78350F" }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={[styles.sectionCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, cardShadow(colors.cardShadow, 4)]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Ads Plan</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Choose one plan that fits your needs
          </Text>

          {PLAN_DEFS.map((plan) => {
            const isSelected = selectedPlan === plan.key;
            const price = planPrices[plan.key];
            return (
              <Pressable
                key={plan.key}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? colors.tint + "15" : colors.tint + "08")
                      : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                    borderColor: isSelected ? colors.tint : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelectPlan(plan.key)}
              >
                <View style={styles.planTop}>
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.tint : colors.textSecondary }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                      {plan.badge && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                        </View>
                      )}
                      {(() => {
                        const stockKey = plan.key === "setup-manage" ? "boSetupManage" : "boOneTime";
                        const count = stock[stockKey as keyof typeof stock] || 0;
                        return (
                          <View style={{
                            flexDirection: "row", alignItems: "center", gap: 3,
                            backgroundColor: count > 0 ? "#10B98112" : "#EF444412",
                            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
                          }}>
                            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: count > 0 ? "#10B981" : "#EF4444" }} />
                            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: count > 0 ? "#10B981" : "#EF4444" }}>
                              {count > 0 ? `${count} left` : "Out of stock"}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                    <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>
                  </View>
                  <Text style={[styles.planPrice, { color: colors.tint }]}>{"\u20B9"}{price}</Text>
                </View>
                {isSelected && (
                  <View style={styles.planFeatures}>
                    {plan.features.map((f) => {
                      const isExclusive = f === "All Exclusive Business Owner Benefits";
                      return (
                        <View key={f} style={styles.planFeatureRow}>
                          <Ionicons
                            name={isExclusive ? "diamond" : "checkmark-circle"}
                            size={14}
                            color={isExclusive ? "#F59E0B" : "#10B981"}
                          />
                          <Text style={[
                            styles.planFeatureText,
                            { color: isExclusive ? "#F59E0B" : colors.textSecondary },
                            isExclusive && { fontFamily: "Inter_600SemiBold" },
                          ]}>{f}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, cardShadow(colors.cardShadow, 4)]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: "#F59E0B" }]}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Info</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Enter your contact details for order communication
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Customer Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
              <Ionicons name="person-outline" size={18} color="#F59E0B" />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            <View style={[styles.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
              <Ionicons name="call-outline" size={18} color="#F59E0B" />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textSecondary}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, cardShadow(colors.cardShadow, 4)]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: "#E1306C" }]}>
              <Ionicons name="logo-instagram" size={14} color="#FFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instagram</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Instagram ID / Username</Text>
            <View style={[styles.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
              <Ionicons name="logo-instagram" size={18} color="#E1306C" />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter Instagram ID"
                placeholderTextColor={colors.textSecondary}
                value={igId}
                onChangeText={setIgId}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Instagram Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#E1306C" />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={igPassword}
                onChangeText={setIgPassword}
                secureTextEntry={!showIgPass}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowIgPass(!showIgPass)} hitSlop={8}>
                <Ionicons name={showIgPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        {selectedPlanDef && (
          <View style={[styles.summaryCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, cardShadow(colors.cardShadow, 4)]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Selected Plan</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPlanDef.title}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.summaryTotal, { color: colors.tint }]}>{"\u20B9"}{selectedPrice}</Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.proceedBtn,
            {
              backgroundColor: canProceed ? "#F59E0B" : (isDark ? "#374151" : "#D1D5DB"),
              opacity: pressed && canProceed ? 0.85 : 1,
            },
          ]}
          onPress={handleProceed}
          disabled={!canProceed || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.proceedBtnText, { color: canProceed ? "#FFF" : colors.textSecondary }]}>
              {canProceed ? `Confirm & Pay \u20B9${selectedPrice}` : "Complete all steps to proceed"}
            </Text>
          )}
        </Pressable>

        <View style={{ height: keyboardOpen ? 200 : 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.uploadOverlay}>
          <View style={[styles.uploadCard, { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" }]}>
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={[styles.uploadTitle, { color: colors.text }]}>
              {uploadStatus || "Processing..."}
            </Text>
            <Text style={[styles.uploadSubtext, { color: colors.textSecondary }]}>
              Please do not close the app or go back
            </Text>
          </View>
        </View>
      )}
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
  sectionCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
  },
  stepBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 16 },
  uploadArea: {
    borderWidth: 2, borderStyle: "dashed", borderRadius: 16, padding: 30,
    alignItems: "center", gap: 8,
  },
  uploadIconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  uploadText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  videoPreview: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 12,
  },
  videoThumb: {
    width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  videoName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  videoSize: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  videoRemove: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#EF4444" },
  exclusiveCard: {
    borderRadius: 18, borderWidth: 1.5, padding: 18, marginBottom: 16, overflow: "hidden",
  },
  exclusiveHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  exclusiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F59E0B", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  exclusiveBadgeText: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.5,
  },
  exclusiveTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4,
  },
  exclusiveSubtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14,
  },
  exclusiveList: { gap: 10 },
  exclusiveRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  exclusiveCheck: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
  },
  exclusiveText: {
    fontSize: 13, fontFamily: "Inter_500Medium", flex: 1,
  },
  planCard: {
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  planTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  planTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  popularBadge: {
    backgroundColor: "#3B82F6", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.3,
  },
  planFeatures: { marginTop: 12, marginLeft: 34, gap: 6 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeatureText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  summaryCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryDivider: { height: 1, marginVertical: 12 },
  summaryTotal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  proceedBtn: {
    alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14,
  },
  proceedBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successCircle: {
    width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  successCircleInner: {
    width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 10, textAlign: "center" },
  successDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 28 },
  successBtn: { width: "100%", alignItems: "center", paddingVertical: 16, borderRadius: 14, marginBottom: 12 },
  successBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  successBtnOutline: { width: "100%", alignItems: "center", paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  successBtnOutlineText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  uploadCard: {
    width: "80%",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 8,
  },
  uploadSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
