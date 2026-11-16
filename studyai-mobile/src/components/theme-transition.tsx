import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

const ThemeTransitionContext = createContext<() => Promise<void>>(async () => {});

export function useThemeTransition() {
  return useContext(ThemeTransitionContext);
}

export function ThemeTransitionProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const locked = useRef(false);

  async function toggle() {
    if (locked.current) return;
    locked.current = true;
    const next = scheme === "dark" ? "light" : "dark";
    try {
      Appearance.setColorScheme(next);
      await AsyncStorage.setItem("studyai_theme", next);
    } finally {
      locked.current = false;
    }
  }

  return <ThemeTransitionContext.Provider value={toggle}>{children}</ThemeTransitionContext.Provider>;
}
