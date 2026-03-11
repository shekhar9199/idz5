import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { initializeAuth, getAuth, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA3UAPUckG8490GTR8JOxsqvZwI8oS1L7Q",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "digiindia-7a462.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "digiindia-7a462",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "digiindia-7a462.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1075298164237",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1075298164237:web:6a5ca0878dda7334523f44",
};

let app: ReturnType<typeof initializeApp>;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth: ReturnType<typeof getAuth>;
if (getApps().length <= 1) {
  try {
    if (Platform.OS === "web") {
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    } else {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      // @ts-ignore
      const { getReactNativePersistence } = require("firebase/auth");
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
  });
} catch {
  db = getFirestore(app);
}

const storage = getStorage(app);

export { app, auth, db, storage };
