import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import { goBack } from "@/lib/navigation";
import { LinearGradient } from "@/components/theme-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, FileText, GraduationCap, Layers3, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText, MotionView, SkeletonBlock } from "@/components/dashboard/dashboard-motion";
import { deleteStudyDocument, formatDocumentSize, getStudyDocumentDetail, type DocumentDetailResponse } from "@/lib/documents-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

import { DocumentQuizzes } from "@/components/documents/document-quizzes";

const PAGE_SIZE = 8;

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = typeof id === "string" ? id : "";
  const [revision, setRevision] = useState(0);

  return (
    <DocumentDetailContent
      key={`${documentId}-${revision}`}
      documentId={documentId}
      onReload={() => setRevision((value) => value + 1)}
    />
  );
}

function DocumentDetailContent({ documentId, onReload }: {
  documentId: string;
  onReload: () => void;
}) {
  const router = useRouter();

  const dark = useColorScheme() === "dark";
  const colors = getDashboardPalette(dark);
  const actionTextColor = colors.onPrimary;

  const [detail, setDetail] = useState<DocumentDetailResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [fetchingMore, setFetchingMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(documentId ? "" : "Identificador de documento no válido.");

  useEffect(() => {
    if (!documentId) return;

    let active = true;

    void getStudyDocumentDetail(documentId, PAGE_SIZE, 0)
      .then((result) => {
        if (!active) return;
        setDetail(result);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "No se pudo cargar el documento.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentId]);

  async function loadMore() {
    if (!detail || fetchingMore || detail.chunks.length >= detail.chunk_count) return;

    setFetchingMore(true);

    try {
      const next = await getStudyDocumentDetail(documentId, PAGE_SIZE, detail.chunks.length);
      setDetail((previous) => previous
        ? { ...next, chunks: [...previous.chunks, ...next.chunks] }
        : next
      );
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar más fragmentos.");
    } finally {
      setFetchingMore(false);
    }
  }

  async function removeDocument() {
    if (deleting || !documentId) return;

    setDeleting(true);
    setError("");

    try {
      await deleteStudyDocument(documentId);
      goBack();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el documento.");
      setDeleting(false);
    }
  }

  function confirmDeletion() {
    if (deleting) return;

    Alert.alert(
      "Eliminar documento",
      "Se eliminarán el documento y sus fragmentos. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => void removeDocument() },
      ]
    );
  }

  function openQuizConfiguration() {
    if (!detail?.document || deleting) return;

    router.push({
      pathname: "/quiz/create",
      params: { documentId, filename: detail.document.filename },
    });
  }

  const document = detail?.document;
  const chunks = detail?.chunks ?? [];
  const hasMore = detail !== null && chunks.length < detail.chunk_count;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a documentos"
            onPress={() => goBack()}
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
          >
            <ArrowLeft size={21} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Detalle del documento</Text>

          {document ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar documento"
              disabled={deleting}
              onPress={confirmDeletion}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              {deleting
                ? <ActivityIndicator color="#C75277" />
                : <Trash2 size={19} color="#C75277" strokeWidth={1.8} />
              }
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {loading && !detail ? (
            <View style={styles.loading}>
              <SkeletonBlock height={115} radius={22} isDark={dark} />
              <SkeletonBlock height={105} radius={20} isDark={dark} />
              <SkeletonBlock height={180} radius={20} isDark={dark} />
            </View>
          ) : detail && document ? (
            <>
              {/* Documento: icono e información alineados horizontalmente */}
              <MotionPanel
                delay={100}
                style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                contentStyle={styles.heroRow}
              >
                <MotionIcon delay={540}>
                  <View style={[styles.heroIcon, { backgroundColor: colors.softAccent }]}>
                    <FileText size={24} color={colors.accent} strokeWidth={1.6} />
                  </View>
                </MotionIcon>

                <View style={styles.heroCopy}>
                  <MotionText
                    text="DOCUMENTO PDF"
                    delay={630}
                    style={[styles.heroLabel, { color: colors.accent }]}
                  />
                  <MotionText
                    text={document.filename}
                    delay={720}
                    numberOfLines={3}
                    style={[styles.filename, { color: colors.text }]}
                  />
                </View>
              </MotionPanel>

              {/* Estadísticas */}
              <MotionPanel
                delay={300}
                style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                contentStyle={styles.statsContent}
              >
                <View style={styles.stat}>
                  <MotionText text={String(document.pages_with_text)} delay={840} style={[styles.statValue, { color: colors.text }]} />
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Páginas</Text>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                <View style={styles.stat}>
                  <MotionText text={formatDocumentSize(document.size_bytes)} delay={930} style={[styles.statValue, { color: colors.text }]} />
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Tamaño</Text>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                <View style={styles.stat}>
                  <MotionText text={String(detail.chunk_count)} delay={1020} style={[styles.statValue, { color: colors.accent }]} />
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Fragmentos</Text>
                </View>
              </MotionPanel>

              {/* Acceso a cuestionarios */}
              <MotionPanel
                delay={470}
                style={[styles.studyCard, { backgroundColor: colors.primary }]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Estudiar documento"
                  disabled={deleting}
                  onPress={openQuizConfiguration}
                  style={({ pressed }) => [styles.studyButton, { opacity: pressed || deleting ? 0.83 : 1 }]}
                >
                  <View style={styles.studyIconContainer}>
                    <GraduationCap size={23} color={actionTextColor} strokeWidth={1.7} />
                  </View>

                  <View style={styles.studyText}>
                    <Text style={[styles.studyTitle, { color: actionTextColor }]}>Estudiar documento</Text>
                    <Text style={[styles.studyDescription, { color: actionTextColor }]}>Crear cuestionario con IA</Text>
                  </View>

                  <View style={styles.studyArrow}>
                    <ChevronRight size={18} color={actionTextColor} />
                  </View>
                </Pressable>
              </MotionPanel>

              <MotionView delay={570} style={styles.dateRow}>
                <CalendarDays size={16} color={colors.tertiary} />
                <Text style={[styles.dateText, { color: colors.secondary }]}>
                  Añadido el {formatDate(document.created_at)}
                </Text>
              </MotionView>

              <DocumentQuizzes documentId={documentId} />

              {/* Texto extraído */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MotionText
                    text="Contenido extraído"
                    delay={640}
                    style={[styles.sectionTitle, { color: colors.text }]}
                  />
                  <Layers3 size={19} color={colors.accent} />
                </View>

                <MotionText
                  text="Fragmentos organizados por página"
                  delay={750}
                  style={[styles.sectionSubtitle, { color: colors.secondary }]}
                />

                {chunks.length > 0 ? (
                  <View style={styles.chunkList}>
                    {chunks.map((chunk, index) => (
                      <MotionPanel
                        key={String(chunk.id)}
                        delay={830 + Math.min(index, 5) * 85}
                        style={[styles.chunkCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                        contentStyle={styles.chunkContent}
                      >
                        <View style={styles.chunkHeader}>
                          <View style={[styles.pagePill, { backgroundColor: colors.softAccent }]}>
                            <Text style={[styles.pageText, { color: colors.accent }]}>
                              {chunk.page_number === null ? "Sin página" : `Página ${chunk.page_number}`}
                            </Text>
                          </View>
                          <Text style={[styles.chunkIndex, { color: colors.tertiary }]}>
                            Fragmento {chunk.chunk_index + 1}
                          </Text>
                        </View>

                        <Text style={[styles.chunkText, { color: colors.text }]}>{chunk.text}</Text>
                      </MotionPanel>
                    ))}
                  </View>
                ) : (
                  <MotionPanel style={[styles.emptyChunks, { backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.secondary }}>No se encontraron fragmentos de texto.</Text>
                  </MotionPanel>
                )}

                {hasMore && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={fetchingMore}
                    onPress={() => void loadMore()}
                    style={[styles.loadMore, { backgroundColor: colors.surface }]}
                  >
                    {fetchingMore ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <>
                        <Text style={[styles.loadMoreText, { color: colors.accent }]}>Cargar más fragmentos</Text>
                        <ChevronDown size={17} color={colors.accent} />
                      </>
                    )}
                  </Pressable>
                )}
              </View>

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <MotionPanel
              style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
              contentStyle={styles.emptyContent}
            >
              <View style={styles.emptyRow}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.softAccent }]}>
                  <FileText size={24} color={colors.accent} />
                </View>
                <View style={styles.emptyCopy}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No se pudo abrir el documento</Text>
                  <Text style={[styles.emptyDescription, { color: colors.secondary }]}>
                    {error || "No hay información disponible."}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onReload}
                style={[styles.retryButton, { backgroundColor: colors.softAccent }]}
              >
                <Text style={[styles.retryText, { color: colors.accent }]}>Reintentar</Text>
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
  header: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 45, gap: 18 },
  loading: { gap: 13 },

  hero: { borderWidth: 1, borderRadius: 22, padding: 18, overflow: "hidden" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 55, height: 59, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, minWidth: 0, gap: 7 },
  heroLabel: { ...typography, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  filename: { ...typography, fontSize: 17, fontWeight: "800", lineHeight: 23, letterSpacing: -0.35 },

  statsCard: { borderWidth: 1, borderRadius: 20, paddingVertical: 17 },
  statsContent: { flexDirection: "row", alignItems: "stretch" },
  stat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7 },
  statValue: { ...typography, fontSize: 19, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { ...typography, fontSize: 11 },
  separator: { width: StyleSheet.hairlineWidth },

  studyCard: { borderRadius: 19, overflow: "hidden" },
  studyButton: { minHeight: 82, paddingHorizontal: 17, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 13 },
  studyIconContainer: { height: 45, width: 45, borderRadius: 14, backgroundColor: "#FFFFFF20", alignItems: "center", justifyContent: "center" },
  studyText: { flex: 1, minWidth: 0, gap: 5 },
  studyTitle: { ...typography, fontSize: 15, fontWeight: "800" },
  studyDescription: { ...typography, fontSize: 12, opacity: 0.8 },
  studyArrow: { height: 31, width: 31, borderRadius: 16, backgroundColor: "#FFFFFF20", alignItems: "center", justifyContent: "center" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 3 },
  dateText: { ...typography, fontSize: 12 },

  section: { gap: 12, marginTop: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...typography, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { ...typography, fontSize: 12, lineHeight: 18 },
  chunkList: { gap: 11 },
  chunkCard: { borderWidth: 1, borderRadius: 19, padding: 16 },
  chunkContent: { gap: 12 },
  chunkHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pagePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pageText: { ...typography, fontSize: 11, fontWeight: "800" },
  chunkIndex: { ...typography, fontSize: 11, fontWeight: "600" },
  chunkText: { ...typography, fontSize: 13, lineHeight: 21 },
  emptyChunks: { borderRadius: 18, padding: 18 },
  loadMore: { minHeight: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  loadMoreText: { ...typography, fontSize: 13, fontWeight: "700" },

  errorCard: { padding: 15, borderRadius: 14 },
  errorText: { ...typography, fontSize: 12, lineHeight: 19 },
  emptyCard: { borderWidth: 1, borderRadius: 22, padding: 19 },
  emptyContent: { gap: 17 },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  emptyIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  emptyCopy: { flex: 1, gap: 6 },
  emptyTitle: { ...typography, fontSize: 14, fontWeight: "800" },
  emptyDescription: { ...typography, fontSize: 12, lineHeight: 19 },
  retryButton: { minHeight: 45, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  retryText: { ...typography, fontSize: 13, fontWeight: "800" },
});
