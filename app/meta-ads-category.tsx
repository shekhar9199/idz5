import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { cardShadow } from "@/lib/shadows";
import { useAuth } from "@/lib/auth-context";
import { BusinessOwners } from "@/lib/firestore";

export default function MetaAdsCategoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const [checkingForm, setCheckingForm] = useState(false);

  async function handleBusinessOwnerPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      router.push("/business-owner-form");
      return;
    }
    setCheckingForm(true);
    try {
      const existing = await BusinessOwners.getByUser(user.id);
      if (existing.length > 0) {
        router.push("/meta-ads-business");
      } else {
        router.push("/business-owner-form");
      }
    } catch {
      router.push("/business-owner-form");
    } finally {
      setCheckingForm(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Meta Ads Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT YOUR CATEGORY</Text>

        <Pressable
          style={({ pressed }) => [styles.categoryCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", opacity: pressed ? 0.95 : 1 }, cardShadow(colors.cardShadow, 4)]}
          onPress={handleBusinessOwnerPress}
          disabled={checkingForm}
        >
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryIconWrap}
          >
            <Ionicons name="briefcase" size={28} color="#FFF" />
          </LinearGradient>
          <View style={styles.categoryContent}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>Business Owner</Text>
            <Text style={[styles.categorySub, { color: colors.textSecondary }]}>
              Upload your video clip and we'll create professional ad campaigns for your business
            </Text>
            <View style={styles.categoryFeatures}>
              {["Video ad creation", "Professional setup", "Targeted campaigns"].map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.categoryCard, { backgroundColor: isDark ? "#111B2E" : "#FFF", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", opacity: pressed ? 0.95 : 1 }, cardShadow(colors.cardShadow, 4)]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/service-detail");
          }}
        >
          <LinearGradient
            colors={["#8B5CF6", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryIconWrap}
          >
            <Ionicons name="person" size={28} color="#FFF" />
          </LinearGradient>
          <View style={styles.categoryContent}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>Direct Seller</Text>
            <Text style={[styles.categorySub, { color: colors.textSecondary }]}>
              Provide your credentials and we'll set up & manage ads directly on your accounts
            </Text>
            <View style={styles.categoryFeatures}>
              {["Full account setup", "Ads management", "Performance reports"].map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        <View style={[styles.guaranteeCard, { backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)" }]}>
          <View style={styles.guaranteeRow}>
            <Ionicons name="time-outline" size={18} color="#10B981" />
            <Text style={[styles.guaranteeText, { color: colors.text }]}>24 Hours Delivery</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            <Text style={[styles.guaranteeText, { color: colors.text }]}>100% Guarantee</Text>
          </View>
        </View>

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 14,
  },
  categoryCard: {
    flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1,
    padding: 18, marginBottom: 14, gap: 14,
  },
  categoryIconWrap: {
    width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  categoryContent: { flex: 1 },
  categoryTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  categorySub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 8 },
  categoryFeatures: { gap: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  guaranteeCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
