// Web implementation. Metro selects PdfReader.native.tsx on iOS and Android.
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { annotatedPdfFileName, createAnnotatedPdf, downloadPdf } from '@/lib/pdf/export';
import { clampPdfPage, pdfReadingProgress, scalePdfZoom } from '@/lib/pdf/progress';
import { getMaterial, getMaterialUrl, listPdfAnnotations, updatePdfReadingProgress } from '@/services';
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
  const [focusMode, setFocusMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const renderTask = useRef<RenderTask | null>(null);
  const initialized = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const fullscreenRequested = useRef(false);

  const enterFocusMode = useCallback(() => {
    setFocusMode(true);
    const request = globalThis.document.documentElement.requestFullscreen?.();
    if (request) void request.then(() => { fullscreenRequested.current = true; }).catch(() => undefined);
  }, []);

  const exitFocusMode = useCallback(() => {
    setFocusMode(false);
    fullscreenRequested.current = false;
    if (globalThis.document.fullscreenElement) void globalThis.document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !globalThis.document.fullscreenElement) exitFocusMode(); };
    const onFullscreenChange = () => {
      if (fullscreenRequested.current && !globalThis.document.fullscreenElement) {
        fullscreenRequested.current = false;
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    globalThis.document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      globalThis.document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      globalThis.document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [exitFocusMode, focusMode]);

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
      const availableWidth = focusMode ? Math.max(width - 16, 280) : Math.min(Math.max(width - 32, 280), 980);
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
  }, [currentPage, document, focusMode, width, zoom]);

  const goToPage = (page: number) => {
    if (!document) return;
    const nextPage = clampPdfPage(page, document.numPages);
    setCurrentPage(nextPage);
    setJumpPage(String(nextPage));
    persistPosition(nextPage, document.numPages);
  };

  const pinchZoom = useCallback((distanceRatio: number) => {
    setZoom((currentZoom) => scalePdfZoom(currentZoom, distanceRatio));
  }, []);

  const exportAnnotatedPdf = useCallback(async () => {
    if (exporting || !signedUrl.data || !material.data) return;
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const [sourceResponse, annotations] = await Promise.all([
        fetch(signedUrl.data, { cache: 'no-store' }),
        listPdfAnnotations(materialId),
      ]);
      if (!sourceResponse.ok) throw new Error('The private source file could not be opened. Refresh the reader and try again.');
      const exported = await createAnnotatedPdf(await sourceResponse.arrayBuffer(), annotations);
      const fileName = annotatedPdfFileName(material.data.file_name, material.data.title);
      downloadPdf(exported.bytes, fileName);
      setExportSuccess(exported.strokeCount > 0
        ? `Downloaded ${fileName} with ${exported.strokeCount} saved mark${exported.strokeCount === 1 ? '' : 's'} across ${exported.annotatedPageCount} page${exported.annotatedPageCount === 1 ? '' : 's'}.`
        : `Downloaded ${fileName}. No saved handwritten marks were found.`);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }, [exporting, material.data, materialId, signedUrl.data]);

  if (material.isLoading) return <FeedbackState loading message="Checking your private material." title="Opening PDF reader" />;
  if (material.error) return <FeedbackState actionLabel="Try again" message={getErrorMessage(material.error)} onAction={() => void material.refetch()} title="Could not load this PDF" />;
  if (!material.data || material.data.type !== 'PDF' || !material.data.file_url) return <FeedbackState message="This material is not a stored PDF." title="PDF unavailable" />;
  if (signedUrl.isLoading || (!document && !readerError)) return <FeedbackState loading message="Creating a secure reader link and loading the document." title="Opening PDF" />;
  if (signedUrl.error || readerError || !document) return <FeedbackState actionLabel="Try again" message={readerError ?? getErrorMessage(signedUrl.error)} onAction={() => void signedUrl.refetch()} title="Could not open this PDF" />;

  const progress = pdfReadingProgress(currentPage, document.numPages);
  const workspace = <PdfAnnotationWorkspace exportError={exportError} exporting={exporting} exportSuccess={exportSuccess} focusMode={focusMode} height={pageSize.height} materialId={materialId} onExport={() => void exportAnnotatedPdf()} onPinchZoom={pinchZoom} pageNumber={currentPage} width={pageSize.width}>
    <canvas aria-label={`Page ${currentPage} of ${document.numPages}`} ref={canvasRef} style={{ display: 'block' }} />
  </PdfAnnotationWorkspace>;

  if (focusMode) return <div style={{ background: palette.surfaceAlt, display: 'flex', flexDirection: 'column', height: '100dvh', inset: 0, paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)', position: 'fixed', width: '100vw', zIndex: 1000 }}>
    <View style={[styles.focusHeader, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
      <Pressable accessibilityLabel="Exit full-screen annotation" accessibilityRole="button" onPress={exitFocusMode} style={[styles.focusIconButton, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}><Ionicons color={palette.accentStrong} name="contract-outline" size={22} /></Pressable>
      <View style={styles.focusTitleGroup}><Text numberOfLines={1} style={[styles.focusTitle, { color: palette.text }]}>{material.data.title}</Text>{width >= 600 ? <Text numberOfLines={1} style={[styles.focusFile, { color: palette.textMuted }]}>{material.data.file_name}</Text> : null}</View>
      <View style={[styles.focusPageTools, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        <Pressable accessibilityLabel="Previous page" disabled={currentPage <= 1} onPress={() => goToPage(currentPage - 1)} style={{ opacity: currentPage <= 1 ? 0.3 : 1 }}><Ionicons color={palette.text} name="chevron-back" size={23} /></Pressable>
        <Text style={[styles.focusPage, { color: palette.text }]}>{currentPage} / {document.numPages}</Text>
        <Pressable accessibilityLabel="Next page" disabled={currentPage >= document.numPages} onPress={() => goToPage(currentPage + 1)} style={{ opacity: currentPage >= document.numPages ? 0.3 : 1 }}><Ionicons color={palette.text} name="chevron-forward" size={23} /></Pressable>
      </View>
      <View style={[styles.focusZoomTools, { borderColor: palette.border }]}>
        <Pressable accessibilityLabel="Zoom out" disabled={zoom <= 0.75} onPress={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))} style={{ opacity: zoom <= 0.75 ? 0.3 : 1 }}><Ionicons color={palette.text} name="remove" size={22} /></Pressable>
        <Pressable accessibilityLabel="Reset zoom" onPress={() => setZoom(1)}><Text style={[styles.focusZoom, { color: palette.text }]}>{Math.round(zoom * 100)}%</Text></Pressable>
        <Pressable accessibilityLabel="Zoom in" disabled={zoom >= 2.5} onPress={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))} style={{ opacity: zoom >= 2.5 ? 0.3 : 1 }}><Ionicons color={palette.text} name="add" size={22} /></Pressable>
      </View>
    </View>
    <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
      {rendering ? <Text style={[styles.rendering, styles.focusRendering, { color: palette.textMuted }]}>Rendering page…</Text> : null}
      {workspace}
    </div>
  </div>;

  return <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: palette.background }]}>
    <ScrollView contentContainerStyle={styles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
      <ScreenHeader back description={material.data.file_name ?? 'Private PDF'} title={material.data.title} />
      {resumedFromPage ? <View style={[styles.resume, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}><View style={styles.resumeCopy}><Text style={[styles.resumeTitle, { color: palette.text }]}>Resumed from page {resumedFromPage}</Text><Text style={[styles.caption, { color: palette.textMuted }]}>Your reading position saves as you move through pages.</Text></View><AppButton label="Start over" onPress={() => { setResumedFromPage(null); goToPage(1); }} variant="ghost" /></View> : null}
      <View style={styles.progressHeader}><Text style={[styles.pageLabel, { color: palette.text }]}>Page {currentPage} of {document.numPages}</Text><Text style={[styles.progressLabel, { color: palette.accentStrong }]}>{progress}% read</Text></View>
      <View style={[styles.progressTrack, { backgroundColor: palette.border }]}><View style={[styles.progressFill, { backgroundColor: palette.accentSolid, width: `${progress}%` }]} /></View>
      <View style={styles.zoomControls}>
        <Pressable accessibilityLabel="Annotate full screen" accessibilityRole="button" onPress={enterFocusMode} style={[styles.focusEntry, { backgroundColor: palette.accentSolid }]}><Ionicons color="#FFFFFF" name="expand-outline" size={18} /><Text style={styles.focusEntryLabel}>Annotate</Text></Pressable>
        <View style={styles.zoomActions}>
          <AppButton accessibilityLabel="Zoom out" disabled={zoom <= 0.75} label="−" onPress={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))} style={styles.zoomButton} variant="secondary" />
          <Pressable accessibilityLabel="Reset zoom" accessibilityRole="button" onPress={() => setZoom(1)} style={[styles.zoomValue, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.zoomText, { color: palette.text }]}>{Math.round(zoom * 100)}%</Text></Pressable>
          <AppButton accessibilityLabel="Zoom in" disabled={zoom >= 2.5} label="+" onPress={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))} style={styles.zoomButton} variant="secondary" />
        </View>
      </View>
      <View style={[styles.viewer, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        {rendering ? <Text style={[styles.rendering, { color: palette.textMuted }]}>Rendering page…</Text> : null}
        {workspace}
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
  focusHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, zIndex: 10 },
  focusIconButton: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  focusTitleGroup: { flex: 1, minWidth: 0 },
  focusTitle: { ...typography.sectionTitle, fontSize: 16 },
  focusFile: typography.caption,
  focusPageTools: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.sm },
  focusPage: { ...typography.label, minWidth: 52, textAlign: 'center' },
  focusZoomTools: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.sm },
  focusZoom: { ...typography.caption, fontWeight: '700', minWidth: 42, textAlign: 'center' },
  focusRendering: { textAlign: 'center' },
  focusEntry: { alignItems: 'center', borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.md },
  focusEntryLabel: { ...typography.label, color: '#FFFFFF' },
});
