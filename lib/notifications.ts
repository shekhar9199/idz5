import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PushTokens } from "@/lib/firestore";

const PUSH_TOKEN_KEY = "@idigitalzone_push_token";

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  const ExpoConstants = require("expo-constants");
  Constants = ExpoConstants?.default || ExpoConstants;

  const isExpoGo = Constants?.appOwnership === "expo" || 
    (Constants?.executionEnvironment === "storeClient") ||
    !Constants?.expoConfig?.extra?.eas?.projectId;

  if (isExpoGo && Platform.OS !== "web") {
    console.log("Push notifications disabled in Expo Go (SDK 53+)");
  } else {
    Notifications = require("expo-notifications");
    Device = require("expo-device");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("chat-messages", {
        name: "Chat Messages",
        importance: 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0D9488",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});
    }
  }
} catch (e) {
  Notifications = null;
  Device = null;
  console.log("Push notifications not available, disabled");
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device || !Constants) return null;
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      null;
    if (!projectId) {
      console.log("Push notifications: No EAS projectId configured, skipping");
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    console.log("Push token registration skipped:", (err as Error).message);
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  try {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await PushTokens.save(userId, token, Platform.OS);
  } catch (err) {
    console.error("Failed to save push token:", err);
  }
}

export async function removePushToken(token?: string) {
  try {
    const t = token || (await AsyncStorage.getItem(PUSH_TOKEN_KEY));
    if (t) {
      await PushTokens.remove(t);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.error("Failed to remove push token:", err);
  }
}

export function useNotificationSetup(userId: string | null | undefined) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function setup() {
      const token = await registerForPushNotifications();
      if (token) {
        tokenRef.current = token;
        await savePushToken(userId!, token);
      }
    }

    setup();
  }, [userId]);

  return tokenRef;
}

export function useNotificationListener(
  onNotificationReceived?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void
) {
  useEffect(() => {
    if (!Notifications || Platform.OS === "web") return;

    const receivedSub = Notifications.addNotificationReceivedListener((notification: any) => {
      onNotificationReceived?.(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      onNotificationResponse?.(response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [onNotificationReceived, onNotificationResponse]);
}
