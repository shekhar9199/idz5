import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { elevatedShadow } from "@/lib/shadows";

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sponsorCode, setSponsorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slideAnim = useRef(new Animated.Value(0)).current;

  function switchTab(tab: "login" | "signup") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(slideAnim, {
      toValue: tab === "login" ? 0 : 1,
      useNativeDriver: Platform.OS !== "web",
      tension: 80,
      friction: 12,
    }).start();
    setActiveTab(tab);
    setError("");
  }

  function validate(): boolean {
    if (activeTab === "login") {
      if (!identifier.trim()) {
        setError("Please enter your email or phone number");
        return false;
      }
      if (!password.trim() || password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
    } else {
      if (!name.trim()) {
        setError("Please enter your name");
        return false;
      }
      if (!email.trim()) {
        setError("Please enter your email");
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(email.trim())) {
        setError("Please enter a valid email");
        return false;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number");
        return false;
      }
      if (!/^\d{10,}$/.test(phone.trim().replace(/[^0-9]/g, ""))) {
        setError("Please enter a valid phone number (min 10 digits)");
        return false;
      }
      if (!password.trim() || password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    setError("");
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (activeTab === "login") {
        await login(identifier.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), phone.trim().replace(/[^0-9]/g, ""), password, sponsorCode.trim() || undefined);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);

  function handleForgotPassword() {
    setResetEmail(identifier.includes("@") ? identifier : "");
    setResetModalVisible(true);
  }

  async function handleSendResetEmail() {
    if (!resetEmail.trim()) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    setResetSending(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, resetEmail.trim());
      setResetModalVisible(false);
      Alert.alert("Success", "Password reset email sent! Check your inbox.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send password reset email. Please try again.");
    } finally {
      setResetSending(false);
    }
  }

  const tabIndicatorX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (width - 64) / 2],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0D9488", "#0A1628"] : ["#CCFBF1", "#F8FAFC"]}
        style={[styles.gradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoSection}>
              <View style={[styles.logoContainer, { backgroundColor: colors.tint }]}>
                <Ionicons name="flash" size={32} color="#FFFFFF" />
              </View>
              <Text style={[styles.appName, { color: colors.text }]}>iDigitalZone</Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                Smart services for your digital growth
              </Text>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.surface }, elevatedShadow()]}>
              <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSecondary }]}>
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: colors.tint, transform: [{ translateX: tabIndicatorX }] },
                  ]}
                />
                <Pressable style={styles.tab} onPress={() => switchTab("login")}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: activeTab === "login" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable style={styles.tab} onPress={() => switchTab("signup")}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: activeTab === "signup" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              {activeTab === "signup" && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="person-outline" size={20} color={colors.placeholder} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Your name"
                        placeholderTextColor={colors.placeholder}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="mail-outline" size={20} color={colors.placeholder} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="call-outline" size={20} color={colors.placeholder} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="9876543210"
                        placeholderTextColor={colors.placeholder}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Sponsor ID (Optional)</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="people-outline" size={20} color={colors.placeholder} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="e.g. DZ01"
                        placeholderTextColor={colors.placeholder}
                        value={sponsorCode}
                        onChangeText={(t) => setSponsorCode(t.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                </>
              )}

              {activeTab === "login" && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Email or Phone</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={20} color={colors.placeholder} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Email or phone number"
                      placeholderTextColor={colors.placeholder}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.placeholder}
                    />
                  </Pressable>
                </View>
              </View>

              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {activeTab === "login" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </Pressable>

              {activeTab === "login" && (
                <Pressable style={styles.forgotButton} onPress={handleForgotPassword}>
                  <Text style={[styles.forgotText, { color: colors.tint }]}>Forgot Password?</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.trustBadge}>
              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={[styles.trustText, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)" }]}>
                  Safe & Secure Sign In
                </Text>
              </View>
              <View style={styles.trustRow}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={[styles.trustSubText, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)" }]}>
                  Made in India
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={() => setResetModalVisible(false)}>
        <Pressable style={styles.resetOverlay} onPress={() => setResetModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable style={[styles.resetBox, { backgroundColor: isDark ? "#1E293B" : "#FFF" }]} onPress={() => {}}>
              <Text style={[styles.resetTitle, { color: isDark ? "#FFF" : "#111" }]}>Forgot Password</Text>
              <Text style={[styles.resetDesc, { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <TextInput
                style={[styles.resetInput, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", color: isDark ? "#FFF" : "#111", borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0" }]}
                placeholder="Email address"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!resetSending}
              />
              <View style={styles.resetBtnRow}>
                <Pressable style={[styles.resetCancelBtn, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0" }]} onPress={() => setResetModalVisible(false)}>
                  <Text style={[styles.resetCancelText, { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.resetSendBtn, resetSending && { opacity: 0.6 }]} onPress={handleSendResetEmail} disabled={resetSending}>
                  {resetSending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.resetSendText}>Send Link</Text>}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 40,
  },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoContainer: {
    width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  formCard: { borderRadius: 24, padding: 24, gap: 16 },
  tabContainer: { flexDirection: "row", borderRadius: 12, padding: 4, position: "relative" as const },
  tabIndicator: { position: "absolute" as const, top: 4, left: 4, width: "50%", height: "100%", borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", zIndex: 1 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14,
    height: 52, gap: 10, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  submitButton: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  forgotButton: { alignItems: "center", paddingVertical: 4 },
  forgotText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  trustBadge: { alignItems: "center", marginTop: 28, gap: 6 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  trustSubText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  flagEmoji: { fontSize: 16 },
  resetOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24,
  },
  resetBox: {
    width: "100%", maxWidth: 380, borderRadius: 16, padding: 24,
  },
  resetTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8,
  },
  resetDesc: {
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 18,
  },
  resetInput: {
    fontSize: 15, fontFamily: "Inter_500Medium", paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, marginBottom: 18,
  },
  resetBtnRow: {
    flexDirection: "row", gap: 10,
  },
  resetCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center",
  },
  resetCancelText: {
    fontSize: 15, fontFamily: "Inter_600SemiBold",
  },
  resetSendBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#7C3AED", alignItems: "center",
  },
  resetSendText: {
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF",
  },
});
