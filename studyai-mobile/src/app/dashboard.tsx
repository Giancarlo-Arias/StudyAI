import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getCurrentUser,
  signOut,
  type CurrentUser,
} from "@/lib/mobile-auth";

export default function DashboardScreen() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const currentUser = await getCurrentUser();

        if (!active) return;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        setError("");
      } catch (caught) {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar la sesión.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [reloadKey, router]);

  async function handleLogout() {
    try {
      await signOut();
      router.dismissTo("/");
    } catch {
      setError("No se pudo cerrar la sesión.");
    }
  }

  return (
    <LinearGradient
      colors={["#0B1020", "#161B3D"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#A79EFF" />
            <Text style={styles.secondary}>
              Cargando tu espacio...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.title}>
              No pudimos cargar tu sesión
            </Text>
            <Text style={styles.secondary}>{error}</Text>

            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => {
                setLoading(true);
                setReloadKey((value) => value + 1);
              }}
            >
              <Text style={styles.primaryText}>
                Reintentar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleLogout()}
            >
              <Text style={styles.secondary}>
                Cerrar sesión
              </Text>
            </Pressable>
          </View>
        ) : user ? (
          <ScrollView
            contentContainerStyle={styles.content}
          >
            <View style={styles.topBar}>
              <Text style={styles.brand}>✦ StudyAI</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleLogout()}
              >
                <Text style={styles.logout}>
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>

            <View style={styles.welcome}>
              <Text style={styles.eyebrow}>
                TU ESPACIO DE ESTUDIO
              </Text>

              <Text style={styles.title}>
                Hola,{"\n"}
                {user.full_name.split(" ")[0]}.
              </Text>

              <Text style={styles.secondary}>
                Bienvenido a StudyAI Mobile.
                Tu cuenta ya está conectada con FastAPI.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTag}>
                PRIMER PASO COMPLETADO
              </Text>

              <Text style={styles.cardTitle}>
                Tu sesión está activa
              </Text>

              <Text style={styles.cardDescription}>
                Ya podemos conectar documentos,
                cuestionarios, progreso y logros
                desde el mismo backend de StudyAI Web.
              </Text>
            </View>

            <View style={styles.account}>
              <Text style={styles.accountLabel}>
                CUENTA CONECTADA
              </Text>
              <Text style={styles.email}>
                {user.email}
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 27,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 34,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  logout: {
    color: "#B5AAFF",
    fontSize: 12,
    fontWeight: "700",
  },
  welcome: {
    marginTop: 38,
    gap: 14,
  },
  eyebrow: {
    color: "#AFA5FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 37,
    lineHeight: 43,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  secondary: {
    color: "#B6BCD6",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#252650",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#56548B",
    padding: 24,
    gap: 15,
  },
  cardTag: {
    color: "#B7AFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
  },
  cardDescription: {
    color: "#B9BEDA",
    fontSize: 14,
    lineHeight: 23,
  },
  account: {
    backgroundColor: "#FFFFFF0A",
    borderWidth: 1,
    borderColor: "#FFFFFF15",
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  accountLabel: {
    color: "#929ABD",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  email: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#A79EFF",
    paddingHorizontal: 32,
    paddingVertical: 17,
    borderRadius: 14,
  },
  primaryText: {
    color: "#17143C",
    fontWeight: "800",
  },
});