import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BookOpenCheck, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, RotateCcw, Sparkles, XCircle } from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPanel, MotionText, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import { checkStudyPracticeAnswer, getStudyQuiz, submitStudyQuiz, type PracticeCheckResult, type QuizDetail, type QuizMode, type QuizQuestion, type QuizResult } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

type Palette = ReturnType<typeof getDashboardPalette>;

const LETTERS = ["A", "B", "C", "D"];

function QuestionCard({ question, number, selected, disabled, review, colors, optionForeground, onSelect }: {
  question: QuizQuestion;
  number: number;
  selected?: number;
  disabled: boolean;
  review?: PracticeCheckResult;
  colors: Palette;
  optionForeground: string;
  onSelect: (option: number) => void;
}) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(14));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 75, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.questionCard, {
      backgroundColor: colors.surface,
      borderColor: colors.outline,
      opacity,
      transform: [{ translateY }],
    }]}>
      <View style={styles.questionHeader}>
        <View style={[styles.questionPill, { backgroundColor: colors.softAccent }]}>
          <Text style={[styles.questionPillText, { color: colors.accent }]}>
            PREGUNTA {String(number).padStart(2, "0")}
          </Text>
        </View>

        <BookOpenCheck size={19} color={colors.accent} strokeWidth={1.65} />
      </View>

      <Text style={[styles.questionText, { color: colors.text }]}>
        {question.question_text}
      </Text>

      {question.question_translation_es ? (
        <Text style={[styles.questionTranslation, { color: colors.secondary }]}>
          ({question.question_translation_es})
        </Text>
      ) : null}

      <Text style={[styles.optionHint, { color: colors.secondary }]}>
        {review ? "Respuesta comprobada" : "Selecciona una respuesta"}
      </Text>

      <View style={styles.options}>
        {question.options.map((option, index) => {
          const active = selected === index;
          const isCorrect = review?.correct_option === index;
          const isIncorrect = !!review && active && !review.is_correct;
          const borderColor = isCorrect ? colors.success : isIncorrect ? colors.danger : active ? colors.accent : colors.controlOutline;

          return (
            <Pressable
              key={`${question.id}-${index}`}
              accessibilityRole="radio"
              accessibilityLabel={`Opción ${LETTERS[index]}. ${option}`}
              accessibilityState={{ checked: active, disabled }}
              disabled={disabled}
              onPress={() => onSelect(index)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isCorrect || isIncorrect || active ? colors.softAccent : colors.background,
                  borderColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.optionLetter, {
                backgroundColor: isIncorrect || isCorrect ? colors.surface : active ? colors.accent : colors.surface,
                borderColor: isCorrect ? colors.success : isIncorrect ? colors.danger : active ? colors.accent : colors.controlOutline,
              }]}>
                {isCorrect ? (
                  <Check size={16} color={colors.success} strokeWidth={2.5} />
                ) : isIncorrect ? (
                  <XCircle size={16} color={colors.danger} />
                ) : active ? (
                  <Check size={16} color={optionForeground} strokeWidth={2.5} />
                ) : (
                  <Text style={[styles.optionLetterText, { color: colors.secondary }]}>
                    {LETTERS[index]}
                  </Text>
                )}
              </View>

              <Text style={[styles.optionText, { color: colors.text }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

function PracticeFeedback({ question, review, colors }: {
  question: QuizQuestion;
  review: PracticeCheckResult;
  colors: Palette;
}) {
  const feedbackColor = review.is_correct ? colors.success : colors.danger;

  return (
    <View style={[styles.practiceFeedback, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <View style={styles.reviewStatus}>
        {review.is_correct ? (
          <CheckCircle2 size={18} color={feedbackColor} />
        ) : (
          <XCircle size={18} color={feedbackColor} />
        )}

        <Text style={[styles.practiceFeedbackTitle, { color: feedbackColor }]}>
          {review.is_correct ? "¡Respuesta correcta!" : "Respuesta incorrecta"}
        </Text>
      </View>

      <Text style={[styles.reviewLabel, { color: colors.secondary }]}>
        Respuesta correcta
      </Text>

      <Text style={[styles.reviewAnswer, { color: colors.text }]}>
        {question.options[review.correct_option]}
      </Text>

      {review.explanation ? (
        <View style={[styles.explanation, { backgroundColor: colors.softAccent }]}>
          <Text style={[styles.explanationTitle, { color: colors.accent }]}>
            Explicación
          </Text>

          <Text style={[styles.explanationText, { color: colors.text }]}>
            {review.explanation}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.practiceHint, { color: colors.secondary }]}>
        Esta práctica no se guarda en el historial.
      </Text>
    </View>
  );
}

function PracticeSummary({ checked, colors, actionForeground, onRetry, onDocument }: {
  checked: number;
  colors: Palette;
  actionForeground: string;
  onRetry: () => void;
  onDocument: () => void;
}) {
  return (
    <View style={styles.results}>
      <MotionPanel
        delay={80}
        style={[styles.resultHero, { backgroundColor: colors.surface, borderColor: colors.outline }]}
        contentStyle={styles.resultHeroContent}
      >
        <View style={[styles.resultIcon, { backgroundColor: colors.softAccent }]}>
          <CheckCircle2 size={28} color={colors.accent} strokeWidth={1.8} />
        </View>

        <View style={styles.resultHeading}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>PRÁCTICA COMPLETADA</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>¡Buen trabajo!</Text>
          <Text style={[styles.resultDescription, { color: colors.secondary }]}>
            Revisaste {checked} {checked === 1 ? "pregunta" : "preguntas"} y sus explicaciones.
          </Text>
        </View>
      </MotionPanel>

      <Text style={[styles.notice, { color: colors.secondary, backgroundColor: colors.surface }]}>
        La práctica no genera una calificación ni registra intentos. Solo los exámenes cuentan para tu progreso.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <RotateCcw size={18} color={actionForeground} />
        <Text style={[styles.primaryText, { color: actionForeground }]}>Practicar nuevamente</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onDocument}
        style={[styles.outlineButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}
      >
        <Text style={[styles.outlineText, { color: colors.text }]}>Volver al documento</Text>
      </Pressable>
    </View>
  );
}

function QuizResults({ quiz, answers, result, colors, actionForeground, onRetry, onDocument }: {
  quiz: QuizDetail;
  answers: Record<string, number>;
  result: QuizResult;
  colors: Palette;
  actionForeground: string;
  onRetry: () => void;
  onDocument: () => void;
}) {
  const score = result.scorePercent === null
    ? "—"
    : `${result.scorePercent.toLocaleString("es-CR", { maximumFractionDigits: 2 })}%`;

  const reviews = new Map(result.reviews.map((item) => [item.question_id, item]));

  return (
    <View style={styles.results}>
      <MotionPanel
        delay={80}
        style={[styles.resultHero, { backgroundColor: colors.surface, borderColor: colors.outline }]}
        contentStyle={styles.resultHeroContent}
      >
        <View style={[styles.resultIcon, { backgroundColor: colors.softAccent }]}>
          <CheckCircle2 size={28} color={colors.accent} strokeWidth={1.8} />
        </View>

        <View style={styles.resultHeading}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>INTENTO REGISTRADO</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Resultados</Text>
          <Text style={[styles.resultDescription, { color: colors.secondary }]}>
            Tu evaluación fue guardada en StudyAI.
          </Text>
        </View>
      </MotionPanel>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.scoreLabel, { color: colors.secondary }]}>Calificación</Text>
          <Text style={[styles.scoreValue, { color: colors.accent }]}>{score}</Text>
        </View>

        <View style={[styles.scoreBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.scoreLabel, { color: colors.secondary }]}>Respuestas correctas</Text>
          <Text style={[styles.scoreValue, { color: colors.text }]}>
            {result.correctCount === null ? "—" : `${result.correctCount}/${quiz.questions.length}`}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Revisión de preguntas
      </Text>

      {result.reviews.length === 0 && (
        <Text style={[styles.notice, { color: colors.secondary, backgroundColor: colors.surface }]}>
          El intento se guardó, pero la respuesta no incluyó la revisión detallada.
        </Text>
      )}

      {quiz.questions.map((question, index) => {
        const review = reviews.get(question.id);
        const selected = answers[question.id];
        const correct = review?.correct_option;
        const marked = review?.is_correct;

        return (
          <View
            key={question.id}
            style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
          >
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewNumber, { color: colors.accent }]}>
                PREGUNTA {index + 1}
              </Text>

              {marked !== null && marked !== undefined && (
                <View style={styles.reviewStatus}>
                  {marked ? (
                    <CheckCircle2 size={15} color={colors.success} />
                  ) : (
                    <XCircle size={15} color={colors.danger} />
                  )}

                  <Text style={[styles.reviewStatusText, { color: marked ? colors.success : colors.danger }]}>
                    {marked ? "Correcta" : "Incorrecta"}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.reviewQuestion, { color: colors.text }]}>
              {question.question_text}
            </Text>

            {question.question_translation_es ? (
              <Text style={[styles.questionTranslation, { color: colors.secondary }]}>
                ({question.question_translation_es})
              </Text>
            ) : null}

            <Text style={[styles.reviewLabel, { color: colors.secondary }]}>Tu respuesta</Text>
            <Text style={[styles.reviewAnswer, { color: colors.text }]}>
              {question.options[selected] ?? "No disponible"}
            </Text>

            {correct !== null && correct !== undefined && question.options[correct] !== undefined && (
              <>
                <Text style={[styles.reviewLabel, { color: colors.secondary }]}>
                  Respuesta correcta
                </Text>

                <Text style={[styles.reviewAnswer, { color: colors.text }]}>
                  {question.options[correct]}
                </Text>
              </>
            )}

            {review?.explanation ? (
              <View style={[styles.explanation, { backgroundColor: colors.softAccent }]}>
                <View style={styles.explanationHeading}>
                  <Sparkles size={15} color={colors.accent} />
                  <Text style={[styles.explanationTitle, { color: colors.accent }]}>Explicación de StudyAI</Text>
                </View>

                <Text style={[styles.explanationText, { color: colors.text }]}>
                  {review.explanation}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <RotateCcw size={18} color={actionForeground} />
        <Text style={[styles.primaryText, { color: actionForeground }]}>Intentar nuevamente</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onDocument}
        style={[styles.outlineButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}
      >
        <Text style={[styles.outlineText, { color: colors.text }]}>Volver al documento</Text>
      </Pressable>
    </View>
  );
}

export default function AnswerQuizScreen() {
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const quizId = typeof params.id === "string" ? params.id : "";
  const mode: QuizMode = params.mode === "exam" ? "exam" : "practice";
  const [revision, setRevision] = useState(0);

  return (
    <AnswerQuizContent
      key={`${quizId}-${mode}-${revision}`}
      quizId={quizId}
      mode={mode}
      onReload={() => setRevision((value) => value + 1)}
    />
  );
}

function AnswerQuizContent({ quizId, mode, onReload }: {
  quizId: string;
  mode: QuizMode;
  onReload: () => void;
}) {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const colors = getDashboardPalette(isDark);
  const actionForeground = colors.onPrimary;

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const submitLock = useRef(false);

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [practiceChecks, setPracticeChecks] = useState<Record<string, PracticeCheckResult>>({});
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [loading, setLoading] = useState(Boolean(quizId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(quizId ? "" : "No se recibió el identificador del cuestionario.");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!quizId) return;

    let active = true;

    void getStudyQuiz(quizId)
      .then((data) => {
        if (active) setQuiz(data);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "No se pudo cargar el cuestionario.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [quizId]);

  const questions = quiz?.questions ?? [];
  const question = questions[currentIndex];
  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const checkedCount = questions.filter((item) => practiceChecks[item.id] !== undefined).length;
  const allChecked = questions.length > 0 && checkedCount === questions.length;
  const completedCount = mode === "practice" ? checkedCount : answeredCount;
  const progress = questions.length ? Math.round((completedCount / questions.length) * 100) : 0;

  function moveTo(index: number) {
    if (submitting || index < 0 || index >= questions.length) return;

    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function leave() {
    if (submitting) return;

    if (result || practiceFinished || answeredCount === 0) {
      goBack();
      return;
    }

    const description = mode === "practice"
      ? "Tu progreso de práctica no se guarda. ¿Quieres salir?"
      : "Las respuestas que no hayas entregado se perderán.";

    Alert.alert("Salir del cuestionario", description, [
      { text: "Seguir estudiando", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => goBack() },
    ]);
  }

  async function checkPractice() {
    if (mode !== "practice" || !quiz || !question || practiceChecks[question.id] || submitLock.current) return;

    const selected = answers[question.id];
    if (selected === undefined) return;

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");

    try {
      const check = await checkStudyPracticeAnswer(quiz.id, {
        question_id: question.id,
        selected_option: selected,
      });

      setPracticeChecks((previous) => ({
        ...previous,
        [question.id]: check,
      }));
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "No se pudo comprobar la respuesta.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  async function submit() {
    if (mode !== "exam" || !quiz || !allAnswered || result || submitLock.current) return;

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = questions.map((item) => ({
        question_id: item.id,
        selected_option: answers[item.id],
      }));

      const data = await submitStudyQuiz(quiz.id, payload);
      setResult(data);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo entregar el cuestionario.";
      setSubmitError(`${message}\n\nSi se perdió la conexión, comprueba el historial antes de repetir la entrega para evitar un intento duplicado.`);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function confirmSubmit() {
    if (mode !== "exam" || !allAnswered || submitting || result) return;

    Alert.alert(
      "Entregar cuestionario",
      "Se enviarán tus respuestas a StudyAI para calificarlas. ¿Deseas continuar?",
      [
        { text: "Seguir revisando", style: "cancel" },
        { text: "Entregar", onPress: () => void submit() },
      ]
    );
  }

  function retry() {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setPracticeChecks({});
    setPracticeFinished(false);
    setSubmitError("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function openDocument() {
    if (!quiz) return;

    router.replace({
      pathname: "/document/[id]",
      params: { id: quiz.document_id },
    });
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            disabled={submitting}
            onPress={leave}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          <Text style={[styles.topTitle, { color: colors.text }]}>
            Cuestionario
          </Text>

          <View style={[styles.modePill, { backgroundColor: colors.softAccent }]}>
            <Text style={[styles.modeText, { color: colors.accent }]}>
              {mode === "exam" ? "EXAMEN" : "PRÁCTICA"}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {loading ? (
            <View style={styles.skeletons}>
              <SkeletonBlock height={90} radius={20} isDark={isDark} />
              <SkeletonBlock height={390} radius={22} isDark={isDark} />
              <SkeletonBlock height={75} radius={18} isDark={isDark} />
            </View>
          ) : error || !quiz || !question ? (
            <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
              <CircleAlert size={25} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                No se pudo abrir el cuestionario
              </Text>
              <Text style={[styles.notice, { color: colors.secondary }]}>
                {error || "No encontramos preguntas disponibles."}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={onReload}
                style={[styles.outlineButton, { borderColor: colors.outline }]}
              >
                <Text style={[styles.outlineText, { color: colors.accent }]}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : mode === "practice" && practiceFinished ? (
            <PracticeSummary
              checked={checkedCount}
              colors={colors}
              actionForeground={actionForeground}
              onRetry={retry}
              onDocument={openDocument}
            />
          ) : result ? (
            <QuizResults
              quiz={quiz}
              answers={answers}
              result={result}
              colors={colors}
              actionForeground={actionForeground}
              onRetry={retry}
              onDocument={openDocument}
            />
          ) : (
            <>
              <MotionPanel
                delay={90}
                style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                contentStyle={styles.introRow}
              >
                <View style={[styles.introIcon, { backgroundColor: colors.softAccent }]}>
                  <Sparkles size={21} color={colors.accent} />
                </View>

                <View style={styles.introCopy}>
                  <MotionText
                    text={quiz.title}
                    delay={220}
                    numberOfLines={3}
                    style={[styles.introTitle, { color: colors.text }]}
                  />

                  <Text style={[styles.introSub, { color: colors.secondary }]}>
                    {mode === "exam"
                      ? "Evaluación · sin respuestas anticipadas"
                      : "Comprueba cada respuesta · sin guardar intentos"}
                  </Text>
                </View>
              </MotionPanel>

              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>
                  {completedCount} de {questions.length} {mode === "exam" ? "respondidas" : "comprobadas"}
                </Text>
                <Text style={[styles.progressValue, { color: colors.accent }]}>{progress}%</Text>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.outline }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
              </View>

              <QuestionCard
                key={question.id}
                question={question}
                number={currentIndex + 1}
                selected={answers[question.id]}
                disabled={submitting || (mode === "practice" && !!practiceChecks[question.id])}
                review={mode === "practice" ? practiceChecks[question.id] : undefined}
                colors={colors}
                optionForeground={isDark ? "#201B37" : "#FFFFFF"}
                onSelect={(option) => {
                  setAnswers((previous) => ({ ...previous, [question.id]: option }));
                  setSubmitError("");
                }}
              />

              {mode === "practice" && practiceChecks[question.id] && (
                <PracticeFeedback
                  question={question}
                  review={practiceChecks[question.id]}
                  colors={colors}
                />
              )}

              {mode === "practice" && (
                <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <View style={styles.overviewHeader}>
                    <Text style={[styles.overviewTitle, { color: colors.text }]}>
                      Ir a una pregunta
                    </Text>

                    <Text style={[styles.overviewInfo, { color: colors.secondary }]}>
                      Selecciona una pregunta para continuar practicando
                    </Text>
                  </View>

                  <View style={styles.overviewGrid}>
                    {questions.map((item, index) => {
                      const active = index === currentIndex;
                      const answered = answers[item.id] !== undefined;

                      return (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Pregunta ${index + 1}${answered ? ", respondida" : ", pendiente"}`}
                          onPress={() => moveTo(index)}
                          style={[styles.overviewNumber, {
                            borderColor: active ? colors.accent : colors.controlOutline,
                            backgroundColor: active ? colors.accent : answered ? colors.softAccent : colors.background,
                          }]}
                        >
                          <Text style={[styles.overviewNumberText, {
                            color: active ? (isDark ? "#201B37" : "#FFFFFF") : answered ? colors.accent : colors.secondary,
                          }]}>
                            {index + 1}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {submitError ? (
                <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.notice, { color: colors.text }]}>{submitError}</Text>
                </View>
              ) : null}

              <View style={styles.navRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={currentIndex === 0 || submitting}
                  onPress={() => moveTo(currentIndex - 1)}
                  style={[styles.navButton, {
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                    opacity: currentIndex === 0 ? 0.45 : 1,
                  }]}
                >
                  <ChevronLeft size={18} color={colors.text} />
                  <Text style={[styles.navText, { color: colors.text }]}>Anterior</Text>
                </Pressable>

                {currentIndex < questions.length - 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => moveTo(currentIndex + 1)}
                    style={[styles.navButton, { backgroundColor: colors.primary, borderColor: colors.accent }]}
                  >
                    <Text style={[styles.primaryText, { color: actionForeground }]}>Siguiente</Text>
                    <ChevronRight size={18} color={actionForeground} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || (mode === "exam" && !allAnswered)}
                    onPress={mode === "exam" ? confirmSubmit : () => moveTo(0)}
                    style={[styles.navButton, {
                      backgroundColor: colors.primary,
                      borderColor: colors.accent,
                      opacity: mode === "exam" && !allAnswered ? 0.5 : 1,
                    }]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={actionForeground} />
                    ) : mode === "exam" ? (
                      <Check size={18} color={actionForeground} />
                    ) : (
                      <RotateCcw size={18} color={actionForeground} />
                    )}

                    <Text style={[styles.primaryText, { color: actionForeground }]}>
                      {mode === "exam" ? "Entregar" : "Ir al inicio"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {mode === "exam" && allAnswered && currentIndex < questions.length - 1 && (
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={confirmSubmit}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  {submitting ? (
                    <ActivityIndicator color={actionForeground} />
                  ) : (
                    <Check size={19} color={actionForeground} />
                  )}

                  <Text style={[styles.primaryText, { color: actionForeground }]}>
                    Entregar cuestionario
                  </Text>
                </Pressable>
              )}

              {mode === "exam" && !allAnswered && currentIndex === questions.length - 1 && (
                <Text style={[styles.pendingText, { color: colors.secondary }]}>
                  Te faltan {questions.length - answeredCount} preguntas por responder.
                </Text>
              )}

              {mode === "practice" && !practiceChecks[question.id] && (
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || answers[question.id] === undefined}
                  onPress={() => void checkPractice()}
                  style={[styles.primaryButton, {
                    backgroundColor: colors.primary,
                    opacity: answers[question.id] === undefined ? 0.5 : 1,
                  }]}
                >
                  {submitting ? (
                    <ActivityIndicator color={actionForeground} />
                  ) : (
                    <Check size={18} color={actionForeground} />
                  )}

                  <Text style={[styles.primaryText, { color: actionForeground }]}>
                    Comprobar respuesta
                  </Text>
                </Pressable>
              )}

              {mode === "practice" && allChecked && (
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => {
                    setPracticeFinished(true);
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <CheckCircle2 size={18} color={actionForeground} />
                  <Text style={[styles.primaryText, { color: actionForeground }]}>
                    Finalizar práctica
                  </Text>
                </Pressable>
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
  topbar: { minHeight: 65, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  modePill: { minWidth: 80, minHeight: 29, paddingHorizontal: 10, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modeText: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 55, gap: 17 },
  skeletons: { gap: 14 },
  introCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  introRow: { flexDirection: "row", gap: 13, alignItems: "center" },
  introIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  introCopy: { flex: 1, minWidth: 0, gap: 5 },
  introTitle: { ...typography, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  introSub: { ...typography, fontSize: 11, lineHeight: 16 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  progressLabel: { ...typography, fontSize: 12, fontWeight: "700" },
  progressValue: { ...typography, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  progressTrack: { height: 6, borderRadius: 6, overflow: "hidden", marginTop: -8 },
  progressFill: { height: "100%", borderRadius: 6 },
  questionCard: { padding: 20, borderRadius: 23, borderWidth: 1, gap: 17 },
  questionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  questionPill: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10 },
  questionPillText: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  questionText: { ...typography, fontSize: 21, fontWeight: "800", lineHeight: 29, letterSpacing: -0.5 },
  questionTranslation: { ...typography, fontSize: 12, lineHeight: 19, fontWeight: "400" },
  optionHint: { ...typography, fontSize: 11, marginTop: 3 },
  options: { gap: 11 },
  option: { minHeight: 65, borderWidth: 1, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 13, gap: 12, flexDirection: "row", alignItems: "center" },
  optionLetter: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optionLetterText: { ...typography, fontSize: 12, fontWeight: "800" },
  optionText: { ...typography, flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  overviewCard: { borderRadius: 19, borderWidth: 1, padding: 16, gap: 14 },
  overviewHeader: { gap: 5 },
  overviewTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  overviewInfo: { ...typography, fontSize: 11 },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  overviewNumber: { width: 44, height: 44, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  overviewNumberText: { ...typography, fontSize: 13, fontWeight: "800" },
  navRow: { flexDirection: "row", gap: 10 },
  navButton: { flex: 1, minHeight: 52, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  navText: { ...typography, fontSize: 13, fontWeight: "800" },
  primaryText: { ...typography, color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  primaryButton: { minHeight: 52, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  pendingText: { ...typography, textAlign: "center", fontSize: 12, lineHeight: 18 },
  errorCard: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  notice: { ...typography, fontSize: 12, lineHeight: 20, borderRadius: 14, padding: 12 },
  outlineButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  outlineText: { ...typography, fontSize: 13, fontWeight: "800" },
  sectionTitle: { ...typography, fontSize: 17, fontWeight: "800" },
  results: { gap: 16 },
  resultHero: { borderWidth: 1, borderRadius: 22, padding: 20 },
  resultHeroContent: { flexDirection: "row", alignItems: "center", gap: 13 },
  resultIcon: { width: 55, height: 55, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resultHeading: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  resultTitle: { ...typography, fontSize: 22, fontWeight: "800" },
  resultDescription: { ...typography, fontSize: 12, lineHeight: 18 },
  scoreRow: { flexDirection: "row", gap: 11 },
  scoreBox: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 17, gap: 12 },
  scoreLabel: { ...typography, fontSize: 11 },
  scoreValue: { ...typography, fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: 17, gap: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewNumber: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  reviewStatus: { flexDirection: "row", alignItems: "center", gap: 5 },
  reviewStatusText: { ...typography, fontSize: 11, fontWeight: "700" },
  reviewQuestion: { ...typography, fontSize: 14, fontWeight: "800", lineHeight: 21, marginBottom: 5 },
  reviewLabel: { ...typography, fontSize: 11, marginTop: 3 },
  reviewAnswer: { ...typography, fontSize: 12, lineHeight: 19, fontWeight: "600" },
  explanation: { borderRadius: 14, padding: 14, gap: 7, marginTop: 6 },
  explanationHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  explanationTitle: { ...typography, fontSize: 11, fontWeight: "800" },
  explanationText: { ...typography, fontSize: 12, lineHeight: 19 },
  practiceFeedback: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  practiceFeedbackTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  practiceHint: { ...typography, fontSize: 11, lineHeight: 17, marginTop: 3 },
});