import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { forwardRef, type ComponentProps, type ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { hasMeaningfulStroke, inkStrokeHitTest, normalizedInkPoint, parsePdfInkStrokes } from '@/lib/pdf/annotations';
import { getPdfAnnotations, savePdfAnnotations } from '@/services';
import type { PdfInkPoint, PdfInkStroke, PdfInkTool } from '@/types/database';

type EditorTool = 'HAND' | PdfInkTool | 'ERASER';
type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
type PageSize = { height: number; width: number };
type InkEditorHandle = { clear: () => void; redo: () => void; retry: () => void; undo: () => void };

const PEN_COLORS = ['#252124', '#D14350', '#486FC7', '#4D8C70', '#8067B7'];
const HIGHLIGHTER_COLORS = ['#FFD84D', '#8FD8A5', '#7FB7FF', '#FF9EC4'];
const PEN_WIDTHS = [0.0015, 0.003, 0.0055];
const HIGHLIGHTER_WIDTHS = [0.012, 0.022, 0.035];
const WIDTH_LABELS = ['Thin', 'Medium', 'Thick'];

function drawStroke(context: CanvasRenderingContext2D, stroke: PdfInkStroke, size: PageSize) {
  if (!hasMeaningfulStroke(stroke)) return;
  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.globalAlpha = stroke.tool === 'HIGHLIGHTER' ? 0.34 : 1;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, stroke.width * Math.min(size.width, size.height));
  const first = stroke.points[0];
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(first.x * size.width, first.y * size.height, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }
  context.beginPath();
  context.moveTo(first.x * size.width, first.y * size.height);
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const point = stroke.points[index];
    const middleX = ((previous.x + point.x) / 2) * size.width;
    const middleY = ((previous.y + point.y) / 2) * size.height;
    context.quadraticCurveTo(previous.x * size.width, previous.y * size.height, middleX, middleY);
  }
  const last = stroke.points[stroke.points.length - 1];
  context.lineTo(last.x * size.width, last.y * size.height);
  context.stroke();
  context.restore();
}

function ToolButton({ active, icon, label, onPress }: { active: boolean; icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const palette = useAppTheme();
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.toolButton, { backgroundColor: active ? palette.accentSolid : palette.surface, borderColor: active ? palette.accentSolid : palette.border, opacity: pressed ? 0.75 : 1 }]}>
    <Ionicons color={active ? '#FFFFFF' : palette.text} name={icon} size={19} />
    <Text style={[styles.toolLabel, { color: active ? '#FFFFFF' : palette.text }]}>{label}</Text>
  </Pressable>;
}

