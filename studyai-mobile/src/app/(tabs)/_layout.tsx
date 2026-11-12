import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { DynamicColorIOS, Platform, useColorScheme } from "react-native";

export default function TabsLayout() {
  const isDark = useColorScheme() === "dark";

  const tint =
    Platform.OS === "ios" ? DynamicColorIOS({ light: "#6658D9", dark: "#B7AAFF" }) : isDark ? "#B7AAFF" : "#6658D9";

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={tint}
        minimizeBehavior="onScrollDown"
        labelVisibilityMode="labeled"
        indicatorColor={isDark ? "#34334D" : "#E9E6F8"}
      >
        <NativeTabs.Trigger name="dashboard">
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
          <NativeTabs.Trigger.Label>
            Inicio
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="documents">
          <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} md="description" />
          <NativeTabs.Trigger.Label>
            Docs
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="person" />
          <NativeTabs.Trigger.Label>
            Perfil
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
          <NativeTabs.Trigger.Label>
            Ajustes
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
