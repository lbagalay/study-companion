import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { forwardRef, type ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { hasMeaningfulStroke, inkStrokeHitTest, normalizedInkPoint, parsePdfInkStrokes } from '@/lib/pdf/annotations';
import { getPdfAnnotations, savePdfAnnotations } from '@/services';
import type { PdfInkPoint, PdfInkStroke, PdfInkTool } from '@/types/database';

type DrawingTool = 'FOUNTAIN' | 'PENCIL' | 'BALLPOINT' | 'HIGHLIGHTER';
type EditorTool = 'HAND' | DrawingTool | 'ERASER';
type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
type PageSize = { height: number; width: number };
type InkEditorHandle = { clear: () => void; redo: () => void; retry: () => void; undo: () => void };

const COLOR_SWATCHES = ['#171F26', '#FF6B55', '#FFFFFF', '#6658F5', '#B8F711'];
const TOOL_WIDTHS: Record<DrawingTool, number[]> = {
  FOUNTAIN: [0.0025, 0.004, 0.0065],
  PENCIL: [0.0012, 0.002, 0.0035],
  BALLPOINT: [0.001, 0.0016, 0.0025],
  HIGHLIGHTER: [0.012, 0.022, 0.035],
};

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

function ToolIllustration({ tool }: { tool: EditorTool }) {
  if (tool === 'HAND') return <Ionicons color="#3A3537" name="hand-left-outline" size={27} />;
  if (tool === 'FOUNTAIN') return <svg aria-hidden="true" height="58" viewBox="0 0 32 70" width="30">
    <path d="M16 2 28 26 23 66H9L4 26Z" fill="#F5F4F2" stroke="#918C89" strokeWidth="1.4" />
    <path d="M16 2v31" stroke="#5D5755" strokeWidth="1.5" /><circle cx="16" cy="27" fill="#242124" r="2.5" />
  </svg>;
  if (tool === 'PENCIL') return <svg aria-hidden="true" height="58" viewBox="0 0 30 70" width="28">
    <path d="m15 2 8 17H7Z" fill="#E7CC9D" /><path d="m15 2 3 7h-6Z" fill="#292628" />
    <path d="M7 19h16v48H7Z" fill="#D9B47B" /><path d="M7 19h5v48H7Z" fill="#EACB97" /><path d="M18 19h5v48h-5Z" fill="#B98F57" />
  </svg>;
  if (tool === 'BALLPOINT') return <svg aria-hidden="true" height="58" viewBox="0 0 30 70" width="28">
    <path d="m15 2 6 16H9Z" fill="#373335" /><rect fill="#FAF9F7" height="46" rx="7" width="16" x="7" y="17" />
    <rect fill="#3D393B" height="5" rx="2" width="18" x="6" y="43" /><rect fill="#E7E4E1" height="7" rx="3" width="14" x="8" y="61" />
  </svg>;
  if (tool === 'HIGHLIGHTER') return <svg aria-hidden="true" height="58" viewBox="0 0 32 70" width="30">
    <path d="m8 2 18 6-6 13H6Z" fill="#B060FF" /><path d="M6 20h20v44a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z" fill="#F8F7F5" />
    <rect fill="#8E8A87" height="5" rx="2" width="22" x="5" y="29" /><circle cx="16" cy="52" fill="#B060FF" r="4" />
  </svg>;
  return <svg aria-hidden="true" height="58" viewBox="0 0 32 70" width="30">
    <rect fill="#F6F4F2" height="52" rx="8" stroke="#D8D3CF" width="22" x="5" y="8" /><rect fill="#FF9B92" height="17" rx="6" width="22" x="5" y="45" />
  </svg>;
}

function ToolButton({ active, label, onPress, tool }: { active: boolean; label: string; onPress: () => void; tool: EditorTool }) {
  const palette = useAppTheme();
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.toolButton, { backgroundColor: active ? palette.accentSoft : 'transparent', borderColor: active ? palette.accent : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
    <ToolIllustration tool={tool} />
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

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
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
      const drawingTool = tool as DrawingTool;
      const inkTool: PdfInkTool = drawingTool === 'HIGHLIGHTER' ? 'HIGHLIGHTER' : 'PEN';
      const nextDraft: PdfInkStroke = { color, id: randomUUID(), points, tool: inkTool, width: TOOL_WIDTHS[drawingTool][widthIndex] };
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

export function PdfAnnotationWorkspace({ children, focusMode = false, height, materialId, pageNumber, width }: { children: ReactNode; focusMode?: boolean; height: number; materialId: string; pageNumber: number; width: number }) {
  const palette = useAppTheme();
  const queryClient = useQueryClient();
  const editorRef = useRef<InkEditorHandle | null>(null);
  const customColorRef = useRef<HTMLInputElement | null>(null);
  const [tool, setTool] = useState<EditorTool>('HAND');
  const [lastDrawingTool, setLastDrawingTool] = useState<DrawingTool>('FOUNTAIN');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [widthIndex, setWidthIndex] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('IDLE');
  const [saveError, setSaveError] = useState<string | null>(null);
  const pageKey = ['pdf-annotations', materialId, pageNumber] as const;
  const annotations = useQuery({ queryKey: pageKey, queryFn: () => getPdfAnnotations(materialId, pageNumber), staleTime: 60_000 });

  const chooseTool = (nextTool: EditorTool) => {
    setTool(nextTool);
    if (['FOUNTAIN', 'PENCIL', 'BALLPOINT', 'HIGHLIGHTER'].includes(nextTool)) {
      setLastDrawingTool(nextTool as DrawingTool);
    }
    if (nextTool === 'HIGHLIGHTER' && ['#171F26', '#FFFFFF'].includes(color)) setColor('#FF6B55');
  };

  const chooseColor = (nextColor: string) => {
    setColor(nextColor);
    if (tool === 'HAND' || tool === 'ERASER') chooseTool(lastDrawingTool);
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
  const editorReady = annotations.isFetched && !annotations.error;
  const customColorSelected = !COLOR_SWATCHES.includes(color);
  const toolHint = tool === 'HAND' ? 'Read mode · swipe the page' : tool === 'ERASER' ? 'Stroke eraser · drag over a mark' : `${tool === 'FOUNTAIN' ? 'Fountain pen' : tool === 'PENCIL' ? 'Pencil' : tool === 'BALLPOINT' ? 'Ballpoint pen' : 'Highlighter'} · draw on the page`;

  return <View style={[styles.workspace, focusMode ? styles.focusWorkspace : null]}>
    <div style={{ position: focusMode ? 'sticky' : 'relative', top: 0, width: '100%', zIndex: focusMode ? 5 : 1 }}>
      <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '8px 4px 14px', width: '100%' }}>
        <View style={[styles.toolbar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.actionGroup}>
            <Pressable accessibilityLabel="Undo annotation" disabled={!canUndo} onPress={() => editorRef.current?.undo()} style={[styles.iconButton, { borderColor: palette.border, opacity: canUndo ? 1 : 0.3 }]}><Ionicons color={palette.text} name="arrow-undo-outline" size={25} /></Pressable>
            <Pressable accessibilityLabel="Redo annotation" disabled={!canRedo} onPress={() => editorRef.current?.redo()} style={[styles.iconButton, { borderColor: palette.border, opacity: canRedo ? 1 : 0.3 }]}><Ionicons color={palette.text} name="arrow-redo-outline" size={25} /></Pressable>
          </View>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <View style={styles.toolGroup}>
            <ToolButton active={tool === 'HAND'} label="Read mode" onPress={() => chooseTool('HAND')} tool="HAND" />
            <ToolButton active={tool === 'FOUNTAIN'} label="Fountain pen" onPress={() => chooseTool('FOUNTAIN')} tool="FOUNTAIN" />
            <ToolButton active={tool === 'PENCIL'} label="Pencil" onPress={() => chooseTool('PENCIL')} tool="PENCIL" />
            <ToolButton active={tool === 'BALLPOINT'} label="Ballpoint pen" onPress={() => chooseTool('BALLPOINT')} tool="BALLPOINT" />
            <ToolButton active={tool === 'HIGHLIGHTER'} label="Highlighter" onPress={() => chooseTool('HIGHLIGHTER')} tool="HIGHLIGHTER" />
            <ToolButton active={tool === 'ERASER'} label="Eraser" onPress={() => chooseTool('ERASER')} tool="ERASER" />
          </View>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <View accessibilityLabel="Stroke size" style={styles.sizeRail}>{[0, 1, 2].map((index) => <Pressable accessibilityLabel={`${index === 0 ? 'Thin' : index === 1 ? 'Medium' : 'Thick'} stroke`} accessibilityRole="button" accessibilityState={{ selected: widthIndex === index }} key={index} onPress={() => setWidthIndex(index)} style={[styles.sizeButton, { backgroundColor: widthIndex === index ? palette.accentSoft : 'transparent' }]}><View style={{ backgroundColor: widthIndex === index ? palette.accentStrong : palette.textMuted, borderRadius: radii.pill, height: 2 + index * 2, width: 20 + index * 5 }} /></Pressable>)}</View>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <View style={styles.colorGrid}>
            {COLOR_SWATCHES.map((option) => <Pressable accessibilityLabel={`Use ${option} ink`} accessibilityRole="button" accessibilityState={{ selected: color === option }} key={option} onPress={() => chooseColor(option)} style={[styles.colorOuter, { borderColor: color === option ? palette.text : 'transparent' }]}><View style={[styles.colorDot, { backgroundColor: option, borderColor: option === '#FFFFFF' ? palette.border : option }]} /></Pressable>)}
            <Pressable accessibilityLabel="Choose custom ink color" accessibilityRole="button" accessibilityState={{ selected: customColorSelected }} onPress={() => customColorRef.current?.click()} style={[styles.colorOuter, { borderColor: customColorSelected ? palette.text : 'transparent' }]}><div aria-hidden="true" style={{ alignItems: 'center', background: 'conic-gradient(#ff3b30, #ffcc00, #34c759, #00c7ff, #5856d6, #ff2d55, #ff3b30)', borderRadius: 18, display: 'flex', height: 34, justifyContent: 'center', width: 34 }}><div style={{ background: palette.surface, borderRadius: 7, height: 14, width: 14 }} /></div></Pressable>
            <input aria-label="Custom ink color" onChange={(event) => chooseColor(event.currentTarget.value.toUpperCase())} ref={customColorRef} style={{ display: 'none' }} type="color" value={color} />
          </View>
        </View>
      </div>
      <View style={styles.statusRow}>
        <Text style={[styles.hint, { color: palette.textMuted }]}>{toolHint}</Text>
        <View style={styles.statusActions}>
          <Text style={[styles.saveStatus, { color: saveState === 'ERROR' ? palette.danger : saveState === 'SAVED' ? palette.success : palette.textMuted }]}>{annotations.isLoading ? 'Loading…' : saveState === 'SAVING' ? 'Saving…' : saveState === 'SAVED' ? 'Saved' : saveState === 'ERROR' ? 'Not saved' : 'Ready'}</Text>
          <Pressable accessibilityLabel="Clear page annotations" onPress={() => editorRef.current?.clear()}><Text style={[styles.clearLabel, { color: palette.danger }]}>Clear page</Text></Pressable>
        </View>
      </View>
      {annotations.error ? <View style={styles.errorRow}><Text style={[styles.errorText, { color: palette.danger }]}>Could not load handwritten marks: {getErrorMessage(annotations.error)}</Text><Pressable onPress={() => void annotations.refetch()}><Text style={[styles.retry, { color: palette.accentStrong }]}>Try again</Text></Pressable></View> : null}
      {saveState === 'ERROR' ? <View style={styles.errorRow}><Text style={[styles.errorText, { color: palette.danger }]}>Could not save: {saveError}</Text><Pressable onPress={() => editorRef.current?.retry()}><Text style={[styles.retry, { color: palette.accentStrong }]}>Retry</Text></Pressable></View> : null}
    </div>
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
  workspace: { alignItems: 'flex-start', gap: spacing.xs, width: '100%' },
  focusWorkspace: { alignItems: 'center' },
  toolbar: { alignItems: 'center', borderRadius: 54, borderWidth: 1, boxShadow: '0 15px 34px rgba(84, 45, 37, 0.18)', flexDirection: 'row', gap: spacing.sm, marginHorizontal: 'auto', minHeight: 104, minWidth: 800, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: 800 },
  toolGroup: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  actionGroup: { flexDirection: 'row', gap: spacing.sm },
  toolButton: { alignItems: 'center', borderBottomWidth: 3, borderRadius: radii.md, borderWidth: 1, height: 84, justifyContent: 'center', paddingHorizontal: 5, width: 58 },
  iconButton: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  divider: { height: 70, marginHorizontal: spacing.xs, width: 1 },
  sizeRail: { gap: 2, justifyContent: 'center', width: 48 },
  sizeButton: { alignItems: 'center', borderRadius: radii.sm, height: 27, justifyContent: 'center', width: 46 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, width: 126 },
  colorOuter: { alignItems: 'center', borderRadius: 22, borderWidth: 3, height: 40, justifyContent: 'center', width: 40 },
  colorDot: { borderRadius: 17, borderWidth: 1, height: 32, width: 32 },
  statusRow: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', maxWidth: 800, paddingHorizontal: spacing.sm, width: '100%' },
  statusActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  hint: { ...typography.caption, flex: 1 },
  saveStatus: { ...typography.caption, fontWeight: '700' },
  clearLabel: { ...typography.caption, fontWeight: '700' },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  errorText: { ...typography.caption, flex: 1 },
  retry: { ...typography.caption, fontWeight: '700' },
});
