import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Appearance, StatusBar, useColorScheme } from "react-native";

const THEME_KEY = "studyai_theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    let active = true;

    async function restoreTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);

        if (
          active && (saved === "light" || saved === "dark")
        ) {
          Appearance.setColorScheme(saved);
        }
      } catch { }
    }

    void restoreTheme();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Stack
        screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: isDark ? "#101224" : "#F8F9FC" } }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
