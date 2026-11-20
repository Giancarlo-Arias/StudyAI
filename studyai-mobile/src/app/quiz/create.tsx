import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, ClipboardCheck, FileText, Sparkles } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText } from "@/components/dashboard/dashboard-motion";
import { generateStudyQuiz, type GeneratedQuiz, type QuizDifficulty, type QuizMode } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

const DIFFICULTIES: { value: QuizDifficulty; label: string; description: string }[] = [
  { value: "facil", label: "Fácil", description: "Conceptos esenciales" },
  { value: "intermedia", label: "Intermedia", description: "Comprensión y aplicación" },
  { value: "dificil", label: "Difícil", description: "Preguntas más exigentes" },
];

const QUESTION_COUNTS = [5, 10, 15, 20] as const;

const GENERATION_MESSAGES = [
  "Generando preguntas a partir de tu documento...",
  "La IA continúa trabajando con el contenido del PDF...",
  "Preparando un cuestionario para que puedas estudiar...",
  "Seguimos procesando tu solicitud...",
] as const;

function GenerationStatus({ colors }: { colors: ReturnType<typeof getDashboardPalette> }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [pulse] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulseAnimation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));

    pulseAnimation.start();

    const intervalId = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setMessageIndex((index) => (index + 1) % GENERATION_MESSAGES.length);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4200);

    return () => {
      clearInterval(intervalId);
      pulseAnimation.stop();
      fade.stopAnimation();
    };
  }, [fade, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] });

  return (
    <View style={[styles.generationCard, { backgroundColor: colors.surface, borderColor: colors.outline }]} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.generationIcon, { backgroundColor: colors.softAccent, transform: [{ scale }] }]}>
        <Sparkles size={23} color={colors.accent} />
      </Animated.View>

      <View style={styles.generationCopy}>
        <Text style={[styles.generationTitle, { color: colors.text }]}>StudyAI está generando tu cuestionario</Text>
        <Animated.View style={[styles.generationMessage, { opacity: fade }]}>
          <Text style={[styles.generationDescription, { color: colors.secondary }]}>{GENERATION_MESSAGES[messageIndex]}</Text>
        </Animated.View>
        <Text style={[styles.generationNote, { color: colors.secondary }]}>Mantén esta pantalla abierta.</Text>
      </View>

      <ActivityIndicator size="small" color={colors.accent} style={styles.generationSpinner} />
    </View>
  );
}

