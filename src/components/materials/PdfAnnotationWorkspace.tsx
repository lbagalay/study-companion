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
  Text,
  View,
} from 'react-native';

import { brand, radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { createClientUuid } from '@/lib/ids';
import {
  hasMeaningfulStroke,
  inkStrokeHitTest,
  normalizedInkPoint,
  parsePdfInkStrokes,
} from '@/lib/pdf/annotations';
import {
  getPdfAnnotations,
  savePdfAnnotations,
} from '@/services';
import type {
  PdfInkPoint,
  PdfInkStroke,
  PdfInkTool,
} from '@/types/database';

type DrawingTool =
  | 'FOUNTAIN'
  | 'PENCIL'
  | 'BALLPOINT'
  | 'HIGHLIGHTER';

type EditorTool =
  | 'HAND'
  | DrawingTool
  | 'ERASER';

type SaveState =
  | 'IDLE'
  | 'SAVING'
  | 'SAVED'
  | 'ERROR';

type PageSize = {
  height: number;
  width: number;
};

type PointerPosition = {
  x: number;
  y: number;
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

const DEFAULT_PAGE_STATE: PageUiState = {
  canRedo: false,
  canUndo: false,
  loadError: null,
  loading: true,
  saveError: null,
  saveState: 'IDLE',
};

const COLOR_SWATCHES = [
  brand.ink,
  brand.mauve,
  '#FFFFFF',
  brand.blue,
  brand.navy,
];

const TOOL_WIDTHS: Record<
  DrawingTool,
  number[]
> = {
  FOUNTAIN: [0.0025, 0.004, 0.0065],
  PENCIL: [0.0012, 0.002, 0.0035],
  BALLPOINT: [0.001, 0.0016, 0.0025],
  HIGHLIGHTER: [0.012, 0.022, 0.035],
};

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: PdfInkStroke,
  size: PageSize,
) {
  if (!hasMeaningfulStroke(stroke)) {
    return;
  }

  context.save();

  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.globalAlpha =
    stroke.tool === 'HIGHLIGHTER'
      ? 0.34
      : 1;

  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.lineWidth = Math.max(
    1,
    stroke.width *
      Math.min(size.width, size.height),
  );

  const first = stroke.points[0];

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
    context.restore();

    return;
  }

  context.beginPath();

  context.moveTo(
    first.x * size.width,
    first.y * size.height,
  );

  for (
    let index = 1;
    index < stroke.points.length;
    index += 1
  ) {
    const previous =
      stroke.points[index - 1];

    const point =
      stroke.points[index];

    const middleX =
      ((previous.x + point.x) / 2) *
      size.width;

    const middleY =
      ((previous.y + point.y) / 2) *
      size.height;

    context.quadraticCurveTo(
      previous.x * size.width,
      previous.y * size.height,
      middleX,
      middleY,
    );
  }

  const last =
    stroke.points[
      stroke.points.length - 1
    ];

  context.lineTo(
    last.x * size.width,
    last.y * size.height,
  );

  context.stroke();
  context.restore();
}

function ToolIllustration({
  tool,
}: {
  tool: EditorTool;
}) {
  if (tool === 'HAND') {
    return (
      <Ionicons
        color={brand.ink}
        name="hand-left-outline"
        size={27}
      />
    );
  }

  if (tool === 'FOUNTAIN') {
    return (
      <svg
        aria-hidden="true"
        height="58"
        viewBox="0 0 32 70"
        width="30"
      >
        <path
          d="M16 2 28 26 23 66H9L4 26Z"
          fill={brand.blush}
          stroke={brand.slate}
          strokeWidth="1.4"
        />

        <path
          d="M16 2v31"
          stroke={brand.slate}
          strokeWidth="1.5"
        />

        <circle
          cx="16"
          cy="27"
          fill={brand.ink}
          r="2.5"
        />
      </svg>
    );
  }

  if (tool === 'PENCIL') {
    return (
      <svg
        aria-hidden="true"
        height="58"
        viewBox="0 0 30 70"
        width="28"
      >
        <path
          d="m15 2 8 17H7Z"
          fill={brand.blush}
        />

        <path
          d="m15 2 3 7h-6Z"
          fill={brand.ink}
        />

        <path
          d="M7 19h16v48H7Z"
          fill={brand.blue}
        />

        <path
          d="M7 19h5v48H7Z"
          fill={brand.blush}
        />

        <path
          d="M18 19h5v48h-5Z"
          fill={brand.slate}
        />
      </svg>
    );
  }

  if (tool === 'BALLPOINT') {
    return (
      <svg
        aria-hidden="true"
        height="58"
        viewBox="0 0 30 70"
        width="28"
      >
        <path
          d="m15 2 6 16H9Z"
          fill={brand.ink}
        />

        <rect
          fill={brand.blush}
          height="46"
          rx="7"
          width="16"
          x="7"
          y="17"
        />

        <rect
          fill={brand.navy}
          height="5"
          rx="2"
          width="18"
          x="6"
          y="43"
        />

        <rect
          fill={brand.blue}
          height="7"
          rx="3"
          width="14"
          x="8"
          y="61"
        />
      </svg>
    );
  }

  if (tool === 'HIGHLIGHTER') {
    return (
      <svg
        aria-hidden="true"
        height="58"
        viewBox="0 0 32 70"
        width="30"
      >
        <path
          d="m8 2 18 6-6 13H6Z"
          fill={brand.mauve}
        />

        <path
          d="M6 20h20v44a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z"
          fill={brand.blush}
        />

        <rect
          fill={brand.slate}
          height="5"
          rx="2"
          width="22"
          x="5"
          y="29"
        />

        <circle
          cx="16"
          cy="52"
          fill={brand.mauve}
          r="4"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      height="58"
      viewBox="0 0 32 70"
      width="30"
    >
      <rect
        fill={brand.blush}
        height="52"
        rx="8"
        stroke={brand.slate}
        width="22"
        x="5"
        y="8"
      />

      <rect
        fill={brand.blue}
        height="17"
        rx="6"
        width="22"
        x="5"
        y="45"
      />
    </svg>
  );
}

function ToolButton({
  active,
  label,
  onPress,
  tool,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  tool: EditorTool;
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
          backgroundColor: active
            ? palette.accentSoft
            : 'transparent',
          borderColor: active
            ? palette.accent
            : 'transparent',
          opacity: pressed
            ? 0.7
            : 1,
        },
      ]}
    >
      <ToolIllustration tool={tool} />
    </Pressable>
  );
}

