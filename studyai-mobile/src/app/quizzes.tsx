import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useIsFocused, useRouter } from "expo-router";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, ChevronUp, ClipboardCheck, FileText, History, LibraryBig, RefreshCw, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPanel, MotionText, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import { getStudyQuizAttempts, getStudyQuizzes, type QuizAttempt, type QuizMode, type QuizSummary } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

function formatDate(value: string, withTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "America/Costa_Rica",
  }).format(date);
}

function formatScore(value: number): string {
  return `${value.toLocaleString("es-CR", { maximumFractionDigits: 2 })}%`;
}

export default function QuizzesScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);
  const buttonForeground = colors.onPrimary;

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    void getStudyQuizzes()
      .then((data) => {
        if (!active) return;
        setQuizzes(data);
        setAttempts({});
        setExpandedId(null);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "No se pudieron cargar los cuestionarios.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => { active = false; };
  }, [isFocused, reloadKey]);

  function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setReloadKey((value) => value + 1);
  }

  function openMode(id: string, mode: QuizMode) {
    router.push({ pathname: "/quiz/[id]", params: { id, mode } });
  }

  function openDocument(id: string) {
    router.push({ pathname: "/document/[id]", params: { id } });
  }

  async function loadHistory(id: string) {
    setHistoryLoadingId(id);
    setHistoryError("");

    try {
      const data = await getStudyQuizAttempts(id);
      setAttempts((previous) => ({ ...previous, [id]: data }));
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : "No se pudo cargar el historial.");
    } finally {
      setHistoryLoadingId((current) => current === id ? null : current);
    }
  }

  function toggleHistory(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    setHistoryError("");

    if (!attempts[id]) void loadHistory(id);
  }

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.question_count, 0);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al dashboard"
            onPress={() => goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.topTitle, { color: colors.text }]}>Mis cuestionarios</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar cuestionarios"
            disabled={refreshing}
            onPress={refresh}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            {refreshing
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <RefreshCw size={19} color={colors.accent} />
            }
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <View style={styles.heading}>
            <View style={[styles.headingIcon, { backgroundColor: colors.softAccent }]}>
              <LibraryBig size={24} color={colors.accent} strokeWidth={1.7} />
            </View>

            <View style={styles.headingCopy}>
              <MotionText text="Tu biblioteca de estudio" delay={140} style={[styles.title, { color: colors.text }]} />
              <Text style={[styles.subtitle, { color: colors.secondary }]}>
                Retoma cualquier cuestionario sin generar nuevas preguntas.
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.skeletons}>
              <SkeletonBlock height={92} radius={20} isDark={dark} />
              <SkeletonBlock height={205} radius={21} isDark={dark} />
              <SkeletonBlock height={205} radius={21} isDark={dark} />
            </View>
          ) : error ? (
            <View style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
              <Text style={[styles.messageTitle, { color: colors.text }]}>No se pudo cargar la biblioteca</Text>
              <Text style={[styles.messageText, { color: colors.secondary }]}>{error}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={refresh}
                style={[styles.secondaryButton, { backgroundColor: colors.softAccent }]}
              >
                <RefreshCw size={17} color={colors.accent} />
                <Text style={[styles.secondaryText, { color: colors.accent }]}>Reintentar</Text>
              </Pressable>
            </View>
          ) : quizzes.length === 0 ? (
            <MotionPanel
              delay={170}
              style={[styles.messageCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
              contentStyle={styles.emptyContent}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.softAccent }]}>
                <Sparkles size={25} color={colors.accent} />
              </View>

              <View style={styles.emptyCopy}>
                <Text style={[styles.messageTitle, { color: colors.text }]}>Todavía no tienes cuestionarios</Text>
                <Text style={[styles.messageText, { color: colors.secondary }]}>
                  Abre un PDF y selecciona «Estudiar documento» para crear el primero.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/documents")}
                style={[styles.secondaryButton, { backgroundColor: colors.softAccent }]}
              >
                <FileText size={17} color={colors.accent} />
                <Text style={[styles.secondaryText, { color: colors.accent }]}>Ver documentos</Text>
                <ChevronRight size={17} color={colors.accent} />
              </Pressable>
            </MotionPanel>
          ) : (
            <>
              <MotionPanel
                delay={170}
                style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                contentStyle={styles.statsRow}
              >
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{quizzes.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Cuestionarios</Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />

                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>{totalQuestions}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Preguntas</Text>
                </View>
              </MotionPanel>

              <View style={styles.sectionHeading}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Todos los cuestionarios</Text>
                <Text style={[styles.sectionCount, { color: colors.secondary }]}>{quizzes.length} en total</Text>
              </View>

              {quizzes.map((quiz, index) => {
                const expanded = expandedId === quiz.id;
                const loadingHistory = historyLoadingId === quiz.id;
                const history = attempts[quiz.id];

                return (
                  <MotionPanel
                    key={quiz.id}
                    delay={250 + Math.min(index, 5) * 90}
                    style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                    contentStyle={styles.quizContent}
                  >
                    <View style={styles.quizHeader}>
                      <View style={[styles.quizIcon, { backgroundColor: colors.softAccent }]}>
                        <BookOpen size={22} color={colors.accent} strokeWidth={1.7} />
                      </View>

                      <View style={styles.quizCopy}>
                        <Text style={[styles.quizTitle, { color: colors.text }]}>{quiz.title}</Text>
                        <Text style={[styles.quizMeta, { color: colors.secondary }]}>
                          {quiz.question_count} preguntas · {formatDate(quiz.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.separator }]} />

                    <View style={styles.modeRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Practicar ${quiz.title}`}
                        onPress={() => openMode(quiz.id, "practice")}
                        style={({ pressed }) => [
                          styles.modeButton,
                          { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                        ]}
                      >
                        <BookOpen size={17} color={buttonForeground} />
                        <Text style={[styles.modeButtonText, { color: buttonForeground }]}>Práctica</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Realizar examen de ${quiz.title}`}
                        onPress={() => openMode(quiz.id, "exam")}
                        style={({ pressed }) => [
                          styles.modeButton,
                          { backgroundColor: colors.softAccent, opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        <ClipboardCheck size={17} color={colors.accent} />
                        <Text style={[styles.modeButtonText, { color: colors.accent }]}>Examen</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={expanded ? "Ocultar historial" : "Ver historial"}
                      onPress={() => toggleHistory(quiz.id)}
                      style={styles.historyToggle}
                    >
                      <View style={styles.historyLabel}>
                        <History size={16} color={colors.secondary} />
                        <Text style={[styles.historyToggleText, { color: colors.secondary }]}>
                          {expanded ? "Ocultar historial" : "Ver historial de intentos"}
                        </Text>
                      </View>

                      {expanded
                        ? <ChevronUp size={17} color={colors.secondary} />
                        : <ChevronDown size={17} color={colors.secondary} />
                      }
                    </Pressable>

                    {expanded && (
                      <View style={[styles.historySection, { borderTopColor: colors.separator }]}>
                        {loadingHistory ? (
                          <ActivityIndicator color={colors.accent} style={styles.historyLoader} />
                        ) : historyError ? (
                          <>
                            <Text style={[styles.messageText, { color: colors.text }]}>{historyError}</Text>
                            <Pressable accessibilityRole="button" onPress={() => void loadHistory(quiz.id)}>
                              <Text style={[styles.retryText, { color: colors.accent }]}>Reintentar historial</Text>
                            </Pressable>
                          </>
                        ) : history?.length ? (
                          history.map((attempt, attemptIndex) => (
                            <Pressable
                              key={attempt.attempt_id}
                              accessibilityRole="button"
                              accessibilityLabel={`Ver revisión del intento ${history.length - attemptIndex}`}
                              onPress={() => router.push({
                                pathname: "/quiz/attempt-review",
                                params: {
                                  quizId: quiz.id,
                                  attemptId: attempt.attempt_id,
                                },
                              })}
                              style={({ pressed }) => [
                                styles.attemptRow,
                                {
                                  borderBottomColor: colors.separator,
                                  opacity: pressed ? 0.65 : 1,
                                },
                              ]}
                            >
                              <View style={[styles.attemptIcon, { backgroundColor: colors.softAccent }]}>
                                <ClipboardCheck size={17} color={colors.accent} />
                              </View>

                              <View style={styles.attemptCopy}>
                                <Text style={[styles.attemptTitle, { color: colors.text }]}>
                                  Intento {history.length - attemptIndex}
                                </Text>

                                <Text style={[styles.attemptMeta, { color: colors.secondary }]}>
                                  {formatDate(attempt.submitted_at, true)}
                                </Text>

                                <Text style={[styles.attemptMeta, { color: colors.secondary }]}>
                                  {attempt.correct_count} de {attempt.question_count} correctas
                                </Text>
                              </View>

                              <Text style={[styles.attemptScore, { color: colors.accent }]}>
                                {formatScore(attempt.score_percent)}
                              </Text>

                              <ChevronRight size={17} color={colors.tertiary} />
                            </Pressable>
                          ))
                        ) : (
                          <Text style={[styles.noHistory, { color: colors.secondary }]}>
                            Todavía no has entregado ningún intento de este cuestionario.
                          </Text>
                        )}

                        <Pressable
                          accessibilityRole="button"
                          onPress={() => openDocument(quiz.document_id)}
                          style={[styles.documentLink, { backgroundColor: colors.softAccent }]}
                        >
                          <FileText size={16} color={colors.accent} />
                          <Text style={[styles.documentLinkText, { color: colors.accent }]}>
                            Ver documento de origen
                          </Text>
                          <ChevronRight size={16} color={colors.accent} />
                        </Pressable>
                      </View>
                    )}
                  </MotionPanel>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topbar: { height: 65, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 45, gap: 18 },
  heading: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 6 },
  headingIcon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headingCopy: { flex: 1, gap: 6 },
  title: { ...typography, fontSize: 20, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { ...typography, fontSize: 12, lineHeight: 18 },
  skeletons: { gap: 13 },
  messageCard: { borderWidth: 1, borderRadius: 20, padding: 19, gap: 14 },
  emptyContent: { gap: 15 },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  emptyCopy: { gap: 7 },
  messageTitle: { ...typography, fontSize: 16, fontWeight: "800" },
  messageText: { ...typography, fontSize: 12, lineHeight: 20 },
  secondaryButton: { minHeight: 47, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  secondaryText: { ...typography, fontSize: 13, fontWeight: "800" },
  statsCard: { borderWidth: 1, borderRadius: 19, paddingVertical: 17 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 6 },
  statValue: { ...typography, fontSize: 23, fontWeight: "800" },
  statLabel: { ...typography, fontSize: 11 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 34 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 5 },
  sectionTitle: { ...typography, fontSize: 16, fontWeight: "800" },
  sectionCount: { ...typography, fontSize: 11 },
  quizCard: { borderWidth: 1, borderRadius: 20, padding: 17 },
  quizContent: { gap: 15 },
  quizHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  quizIcon: { width: 49, height: 49, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  quizCopy: { flex: 1, minWidth: 0, gap: 6 },
  quizTitle: { ...typography, fontSize: 14, lineHeight: 20, fontWeight: "800" },
  quizMeta: { ...typography, fontSize: 11 },
  divider: { height: StyleSheet.hairlineWidth },
  modeRow: { flexDirection: "row", gap: 10 },
  modeButton: { flex: 1, minHeight: 45, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  modeButtonText: { ...typography, fontSize: 12, fontWeight: "800" },
  historyToggle: { minHeight: 31, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  historyLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyToggleText: { ...typography, fontSize: 12, fontWeight: "700" },
  historySection: { paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 13 },
  historyLoader: { marginVertical: 13 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
  attemptRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  attemptIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  attemptCopy: { flex: 1, gap: 4 },
  attemptTitle: { ...typography, fontSize: 12, fontWeight: "800" },
  attemptMeta: { ...typography, fontSize: 10 },
  attemptScore: { ...typography, fontSize: 16, fontWeight: "800" },
  noHistory: { ...typography, fontSize: 12, lineHeight: 19 },
  documentLink: { minHeight: 43, paddingHorizontal: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  documentLinkText: { ...typography, fontSize: 12, fontWeight: "700" },
});
