import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signIn } from "@/lib/mobile-auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (loading) return;

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo iniciar sesión. Revisa la conexión con FastAPI.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0B1020", "#151A38", "#211F4D"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Text style={styles.backText}>← Volver</Text>
              </Pressable>

              <View style={styles.headingSection}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>✦</Text>
                </View>

                <Text style={styles.eyebrow}>
                  BIENVENIDO DE NUEVO
                </Text>

                <Text style={styles.title}>
                  Continúa donde{"\n"}lo dejaste.
                </Text>

                <Text style={styles.subtitle}>
                  Accede a tus documentos, cuestionarios
                  y todo tu progreso de aprendizaje.
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Correo electrónico
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#777F9D"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  accessibilityLabel="Correo electrónico"
                  style={styles.input}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Contraseña
                </Text>

                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#777F9D"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    accessibilityLabel="Contraseña"
                    style={styles.passwordInput}
                    editable={!loading}
                    onSubmitEditing={() => void handleLogin()}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.showPassword}
                  >
                    <Text style={styles.showPasswordText}>
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => void handleLogin()}
                style={({ pressed }) => [
                  styles.submitButton,
                  (pressed || loading) && styles.submitPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#17143C" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      Iniciar sesión
                    </Text>
                    <Text style={styles.submitArrow}>→</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                StudyAI · Aprende a tu ritmo
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 36,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 18,
  },
  backText: {
    color: "#C9C9E4",
    fontSize: 14,
    fontWeight: "600",
  },
  headingSection: {
    marginTop: 34,
  },
  logo: {
    height: 55,
    width: 55,
    borderRadius: 18,
    backgroundColor: "#8377FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "700",
  },
  eyebrow: {
    color: "#B5A9FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.6,
    lineHeight: 45,
    marginTop: 14,
  },
  subtitle: {
    color: "#B0B6D0",
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 325,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    color: "#EBECFA",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 15,
    color: "#FFFFFF",
    fontSize: 15,
    backgroundColor: "#FFFFFF0D",
    borderWidth: 1,
    borderColor: "#FFFFFF26",
  },
  passwordContainer: {
    height: 58,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF0D",
    borderWidth: 1,
    borderColor: "#FFFFFF26",
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 18,
    height: "100%",
  },
  showPassword: {
    paddingHorizontal: 15,
    justifyContent: "center",
    height: "100%",
  },
  showPasswordText: {
    color: "#ADA3FF",
    fontSize: 12,
    fontWeight: "700",
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: "#FB71851A",
    borderWidth: 1,
    borderColor: "#FB71854D",
    padding: 14,
  },
  errorText: {
    color: "#FFACB7",
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    height: 58,
    backgroundColor: "#A79EFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 5,
  },
  submitPressed: {
    opacity: 0.75,
  },
  submitText: {
    color: "#17143C",
    fontSize: 16,
    fontWeight: "800",
  },
  submitArrow: {
    color: "#17143C",
    fontSize: 20,
  },
  footer: {
    alignItems: "center",
    paddingTop: 12,
  },
  footerText: {
    color: "#8990B3",
    fontSize: 11,
  },
});