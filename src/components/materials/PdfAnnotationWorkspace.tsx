import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { brand, radii, spacing, typography } from '@/constants/theme';

import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { createClientUuid } from '@/lib/ids';
import { createSaveQueue } from '@/lib/pdf/saveQueue';

import {
  hasMeaningfulStroke,
  inkStrokeHitTest,
  normalizedInkPoint,
  parsePdfInkStrokes,
  straightInkPoint,
} from '@/lib/pdf/annotations';

import { getPdfAnnotations, savePdfAnnotations } from '@/services';

import type { PdfInkPoint, PdfInkStroke, PdfInkTool } from '@/types/database';

/* ============================================================
 * TYPES
 * ============================================================
 */

type DrawingTool = 'FOUNTAIN' | 'PENCIL' | 'BALLPOINT' | 'HIGHLIGHTER';

type EditorTool = 'HAND' | DrawingTool | 'ERASER';

type InkMode = 'DRAW' | 'STRAIGHT' | 'RECTANGLE';

type LineStyle = 'SOLID' | 'DASHED' | 'WAVY' | 'ZIGZAG' | 'DOUBLE';

type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';

type PageSize = {
  height: number;
  width: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type StrokeMeta = {
  lineStyle: LineStyle;
  mode: InkMode;
};

type InkEditorHandle = {
  clear: () => void;
  redo: () => void;
  retry: () => void;
  undo: () => void;
};

type PageHandle = InkEditorHandle & {
  reload: () => void;
};

type PageUiState = {
  canRedo: boolean;
  canUndo: boolean;
  loadError: string | null;
  loading: boolean;
  saveError: string | null;
  saveState: SaveState;
};

/* ============================================================
 * CONSTANTS
 * ============================================================
 */

const DEFAULT_PAGE_STATE: PageUiState = {
  canRedo: false,
  canUndo: false,
  loadError: null,
  loading: true,
  saveError: null,
  saveState: 'IDLE',
};

const PEN_COLORS = [brand.ink, brand.navy, brand.slate, '#527CB3', '#A94F63', '#2E7B69'];

const HIGHLIGHTER_COLORS = [
  '#F7D5E5',
  '#E8D5FA',
  '#D8E8FF',
  '#CFEFF5',
  '#DDF3C5',
  '#FFF0AE',
  '#FFD8B8',
  '#F5C7C7',
];

const TOOL_WIDTHS: Record<DrawingTool, number[]> = {
  FOUNTAIN: [0.0025, 0.004, 0.0065],

  PENCIL: [0.0012, 0.002, 0.0035],

  BALLPOINT: [0.001, 0.0016, 0.0025],

  HIGHLIGHTER: [0.012, 0.022, 0.035],
};

const META_PREFIX = 'SCINK';

/* ============================================================
 * HELPERS
 * ============================================================
 */

function isDrawingTool(tool: EditorTool): tool is DrawingTool {
  return ['FOUNTAIN', 'PENCIL', 'BALLPOINT', 'HIGHLIGHTER'].includes(tool);
}

function colorsForTool(tool: EditorTool) {
  return tool === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS : PEN_COLORS;
}

function createStrokeId(mode: InkMode, lineStyle: LineStyle) {
  return [META_PREFIX, mode, lineStyle, createClientUuid()].join(':');
}

function getStrokeMeta(stroke: PdfInkStroke): StrokeMeta {
  const parts = stroke.id.split(':');

  if (parts.length >= 4 && parts[0] === META_PREFIX) {
    const mode = parts[1] as InkMode;

    const lineStyle = parts[2] as LineStyle;

    const modes: InkMode[] = ['DRAW', 'STRAIGHT', 'RECTANGLE'];

    const styles: LineStyle[] = ['SOLID', 'DASHED', 'WAVY', 'ZIGZAG', 'DOUBLE'];

    return {
      mode: modes.includes(mode) ? mode : 'DRAW',

      lineStyle: styles.includes(lineStyle) ? lineStyle : 'SOLID',
    };
  }

  return {
    mode: 'DRAW',
    lineStyle: 'SOLID',
  };
}

/* ============================================================
 * AUTO STRAIGHT
 * ============================================================
 */

function snapStraightPoint(start: PdfInkPoint, end: PdfInkPoint, tool: EditorTool): PdfInkPoint {
  /*
   * Every STRAIGHT stroke is already a
   * perfectly straight start -> end line.
   *
   * Highlighter gets one extra behavior:
   * if user is nearly horizontal, snap
   * perfectly horizontal.
   */

  return straightInkPoint(start, end, tool === 'HIGHLIGHTER');
}

/* ============================================================
 * CANVAS DRAWING
 * ============================================================
 */

function pointToPixels(point: PdfInkPoint, size: PageSize) {
  return {
    x: point.x * size.width,

    y: point.y * size.height,
  };
}

function configureStroke(context: CanvasRenderingContext2D, stroke: PdfInkStroke, size: PageSize) {
  context.strokeStyle = stroke.color;

  context.fillStyle = stroke.color;

  context.globalAlpha = stroke.tool === 'HIGHLIGHTER' ? 0.34 : 1;

  context.lineCap = 'round';

  context.lineJoin = 'round';

  context.lineWidth = Math.max(
    1,

    stroke.width * Math.min(size.width, size.height),
  );
}

function applyDashStyle(context: CanvasRenderingContext2D, lineStyle: LineStyle) {
  if (lineStyle === 'DASHED') {
    context.setLineDash([10, 8]);
  } else {
    context.setLineDash([]);
  }
}

function drawSmoothPath(context: CanvasRenderingContext2D, stroke: PdfInkStroke, size: PageSize) {
  const first = stroke.points[0];

  if (!first) {
    return;
  }

  if (stroke.points.length === 1) {
    context.beginPath();

    context.arc(
      first.x * size.width,

      first.y * size.height,

      context.lineWidth / 2,

      0,

      Math.PI * 2,
    );

    context.fill();

    return;
  }

  context.beginPath();

  context.moveTo(
    first.x * size.width,

    first.y * size.height,
  );

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];

    const current = stroke.points[index];

    const middleX = ((previous.x + current.x) / 2) * size.width;

    const middleY = ((previous.y + current.y) / 2) * size.height;

    context.quadraticCurveTo(
      previous.x * size.width,

      previous.y * size.height,

      middleX,
      middleY,
    );
  }

  const last = stroke.points[stroke.points.length - 1];

  context.lineTo(
    last.x * size.width,

    last.y * size.height,
  );

  context.stroke();
}

function drawWavyLine(
  context: CanvasRenderingContext2D,

  start: {
    x: number;
    y: number;
  },

  end: {
    x: number;
    y: number;
  },
) {
  const dx = end.x - start.x;

  const dy = end.y - start.y;

  const distance = Math.max(1, Math.hypot(dx, dy));

  const normalX = -dy / distance;

  const normalY = dx / distance;

  const steps = Math.max(8, Math.floor(distance / 8));

  const amplitude = Math.max(2, context.lineWidth * 0.35);

  context.beginPath();

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;

    const baseX = start.x + dx * progress;

    const baseY = start.y + dy * progress;

    const wave = Math.sin(progress * Math.PI * 2 * Math.max(2, distance / 24)) * amplitude;

    const x = baseX + normalX * wave;

    const y = baseY + normalY * wave;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
}

function drawZigzagLine(
  context: CanvasRenderingContext2D,

  start: {
    x: number;
    y: number;
  },

  end: {
    x: number;
    y: number;
  },
) {
  const dx = end.x - start.x;

  const dy = end.y - start.y;

  const distance = Math.max(1, Math.hypot(dx, dy));

  const normalX = -dy / distance;

  const normalY = dx / distance;

  const steps = Math.max(
    4,

    Math.floor(distance / 10),
  );

  const amplitude = Math.max(
    2,

    context.lineWidth * 0.45,
  );

  context.beginPath();

  context.moveTo(start.x, start.y);

  for (let index = 1; index < steps; index += 1) {
    const progress = index / steps;

    const direction = index % 2 === 0 ? -1 : 1;

    context.lineTo(
      start.x + dx * progress + normalX * amplitude * direction,

      start.y + dy * progress + normalY * amplitude * direction,
    );
  }

  context.lineTo(end.x, end.y);

  context.stroke();
}

function drawDoubleLine(
  context: CanvasRenderingContext2D,

  start: {
    x: number;
    y: number;
  },

  end: {
    x: number;
    y: number;
  },
) {
  const dx = end.x - start.x;

  const dy = end.y - start.y;

  const distance = Math.max(
    1,

    Math.hypot(dx, dy),
  );

  const normalX = -dy / distance;

  const normalY = dx / distance;

  const offset = Math.max(
    2,

    context.lineWidth * 0.55,
  );

  context.beginPath();

  context.moveTo(
    start.x + normalX * offset,

    start.y + normalY * offset,
  );

  context.lineTo(
    end.x + normalX * offset,

    end.y + normalY * offset,
  );

  context.stroke();

  context.beginPath();

  context.moveTo(
    start.x - normalX * offset,

    start.y - normalY * offset,
  );

  context.lineTo(
    end.x - normalX * offset,

    end.y - normalY * offset,
  );

  context.stroke();
}

