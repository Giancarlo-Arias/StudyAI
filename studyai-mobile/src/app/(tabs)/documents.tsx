import { Pressable, Text, View } from "@/components/theme-primitives";
import { typography } from "@/styles/typography";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "@/components/theme-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowUpRight, BookOpenCheck, ChartNoAxesCombined, ChevronDown, ChevronRight, FileText, FileUp, Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionIcon, MotionPanel, MotionText, MotionView, SkeletonBlock, TabScene } from "@/components/dashboard/dashboard-motion";
import { getStudyDocuments, type DocumentsResponse } from "@/lib/dashboard-api";
import { formatDocumentSize, uploadStudyPdf, validatePdfAsset } from "@/lib/documents-api";
import { getDashboardPalette } from "@/styles/dashboard-overview.styles";

const PAGE_SIZE = 20;

type StudyDocument = DocumentsResponse["documents"][number];
type Palette = ReturnType<typeof getDashboardPalette>;

type UploadState = {
  filename: string;
  fraction: number;
  stage: "uploading" | "processing";
};

function UploadCard({ colors, isDark, busy, onPress }: {
  colors: Palette;
  isDark: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPanel
      delay={160}
      style={[styles.uploadCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
      contentStyle={styles.uploadContent}
    >
      <View style={styles.uploadHeading}>
        <MotionIcon delay={660}>
          <View style={[styles.uploadSymbol, { backgroundColor: colors.softAccent }]}>
            <FileUp size={22} strokeWidth={1.75} color={colors.accent} />
          </View>
        </MotionIcon>

        <View style={styles.uploadHeadingCopy}>
          <MotionText text="Añade un documento" delay={700} style={[styles.uploadTitle, { color: colors.text }]} />

          <MotionText
            text="Convierte tus apuntes en material de estudio."
            delay={790}
            style={[styles.uploadDescription, { color: colors.secondary }]}
          />
        </View>
      </View>

      <MotionView delay={870}>
        <View style={[styles.uploadDivider, { backgroundColor: colors.separator }]} />
      </MotionView>

      <MotionView delay={930} style={styles.uploadMetaRow}>
        <View style={[styles.formatPill, { backgroundColor: colors.softAccent }]}>
          <View style={[styles.formatDot, { backgroundColor: colors.primary }]} />

          <Text style={[styles.formatLabel, { color: colors.accent }]}>
            PDF
          </Text>
        </View>

        <Text style={[styles.uploadMetaText, { color: colors.secondary }]}>
          Hasta 5 MB · Texto seleccionable
        </Text>
      </MotionView>

      <MotionView delay={1010}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seleccionar PDF del dispositivo"
          disabled={busy}
          onPress={onPress}
          style={({ pressed }) => [styles.uploadButton, { backgroundColor: colors.primary, opacity: busy ? 0.65 : pressed ? 0.83 : 1 }]}
        >
          <View style={styles.uploadButtonLeading}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Plus size={20} strokeWidth={2} color={colors.onPrimary} />
            )}

            <Text style={[styles.uploadButtonText, { color: colors.onPrimary }]}>
              {busy ? "Subiendo documento" : "Seleccionar PDF"}
            </Text>
          </View>

          {!busy && (<ArrowUpRight size={19} strokeWidth={1.8} color={colors.onPrimary} />)}
        </Pressable>
      </MotionView>
    </MotionPanel>
  );
}

function UploadProgress({ upload, colors, isDark }: {
  upload: UploadState;
  colors: Palette;
  isDark: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const processing = upload.stage === "processing";

  useEffect(() => {
    Animated.timing(progress, { toValue: upload.fraction, duration: 240, useNativeDriver: false }).start();
  }, [progress, upload.fraction]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <MotionPanel style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <View style={styles.progressTop}>
        <View style={[styles.progressIcon, { backgroundColor: colors.softAccent }]}>
          <FileText size={19} color={colors.accent} strokeWidth={1.8} />
        </View>

        <View style={styles.progressCopy}>
          <Text numberOfLines={1} style={[styles.progressFilename, { color: colors.text }]}>
            {upload.filename}
          </Text>

          <Text style={[styles.progressDescription, { color: colors.secondary }]}>
            {processing ? "Procesando el documento en FastAPI…" : "Enviando documento…"}
          </Text>
        </View>

        {processing ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Text style={[styles.progressNumber, { color: colors.accent }]}>
            {Math.round(upload.fraction * 100)}%
          </Text>
        )}
      </View>

      <View style={[styles.progressTrack, { backgroundColor: isDark ? "#39354E" : "#E9E5F3" }]}>
        <Animated.View style={[styles.progressFill, { width, backgroundColor: colors.primary }]} />
      </View>
    </MotionPanel>
  );
}

