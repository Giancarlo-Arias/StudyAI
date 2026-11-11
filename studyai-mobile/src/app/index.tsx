import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import {
  ArrowUpRight,
  Check,
  FileText,
  Sparkles,
  TrendingUp,
} from "@/components/study-icons";

type ThemeMode = "light" | "dark";

const THEME_KEY = "studyai_theme";

const themes = {
  light: {
    background: "#F8F9FC",
    surface: "#FFFFFF",
    text: "#1B1C32",
    muted: "#777B90",
    border: "#E9E9F2",
    accent: "#7866E8",
    accentBackground: "#F0EDFF",
    brandBackground: "#252447",
    brandIcon: "#FFFFFF",
    badgeBackground: "#EEEFF5",
    badgeText: "#78798D",
    sceneStart: "#E5E0FF",
    sceneEnd: "#F8F9FC",
    orbit: "#C9C0EF",
    cta: "#25233F",
    ctaText: "#FFFFFF",
    ctaIcon: "#C6BBFF",
    shadow: "#6A6298",
  },
  dark: {
    background: "#0D1020",
    surface: "#20253B",
    text: "#FAFAFF",
    muted: "#A8AEC8",
    border: "#343B55",
    accent: "#B5A6FF",
    accentBackground: "#2B294D",
    brandBackground: "#8172EB",
    brandIcon: "#FFFFFF",
    badgeBackground: "#20263A",
    badgeText: "#B8BBD3",
    sceneStart: "#322A61",
    sceneEnd: "#0D1020",
    orbit: "#554A89",
    cta: "#AAA0FF",
    ctaText: "#1B1936",
    ctaIcon: "#FFFFFF",
    shadow: "#050510",
  },
};

type Palette = (typeof themes)[ThemeMode];

