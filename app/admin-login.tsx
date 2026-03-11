import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useAdmin } from "@/lib/admin-context";

const PIN_LENGTH = 6;

export default function AdminLogin() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { adminLogin, isAdmin } = useAdmin();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1))).current;

  useEffect(() => {
    if (isAdmin) router.replace("/admin-dashboard");
  }, [isAdmin]);

  function animateDot(index: number) {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 1.4, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }

  function triggerShake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function handlePress(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    animateDot(newPin.length - 1);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => {
        const success = adminLogin(newPin);
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/admin-dashboard");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(true);
          triggerShake();
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 600);
        }
      }, 100);
    }
  }

  function handleDelete() {
    if (pin.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
    setError(false);
  }

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i);
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "del"],
  ];

  return (
    <View style={[s.container, { backgroundColor: isDark ? "#000" : "#F8FAFC", paddingTop: insets.top }]}>
      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={s.content}>
        <View style={[s.lockCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
          <Ionicons name="lock-closed" size={30} color={colors.tint} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Admin Access</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>Enter 6-digit PIN to continue</Text>

        <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {dots.map((i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i < pin.length
                    ? error ? "#EF4444" : colors.tint
                    : "transparent",
                  borderColor: error ? "#EF4444" : i < pin.length ? colors.tint : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                  transform: [{ scale: scaleAnims[i] }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {error && <Text style={s.errorText}>Incorrect PIN</Text>}
      </View>

      <View style={s.keypad}>
        {keys.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map((key) => {
              if (key === "") return <View key="empty" style={s.keyEmpty} />;
              if (key === "del") {
                return (
                  <Pressable
                    key="del"
                    style={({ pressed }) => [s.key, pressed && { opacity: 0.5 }]}
                    onPress={handleDelete}
                    onLongPress={() => { setPin(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  >
                    <Ionicons name="backspace-outline" size={26} color={colors.text} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [
                    s.key,
                    { backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)") : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") },
                  ]}
                  onPress={() => handlePress(key)}
                >
                  <Text style={[s.keyText, { color: colors.text }]}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topRow: { paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", paddingTop: 24, paddingBottom: 16 },
  lockCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 28 },
  dotsRow: { flexDirection: "row", gap: 18, marginBottom: 12 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 6 },
  keypad: { flex: 1, justifyContent: "flex-end", paddingBottom: 36, paddingHorizontal: 40 },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 14 },
  key: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: { width: 62, height: 62 },
  keyText: { fontSize: 24, fontFamily: "Inter_600SemiBold" },
});
