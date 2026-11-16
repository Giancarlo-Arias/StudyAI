import { Pressable, Text, View } from "@/components/theme-primitives";
import { useThemeTransition } from "@/components/theme-transition";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "@/components/theme-gradient";
import { useRouter } from "expo-router";
import { ArrowUpRight, ChartNoAxesCombined, ChevronRight, FileText, LogOut, Moon, NotebookPen, Sparkles, Sun, Trophy } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { MotionIcon, MotionPanel, MotionText, MotionView, SkeletonBlock, TabScene } from "@/components/dashboard/dashboard-motion";
import { ScoreChart } from "@/components/dashboard/score-chart";
import { getDashboardData, getStudyDocuments, type DashboardData, type DocumentsResponse } from "@/lib/dashboard-api";
import { getCurrentUser, signOut, type CurrentUser } from "@/lib/mobile-auth";
import { readDashboardEntry, releaseDashboardEntry } from "@/lib/dashboard-entry";
import { createOverviewStyles, getDashboardPalette, type OverviewStyles } from "@/styles/dashboard-overview.styles";

const HAS_GLASS =
  Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

type Palette = ReturnType<typeof getDashboardPalette>;

function RoundAction({ label, icon, onPress, isDark, styles, disabled = false }: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  isDark: boolean;
  styles: OverviewStyles;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function press(value: number) {
    if (!reduced) {
      scale.set(withSpring(value, { damping: 17, stiffness: 260 }));
    }
  }

  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => press(0.93)}
        onPressOut={() => press(1)}
        style={styles.action}
      >
        {HAS_GLASS ? (
          <GlassView
            pointerEvents="none"
            glassEffectStyle="clear"
            colorScheme={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View pointerEvents="none" style={styles.actionFallback} />
        )}

        {icon}
      </Pressable>
    </Animated.View>
  );
}

function Metric({ icon, label, value, suffix = "", color, order, styles }: {
  icon: ReactNode;
  label: string;
  value: number | null;
  suffix?: string;
  color: string;
  order: number;
  styles: OverviewStyles;
}) {
  const delay = order * 110;

  return (
    <View style={styles.metric}>
      <View style={[styles.metricTop, local.metricTop]}>
        <View style={local.metricIconSlot}>
          <MotionIcon delay={710 + delay}>
            {icon}
          </MotionIcon>
        </View>

        <AnimatedNumber
          value={value}
          label={label}
          suffix={suffix}
          decimalPlaces={suffix === "%" ? 1 : 0}
          delay={780 + delay}
          duration={900}
          style={[styles.metricValue, local.metricValue, { color }]}
        />
      </View>

      <MotionText text={label} delay={880 + delay} style={styles.metricLabel} />
    </View>
  );
}

