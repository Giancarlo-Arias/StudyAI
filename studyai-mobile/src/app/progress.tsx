import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import {
  ArrowLeft,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronRight,
  FileText,
  RefreshCw,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionView, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import {
  getDocumentProgress,
  getTopicProgress,
  type DocumentProgress,
  type TopicProgress,
} from "@/lib/progress-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

type Palette = ReturnType<typeof getDashboardPalette>;

function formatScore(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("es-CR", { maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin actividad";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CR", {
        dateStyle: "medium",
        timeZone: "America/Costa_Rica",
      }).format(date);
}

function getTopicStatus(status: TopicProgress["status"], colors: Palette) {
  switch (status) {
    case "reinforce":
      return {
        label: "Reforzar",
        color: colors.danger,
        description: "Este tema necesita más práctica.",
      };
    case "review":
      return {
        label: "Repasar",
        color: colors.accent,
        description: "Vas avanzando, pero todavía puedes mejorar.",
      };
    case "strong":
      return {
        label: "Dominado",
        color: colors.success,
        description: "Tienes un buen rendimiento en este tema.",
      };
    default:
      return {
        label: "En evaluación",
        color: colors.secondary,
        description: "Se necesitan al menos 3 preguntas evaluadas para clasificar este tema.",
      };
  }
}

function TopicCard({ topic, colors, index }: {
  topic: TopicProgress;
  colors: Palette;
  index: number;
}) {
  const status = getTopicStatus(topic.status, colors);
  const percentage = Math.min(100, Math.max(0, topic.accuracy_percent));

  return (
    <MotionView delay={130 + Math.min(index, 6) * 60}>
      <View style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <View style={styles.topicHeader}>
          <View style={styles.topicInfo}>
            <Text style={[styles.topicName, { color: colors.text }]}>{topic.topic}</Text>
            <Text style={[styles.topicDocument, { color: colors.secondary }]} numberOfLines={2}>
              {topic.filename}
            </Text>
          </View>

          <View style={[styles.topicBadge, { backgroundColor: colors.softAccent }]}>
            <Text style={[styles.topicBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.topicMetrics}>
          <Text style={[styles.topicPercentage, { color: status.color }]}>
            {formatScore(topic.accuracy_percent)}
          </Text>
          <Text style={[styles.topicAnswers, { color: colors.secondary }]}>
            {topic.correct_questions} de {topic.questions_evaluated} correctas
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.softAccent }]}>
          <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: status.color }]} />
        </View>

        <Text style={[styles.topicDescription, { color: colors.secondary }]}>
          {status.description}
        </Text>
      </View>
    </MotionView>
  );
}