function drawStraightStroke(
  context: CanvasRenderingContext2D,

  stroke: PdfInkStroke,

  size: PageSize,

  lineStyle: LineStyle,
) {
  if (stroke.points.length < 2) {
    return;
  }

  const start = pointToPixels(stroke.points[0], size);

  const end = pointToPixels(stroke.points[stroke.points.length - 1], size);

  if (lineStyle === 'WAVY') {
    drawWavyLine(context, start, end);

    return;
  }

  if (lineStyle === 'ZIGZAG') {
    drawZigzagLine(context, start, end);

    return;
  }

  if (lineStyle === 'DOUBLE') {
    drawDoubleLine(context, start, end);

    return;
  }

  applyDashStyle(context, lineStyle);

  context.beginPath();

  context.moveTo(start.x, start.y);

  context.lineTo(end.x, end.y);

  context.stroke();
}

function drawRectangleStroke(
  context: CanvasRenderingContext2D,

  stroke: PdfInkStroke,

  size: PageSize,

  lineStyle: LineStyle,
) {
  if (stroke.points.length < 2) {
    return;
  }

  const start = pointToPixels(stroke.points[0], size);

  const end = pointToPixels(stroke.points[stroke.points.length - 1], size);

  const x = Math.min(start.x, end.x);

  const y = Math.min(start.y, end.y);

  const width = Math.abs(end.x - start.x);

  const height = Math.abs(end.y - start.y);

  applyDashStyle(context, lineStyle);

  context.strokeRect(x, y, width, height);

  if (lineStyle === 'DOUBLE') {
    const inset = Math.max(3, context.lineWidth);

    if (width > inset * 2 && height > inset * 2) {
      context.strokeRect(
        x + inset,

        y + inset,

        width - inset * 2,

        height - inset * 2,
      );
    }
  }
}

function drawStroke(
  context: CanvasRenderingContext2D,

  stroke: PdfInkStroke,

  size: PageSize,
) {
  if (!hasMeaningfulStroke(stroke)) {
    return;
  }

  const metadata = getStrokeMeta(stroke);

  context.save();

  configureStroke(context, stroke, size);

  if (metadata.mode === 'STRAIGHT') {
    drawStraightStroke(context, stroke, size, metadata.lineStyle);

    context.restore();
    return;
  }

  if (metadata.mode === 'RECTANGLE') {
    drawRectangleStroke(context, stroke, size, metadata.lineStyle);

    context.restore();
    return;
  }

  applyDashStyle(context, metadata.lineStyle);

  drawSmoothPath(context, stroke, size);

  context.restore();
}

/* ============================================================
 * ERASER HELPERS
 * ============================================================
 */

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;

  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(
    0,

    Math.min(
      1,

      ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy),
    ),
  );

  const x = x1 + t * dx;

  const y = y1 + t * dy;

  return Math.hypot(px - x, py - y);
}

function rectangleHitTest(
  stroke: PdfInkStroke,

  point: PdfInkPoint,

  width: number,

  height: number,

  tolerance: number,
) {
  if (stroke.points.length < 2) {
    return false;
  }

  const start = pointToPixels(stroke.points[0], {
    width,
    height,
  });

  const end = pointToPixels(stroke.points[stroke.points.length - 1], {
    width,
    height,
  });

  const px = point.x * width;

  const py = point.y * height;

  const left = Math.min(start.x, end.x);

  const right = Math.max(start.x, end.x);

  const top = Math.min(start.y, end.y);

  const bottom = Math.max(start.y, end.y);

  const distances = [
    distanceToSegment(px, py, left, top, right, top),

    distanceToSegment(px, py, right, top, right, bottom),

    distanceToSegment(px, py, right, bottom, left, bottom),

    distanceToSegment(px, py, left, bottom, left, top),
  ];

  return Math.min(...distances) <= tolerance;
}

function strokeHitTest(
  stroke: PdfInkStroke,

  point: PdfInkPoint,

  width: number,

  height: number,

  tolerance = 18,
) {
  const metadata = getStrokeMeta(stroke);

  if (metadata.mode === 'RECTANGLE') {
    return rectangleHitTest(stroke, point, width, height, tolerance);
  }

  return inkStrokeHitTest(stroke, point, width, height, tolerance);
}

/* ============================================================
 * TOOL ICONS
 * ============================================================
 */

function ToolIllustration({ tool, active }: { tool: EditorTool; active: boolean }) {
  const palette = useAppTheme();

  const ink = active ? palette.accentStrong : palette.text;

  if (tool === 'HAND') {
    return <Ionicons color={ink} name="hand-left-outline" size={23} />;
  }

  if (tool === 'PENCIL') {
    return <Ionicons color={ink} name="pencil-outline" size={24} />;
  }

  if (tool === 'HIGHLIGHTER') {
    return (
      <svg aria-hidden="true" height="28" viewBox="0 0 30 30" width="28">
        <path
          d="M9 4h12v15c0 3-2 5-6 5s-6-2-6-5Z"
          fill={active ? palette.accentSoft : '#FAFAFA'}
          stroke={ink}
          strokeWidth="1.6"
        />

        <path d="M10 4h10l-2 5h-6Z" fill="#FFF0AE" stroke={ink} strokeWidth="1.2" />

        <path d="M8 26h14" stroke="#FFF0AE" strokeLinecap="round" strokeWidth="3.4" />
      </svg>
    );
  }

  if (tool === 'ERASER') {
    return <Ionicons color={ink} name="remove-circle-outline" size={24} />;
  }

  if (tool === 'BALLPOINT') {
    return (
      <svg aria-hidden="true" height="28" viewBox="0 0 30 30" width="25">
        <path d="M12 3h6v17h-6Z" fill="#FAFAFA" stroke={ink} strokeWidth="1.5" />

        <path d="m12 20 3 7 3-7Z" fill={ink} />

        <path d="M11 8h8" stroke={ink} strokeWidth="2.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" height="29" viewBox="0 0 30 30" width="27">
      <path d="m15 2 6 11-3 9h-6l-3-9Z" fill="#FAFAFA" stroke={ink} strokeWidth="1.4" />

      <path d="M15 2v13" stroke={ink} strokeWidth="1.5" />

      <circle cx="15" cy="13" fill={ink} r="1.8" />

      <path d="M11 22h8l2 5H9Z" fill="#E7E7EB" stroke={ink} strokeWidth="1.2" />
    </svg>
  );
}

/* ============================================================
 * TOOLBAR BUTTON
 * ============================================================
 */

function ToolButton({
  active,
  label,
  onPress,
  tool,
  hasSettings = false,
}: {
  active: boolean;

  label: string;

  onPress: () => void;

  tool: EditorTool;

  hasSettings?: boolean;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{
        selected: active,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,

        {
          backgroundColor: active ? palette.accentSoft : 'transparent',

          borderColor: active ? palette.accent : 'transparent',

          opacity: pressed ? 0.64 : 1,
        },
      ]}
    >
      <ToolIllustration active={active} tool={tool} />

      {active ? (
        <View
          style={[
            styles.activeToolDot,

            {
              backgroundColor: palette.accentStrong,
            },
          ]}
        />
      ) : null}

      {hasSettings ? (
        <Ionicons
          color={active ? palette.accentStrong : palette.textMuted}
          name="chevron-down"
          size={9}
          style={styles.toolChevron}
        />
      ) : null}
    </Pressable>
  );
}

/* ============================================================
 * LINE STYLE PREVIEW
 * ============================================================
 */