function RecentFile({ filename, pages, index, colors, styles, onPress }: {
  filename: string;
  pages: number;
  index: number;
  colors: Palette;
  styles: OverviewStyles;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const delay = index * 85;

  function press(value: number) {
    if (!reduced) {
      scale.set(withSpring(value, { damping: 20, stiffness: 250 }));
    }
  }

  return (
    <MotionView delay={1580 + delay}>
      <Animated.View style={animated}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver biblioteca: ${filename}`}
          onPress={onPress}
          onPressIn={() => press(0.985)}
          onPressOut={() => press(1)}
          style={[styles.fileRow, local.fileRow]}
        >
          <View style={local.fileIconSlot}>
            <MotionIcon delay={1660 + delay}>
              <View style={styles.fileIcon}>
                <FileText size={19} color={colors.accent} strokeWidth={1.8} />
              </View>
            </MotionIcon>
          </View>

          <View style={[styles.fileText, local.fileText]}>
            <MotionText text={filename} delay={1690 + delay} numberOfLines={1} style={styles.fileName} />

            <MotionText
              text={`${pages} páginas con texto`}
              delay={1790 + delay}
              style={styles.fileMeta}
            />
          </View>

          <MotionIcon delay={1720 + delay}>
            <ChevronRight size={18} color={colors.tertiary} />
          </MotionIcon>
        </Pressable>
      </Animated.View>
    </MotionView>
  );
}

function InitialSkeleton({ isDark }: {
  isDark: boolean;
}) {
  return (
    <View style={{ gap: 15 }}>
      <SkeletonBlock width="61%" height={30} isDark={isDark} />

      <SkeletonBlock width="79%" height={15} isDark={isDark} />

      <SkeletonBlock height={96} radius={21} isDark={isDark} />

      <SkeletonBlock height={262} radius={23} isDark={isDark} />
    </View>
  );
}

export default function DashboardScreen() {
  const changeTheme = useThemeTransition();
  async function toggleTheme() {
    try { await changeTheme(); } catch { /* La preferencia visual ya se aplico. */ }
  }
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  const styles = useMemo(
    () => createOverviewStyles(isDark),
    [isDark],
  );

  const colors = useMemo(
    () => getDashboardPalette(isDark),
    [isDark],
  );

  const [entry] = useState(readDashboardEntry);
  const [user, setUser] =
    useState<CurrentUser | null>(entry?.user ?? null);

  const [authLoading, setAuthLoading] = useState(!entry?.user);
  const [redirecting, setRedirecting] = useState(false);
  const [authError, setAuthError] = useState("");

  const [overview, setOverview] =
    useState<DashboardData | null>(entry?.overview ?? null);

  const [documents, setDocuments] =
    useState<DocumentsResponse | null>(entry?.documents ?? null);

  const [statsLoading, setStatsLoading] = useState(!entry?.overview);
  const [docsLoading, setDocsLoading] = useState(!entry?.documents);
  const [statsError, setStatsError] = useState("");
  const [docsError, setDocsError] = useState("");

  const [statsRevision, setStatsRevision] = useState(0);
  const [docsRevision, setDocsRevision] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    releaseDashboardEntry(entry);
    let active = true;

    async function checkSession() {
      try {
        const current = await (entry?.userRequest ?? getCurrentUser());

        if (!active) return;

        if (!current) {
          setRedirecting(true);
          router.replace("/login");
          return;
        }

        setUser(current);
        setAuthError("");
      } catch (error) {
        if (!active) return;

        setAuthError(
          error instanceof Error ? error.message : "No se pudo validar la sesión.",
        );
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [entry, router]);

  useEffect(() => {
    if (userId === undefined) return;

    let active = true;

    const statsRequest = (loadKey === 0 && entry ? entry.statsRequest : getDashboardData()).then((data) => {
      if (!active) return;

      setOverview(data);
      setStatsError("");
      setStatsRevision((revision) => revision + 1);
    })
      .catch((error: unknown) => {
        if (!active) return;

        setStatsError(
          error instanceof Error ? error.message : "No se pudieron cargar las estadísticas.",
        );
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    const docsRequest = (loadKey === 0 && entry ? entry.docsRequest : getStudyDocuments(3, 0)).then((data) => {
      if (!active) return;

      setDocuments(data);
      setDocsError("");
      setDocsRevision((revision) => revision + 1);
    })
      .catch((error: unknown) => {
        if (!active) return;

        setDocsError(
          error instanceof Error ? error.message : "No se pudieron cargar los documentos.",
        );
      })
      .finally(() => {
        if (active) setDocsLoading(false);
      });

    void Promise.allSettled([statsRequest, docsRequest]).then(() => {
      if (active) setRefreshing(false);
    });

    return () => {
      active = false;
    };
  }, [entry, userId, loadKey]);

  function refresh() {
    if (refreshing || statsLoading || docsLoading) {
      return;
    }

    setRefreshing(true);
    setStatsLoading(true);
    setDocsLoading(true);
    setLoadKey((key) => key + 1);
  }


  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
      setAuthError(
        "No se pudo cerrar la sesión. Intenta nuevamente.",
      );
    }
  }

  const firstName =
    user?.full_name?.trim().split(/\s+/)[0] || "Estudiante";

  const showBusy =
    authLoading || redirecting || loggingOut;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <View pointerEvents="none" style={styles.ambient} />

      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <MotionIcon>
              <View style={styles.brandMark}>
                <Sparkles size={18} strokeWidth={1.8} color={isDark ? "#201C35" : "#FFFFFF"} />
              </View>
            </MotionIcon>

            <MotionView delay={70}>
              <Text style={styles.brandName}>
                Study
                <Text style={{ color: colors.accent }}>
                  AI
                </Text>
              </Text>
            </MotionView>
          </View>

          <View style={styles.actions}>
            <RoundAction
              label="Ver mis logros"
              onPress={() => router.push("/achievements")}
              isDark={isDark}
              styles={styles}
              icon={
                <Trophy
                  size={19}
                  color={colors.accent}
                  strokeWidth={1.8}
                />
              }
            />
            <RoundAction
              label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
              onPress={() => void toggleTheme()}
              isDark={isDark}
              styles={styles}
              icon={
                isDark ? (
                  <Sun size={19} color={colors.accent} strokeWidth={1.8} />
                ) : (
                  <Moon size={19} color={colors.accent} strokeWidth={1.8} />
                )
              }
            />

            {user && (
              <RoundAction
                label="Cerrar sesión"
                onPress={() => void logout()}
                disabled={loggingOut}
                isDark={isDark}
                styles={styles}
                icon={<LogOut size={19} color={colors.accent} strokeWidth={1.8} />}
              />
            )}
          </View>
        </View>

        <TabScene>
          {showBusy ? (
            loggingOut ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />

                <MotionText text="Cerrando sesión…" style={styles.centerDescription} />
              </View>
            ) : (
              <View style={styles.content}>
                <InitialSkeleton isDark={isDark} />
              </View>
            )
          ) : !user ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>
                No se pudo cargar tu sesión
              </Text>

              <Text style={styles.centerDescription}>
                {authError || "Inicia sesión para consultar tu aprendizaje."}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.replace("/login")
                }
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  Ir a iniciar sesión
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
            >
              <View key={`intro-${statsRevision}`} style={styles.intro}>
                <MotionView delay={40}>
                  <Text style={styles.title}>
                    Hola, <Text style={styles.name}>{firstName}</Text>
                  </Text>
                </MotionView>

                <MotionText text="Tu aprendizaje, de un vistazo." delay={270} style={styles.subtitle} />
              </View>

              {authError ? (
                <MotionView style={styles.banner}>
                  <Text style={styles.bannerText}>
                    {authError}
                  </Text>
                </MotionView>
              ) : null}

              {statsError ? (
                <MotionView style={styles.banner}>
                  <Text style={styles.bannerText}>
                    {statsError}
                  </Text>

                  <Pressable accessibilityRole="button" onPress={refresh}>
                    <Text style={styles.bannerLink}>
                      Reintentar
                    </Text>
                  </Pressable>
                </MotionView>
              ) : null}

              {overview ? (
                <MotionPanel
                  key={`metrics-${statsRevision}`}
                  delay={160}
                  style={styles.metrics}
                  contentStyle={{ flexDirection: "row", alignItems: "stretch" }}
                >
                  <Metric
                    label="Documentos"
                    value={documents?.count ?? null}
                    styles={styles}
                    color={colors.text}
                    order={0}
                    icon={<FileText size={18} strokeWidth={1.8} color={colors.accent} />}
                  />

                  <View style={styles.metricSeparator} />

                  <Metric
                    label="Intentos"
                    value={overview.progress.total_attempts}
                    styles={styles}
                    color={colors.text}
                    order={1}
                    icon={<NotebookPen size={18} strokeWidth={1.8} color={colors.accent} />}
                  />

                  <View style={styles.metricSeparator} />

                  <Metric
                    label="Promedio general"
                    value={overview.progress.average_score_percent}
                    suffix="%"
                    styles={styles}
                    color={colors.accent}
                    order={2}
                    icon={<ChartNoAxesCombined size={18} strokeWidth={1.8} color={colors.accent} />}
                  />
                </MotionPanel>
              ) : statsLoading ? (<SkeletonBlock isDark={isDark} height={96} radius={21} />) : null}

              {overview ? (
                <MotionPanel
                  key={`chart-${statsRevision}`}
                  delay={420}
                  style={styles.panel}
                  contentStyle={{ gap: 10 }}
                >
                  <View style={styles.sectionHeader}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <MotionText text="Rendimiento" delay={980} style={styles.sectionTitle} />

                      <MotionText text="Resultados de tus cuestionarios" delay={1070} style={styles.sectionDetail} />
                    </View>

                    <MotionIcon delay={1010}>
                      <View style={styles.chartGlyph}>
                        <ChartNoAxesCombined size={18} strokeWidth={1.8} color={colors.accent} />
                      </View>
                    </MotionIcon>
                  </View>

                  <ScoreChart attempts={overview.progress.recent_attempts} isDark={isDark} />

                </MotionPanel>
              ) : statsLoading ? (<SkeletonBlock isDark={isDark} height={275} radius={23} />) : null}

              <View style={styles.documents}>
                <MotionView
                  key={`docs-heading-${docsRevision}`}
                  delay={890}
                  style={styles.sectionHeader}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <MotionText text="Documentos recientes" delay={930} style={styles.sectionTitle} />

                    <MotionText text="Tu biblioteca de estudio" delay={1020} style={styles.sectionDetail} />
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos los documentos"
                    onPress={() =>
                      router.push("/documents")
                    }
                    style={styles.documentsLink}
                  >
                    <MotionText text="Ver todos" delay={1040} style={styles.documentsLinkText} />

                    <ArrowUpRight size={16} color={colors.accent} />
                  </Pressable>
                </MotionView>

                {docsError ? (
                  <MotionView style={styles.banner}>
                    <Text style={styles.bannerText}>
                      {docsError}
                    </Text>

                    <Pressable accessibilityRole="button" onPress={refresh}>
                      <Text style={styles.bannerLink}>
                        Reintentar
                      </Text>
                    </Pressable>
                  </MotionView>
                ) : null}

                {documents ? (
                  <MotionPanel
                    key={`docs-${docsRevision}`}
                    delay={1110}
                    style={styles.files}
                  >
                    {documents.documents.length > 0 ? (
                      documents.documents.map(
                        (file, index) => (
                          <View key={file.id}>
                            {index > 0 && (<View style={styles.rowDivider} />)}

                            <RecentFile
                              filename={file.filename}
                              pages={file.pages_with_text}
                              index={index}
                              colors={colors}
                              styles={styles}
                              onPress={() =>
                                router.push("/documents")
                              }
                            />
                          </View>
                        ),
                      )
                    ) : (
                      <View style={styles.emptyFiles}>
                        <MotionText text="Aún no tienes documentos" delay={1630} style={styles.emptyTitle} />

                        <MotionText text="Los archivos que agregues aparecerán aquí." delay={1740} style={styles.emptyDetail} />
                      </View>
                    )}
                  </MotionPanel>
                ) : docsLoading ? (
                  <View style={{ gap: 9 }}>
                    <SkeletonBlock isDark={isDark} height={65} radius={19} />

                    <SkeletonBlock isDark={isDark} height={65} radius={19} />
                  </View>
                ) : null}
              </View>
            </ScrollView>
          )}
        </TabScene>
      </SafeAreaView>
    </LinearGradient>
  );
}

const local = StyleSheet.create({
  metricTop: { alignItems: "center", minHeight: 34, gap: 6 },
  metricIconSlot: { width: 22, height: 34, alignItems: "center", justifyContent: "center" },
  metricValue: { lineHeight: 32, height: 34 },
  fileRow: { alignItems: "center" },
  fileIconSlot: { width: 40, alignItems: "center", justifyContent: "center" },
  fileText: { justifyContent: "center" },
});
