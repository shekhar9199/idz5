import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";

export default function ContactUsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 60 : insets.top;

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [supportEmail, setSupportEmail] = useState("support@idigitalzone.in");

  function handleSendEmail() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Required", "Please fill in both subject and message.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const body = `${message.trim()}\n\n---\nUser: ${user?.name || "N/A"}\nID: ${user?.uniqueId || "N/A"}\nEmail: ${user?.email || "N/A"}`;
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert("Error", "Could not open email client.");
    });
  }

  const cardBg = isDark ? "#111B2E" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "#EEF2F6";
  const inputBg = isDark ? "#0F172A" : "#F8FAFC";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
          <View style={{ width: 24 }} />
        </View>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={[styles.infoCard, { backgroundColor: isDark ? "rgba(13,148,136,0.08)" : "rgba(13,148,136,0.05)", borderColor: isDark ? "rgba(13,148,136,0.2)" : "rgba(13,148,136,0.12)" }]}>
            <View style={[styles.infoIconWrap, { backgroundColor: colors.tint + "18" }]}>
              <Ionicons name="mail-outline" size={24} color={colors.tint} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Send us a message</Text>
            <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
              Describe your query and we'll get back to you within 24 hours
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
              placeholder="e.g. Payment issue, Order query..."
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
              placeholder="Describe your issue or query in detail..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginTop: 20 }]}
              onPress={handleSendEmail}
            >
              <LinearGradient
                colors={["#0D9488", "#14B8A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendBtn}
              >
                <Ionicons name="send-outline" size={18} color="#FFF" />
                <Text style={styles.sendBtnText}>Send Email</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={[styles.contactRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.contactItem}>
              <View style={[styles.contactIconBg, { backgroundColor: "#3B82F618" }]}>
                <Ionicons name="mail" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>{supportEmail}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>Follow us</Text>
          <View style={styles.socialRow}>
            {[
              { icon: "logo-instagram" as const, color: "#E1306C", bg: "rgba(225,48,108,0.12)", onPress: () => Linking.openURL("https://instagram.com/idigitalzone.in").catch(() => {}) },
              { icon: "logo-facebook" as const, color: "#1877F2", bg: "rgba(24,119,242,0.12)", onPress: () => Linking.openURL("https://facebook.com/idigitalzone").catch(() => {}) },
              { icon: "logo-youtube" as const, color: "#FF0000", bg: "rgba(255,0,0,0.1)", onPress: () => Linking.openURL("https://youtube.com/@idigitalzone").catch(() => {}) },
            ].map((s) => (
              <Pressable key={s.icon} style={({ pressed }) => [styles.socialBtn, { backgroundColor: s.bg, opacity: pressed ? 0.7 : 1 }]} onPress={s.onPress}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.socialBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", opacity: pressed ? 0.7 : 1 }]}
              onPress={() => Linking.openURL("https://x.com/idigitalzone").catch(() => {})}
            >
              <Image source={require("@/assets/x-logo.png")} style={[styles.xIcon, { tintColor: isDark ? "#FFFFFF" : "#14171A" }]} />
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  infoIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  infoSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  contactRow: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  contactIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contactDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  socialLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  xIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
});