function ThemeIcon({
  dark,
  color,
}: {
  dark: boolean;
  color: string;
}) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dark ? (
        <>
          <Circle cx={12} cy={12} r={4} />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </>
      ) : (
        <Path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
      )}
    </Svg>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  const systemTheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [themeOverride, setThemeOverride] =
    useState<ThemeMode | null>(null);

  const mode: ThemeMode =
    themeOverride ??
    (systemTheme === "dark" ? "dark" : "light");

  const isDark = mode === "dark";
  const palette = themes[mode];

  const availableHeight =
    height - insets.top - insets.bottom;

  const compact = availableHeight < 720;
  const tiny = availableHeight < 630;

  const sceneWidth = Math.min(width - 44, 380);

  const sceneHeight = Math.max(
    178,
    Math.min(268, availableHeight - 420),
  );

  const styles = useMemo(
    () =>
      createStyles(
        palette,
        compact,
        tiny,
        sceneWidth,
        sceneHeight,
      ),
    [palette, compact, tiny, sceneWidth, sceneHeight],
  );

  const entrance = useRef(new Animated.Value(0)).current;
  const floating = useRef(new Animated.Value(0)).current;

  // Recuperar la preferencia de tema guardada.
  useEffect(() => {
    let active = true;

    async function restoreTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);

        if (
          active &&
          (saved === "light" || saved === "dark")
        ) {
          setThemeOverride(saved);
        }
      } catch {
        // Si no se puede leer, utilizamos el tema del sistema.
      }
    }

    void restoreTheme();

    return () => {
      active = false;
    };
  }, []);

  // Animación inicial y movimiento suave de las tarjetas.
  useEffect(() => {
    const entranceAnimation = Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floating, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floating, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    entranceAnimation.start();
    floatingAnimation.start();

    return () => {
      entranceAnimation.stop();
      floatingAnimation.stop();
    };
  }, [entrance, floating]);

  function toggleTheme() {
    const nextMode: ThemeMode =
      isDark ? "light" : "dark";

    setThemeOverride(nextMode);

    void SecureStore.setItemAsync(THEME_KEY, nextMode).catch(
      () => {},
    );
  }

  const entranceY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const floatingY = floating.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={
          isDark ? "light-content" : "dark-content"
        }
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Sparkles
                  size={21}
                  color={palette.brandIcon}
                />
              </View>

              <Text style={styles.brandText}>
                study
                <Text style={styles.brandAccent}>ai.</Text>
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isDark
                  ? "Activar modo claro"
                  : "Activar modo oscuro"
              }
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.themeButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemeIcon
                dark={isDark}
                color={palette.text}
              />
            </Pressable>
          </View>

          {/* HERO */}
          <Animated.View
            style={[
              styles.intro,
              {
                opacity: entrance,
                transform: [{ translateY: entranceY }],
              },
            ]}
          >
            <View style={styles.eyebrow}>
              <Sparkles
                size={13}
                color={palette.accent}
              />

              <Text style={styles.eyebrowText}>
                APRENDE DE FORMA INTELIGENTE
              </Text>
            </View>

            <Text style={styles.headline}>
              Aprende a tu{"\n"}
              ritmo. Llega{"\n"}
              <Text style={styles.headlineAccent}>
                más lejos.
              </Text>
            </Text>

            <Text style={styles.description}>
              Convierte tus documentos en cuestionarios
              con IA. Practica y descubre cuánto
              has avanzado.
            </Text>
          </Animated.View>

          {/* ILUSTRACIÓN: SIN SCROLL */}
          <View style={styles.scene} pointerEvents="none">
            <LinearGradient
              colors={[
                palette.sceneStart,
                palette.sceneEnd,
              ]}
              style={styles.sceneGlow}
            />

            <View style={styles.orbit} />

            <Animated.View
              style={[
                styles.quizContainer,
                {
                  opacity: entrance,
                  transform: [
                    { translateY: floatingY },
                    { rotate: "3deg" },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["#302D5D", "#191B37"]}
                style={styles.quizCard}
              >
                <View style={styles.quizHeader}>
                  <View style={styles.quizCategory}>
                    <Sparkles
                      size={12}
                      color="#C7BEFF"
                    />

                    <Text style={styles.quizCategoryText}>
                      REPASO INTELIGENTE
                    </Text>
                  </View>

                  <Text style={styles.quizCounter}>
                    02 / 08
                  </Text>
                </View>

                <View style={styles.quizDivider} />

                <Text style={styles.quizQuestion}>
                  ¿Cuál es la idea central{"\n"}
                  de este tema?
                </Text>

                <View style={styles.selectedAnswer}>
                  <View style={styles.answerLetter}>
                    <Text style={styles.answerLetterText}>
                      A
                    </Text>
                  </View>

                  <Text style={styles.selectedAnswerText}>
                    El concepto principal
                  </Text>

                  <Check
                    size={16}
                    color="#E4DFFF"
                  />
                </View>

                {!compact && (
                  <View style={styles.otherAnswer}>
                    <View style={styles.otherLetter}>
                      <Text style={styles.otherLetterText}>
                        B
                      </Text>
                    </View>

                    <Text style={styles.otherAnswerText}>
                      Un dato complementario
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Documento flotante */}
            <Animated.View
              style={[
                styles.documentCard,
                {
                  opacity: entrance,
                  transform: [
                    { translateY: entranceY },
                  ],
                },
              ]}
            >
              <View style={styles.documentIcon}>
                <FileText
                  size={19}
                  color={palette.accent}
                />
              </View>

              <View style={styles.documentInfo}>
                <Text style={styles.documentEyebrow}>
                  DOCUMENTO PREPARADO
                </Text>

                <Text
                  style={styles.documentTitle}
                  numberOfLines={1}
                >
                  Material de estudio
                </Text>
              </View>

              <View style={styles.checkCircle}>
                <Check size={13} color="#FFFFFF" />
              </View>
            </Animated.View>

            {/* Indicador de progreso */}
            <Animated.View
              style={[
                styles.progressCard,
                {
                  transform: [
                    { translateY: floatingY },
                  ],
                },
              ]}
            >
              <View style={styles.progressIcon}>
                <TrendingUp
                  size={19}
                  color={palette.accent}
                />
              </View>

              <View>
                <Text style={styles.progressValue}>
                  92%
                </Text>

                <Text style={styles.progressCaption}>
                  Tu progreso
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* CTA */}
          <Animated.View
            style={[
              styles.footer,
              { opacity: entrance },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/login")}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.ctaContent}>
                <Text style={styles.ctaEyebrow}>
                  TU APRENDIZAJE EMPIEZA AQUÍ
                </Text>

                <Text style={styles.ctaTitle}>
                  Empezar ahora
                </Text>
              </View>

              <View style={styles.ctaIcon}>
                <ArrowUpRight
                  size={22}
                  color={palette.cta}
                />
              </View>
            </Pressable>

            <Text style={styles.footerNote}>
              Tus documentos. Tu ritmo. Tus logros.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(
  c: Palette,
  compact: boolean,
  tiny: boolean,
  sceneWidth: number,
  sceneHeight: number,
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: tiny ? 8 : 16,
      paddingBottom: tiny ? 8 : 16,
      justifyContent: "space-between",
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandMark: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor: c.brandBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    brandText: {
      color: c.text,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -1.1,
    },
    brandAccent: {
      color: c.accent,
    },
    themeButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },

    // Hero
    intro: {
      paddingTop: tiny ? 4 : compact ? 12 : 24,
    },
    eyebrow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: tiny ? 10 : 15,
    },
    eyebrowText: {
      color: c.accent,
      fontSize: tiny ? 9 : 10,
      fontWeight: "800",
      letterSpacing: 1.25,
    },
    headline: {
      color: c.text,
      fontSize: tiny ? 34 : compact ? 39 : 44,
      fontWeight: "800",
      lineHeight: tiny ? 39 : compact ? 44 : 49,
      letterSpacing: -1.8,
    },
    headlineAccent: {
      color: c.accent,
    },
    description: {
      color: c.muted,
      marginTop: tiny ? 9 : 14,
      fontSize: tiny ? 12 : 14,
      lineHeight: tiny ? 18 : 21,
      maxWidth: 340,
    },

    // Ilustración
    scene: {
      alignSelf: "center",
      width: sceneWidth,
      height: sceneHeight,
      position: "relative",
    },
    sceneGlow: {
      position: "absolute",
      top: 0,
      alignSelf: "center",
      width: Math.min(sceneWidth * 0.86, sceneHeight),
      height: Math.min(sceneWidth * 0.86, sceneHeight),
      borderRadius: 999,
    },
    orbit: {
      position: "absolute",
      top: 15,
      alignSelf: "center",
      width: sceneHeight * 0.83,
      height: sceneHeight * 0.83,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.orbit,
      opacity: 0.7,
    },
    quizContainer: {
      position: "absolute",
      top: compact ? 37 : 52,
      right: 5,
      width: "87%",
      zIndex: 2,
      shadowColor: c.shadow,
      shadowOpacity: 0.22,
      shadowRadius: 22,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      elevation: 10,
    },
    quizCard: {
      borderRadius: 22,
      padding: compact ? 13 : 18,
      borderWidth: 1,
      borderColor: "#FFFFFF1C",
    },
    quizHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    quizCategory: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    quizCategoryText: {
      color: "#C7BEFF",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.75,
    },
    quizCounter: {
      color: "#9C9FC5",
      fontSize: 10,
    },
    quizDivider: {
      height: 1,
      marginTop: compact ? 10 : 14,
      marginBottom: compact ? 10 : 14,
      backgroundColor: "#FFFFFF1B",
    },
    quizQuestion: {
      color: "#FFFFFF",
      fontSize: compact ? 15 : 17,
      fontWeight: "700",
      lineHeight: compact ? 20 : 23,
      marginBottom: compact ? 10 : 15,
    },
    selectedAnswer: {
      minHeight: compact ? 35 : 42,
      borderRadius: 11,
      paddingHorizontal: 9,
      backgroundColor: "#6157B9",
      borderWidth: 1,
      borderColor: "#9C91ED",
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    answerLetter: {
      width: 23,
      height: 23,
      borderRadius: 7,
      backgroundColor: "#FFFFFF24",
      justifyContent: "center",
      alignItems: "center",
    },
    answerLetterText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },
    selectedAnswerText: {
      flex: 1,
      color: "#FFFFFF",
      fontSize: compact ? 11 : 12,
      fontWeight: "600",
    },
    otherAnswer: {
      minHeight: 41,
      borderRadius: 11,
      marginTop: 8,
      paddingHorizontal: 9,
      backgroundColor: "#FFFFFF09",
      borderWidth: 1,
      borderColor: "#FFFFFF20",
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    otherLetter: {
      width: 23,
      height: 23,
      borderRadius: 7,
      backgroundColor: "#FFFFFF10",
      alignItems: "center",
      justifyContent: "center",
    },
    otherLetterText: {
      color: "#ABB0D3",
      fontSize: 11,
    },
    otherAnswerText: {
      color: "#C1C4DB",
      fontSize: 12,
    },

    // Tarjeta documento
    documentCard: {
      position: "absolute",
      top: compact ? 2 : 8,
      left: 0,
      right: 46,
      minHeight: compact ? 52 : 62,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 15,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      zIndex: 3,
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 13,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      elevation: 6,
    },
    documentIcon: {
      width: compact ? 34 : 38,
      height: compact ? 34 : 38,
      borderRadius: 11,
      backgroundColor: c.accentBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    documentInfo: {
      flex: 1,
      gap: 4,
    },
    documentEyebrow: {
      color: c.muted,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    documentTitle: {
      color: c.text,
      fontSize: 12,
      fontWeight: "800",
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#4CBF94",
      alignItems: "center",
      justifyContent: "center",
    },

    // Tarjeta progreso
    progressCard: {
      position: "absolute",
      left: 0,
      bottom: 0,
      minWidth: compact ? 145 : 163,
      height: compact ? 57 : 68,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      zIndex: 4,
      shadowColor: c.shadow,
      shadowOpacity: 0.13,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      elevation: 7,
    },
    progressIcon: {
      width: compact ? 35 : 41,
      height: compact ? 35 : 41,
      borderRadius: 11,
      backgroundColor: c.accentBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    progressValue: {
      color: c.text,
      fontSize: compact ? 18 : 21,
      fontWeight: "800",
    },
    progressCaption: {
      color: c.muted,
      fontSize: 10,
    },

    // Footer
    footer: {
      gap: tiny ? 8 : 13,
    },
    cta: {
      height: tiny ? 58 : 68,
      borderRadius: 19,
      backgroundColor: c.cta,
      paddingLeft: 20,
      paddingRight: 9,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ctaContent: {
      gap: 5,
    },
    ctaEyebrow: {
      color: c.ctaText,
      opacity: 0.65,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
    },
    ctaTitle: {
      color: c.ctaText,
      fontSize: 17,
      fontWeight: "800",
    },
    ctaIcon: {
      width: tiny ? 40 : 49,
      height: tiny ? 40 : 49,
      borderRadius: 14,
      backgroundColor: c.ctaIcon,
      alignItems: "center",
      justifyContent: "center",
    },
    footerNote: {
      textAlign: "center",
      color: c.muted,
      fontSize: 11,
    },
  });
}