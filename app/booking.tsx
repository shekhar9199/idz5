import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/useTheme";

export default function BookingSheet() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.text, { color: colors.text }]}>Booking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
});