export default function CreateQuizScreen() {
  const router = useRouter();
  const { documentId: id, filename: name } = useLocalSearchParams<{ documentId?: string; filename?: string }>();

  const documentId = typeof id === "string" ? id : "";
  const filename = typeof name === "string" ? name : "Documento";
  const isDark = useColorScheme() === "dark";
  const colors = getDashboardPalette(isDark);
  const buttonTextColor = colors.onPrimary;
  const generationLock = useRef(false);

  const [difficulty, setDifficulty] = useState<QuizDifficulty>("intermedia");
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuiz | null>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => `Cuestionario: ${filename.replace(/\.pdf$/i, "").trim() || "Documento"}`, [filename]);

  async function handleGenerate() {
    if (generationLock.current || generated) return;

    generationLock.current = true;
    setGenerating(true);
    setError("");

    try {
      const result = await generateStudyQuiz({ documentId, title, difficulty, questionCount });
      setGenerated(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo generar el cuestionario.";
      setError(`${message}\n\nSi se interrumpió la conexión, comprueba el listado de cuestionarios antes de repetir la generación.`);
    } finally {
      setGenerating(false);
      generationLock.current = false;
    }
  }

  function openMode(mode: QuizMode) {
    if (!generated?.id) return;
    router.push({ pathname: "/quiz/[id]", params: { id: generated.id, mode } });
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al documento"
            disabled={generating}
            onPress={() => goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.topbarTitle, { color: colors.text }]}>Nuevo cuestionario</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <MotionIcon delay={120}>
              <View style={[styles.headingIcon, { backgroundColor: colors.softAccent }]}>
                <Sparkles size={24} color={colors.accent} />
              </View>
            </MotionIcon>

            <MotionText text="Prepara tu estudio" delay={220} style={[styles.title, { color: colors.text }]} />
            <MotionText
              text="Personaliza las preguntas que la IA creará a partir de tu documento."
              delay={300}
              style={[styles.subtitle, { color: colors.secondary }]}
            />
          </View>

          <MotionPanel
            delay={230}
            style={[styles.documentCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
            contentStyle={styles.documentRow}
          >
            <View style={[styles.fileIcon, { backgroundColor: colors.softAccent }]}>
              <FileText size={21} color={colors.accent} />
            </View>

            <View style={styles.documentCopy}>
              <Text style={[styles.documentLabel, { color: colors.secondary }]}>DOCUMENTO SELECCIONADO</Text>
              <Text numberOfLines={2} style={[styles.documentName, { color: colors.text }]}>{filename}</Text>
            </View>

            <CheckCircle2 size={19} color={colors.accent} />
          </MotionPanel>

          {!generated ? (
            <>
              <View style={styles.section}>
                <MotionText text="Nivel de dificultad" delay={380} style={[styles.sectionTitle, { color: colors.text }]} />

                <MotionPanel
                  delay={450}
                  style={[styles.difficultyCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                >
                  {DIFFICULTIES.map((option, index) => {
                    const selected = difficulty === option.value;

                    return (
                      <View key={option.value}>
                        {index > 0 && <View style={[styles.divider, { backgroundColor: colors.separator }]} />}

                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: generating }}
                          disabled={generating}
                          onPress={() => setDifficulty(option.value)}
                          style={styles.optionRow}
                        >
                          <View style={styles.optionCopy}>
                            <Text style={[styles.optionTitle, { color: selected ? colors.accent : colors.text }]}>
                              {option.label}
                            </Text>
                            <Text style={[styles.optionDescription, { color: colors.secondary }]}>
                              {option.description}
                            </Text>
                          </View>

                          <View style={[styles.radio, {
                            borderColor: selected ? colors.accent : colors.controlOutline,
                            backgroundColor: selected ? colors.accent : "transparent",
                          }]}>
                            {selected && <Check size={13} color={isDark ? "#201B37" : "#FFFFFF"} strokeWidth={3} />}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </MotionPanel>
              </View>

              <View style={styles.section}>
                <MotionText text="Cantidad de preguntas" delay={540} style={[styles.sectionTitle, { color: colors.text }]} />

                <MotionPanel delay={600} style={styles.countGrid} contentStyle={styles.countGridContent}>
                  {QUESTION_COUNTS.map((count) => {
                    const selected = questionCount === count;

                    return (
                      <Pressable
                        key={count}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: generating }}
                        disabled={generating}
                        onPress={() => setQuestionCount(count)}
                        style={[styles.countOption, {
                          backgroundColor: selected ? colors.softAccent : colors.surface,
                          borderColor: selected ? colors.accent : colors.controlOutline,
                        }]}
                      >
                        <Text style={[styles.countValue, { color: selected ? colors.accent : colors.text }]}>
                          {count}
                        </Text>
                        <Text style={[styles.countCaption, { color: colors.secondary }]}>preguntas</Text>
                      </Pressable>
                    );
                  })}
                </MotionPanel>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <BookOpen size={18} color={colors.accent} />

                <View style={styles.summaryCopy}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Listo para generar</Text>
                  <Text style={[styles.summaryDescription, { color: colors.secondary }]}>
                    {questionCount} preguntas · {DIFFICULTIES.find((item) => item.value === difficulty)?.label}
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Generar cuestionario con IA"
                disabled={generating || !documentId}
                onPress={() => void handleGenerate()}
                style={({ pressed }) => [styles.primaryButton, {
                  backgroundColor: colors.primary,
                  opacity: generating || !documentId ? 0.65 : pressed ? 0.85 : 1,
                }]}
              >
                {generating
                  ? <ActivityIndicator color={buttonTextColor} />
                  : <Sparkles size={20} color={buttonTextColor} />
                }

                <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>
                  {generating ? "Generando con IA…" : "Generar cuestionario"}
                </Text>

                {!generating && <ChevronRight size={19} color={buttonTextColor} />}
              </Pressable>

              {generating && <GenerationStatus colors={colors} />}
            </>
          ) : (
            <MotionPanel
              delay={100}
              style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
              contentStyle={styles.successContent}
            >
              <View style={styles.successHeader}>
                <MotionIcon delay={420}>
                  <View style={[styles.successIcon, { backgroundColor: colors.softAccent }]}>
                    <CheckCircle2 size={26} color={colors.accent} />
                  </View>
                </MotionIcon>

                <View style={styles.successText}>
                  <MotionText
                    text="¡Cuestionario creado!"
                    delay={510}
                    style={[styles.successTitle, { color: colors.text }]}
                  />
                  <MotionText
                    text="Selecciona cómo quieres responder las preguntas."
                    delay={600}
                    style={[styles.successDescription, { color: colors.secondary }]}
                  />
                </View>
              </View>

              <Text style={[styles.successName, { color: colors.text }]}>{generated.title}</Text>

              {generated.id ? (
                <View style={styles.modeChoices}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openMode("practice")}
                    style={({ pressed }) => [
                      styles.modeCard,
                      { backgroundColor: colors.softAccent, borderColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <View style={[styles.modeIcon, { backgroundColor: colors.primary }]}>
                      <BookOpen size={21} color={buttonTextColor} />
                    </View>

                    <View style={styles.modeCopy}>
                      <Text style={[styles.modeTitle, { color: colors.text }]}>Modo Práctica</Text>
                      <Text style={[styles.modeDescription, { color: colors.secondary }]}>
                        Navega libremente y repasa tus respuestas.
                      </Text>
                    </View>

                    <ChevronRight size={19} color={colors.accent} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openMode("exam")}
                    style={({ pressed }) => [
                      styles.modeCard,
                      { backgroundColor: colors.surface, borderColor: colors.outline, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <View style={[styles.modeIcon, { backgroundColor: colors.softAccent }]}>
                      <ClipboardCheck size={21} color={colors.accent} />
                    </View>

                    <View style={styles.modeCopy}>
                      <Text style={[styles.modeTitle, { color: colors.text }]}>Modo Examen</Text>
                      <Text style={[styles.modeDescription, { color: colors.secondary }]}>
                        Avanza pregunta a pregunta y recibe tu nota al finalizar.
                      </Text>
                    </View>

                    <ChevronRight size={19} color={colors.accent} />
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.successNote, { color: colors.secondary }]}>
                  FastAPI confirmó la generación, pero no devolvió el ID del cuestionario.
                  Comprueba tu listado antes de generar otro.
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={() => goBack()}
                style={[styles.returnButton, { borderColor: colors.outline }]}
              >
                <Text style={[styles.returnText, { color: colors.secondary }]}>Volver al documento</Text>
              </Pressable>
            </MotionPanel>
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
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 45, gap: 23 },
  heading: { gap: 9, alignItems: "flex-start" },
  headingIcon: { width: 51, height: 51, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { ...typography, fontSize: 27, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { ...typography, fontSize: 14, lineHeight: 22 },
  documentCard: { borderWidth: 1, borderRadius: 19, padding: 15 },
  documentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fileIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  documentCopy: { flex: 1, minWidth: 0, gap: 5 },
  documentLabel: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.65 },
  documentName: { ...typography, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  section: { gap: 12 },
  sectionTitle: { ...typography, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  difficultyCard: { borderWidth: 1, borderRadius: 19, overflow: "hidden" },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 67, paddingHorizontal: 17, paddingVertical: 12, gap: 12 },
  optionCopy: { flex: 1, gap: 5 },
  optionTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  optionDescription: { ...typography, fontSize: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 17 },
  countGrid: { borderRadius: 19 },
  countGridContent: { flexDirection: "row", gap: 9 },
  countOption: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 15, paddingVertical: 15, alignItems: "center", gap: 5 },
  countValue: { ...typography, fontSize: 21, fontWeight: "800" },
  countCaption: { ...typography, fontSize: 10 },
  summaryCard: { padding: 15, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 11 },
  summaryCopy: { flex: 1, gap: 4 },
  summaryTitle: { ...typography, fontSize: 13, fontWeight: "800" },
  summaryDescription: { ...typography, fontSize: 12 },
  errorCard: { padding: 15, borderWidth: 1, borderRadius: 15 },
  errorText: { ...typography, fontSize: 12, lineHeight: 19 },
  primaryButton: { minHeight: 54, paddingHorizontal: 18, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11 },
  primaryButtonText: { ...typography, fontSize: 14, fontWeight: "800" },
  generationCard: { borderWidth: 1, borderRadius: 19, padding: 15, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  generationIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  generationCopy: { flex: 1, minWidth: 0, gap: 5 },
  generationTitle: { ...typography, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  generationMessage: { minHeight: 36, justifyContent: "center" },
  generationDescription: { ...typography, fontSize: 12, lineHeight: 18 },
  generationNote: { ...typography, fontSize: 11, lineHeight: 16 },
  generationSpinner: { marginTop: 11 },
  successCard: { borderRadius: 22, borderWidth: 1, padding: 18 },
  successContent: { gap: 17 },
  successHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  successIcon: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  successText: { flex: 1, minWidth: 0, gap: 5 },
  successTitle: { ...typography, fontSize: 19, fontWeight: "800" },
  successDescription: { ...typography, fontSize: 13, lineHeight: 20 },
  successName: { ...typography, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  successNote: { ...typography, fontSize: 12, lineHeight: 20 },
  modeChoices: { gap: 11 },
  modeCard: { minHeight: 83, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  modeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modeCopy: { flex: 1, gap: 5 },
  modeTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  modeDescription: { ...typography, fontSize: 11, lineHeight: 16 },
  returnButton: { minHeight: 47, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  returnText: { ...typography, fontSize: 13, fontWeight: "700" },
});