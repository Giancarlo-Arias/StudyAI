import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, FileText, Sparkles } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText } from "@/components/dashboard/dashboard-motion";
import { generateStudyQuiz, type GeneratedQuiz, type QuizDifficulty } from "@/lib/quizzes-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

const DIFFICULTIES: { value: QuizDifficulty; label: string; description: string }[] = [
  { value: "facil", label: "Fácil", description: "Conceptos esenciales" },
  { value: "intermedia", label: "Intermedia", description: "Comprensión y aplicación" },
  { value: "dificil", label: "Difícil", description: "Preguntas más exigentes" },
];

const QUESTION_COUNTS = [5, 10, 15, 20] as const;

export default function CreateQuizScreen() {
  const router = useRouter();
  const { documentId: id, filename: name } = useLocalSearchParams<{ documentId: string; filename: string }>();

  const documentId = typeof id === "string" ? id : "";
  const filename = typeof name === "string" ? name : "Documento";

  const isDark = useColorScheme() === "dark";
  const colors = getDashboardPalette(isDark);
  const buttonTextColor = isDark ? "#201B37" : "#FFFFFF";

  const generatingLock = useRef(false);

  const [difficulty, setDifficulty] = useState<QuizDifficulty>("intermedia");
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuiz | null>(null);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    const name = filename.replace(/\.pdf$/i, "").trim();
    return `Cuestionario: ${name || "Documento"}`;
  }, [filename]);

  async function handleGenerate() {
    if (generatingLock.current || generated) return;

    generatingLock.current = true;
    setGenerating(true);
    setError("");

    try {
      const result = await generateStudyQuiz({ documentId, title, difficulty, questionCount });
      setGenerated(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo generar el cuestionario.";

      setError(
        `${message}\n\nSi se interrumpió la conexión, verifica antes de intentarlo otra vez: el servidor podría haber guardado el cuestionario.`
      );
    } finally {
      setGenerating(false);
      generatingLock.current = false;
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al documento"
            disabled={generating}
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.topbarTitle, { color: colors.text }]}>Nuevo cuestionario</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Encabezado */}
          <View style={styles.heading}>
            <MotionIcon delay={120}>
              <View style={[styles.headingIcon, { backgroundColor: colors.softAccent }]}>
                <Sparkles size={24} color={colors.accent} />
              </View>
            </MotionIcon>

            <MotionText
              text="Prepara tu estudio"
              delay={220}
              style={[styles.title, { color: colors.text }]}
            />

            <MotionText
              text="Personaliza las preguntas que la IA creará a partir de tu documento."
              delay={300}
              style={[styles.subtitle, { color: colors.secondary }]}
            />
          </View>

          {/* Documento seleccionado */}
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
              <Text numberOfLines={2} style={[styles.documentName, { color: colors.text }]}>
                {filename}
              </Text>
            </View>

            <CheckCircle2 size={19} color={colors.accent} />
          </MotionPanel>

          {!generated ? (
            <>
              {/* Dificultad */}
              <View style={styles.section}>
                <MotionText
                  text="Nivel de dificultad"
                  delay={380}
                  style={[styles.sectionTitle, { color: colors.text }]}
                />

                <MotionPanel
                  delay={450}
                  style={[styles.difficultyCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                >
                  {DIFFICULTIES.map((option, index) => {
                    const selected = difficulty === option.value;

                    return (
                      <View key={option.value}>
                        {index > 0 && (
                          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                        )}

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

                          <View style={[
                            styles.radio,
                            {
                              borderColor: selected ? colors.accent : colors.outline,
                              backgroundColor: selected ? colors.accent : "transparent",
                            },
                          ]}>
                            {selected && <Check size={13} color={buttonTextColor} strokeWidth={3} />}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </MotionPanel>
              </View>

              {/* Cantidad de preguntas */}
              <View style={styles.section}>
                <MotionText
                  text="Cantidad de preguntas"
                  delay={540}
                  style={[styles.sectionTitle, { color: colors.text }]}
                />

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
                        style={[
                          styles.countOption,
                          {
                            backgroundColor: selected ? colors.softAccent : colors.surface,
                            borderColor: selected ? colors.accent : colors.outline,
                          },
                        ]}
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

              {/* Resumen */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <BookOpen size={18} color={colors.accent} />

                <View style={styles.summaryCopy}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Listo para generar</Text>
                  <Text style={[styles.summaryDescription, { color: colors.secondary }]}>
                    {questionCount} preguntas · {DIFFICULTIES.find((item) => item.value === difficulty)?.label}
                  </Text>
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                </View>
              ) : null}

              {/* Generar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Generar cuestionario con IA"
                disabled={generating || !documentId}
                onPress={() => void handleGenerate()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: generating || !documentId ? 0.65 : pressed ? 0.85 : 1,
                  },
                ]}
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

              {generating && (
                <Text style={[styles.generatingHint, { color: colors.secondary }]}>
                  Gemini está creando las preguntas a partir del documento. Mantén esta pantalla abierta.
                </Text>
              )}
            </>
          ) : (
            /* Cuestionario generado */
            <MotionPanel
              delay={100}
              style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
              contentStyle={styles.successContent}
            >
              <MotionIcon delay={420}>
                <View style={[styles.successIcon, { backgroundColor: colors.softAccent }]}>
                  <CheckCircle2 size={32} color={colors.accent} />
                </View>
              </MotionIcon>

              <MotionText
                text="¡Cuestionario creado!"
                delay={530}
                style={[styles.successTitle, { color: colors.text }]}
              />

              <MotionText
                text="Las preguntas fueron generadas y guardadas en StudyAI."
                delay={650}
                style={[styles.successDescription, { color: colors.secondary }]}
              />

              <Text numberOfLines={3} style={[styles.successName, { color: colors.text }]}>
                {generated.title}
              </Text>

              <Text style={[styles.successNote, { color: colors.secondary }]}>
                En el siguiente paso conectaremos la pantalla para responderlo en Práctica o Examen.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={[styles.returnButton, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.returnText, { color: buttonTextColor }]}>
                  Volver al documento
                </Text>
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
  backButton: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topbarTitle: { fontSize: 14, fontWeight: "800" },

  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 45, gap: 23 },
  heading: { gap: 9, alignItems: "flex-start" },
  headingIcon: { width: 51, height: 51, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 20 },

  documentCard: { borderWidth: 1, borderRadius: 19, padding: 15 },
  documentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fileIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  documentCopy: { flex: 1, minWidth: 0, gap: 5 },
  documentLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.65 },
  documentName: { fontSize: 13, lineHeight: 19, fontWeight: "700" },

  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  difficultyCard: { borderWidth: 1, borderRadius: 19, overflow: "hidden" },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 67, paddingHorizontal: 17, paddingVertical: 12, gap: 12 },
  optionCopy: { flex: 1, gap: 5 },
  optionTitle: { fontSize: 14, fontWeight: "800" },
  optionDescription: { fontSize: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 17 },

  countGrid: { borderRadius: 19 },
  countGridContent: { flexDirection: "row", gap: 9 },
  countOption: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 15, paddingVertical: 15, alignItems: "center", gap: 5 },
  countValue: { fontSize: 21, fontWeight: "800" },
  countCaption: { fontSize: 10 },

  summaryCard: { padding: 15, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 11 },
  summaryCopy: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 13, fontWeight: "800" },
  summaryDescription: { fontSize: 12 },

  errorCard: { padding: 15, borderWidth: 1, borderRadius: 15 },
  errorText: { fontSize: 12, lineHeight: 19 },

  primaryButton: { minHeight: 54, paddingHorizontal: 18, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11 },
  primaryButtonText: { fontSize: 14, fontWeight: "800" },
  generatingHint: { marginTop: -12, fontSize: 12, lineHeight: 19, textAlign: "center" },

  successCard: { padding: 22, borderWidth: 1, borderRadius: 22 },
  successContent: { alignItems: "center", gap: 13 },
  successIcon: { width: 65, height: 65, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 21, fontWeight: "800", textAlign: "center" },
  successDescription: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  successName: { fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center" },
  successNote: { fontSize: 12, lineHeight: 20, textAlign: "center" },
  returnButton: { width: "100%", minHeight: 49, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 8 },
  returnText: { fontSize: 13, fontWeight: "800" },
});