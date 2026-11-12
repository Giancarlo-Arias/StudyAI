import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight, ChevronDown, Eye, EyeOff, LockKeyhole, Mail, Moon, Sparkles, Sun } from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Appearance,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StudyHeroArt } from "@/components/illustrations/study-hero";
import { signIn } from "@/lib/mobile-auth";

const THEME_KEY = "studyai_theme";

type FocusedField = "email" | "password" | null;

const light = {
  text: "#25233A",
  muted: "#79788F",
  accent: "#7561DA",
  border: "#FFFFFF",
  input: "rgba(255,255,255,0.55)",
  inputBorder: "rgba(115,103,167,0.18)",
  placeholder: "#9694AA",
  glassTint: "rgba(255,255,255,0.04)",
  fallbackGlassTint: "rgba(255,255,255,0.52)",
  halo: "rgba(151,116,255,0.28)",
  iconBackground: "#30284C",
  shadow: "#5E527A",
  footer: "#9290A3",
};

const dark = {
  text: "#F6F3FF",
  muted: "#B9B5D0",
  accent: "#B7A6FF",
  border: "rgba(255,255,255,0.22)",
  input: "rgba(19,20,45,0.40)",
  inputBorder: "rgba(255,255,255,0.18)",
  placeholder: "#9C99B4",
  glassTint: "rgba(12,12,32,0.10)",
  fallbackGlassTint: "rgba(18,18,46,0.68)",
  halo: "rgba(151,117,255,0.22)",
  iconBackground: "#9A85F5",
  shadow: "#050514",
  footer: "#A19CB9",
};

