import { Platform, type ViewStyle } from "react-native";

export function cardShadow(shadowColor: string = "rgba(0,0,0,0.08)", elevation: number = 3): ViewStyle {
  if (Platform.OS === "web") {
    const y = Math.max(1, Math.round(elevation * 0.7));
    const blur = elevation * 3;
    return { boxShadow: `0 ${y}px ${blur}px ${shadowColor}` } as ViewStyle;
  }
  return {
    shadowColor,
    shadowOffset: { width: 0, height: Math.max(1, Math.round(elevation * 0.7)) },
    shadowOpacity: 1,
    shadowRadius: elevation * 2,
    elevation,
  };
}

export function elevatedShadow(shadowColor: string = "rgba(0,0,0,0.12)", elevation: number = 5): ViewStyle {
  if (Platform.OS === "web") {
    const y = Math.max(2, Math.round(elevation * 0.8));
    const blur = elevation * 3;
    return { boxShadow: `0 ${y}px ${blur}px ${shadowColor}` } as ViewStyle;
  }
  return {
    shadowColor,
    shadowOffset: { width: 0, height: Math.max(2, Math.round(elevation * 0.8)) },
    shadowOpacity: 1,
    shadowRadius: elevation * 2.5,
    elevation,
  };
}