function ProgressCard({ document, colors, index, onPress }: {
  document: DocumentProgress;
  colors: Palette;
  index: number;
  onPress: () => void;
}) {
  const progress = document.total_quizzes > 0
    ? Math.min(100, Math.max(0, Math.round((document.quizzes_completed / document.total_quizzes) * 100)))
    : 0;

  return (
    <MotionView delay={150 + Math.min(index, 6) * 70}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir documento ${document.filename}`}
          onPress={onPress}
          style={styles.documentHeader}
        >
          <View style={[styles.documentIcon, { backgroundColor: colors.softAccent }]}>
            <FileText size={22} color={colors.accent} strokeWidth={1.7} />
          </View>

          <View style={styles.documentInfo}>
            <Text style={[styles.documentName, { color: colors.text }]} numberOfLines={2}>
              {document.filename}
            </Text>
            <Text style={[styles.documentDate, { color: colors.secondary }]}>
              Última actividad: {formatDate(document.last_attempt_at)}
            </Text>
          </View>

          <ChevronRight size={18} color={colors.secondary} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{document.total_quizzes}</Text>
            <Text style={[styles.metricLabel, { color: colors.secondary }]}>Cuestionarios</Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{document.quizzes_completed}</Text>
            <Text style={[styles.metricLabel, { color: colors.secondary }]}>Completados</Text>
          </View>

          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{document.total_attempts}</Text>
            <Text style={[styles.metricLabel, { color: colors.secondary }]}>Intentos</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeading}>
            <Text style={[styles.progressLabel, { color: colors.secondary }]}>Cuestionarios completados</Text>
            <Text style={[styles.progressPercent, { color: colors.accent }]}>{progress}%</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.softAccent }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>

        <View style={[styles.scores, { borderTopColor: colors.separator }]}>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.secondary }]}>Promedio académico</Text>
            <Text style={[styles.scoreValue, { color: colors.text }]}>
              {formatScore(document.average_score_percent)}
            </Text>
          </View>

          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: colors.secondary }]}>Mejor calificación</Text>
            <Text style={[styles.scoreValue, { color: colors.accent }]}>
              {formatScore(document.best_score_percent)}
            </Text>
          </View>
        </View>
      </View>
    </MotionView>
  );
}

export default function ProgressScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);

  const [documents, setDocuments] = useState<DocumentProgress[]>([]);
  const [topics, setTopics] = useState<TopicProgress[]>([]);
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

    void Promise.all([
      getDocumentProgress(),
      getTopicProgress(),
    ])
      .then(([documentData, topicData]) => {
        if (!active) return;
        setDocuments(documentData);
        setTopics(topicData);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "No se pudo consultar el progreso.");
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

  const totalQuizzes = documents.reduce((total, document) => total + document.total_quizzes, 0);
  const completedQuizzes = documents.reduce((total, document) => total + document.quizzes_completed, 0);
  const completion = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;
  const weakTopics = topics.filter((topic) => topic.status === "reinforce").length;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Mi progreso</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        >
          <MotionView delay={80} style={styles.intro}>
            <Text style={[styles.title, { color: colors.text }]}>Progreso académico</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Consulta tu rendimiento por temas y los avances de cada documento.
            </Text>
          </MotionView>

          {loading && documents.length === 0 && topics.length === 0 ? (
            <View style={styles.skeletons}>
              <SkeletonBlock height={150} radius={22} isDark={dark} />
              <SkeletonBlock height={260} radius={20} isDark={dark} />
              <SkeletonBlock height={260} radius={20} isDark={dark} />
            </View>
          ) : (
            <>
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

              {documents.length > 0 && (
                <MotionView delay={120}>
                  <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                    <View style={styles.summaryHeader}>
                      <View style={[styles.summaryIcon, { backgroundColor: colors.softAccent }]}>
                        <ChartNoAxesCombined size={23} color={colors.accent} />
                      </View>

                      <View style={styles.summaryInfo}>
                        <Text style={[styles.summaryLabel, { color: colors.secondary }]}>PROGRESO GENERAL</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{completion}%</Text>
                      </View>

                      <Text style={[styles.summaryCount, { color: colors.secondary }]}>
                        {completedQuizzes} / {totalQuizzes}
                      </Text>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: colors.softAccent }]}>
                      <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: colors.accent }]} />
                    </View>

                    <Text style={[styles.summaryHint, { color: colors.secondary }]}>
                      Cuestionarios completados de todos tus documentos.
                    </Text>
                  </View>
                </MotionView>
              )}

              {(documents.length > 0 || topics.length > 0) && (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.topicSectionTitle}>
                      <BrainCircuit size={20} color={colors.accent} strokeWidth={1.8} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Rendimiento por tema</Text>
                    </View>

                    {weakTopics > 0 && (
                      <Text style={[styles.sectionCount, { color: colors.danger }]}>
                        {weakTopics} por reforzar
                      </Text>
                    )}
                  </View>

                  {topics.length > 0 ? (
                    topics.map((topic, index) => (
                      <TopicCard
                        key={`${topic.document_id}-${topic.topic}`}
                        topic={topic}
                        colors={colors}
                        index={index}
                      />
                    ))
                  ) : (
                    <View style={[styles.topicEmpty, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        Aún no hay temas evaluados
                      </Text>
                      <Text style={[styles.emptyText, { color: colors.secondary }]}>
                        Los resultados aparecerán cuando completes exámenes nuevos con preguntas clasificadas por tema.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {documents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Por documento</Text>
                    <Text style={[styles.sectionCount, { color: colors.secondary }]}>
                      {documents.length} {documents.length === 1 ? "PDF" : "PDFs"}
                    </Text>
                  </View>

                  {documents.map((document, index) => (
                    <ProgressCard
                      key={document.document_id}
                      document={document}
                      colors={colors}
                      index={index}
                      onPress={() => router.push({
                        pathname: "/document/[id]",
                        params: { id: document.document_id },
                      })}
                    />
                  ))}
                </View>
              )}

              {!error && !loading && documents.length === 0 && topics.length === 0 && (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin progreso registrado</Text>
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    Cuando comiences a estudiar tus documentos, tus estadísticas aparecerán aquí.
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 45, gap: 20 },
  intro: { gap: 6 },
  title: { ...typography, fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { ...typography, fontSize: 14, lineHeight: 22 },
  skeletons: { gap: 12 },
  summary: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 16 },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: { width: 51, height: 51, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryInfo: { flex: 1, gap: 3 },
  summaryLabel: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  summaryValue: { ...typography, fontSize: 27, fontWeight: "800" },
  summaryCount: { ...typography, fontSize: 13, fontWeight: "800" },
  summaryHint: { ...typography, fontSize: 11, lineHeight: 17 },
  section: { gap: 12 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 5 },
  sectionTitle: { ...typography, fontSize: 17, fontWeight: "800" },
  sectionCount: { ...typography, fontSize: 12 },
  topicSectionTitle: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1 },
  topicCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 13 },
  topicHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  topicInfo: { flex: 1, gap: 5 },
  topicName: { ...typography, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  topicDocument: { ...typography, fontSize: 11, lineHeight: 17 },
  topicBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  topicBadgeText: { ...typography, fontSize: 10, fontWeight: "800" },
  topicMetrics: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  topicPercentage: { ...typography, fontSize: 24, fontWeight: "800" },
  topicAnswers: { ...typography, fontSize: 11 },
  topicDescription: { ...typography, fontSize: 11, lineHeight: 17 },
  topicEmpty: { borderWidth: 1, borderRadius: 18, padding: 17, gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 16 },
  documentHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  documentIcon: { width: 47, height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  documentInfo: { flex: 1, gap: 6 },
  documentName: { ...typography, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  documentDate: { ...typography, fontSize: 11 },
  divider: { height: StyleSheet.hairlineWidth },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, gap: 6 },
  metricValue: { ...typography, fontSize: 20, fontWeight: "800" },
  metricLabel: { ...typography, fontSize: 10, lineHeight: 14 },
  progressSection: { gap: 9 },
  progressHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { ...typography, fontSize: 11 },
  progressPercent: { ...typography, fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 7, borderRadius: 9, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 9 },
  scores: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, flexDirection: "row", gap: 15 },
  scoreItem: { flex: 1, gap: 6 },
  scoreLabel: { ...typography, fontSize: 11 },
  scoreValue: { ...typography, fontSize: 17, fontWeight: "800" },
  errorCard: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 12 },
  errorText: { ...typography, fontSize: 12, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", minHeight: 43, borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
  emptyCard: { borderRadius: 18, padding: 20, gap: 8 },
  emptyTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  emptyText: { ...typography, fontSize: 12, lineHeight: 19 },
});