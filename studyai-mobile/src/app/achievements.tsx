import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useFocusEffect, useIsFocused } from "expo-router";
import { ArrowLeft, Award, CheckCircle2, LockKeyhole, RefreshCw, Sparkles, Trophy } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionView, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import { getStudyAchievements, type Achievement } from "@/lib/achievements-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

type Palette = ReturnType<typeof getDashboardPalette>;

function formatDate(value: string | null): string {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CR", {
        dateStyle: "medium",
        timeZone: "America/Costa_Rica",
      }).format(date);
}

function getPercentage(achievement: Achievement): number {
  if (achievement.unlocked) return 100;
  if (achievement.target <= 0) return 0;

  return Math.max(0, Math.min(100, Math.round((achievement.current / achievement.target) * 100)));
}

function AchievementCard({ achievement, colors, index }: {
  achievement: Achievement;
  colors: Palette;
  index: number;
}) {
  const unlocked = achievement.unlocked;
  const percentage = getPercentage(achievement);

  return (
    <MotionView delay={120 + Math.min(index, 5) * 65}>
      <View style={[styles.card, {
        backgroundColor: colors.surface,
        borderColor: unlocked ? colors.accent : colors.outline,
      }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.achievementIcon, { backgroundColor: colors.softAccent }]}>
            {unlocked
              ? <Award size={23} color={colors.accent} strokeWidth={1.7} />
              : <LockKeyhole size={21} color={colors.secondary} strokeWidth={1.7} />
            }
          </View>

          <View style={[styles.statusBadge, { backgroundColor: unlocked ? colors.softAccent : colors.background }]}>
            {unlocked && <CheckCircle2 size={13} color={colors.accent} />}
            <Text style={[styles.statusText, { color: unlocked ? colors.accent : colors.secondary }]}>
              {unlocked ? "Desbloqueado" : "Pendiente"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {achievement.title}
          </Text>
          <Text style={[styles.cardDescription, { color: colors.secondary }]}>
            {achievement.description}
          </Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.secondary }]}>Progreso</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {achievement.current} / {achievement.target}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.softAccent }]}>
            <View style={[styles.progressFill, {
              width: `${percentage}%`,
              backgroundColor: colors.accent,
            }]} />
          </View>
        </View>

        {unlocked && achievement.unlocked_at && (
          <View style={[styles.unlockedFooter, { borderTopColor: colors.separator }]}>
            <Sparkles size={14} color={colors.accent} />
            <Text style={[styles.unlockedDate, { color: colors.secondary }]}>
              Obtenido el {formatDate(achievement.unlocked_at)}
            </Text>
          </View>
        )}
      </View>
    </MotionView>
  );
}

