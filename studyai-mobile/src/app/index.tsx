import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getCurrentUser, signOut } from "@/lib/mobile-auth";
import { getSessionExpired } from "@/lib/session-events";

export default function IndexScreen() {
  const router = useRouter();

  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (getSessionExpired()) {
        router.replace("/login");
        return;
      }
      setError(false);

      try {
        const user = await getCurrentUser();

        if (!active) return;

        router.replace(user ? "/dashboard" : "/login");
      } catch {
        if (active) {
          setError(true);
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [attempt, router]);

  async function handleOtherAccount() {
    if (leaving) return;

    setLeaving(true);

    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLeaving(false);
      setError(true);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>

        <Text style={styles.brand}>studyai.</Text>

        {error ? (
          <>
            <Text style={styles.message}>
              No pudimos comprobar tu sesión.
              Revisa tu conexión con StudyAI.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setAttempt((value) => value + 1)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                Reintentar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={leaving}
              onPress={() => void handleOtherAccount()}
            >
              <Text style={styles.secondaryButton}>
                Usar otra cuenta
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#7564E9" size="small" style={styles.loader} />

            <Text style={styles.message}>
              Preparando tu espacio de estudio
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 18 },
  logo: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#252342", alignItems: "center", justifyContent: "center" },
  logoText: { ...typography, color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  brand: { ...typography, fontSize: 27, fontWeight: "800", letterSpacing: -1.5, color: "#202038" },
  loader: { marginTop: 20 },
  message: { ...typography, color: "#85869B", fontSize: 13, lineHeight: 21, textAlign: "center" },
  button: { backgroundColor: "#252342", borderRadius: 14, paddingHorizontal: 26, paddingVertical: 15, marginTop: 12 },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: { ...typography, color: "#7464D9", fontSize: 13, fontWeight: "700", marginTop: 8 },
});