const PdfInkCanvas = forwardRef<InkEditorHandle, {
  color: string;
  height: number;
  initialStrokes: PdfInkStroke[];
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onPersist: (strokes: PdfInkStroke[]) => Promise<void>;
  onSaveStateChange: (state: SaveState, error?: string) => void;
  tool: EditorTool;
  width: number;
  widthIndex: number;
}>(function PdfInkCanvas({ color, height, initialStrokes, onHistoryChange, onPersist, onSaveStateChange, tool, width, widthIndex }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<PdfInkStroke[][]>([initialStrokes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draft, setDraft] = useState<PdfInkStroke | null>(null);
  const [erasingPreview, setErasingPreview] = useState<PdfInkStroke[] | null>(null);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const draftRef = useRef<PdfInkStroke | null>(null);
  const erasingPreviewRef = useRef<PdfInkStroke[] | null>(null);
  const erasedIdsRef = useRef(new Set<string>());
  const activePointerRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const lastFailedRef = useRef<PdfInkStroke[] | null>(null);
  const currentStrokes = useMemo(() => history[historyIndex] ?? [], [history, historyIndex]);

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { erasingPreviewRef.current = erasingPreview; }, [erasingPreview]);
  useEffect(() => onHistoryChange(historyIndex > 0, historyIndex < history.length - 1), [history.length, historyIndex, onHistoryChange]);

  const persist = useCallback((strokes: PdfInkStroke[]) => {
    onSaveStateChange('SAVING');
    lastFailedRef.current = null;
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => onPersist(strokes))
      .then(() => { if (mountedRef.current) onSaveStateChange('SAVED'); })
      .catch((error) => {
        lastFailedRef.current = strokes;
        if (mountedRef.current) onSaveStateChange('ERROR', getErrorMessage(error));
      });
  }, [onPersist, onSaveStateChange]);

  const commit = useCallback((nextStrokes: PdfInkStroke[]) => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const nextHistory = [...currentHistory.slice(0, currentIndex + 1), nextStrokes].slice(-50);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    persist(nextStrokes);
  }, [persist]);

  const undo = useCallback(() => {
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) return;
    setHistoryIndex(nextIndex);
    persist(historyRef.current[nextIndex]);
  }, [persist]);

  const redo = useCallback(() => {
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex >= historyRef.current.length) return;
    setHistoryIndex(nextIndex);
    persist(historyRef.current[nextIndex]);
  }, [persist]);

  const clear = useCallback(() => {
    if (historyRef.current[historyIndexRef.current].length === 0) return;
    if (window.confirm('Clear every handwritten mark on this page? You can still undo this action.')) commit([]);
  }, [commit]);

  const retry = useCallback(() => {
    persist(lastFailedRef.current ?? historyRef.current[historyIndexRef.current]);
  }, [persist]);

  useImperativeHandle(ref, () => ({ clear, redo, retry, undo }), [clear, redo, retry, undo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * outputScale));
    canvas.height = Math.max(1, Math.floor(height * outputScale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    context.clearRect(0, 0, width, height);
    const visibleStrokes = erasingPreview ?? currentStrokes;
    visibleStrokes.forEach((stroke) => drawStroke(context, stroke, { height, width }));
    if (draft) drawStroke(context, draft, { height, width });
  }, [currentStrokes, draft, erasingPreview, height, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tool === 'HAND') return;

    const eventPoints = (event: PointerEvent) => {
      const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];
      const rect = canvas.getBoundingClientRect();
      const samples = coalesced.length > 0 ? coalesced : [event];
      return samples.map((sample) => normalizedInkPoint(sample.clientX, sample.clientY, sample.pressure, rect));
    };

    const eraseAt = (point: PdfInkPoint) => {
      const original = historyRef.current[historyIndexRef.current];
      original.forEach((stroke) => {
        if (inkStrokeHitTest(stroke, point, width, height, 18)) erasedIdsRef.current.add(stroke.id);
      });
      const next = original.filter((stroke) => !erasedIdsRef.current.has(stroke.id));
      erasingPreviewRef.current = next;
      setErasingPreview(next);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== 'pen') return;
      event.preventDefault();
      activePointerRef.current = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      const points = eventPoints(event);
      if (tool === 'ERASER') {
        erasedIdsRef.current = new Set();
        eraseAt(points[points.length - 1]);
        return;
      }
      const inkTool = tool as PdfInkTool;
      const widths = inkTool === 'HIGHLIGHTER' ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS;
      const nextDraft: PdfInkStroke = { color, id: randomUUID(), points, tool: inkTool, width: widths[widthIndex] };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointerRef.current !== event.pointerId) return;
      event.preventDefault();
      const points = eventPoints(event);
      if (tool === 'ERASER') {
        points.forEach(eraseAt);
        return;
      }
      const activeDraft = draftRef.current;
      if (!activeDraft || activeDraft.points.length >= 20000) return;
      const nextDraft = { ...activeDraft, points: [...activeDraft.points, ...points].slice(0, 20000) };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    };

    const finishPointer = (event: PointerEvent) => {
      if (activePointerRef.current !== event.pointerId) return;
      event.preventDefault();
      activePointerRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (tool === 'ERASER') {
        const next = erasingPreviewRef.current;
        if (next && next.length !== historyRef.current[historyIndexRef.current].length) commit(next);
        erasingPreviewRef.current = null;
        setErasingPreview(null);
        return;
      }
      const activeDraft = draftRef.current;
      if (activeDraft && hasMeaningfulStroke(activeDraft)) commit([...historyRef.current[historyIndexRef.current], activeDraft]);
      draftRef.current = null;
      setDraft(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', finishPointer);
    canvas.addEventListener('pointercancel', finishPointer);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', finishPointer);
      canvas.removeEventListener('pointercancel', finishPointer);
    };
  }, [color, commit, height, tool, width, widthIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, undo]);

  return <canvas
    aria-label="PDF handwriting layer"
    ref={canvasRef}
    style={{
      cursor: tool === 'ERASER' ? 'cell' : 'crosshair',
      height,
      inset: 0,
      mixBlendMode: 'multiply',
      pointerEvents: tool === 'HAND' ? 'none' : 'auto',
      position: 'absolute',
      touchAction: 'none',
      width,
      zIndex: 2,
    }}
  />;
});

