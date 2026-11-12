import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Moon, Sun } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Appearance, Pressable, ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText, MotionView, TabScene } from "@/components/dashboard/dashboard-motion";
import { signOut } from "@/lib/mobile-auth";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

const THEME_KEY = "studyai_theme";

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = getDashboardPalette(isDark);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [error, setError] = useState("");

  async function toggleTheme() {
    const next = isDark ? "light" : "dark";

    Appearance.setColorScheme(next);

    try {
      await AsyncStorage.setItem(
        THEME_KEY,
        next,
      );
      setError("");
    } catch {
      setError("No se pudo guardar el tema.");
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await signOut();
      router.replace("/login");
    } catch {
      setError("No se pudo cerrar la sesión.");
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Quieres salir de StudyAI?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => void logout(),
        },
      ],
    );
  }

  return (
    <LinearGradient colors={[c.background, c.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <TabScene>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <MotionText text="Ajustes" style={[styles.title, { color: c.text }]} />

              <MotionText text="Personaliza tu experiencia" delay={120} style={[styles.subtitle, { color: c.secondary }]} />
            </View>

            <View style={styles.section}>
              <MotionText text="APARIENCIA" delay={190} style={[styles.sectionLabel, { color: c.tertiary }]} />

              <MotionPanel delay={230} style={[styles.card, { backgroundColor: c.surface, borderColor: c.outline }]}>
                <View style={styles.row}>
                  <View style={styles.iconSlot}>
                    <MotionIcon delay={800}>
                      <View style={[styles.iconBox, { backgroundColor: c.softAccent }]}>
                        {isDark ? (
                          <Moon size={19} color={c.accent} strokeWidth={1.75} />
                        ) : (
                          <Sun size={19} color={c.accent} strokeWidth={1.75} />
                        )}
                      </View>
                    </MotionIcon>
                  </View>

                  <View style={styles.rowCopy}>
                    <MotionText text="Modo oscuro" delay={820} style={[styles.rowTitle, { color: c.text }]} />

                    <MotionText
                      text={isDark ? "Activado" : "Desactivado"}
                      delay={900}
                      style={[styles.rowDetail, { color: c.secondary }]}
                    />
                  </View>

                  <MotionView delay={890} style={styles.switchSlot}>
                    <Switch
                      value={isDark}
                      onValueChange={() =>
                        void toggleTheme()
                      }
                      accessibilityLabel="Activar o desactivar modo oscuro"
                      ios_backgroundColor="#C8CDD9"
                      trackColor={{ false: "#C8CDD9", true: c.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </MotionView>
                </View>
              </MotionPanel>
            </View>

            <View style={styles.section}>
              <MotionText text="CUENTA" delay={380} style={[styles.sectionLabel, { color: c.tertiary }]} />

              <MotionPanel delay={440} style={[styles.card, { backgroundColor: c.surface, borderColor: c.outline }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  disabled={loggingOut}
                  onPress={confirmLogout}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <View style={styles.iconSlot}>
                    <MotionIcon delay={1000}>
                      <View style={[styles.iconBox, { backgroundColor: isDark ? "#3C293B" : "#FFF0F3" }]}>
                        {loggingOut ? (
                          <ActivityIndicator size="small" color="#C45275" />
                        ) : (
                          <LogOut size={19} color="#C45275" strokeWidth={1.75} />
                        )}
                      </View>
                    </MotionIcon>
                  </View>

                  <View style={styles.rowCopy}>
                    <MotionText
                      text={loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                      delay={1020}
                      style={[styles.rowTitle, { color: c.text }]}
                    />
                  </View>

                  <View style={styles.chevronSlot}>
                    <ChevronRight size={18} color={c.tertiary} strokeWidth={1.6} />
                  </View>
                </Pressable>
              </MotionPanel>
            </View>

            {error ? (
              <MotionView style={styles.errorBox}>
                <Text style={{ color: isDark ? "#FFCBD7" : "#963650" }}>
                  {error}
                </Text>
              </MotionView>
            ) : null}
          </ScrollView>
        </TabScene>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40, gap: 23 },
  header: { gap: 5 },
  title: { fontSize: 29, fontWeight: "800", letterSpacing: -0.9 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.65, paddingLeft: 3 },
  card: { borderRadius: 19, borderWidth: 1, overflow: "hidden" },
  row: { minHeight: 78, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 12 },
  iconSlot: { width: 42, height: 56, alignItems: "center", justifyContent: "center" },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0, justifyContent: "center", gap: 5 },
  rowTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  rowDetail: { fontSize: 12, lineHeight: 16 },
  switchSlot: { width: 62, height: 56, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  chevronSlot: { width: 24, height: 56, alignItems: "center", justifyContent: "center" },
  errorBox: { paddingHorizontal: 8, paddingVertical: 4 },
});