const PdfInkCanvas =
  forwardRef<
    InkEditorHandle,
    {
      color: string;
      height: number;
      initialStrokes: PdfInkStroke[];
      onHistoryChange: (
        canUndo: boolean,
        canRedo: boolean,
      ) => void;
      onPinchZoom: (
        distanceRatio: number,
      ) => void;
      onPersist: (
        strokes: PdfInkStroke[],
      ) => Promise<void>;
      onSaveStateChange: (
        state: SaveState,
        error?: string,
      ) => void;
      tool: EditorTool;
      width: number;
      widthIndex: number;
    }
  >(function PdfInkCanvas(
    {
      color,
      height,
      initialStrokes,
      onHistoryChange,
      onPinchZoom,
      onPersist,
      onSaveStateChange,
      tool,
      width,
      widthIndex,
    },
    ref,
  ) {
    const canvasRef =
      useRef<HTMLCanvasElement | null>(
        null,
      );

    const [history, setHistory] =
      useState<PdfInkStroke[][]>([
        initialStrokes,
      ]);

    const [
      historyIndex,
      setHistoryIndex,
    ] = useState(0);

    const [draft, setDraft] =
      useState<PdfInkStroke | null>(null);

    const [
      erasingPreview,
      setErasingPreview,
    ] = useState<
      PdfInkStroke[] | null
    >(null);

    const historyRef =
      useRef(history);

    const historyIndexRef =
      useRef(historyIndex);

    const draftRef =
      useRef<PdfInkStroke | null>(
        null,
      );

    const erasingPreviewRef =
      useRef<PdfInkStroke[] | null>(
        null,
      );

    const erasedIdsRef =
      useRef(new Set<string>());

    const activePointerRef =
      useRef<number | null>(null);

    const touchPointersRef =
      useRef(
        new Map<
          number,
          PointerPosition
        >(),
      );

    const pinchDistanceRef =
      useRef<number | null>(null);

    const saveQueueRef =
      useRef<Promise<void>>(
        Promise.resolve(),
      );

    const mountedRef =
      useRef(true);

    const lastFailedRef =
      useRef<PdfInkStroke[] | null>(
        null,
      );

    const currentStrokes =
      useMemo(
        () =>
          history[historyIndex] ?? [],
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
      historyIndexRef.current =
        historyIndex;
    }, [historyIndex]);

    useEffect(() => {
      draftRef.current = draft;
    }, [draft]);

    useEffect(() => {
      erasingPreviewRef.current =
        erasingPreview;
    }, [erasingPreview]);

    useEffect(() => {
      onHistoryChange(
        historyIndex > 0,
        historyIndex <
          history.length - 1,
      );
    }, [
      history.length,
      historyIndex,
      onHistoryChange,
    ]);

    const persist = useCallback(
      (strokes: PdfInkStroke[]) => {
        onSaveStateChange('SAVING');

        lastFailedRef.current = null;

        saveQueueRef.current =
          saveQueueRef.current
            .catch(() => undefined)
            .then(() =>
              onPersist(strokes),
            )
            .then(() => {
              if (
                mountedRef.current
              ) {
                onSaveStateChange(
                  'SAVED',
                );
              }
            })
            .catch((error) => {
              lastFailedRef.current =
                strokes;

              if (
                mountedRef.current
              ) {
                onSaveStateChange(
                  'ERROR',
                  getErrorMessage(
                    error,
                  ),
                );
              }
            });
      },
      [
        onPersist,
        onSaveStateChange,
      ],
    );

    const commit = useCallback(
      (
        nextStrokes: PdfInkStroke[],
      ) => {
        const currentHistory =
          historyRef.current;

        const currentIndex =
          historyIndexRef.current;

        const nextHistory = [
          ...currentHistory.slice(
            0,
            currentIndex + 1,
          ),
          nextStrokes,
        ].slice(-50);

        setHistory(nextHistory);

        setHistoryIndex(
          nextHistory.length - 1,
        );

        persist(nextStrokes);
      },
      [persist],
    );

    const undo = useCallback(() => {
      const nextIndex =
        historyIndexRef.current - 1;

      if (nextIndex < 0) {
        return;
      }

      setHistoryIndex(nextIndex);

      persist(
        historyRef.current[
          nextIndex
        ],
      );
    }, [persist]);

    const redo = useCallback(() => {
      const nextIndex =
        historyIndexRef.current + 1;

      if (
        nextIndex >=
        historyRef.current.length
      ) {
        return;
      }

      setHistoryIndex(nextIndex);

      persist(
        historyRef.current[
          nextIndex
        ],
      );
    }, [persist]);

    const clear = useCallback(() => {
      const current =
        historyRef.current[
          historyIndexRef.current
        ];

      if (
        !current ||
        current.length === 0
      ) {
        return;
      }

      if (
        window.confirm(
          'Clear every handwritten mark on this page? You can still undo this action.',
        )
      ) {
        commit([]);
      }
    }, [commit]);

    const retry = useCallback(() => {
      persist(
        lastFailedRef.current ??
          historyRef.current[
            historyIndexRef.current
          ],
      );
    }, [persist]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        redo,
        retry,
        undo,
      }),
      [
        clear,
        redo,
        retry,
        undo,
      ],
    );

    useEffect(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const outputScale =
        window.devicePixelRatio || 1;

      canvas.width = Math.max(
        1,
        Math.floor(
          width * outputScale,
        ),
      );

      canvas.height = Math.max(
        1,
        Math.floor(
          height * outputScale,
        ),
      );

      canvas.style.width =
        `${width}px`;

      canvas.style.height =
        `${height}px`;

      const context =
        canvas.getContext('2d');

      if (!context) {
        return;
      }

      context.setTransform(
        outputScale,
        0,
        0,
        outputScale,
        0,
        0,
      );

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      const visibleStrokes =
        erasingPreview ??
        currentStrokes;

      visibleStrokes.forEach(
        (stroke) =>
          drawStroke(
            context,
            stroke,
            {
              height,
              width,
            },
          ),
      );

      if (draft) {
        drawStroke(
          context,
          draft,
          {
            height,
            width,
          },
        );
      }
    }, [
      currentStrokes,
      draft,
      erasingPreview,
      height,
      width,
    ]);

    useEffect(() => {
      const canvas =
        canvasRef.current;

      if (
        !canvas ||
        tool === 'HAND'
      ) {
        return;
      }

      const eventPoints = (
        event: PointerEvent,
      ) => {
        const coalesced =
          typeof event.getCoalescedEvents ===
          'function'
            ? event.getCoalescedEvents()
            : [event];

        const rect =
          canvas.getBoundingClientRect();

        const samples =
          coalesced.length > 0
            ? coalesced
            : [event];

        return samples.map(
          (sample) =>
            normalizedInkPoint(
              sample.clientX,
              sample.clientY,
              sample.pressure,
              rect,
            ),
        );
      };

      const eraseAt = (
        point: PdfInkPoint,
      ) => {
        const original =
          historyRef.current[
            historyIndexRef.current
          ];

        original.forEach(
          (stroke) => {
            if (
              inkStrokeHitTest(
                stroke,
                point,
                width,
                height,
                18,
              )
            ) {
              erasedIdsRef.current.add(
                stroke.id,
              );
            }
          },
        );

        const next =
          original.filter(
            (stroke) =>
              !erasedIdsRef.current.has(
                stroke.id,
              ),
          );

        erasingPreviewRef.current =
          next;

        setErasingPreview(next);
      };

      const currentPinchDistance =
        () => {
          const points =
            Array.from(
              touchPointersRef.current.values(),
            );

          if (
            points.length < 2
          ) {
            return null;
          }

          return Math.hypot(
            points[0].x -
              points[1].x,
            points[0].y -
              points[1].y,
          );
        };

      const cancelDrawingForPinch =
        () => {
          activePointerRef.current =
            null;

          draftRef.current = null;

          erasingPreviewRef.current =
            null;

          erasedIdsRef.current =
            new Set();

          setDraft(null);

          setErasingPreview(null);
        };

      const onPointerDown = (
        event: PointerEvent,
      ) => {
        if (
          event.button !== 0 &&
          event.pointerType !== 'pen'
        ) {
          return;
        }

        if (
          event.pointerType ===
          'touch'
        ) {
          touchPointersRef.current.set(
            event.pointerId,
            {
              x: event.clientX,
              y: event.clientY,
            },
          );

          canvas.setPointerCapture(
            event.pointerId,
          );

          if (
            touchPointersRef.current
              .size >= 2
          ) {
            event.preventDefault();

            cancelDrawingForPinch();

            pinchDistanceRef.current =
              currentPinchDistance();

            return;
          }
        }

        event.preventDefault();

        activePointerRef.current =
          event.pointerId;

        if (
          !canvas.hasPointerCapture(
            event.pointerId,
          )
        ) {
          canvas.setPointerCapture(
            event.pointerId,
          );
        }

        const points =
          eventPoints(event);

        if (tool === 'ERASER') {
          erasedIdsRef.current =
            new Set();

          eraseAt(
            points[
              points.length - 1
            ],
          );

          return;
        }

        const drawingTool =
          tool as DrawingTool;

        const inkTool: PdfInkTool =
          drawingTool ===
          'HIGHLIGHTER'
            ? 'HIGHLIGHTER'
            : 'PEN';

        const nextDraft: PdfInkStroke =
          {
            color,
            id: createClientUuid(),
            points,
            tool: inkTool,
            width:
              TOOL_WIDTHS[
                drawingTool
              ][widthIndex],
          };

        draftRef.current =
          nextDraft;

        setDraft(nextDraft);
      };

      const onPointerMove = (
        event: PointerEvent,
      ) => {
        if (
          event.pointerType ===
            'touch' &&
          touchPointersRef.current.has(
            event.pointerId,
          )
        ) {
          touchPointersRef.current.set(
            event.pointerId,
            {
              x: event.clientX,
              y: event.clientY,
            },
          );

          const previousDistance =
            pinchDistanceRef.current;

          const nextDistance =
            currentPinchDistance();

          if (
            previousDistance !==
              null &&
            nextDistance !== null
          ) {
            event.preventDefault();

            if (
              previousDistance > 0 &&
              Math.abs(
                nextDistance -
                  previousDistance,
              ) >= 2
            ) {
              onPinchZoom(
                Math.min(
                  1.15,
                  Math.max(
                    0.85,
                    nextDistance /
                      previousDistance,
                  ),
                ),
              );

              pinchDistanceRef.current =
                nextDistance;
            }

            return;
          }
        }

        if (
          activePointerRef.current !==
          event.pointerId
        ) {
          return;
        }

        event.preventDefault();

        const points =
          eventPoints(event);

        if (tool === 'ERASER') {
          points.forEach(eraseAt);
          return;
        }

        const activeDraft =
          draftRef.current;

        if (
          !activeDraft ||
          activeDraft.points.length >=
            20000
        ) {
          return;
        }

        const nextDraft = {
          ...activeDraft,
          points: [
            ...activeDraft.points,
            ...points,
          ].slice(0, 20000),
        };

        draftRef.current =
          nextDraft;

        setDraft(nextDraft);
      };

      const finishPointer = (
        event: PointerEvent,
      ) => {
        const wasPinching =
          pinchDistanceRef.current !==
          null;

        if (
          event.pointerType ===
          'touch'
        ) {
          touchPointersRef.current.delete(
            event.pointerId,
          );

          if (
            canvas.hasPointerCapture(
              event.pointerId,
            )
          ) {
            canvas.releasePointerCapture(
              event.pointerId,
            );
          }

          if (wasPinching) {
            event.preventDefault();

            activePointerRef.current =
              null;

            if (
              touchPointersRef.current
                .size < 2
            ) {
              pinchDistanceRef.current =
                null;
            }

            return;
          }
        }

        if (
          activePointerRef.current !==
          event.pointerId
        ) {
          return;
        }

        event.preventDefault();

        activePointerRef.current =
          null;

        if (
          canvas.hasPointerCapture(
            event.pointerId,
          )
        ) {
          canvas.releasePointerCapture(
            event.pointerId,
          );
        }

        if (tool === 'ERASER') {
          const next =
            erasingPreviewRef.current;

          if (
            next &&
            next.length !==
              historyRef.current[
                historyIndexRef.current
              ].length
          ) {
            commit(next);
          }

          erasingPreviewRef.current =
            null;

          setErasingPreview(null);

          return;
        }

        const activeDraft =
          draftRef.current;

        if (
          activeDraft &&
          hasMeaningfulStroke(
            activeDraft,
          )
        ) {
          commit([
            ...historyRef.current[
              historyIndexRef.current
            ],
            activeDraft,
          ]);
        }

        draftRef.current = null;

        setDraft(null);
      };

      canvas.addEventListener(
        'pointerdown',
        onPointerDown,
      );

      canvas.addEventListener(
        'pointermove',
        onPointerMove,
      );

      canvas.addEventListener(
        'pointerup',
        finishPointer,
      );

      canvas.addEventListener(
        'pointercancel',
        finishPointer,
      );

      return () => {
        canvas.removeEventListener(
          'pointerdown',
          onPointerDown,
        );

        canvas.removeEventListener(
          'pointermove',
          onPointerMove,
        );

        canvas.removeEventListener(
          'pointerup',
          finishPointer,
        );

        canvas.removeEventListener(
          'pointercancel',
          finishPointer,
        );
      };
    }, [
      color,
      commit,
      height,
      onPinchZoom,
      tool,
      width,
      widthIndex,
    ]);

    useEffect(() => {
      const onKeyDown = (
        event: KeyboardEvent,
      ) => {
        if (
          !(
            event.metaKey ||
            event.ctrlKey
          ) ||
          event.key.toLowerCase() !==
            'z'
        ) {
          return;
        }

        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      };

      window.addEventListener(
        'keydown',
        onKeyDown,
      );

      return () => {
        window.removeEventListener(
          'keydown',
          onKeyDown,
        );
      };
    }, [redo, undo]);

    return (
      <canvas
        aria-label="PDF handwriting layer"
        ref={canvasRef}
        style={{
          cursor:
            tool === 'ERASER'
              ? 'cell'
              : 'crosshair',
          height,
          inset: 0,
          mixBlendMode: 'multiply',
          pointerEvents:
            tool === 'HAND'
              ? 'none'
              : 'auto',
          position: 'absolute',
          touchAction: 'none',
          width,
          zIndex: 2,
        }}
      />
    );
  });

