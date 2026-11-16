import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, ClipboardCheck, FileText, History, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, useColorScheme } from "react-native";

import { getStudyQuizAttempts, getStudyQuizzes, type QuizAttempt, type QuizMode, type QuizSummary } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

type Props = { documentId: string };

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CR", {
        dateStyle: "medium",
        timeZone: "America/Costa_Rica",
      }).format(date);
}

export function DocumentQuizzes({ documentId }: Props) {
  const isFocused = useIsFocused();
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);
  const foreground = colors.onPrimary;

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setExpandedId(null);
      setAttempts({});
      setHistoryError("");
    }, [])
  );

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    void getStudyQuizzes()
      .then((data) => {
        if (!active) return;

        setQuizzes(data.filter((quiz) => quiz.document_id === documentId));
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudieron cargar los cuestionarios."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentId, isFocused, revision]);

  function openQuiz(id: string, mode: QuizMode) {
    router.push({
      pathname: "/quiz/[id]",
      params: { id, mode },
    });
  }

  function openAttemptReview(quizId: string, attemptId: string) {
    router.push({
      pathname: "/quiz/attempt-review",
      params: { quizId, attemptId },
    });
  }

  async function toggleHistory(id: string, force = false) {
    if (expandedId === id && !force) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    setHistoryError("");

    if (attempts[id] && !force) return;

    setHistoryLoading(id);

    try {
      const data = await getStudyQuizAttempts(id);

      setAttempts((previous) => ({
        ...previous,
        [id]: data,
      }));

      setHistoryError("");
    } catch (caught) {
      setHistoryError(
        caught instanceof Error
          ? caught.message
          : "No se pudo consultar el historial."
      );
    } finally {
      setHistoryLoading((current) => current === id ? null : current);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>
            Cuestionarios
          </Text>

          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            {loading
              ? "Consultando biblioteca..."
              : `${quizzes.length} guardado${quizzes.length === 1 ? "" : "s"} para este documento`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.loading, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
            Cargando cuestionarios
          </Text>
        </View>
      ) : error ? (
        <View style={[
          styles.emptyCard,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}>
          <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              setExpandedId(null);
              setAttempts({});
              setHistoryError("");
              setRevision((value) => value + 1);
            }}
            style={styles.retry}
          >
            <RefreshCw size={15} color={colors.accent} />
            <Text style={[styles.retryText, { color: colors.accent }]}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : quizzes.length === 0 ? (
        <View style={[
          styles.emptyCard,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}>
          <View style={styles.emptyHeader}>
            <View style={[
              styles.emptyIcon,
              { backgroundColor: colors.softAccent },
            ]}>
              <BookOpen size={22} color={colors.accent} strokeWidth={1.7} />
            </View>

            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Aún no hay cuestionarios
              </Text>

              <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
                Utiliza «Estudiar documento» para crear tu primer cuestionario.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {quizzes.map((quiz) => (
            <View
              key={quiz.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline,
                },
              ]}
            >
              <View style={styles.quizHeader}>
                <View style={[
                  styles.quizIcon,
                  { backgroundColor: colors.softAccent },
                ]}>
                  <ClipboardCheck
                    size={21}
                    color={colors.accent}
                    strokeWidth={1.7}
                  />
                </View>

                <View style={styles.quizInfo}>
                  <Text
                    style={[styles.quizTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {quiz.title}
                  </Text>

                  <Text style={[styles.quizMeta, { color: colors.secondary }]}>
                    {quiz.question_count} preguntas · {formatDate(quiz.created_at)}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Iniciar práctica de ${quiz.title}`}
                  disabled={quiz.question_count === 0}
                  onPress={() => openQuiz(quiz.id, "practice")}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed || quiz.question_count === 0 ? 0.55 : 1,
                    },
                  ]}
                >
                  <BookOpen size={16} color={foreground} />
                  <Text style={[styles.actionText, { color: foreground }]}>
                    Práctica
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Iniciar examen de ${quiz.title}`}
                  disabled={quiz.question_count === 0}
                  onPress={() => openQuiz(quiz.id, "exam")}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: colors.softAccent,
                      opacity: pressed || quiz.question_count === 0 ? 0.55 : 1,
                    },
                  ]}
                >
                  <ClipboardCheck size={16} color={colors.accent} />
                  <Text style={[styles.actionText, { color: colors.accent }]}>
                    Examen
                  </Text>
                </Pressable>
              </View>

              <View style={[
                styles.separator,
                { backgroundColor: colors.separator },
              ]} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  expandedId === quiz.id ? "Ocultar historial" : "Ver historial"
                }
                onPress={() => void toggleHistory(quiz.id)}
                style={styles.historyButton}
              >
                <View style={styles.historyLabel}>
                  <History size={16} color={colors.secondary} />

                  <Text style={[styles.historyText, { color: colors.secondary }]}>
                    Historial de intentos
                  </Text>
                </View>

                {expandedId === quiz.id
                  ? <ChevronUp size={17} color={colors.secondary} />
                  : <ChevronDown size={17} color={colors.secondary} />
                }
              </Pressable>

              {expandedId === quiz.id && (
                <View style={styles.attempts}>
                  {historyLoading === quiz.id ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : historyError ? (
                    <>
                      <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
                        {historyError}
                      </Text>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void toggleHistory(quiz.id, true)}
                        style={styles.retry}
                      >
                        <RefreshCw size={15} color={colors.accent} />
                        <Text style={[styles.retryText, { color: colors.accent }]}>
                          Reintentar
                        </Text>
                      </Pressable>
                    </>
                  ) : attempts[quiz.id]?.length ? (
                    attempts[quiz.id].map((attempt, index) => (
                      <Pressable
                        key={attempt.attempt_id}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver revisión del intento ${attempts[quiz.id].length - index}`}
                        onPress={() => openAttemptReview(quiz.id, attempt.attempt_id)}
                        style={({ pressed }) => [
                          styles.attemptRow,
                          { opacity: pressed ? 0.65 : 1 },
                        ]}
                      >
                        <View style={styles.attemptInfo}>
                          <Text style={[styles.attemptTitle, { color: colors.text }]}>
                            Intento {attempts[quiz.id].length - index}
                          </Text>

                          <Text style={[styles.attemptDate, { color: colors.secondary }]}>
                            {formatDate(attempt.submitted_at)}
                          </Text>

                          <Text style={[styles.attemptDate, { color: colors.secondary }]}>
                            {attempt.correct_count} de {attempt.question_count} correctas
                          </Text>
                        </View>

                        <View style={styles.attemptTrailing}>
                          <Text style={[styles.score, { color: colors.accent }]}>
                            {attempt.score_percent.toLocaleString("es-CR", {
                              maximumFractionDigits: 2,
                            })}%
                          </Text>

                          <ChevronRight size={17} color={colors.tertiary} />
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
                      Todavía no hay intentos registrados.
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver biblioteca completa de cuestionarios"
        onPress={() => router.push("/quizzes")}
        style={styles.libraryButton}
      >
        <FileText size={16} color={colors.accent} />

        <Text style={[styles.libraryText, { color: colors.accent }]}>
          Ver todos mis cuestionarios
        </Text>

        <ChevronRight size={17} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 13, marginTop: 5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heading: { flex: 1, gap: 5 },
  title: { ...typography, fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { ...typography, fontSize: 11, lineHeight: 16 },
  loading: { minHeight: 105, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 10 },
  list: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 19, padding: 15, gap: 13 },
  quizHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  quizIcon: { width: 47, height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quizInfo: { flex: 1, minWidth: 0, gap: 6 },
  quizTitle: { ...typography, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  quizMeta: { ...typography, fontSize: 11 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, minHeight: 43, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionText: { ...typography, fontSize: 12, fontWeight: "800" },
  separator: { height: StyleSheet.hairlineWidth },
  historyButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 27 },
  historyLabel: { flexDirection: "row", alignItems: "center", gap: 9 },
  historyText: { ...typography, fontSize: 12, fontWeight: "700" },
  attempts: { gap: 13, paddingTop: 4 },
  attemptRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12 },
  attemptInfo: { flex: 1, gap: 5 },
  attemptTrailing: { flexDirection: "row", alignItems: "center", gap: 7 },
  attemptTitle: { ...typography, fontSize: 12, fontWeight: "800" },
  attemptDate: { ...typography, fontSize: 11 },
  score: { ...typography, fontSize: 16, fontWeight: "800" },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 17, gap: 15 },
  emptyHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  emptyIcon: { width: 49, height: 49, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  emptyCopy: { flex: 1, gap: 6 },
  emptyTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  emptyDescription: { ...typography, fontSize: 12, lineHeight: 19 },
  retry: { flexDirection: "row", alignItems: "center", gap: 7 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
  libraryButton: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  libraryText: { ...typography, fontSize: 12, fontWeight: "800" },
});
