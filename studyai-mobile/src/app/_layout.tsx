import { Stack, usePathname } from "expo-router";
import { StatusBar } from "react-native";

export default function RootLayout() {
  const pathname = usePathname();

  const isWelcomeScreen = pathname === "/";

  return (
    <>
      <StatusBar
        barStyle={
          isWelcomeScreen ? "dark-content" : "light-content"
        }
      />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#0B1020",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </>
  );
}