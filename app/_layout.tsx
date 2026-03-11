import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AdminProvider } from "@/lib/admin-context";
import { ThemeProvider } from "@/lib/theme-context";
import { useTheme } from "@/lib/useTheme";
import { useNotificationSetup, useNotificationListener } from "@/lib/notifications";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { SplashLoader } from "@/components/SplashLoader";

SplashScreen.preventAutoHideAsync();

function NotificationHandler() {
  const { user } = useAuth();
  const router = useRouter();

  useNotificationSetup(user?.id);

  const handleResponse = useCallback((response: any) => {
    const data = response?.notification?.request?.content?.data;
    if (data?.type === "chat_message" && data?.chatId) {
      router.push("/chat");
    } else if (data?.type === "order_update") {
      router.push("/(tabs)/orders");
    }
  }, [router]);

  useNotificationListener(undefined, handleResponse);

  return null;
}

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      {children}
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const bg = colors.background;
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
      const root = document.getElementById("root");
      if (root) root.style.backgroundColor = bg;
    }
  }, [colors.background]);

  return (
    <>
      <NotificationHandler />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: colors.background },
          animation: "none",
          gestureEnabled: false,
          navigationBarColor: colors.background,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="service-detail" options={{ headerShown: false }} />
        <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75], sheetGrabberVisible: true, headerShown: false }} />
        <Stack.Screen name="admin-login" options={{ headerShown: false }} />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="wallet" options={{ headerShown: false }} />
        <Stack.Screen name="admin-chat" options={{ headerShown: false }} />
        <Stack.Screen name="invite-earn" options={{ headerShown: false }} />
        <Stack.Screen name="withdraw" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="order-detail" options={{ headerShown: false }} />
        <Stack.Screen name="business-book" options={{ headerShown: false }} />
        <Stack.Screen name="upi-payment" options={{ headerShown: false }} />
        <Stack.Screen name="meta-ads-category" options={{ headerShown: false }} />
        <Stack.Screen name="meta-ads-business" options={{ headerShown: false }} />
        <Stack.Screen name="business-owner-form" options={{ headerShown: false }} />
        <Stack.Screen name="transactions" options={{ headerShown: false }} />
        <Stack.Screen name="contact-us" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const style = document.createElement("style");
      style.id = "idz-theme-bg";
      style.textContent = `
        html, body, #root {
          background-color: #000000 !important;
        }
        @media (prefers-color-scheme: light) {
          html, body, #root {
            background-color: #EFF2F7 !important;
          }
        }
      `;
      document.head.appendChild(style);

      const handler = (event: PromiseRejectionEvent) => {
        const msg = event?.reason?.message || "";
        if (msg.includes("keep awake") || msg.includes("wakeLock") || msg.includes("Wake Lock")) {
          event.preventDefault();
        }
      };
      window.addEventListener("unhandledrejection", handler);
      return () => {
        window.removeEventListener("unhandledrejection", handler);
        document.head.removeChild(style);
      };
    }
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AdminProvider>
              <ThemedRoot>
                <KeyboardProvider>
                  <StatusBar style="auto" />
                  <RootLayoutNav />
                  {showSplash && <SplashLoader onFinish={() => setShowSplash(false)} />}
                </KeyboardProvider>
              </ThemedRoot>
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
