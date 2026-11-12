import { LinearGradient } from "expo-linear-gradient";
import { Mail, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText, MotionView, SkeletonBlock, TabScene } from "@/components/dashboard/dashboard-motion";
import { getCurrentUser, type CurrentUser } from "@/lib/mobile-auth";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const c = getDashboardPalette(isDark);

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void getCurrentUser().then((value) => {
      if (!active) return;

      setUser(value);
      setError(
        value ? "" : "No hay una sesión activa.",
      );
    })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar tu perfil.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  const initials =
    user?.full_name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "S";

  return (
    <LinearGradient colors={[c.background, c.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <TabScene>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <MotionText text="Perfil" style={[styles.title, { color: c.text }]} />

              <MotionText text="Información de tu cuenta" delay={120} style={[styles.subtitle, { color: c.secondary }]} />
            </View>

            {loading && !user ? (
              <View style={styles.loading}>
                <SkeletonBlock height={196} radius={21} isDark={isDark} />

                <SkeletonBlock height={154} radius={21} isDark={isDark} />
              </View>
            ) : user ? (
              <>
                <MotionPanel
                  delay={160}
                  style={[styles.identity, { backgroundColor: c.surface, borderColor: c.outline }]}
                  contentStyle={styles.identityContent}
                >
                  <MotionIcon delay={730}>
                    <View style={[styles.avatar, { backgroundColor: c.softAccent }]}>
                      <Text style={[styles.initials, { color: c.accent }]}>
                        {initials}
                      </Text>
                    </View>
                  </MotionIcon>

                  <MotionText text={user.full_name} delay={790} style={[styles.name, { color: c.text }]} />

                  <MotionText text={user.email} delay={900} style={[styles.email, { color: c.secondary }]} />
                </MotionPanel>

                <View style={styles.details}>
                  <MotionText text="Datos de la cuenta" delay={520} style={[styles.sectionTitle, { color: c.secondary }]} />

                  <MotionPanel delay={590} style={[styles.detailsCard, { backgroundColor: c.surface, borderColor: c.outline }]}>
                    <MotionView delay={1090} style={styles.detailRow}>
                      <View style={styles.detailIcon}>
                        <UserRound size={19} color={c.accent} strokeWidth={1.8} />
                      </View>

                      <View style={styles.detailText}>
                        <Text style={[styles.detailLabel, { color: c.tertiary }]}>
                          Nombre completo
                        </Text>

                        <Text style={[styles.detailValue, { color: c.text }]}>
                          {user.full_name}
                        </Text>
                      </View>
                    </MotionView>

                    <View style={[styles.separator, { backgroundColor: c.separator }]} />

                    <MotionView delay={1190} style={styles.detailRow}>
                      <View style={styles.detailIcon}>
                        <Mail size={19} color={c.accent} strokeWidth={1.8} />
                      </View>

                      <View style={styles.detailText}>
                        <Text style={[styles.detailLabel, { color: c.tertiary }]}>
                          Correo electrónico
                        </Text>

                        <Text style={[styles.detailValue, { color: c.text }]}>
                          {user.email}
                        </Text>
                      </View>
                    </MotionView>
                  </MotionPanel>
                </View>
              </>
            ) : (
              <MotionPanel
                delay={160}
                style={[styles.errorCard, { backgroundColor: c.surface }]}
                contentStyle={styles.errorContent}
              >
                <Text style={{ color: c.secondary }}>
                  {error || "No hay información de la cuenta."}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setRetryKey((n) => n + 1)
                  }
                >
                  <Text style={[styles.retry, { color: c.accent }]}>
                    Reintentar
                  </Text>
                </Pressable>
              </MotionPanel>
            )}
          </ScrollView>
        </TabScene>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40, gap: 20 },
  header: { gap: 5 },
  title: { fontSize: 29, fontWeight: "800", letterSpacing: -0.9 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  loading: { gap: 14 },
  identity: { borderRadius: 21, borderWidth: 1, padding: 20 },
  identityContent: { alignItems: "center", gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  initials: { fontSize: 24, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  email: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  details: { gap: 10 },
  sectionTitle: { paddingHorizontal: 4, fontSize: 12, fontWeight: "700" },
  detailsCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  detailRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  detailIcon: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  detailText: { flex: 1, minWidth: 0, gap: 4, justifyContent: "center" },
  detailLabel: { fontSize: 11, fontWeight: "600" },
  detailValue: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  errorCard: { borderRadius: 20, padding: 18 },
  errorContent: { gap: 12 },
  retry: { fontSize: 13, fontWeight: "700" },
});