type AnnotationContextValue = {
  activeState: PageUiState;
  chooseColor: (
    color: string,
  ) => void;
  chooseTool: (
    tool: EditorTool,
  ) => void;
  clearActive: () => void;
  color: string;
  currentPage: number;
  exportError?: string | null;
  exporting: boolean;
  exportSuccess?: string | null;
  materialId: string;
  onExport: () => void;
  onPinchZoom: (
    distanceRatio: number,
  ) => void;
  pageStates: Record<
    number,
    PageUiState
  >;
  redoActive: () => void;
  registerPageHandle: (
    pageNumber: number,
    handle: PageHandle | null,
  ) => void;
  reloadActive: () => void;
  retryActive: () => void;
  setWidthIndex: (
    index: number,
  ) => void;
  tool: EditorTool;
  undoActive: () => void;
  updatePageState: (
    pageNumber: number,
    patch: Partial<PageUiState>,
  ) => void;
  widthIndex: number;
};

const AnnotationContext =
  createContext<
    AnnotationContextValue | undefined
  >(undefined);

function useAnnotationContext() {
  const context = useContext(
    AnnotationContext,
  );

  if (!context) {
    throw new Error(
      'PDF annotation components must be inside PdfAnnotationProvider.',
    );
  }

  return context;
}

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
  onPinchZoom: (
    distanceRatio: number,
  ) => void;
}) {
  const [tool, setTool] =
    useState<EditorTool>('HAND');

  const [
    lastDrawingTool,
    setLastDrawingTool,
  ] =
    useState<DrawingTool>(
      'FOUNTAIN',
    );

  const [color, setColor] =
    useState(COLOR_SWATCHES[0]);

  const [
    widthIndex,
    setWidthIndex,
  ] = useState(1);

  const [
    pageStates,
    setPageStates,
  ] = useState<
    Record<number, PageUiState>
  >({});

  const pageHandlesRef =
    useRef(
      new Map<
        number,
        PageHandle
      >(),
    );

  const registerPageHandle =
    useCallback(
      (
        pageNumber: number,
        handle: PageHandle | null,
      ) => {
        if (handle) {
          pageHandlesRef.current.set(
            pageNumber,
            handle,
          );
        } else {
          pageHandlesRef.current.delete(
            pageNumber,
          );
        }
      },
      [],
    );

  const updatePageState =
    useCallback(
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

  const chooseTool =
    useCallback(
      (nextTool: EditorTool) => {
        setTool(nextTool);

        if (
          [
            'FOUNTAIN',
            'PENCIL',
            'BALLPOINT',
            'HIGHLIGHTER',
          ].includes(nextTool)
        ) {
          setLastDrawingTool(
            nextTool as DrawingTool,
          );
        }

        if (
          nextTool ===
            'HIGHLIGHTER' &&
          [
            brand.ink,
            '#FFFFFF',
          ].includes(color)
        ) {
          setColor(brand.mauve);
        }
      },
      [color],
    );

  const chooseColor =
    useCallback(
      (nextColor: string) => {
        setColor(nextColor);

        if (
          tool === 'HAND' ||
          tool === 'ERASER'
        ) {
          setTool(lastDrawingTool);
        }
      },
      [
        lastDrawingTool,
        tool,
      ],
    );

  const undoActive =
    useCallback(() => {
      pageHandlesRef.current
        .get(currentPage)
        ?.undo();
    }, [currentPage]);

  const redoActive =
    useCallback(() => {
      pageHandlesRef.current
        .get(currentPage)
        ?.redo();
    }, [currentPage]);

  const clearActive =
    useCallback(() => {
      pageHandlesRef.current
        .get(currentPage)
        ?.clear();
    }, [currentPage]);

  const retryActive =
    useCallback(() => {
      pageHandlesRef.current
        .get(currentPage)
        ?.retry();
    }, [currentPage]);

  const reloadActive =
    useCallback(() => {
      pageHandlesRef.current
        .get(currentPage)
        ?.reload();
    }, [currentPage]);

  const activeState =
    pageStates[currentPage] ??
    DEFAULT_PAGE_STATE;

  const value =
    useMemo<AnnotationContextValue>(
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
        materialId,
        onExport,
        onPinchZoom,
        pageStates,
        redoActive,
        registerPageHandle,
        reloadActive,
        retryActive,
        setWidthIndex,
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
        materialId,
        onExport,
        onPinchZoom,
        pageStates,
        redoActive,
        registerPageHandle,
        reloadActive,
        retryActive,
        tool,
        undoActive,
        updatePageState,
        widthIndex,
      ],
    );

  return (
    <AnnotationContext.Provider
      value={value}
    >
      {children}
    </AnnotationContext.Provider>
  );
}