function supportsNativeGlass(): boolean {
  return (
    Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable()
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { height } = useWindowDimensions();

  const isDark = systemScheme === "dark";
  const colors = isDark ? dark : light;
  const compact = height < 760;
  const nativeGlass = supportsNativeGlass();

  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const floating = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backgroundColors: [string, string, string] = isDark ? ["#101224", "#1A1A35", "#262041"] : ["#F8F9FC", "#F0EDFB", "#E6E0FB"];

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

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      () => setKeyboardOpen(true),
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => setKeyboardOpen(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;

    async function startAnimation() {
      const reduceMotion =
        await AccessibilityInfo.isReduceMotionEnabled();

      if (!active || reduceMotion) return;

      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(floating, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floating, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );

      animation.start();
    }

    void startAnimation().catch(() => { });

    return () => {
      active = false;
      animation?.stop();
    };
  }, [floating]);

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;

    async function showCard() {
      const reduceMotion =
        await AccessibilityInfo.isReduceMotionEnabled();

      if (!active) return;

      if (reduceMotion) {
        entrance.setValue(1);
        return;
      }

      animation = Animated.timing(entrance, { toValue: 1, duration: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true });

      animation.start();
    }

    void showCard().catch(() => entrance.setValue(1));

    return () => {
      active = false;
      animation?.stop();
    };
  }, [entrance]);

  const floatingY = floating.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  const cardY = entrance.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

  function dismissKeyboard() {
    Keyboard.dismiss();
    setFocused(null);
  }

  async function toggleTheme() {
    const next = isDark ? "light" : "dark";

    Appearance.setColorScheme(next);

    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch { }
  }

  async function handleLogin() {
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    if (!password) {
      setError("Ingresa tu contraseña.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signIn(normalizedEmail, password);
      dismissKeyboard();
      router.replace("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={backgroundColors} style={styles.screen}>
      <View
        pointerEvents="none"
        style={[styles.ambientOne, { backgroundColor: isDark ? "rgba(132,98,255,0.18)" : "rgba(166,145,255,0.22)" }]}
      />

      <View
        pointerEvents="none"
        style={[styles.ambientTwo, { backgroundColor: isDark ? "rgba(85,78,177,0.22)" : "rgba(199,183,255,0.32)" }]}
      />

      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.content, compact && styles.compactContent, keyboardOpen && styles.keyboardContent]}>
              <View style={styles.header}>
                <View style={styles.brand}>
                  <View style={[styles.brandIcon, { backgroundColor: colors.iconBackground }]}>
                    <Sparkles size={19} color={isDark ? "#211B3D" : "#FFFFFF"} strokeWidth={2} />
                  </View>

                  <Text style={[styles.brandName, { color: colors.text }]}>
                    Study
                    <Text style={{ color: colors.accent }}>
                      AI
                    </Text>
                  </Text>
                </View>

                {keyboardOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar teclado"
                    accessibilityHint="Oculta el teclado y vuelve a la pantalla completa"
                    onPress={dismissKeyboard}
                    style={({ pressed }) => [
                      styles.themeButton,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.62)",
                        borderColor: colors.border,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <ChevronDown size={22} color={colors.accent} strokeWidth={2} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isDark ? "Activar modo claro" : "Activar modo oscuro"}
                    onPress={() => void toggleTheme()}
                    style={({ pressed }) => [
                      styles.themeButton,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.62)",
                        borderColor: colors.border,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    {isDark ? (<Sun size={19} color="#DDC9FF" />) : (<Moon size={19} color="#6F5AD6" />)}
                  </Pressable>
                )}
              </View>

              {!keyboardOpen && (
                <View style={styles.intro}>
                  <Text style={[styles.eyebrow, { color: colors.accent }]}>
                    TU ESPACIO DE APRENDIZAJE
                  </Text>

                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={2}
                    style={[styles.title, compact && styles.compactTitle, { color: colors.text }]}
                  >
                    Estudia con{"\n"}
                    <Text style={{ color: colors.accent }}>
                      claridad.
                    </Text>
                  </Text>

                  <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
                    Tus documentos, tu práctica y tu progreso.
                    Todo en un mismo lugar.
                  </Text>
                </View>
              )}

              <View style={styles.stage}>
                {!keyboardOpen && (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.artwork, compact && styles.compactArtwork, { transform: [{ translateY: floatingY }] }]}
                    >
                      <StudyHeroArt />
                    </Animated.View>

                    <Animated.View
                      pointerEvents="none"
                      style={[styles.stageOrb, { backgroundColor: colors.halo, transform: [{ translateY: floatingY }] }]}
                    />

                    <View pointerEvents="none" style={[styles.stageRing, { borderColor: colors.halo }]} />
                  </>
                )}

                <Animated.View
                  style={[
                    styles.glassFrame,
                    { borderColor: colors.border, shadowColor: colors.shadow, transform: [{ translateY: cardY }] },
                  ]}
                >
                  <View style={styles.glassClipped}>
                    {nativeGlass ? (
                      <GlassView
                        pointerEvents="none"
                        glassEffectStyle="clear"
                        colorScheme={isDark ? "dark" : "light"}
                        style={styles.nativeGlass}
                      />
                    ) : Platform.OS === "ios" ? (
                      <BlurView pointerEvents="none" intensity={78} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                    ) : null}

                    <View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, { backgroundColor: nativeGlass ? colors.glassTint : colors.fallbackGlassTint }]}
                    />

                    <View style={[styles.form, compact && styles.compactForm, keyboardOpen && styles.keyboardForm]}>
                      <View style={styles.formHeader}>
                        <Text
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                          style={[
                            styles.formTitle,
                            keyboardOpen && styles.keyboardFormTitle,
                            { color: isDark ? "#FFFFFF" : colors.text },
                            isDark && styles.darkFormTitle,
                          ]}
                        >
                          Bienvenido de nuevo
                        </Text>

                        {!keyboardOpen && (
                          <Text style={[styles.formSubtitle, { color: colors.muted }]}>
                            Inicia sesión para continuar.
                          </Text>
                        )}
                      </View>

                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>
                          Correo electrónico
                        </Text>

                        <View
                          style={[
                            styles.inputWrapper,
                            keyboardOpen && styles.keyboardInputWrapper,
                            { backgroundColor: colors.input, borderColor: focused === "email" ? colors.accent : colors.inputBorder },
                          ]}
                        >
                          <Mail size={18} color={colors.muted} strokeWidth={1.8} />

                          <TextInput
                            value={email}
                            onChangeText={(value) => {
                              setEmail(value);
                              if (error) setError("");
                            }}
                            onFocus={() => setFocused("email")}
                            onBlur={() => setFocused(null)}
                            placeholder="tu@correo.com"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="username"
                            returnKeyType="next"
                            submitBehavior="submit"
                            editable={!loading}
                            accessibilityLabel="Correo electrónico"
                            style={[styles.input, { color: colors.text }]}
                            onSubmitEditing={() =>
                              passwordRef.current?.focus()
                            }
                          />
                        </View>
                      </View>

                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>
                          Contraseña
                        </Text>

                        <View
                          style={[
                            styles.inputWrapper,
                            keyboardOpen && styles.keyboardInputWrapper,
                            { backgroundColor: colors.input, borderColor: focused === "password" ? colors.accent : colors.inputBorder },
                          ]}
                        >
                          <LockKeyhole size={18} color={colors.muted} strokeWidth={1.8} />

                          <TextInput
                            ref={passwordRef}
                            value={password}
                            onChangeText={(value) => {
                              setPassword(value);
                              if (error) setError("");
                            }}
                            onFocus={() => setFocused("password")}
                            onBlur={() => setFocused(null)}
                            placeholder="Tu contraseña"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="current-password"
                            textContentType="password"
                            returnKeyType="go"
                            submitBehavior="blurAndSubmit"
                            editable={!loading}
                            accessibilityLabel="Contraseña"
                            style={[styles.input, { color: colors.text }]}
                            onSubmitEditing={() =>
                              void handleLogin()
                            }
                          />

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            onPress={() =>
                              setShowPassword((value) => !value)
                            }
                            hitSlop={8}
                          >
                            {showPassword ? (<EyeOff size={19} color={colors.muted} />) : (<Eye size={19} color={colors.muted} />)}
                          </Pressable>
                        </View>
                      </View>

                      {error ? (
                        <View style={styles.errorBox}>
                          <Text style={styles.errorText}>
                            {error}
                          </Text>
                        </View>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={() => void handleLogin()}
                        style={({ pressed }) => [styles.buttonWrapper, (pressed || loading) && { opacity: 0.8 }]}
                      >
                        <LinearGradient colors={["#806EF3", "#6552D8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                          {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Text style={styles.buttonText}>
                                Iniciar sesión
                              </Text>

                              <ArrowRight size={19} color="#FFFFFF" strokeWidth={2} />
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              </View>

              {!keyboardOpen && (
                <Text style={[styles.footer, { color: colors.footer }]}>
                  STUDYAI · APRENDE CON INTENCIÓN
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, width: "100%", maxWidth: 460, alignSelf: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 12 },
  compactContent: { gap: 8, paddingTop: 6, paddingBottom: 6 },
  keyboardContent: { gap: 8 },
  ambientOne: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -90, right: -150 },
  ambientTwo: { position: "absolute", width: 290, height: 290, borderRadius: 145, bottom: 30, left: -160 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 43 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 39, height: 39, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  brandName: { fontSize: 24, fontWeight: "800", letterSpacing: -1.4 },
  themeButton: { width: 42, height: 42, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  intro: { gap: 9, paddingTop: 9 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  title: { fontSize: 43, lineHeight: 46, fontWeight: "800", letterSpacing: -1.9 },
  compactTitle: { fontSize: 35, lineHeight: 39 },
  description: { fontSize: 13, lineHeight: 20, maxWidth: 300 },
  stage: { flex: 1, minHeight: 0, justifyContent: "flex-end", position: "relative" },
  artwork: { position: "absolute", top: -48, left: -12, right: -12, height: 290, zIndex: 0 },
  compactArtwork: { top: -28, height: 190 },
  stageOrb: { position: "absolute", right: -18, top: 160, width: 200, height: 200, borderRadius: 100, zIndex: 0 },
  stageRing: { position: "absolute", top: 110, left: -45, width: 155, height: 155, borderRadius: 78, borderWidth: 22, zIndex: 0, transform: [{ rotate: "18deg" }] },
  glassFrame: { borderWidth: 1, borderRadius: 29, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.14, shadowRadius: 28, elevation: 9, zIndex: 2 },
  glassClipped: { borderRadius: 28, overflow: "hidden", position: "relative" },
  nativeGlass: { ...StyleSheet.absoluteFill, borderRadius: 28 },
  form: { paddingHorizontal: 19, paddingTop: 20, paddingBottom: 20, gap: 13 },
  compactForm: { paddingTop: 15, paddingBottom: 15, gap: 11 },
  keyboardForm: { paddingTop: 12, paddingBottom: 12, gap: 8 },
  keyboardFormTitle: { fontSize: 19 },
  formHeader: { gap: 4, marginBottom: 2 },
  formTitle: { fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.7, flexShrink: 1 },
  darkFormTitle: { textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  formSubtitle: { fontSize: 12, lineHeight: 18 },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: "700" },
  inputWrapper: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  keyboardInputWrapper: { height: 44 },
  input: { flex: 1, height: "100%", fontSize: 14, paddingVertical: 0 },
  errorBox: { backgroundColor: "rgba(219,65,92,0.11)", borderWidth: 1, borderColor: "rgba(219,65,92,0.25)", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  errorText: { color: "#E7657B", fontSize: 12, lineHeight: 17 },
  buttonWrapper: { borderRadius: 15, overflow: "hidden", marginTop: 4 },
  button: { height: 53, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  footer: { textAlign: "center", fontSize: 9, fontWeight: "700", letterSpacing: 1.3, paddingVertical: 5 },
});