export function PdfAnnotationWorkspace({ children, height, materialId, pageNumber, width }: { children: ReactNode; height: number; materialId: string; pageNumber: number; width: number }) {
  const palette = useAppTheme();
  const queryClient = useQueryClient();
  const editorRef = useRef<InkEditorHandle | null>(null);
  const [tool, setTool] = useState<EditorTool>('HAND');
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [widthIndex, setWidthIndex] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('IDLE');
  const [saveError, setSaveError] = useState<string | null>(null);
  const pageKey = ['pdf-annotations', materialId, pageNumber] as const;
  const annotations = useQuery({ queryKey: pageKey, queryFn: () => getPdfAnnotations(materialId, pageNumber), staleTime: 60_000 });

  const chooseTool = (nextTool: EditorTool) => {
    setTool(nextTool);
    if (nextTool === 'HIGHLIGHTER' && !HIGHLIGHTER_COLORS.includes(color)) setColor(HIGHLIGHTER_COLORS[0]);
    if (nextTool === 'PEN' && !PEN_COLORS.includes(color)) setColor(PEN_COLORS[0]);
  };

  const persist = useCallback(async (strokes: PdfInkStroke[]) => {
    const saved = await savePdfAnnotations(materialId, pageNumber, strokes);
    queryClient.setQueryData(['pdf-annotations', materialId, pageNumber], saved);
  }, [materialId, pageNumber, queryClient]);

  const onSaveStateChange = useCallback((state: SaveState, error?: string) => {
    setSaveState(state);
    setSaveError(error ?? null);
  }, []);
  const onHistoryChange = useCallback((undo: boolean, redo: boolean) => { setCanUndo(undo); setCanRedo(redo); }, []);
  const colors = tool === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const editorReady = annotations.isFetched && !annotations.error;

  return <View style={styles.workspace}>
    <View style={[styles.toolbar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.toolGroup}>
        <ToolButton active={tool === 'HAND'} icon="hand-left-outline" label="Read" onPress={() => chooseTool('HAND')} />
        <ToolButton active={tool === 'PEN'} icon="pencil-outline" label="Pen" onPress={() => chooseTool('PEN')} />
        <ToolButton active={tool === 'HIGHLIGHTER'} icon="brush-outline" label="Highlight" onPress={() => chooseTool('HIGHLIGHTER')} />
        <ToolButton active={tool === 'ERASER'} icon="remove-circle-outline" label="Erase" onPress={() => chooseTool('ERASER')} />
      </View>
      <View style={styles.actionGroup}>
        <Pressable accessibilityLabel="Undo annotation" disabled={!canUndo} onPress={() => editorRef.current?.undo()} style={[styles.iconButton, { borderColor: palette.border, opacity: canUndo ? 1 : 0.35 }]}><Ionicons color={palette.text} name="arrow-undo-outline" size={20} /></Pressable>
        <Pressable accessibilityLabel="Redo annotation" disabled={!canRedo} onPress={() => editorRef.current?.redo()} style={[styles.iconButton, { borderColor: palette.border, opacity: canRedo ? 1 : 0.35 }]}><Ionicons color={palette.text} name="arrow-redo-outline" size={20} /></Pressable>
        <Pressable accessibilityLabel="Clear page annotations" onPress={() => editorRef.current?.clear()} style={[styles.iconButton, { borderColor: palette.border }]}><Ionicons color={palette.danger} name="trash-outline" size={19} /></Pressable>
      </View>
      {tool === 'PEN' || tool === 'HIGHLIGHTER' ? <View style={[styles.options, { borderTopColor: palette.border }]}>
        <View style={styles.colors}>{colors.map((option) => <Pressable accessibilityLabel={`Use ${option} ink`} accessibilityRole="button" key={option} onPress={() => setColor(option)} style={[styles.colorOuter, { borderColor: color === option ? palette.accentStrong : 'transparent' }]}><View style={[styles.colorDot, { backgroundColor: option }]} /></Pressable>)}</View>
        <View style={styles.widths}>{WIDTH_LABELS.map((label, index) => <Pressable accessibilityLabel={`${label} stroke`} key={label} onPress={() => setWidthIndex(index)} style={[styles.widthButton, { backgroundColor: widthIndex === index ? palette.accentSoft : palette.surfaceAlt }]}><Text style={[styles.widthLabel, { color: widthIndex === index ? palette.accentStrong : palette.textMuted }]}>{label}</Text></Pressable>)}</View>
      </View> : null}
      <View style={[styles.statusRow, { borderTopColor: palette.border }]}>
        <Text style={[styles.hint, { color: palette.textMuted }]}>{tool === 'HAND' ? 'Read mode: swipe to scroll. Choose Pen or Highlight to write on the page.' : tool === 'ERASER' ? 'Drag over a mark to erase its whole stroke.' : 'Draw directly on the PDF. Switch to Read when you want to scroll.'}</Text>
        <Text style={[styles.saveStatus, { color: saveState === 'ERROR' ? palette.danger : saveState === 'SAVED' ? palette.success : palette.textMuted }]}>{annotations.isLoading ? 'Loading ink…' : saveState === 'SAVING' ? 'Saving…' : saveState === 'SAVED' ? 'Saved' : saveState === 'ERROR' ? 'Not saved' : 'Ready'}</Text>
      </View>
      {annotations.error ? <View style={styles.errorRow}><Text style={[styles.errorText, { color: palette.danger }]}>Could not load handwritten marks: {getErrorMessage(annotations.error)}</Text><Pressable onPress={() => void annotations.refetch()}><Text style={[styles.retry, { color: palette.accentStrong }]}>Try again</Text></Pressable></View> : null}
      {saveState === 'ERROR' ? <View style={styles.errorRow}><Text style={[styles.errorText, { color: palette.danger }]}>Could not save: {saveError}</Text><Pressable onPress={() => editorRef.current?.retry()}><Text style={[styles.retry, { color: palette.accentStrong }]}>Retry</Text></Pressable></View> : null}
    </View>
    <div style={{ height, position: 'relative', width }}>
      {children}
      {editorReady && width > 0 && height > 0 ? <PdfInkCanvas
        color={color}
        height={height}
        initialStrokes={parsePdfInkStrokes(annotations.data?.strokes)}
        key={`${materialId}:${pageNumber}`}
        onHistoryChange={onHistoryChange}
        onPersist={persist}
        onSaveStateChange={onSaveStateChange}
        ref={editorRef}
        tool={tool}
        width={width}
        widthIndex={widthIndex}
      /> : null}
    </div>
  </View>;
}

const styles = StyleSheet.create({
  workspace: { alignItems: 'flex-start', gap: spacing.sm, width: '100%' },
  toolbar: { alignSelf: 'center', borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, maxWidth: 760, padding: spacing.sm, width: '100%' },
  toolGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionGroup: { flexDirection: 'row', gap: spacing.xs },
  toolButton: { alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 40, paddingHorizontal: spacing.sm },
  toolLabel: { ...typography.caption, fontSize: 12 },
  iconButton: { alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  options: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', paddingTop: spacing.sm },
  colors: { flexDirection: 'row', gap: spacing.xs },
  colorOuter: { alignItems: 'center', borderRadius: 18, borderWidth: 2, height: 34, justifyContent: 'center', width: 34 },
  colorDot: { borderRadius: 12, height: 24, width: 24 },
  widths: { flexDirection: 'row', gap: spacing.xs },
  widthButton: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  widthLabel: typography.caption,
  statusRow: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingTop: spacing.sm },
  hint: { ...typography.caption, flex: 1 },
  saveStatus: { ...typography.caption, fontWeight: '700' },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  errorText: { ...typography.caption, flex: 1 },
  retry: { ...typography.caption, fontWeight: '700' },
});