export function PdfAnnotationToolbar({
  focusMode = false,
}: {
  focusMode?: boolean;
}) {
  const palette = useAppTheme();

  const {
    activeState,
    chooseColor,
    chooseTool,
    clearActive,
    color,
    currentPage,
    exportError,
    exporting,
    exportSuccess,
    onExport,
    pageStates,
    redoActive,
    reloadActive,
    retryActive,
    setWidthIndex,
    tool,
    undoActive,
    widthIndex,
  } = useAnnotationContext();

  const customColorRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const customColorSelected =
    !COLOR_SWATCHES.includes(color);

  const hasBlockingSave =
    Object.values(pageStates).some(
      (state) =>
        state.saveState ===
          'SAVING' ||
        state.saveState ===
          'ERROR',
    );

  const exportDisabled =
    exporting || hasBlockingSave;

  const toolHint =
    tool === 'HAND'
      ? 'Read mode · scroll through pages'
      : tool === 'ERASER'
        ? 'Stroke eraser · one finger erases · switch to the hand to scroll'
        : `${
            tool === 'FOUNTAIN'
              ? 'Fountain pen'
              : tool === 'PENCIL'
                ? 'Pencil'
                : tool ===
                    'BALLPOINT'
                  ? 'Ballpoint pen'
                  : 'Highlighter'
          } · one finger or Pencil draws · switch to the hand to scroll`;

  const saveStatus =
    activeState.loading
      ? 'Loading…'
      : activeState.loadError
        ? 'Not loaded'
        : activeState.saveState ===
            'SAVING'
          ? 'Saving…'
          : activeState.saveState ===
              'SAVED'
            ? 'Saved'
            : activeState.saveState ===
                'ERROR'
              ? 'Not saved'
              : 'Ready';

  return (
    <div
      style={{
        background:
          palette.surfaceAlt,
        position: 'sticky',
        top: 0,
        width: '100%',
        zIndex: focusMode
          ? 50
          : 20,
      }}
    >
      <div
        style={{
          maxWidth: '100%',
          overflowX: 'auto',
          padding:
            '8px 4px 14px',
          width: '100%',
        }}
      >
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor:
                palette.surface,
              borderColor:
                palette.border,
            },
          ]}
        >
          <View
            style={
              styles.actionGroup
            }
          >
            <Pressable
              accessibilityLabel="Undo annotation"
              disabled={
                !activeState.canUndo
              }
              onPress={undoActive}
              style={[
                styles.iconButton,
                {
                  borderColor:
                    palette.border,
                  opacity:
                    activeState.canUndo
                      ? 1
                      : 0.3,
                },
              ]}
            >
              <Ionicons
                color={palette.text}
                name="arrow-undo-outline"
                size={25}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="Redo annotation"
              disabled={
                !activeState.canRedo
              }
              onPress={redoActive}
              style={[
                styles.iconButton,
                {
                  borderColor:
                    palette.border,
                  opacity:
                    activeState.canRedo
                      ? 1
                      : 0.3,
                },
              ]}
            >
              <Ionicons
                color={palette.text}
                name="arrow-redo-outline"
                size={25}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  palette.border,
              },
            ]}
          />

          <View
            style={
              styles.toolGroup
            }
          >
            <ToolButton
              active={
                tool === 'HAND'
              }
              label="Read mode"
              onPress={() =>
                chooseTool('HAND')
              }
              tool="HAND"
            />

            <ToolButton
              active={
                tool === 'FOUNTAIN'
              }
              label="Fountain pen"
              onPress={() =>
                chooseTool(
                  'FOUNTAIN',
                )
              }
              tool="FOUNTAIN"
            />

            <ToolButton
              active={
                tool === 'PENCIL'
              }
              label="Pencil"
              onPress={() =>
                chooseTool('PENCIL')
              }
              tool="PENCIL"
            />

            <ToolButton
              active={
                tool ===
                'BALLPOINT'
              }
              label="Ballpoint pen"
              onPress={() =>
                chooseTool(
                  'BALLPOINT',
                )
              }
              tool="BALLPOINT"
            />

            <ToolButton
              active={
                tool ===
                'HIGHLIGHTER'
              }
              label="Highlighter"
              onPress={() =>
                chooseTool(
                  'HIGHLIGHTER',
                )
              }
              tool="HIGHLIGHTER"
            />

            <ToolButton
              active={
                tool === 'ERASER'
              }
              label="Eraser"
              onPress={() =>
                chooseTool('ERASER')
              }
              tool="ERASER"
            />
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  palette.border,
              },
            ]}
          />

          <View
            accessibilityLabel="Stroke size"
            style={
              styles.sizeRail
            }
          >
            {[0, 1, 2].map(
              (index) => (
                <Pressable
                  accessibilityLabel={`${
                    index === 0
                      ? 'Thin'
                      : index === 1
                        ? 'Medium'
                        : 'Thick'
                  } stroke`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      widthIndex ===
                      index,
                  }}
                  key={index}
                  onPress={() =>
                    setWidthIndex(
                      index,
                    )
                  }
                  style={[
                    styles.sizeButton,
                    {
                      backgroundColor:
                        widthIndex ===
                        index
                          ? palette.accentSoft
                          : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor:
                        widthIndex ===
                        index
                          ? palette.accentStrong
                          : palette.textMuted,
                      borderRadius:
                        radii.pill,
                      height:
                        2 +
                        index * 2,
                      width:
                        20 +
                        index * 5,
                    }}
                  />
                </Pressable>
              ),
            )}
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  palette.border,
              },
            ]}
          />

          <View
            style={
              styles.colorGrid
            }
          >
            {COLOR_SWATCHES.map(
              (option) => (
                <Pressable
                  accessibilityLabel={`Use ${option} ink`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      color ===
                      option,
                  }}
                  key={option}
                  onPress={() =>
                    chooseColor(
                      option,
                    )
                  }
                  style={[
                    styles.colorOuter,
                    {
                      borderColor:
                        color ===
                        option
                          ? palette.text
                          : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor:
                          option,
                        borderColor:
                          option ===
                          '#FFFFFF'
                            ? palette.border
                            : option,
                      },
                    ]}
                  />
                </Pressable>
              ),
            )}

            <Pressable
              accessibilityLabel="Choose custom ink color"
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  customColorSelected,
              }}
              onPress={() =>
                customColorRef.current?.click()
              }
              style={[
                styles.colorOuter,
                {
                  borderColor:
                    customColorSelected
                      ? palette.text
                      : 'transparent',
                },
              ]}
            >
              <div
                aria-hidden="true"
                style={{
                  alignItems:
                    'center',
                  background:
                    'conic-gradient(#ff3b30, #ffcc00, #34c759, #00c7ff, #5856d6, #ff2d55, #ff3b30)',
                  borderRadius: 18,
                  display: 'flex',
                  height: 34,
                  justifyContent:
                    'center',
                  width: 34,
                }}
              >
                <div
                  style={{
                    background:
                      palette.surface,
                    borderRadius: 7,
                    height: 14,
                    width: 14,
                  }}
                />
              </div>
            </Pressable>

            <input
              aria-label="Custom ink color"
              onChange={(event) =>
                chooseColor(
                  event.currentTarget.value.toUpperCase(),
                )
              }
              ref={customColorRef}
              style={{
                display: 'none',
              }}
              type="color"
              value={color}
            />
          </View>
        </View>
      </div>

      <View
        style={
          styles.statusRow
        }
      >
        <Text
          style={[
            styles.hint,
            {
              color:
                palette.textMuted,
            },
          ]}
        >
          {toolHint}
        </Text>

        <View
          style={
            styles.statusActions
          }
        >
          <Text
            style={[
              styles.saveStatus,
              {
                color:
                  activeState.saveState ===
                    'ERROR' ||
                  activeState.loadError
                    ? palette.danger
                    : activeState.saveState ===
                        'SAVED'
                      ? palette.success
                      : palette.textMuted,
              },
            ]}
          >
            Page {currentPage} ·{' '}
            {saveStatus}
          </Text>

          <Pressable
            accessibilityLabel="Download annotated PDF"
            accessibilityRole="button"
            disabled={
              exportDisabled
            }
            onPress={onExport}
            style={({ pressed }) => [
              styles.exportButton,
              {
                backgroundColor:
                  palette.accentSoft,
                borderColor:
                  palette.border,
                opacity:
                  exportDisabled
                    ? 0.45
                    : pressed
                      ? 0.72
                      : 1,
              },
            ]}
          >
            {exporting ? (
              <ActivityIndicator
                color={
                  palette.accentStrong
                }
                size="small"
              />
            ) : (
              <Ionicons
                color={
                  palette.accentStrong
                }
                name="download-outline"
                size={17}
              />
            )}

            <Text
              style={[
                styles.exportLabel,
                {
                  color:
                    palette.accentStrong,
                },
              ]}
            >
              {exporting
                ? 'Preparing…'
                : 'Download PDF'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Clear current page annotations"
            onPress={clearActive}
          >
            <Text
              style={[
                styles.clearLabel,
                {
                  color:
                    palette.danger,
                },
              ]}
            >
              Clear page
            </Text>
          </Pressable>
        </View>
      </View>

      {activeState.loadError ? (
        <View
          style={styles.errorRow}
        >
          <Text
            style={[
              styles.errorText,
              {
                color:
                  palette.danger,
              },
            ]}
          >
            Could not load handwritten
            marks on page{' '}
            {currentPage}:{' '}
            {
              activeState.loadError
            }
          </Text>

          <Pressable
            onPress={reloadActive}
          >
            <Text
              style={[
                styles.retry,
                {
                  color:
                    palette.accentStrong,
                },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : null}

      {activeState.saveState ===
        'ERROR' ? (
        <View
          style={styles.errorRow}
        >
          <Text
            style={[
              styles.errorText,
              {
                color:
                  palette.danger,
              },
            ]}
          >
            Could not save page{' '}
            {currentPage}:{' '}
            {
              activeState.saveError
            }
          </Text>

          <Pressable
            onPress={retryActive}
          >
            <Text
              style={[
                styles.retry,
                {
                  color:
                    palette.accentStrong,
                },
              ]}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      {exportError ? (
        <View
          style={styles.errorRow}
        >
          <Ionicons
            color={palette.danger}
            name="alert-circle-outline"
            size={17}
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  palette.danger,
              },
            ]}
          >
            Could not download the
            PDF: {exportError}
          </Text>
        </View>
      ) : null}

      {exportSuccess ? (
        <View
          style={
            styles.exportResult
          }
        >
          <Ionicons
            color={
              palette.success
            }
            name="checkmark-circle-outline"
            size={17}
          />

          <Text
            style={[
              styles.exportResultText,
              {
                color:
                  palette.success,
              },
            ]}
          >
            {exportSuccess}
          </Text>
        </View>
      ) : null}
    </div>
  );
}

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
  const queryClient =
    useQueryClient();

  const {
    color,
    materialId,
    onPinchZoom,
    registerPageHandle,
    tool,
    updatePageState,
    widthIndex,
  } = useAnnotationContext();

  const editorRef =
    useRef<InkEditorHandle | null>(
      null,
    );

  const annotations = useQuery({
    queryKey: [
      'pdf-annotations',
      materialId,
      pageNumber,
    ],
    queryFn: () =>
      getPdfAnnotations(
        materialId,
        pageNumber,
      ),
    staleTime: 60_000,
  });

  useEffect(() => {
    updatePageState(
      pageNumber,
      {
        loadError:
          annotations.error
            ? getErrorMessage(
                annotations.error,
              )
            : null,
        loading:
          annotations.isLoading,
      },
    );
  }, [
    annotations.error,
    annotations.isLoading,
    pageNumber,
    updatePageState,
  ]);

  const persist =
    useCallback(
      async (
        strokes: PdfInkStroke[],
      ) => {
        const saved =
          await savePdfAnnotations(
            materialId,
            pageNumber,
            strokes,
          );

        queryClient.setQueryData(
          [
            'pdf-annotations',
            materialId,
            pageNumber,
          ],
          saved,
        );
      },
      [
        materialId,
        pageNumber,
        queryClient,
      ],
    );

  const onSaveStateChange =
    useCallback(
      (
        state: SaveState,
        error?: string,
      ) => {
        updatePageState(
          pageNumber,
          {
            saveError:
              error ?? null,
            saveState: state,
          },
        );
      },
      [
        pageNumber,
        updatePageState,
      ],
    );

  const onHistoryChange =
    useCallback(
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
      [
        pageNumber,
        updatePageState,
      ],
    );

  const pageHandle =
    useMemo<PageHandle>(
      () => ({
        clear: () =>
          editorRef.current?.clear(),
        redo: () =>
          editorRef.current?.redo(),
        reload: () => {
          void annotations.refetch();
        },
        retry: () =>
          editorRef.current?.retry(),
        undo: () =>
          editorRef.current?.undo(),
      }),
      [annotations],
    );

  useEffect(() => {
    registerPageHandle(
      pageNumber,
      pageHandle,
    );

    return () => {
      registerPageHandle(
        pageNumber,
        null,
      );
    };
  }, [
    pageHandle,
    pageNumber,
    registerPageHandle,
  ]);

  const editorReady =
    annotations.isFetched &&
    !annotations.error;

  return (
    <div
      style={{
        height,
        position: 'relative',
        width,
      }}
    >
      {children}

      {editorReady &&
      width > 0 &&
      height > 0 ? (
        <PdfInkCanvas
          color={color}
          height={height}
          initialStrokes={parsePdfInkStrokes(
            annotations.data
              ?.strokes,
          )}
          key={`${materialId}:${pageNumber}`}
          onHistoryChange={
            onHistoryChange
          }
          onPinchZoom={
            onPinchZoom
          }
          onPersist={persist}
          onSaveStateChange={
            onSaveStateChange
          }
          ref={editorRef}
          tool={tool}
          width={width}
          widthIndex={
            widthIndex
          }
        />
      ) : null}
    </div>
  );
}

