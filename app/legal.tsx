import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/useTheme";
import { getLegalPage, legalPages, legalPageOrder } from "@/lib/legal-content";

export default function LegalScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { page } = useLocalSearchParams<{ page?: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const legalPage = page ? getLegalPage(page) : null;

  if (!legalPage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Legal & Policies</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {legalPageOrder.map((key, i) => {
            const p = legalPages[key];
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              privacy: "shield-checkmark-outline",
              terms: "document-text-outline",
              refund: "receipt-outline",
              withdrawal: "arrow-up-circle-outline",
              referral: "gift-outline",
              disclaimer: "alert-circle-outline",
            };
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.listItem,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push({ pathname: "/legal" as any, params: { page: key } })}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.tint + "12" }]}>
                  <Ionicons name={icons[key] || "document-outline"} size={18} color={colors.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{p.title}</Text>
                  <Text style={[styles.listDate, { color: colors.textSecondary }]}>Updated {p.lastUpdated}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            );
          })}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{legalPage.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.dateBadge, { backgroundColor: colors.tint + "12" }]}>
          <Ionicons name="calendar-outline" size={13} color={colors.tint} />
          <Text style={[styles.dateText, { color: colors.tint }]}>Last Updated: {legalPage.lastUpdated}</Text>
        </View>

        {legalPage.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            If you have any questions about this {legalPage.title.toLowerCase()}, please contact us through the in-app chat or email.
          </Text>
        </View>

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center",
  },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  listIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  listTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  sectionContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  footer: { borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
});