function DocumentRow({ document, index, colors, onPress }: {
  document: StudyDocument;
  index: number;
  colors: Palette;
  onPress: () => void;
}) {
  const delay = Math.min(index, 6) * 80;

  return (
    <MotionView delay={680 + delay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${document.filename}`}
        onPress={onPress}
        style={({ pressed }) => [styles.documentRow, { opacity: pressed ? 0.66 : 1 }]}
      >
        <MotionIcon delay={740 + delay}>
          <View style={[styles.documentIcon, { backgroundColor: colors.softAccent }]}>
            <FileText size={20} strokeWidth={1.7} color={colors.accent} />
          </View>
        </MotionIcon>

        <View style={styles.documentText}>
          <MotionText
            text={document.filename}
            delay={780 + delay}
            numberOfLines={2}
            style={[styles.documentName, { color: colors.text }]}
          />

          <MotionText
            text={
              `${document.pages_with_text} páginas · ` +
              formatDocumentSize(document.size_bytes)
            }
            delay={865 + delay}
            style={[styles.documentMeta, { color: colors.secondary }]}
          />
        </View>

        <ChevronRight size={17} color={colors.tertiary} strokeWidth={1.8} />
      </Pressable>
    </MotionView>
  );
}

export default function DocumentsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const colors = getDashboardPalette(isDark);

  const uploadLock = useRef(false);
  const lastProgressUpdate = useRef(0);

  const [data, setData] =
    useState<DocumentsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [upload, setUpload] =
    useState<UploadState | null>(null);

  const [uploadError, setUploadError] = useState("");
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getStudyDocuments(PAGE_SIZE, 0).then((result) => {
        if (!active) return;

        setData(result);
        setListError("");
      })
        .catch((caught: unknown) => {
          if (!active) return;

          setListError(
            caught instanceof Error ? caught.message : "No se pudo cargar la biblioteca.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  async function refresh() {
    if (refreshing || fetchingMore) return;

    setRefreshing(true);

    try {
      const result = await getStudyDocuments(PAGE_SIZE, 0);

      setData(result);
      setListError("");
      setRevision((value) => value + 1);
    } catch (caught) {
      setListError(
        caught instanceof Error ? caught.message : "No se pudo actualizar la biblioteca.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (
      !data || fetchingMore || data.documents.length >= data.count
    ) {
      return;
    }

    setFetchingMore(true);

    try {
      const result = await getStudyDocuments(
        PAGE_SIZE,
        data.documents.length,
      );

      setData((previous) =>
        previous ? { ...result, documents: [...previous.documents, ...result.documents] } : result,
      );

      setListError("");
    } catch (caught) {
      setListError(
        caught instanceof Error ? caught.message : "No se pudieron cargar más documentos.",
      );
    } finally {
      setFetchingMore(false);
    }
  }

  async function selectPdf() {
    if (uploadLock.current) return;

    uploadLock.current = true;
    setUploadBusy(true);
    let requestStarted = false;

    try {
      const result =
        await DocumentPicker.getDocumentAsync({ type: "application/pdf", multiple: false, copyToCacheDirectory: true });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      validatePdfAsset(asset);

      setUploadError("");
      lastProgressUpdate.current = 0;

      setUpload({ filename: asset.name, fraction: 0, stage: "uploading" });

      requestStarted = true;

      const response = await uploadStudyPdf(
        asset,
        ({ fraction }) => {
          const now = Date.now();

          if (
            fraction < 1 && now - lastProgressUpdate.current < 100
          ) {
            return;
          }

          lastProgressUpdate.current = now;

          setUpload({ filename: asset.name, fraction, stage: fraction >= 0.999 ? "processing" : "uploading" });
        },
      );

      router.push({ pathname: "/document/[id]", params: { id: String(response.document_id) } });
    } catch (caught) {
      let message =
        caught instanceof Error ? caught.message : "No se pudo completar la subida.";

      if (requestStarted) {
        try {
          const latest = await getStudyDocuments(PAGE_SIZE, 0);

          setData(latest);
          setRevision((value) => value + 1);
        } catch {
          // Conservamos el error original.
        }

        message += "\n\nRevisa si el PDF ya aparece en tu biblioteca antes de volver a subirlo.";
      }

      setUploadError(message);
    } finally {
      setUpload(null);
      uploadLock.current = false;
      setUploadBusy(false);
    }
  }

  function openDocument(id: number | string) {
    router.push({ pathname: "/document/[id]", params: { id: String(id) } });
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundEnd]} style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <TabScene>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={colors.accent}
              />
            }
          >
            <View style={styles.heading}>
              <MotionText text="Documentos" style={[styles.title, { color: colors.text }]} />

              <MotionText
                text="Todo tu material de estudio, en un lugar."
                delay={130}
                style={[styles.subtitle, { color: colors.secondary }]}
              />
            </View>

            <UploadCard
              colors={colors}
              isDark={isDark}
              busy={uploadBusy}
              onPress={() => void selectPdf()}
            />

            {upload && (<UploadProgress upload={upload} colors={colors} isDark={isDark} />)}

            {uploadError ? (
              <MotionPanel style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                <Text style={[styles.errorTitle, { color: colors.text }]}>
                  No se completó la operación
                </Text>

                <Text style={[styles.errorMessage, { color: colors.secondary }]}>
                  {uploadError}
                </Text>
              </MotionPanel>
            ) : null}

            <View style={styles.library}>
              {/* Encabezado de biblioteca */}
              <View style={styles.libraryHeading}>
                <View style={styles.libraryTitleRow}>
                  <MotionText text="Tu biblioteca" delay={280} style={[styles.libraryTitle, { color: colors.text }]} />

                  {data && (
                    <MotionView delay={400} style={[styles.count, { backgroundColor: colors.softAccent }]}>
                      <Text style={[styles.countText, { color: colors.accent }]}>
                        {data.count}
                      </Text>
                    </MotionView>
                  )}
                </View>

                {/* Accesos a cuestionarios y progreso */}
                <View style={styles.libraryActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos mis cuestionarios"
                    onPress={() => router.push("/quizzes")}
                    style={({ pressed }) => [
                      styles.quizzesLink,
                      { backgroundColor: colors.softAccent, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <BookOpenCheck size={16} color={colors.accent} strokeWidth={1.8} />
                    <Text style={[styles.quizzesLinkText, { color: colors.accent }]}>
                      Cuestionarios
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver mi progreso académico"
                    onPress={() => router.push("/progress")}
                    style={({ pressed }) => [
                      styles.quizzesLink,
                      { backgroundColor: colors.softAccent, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <ChartNoAxesCombined size={16} color={colors.accent} strokeWidth={1.8} />
                    <Text style={[styles.quizzesLinkText, { color: colors.accent }]}>
                      Progreso
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Error al consultar documentos */}
              {listError && (
                <View style={[styles.listError, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.errorMessage, { color: colors.secondary }]}>
                    {listError}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void refresh()}
                  >
                    <Text style={[styles.retryText, { color: colors.accent }]}>
                      Actualizar
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Estado de carga */}
              {loading && !data ? (
                <View style={styles.skeletons}>
                  <SkeletonBlock height={70} radius={18} isDark={isDark} />
                  <SkeletonBlock height={70} radius={18} isDark={isDark} />
                </View>
              ) : data?.documents.length ? (
                /* Listado de documentos */
                <MotionPanel
                  key={`documents-${revision}`}
                  delay={370}
                  style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                >
                  {data.documents.map((document, index) => (
                    <View key={document.id}>
                      {index > 0 && (
                        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                      )}

                      <DocumentRow
                        document={document}
                        index={index}
                        colors={colors}
                        onPress={() => openDocument(document.id)}
                      />
                    </View>
                  ))}

                  {/* Paginación */}
                  {data.documents.length < data.count && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={fetchingMore}
                      onPress={() => void loadMore()}
                      style={styles.moreButton}
                    >
                      {fetchingMore ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <>
                          <Text style={[styles.moreText, { color: colors.accent }]}>
                            Cargar más
                          </Text>
                          <ChevronDown size={17} color={colors.accent} />
                        </>
                      )}
                    </Pressable>
                  )}
                </MotionPanel>
              ) : !loading && !listError ? (
                /* Estado vacío */
                <MotionPanel
                  delay={370}
                  style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                  contentStyle={styles.emptyContent}
                >
                  <MotionIcon delay={880}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.softAccent }]}>
                      <FileText size={21} color={colors.accent} strokeWidth={1.8} />
                    </View>
                  </MotionIcon>

                  <View style={styles.emptyCopy}>
                    <MotionText
                      text="Todavía no hay documentos"
                      delay={930}
                      style={[styles.emptyTitle, { color: colors.text }]}
                    />

                    <MotionText
                      text="Tu primer PDF aparecerá aquí."
                      delay={1030}
                      style={[styles.emptyDescription, { color: colors.secondary }]}
                    />
                  </View>
                </MotionPanel>
              ) : null}
            </View>
          </ScrollView>
        </TabScene>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 42, gap: 22 },
  heading: { gap: 5 },
  title: { ...typography, fontSize: 29, fontWeight: "800", letterSpacing: -0.9 },
  subtitle: { ...typography, fontSize: 14, lineHeight: 22 },
  uploadCard: { borderRadius: 22, borderWidth: 1, padding: 18 },
  uploadContent: { gap: 16 },
  uploadHeading: { flexDirection: "row", alignItems: "center", gap: 13 },
  uploadSymbol: { width: 51, height: 51, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  uploadHeadingCopy: { flex: 1, minWidth: 0, gap: 5, justifyContent: "center" },
  uploadTitle: { ...typography, fontSize: 16, fontWeight: "800", letterSpacing: -0.35, lineHeight: 21 },
  uploadDescription: { ...typography, fontSize: 12, lineHeight: 18 },
  uploadDivider: { height: StyleSheet.hairlineWidth },
  uploadMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  formatPill: { minHeight: 27, borderRadius: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  formatDot: { width: 6, height: 6, borderRadius: 3 },
  formatLabel: { ...typography, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  uploadMetaText: { ...typography, fontSize: 11, lineHeight: 16 },
  uploadButton: { minHeight: 50, borderRadius: 14, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  uploadButtonLeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  uploadButtonText: { ...typography, fontSize: 14, fontWeight: "800" },
  progressCard: { padding: 15, borderRadius: 18, borderWidth: 1 },
  progressTop: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 },
  progressIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  progressCopy: { flex: 1, minWidth: 0, gap: 5 },
  progressFilename: { ...typography, fontSize: 13, fontWeight: "700" },
  progressDescription: { ...typography, fontSize: 11 },
  progressNumber: { ...typography, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  progressTrack: { height: 5, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 8 },
  errorCard: { padding: 16, borderRadius: 17, borderWidth: 1, gap: 7 },
  errorTitle: { ...typography, fontSize: 13, fontWeight: "800" },
  errorMessage: { ...typography, fontSize: 12, lineHeight: 19 },
  library: { gap: 13 },
  libraryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  libraryTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  libraryTitle: { ...typography, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  libraryActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  quizzesLink: { minHeight: 37, paddingHorizontal: 11, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  quizzesLinkText: { ...typography, fontSize: 12, fontWeight: "800" },
  count: { minHeight: 24, paddingHorizontal: 9, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  countText: { ...typography, fontSize: 11, fontWeight: "800" },
  listError: { padding: 15, borderRadius: 16, gap: 12 },
  retryText: { ...typography, fontSize: 12, fontWeight: "800" },
  skeletons: { gap: 9 },
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  documentRow: { minHeight: 73, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  documentIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  documentText: { flex: 1, minWidth: 0, gap: 5, justifyContent: "center" },
  documentName: { ...typography, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  documentMeta: { ...typography, fontSize: 11, lineHeight: 16 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 69 },
  moreButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  moreText: { ...typography, fontSize: 12, fontWeight: "700" },
  empty: { borderRadius: 20, borderWidth: 1, padding: 18 },
  emptyContent: { flexDirection: "row", alignItems: "center", gap: 13 },
  emptyIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyCopy: { flex: 1, minWidth: 0, gap: 5 },
  emptyTitle: { ...typography, fontSize: 13, fontWeight: "800" },
  emptyDescription: { ...typography, fontSize: 12, lineHeight: 18 },
});