export default function AchievementsScreen() {
  const isFocused = useIsFocused();
  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError("");
  }, []));

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    void getStudyAchievements()
      .then((data) => {
        if (!active) return;
        setAchievements(data);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "No se pudieron cargar los logros.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => { active = false; };
  }, [isFocused, revision]);

  function refresh() {
    if (loading || refreshing) return;

    setRefreshing(true);
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const pending = achievements.filter((achievement) => !achievement.unlocked);
  const total = achievements.length;
  const completion = total === 0 ? 0 : Math.round((unlocked.length / total) * 100);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Mis logros</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        >
          {/* Introducción */}
          <MotionView delay={70} style={styles.intro}>
            <Text style={[styles.title, { color: colors.text }]}>Tus logros</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Cada avance cuenta. Descubre tus metas alcanzadas y los próximos desafíos.
            </Text>
          </MotionView>

          {loading && achievements.length === 0 ? (
            <View style={styles.skeletons}>
              <SkeletonBlock height={175} radius={22} isDark={dark} />
              <SkeletonBlock height={200} radius={20} isDark={dark} />
              <SkeletonBlock height={200} radius={20} isDark={dark} />
            </View>
          ) : (
            <>
              {/* Error de carga */}
              {error && (
                <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.errorText, { color: colors.secondary }]}>{error}</Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRevision((value) => value + 1)}
                    style={[styles.retryButton, { backgroundColor: colors.softAccent }]}
                  >
                    <RefreshCw size={15} color={colors.accent} />
                    <Text style={[styles.retryText, { color: colors.accent }]}>Reintentar</Text>
                  </Pressable>
                </View>
              )}

              {total > 0 && (
                <>
                  {/* Resumen general */}
                  <MotionView delay={130}>
                    <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                      <View style={styles.summaryTop}>
                        <View style={[styles.summaryIcon, { backgroundColor: colors.softAccent }]}>
                          <Trophy size={27} color={colors.accent} strokeWidth={1.7} />
                        </View>

                        <View style={styles.summaryCopy}>
                          <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
                            LOGROS CONSEGUIDOS
                          </Text>

                          <Text style={[styles.summaryValue, { color: colors.text }]}>
                            {unlocked.length}
                            <Text style={[styles.summaryTotal, { color: colors.secondary }]}>
                              {" / "}{total}
                            </Text>
                          </Text>
                        </View>

                        <View style={[styles.summaryPercent, { backgroundColor: colors.softAccent }]}>
                          <Text style={[styles.summaryPercentText, { color: colors.accent }]}>
                            {completion}%
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.summaryTrack, { backgroundColor: colors.softAccent }]}>
                        <View style={[styles.summaryFill, {
                          width: `${completion}%`,
                          backgroundColor: colors.accent,
                        }]} />
                      </View>

                      <Text style={[styles.summaryHint, { color: colors.secondary }]}>
                        {pending.length === 0
                          ? "¡Has conseguido todos los logros!"
                          : `${pending.length} ${pending.length === 1 ? "logro pendiente" : "logros pendientes"} por desbloquear`}
                      </Text>
                    </View>
                  </MotionView>

                  {/* Logros desbloqueados */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeading}>
                      <View style={[styles.sectionIcon, { backgroundColor: colors.softAccent }]}>
                        <Award size={18} color={colors.accent} />
                      </View>

                      <View style={styles.sectionCopy}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Desbloqueados</Text>
                        <Text style={[styles.sectionDescription, { color: colors.secondary }]}>
                          Insignias que ya has conseguido
                        </Text>
                      </View>
                    </View>

                    {unlocked.length > 0 ? (
                      unlocked.map((achievement, index) => (
                        <AchievementCard
                          key={achievement.code}
                          achievement={achievement}
                          colors={colors}
                          index={index}
                        />
                      ))
                    ) : (
                      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.emptyText, { color: colors.secondary }]}>
                          Todavía no has desbloqueado logros. Continúa estudiando para conseguir el primero.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Logros pendientes */}
                  {pending.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeading}>
                        <View style={[styles.sectionIcon, { backgroundColor: colors.softAccent }]}>
                          <LockKeyhole size={18} color={colors.accent} />
                        </View>

                        <View style={styles.sectionCopy}>
                          <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas metas</Text>
                          <Text style={[styles.sectionDescription, { color: colors.secondary }]}>
                            Lo que te falta para desbloquearlas
                          </Text>
                        </View>
                      </View>

                      {pending
                        .slice()
                        .sort((a, b) => getPercentage(b) - getPercentage(a))
                        .map((achievement, index) => (
                          <AchievementCard
                            key={achievement.code}
                            achievement={achievement}
                            colors={colors}
                            index={index}
                          />
                        ))}
                    </View>
                  )}
                </>
              )}

              {/* Estado vacío */}
              {!error && total === 0 && (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    No hay logros disponibles por el momento.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  headerPlaceholder: { width: 43 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, gap: 22 },
  intro: { gap: 7 },
  title: { ...typography, fontSize: 29, fontWeight: "800", letterSpacing: -0.9 },
  subtitle: { ...typography, fontSize: 14, lineHeight: 22 },
  skeletons: { gap: 12 },

  summary: { borderWidth: 1, borderRadius: 22, padding: 19, gap: 17 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  summaryIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1, gap: 5 },
  summaryLabel: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  summaryValue: { ...typography, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  summaryTotal: { ...typography, fontSize: 19, fontWeight: "700" },
  summaryPercent: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 11 },
  summaryPercentText: { ...typography, fontSize: 13, fontWeight: "800" },
  summaryTrack: { height: 7, borderRadius: 10, overflow: "hidden" },
  summaryFill: { height: "100%", borderRadius: 10 },
  summaryHint: { ...typography, fontSize: 12, lineHeight: 18 },

  section: { gap: 13 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 3 },
  sectionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionCopy: { flex: 1, gap: 4 },
  sectionTitle: { ...typography, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  sectionDescription: { ...typography, fontSize: 12 },

  card: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  achievementIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusBadge: { minHeight: 30, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { ...typography, fontSize: 11, fontWeight: "800" },
  cardBody: { gap: 6 },
  cardTitle: { ...typography, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  cardDescription: { ...typography, fontSize: 12, lineHeight: 19 },
  progressSection: { gap: 10 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { ...typography, fontSize: 11 },
  progressValue: { ...typography, fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 6, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8 },
  unlockedFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  unlockedDate: { ...typography, fontSize: 11 },

  errorCard: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 12 },
  errorText: { ...typography, fontSize: 12, lineHeight: 19 },
  retryButton: { minHeight: 43, alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
  emptyCard: { borderRadius: 18, padding: 20 },
  emptyText: { ...typography, fontSize: 12, lineHeight: 20 },
});
