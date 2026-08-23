// Web implementation. Metro selects PdfReader.native.tsx on iOS and Android.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PdfNotesPanel } from '@/components/materials/PdfNotesPanel';
import { PdfAnnotationWorkspace } from '@/components/materials/PdfAnnotationWorkspace';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { keys } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { clampPdfPage, pdfReadingProgress } from '@/lib/pdf/progress';
import { getMaterial, getMaterialUrl, updatePdfReadingProgress } from '@/services';
import type { StudyMaterial } from '@/types/database';

export function PdfReader({ initialPage, materialId }: { initialPage?: number; materialId: string }) {
  const palette = useAppTheme();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const material = useQuery({ queryKey: ['material', materialId], queryFn: () => getMaterial(materialId), enabled: Boolean(materialId) });
  const signedUrl = useQuery({
    queryKey: ['material-pdf-url', materialId, material.data?.file_url],
    queryFn: () => getMaterialUrl(material.data!.file_url!, 3600),
    enabled: material.data?.type === 'PDF' && Boolean(material.data.file_url),
    meta: { persist: false },
    staleTime: 45 * 60 * 1000,
  });
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [resumedFromPage, setResumedFromPage] = useState<number | null>(null);
  const [jumpPage, setJumpPage] = useState('1');
  const [rendering, setRendering] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ height: 0, width: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const renderTask = useRef<RenderTask | null>(null);
  const initialized = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const patchMaterialCache = useCallback((page: number, pageCount: number, openedAt: string) => {
    const patch = (item: StudyMaterial) => item.id === materialId ? { ...item, last_opened_at: openedAt, last_read_page: page, page_count: pageCount } : item;
    queryClient.setQueryData<StudyMaterial[]>(keys.materials, (items) => items?.map(patch));
    queryClient.setQueryData<StudyMaterial>(['material', materialId], (item) => item ? patch(item) : item);
  }, [materialId, queryClient]);

  const persistPosition = useCallback((page: number, pageCount: number) => {
    const openedAt = new Date().toISOString();
    patchMaterialCache(page, pageCount, openedAt);
    setSaveError(null);
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const saved = await updatePdfReadingProgress(materialId, page, pageCount);
        patchMaterialCache(saved.last_read_page, saved.page_count, saved.last_opened_at);
      })
      .catch((error) => setSaveError(getErrorMessage(error)));
  }, [materialId, patchMaterialCache]);

  useEffect(() => {
    if (!signedUrl.data) return;
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setReaderError(null);
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      loadingTask = pdfjs.getDocument({ url: signedUrl.data });
      const loadedDocument = await loadingTask.promise;
      if (!active) return;
      setDocument(loadedDocument);
      if (!initialized.current) {
        initialized.current = true;
        const savedPage = clampPdfPage(material.data?.last_read_page ?? 1, loadedDocument.numPages);
        const hasRequestedPage = initialPage !== undefined;
        const openingPage = hasRequestedPage ? clampPdfPage(initialPage, loadedDocument.numPages) : savedPage;
        setResumedFromPage(!hasRequestedPage && savedPage > 1 ? savedPage : null);
        setCurrentPage(openingPage);
        setJumpPage(String(openingPage));
        persistPosition(openingPage, loadedDocument.numPages);
      }
    })().catch((error) => { if (active) setReaderError(getErrorMessage(error)); });
    return () => {
      active = false;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [initialPage, material.data?.last_read_page, persistPosition, signedUrl.data]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setRendering(true);
      setReaderError(null);
      const page = await document.getPage(currentPage);
      const unscaled = page.getViewport({ scale: 1 });
      const availableWidth = Math.min(Math.max(width - 32, 280), 980);
      const fitScale = Math.min(availableWidth / unscaled.width, 2);
      const scale = fitScale * zoom;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setPageSize({ height: Math.floor(viewport.height), width: Math.floor(viewport.width) });
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The browser could not create the PDF canvas.');
      renderTask.current?.cancel();
      renderTask.current = page.render({ canvas, canvasContext: context, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0], viewport });
      await renderTask.current.promise;
      if (active) setRendering(false);
    })().catch((error) => {
      if (active && (error as { name?: string }).name !== 'RenderingCancelledException') {
        setReaderError(getErrorMessage(error));
        setRendering(false);
      }
    });
    return () => { active = false; renderTask.current?.cancel(); };
  }, [currentPage, document, width, zoom]);

  const goToPage = (page: number) => {
    if (!document) return;
    const nextPage = clampPdfPage(page, document.numPages);
    setCurrentPage(nextPage);
    setJumpPage(String(nextPage));
    persistPosition(nextPage, document.numPages);
  };

  if (material.isLoading) return <FeedbackState loading message="Checking your private material." title="Opening PDF reader" />;
  if (material.error) return <FeedbackState actionLabel="Try again" message={getErrorMessage(material.error)} onAction={() => void material.refetch()} title="Could not load this PDF" />;
  if (!material.data || material.data.type !== 'PDF' || !material.data.file_url) return <FeedbackState message="This material is not a stored PDF." title="PDF unavailable" />;
  if (signedUrl.isLoading || (!document && !readerError)) return <FeedbackState loading message="Creating a secure reader link and loading the document." title="Opening PDF" />;
  if (signedUrl.error || readerError || !document) return <FeedbackState actionLabel="Try again" message={readerError ?? getErrorMessage(signedUrl.error)} onAction={() => void signedUrl.refetch()} title="Could not open this PDF" />;

  const progress = pdfReadingProgress(currentPage, document.numPages);
  return <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: palette.background }]}>
    <ScrollView contentContainerStyle={styles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
      <ScreenHeader back description={material.data.file_name ?? 'Private PDF'} title={material.data.title} />
      {resumedFromPage ? <View style={[styles.resume, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}><View style={styles.resumeCopy}><Text style={[styles.resumeTitle, { color: palette.text }]}>Resumed from page {resumedFromPage}</Text><Text style={[styles.caption, { color: palette.textMuted }]}>Your reading position saves as you move through pages.</Text></View><AppButton label="Start over" onPress={() => { setResumedFromPage(null); goToPage(1); }} variant="ghost" /></View> : null}
      <View style={styles.progressHeader}><Text style={[styles.pageLabel, { color: palette.text }]}>Page {currentPage} of {document.numPages}</Text><Text style={[styles.progressLabel, { color: palette.accentStrong }]}>{progress}% read</Text></View>
      <View style={[styles.progressTrack, { backgroundColor: palette.border }]}><View style={[styles.progressFill, { backgroundColor: palette.accentSolid, width: `${progress}%` }]} /></View>
      <View style={styles.zoomControls}>
        <Text style={[styles.zoomTitle, { color: palette.text }]}>Page tools</Text>
        <View style={styles.zoomActions}>
          <AppButton accessibilityLabel="Zoom out" disabled={zoom <= 0.75} label="−" onPress={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))} style={styles.zoomButton} variant="secondary" />
          <Pressable accessibilityLabel="Reset zoom" accessibilityRole="button" onPress={() => setZoom(1)} style={[styles.zoomValue, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.zoomText, { color: palette.text }]}>{Math.round(zoom * 100)}%</Text></Pressable>
          <AppButton accessibilityLabel="Zoom in" disabled={zoom >= 2.5} label="+" onPress={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))} style={styles.zoomButton} variant="secondary" />
        </View>
      </View>
      <View style={[styles.viewer, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        {rendering ? <Text style={[styles.rendering, { color: palette.textMuted }]}>Rendering page…</Text> : null}
        <PdfAnnotationWorkspace height={pageSize.height} materialId={materialId} pageNumber={currentPage} width={pageSize.width}>
          <canvas aria-label={`Page ${currentPage} of ${document.numPages}`} ref={canvasRef} style={{ display: 'block' }} />
        </PdfAnnotationWorkspace>
      </View>
      <View style={styles.navigation}><AppButton disabled={currentPage <= 1} label="Previous" onPress={() => goToPage(currentPage - 1)} style={styles.navButton} variant="secondary" /><AppButton disabled={currentPage >= document.numPages} label="Next" onPress={() => goToPage(currentPage + 1)} style={styles.navButton} /></View>
      <View style={styles.jump}><View style={styles.jumpField}><FormField keyboardType="number-pad" label="Jump to page" onChangeText={setJumpPage} onSubmitEditing={() => goToPage(Number(jumpPage))} returnKeyType="go" value={jumpPage} /></View><AppButton label="Go" onPress={() => goToPage(Number(jumpPage))} style={styles.goButton} variant="secondary" /></View>
      {saveError ? <Text style={[styles.saveError, { color: palette.danger }]}>Reading position could not be saved: {saveError}</Text> : null}
      <PdfNotesPanel currentPage={currentPage} material={material.data} onJumpToPage={(page) => { goToPage(page); scrollRef.current?.scrollTo({ animated: true, y: 0 }); }} pageCount={document.numPages} />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, width: '100%' },
  resume: { alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  resumeCopy: { flex: 1, gap: spacing.xs },
  resumeTitle: { ...typography.sectionTitle, fontSize: 17 },
  caption: typography.caption,
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  pageLabel: typography.sectionTitle,
  progressLabel: typography.label,
  progressTrack: { borderRadius: radii.pill, height: 8, marginBottom: spacing.md, overflow: 'hidden' },
  progressFill: { borderRadius: radii.pill, height: '100%' },
  zoomControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  zoomTitle: typography.label,
  zoomActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  zoomButton: { minHeight: 40, minWidth: 44, paddingHorizontal: spacing.sm },
  zoomValue: { alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, height: 40, justifyContent: 'center', minWidth: 66, paddingHorizontal: spacing.sm },
  zoomText: typography.label,
  viewer: { alignItems: 'stretch', borderRadius: radii.lg, borderWidth: 1, minHeight: 420, overflow: 'scroll', padding: spacing.sm },
  rendering: { ...typography.caption, padding: spacing.sm },
  navigation: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  navButton: { flex: 1 },
  jump: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  jumpField: { flex: 1 },
  goButton: { minWidth: 88 },
  saveError: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
