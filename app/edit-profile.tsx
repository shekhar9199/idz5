import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { cardShadow } from "@/lib/shadows";

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasBasicChanges = name !== user?.name || email !== user?.email || phone !== (user?.phone || "");
  const hasPasswordChange = newPassword.length > 0;
  const hasChanges = hasBasicChanges || hasPasswordChange;

  async function handleSave() {
    if (!hasChanges) return;

    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password to save changes");
      return;
    }

    if (hasPasswordChange) {
      if (newPassword.length < 6) {
        Alert.alert("Error", "New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "New passwords don't match");
        return;
      }
    }

    setSaving(true);
    try {
      const data: any = { currentPassword };
      if (name !== user?.name) data.name = name.trim();
      if (email !== user?.email) data.email = email.trim().toLowerCase();
      if (phone !== (user?.phone || "")) data.phone = phone.trim();
      if (hasPasswordChange) {
        data.newPassword = newPassword;
      }

      await updateProfile(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your profile has been updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.card }]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.avatarSection]}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {(name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
              Your initials are shown as your avatar
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PERSONAL INFO</Text>
          <View style={[styles.card, { backgroundColor: colors.card }, cardShadow(colors.cardShadow)]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CHANGE PASSWORD</Text>
          <View style={[styles.card, { backgroundColor: colors.card }, cardShadow(colors.cardShadow)]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showCurrentPassword}
                />
                <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNewPassword}
                />
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
              <View style={[styles.inputRow, { borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNewPassword}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
            Current password is required to save any changes.{"\n"}Leave new password fields empty if you only want to update your info.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: hasChanges ? colors.tint : colors.border,
                opacity: pressed && hasChanges ? 0.85 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  avatarHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  inputGroup: {
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 46,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  separator: {
    height: 1,
    marginHorizontal: -16,
  },
  passwordHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
    marginTop: -8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
