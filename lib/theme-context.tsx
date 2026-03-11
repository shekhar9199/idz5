import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors, { type ThemeColors } from "@/constants/colors";

type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "@idigitalzone_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  }, []);

  const isDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({ colors, isDark, themeMode, setThemeMode }),
    [colors, isDark, themeMode, setThemeMode],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
