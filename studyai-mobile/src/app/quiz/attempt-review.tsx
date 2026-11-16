import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useLocalSearchParams } from "expo-router";
import { ArrowLeft, BookOpenCheck, Check, CheckCircle2, CircleAlert, RefreshCw, Sparkles, X, XCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionView, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import { getStudyAttemptReview, type ReviewedQuizAnswer, type StudyAttemptReview } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

type Palette = ReturnType<typeof getDashboardPalette>;
const LETTERS = ["A", "B", "C", "D"];

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Costa_Rica",
      }).format(date);
}

function formatScore(value: number): string {
  return `${value.toLocaleString("es-CR", { maximumFractionDigits: 2 })}%`;
}

function AnswerCard({ answer, colors, dark, index }: {
  answer: ReviewedQuizAnswer;
  colors: Palette;
  dark: boolean;
  index: number;
}) {
  const success = colors.success;
  const danger = colors.danger;

  return (
    <MotionView delay={Math.min(index, 5) * 75 + 140}>
      <View style={[styles.questionCard, {
        backgroundColor: colors.surface,
        borderColor: colors.outline,
      }]}>
        <View style={styles.questionHeader}>
          <View style={[styles.questionTag, { backgroundColor: colors.softAccent }]}>
            <Text style={[styles.questionTagText, { color: colors.accent }]}>
              PREGUNTA {String(answer.position).padStart(2, "0")}
            </Text>
          </View>

          <View style={styles.status}>
            {answer.is_correct
              ? <CheckCircle2 size={16} color={success} />
              : <XCircle size={16} color={danger} />
            }

            <Text style={[styles.statusText, { color: answer.is_correct ? success : danger }]}>
              {answer.is_correct ? "Correcta" : "Incorrecta"}
            </Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: colors.text }]}>
          {answer.question_text}
        </Text>

        <View style={styles.options}>
          {answer.options.map((option, optionIndex) => {
            const correct = optionIndex === answer.correct_option;
            const selected = optionIndex === answer.selected_option;
            const incorrectSelection = selected && !correct;

            const border = correct ? success : incorrectSelection ? danger : colors.outline;
            const background = correct
              ? (dark ? "#193A32" : "#EAF7F1")
              : incorrectSelection
                ? (dark ? "#402930" : "#FCEEF0")
                : colors.background;

            return (
              <View
                key={`${answer.question_id}-${optionIndex}`}
                style={[styles.option, { borderColor: border, backgroundColor: background }]}
              >
                <View style={[styles.letter, {
                  backgroundColor: correct ? colors.successFill : incorrectSelection ? colors.dangerFill : colors.surface,
                }]}>
                  <Text style={[styles.letterText, {
                    color: correct || incorrectSelection ? "#FFFFFF" : colors.secondary,
                  }]}>
                    {LETTERS[optionIndex]}
                  </Text>
                </View>

                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>

                  {(selected || correct) && (
                    <View style={styles.optionLabels}>
                      {selected && (
                        <View style={styles.optionLabel}>
                          {incorrectSelection
                            ? <X size={12} color={danger} />
                            : <Check size={12} color={success} />
                          }
                          <Text style={[styles.optionLabelText, {
                            color: incorrectSelection ? danger : success,
                          }]}>
                            Tu respuesta
                          </Text>
                        </View>
                      )}

                      {correct && (
                        <View style={styles.optionLabel}>
                          <CheckCircle2 size={12} color={success} />
                          <Text style={[styles.optionLabelText, { color: success }]}>
                            Respuesta correcta
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.explanation, { backgroundColor: colors.softAccent }]}>
          <View style={styles.explanationHeading}>
            <Sparkles size={16} color={colors.accent} />
            <Text style={[styles.explanationTitle, { color: colors.accent }]}>
              Explicación
            </Text>
          </View>

          <Text style={[styles.explanationText, { color: colors.text }]}>
            {answer.explanation}
          </Text>
        </View>
      </View>
    </MotionView>
  );
}

export default function AttemptReviewScreen() {
  const { quizId, attemptId } = useLocalSearchParams<{
    quizId: string;
    attemptId: string;
  }>();
  const [revision, setRevision] = useState(0);

  return (
    <AttemptReviewContent
      key={JSON.stringify([quizId, attemptId, revision])}
      quizId={quizId}
      attemptId={attemptId}
      onReload={() => setRevision((value) => value + 1)}
    />
  );
}

function AttemptReviewContent({ quizId, attemptId, onReload }: {
  quizId: string;
  attemptId: string;
  onReload: () => void;
}) {

  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);

  const [attempt, setAttempt] = useState<StudyAttemptReview | null>(null);
  const [loading, setLoading] = useState(Boolean(quizId && attemptId));
  const [error, setError] = useState(quizId && attemptId ? "" : "No se recibieron los identificadores de la revisión.");

  useEffect(() => {
    if (!quizId || !attemptId) return;

    let active = true;

    void getStudyAttemptReview(quizId, attemptId)
      .then((data) => {
        if (active) setAttempt(data);
      })
      .catch((caught: unknown) => {
        if (!active) return;

        setError(caught instanceof Error
          ? caught.message
          : "No se pudo cargar la revisión."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [quizId, attemptId]);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al historial"
            onPress={() => goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          <Text style={[styles.topbarTitle, { color: colors.text }]}>Revisión del intento</Text>

          <View style={[styles.topIcon, { backgroundColor: colors.softAccent }]}>
            <BookOpenCheck size={19} color={colors.accent} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.loading}>
              <SkeletonBlock height={130} radius={21} isDark={dark} />
              <SkeletonBlock height={95} radius={19} isDark={dark} />
              <SkeletonBlock height={330} radius={21} isDark={dark} />
            </View>
          ) : error || !attempt ? (
            <View style={[styles.errorCard, {
              backgroundColor: colors.surface,
              borderColor: colors.outline,
            }]}>
              <CircleAlert size={27} color={colors.accent} />
              <Text style={[styles.errorTitle, { color: colors.text }]}>
                No se pudo cargar la revisión
              </Text>

              <Text style={[styles.errorText, { color: colors.secondary }]}>
                {error || "El intento no está disponible."}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={onReload}
                style={[styles.retryButton, { backgroundColor: colors.softAccent }]}
              >
                <RefreshCw size={16} color={colors.accent} />
                <Text style={[styles.retryText, { color: colors.accent }]}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <MotionView delay={100}>
                <View style={[styles.hero, {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline,
                }]}>
                  <View style={styles.heroHeading}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.softAccent }]}>
                      <BookOpenCheck size={25} color={colors.accent} />
                    </View>

                    <View style={styles.heroCopy}>
                      <Text style={[styles.eyebrow, { color: colors.accent }]}>
                        EVALUACIÓN COMPLETADA
                      </Text>
                      <Text style={[styles.heroTitle, { color: colors.text }]}>
                        Tus resultados
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.dateText, { color: colors.secondary }]}>
                    Entregado el {formatDate(attempt.submitted_at)}
                  </Text>
                </View>
              </MotionView>

              <View style={styles.stats}>
                <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Calificación</Text>
                  <Text style={[styles.statValue, { color: colors.accent }]}>
                    {formatScore(attempt.score_percent)}
                  </Text>
                </View>

                <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Respuestas correctas</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {attempt.correct_count}/{attempt.question_count}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionHeading}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Revisión de respuestas
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                  Consulta las respuestas y explicaciones de este intento.
                </Text>
              </View>

              {attempt.answers.map((answer, index) => (
                <AnswerCard
                  key={answer.question_id}
                  answer={answer}
                  colors={colors}
                  dark={dark}
                  index={index}
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topbar: { height: 65, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topbarTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  topIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 13, paddingBottom: 45, gap: 16 },
  loading: { gap: 13 },
  hero: { borderRadius: 21, borderWidth: 1, padding: 18, gap: 15 },
  heroHeading: { flexDirection: "row", alignItems: "center", gap: 13 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, gap: 6 },
  eyebrow: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: { ...typography, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  dateText: { ...typography, fontSize: 11, lineHeight: 17 },
  stats: { flexDirection: "row", gap: 11 },
  stat: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 15, gap: 9 },
  statLabel: { ...typography, fontSize: 11 },
  statValue: { ...typography, fontSize: 23, fontWeight: "800", letterSpacing: -0.6 },
  sectionHeading: { gap: 6, paddingTop: 5 },
  sectionTitle: { ...typography, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { ...typography, fontSize: 12, lineHeight: 19 },
  questionCard: { borderRadius: 21, borderWidth: 1, padding: 16, gap: 17 },
  questionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  questionTag: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  questionTagText: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.45 },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { ...typography, fontSize: 11, fontWeight: "800" },
  questionText: { ...typography, fontSize: 15, lineHeight: 23, fontWeight: "700" },
  options: { gap: 9 },
  option: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 11 },
  letter: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  letterText: { ...typography, fontSize: 12, fontWeight: "800" },
  optionContent: { flex: 1, gap: 8 },
  optionText: { ...typography, fontSize: 13, lineHeight: 20 },
  optionLabels: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  optionLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  optionLabelText: { ...typography, fontSize: 10, fontWeight: "800" },
  explanation: { padding: 14, borderRadius: 13, gap: 9 },
  explanationHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  explanationTitle: { ...typography, fontSize: 12, fontWeight: "800" },
  explanationText: { ...typography, fontSize: 12, lineHeight: 20 },
  errorCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  errorTitle: { ...typography, fontSize: 17, fontWeight: "800" },
  errorText: { ...typography, fontSize: 12, lineHeight: 20 },
  retryButton: { minHeight: 45, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
});
