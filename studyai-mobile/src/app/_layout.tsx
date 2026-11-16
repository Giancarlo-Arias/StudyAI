import { View } from "@/components/theme-primitives";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, Appearance, StatusBar, useColorScheme } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { ThemeTransitionProvider } from "@/components/theme-transition";
import { expireSession, getSessionExpired, subscribeToSession } from "@/lib/session-events";
import { getCurrentUser } from "@/lib/mobile-auth";

const THEME_KEY = "studyai_theme";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Manrope: require("../../assets/fonts/Manrope.ttf") });
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const expired = useSyncExternalStore(subscribeToSession, getSessionExpired, () => false);
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const privateScreen = pathname !== "/" && pathname !== "/login";

  useEffect(() => {
    if (!privateScreen || expired) return;
    let active = true;

    async function validateSession() {
      try {
        const user = await getCurrentUser();
        if (active && !user) expireSession();
      } catch {
        // Los errores de conectividad se muestran en cada pantalla.
      }
    }

    void validateSession();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void validateSession();
    });
    return () => { active = false; subscription.remove(); };
  }, [privateScreen, expired]);

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

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "#0D1120" : "#F7F8FC" }}><ActivityIndicator color={isDark ? "#B7AAFF" : "#6550C8"} /></View>;
  }

  return (
    <ThemeTransitionProvider>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Stack
        screenOptions={{ headerShown: false, animation: reduced ? "none" : "fade", gestureEnabled: true, contentStyle: { backgroundColor: isDark ? "#0D1120" : "#F7F8FC" } }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="login" options={{ animation: reduced ? "none" : "fade" }} />
        <Stack.Protected guard={!expired}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: reduced ? "none" : "fade", animationDuration: 260, animationTypeForReplace: "push" }} />
          <Stack.Screen name="achievements" options={{ headerShown: false }} />
          <Stack.Screen name="progress" options={{ headerShown: false }} />
          <Stack.Screen name="quizzes" />
          <Stack.Screen name="document/[id]" />
          <Stack.Screen name="quiz/create" />
          <Stack.Screen name="quiz/[id]" />
          <Stack.Screen name="quiz/attempt-review" />
        </Stack.Protected>
      </Stack>
    </ThemeTransitionProvider>
  );
}