/**
 * Backwards-compatible single-page
 * wrapper.
 *
 * The new PdfReader uses
 * PdfAnnotationProvider +
 * PdfAnnotationToolbar +
 * PdfAnnotationPage directly.
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
  onPinchZoom: (
    distanceRatio: number,
  ) => void;
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
      onPinchZoom={
        onPinchZoom
      }
    >
      <View
        style={[
          styles.workspace,
          focusMode
            ? styles.focusWorkspace
            : null,
        ]}
      >
        <PdfAnnotationToolbar
          focusMode={focusMode}
        />

        <PdfAnnotationPage
          height={height}
          pageNumber={pageNumber}
          width={width}
        >
          {children}
        </PdfAnnotationPage>
      </View>
    </PdfAnnotationProvider>
  );
}

const styles =
  StyleSheet.create({
    workspace: {
      alignItems: 'flex-start',
      gap: spacing.xs,
      width: '100%',
    },

    focusWorkspace: {
      alignItems: 'center',
    },

    toolbar: {
      alignItems: 'center',
      borderRadius: 54,
      borderWidth: 1,
      boxShadow:
        '0 15px 34px rgba(14, 27, 72, 0.18)',
      flexDirection: 'row',
      gap: spacing.sm,
      marginHorizontal: 'auto',
      minHeight: 104,
      minWidth: 800,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      width: 800,
    },

    toolGroup: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 2,
    },

    actionGroup: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    toolButton: {
      alignItems: 'center',
      borderBottomWidth: 3,
      borderRadius: radii.md,
      borderWidth: 1,
      height: 84,
      justifyContent: 'center',
      paddingHorizontal: 5,
      width: 58,
    },

    iconButton: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },

    divider: {
      height: 70,
      marginHorizontal:
        spacing.xs,
      width: 1,
    },

    sizeRail: {
      gap: 2,
      justifyContent: 'center',
      width: 48,
    },

    sizeButton: {
      alignItems: 'center',
      borderRadius: radii.sm,
      height: 27,
      justifyContent: 'center',
      width: 46,
    },

    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 3,
      width: 126,
    },

    colorOuter: {
      alignItems: 'center',
      borderRadius: 22,
      borderWidth: 3,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },

    colorDot: {
      borderRadius: 17,
      borderWidth: 1,
      height: 32,
      width: 32,
    },

    statusRow: {
      alignItems: 'center',
      alignSelf: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent:
        'space-between',
      maxWidth: 800,
      paddingHorizontal:
        spacing.sm,
      width: '100%',
    },

    statusActions: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },

    hint: {
      ...typography.caption,
      flex: 1,
    },

    saveStatus: {
      ...typography.caption,
      fontWeight: '700',
    },

    exportButton: {
      alignItems: 'center',
      borderRadius:
        radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      minHeight: 36,
      paddingHorizontal:
        spacing.md,
    },

    exportLabel: {
      ...typography.caption,
      fontWeight: '700',
    },

    exportResult: {
      alignItems: 'center',
      alignSelf: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      maxWidth: 800,
      paddingHorizontal:
        spacing.sm,
      width: '100%',
    },

    exportResultText: {
      ...typography.caption,
      flex: 1,
      fontWeight: '700',
    },

    clearLabel: {
      ...typography.caption,
      fontWeight: '700',
    },

    errorRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent:
        'space-between',
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
    },

    errorText: {
      ...typography.caption,
      flex: 1,
    },

    retry: {
      ...typography.caption,
      fontWeight: '700',
    },
  });