function LineStylePreview({
  active,
  style,
}: {
  active: boolean;

  style: LineStyle;
}) {
  const palette = useAppTheme();

  const stroke = active ? palette.accentStrong : palette.text;

  if (style === 'WAVY') {
    return (
      <svg aria-hidden="true" height="22" viewBox="0 0 100 22" width="100">
        <path
          d="M4 11 Q9 3 14 11 T24 11 T34 11 T44 11 T54 11 T64 11 T74 11 T84 11 T94 11"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  if (style === 'ZIGZAG') {
    return (
      <svg aria-hidden="true" height="22" viewBox="0 0 100 22" width="100">
        <path
          d="M4 15 10 7 16 15 22 7 28 15 34 7 40 15 46 7 52 15 58 7 64 15 70 7 76 15 82 7 88 15 94 7"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  if (style === 'DOUBLE') {
    return (
      <svg aria-hidden="true" height="22" viewBox="0 0 100 22" width="100">
        <line stroke={stroke} strokeLinecap="round" strokeWidth="2" x1="5" x2="95" y1="8" y2="8" />

        <line
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="2"
          x1="5"
          x2="95"
          y1="14"
          y2="14"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" height="22" viewBox="0 0 100 22" width="100">
      <line
        stroke={stroke}
        strokeDasharray={style === 'DASHED' ? '7 7' : undefined}
        strokeLinecap="round"
        strokeWidth="2.7"
        x1="5"
        x2="95"
        y1="11"
        y2="11"
      />
    </svg>
  );
}

/* ============================================================
 * MODE ICON
 * ============================================================
 */

function ModeIcon({
  mode,
  selected,
}: {
  mode: InkMode;

  selected: boolean;
}) {
  const palette = useAppTheme();

  const color = selected ? palette.accentStrong : palette.text;

  if (mode === 'STRAIGHT') {
    return (
      <svg aria-hidden="true" height="32" viewBox="0 0 46 46" width="32">
        <line stroke={color} strokeLinecap="round" strokeWidth="3" x1="9" x2="37" y1="30" y2="16" />

        <circle cx="9" cy="30" fill="#FFFFFF" r="3.5" stroke={color} strokeWidth="2" />

        <circle cx="37" cy="16" fill="#FFFFFF" r="3.5" stroke={color} strokeWidth="2" />
      </svg>
    );
  }

  if (mode === 'RECTANGLE') {
    return (
      <svg aria-hidden="true" height="32" viewBox="0 0 46 46" width="32">
        <rect
          fill="none"
          height="25"
          rx="2"
          stroke={color}
          strokeWidth="2.4"
          width="25"
          x="10.5"
          y="10.5"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" height="32" viewBox="0 0 46 46" width="32">
      <path
        d="M7 27c5-13 9-13 12-7 3 7 5 12 9 4 4-7 8-8 11-3"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

/* ============================================================
 * INK CANVAS
 * ============================================================
 */

const PdfInkCanvas = forwardRef<
  InkEditorHandle,
  {
    color: string;

    height: number;

    initialStrokes: PdfInkStroke[];

    inkMode: InkMode;

    lineStyle: LineStyle;

    onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;

    onPinchZoom: (distanceRatio: number) => void;

    onPersist: (strokes: PdfInkStroke[]) => Promise<void>;

    onSaveStateChange: (state: SaveState, error?: string) => void;

    stylusOnly: boolean;

    tool: EditorTool;

    width: number;

    widthIndex: number;
  }
>(function PdfInkCanvas(
  {
    color,
    height,
    initialStrokes,
    inkMode,
    lineStyle,
    onHistoryChange,
    onPinchZoom,
    onPersist,
    onSaveStateChange,
    stylusOnly,
    tool,
    width,
    widthIndex,
  },
  ref,
) {
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

  const touchPointersRef = useRef(new Map<number, PointerPosition>());

  const pinchDistanceRef = useRef<number | null>(null);

  const enqueueSave = useRef(createSaveQueue()).current;

  const lastFailedRef = useRef<PdfInkStroke[] | null>(null);

  const mountedRef = useRef(true);

  const currentStrokes = useMemo(
    () => history[historyIndex] ?? [],

    [history, historyIndex],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    erasingPreviewRef.current = erasingPreview;
  }, [erasingPreview]);

  useEffect(() => {
    onHistoryChange(
      historyIndex > 0,

      historyIndex < history.length - 1,
    );
  }, [history.length, historyIndex, onHistoryChange]);

  /* ======================================================
   * SAVE
   * ======================================================
   */

  const persist = useCallback(
    (strokes: PdfInkStroke[]) => {
      onSaveStateChange('SAVING');

      lastFailedRef.current = null;

      enqueueSave(
        () => onPersist(strokes),
        (error) => {
          if (!mountedRef.current) return;

          if (error) {
            lastFailedRef.current = strokes;

            onSaveStateChange('ERROR', getErrorMessage(error));
          } else {
            onSaveStateChange('SAVED');
          }
        },
      );
    },

    [enqueueSave, onPersist, onSaveStateChange],
  );

  /* ======================================================
   * HISTORY
   * ======================================================
   */

  const commit = useCallback(
    (nextStrokes: PdfInkStroke[]) => {
      const currentHistory = historyRef.current;

      const currentIndex = historyIndexRef.current;

      const nextHistory = [...currentHistory.slice(0, currentIndex + 1), nextStrokes].slice(-60);

      const nextIndex = nextHistory.length - 1;

      /*
       * Immediate refs prevent rapid
       * undo taps from reading stale state.
       */
      historyRef.current = nextHistory;

      historyIndexRef.current = nextIndex;

      setHistory(nextHistory);

      setHistoryIndex(nextIndex);

      onHistoryChange(nextIndex > 0, false);

      persist(nextStrokes);
    },

    [onHistoryChange, persist],
  );

  const undo = useCallback(() => {
    const nextIndex = historyIndexRef.current - 1;

    if (nextIndex < 0) {
      return;
    }

    historyIndexRef.current = nextIndex;

    setHistoryIndex(nextIndex);

    onHistoryChange(nextIndex > 0, nextIndex < historyRef.current.length - 1);

    persist(historyRef.current[nextIndex]);
  }, [onHistoryChange, persist]);

  const redo = useCallback(() => {
    const nextIndex = historyIndexRef.current + 1;

    if (nextIndex >= historyRef.current.length) {
      return;
    }

    historyIndexRef.current = nextIndex;

    setHistoryIndex(nextIndex);

    onHistoryChange(nextIndex > 0, nextIndex < historyRef.current.length - 1);

    persist(historyRef.current[nextIndex]);
  }, [onHistoryChange, persist]);

  const clear = useCallback(() => {
    const current = historyRef.current[historyIndexRef.current];

    if (!current || current.length === 0) {
      return;
    }

    if (window.confirm('Clear every annotation on this page? You can still undo this action.')) {
      commit([]);
    }
  }, [commit]);

  const retry = useCallback(() => {
    persist(lastFailedRef.current ?? historyRef.current[historyIndexRef.current]);
  }, [persist]);

  useImperativeHandle(
    ref,

    () => ({
      clear,
      redo,
      retry,
      undo,
    }),

    [clear, redo, retry, undo],
  );

  /* ======================================================
   * CANVAS RENDER
   * ======================================================
   */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.max(
      1,

      Math.floor(width * outputScale),
    );

    canvas.height = Math.max(
      1,

      Math.floor(height * outputScale),
    );

    canvas.style.width = `${width}px`;

    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    context.clearRect(0, 0, width, height);

    const visible = erasingPreview ?? currentStrokes;

    visible.forEach((stroke) => {
      drawStroke(context, stroke, {
        width,
        height,
      });
    });

    if (draft) {
      drawStroke(context, draft, {
        width,
        height,
      });
    }
  }, [currentStrokes, draft, erasingPreview, height, width]);

  /* ======================================================
   * POINTER EVENTS
   * ======================================================
   */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || tool === 'HAND') {
      return;
    }

    const eventPoints = (event: PointerEvent) => {
      const events =
        typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];

      const rect = canvas.getBoundingClientRect();

      const samples = events.length ? events : [event];

      return samples.map((sample) =>
        normalizedInkPoint(sample.clientX, sample.clientY, sample.pressure, rect),
      );
    };

    const looksLikeStylus = (event: PointerEvent) => {
      if (event.pointerType === 'pen') {
        return true;
      }

      /*
       * Fallback for browsers that
       * occasionally report stylus
       * input as touch.
       */
      return (
        event.pointerType === 'touch' && event.width <= 8 && event.height <= 8 && event.pressure > 0
      );
    };

    const eraseAt = (point: PdfInkPoint) => {
      const original = historyRef.current[historyIndexRef.current];

      original.forEach((stroke) => {
        if (strokeHitTest(stroke, point, width, height, 18)) {
          erasedIdsRef.current.add(stroke.id);
        }
      });

      const next = original.filter((stroke) => !erasedIdsRef.current.has(stroke.id));

      erasingPreviewRef.current = next;

      setErasingPreview(next);
    };

    const currentPinchDistance = () => {
      const points = Array.from(touchPointersRef.current.values());

      if (points.length < 2) {
        return null;
      }

      return Math.hypot(
        points[0].x - points[1].x,

        points[0].y - points[1].y,
      );
    };

    const cancelDraft = () => {
      activePointerRef.current = null;

      draftRef.current = null;

      setDraft(null);

      erasingPreviewRef.current = null;

      setErasingPreview(null);

      erasedIdsRef.current = new Set();
    };

    const onPointerDown = (event: PointerEvent) => {
      const isTouch = event.pointerType === 'touch';

      const stylus = looksLikeStylus(event);

      if (isTouch) {
        touchPointersRef.current.set(
          event.pointerId,

          {
            x: event.clientX,

            y: event.clientY,
          },
        );

        if (touchPointersRef.current.size >= 2) {
          event.preventDefault();

          cancelDraft();

          pinchDistanceRef.current = currentPinchDistance();

          return;
        }

        /*
         * Stylus only:
         * finger should remain free
         * for native scrolling.
         */
        if (stylusOnly && !stylus) {
          return;
        }
      }

      if (event.button !== 0 && event.pointerType !== 'pen') {
        return;
      }

      event.preventDefault();

      activePointerRef.current = event.pointerId;

      if (!canvas.hasPointerCapture(event.pointerId)) {
        canvas.setPointerCapture(event.pointerId);
      }

      const points = eventPoints(event);

      if (!points.length) {
        return;
      }

      if (tool === 'ERASER') {
        erasedIdsRef.current = new Set();

        eraseAt(points[points.length - 1]);

        return;
      }

      const drawingTool = tool as DrawingTool;

      const inkTool: PdfInkTool = drawingTool === 'HIGHLIGHTER' ? 'HIGHLIGHTER' : 'PEN';

      const first = points[0];

      const initialPoints = inkMode === 'DRAW' ? points : [first, first];

      const nextDraft: PdfInkStroke = {
        color,

        id: createStrokeId(inkMode, lineStyle),

        points: initialPoints,

        tool: inkTool,

        width: TOOL_WIDTHS[drawingTool][widthIndex],
      };

      draftRef.current = nextDraft;

      setDraft(nextDraft);
    };

    const onPointerMove = (event: PointerEvent) => {
      const isTouch = event.pointerType === 'touch';

      const stylus = looksLikeStylus(event);

      if (isTouch && touchPointersRef.current.has(event.pointerId)) {
        touchPointersRef.current.set(
          event.pointerId,

          {
            x: event.clientX,

            y: event.clientY,
          },
        );

        const previousDistance = pinchDistanceRef.current;

        const nextDistance = currentPinchDistance();

        if (previousDistance !== null && nextDistance !== null) {
          event.preventDefault();

          if (previousDistance > 0 && Math.abs(nextDistance - previousDistance) >= 2) {
            onPinchZoom(
              Math.min(
                1.15,

                Math.max(
                  0.85,

                  nextDistance / previousDistance,
                ),
              ),
            );

            pinchDistanceRef.current = nextDistance;
          }

          return;
        }

        if (stylusOnly && !stylus) {
          return;
        }
      }

      if (activePointerRef.current !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const points = eventPoints(event);

      if (!points.length) {
        return;
      }

      if (tool === 'ERASER') {
        points.forEach(eraseAt);

        return;
      }

      const activeDraft = draftRef.current;

      if (!activeDraft) {
        return;
      }

      /* ================================================
       * AUTO STRAIGHT
       *
       * Never store shaky intermediate points.
       * Only:
       *
       * start -> current endpoint
       * ================================================
       */

      if (inkMode === 'STRAIGHT') {
        const start = activeDraft.points[0];

        const rawEnd = points[points.length - 1];

        const end = snapStraightPoint(start, rawEnd, tool);

        const nextDraft: PdfInkStroke = {
          ...activeDraft,

          points: [start, end],
        };

        draftRef.current = nextDraft;

        setDraft(nextDraft);

        return;
      }

      /* ================================================
       * RECTANGLE
       * ================================================
       */

      if (inkMode === 'RECTANGLE') {
        const start = activeDraft.points[0];

        const end = points[points.length - 1];

        const nextDraft: PdfInkStroke = {
          ...activeDraft,

          points: [start, end],
        };

        draftRef.current = nextDraft;

        setDraft(nextDraft);

        return;
      }

      /* ================================================
       * FREE DRAW
       * ================================================
       */

      if (activeDraft.points.length >= 20000) {
        return;
      }

      const nextDraft: PdfInkStroke = {
        ...activeDraft,

        points: [...activeDraft.points, ...points].slice(0, 20000),
      };

      draftRef.current = nextDraft;

      setDraft(nextDraft);
    };

    const finishPointer = (event: PointerEvent) => {
      const isTouch = event.pointerType === 'touch';

      const wasPinching = pinchDistanceRef.current !== null;

      if (isTouch) {
        touchPointersRef.current.delete(event.pointerId);

        if (wasPinching) {
          event.preventDefault();

          activePointerRef.current = null;

          if (touchPointersRef.current.size < 2) {
            pinchDistanceRef.current = null;
          }

          return;
        }

        const stylus = looksLikeStylus(event);

        if (stylusOnly && !stylus) {
          return;
        }
      }

      if (activePointerRef.current !== event.pointerId) {
        return;
      }

      event.preventDefault();

      activePointerRef.current = null;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (tool === 'ERASER') {
        const next = erasingPreviewRef.current;

        if (next && next.length !== historyRef.current[historyIndexRef.current].length) {
          commit(next);
        }

        erasingPreviewRef.current = null;

        setErasingPreview(null);

        return;
      }

      const activeDraft = draftRef.current;

      if (activeDraft && hasMeaningfulStroke(activeDraft)) {
        commit([...historyRef.current[historyIndexRef.current], activeDraft]);
      }

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
  }, [color, commit, height, inkMode, lineStyle, onPinchZoom, stylusOnly, tool, width, widthIndex]);

  /* ======================================================
   * KEYBOARD UNDO
   * ======================================================
   */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [redo, undo]);

  return (
    <canvas
      aria-label="PDF annotation layer"
      ref={canvasRef}
      style={{
        cursor: tool === 'ERASER' ? 'cell' : 'crosshair',

        height,

        inset: 0,

        mixBlendMode: 'multiply',

        pointerEvents: tool === 'HAND' ? 'none' : 'auto',

        position: 'absolute',

        touchAction: stylusOnly ? 'pan-y pinch-zoom' : 'none',

        width,

        zIndex: 2,
      }}
    />
  );
});

/* ============================================================
 * CONTEXT
 * ============================================================
 */

type AnnotationContextValue = {
  activeState: PageUiState;

  chooseColor: (color: string) => void;

  chooseTool: (tool: EditorTool) => void;

  clearActive: () => void;

  color: string;

  currentPage: number;

  exportError?: string | null;

  exporting: boolean;

  exportSuccess?: string | null;

  inkMode: InkMode;

  lineStyle: LineStyle;

  materialId: string;

  onExport: () => void;

  onPinchZoom: (distanceRatio: number) => void;

  pageStates: Record<number, PageUiState>;

  redoActive: () => void;

  registerPageHandle: (
    pageNumber: number,

    handle: PageHandle | null,
  ) => void;

  reloadActive: () => void;

  resetToolSettings: () => void;

  retryActive: () => void;

  setInkMode: (mode: InkMode) => void;

  setLineStyle: (lineStyle: LineStyle) => void;

  setStylusOnly: (value: boolean) => void;

  setWidthIndex: (index: number) => void;

  stylusOnly: boolean;

  tool: EditorTool;

  undoActive: () => void;

  updatePageState: (
    pageNumber: number,

    patch: Partial<PageUiState>,
  ) => void;

  widthIndex: number;
};

const AnnotationContext = createContext<AnnotationContextValue | undefined>(undefined);

function useAnnotationContext() {
  const context = useContext(AnnotationContext);

  if (!context) {
    throw new Error('PDF annotation components must be inside PdfAnnotationProvider.');
  }

  return context;
}

/* ============================================================
 * PROVIDER
 * ============================================================
 */

export function PdfAnnotationProvider({
  children,
  currentPage,
  exportError,
  exporting = false,
  exportSuccess,
  materialId,
  onExport,
  onPinchZoom,
}: {
  children: ReactNode;

  currentPage: number;

  exportError?: string | null;

  exporting?: boolean;

  exportSuccess?: string | null;

  materialId: string;

  onExport: () => void;

  onPinchZoom: (distanceRatio: number) => void;
}) {
  const [tool, setTool] = useState<EditorTool>('HAND');

  const [lastDrawingTool, setLastDrawingTool] = useState<DrawingTool>('FOUNTAIN');

  const [color, setColor] = useState(PEN_COLORS[0]);

  const [widthIndex, setWidthIndex] = useState(1);

  const [inkMode, setInkMode] = useState<InkMode>('DRAW');

  const [lineStyle, setLineStyle] = useState<LineStyle>('SOLID');

  const [stylusOnly, setStylusOnly] = useState(true);

  const [pageStates, setPageStates] = useState<Record<number, PageUiState>>({});

  const pageHandlesRef = useRef(new Map<number, PageHandle>());

  const registerPageHandle = useCallback(
    (
      pageNumber: number,

      handle: PageHandle | null,
    ) => {
      if (handle) {
        pageHandlesRef.current.set(pageNumber, handle);
      } else {
        pageHandlesRef.current.delete(pageNumber);
      }
    },

    [],
  );

  const updatePageState = useCallback(
    (
      pageNumber: number,

      patch: Partial<PageUiState>,
    ) => {
      setPageStates((current) => ({
        ...current,

        [pageNumber]: {
          ...DEFAULT_PAGE_STATE,

          ...current[pageNumber],

          ...patch,
        },
      }));
    },

    [],
  );

  const chooseTool = useCallback(
    (nextTool: EditorTool) => {
      setTool(nextTool);

      if (isDrawingTool(nextTool)) {
        setLastDrawingTool(nextTool);
      }

      /*
       * Give highlighter a useful
       * pastel automatically.
       */
      if (nextTool === 'HIGHLIGHTER' && !HIGHLIGHTER_COLORS.includes(color)) {
        setColor(HIGHLIGHTER_COLORS[5]);
      }

      if (nextTool === 'HIGHLIGHTER') {
        setInkMode('STRAIGHT');

        setLineStyle('SOLID');
      }
    },

    [color],
  );

  const chooseColor = useCallback(
    (nextColor: string) => {
      setColor(nextColor);

      if (tool === 'HAND' || tool === 'ERASER') {
        setTool(lastDrawingTool);
      }
    },

    [lastDrawingTool, tool],
  );

  const resetToolSettings = useCallback(() => {
    setInkMode('DRAW');

    setLineStyle('SOLID');

    setWidthIndex(1);

    setStylusOnly(true);

    setColor(tool === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS[5] : PEN_COLORS[0]);
  }, [tool]);

  const undoActive = useCallback(() => {
    pageHandlesRef.current.get(currentPage)?.undo();
  }, [currentPage]);

  const redoActive = useCallback(() => {
    pageHandlesRef.current.get(currentPage)?.redo();
  }, [currentPage]);

  const clearActive = useCallback(() => {
    pageHandlesRef.current.get(currentPage)?.clear();
  }, [currentPage]);

  const retryActive = useCallback(() => {
    pageHandlesRef.current.get(currentPage)?.retry();
  }, [currentPage]);

  const reloadActive = useCallback(() => {
    pageHandlesRef.current.get(currentPage)?.reload();
  }, [currentPage]);

  const activeState = pageStates[currentPage] ?? DEFAULT_PAGE_STATE;

  const value = useMemo<AnnotationContextValue>(
    () => ({
      activeState,
      chooseColor,
      chooseTool,
      clearActive,
      color,
      currentPage,
      exportError,
      exporting,
      exportSuccess,
      inkMode,
      lineStyle,
      materialId,
      onExport,
      onPinchZoom,
      pageStates,
      redoActive,
      registerPageHandle,
      reloadActive,
      resetToolSettings,
      retryActive,
      setInkMode,
      setLineStyle,
      setStylusOnly,
      setWidthIndex,
      stylusOnly,
      tool,
      undoActive,
      updatePageState,
      widthIndex,
    }),

    [
      activeState,
      chooseColor,
      chooseTool,
      clearActive,
      color,
      currentPage,
      exportError,
      exporting,
      exportSuccess,
      inkMode,
      lineStyle,
      materialId,
      onExport,
      onPinchZoom,
      pageStates,
      redoActive,
      registerPageHandle,
      reloadActive,
      resetToolSettings,
      retryActive,
      stylusOnly,
      tool,
      undoActive,
      updatePageState,
      widthIndex,
    ],
  );

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}

/* ============================================================
 * SETTINGS PANEL
 * ============================================================
 */

function ToolSettingsPanel({ onClose }: { onClose: () => void }) {
  const palette = useAppTheme();

  const { width: viewportWidth } = useWindowDimensions();

  const compact = viewportWidth < 700;

  const {
    chooseColor,
    color,
    inkMode,
    lineStyle,
    resetToolSettings,
    setInkMode,
    setLineStyle,
    setStylusOnly,
    setWidthIndex,
    stylusOnly,
    tool,
    widthIndex,
  } = useAnnotationContext();

  const customColorRef = useRef<HTMLInputElement | null>(null);

  const availableColors = colorsForTool(tool);

  const title =
    tool === 'HIGHLIGHTER'
      ? 'Highlighter'
      : tool === 'PENCIL'
        ? 'Pencil'
        : tool === 'BALLPOINT'
          ? 'Ballpoint'
          : 'Fountain Pen';

  const modes: {
    label: string;
    value: InkMode;
  }[] = [
    {
      label: 'Draw',

      value: 'DRAW',
    },

    {
      label: 'Straight',

      value: 'STRAIGHT',
    },

    {
      label: 'Box',

      value: 'RECTANGLE',
    },
  ];

  const lineStyles: LineStyle[] = ['SOLID', 'DASHED', 'WAVY', 'ZIGZAG', 'DOUBLE'];

  return (
    <div
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        alignItems: compact ? 'stretch' : 'center',

        background: 'rgba(14, 27, 72, 0.18)',

        display: 'flex',

        inset: 0,

        justifyContent: compact ? 'flex-end' : 'center',

        padding: compact ? 0 : 18,

        position: 'fixed',

        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: palette.surface,

          border: `1px solid ${palette.border}`,

          borderRadius: compact ? '26px 26px 0 0' : 28,

          boxShadow: '0 30px 90px rgba(14,27,72,0.24)',

          maxHeight: compact ? '82vh' : '78vh',

          maxWidth: 620,

          overflowY: 'auto',

          width: compact ? '100%' : 'min(620px, calc(100vw - 28px))',
        }}
      >
        {/* HEADER */}
        <View
          style={[
            styles.settingsHeader,

            compact && styles.settingsHeaderCompact,

            {
              borderBottomColor: palette.border,
            },
          ]}
        >
          <Pressable onPress={resetToolSettings} style={styles.headerAction}>
            <Text
              style={[
                styles.headerActionText,

                {
                  color: palette.accentStrong,
                },
              ]}
            >
              Reset
            </Text>
          </Pressable>

          <Text
            style={[
              styles.settingsTitle,

              compact && styles.settingsTitleCompact,

              {
                color: palette.text,
              },
            ]}
          >
            {title}
          </Text>

          <Pressable
            onPress={onClose}
            style={[
              styles.doneButton,

              {
                backgroundColor: palette.accentSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.doneText,

                {
                  color: palette.accentStrong,
                },
              ]}
            >
              Done
            </Text>
          </Pressable>
        </View>

        <View style={[styles.settingsBody, compact && styles.settingsBodyCompact]}>
          {/* MODE */}
          <Text
            style={[
              styles.settingsSectionTitle,

              {
                color: palette.text,
              },
            ]}
          >
            Mode
          </Text>

          <View style={styles.modeGrid}>
            {modes.map((option) => {
              const selected = inkMode === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  key={option.value}
                  onPress={() => setInkMode(option.value)}
                  style={styles.modeOption}
                >
                  <View
                    style={[
                      styles.modeCircle,

                      compact && styles.modeCircleCompact,

                      {
                        backgroundColor: selected ? palette.accentSoft : palette.surfaceAlt,

                        borderColor: selected ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <ModeIcon mode={option.value} selected={selected} />
                  </View>

                  <Text
                    style={[
                      styles.modeLabel,

                      {
                        color: selected ? palette.accentStrong : palette.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tool === 'HIGHLIGHTER' && inkMode === 'STRAIGHT' ? (
            <View
              style={[
                styles.infoCard,

                {
                  backgroundColor: palette.accentSoft,
                },
              ]}
            >
              <Ionicons color={palette.accentStrong} name="sparkles-outline" size={17} />

              <Text
                style={[
                  styles.infoCardText,

                  {
                    color: palette.accentStrong,
                  },
                ]}
              >
                Straight mode removes shaky movement automatically. Near-horizontal highlights snap
                perfectly level.
              </Text>
            </View>
          ) : null}

          {/* LINE STYLE */}
          <Text
            style={[
              styles.settingsSectionTitle,

              {
                color: palette.text,
              },
            ]}
          >
            Line Style
          </Text>

          <View style={styles.lineStyleGrid}>
            {lineStyles.map((option) => {
              const selected = lineStyle === option;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  key={option}
                  onPress={() => setLineStyle(option)}
                  style={[
                    styles.lineStyleButton,

                    compact && styles.lineStyleButtonCompact,

                    {
                      backgroundColor: selected ? palette.accentSoft : palette.surfaceAlt,

                      borderColor: selected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <LineStylePreview active={selected} style={option} />
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.settingsDivider,

              {
                backgroundColor: palette.border,
              },
            ]}
          />

          {/* COLOR */}
          <Text
            style={[
              styles.settingsSectionTitle,

              {
                color: palette.text,
              },
            ]}
          >
            Color
          </Text>

          <View style={styles.settingsColors}>
            {availableColors.map((option) => {
              const selected = color === option;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  key={option}
                  onPress={() => chooseColor(option)}
                  style={[
                    styles.settingsColorOuter,

                    compact && styles.settingsColorOuterCompact,

                    {
                      borderColor: selected ? palette.text : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.settingsColorDot,

                      compact && styles.settingsColorDotCompact,

                      {
                        backgroundColor: option,
                      },
                    ]}
                  />

                  {selected ? (
                    <Ionicons
                      color={palette.text}
                      name="checkmark"
                      size={17}
                      style={styles.colorCheck}
                    />
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              accessibilityLabel="Choose custom color"
              onPress={() => customColorRef.current?.click()}
              style={[
                styles.customColorButton,

                compact && styles.customColorButtonCompact,

                {
                  backgroundColor: palette.surfaceAlt,

                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons color={palette.text} name="add" size={24} />
            </Pressable>

            <input
              aria-label="Custom annotation color"
              onChange={(event) => chooseColor(event.currentTarget.value.toUpperCase())}
              ref={customColorRef}
              style={{
                display: 'none',
              }}
              type="color"
              value={color}
            />
          </View>

          {/* THICKNESS */}
          <Text
            style={[
              styles.settingsSectionTitle,

              {
                color: palette.text,
              },
            ]}
          >
            Thickness
          </Text>

          <View style={styles.thicknessRow}>
            {[0, 1, 2].map((index) => {
              const selected = widthIndex === index;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  key={index}
                  onPress={() => setWidthIndex(index)}
                  style={[
                    styles.thicknessButton,

                    {
                      backgroundColor: selected ? palette.accentSoft : palette.surfaceAlt,

                      borderColor: selected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor: selected ? palette.accentStrong : palette.textMuted,

                      borderRadius: radii.pill,

                      height: 2 + index * 2,

                      width: 42 + index * 18,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.settingsDivider,

              {
                backgroundColor: palette.border,
              },
            ]}
          />

          {/* INPUT */}
          <Text
            style={[
              styles.settingsSectionTitle,

              {
                color: palette.text,
              },
            ]}
          >
            Drawing Input
          </Text>

          <View
            style={[
              styles.settingRow,

              {
                backgroundColor: palette.surfaceAlt,

                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.settingCopy}>
              <View style={styles.settingLabelRow}>
                <View
                  style={[
                    styles.settingIcon,

                    {
                      backgroundColor: palette.accentSoft,
                    },
                  ]}
                >
                  <Ionicons color={palette.accentStrong} name="pencil-outline" size={18} />
                </View>

                <Text
                  style={[
                    styles.settingLabel,

                    {
                      color: palette.text,
                    },
                  ]}
                >
                  Stylus only
                </Text>
              </View>

              <Text
                style={[
                  styles.settingDescription,

                  {
                    color: palette.textMuted,
                  },
                ]}
              >
                Finger gestures scroll the PDF while Apple Pencil or another stylus writes.
              </Text>
            </View>

            <Switch
              onValueChange={setStylusOnly}
              trackColor={{
                false: palette.border,

                true: palette.accentSoft,
              }}
              thumbColor={stylusOnly ? palette.accentStrong : palette.surface}
              value={stylusOnly}
            />
          </View>

          <View
            style={[
              styles.inputHint,

              {
                backgroundColor: palette.accentSoft,
              },
            ]}
          >
            <Ionicons color={palette.accentStrong} name="information-circle-outline" size={17} />

            <Text
              style={[
                styles.inputHintText,

                {
                  color: palette.accentStrong,
                },
              ]}
            >
              {stylusOnly
                ? 'Stylus writes · Finger scrolls · Two fingers zoom'
                : 'Finger, mouse or stylus can draw'}
            </Text>
          </View>
        </View>
      </div>
    </div>
  );
}

/* ============================================================
 * MORE MENU
 * ============================================================
 */

function AnnotationMoreMenu({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;

  onOpenSettings: () => void;
}) {
  const palette = useAppTheme();

  const { clearActive, exporting, onExport, tool } = useAnnotationContext();

  return (
    <div
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        inset: 0,

        position: 'fixed',

        zIndex: 9998,
      }}
    >
      <div
        style={{
          background: palette.surface,

          border: `1px solid ${palette.border}`,

          borderRadius: 18,

          boxShadow: '0 18px 60px rgba(14,27,72,0.2)',

          overflow: 'hidden',

          position: 'absolute',

          right: 16,

          top: 84,

          width: 230,
        }}
      >
        {isDrawingTool(tool) ? (
          <MenuRow
            icon="options-outline"
            label="Tool settings"
            onPress={() => {
              onClose();
              onOpenSettings();
            }}
          />
        ) : null}

        <MenuRow
          icon="download-outline"
          label={exporting ? 'Preparing PDF…' : 'Download annotated PDF'}
          onPress={() => {
            onClose();

            if (!exporting) {
              onExport();
            }
          }}
        />

        <MenuRow
          danger
          icon="trash-outline"
          label="Clear this page"
          onPress={() => {
            onClose();
            clearActive();
          }}
        />
      </div>
    </div>
  );
}

function MenuRow({
  danger = false,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;

  icon: React.ComponentProps<typeof Ionicons>['name'];

  label: string;

  onPress: () => void;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,

        {
          backgroundColor: pressed ? palette.surfaceAlt : palette.surface,
        },
      ]}
    >
      <Ionicons color={danger ? palette.danger : palette.text} name={icon} size={18} />

      <Text
        style={[
          styles.menuRowText,

          {
            color: danger ? palette.danger : palette.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ============================================================
 * TOOLBAR
 * ============================================================
 */

export function PdfAnnotationToolbar({ focusMode = false }: { focusMode?: boolean }) {
  const palette = useAppTheme();

  const {
    activeState,
    chooseColor,
    chooseTool,
    color,
    currentPage,
    exportError,
    exportSuccess,
    pageStates,
    redoActive,
    reloadActive,
    retryActive,
    setStylusOnly,
    stylusOnly,
    tool,
    undoActive,
  } = useAnnotationContext();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);

  const hasBlockingSave = Object.values(pageStates).some(
    (state) => state.saveState === 'SAVING' || state.saveState === 'ERROR',
  );

  const selectTool = (nextTool: EditorTool) => {
    /*
     * Tap selected drawing tool
     * again = settings.
     */
    if (nextTool === tool && isDrawingTool(nextTool)) {
      setSettingsOpen(true);

      return;
    }

    chooseTool(nextTool);
  };

  const quickColors = colorsForTool(tool).slice(0, 3);

  const saveLabel = activeState.loading
    ? 'Loading'
    : activeState.loadError
      ? 'Not loaded'
      : activeState.saveState === 'SAVING'
        ? 'Saving'
        : activeState.saveState === 'ERROR'
          ? 'Not saved'
          : activeState.saveState === 'SAVED'
            ? 'Saved'
            : 'Ready';

  const saveIcon =
    activeState.saveState === 'ERROR'
      ? 'alert-circle-outline'
      : activeState.saveState === 'SAVED'
        ? 'checkmark-circle-outline'
        : activeState.saveState === 'SAVING'
          ? 'cloud-upload-outline'
          : 'ellipse-outline';

  const saveColor =
    activeState.saveState === 'ERROR' || activeState.loadError
      ? palette.danger
      : activeState.saveState === 'SAVED'
        ? palette.success
        : palette.textMuted;

  return (
    <>
      <div
        style={{
          background: `linear-gradient(to bottom, ${palette.surfaceAlt}, ${palette.surfaceAlt}EE)`,

          position: 'sticky',

          top: 0,

          width: '100%',

          zIndex: focusMode ? 50 : 20,
        }}
      >
        <div
          style={{
            overflowX: 'auto',

            padding: '8px 8px 4px',

            scrollbarWidth: 'none',

            width: '100%',
          }}
        >
          <div
            style={{
              alignItems: 'center',

              background: palette.surface,

              border: `1px solid ${palette.border}`,

              borderRadius: 26,

              boxShadow: '0 12px 34px rgba(14,27,72,0.12)',

              display: 'flex',

              gap: 4,

              margin: '0 auto',

              minHeight: 66,

              padding: '6px 8px',

              width: 'max-content',
            }}
          >
            {/* UNDO */}
            <Pressable
              accessibilityLabel="Undo annotation"
              disabled={!activeState.canUndo}
              onPress={undoActive}
              style={[
                styles.actionButton,

                {
                  backgroundColor: palette.surfaceAlt,

                  opacity: activeState.canUndo ? 1 : 0.32,
                },
              ]}
            >
              <Ionicons color={palette.text} name="arrow-undo-outline" size={21} />
            </Pressable>

            <Pressable
              accessibilityLabel="Redo annotation"
              disabled={!activeState.canRedo}
              onPress={redoActive}
              style={[
                styles.actionButton,

                {
                  backgroundColor: palette.surfaceAlt,

                  opacity: activeState.canRedo ? 1 : 0.32,
                },
              ]}
            >
              <Ionicons color={palette.text} name="arrow-redo-outline" size={21} />
            </Pressable>

            <View
              style={[
                styles.toolbarDivider,

                {
                  backgroundColor: palette.border,
                },
              ]}
            />

            {/* TOOLS */}
            <ToolButton
              active={tool === 'HAND'}
              label="Read mode"
              onPress={() => selectTool('HAND')}
              tool="HAND"
            />

            <ToolButton
              active={tool === 'FOUNTAIN'}
              hasSettings
              label="Fountain pen"
              onPress={() => selectTool('FOUNTAIN')}
              tool="FOUNTAIN"
            />

            <ToolButton
              active={tool === 'PENCIL'}
              hasSettings
              label="Pencil"
              onPress={() => selectTool('PENCIL')}
              tool="PENCIL"
            />

            <ToolButton
              active={tool === 'BALLPOINT'}
              hasSettings
              label="Ballpoint"
              onPress={() => selectTool('BALLPOINT')}
              tool="BALLPOINT"
            />

            <ToolButton
              active={tool === 'HIGHLIGHTER'}
              hasSettings
              label="Highlighter"
              onPress={() => selectTool('HIGHLIGHTER')}
              tool="HIGHLIGHTER"
            />

            <ToolButton
              active={tool === 'ERASER'}
              label="Eraser"
              onPress={() => selectTool('ERASER')}
              tool="ERASER"
            />

            <View
              style={[
                styles.toolbarDivider,

                {
                  backgroundColor: palette.border,
                },
              ]}
            />

            <Pressable
              accessibilityLabel={stylusOnly ? 'Stylus only is on' : 'Stylus only is off'}
              accessibilityRole="switch"
              accessibilityState={{
                checked: stylusOnly,
              }}
              onPress={() => setStylusOnly(!stylusOnly)}
              style={[
                styles.actionButton,

                {
                  backgroundColor: stylusOnly ? palette.accentSoft : palette.surfaceAlt,

                  borderColor: stylusOnly ? palette.accent : 'transparent',

                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons
                color={stylusOnly ? palette.accentStrong : palette.textMuted}
                name="pencil"
                size={19}
              />
            </Pressable>

            {/* QUICK COLORS */}
            {isDrawingTool(tool)
              ? quickColors.map((option) => (
                  <Pressable
                    accessibilityLabel={`Use ${option}`}
                    key={option}
                    onPress={() => chooseColor(option)}
                    style={[
                      styles.quickColorOuter,

                      {
                        borderColor: color === option ? palette.text : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.quickColorDot,

                        {
                          backgroundColor: option,
                        },
                      ]}
                    />
                  </Pressable>
                ))
              : null}

            {isDrawingTool(tool) ? (
              <Pressable
                accessibilityLabel="Open tool settings"
                onPress={() => setSettingsOpen(true)}
                style={[
                  styles.currentColorButton,

                  {
                    backgroundColor: color,

                    borderColor: palette.border,
                  },
                ]}
              >
                <Ionicons color={palette.text} name="options-outline" size={14} />
              </Pressable>
            ) : null}

            {/* MORE */}
            <Pressable
              accessibilityLabel="More annotation options"
              onPress={() => setMoreOpen(true)}
              style={[
                styles.moreButton,

                {
                  backgroundColor: palette.surfaceAlt,
                },
              ]}
            >
              <Ionicons color={palette.text} name="ellipsis-horizontal" size={21} />
            </Pressable>
          </div>
        </div>

        {/* SMALL STATUS */}
        <View style={styles.compactStatus}>
          <View style={styles.compactStatusSide}>
            <Ionicons color={saveColor} name={saveIcon} size={14} />

            <Text
              style={[
                styles.compactStatusText,

                {
                  color: saveColor,
                },
              ]}
            >
              {saveLabel}
            </Text>

            {hasBlockingSave && activeState.saveState !== 'ERROR' ? (
              <ActivityIndicator color={palette.textMuted} size="small" />
            ) : null}
          </View>

          <Text
            style={[
              styles.pageStatus,

              {
                color: palette.textMuted,
              },
            ]}
          >
            Page {currentPage}
          </Text>
        </View>

        {/* ERRORS */}
        {activeState.loadError ? (
          <View style={styles.errorRow}>
            <Text
              style={[
                styles.errorText,

                {
                  color: palette.danger,
                },
              ]}
            >
              Could not load page annotations: {activeState.loadError}
            </Text>

            <Pressable onPress={reloadActive}>
              <Text
                style={[
                  styles.retryText,

                  {
                    color: palette.accentStrong,
                  },
                ]}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {activeState.saveState === 'ERROR' ? (
          <View style={styles.errorRow}>
            <Text
              style={[
                styles.errorText,

                {
                  color: palette.danger,
                },
              ]}
            >
              Could not save annotations: {activeState.saveError}
            </Text>

            <Pressable onPress={retryActive}>
              <Text
                style={[
                  styles.retryText,

                  {
                    color: palette.accentStrong,
                  },
                ]}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {exportError ? (
          <View style={styles.errorRow}>
            <Text
              style={[
                styles.errorText,

                {
                  color: palette.danger,
                },
              ]}
            >
              Could not export PDF: {exportError}
            </Text>
          </View>
        ) : null}

        {exportSuccess ? (
          <View style={styles.successRow}>
            <Ionicons color={palette.success} name="checkmark-circle-outline" size={15} />

            <Text
              style={[
                styles.successText,

                {
                  color: palette.success,
                },
              ]}
            >
              {exportSuccess}
            </Text>
          </View>
        ) : null}
      </div>

      {settingsOpen && isDrawingTool(tool) ? (
        <ToolSettingsPanel onClose={() => setSettingsOpen(false)} />
      ) : null}

      {moreOpen ? (
        <AnnotationMoreMenu
          onClose={() => setMoreOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}
    </>
  );
}

/* ============================================================
 * ANNOTATION PAGE
 * ============================================================
 */

export function PdfAnnotationPage({
  children,
  height,
  pageNumber,
  width,
}: {
  children: ReactNode;

  height: number;

  pageNumber: number;

  width: number;
}) {
  const queryClient = useQueryClient();

  const {
    color,
    inkMode,
    lineStyle,
    materialId,
    onPinchZoom,
    registerPageHandle,
    stylusOnly,
    tool,
    updatePageState,
    widthIndex,
  } = useAnnotationContext();

  const editorRef = useRef<InkEditorHandle | null>(null);

  const annotations = useQuery({
    queryKey: ['pdf-annotations', materialId, pageNumber],

    queryFn: () => getPdfAnnotations(materialId, pageNumber),

    staleTime: 60_000,
  });

  useEffect(() => {
    updatePageState(
      pageNumber,

      {
        loadError: annotations.error ? getErrorMessage(annotations.error) : null,

        loading: annotations.isLoading,
      },
    );
  }, [annotations.error, annotations.isLoading, pageNumber, updatePageState]);

  const persist = useCallback(
    async (strokes: PdfInkStroke[]) => {
      const saved = await savePdfAnnotations(materialId, pageNumber, strokes);

      queryClient.setQueryData(
        ['pdf-annotations', materialId, pageNumber],

        saved,
      );
    },

    [materialId, pageNumber, queryClient],
  );

  const onSaveStateChange = useCallback(
    (
      state: SaveState,

      error?: string,
    ) => {
      updatePageState(
        pageNumber,

        {
          saveError: error ?? null,

          saveState: state,
        },
      );
    },

    [pageNumber, updatePageState],
  );

  const onHistoryChange = useCallback(
    (
      canUndo: boolean,

      canRedo: boolean,
    ) => {
      updatePageState(
        pageNumber,

        {
          canRedo,
          canUndo,
        },
      );
    },

    [pageNumber, updatePageState],
  );

  const pageHandle = useMemo<PageHandle>(
    () => ({
      clear: () => editorRef.current?.clear(),

      redo: () => editorRef.current?.redo(),

      reload: () => {
        void annotations.refetch();
      },

      retry: () => editorRef.current?.retry(),

      undo: () => editorRef.current?.undo(),
    }),

    [annotations],
  );

  useEffect(() => {
    registerPageHandle(pageNumber, pageHandle);

    return () => {
      registerPageHandle(pageNumber, null);
    };
  }, [pageHandle, pageNumber, registerPageHandle]);

  const editorReady = annotations.isFetched && !annotations.error;

  return (
    <div
      style={{
        height,

        position: 'relative',

        width,
      }}
    >
      {children}

      {editorReady && width > 0 && height > 0 ? (
        <PdfInkCanvas
          color={color}
          height={height}
          initialStrokes={parsePdfInkStrokes(annotations.data?.strokes)}
          inkMode={inkMode}
          key={`${materialId}:${pageNumber}`}
          lineStyle={lineStyle}
          onHistoryChange={onHistoryChange}
          onPersist={persist}
          onPinchZoom={onPinchZoom}
          onSaveStateChange={onSaveStateChange}
          ref={editorRef}
          stylusOnly={stylusOnly}
          tool={tool}
          width={width}
          widthIndex={widthIndex}
        />
      ) : null}
    </div>
  );
}

/* ============================================================
 * WORKSPACE
 * ============================================================
 */

export function PdfAnnotationWorkspace({
  children,
  exportError,
  exporting = false,
  exportSuccess,
  focusMode = false,
  height,
  materialId,
  onExport,
  onPinchZoom,
  pageNumber,
  width,
}: {
  children: ReactNode;

  exportError?: string | null;

  exporting?: boolean;

  exportSuccess?: string | null;

  focusMode?: boolean;

  height: number;

  materialId: string;

  onExport: () => void;

  onPinchZoom: (distanceRatio: number) => void;

  pageNumber: number;

  width: number;
}) {
  return (
    <PdfAnnotationProvider
      currentPage={pageNumber}
      exportError={exportError}
      exporting={exporting}
      exportSuccess={exportSuccess}
      materialId={materialId}
      onExport={onExport}
      onPinchZoom={onPinchZoom}
    >
      <View style={[styles.workspace, focusMode ? styles.focusWorkspace : null]}>
        <PdfAnnotationToolbar focusMode={focusMode} />

        <PdfAnnotationPage height={height} pageNumber={pageNumber} width={width}>
          {children}
        </PdfAnnotationPage>
      </View>
    </PdfAnnotationProvider>
  );
}

/* ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  workspace: {
    alignItems: 'flex-start',

    gap: spacing.xs,

    width: '100%',
  },

  focusWorkspace: {
    alignItems: 'center',
  },

  /* TOOLBAR */

  actionButton: {
    alignItems: 'center',

    borderRadius: 15,

    height: 44,

    justifyContent: 'center',

    width: 44,
  },

  toolbarDivider: {
    height: 34,

    marginHorizontal: 3,

    width: 1,
  },

  toolButton: {
    alignItems: 'center',

    borderRadius: 15,

    borderWidth: 1,

    height: 52,

    justifyContent: 'center',

    position: 'relative',

    width: 48,
  },

  activeToolDot: {
    borderRadius: radii.pill,

    bottom: 3,

    height: 4,

    position: 'absolute',

    width: 4,
  },

  toolChevron: {
    position: 'absolute',

    right: 3,

    top: 3,
  },

  quickColorOuter: {
    alignItems: 'center',

    borderRadius: radii.pill,

    borderWidth: 2,

    height: 30,

    justifyContent: 'center',

    width: 30,
  },

  quickColorDot: {
    borderRadius: radii.pill,

    height: 22,

    width: 22,
  },

  currentColorButton: {
    alignItems: 'center',

    borderRadius: radii.pill,

    borderWidth: 1,

    height: 32,

    justifyContent: 'center',

    width: 32,
  },

  moreButton: {
    alignItems: 'center',

    borderRadius: 15,

    height: 42,

    justifyContent: 'center',

    marginLeft: 2,

    width: 42,
  },

  /* STATUS */

  compactStatus: {
    alignItems: 'center',

    alignSelf: 'center',

    flexDirection: 'row',

    justifyContent: 'space-between',

    maxWidth: 760,

    paddingHorizontal: 14,

    paddingVertical: 4,

    width: '100%',
  },

  compactStatusSide: {
    alignItems: 'center',

    flexDirection: 'row',

    gap: 5,
  },

  compactStatusText: {
    ...typography.caption,

    fontSize: 10,

    fontWeight: '700',
  },

  pageStatus: {
    ...typography.caption,

    fontSize: 10,

    fontWeight: '600',
  },

  /* ERRORS */

  errorRow: {
    alignItems: 'center',

    alignSelf: 'center',

    flexDirection: 'row',

    gap: 10,

    justifyContent: 'space-between',

    maxWidth: 760,

    paddingHorizontal: 14,

    paddingVertical: 5,

    width: '100%',
  },

  errorText: {
    ...typography.caption,

    flex: 1,

    fontSize: 10,
  },

  retryText: {
    ...typography.caption,

    fontSize: 10,

    fontWeight: '700',
  },

  successRow: {
    alignItems: 'center',

    alignSelf: 'center',

    flexDirection: 'row',

    gap: 5,

    maxWidth: 760,

    paddingHorizontal: 14,

    paddingVertical: 4,

    width: '100%',
  },

  successText: {
    ...typography.caption,

    fontSize: 10,

    fontWeight: '700',
  },

  /* MORE MENU */

  menuRow: {
    alignItems: 'center',

    flexDirection: 'row',

    gap: 10,

    minHeight: 48,

    paddingHorizontal: 15,

    paddingVertical: 10,
  },

  menuRowText: {
    ...typography.body,

    fontSize: 13,

    fontWeight: '600',
  },

  /* SETTINGS HEADER */

  settingsHeader: {
    alignItems: 'center',

    borderBottomWidth: 1,

    flexDirection: 'row',

    minHeight: 66,

    paddingHorizontal: 20,
  },

  settingsHeaderCompact: {
    minHeight: 60,

    paddingHorizontal: 14,
  },

  headerAction: {
    minWidth: 64,

    paddingVertical: 10,
  },

  headerActionText: {
    ...typography.body,

    fontSize: 15,

    fontWeight: '600',
  },

  settingsTitle: {
    ...typography.sectionTitle,

    flex: 1,

    fontSize: 20,

    lineHeight: 26,

    textAlign: 'center',
  },

  settingsTitleCompact: {
    fontSize: 18,

    lineHeight: 23,
  },

  doneButton: {
    alignItems: 'center',

    borderRadius: radii.pill,

    minHeight: 34,

    justifyContent: 'center',

    minWidth: 64,

    paddingHorizontal: 12,
  },

  doneText: {
    ...typography.caption,

    fontSize: 11,

    fontWeight: '800',
  },

  /* SETTINGS BODY */

  settingsBody: {
    gap: 17,

    padding: 22,
  },

  settingsBodyCompact: {
    gap: 14,

    padding: 16,
  },

  settingsSectionTitle: {
    ...typography.sectionTitle,

    fontSize: 16,

    lineHeight: 21,
  },

  settingsDivider: {
    height: 1,

    marginVertical: 1,

    width: '100%',
  },

  /* MODES */

  modeGrid: {
    flexDirection: 'row',

    gap: 12,

    justifyContent: 'space-around',

    width: '100%',
  },

  modeOption: {
    alignItems: 'center',

    flex: 1,

    gap: 6,
  },

  modeCircle: {
    alignItems: 'center',

    borderRadius: 18,

    borderWidth: 1,

    height: 58,

    justifyContent: 'center',

    width: 58,
  },

  modeCircleCompact: {
    borderRadius: 16,

    height: 52,

    width: 52,
  },

  modeLabel: {
    ...typography.caption,

    fontSize: 11,

    fontWeight: '700',

    textAlign: 'center',
  },

  /* INFO */

  infoCard: {
    alignItems: 'center',

    borderRadius: 13,

    flexDirection: 'row',

    gap: 7,

    paddingHorizontal: 11,

    paddingVertical: 9,
  },

  infoCardText: {
    ...typography.caption,

    flex: 1,

    fontSize: 10,

    fontWeight: '600',

    lineHeight: 15,
  },

  /* LINE STYLE */

  lineStyleGrid: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,
  },

  lineStyleButton: {
    alignItems: 'center',

    borderRadius: radii.pill,

    borderWidth: 1,

    height: 46,

    justifyContent: 'center',

    minWidth: 145,

    paddingHorizontal: 12,
  },

  lineStyleButtonCompact: {
    flexBasis: '47%',

    minWidth: 0,
  },

  /* COLORS */

  settingsColors: {
    alignItems: 'center',

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 10,
  },

  settingsColorOuter: {
    alignItems: 'center',

    borderRadius: radii.pill,

    borderWidth: 3,

    height: 50,

    justifyContent: 'center',

    position: 'relative',

    width: 50,
  },

  settingsColorOuterCompact: {
    height: 43,

    width: 43,
  },

  settingsColorDot: {
    borderRadius: radii.pill,

    height: 40,

    width: 40,
  },

  settingsColorDotCompact: {
    height: 33,

    width: 33,
  },

  colorCheck: {
    position: 'absolute',
  },

  customColorButton: {
    alignItems: 'center',

    borderRadius: radii.pill,

    borderWidth: 1,

    height: 46,

    justifyContent: 'center',

    width: 46,
  },

  customColorButtonCompact: {
    height: 40,

    width: 40,
  },

  /* THICKNESS */

  thicknessRow: {
    flexDirection: 'row',

    gap: 8,
  },

  thicknessButton: {
    alignItems: 'center',

    borderRadius: 14,

    borderWidth: 1,

    flex: 1,

    height: 48,

    justifyContent: 'center',
  },

  /* DRAW INPUT */

  settingRow: {
    alignItems: 'center',

    borderRadius: 16,

    borderWidth: 1,

    flexDirection: 'row',

    gap: 14,

    padding: 14,
  },

  settingCopy: {
    flex: 1,

    gap: 5,
  },

  settingLabelRow: {
    alignItems: 'center',

    flexDirection: 'row',

    gap: 8,
  },

  settingIcon: {
    alignItems: 'center',

    borderRadius: 10,

    height: 32,

    justifyContent: 'center',

    width: 32,
  },

  settingLabel: {
    ...typography.body,

    fontSize: 14,

    fontWeight: '700',
  },

  settingDescription: {
    ...typography.caption,

    fontSize: 10,

    lineHeight: 15,
  },

  inputHint: {
    alignItems: 'center',

    borderRadius: 12,

    flexDirection: 'row',

    gap: 7,

    paddingHorizontal: 11,

    paddingVertical: 8,
  },

  inputHintText: {
    ...typography.caption,

    flex: 1,

    fontSize: 9,

    fontWeight: '700',

    lineHeight: 14,
  },
});
