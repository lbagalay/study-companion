// Web implementation.
// Metro selects PdfReader.native.tsx
// on iOS and Android.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PdfAnnotationPage,
  PdfAnnotationProvider,
  PdfAnnotationToolbar,
} from '@/components/materials/PdfAnnotationWorkspace';

import { PdfNotesPanel } from '@/components/materials/PdfNotesPanel';

import { AppButton } from '@/components/ui/AppButton';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

import { radii, spacing, typography } from '@/constants/theme';

import { useAppTheme } from '@/hooks/useAppTheme';
import { keys } from '@/hooks/useStudyData';

import { getErrorMessage } from '@/lib/errors';

import { annotatedPdfFileName, createAnnotatedPdf, downloadPdf } from '@/lib/pdf/export';

import { clampPdfPage, pdfReadingProgress, scalePdfZoom } from '@/lib/pdf/progress';

import { createSaveQueue } from '@/lib/pdf/saveQueue';

import {
  getMaterial,
  getMaterialUrl,
  listPdfAnnotations,
  updatePdfReadingProgress,
} from '@/services';

import type { StudyMaterial } from '@/types/database';

type ContinuousPdfPageProps = {
  availableWidth: number;
  onElement: (pageNumber: number, element: HTMLDivElement | null) => void;
  onVisibilityChange: (pageNumber: number, ratio: number) => void;
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  zoom: number;
};

function ContinuousPdfPage({
  availableWidth,
  onElement,
  onVisibilityChange,
  pageNumber,
  pdfDocument,
  zoom,
}: ContinuousPdfPageProps) {
  const palette = useAppTheme();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderTaskRef = useRef<RenderTask | null>(null);

  const [pdfPage, setPdfPage] = useState<PDFPageProxy | null>(null);

  const [pageSize, setPageSize] = useState({
    height: 0,
    width: 0,
  });

  const [shouldRender, setShouldRender] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  const [renderError, setRenderError] = useState<string | null>(null);

  const setContainer = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;

      onElement(pageNumber, element);
    },
    [onElement, pageNumber],
  );

  /**
   * Load page metadata and calculate
   * the page's display size.
   *
   * This is much cheaper than actually
   * rendering every page immediately.
   */
  useEffect(() => {
    let active = true;

    void (async () => {
      const page = await pdfDocument.getPage(pageNumber);

      if (!active) {
        return;
      }

      const unscaled = page.getViewport({
        scale: 1,
      });

      const fitScale = Math.min(availableWidth / unscaled.width, 2);

      const scale = fitScale * zoom;

      const viewport = page.getViewport({
        scale,
      });

      if (!active) {
        return;
      }

      setPdfPage(page);

      setPageSize({
        height: Math.max(1, Math.floor(viewport.height)),
        width: Math.max(1, Math.floor(viewport.width)),
      });
    })().catch((error) => {
      if (active) {
        setRenderError(getErrorMessage(error));
      }
    });

    return () => {
      active = false;
    };
  }, [availableWidth, pageNumber, pdfDocument, zoom]);

  /**
   * Lazy-load a page when it gets
   * reasonably close to the viewport.
   *
   * This prevents a 100-page PDF from
   * rendering all pages at once.
   */
  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          setShouldRender(true);
        }
      },
      {
        rootMargin: '2200px 0px',
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  /**
   * Track how visible this page is.
   *
   * PdfReader uses these ratios to
   * decide which page is current.
   */
  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        onVisibilityChange(pageNumber, entry.isIntersecting ? entry.intersectionRatio : 0);
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();

      onVisibilityChange(pageNumber, 0);
    };
  }, [onVisibilityChange, pageNumber]);

  /**
   * Actually render the PDF page
   * into its canvas.
   */
  useEffect(() => {
    if (
      !shouldRender ||
      !pdfPage ||
      !canvasRef.current ||
      pageSize.width <= 0 ||
      pageSize.height <= 0
    ) {
      return;
    }

    let active = true;

    const canvas = canvasRef.current;

    const viewport = pdfPage.getViewport({
      scale:
        pageSize.width /
        pdfPage.getViewport({
          scale: 1,
        }).width,
    });

    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(pageSize.width * outputScale));

    canvas.height = Math.max(1, Math.floor(pageSize.height * outputScale));

    canvas.style.width = `${pageSize.width}px`;

    canvas.style.height = `${pageSize.height}px`;

    const context = canvas.getContext('2d');

    if (!context) {
      setRenderError('The browser could not create the PDF canvas.');

      return;
    }

    setRenderError(null);

    renderTaskRef.current?.cancel();

    renderTaskRef.current = pdfPage.render({
      canvas,
      canvasContext: context,
      transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      viewport,
    });

    void renderTaskRef.current.promise.catch((error) => {
      if (
        !active ||
        (
          error as {
            name?: string;
          }
        ).name === 'RenderingCancelledException'
      ) {
        return;
      }

      setRenderError(getErrorMessage(error));
    });

    return () => {
      active = false;

      renderTaskRef.current?.cancel();
    };
  }, [pageSize.height, pageSize.width, pdfPage, shouldRender]);

  const placeholderWidth = pageSize.width > 0 ? pageSize.width : Math.max(280, availableWidth);

  const placeholderHeight =
    pageSize.height > 0 ? pageSize.height : Math.round(placeholderWidth * 1.294);

  return (
    <div
      data-page={pageNumber}
      id={`pdf-page-${pageNumber}`}
      ref={setContainer}
      style={{
        boxSizing: 'border-box',
        marginBottom: 18,
        overflowX: 'auto',
        scrollMarginTop: 190,
        width: '100%',
      }}
    >
      <div
        style={{
          background: palette.surface,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          height: placeholderHeight,
          margin: '0 auto',
          maxWidth: 'none',
          position: 'relative',
          width: placeholderWidth,
        }}
      >
        {shouldRender && pdfPage && pageSize.width > 0 && pageSize.height > 0 ? (
          <PdfAnnotationPage
            height={pageSize.height}
            pageNumber={pageNumber}
            width={pageSize.width}
          >
            <canvas
              aria-label={`Page ${pageNumber}`}
              ref={canvasRef}
              style={{
                backgroundColor: '#FFFFFF',
                display: 'block',
                height: pageSize.height,
                width: pageSize.width,
              }}
            />
          </PdfAnnotationPage>
        ) : (
          <View
            style={[
              styles.pagePlaceholder,
              {
                backgroundColor: palette.surface,
                height: placeholderHeight,
                width: placeholderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.placeholderText,
                {
                  color: palette.textMuted,
                },
              ]}
            >
              Page {pageNumber}
            </Text>
          </View>
        )}

        {renderError ? (
          <div
            style={{
              alignItems: 'center',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              inset: 0,
              justifyContent: 'center',
              padding: 20,
              position: 'absolute',
              zIndex: 6,
            }}
          >
            <Text
              style={[
                styles.renderError,
                {
                  color: palette.danger,
                },
              ]}
            >
              Could not render page {pageNumber}: {renderError}
            </Text>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PdfReader({
  initialPage,
  materialId,
}: {
  initialPage?: number;
  materialId: string;
}) {
  const palette = useAppTheme();

  const queryClient = useQueryClient();

  const { width } = useWindowDimensions();

  const material = useQuery({
    queryKey: ['material', materialId],
    queryFn: () => getMaterial(materialId),
    enabled: Boolean(materialId),
  });

  const signedUrl = useQuery({
    queryKey: ['material-pdf-url', materialId, material.data?.file_url],

    queryFn: () => getMaterialUrl(material.data!.file_url!, 3600),

    enabled: material.data?.type === 'PDF' && Boolean(material.data.file_url),

    meta: {
      persist: false,
    },

    staleTime: 45 * 60 * 1000,
  });

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

  /**
   * currentPage now means:
   *
   * "the page currently most visible"
   *
   * It no longer controls which single
   * page gets rendered.
   */
  const [currentPage, setCurrentPage] = useState(1);

  const [resumedFromPage, setResumedFromPage] = useState<number | null>(null);

  const [jumpPage, setJumpPage] = useState('1');

  const [readerError, setReaderError] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);

  const [focusMode, setFocusMode] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [exportError, setExportError] = useState<string | null>(null);

  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const initialized = useRef(false);

  const enqueueSave = useRef(createSaveQueue()).current;

  const fullscreenRequested = useRef(false);

  const pageElementsRef = useRef(new Map<number, HTMLDivElement>());

  const visibleRatiosRef = useRef(new Map<number, number>());

  const lastVisiblePageRef = useRef(1);

  const pendingScrollPageRef = useRef<number | null>(null);

  const suppressVisibilityRef = useRef(false);

  const progressTimerRef = useRef<number | null>(null);

  const pendingProgressRef = useRef<{ page: number; pageCount: number } | null>(null);

  const persistPositionRef = useRef<((page: number, pageCount: number) => void) | null>(null);

  /**
   * The saved page is only ever read once, when
   * the document first opens. Holding it in a ref
   * keeps it out of the loader effect's deps, so
   * writing progress cannot restart the download.
   */
  const savedPageRef = useRef(material.data?.last_read_page ?? 1);

  useEffect(() => {
    if (material.data) {
      savedPageRef.current = material.data.last_read_page;
    }
  }, [material.data]);

  const patchMaterialCache = useCallback(
    (page: number, pageCount: number, openedAt: string) => {
      const patch = (item: StudyMaterial) =>
        item.id === materialId
          ? {
              ...item,
              last_opened_at: openedAt,
              last_read_page: page,
              page_count: pageCount,
            }
          : item;

      queryClient.setQueryData<StudyMaterial[]>(keys.materials, (items) => items?.map(patch));

      queryClient.setQueryData<StudyMaterial>(['material', materialId], (item) =>
        item ? patch(item) : item,
      );
    },
    [materialId, queryClient],
  );

  const persistPosition = useCallback(
    (page: number, pageCount: number) => {
      const openedAt = new Date().toISOString();

      patchMaterialCache(page, pageCount, openedAt);

      setSaveError(null);

      enqueueSave(
        async () => {
          const saved = await updatePdfReadingProgress(materialId, page, pageCount);

          patchMaterialCache(saved.last_read_page, saved.page_count, saved.last_opened_at);
        },
        (error) => {
          if (error) setSaveError(getErrorMessage(error));
        },
      );
    },
    [enqueueSave, materialId, patchMaterialCache],
  );

  useEffect(() => {
    persistPositionRef.current = persistPosition;
  }, [persistPosition]);

  /**
   * Continuous scrolling can move
   * across pages quickly, so debounce
   * database progress writes.
   */
  const schedulePersistPosition = useCallback(
    (page: number, pageCount: number) => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
      }

      pendingProgressRef.current = { page, pageCount };

      progressTimerRef.current = window.setTimeout(() => {
        progressTimerRef.current = null;

        pendingProgressRef.current = null;

        persistPosition(page, pageCount);
      }, 450);
    },
    [persistPosition],
  );

  /**
   * Leaving the reader mid-debounce used to
   * throw the position away, so closing a PDF
   * straight after scrolling lost the place.
   * Flush whatever is still pending instead.
   */
  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);

        progressTimerRef.current = null;
      }

      const pending = pendingProgressRef.current;

      if (pending) {
        pendingProgressRef.current = null;

        persistPositionRef.current?.(pending.page, pending.pageCount);
      }
    };
  }, []);

  /**
   * Register every page's DOM node.
   *
   * This is what Jump to Page uses.
   */
  const registerPageElement = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (!element) {
      pageElementsRef.current.delete(pageNumber);

      return;
    }

    pageElementsRef.current.set(pageNumber, element);

    if (pendingScrollPageRef.current !== pageNumber) {
      return;
    }

    pendingScrollPageRef.current = null;

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });

      window.setTimeout(() => {
        suppressVisibilityRef.current = false;
      }, 150);
    });
  }, []);

  /**
   * Determine the current page by
   * choosing whichever page currently
   * has the largest visible ratio.
   */
  const handlePageVisibility = useCallback(
    (pageNumber: number, ratio: number) => {
      visibleRatiosRef.current.set(pageNumber, ratio);

      if (suppressVisibilityRef.current) {
        return;
      }

      let bestPage: number | null = null;

      let bestRatio = 0;

      visibleRatiosRef.current.forEach((visibleRatio, page) => {
        if (visibleRatio > bestRatio) {
          bestRatio = visibleRatio;

          bestPage = page;
        }
      });

      if (bestPage === null || bestRatio <= 0) {
        return;
      }

      if (bestPage === lastVisiblePageRef.current) {
        return;
      }

      lastVisiblePageRef.current = bestPage;

      setCurrentPage(bestPage);

      setJumpPage(String(bestPage));

      if (pdfDocument) {
        schedulePersistPosition(bestPage, pdfDocument.numPages);
      }
    },
    [pdfDocument, schedulePersistPosition],
  );

  const enterFocusMode = useCallback(() => {
    pendingScrollPageRef.current = currentPage;

    suppressVisibilityRef.current = true;

    setFocusMode(true);

    const request = globalThis.document.documentElement.requestFullscreen?.();

    if (request) {
      void request
        .then(() => {
          fullscreenRequested.current = true;
        })
        .catch(() => undefined);
    }
  }, [currentPage]);

  const exitFocusMode = useCallback(() => {
    pendingScrollPageRef.current = currentPage;

    suppressVisibilityRef.current = true;

    setFocusMode(false);

    fullscreenRequested.current = false;

    if (globalThis.document.fullscreenElement) {
      void globalThis.document.exitFullscreen?.().catch(() => undefined);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!focusMode) {
      return;
    }

    const previousOverflow = globalThis.document.body.style.overflow;

    globalThis.document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !globalThis.document.fullscreenElement) {
        exitFocusMode();
      }
    };

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

  /**
   * Load the complete PDF document.
   */
  useEffect(() => {
    if (!signedUrl.data) {
      return;
    }

    let active = true;

    let loadingTask: PDFDocumentLoadingTask | null = null;

    void (async () => {
      await Promise.resolve();

      if (!active) {
        return;
      }

      setReaderError(null);

      const pdfjs = await import('pdfjs-dist');

      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      loadingTask = pdfjs.getDocument({
        url: signedUrl.data,
      });

      const loadedDocument = await loadingTask.promise;

      if (!active) {
        return;
      }

      setPdfDocument(loadedDocument);

      if (!initialized.current) {
        initialized.current = true;

        const savedPage = clampPdfPage(savedPageRef.current, loadedDocument.numPages);

        const hasRequestedPage = initialPage !== undefined;

        const openingPage = hasRequestedPage
          ? clampPdfPage(initialPage, loadedDocument.numPages)
          : savedPage;

        setResumedFromPage(!hasRequestedPage && savedPage > 1 ? savedPage : null);

        setCurrentPage(openingPage);

        lastVisiblePageRef.current = openingPage;

        setJumpPage(String(openingPage));

        suppressVisibilityRef.current = true;

        pendingScrollPageRef.current = openingPage;

        persistPosition(openingPage, loadedDocument.numPages);
      }
    })().catch((error) => {
      if (active) {
        setReaderError(getErrorMessage(error));
      }
    });

    return () => {
      active = false;

      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
    // Deliberately keyed on the document source only. Reading progress is held
    // in refs above, because persisting it writes back into the material cache
    // and any dependency on that cache would destroy and re-download the PDF
    // the reader is currently displaying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedUrl.data]);

  /**
   * Jump to a page by scrolling instead
   * of swapping the single canvas.
   */
  const goToPage = useCallback(
    (page: number) => {
      if (!pdfDocument) {
        return;
      }

      const nextPage = clampPdfPage(page, pdfDocument.numPages);

      setJumpPage(String(nextPage));

      setCurrentPage(nextPage);

      lastVisiblePageRef.current = nextPage;

      const element = pageElementsRef.current.get(nextPage);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else {
        pendingScrollPageRef.current = nextPage;
      }

      schedulePersistPosition(nextPage, pdfDocument.numPages);
    },
    [pdfDocument, schedulePersistPosition],
  );

  const pinchZoom = useCallback((distanceRatio: number) => {
    setZoom((currentZoom) => scalePdfZoom(currentZoom, distanceRatio));
  }, []);

  const exportAnnotatedPdf = useCallback(async () => {
    if (exporting || !signedUrl.data || !material.data) {
      return;
    }

    setExporting(true);

    setExportError(null);

    setExportSuccess(null);

    try {
      const [sourceResponse, annotations] = await Promise.all([
        fetch(signedUrl.data, {
          cache: 'no-store',
        }),

        listPdfAnnotations(materialId),
      ]);

      if (!sourceResponse.ok) {
        throw new Error(
          'The private source file could not be opened. Refresh the reader and try again.',
        );
      }

      const exported = await createAnnotatedPdf(await sourceResponse.arrayBuffer(), annotations);

      const fileName = annotatedPdfFileName(material.data.file_name, material.data.title);

      downloadPdf(exported.bytes, fileName);

      setExportSuccess(
        exported.strokeCount > 0
          ? `Downloaded ${fileName} with ${exported.strokeCount} saved mark${exported.strokeCount === 1 ? '' : 's'} across ${exported.annotatedPageCount} page${exported.annotatedPageCount === 1 ? '' : 's'}.`
          : `Downloaded ${fileName}. No saved handwritten marks were found.`,
      );
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }, [exporting, material.data, materialId, signedUrl.data]);

  if (material.isLoading) {
    return (
      <FeedbackState loading message="Checking your private material." title="Opening PDF reader" />
    );
  }

  if (material.error) {
    return (
      <FeedbackState
        actionLabel="Try again"
        message={getErrorMessage(material.error)}
        onAction={() => void material.refetch()}
        title="Could not load this PDF"
      />
    );
  }

  if (!material.data || material.data.type !== 'PDF' || !material.data.file_url) {
    return <FeedbackState message="This material is not a stored PDF." title="PDF unavailable" />;
  }

  if (signedUrl.isLoading || (!pdfDocument && !readerError)) {
    return (
      <FeedbackState
        loading
        message="Creating a secure reader link and loading the document."
        title="Opening PDF"
      />
    );
  }

  if (signedUrl.error || readerError || !pdfDocument) {
    return (
      <FeedbackState
        actionLabel="Try again"
        message={readerError ?? getErrorMessage(signedUrl.error)}
        onAction={() => void signedUrl.refetch()}
        title="Could not open this PDF"
      />
    );
  }

  const progress = pdfReadingProgress(currentPage, pdfDocument.numPages);

  const availableWidth = focusMode
    ? Math.max(width - 16, 280)
    : Math.min(Math.max(width - 32, 280), 980);

  const pages = (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 8,
        paddingTop: 8,
        width: '100%',
      }}
    >
      {Array.from(
        {
          length: pdfDocument.numPages,
        },
        (_, index) => {
          const pageNumber = index + 1;

          return (
            <ContinuousPdfPage
              availableWidth={availableWidth}
              key={pageNumber}
              onElement={registerPageElement}
              onVisibilityChange={handlePageVisibility}
              pageNumber={pageNumber}
              pdfDocument={pdfDocument}
              zoom={zoom}
            />
          );
        },
      )}
    </div>
  );

  const annotationProviderProps = {
    currentPage,
    exportError,
    exporting,
    exportSuccess,
    materialId,
    onExport: () => void exportAnnotatedPdf(),
    onPinchZoom: pinchZoom,
  };

  const readerContent = focusMode ? (
    <div
      style={{
        background: palette.surfaceAlt,
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        inset: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 'env(safe-area-inset-top)',
        position: 'fixed',
        width: '100vw',
        zIndex: 1000,
      }}
    >
      <View
        style={[
          styles.focusHeader,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Exit full-screen annotation"
          accessibilityRole="button"
          onPress={exitFocusMode}
          style={[
            styles.focusIconButton,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons color={palette.accentStrong} name="contract-outline" size={22} />
        </Pressable>

        <View style={styles.focusTitleGroup}>
          <Text
            numberOfLines={1}
            style={[
              styles.focusTitle,
              {
                color: palette.text,
              },
            ]}
          >
            {material.data.title}
          </Text>

          {width >= 600 ? (
            <Text
              numberOfLines={1}
              style={[
                styles.focusFile,
                {
                  color: palette.textMuted,
                },
              ]}
            >
              {material.data.file_name}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.focusPageTools,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Previous page"
            disabled={currentPage <= 1}
            onPress={() => goToPage(currentPage - 1)}
            style={{
              opacity: currentPage <= 1 ? 0.3 : 1,
            }}
          >
            <Ionicons color={palette.text} name="chevron-back" size={23} />
          </Pressable>

          <Text
            style={[
              styles.focusPage,
              {
                color: palette.text,
              },
            ]}
          >
            {currentPage} / {pdfDocument.numPages}
          </Text>

          <Pressable
            accessibilityLabel="Next page"
            disabled={currentPage >= pdfDocument.numPages}
            onPress={() => goToPage(currentPage + 1)}
            style={{
              opacity: currentPage >= pdfDocument.numPages ? 0.3 : 1,
            }}
          >
            <Ionicons color={palette.text} name="chevron-forward" size={23} />
          </Pressable>
        </View>

        <View
          style={[
            styles.focusZoomTools,
            {
              borderColor: palette.border,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Zoom out"
            disabled={zoom <= 0.75}
            onPress={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))}
            style={{
              opacity: zoom <= 0.75 ? 0.3 : 1,
            }}
          >
            <Ionicons color={palette.text} name="remove" size={22} />
          </Pressable>

          <Pressable accessibilityLabel="Reset zoom" onPress={() => setZoom(1)}>
            <Text
              style={[
                styles.focusZoom,
                {
                  color: palette.text,
                },
              ]}
            >
              {Math.round(zoom * 100)}%
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Zoom in"
            disabled={zoom >= 2.5}
            onPress={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))}
            style={{
              opacity: zoom >= 2.5 ? 0.3 : 1,
            }}
          >
            <Ionicons color={palette.text} name="add" size={22} />
          </Pressable>
        </View>
      </View>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
        }}
      >
        <PdfAnnotationToolbar focusMode />

        {pages}
      </div>
    </div>
  ) : (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor: palette.background,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          back
          description={material.data.file_name ?? 'Private PDF'}
          title={material.data.title}
        />

        {resumedFromPage ? (
          <View
            style={[
              styles.resume,
              {
                backgroundColor: palette.accentSoft,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.resumeCopy}>
              <Text
                style={[
                  styles.resumeTitle,
                  {
                    color: palette.text,
                  },
                ]}
              >
                Resumed from page {resumedFromPage}
              </Text>

              <Text
                style={[
                  styles.caption,
                  {
                    color: palette.textMuted,
                  },
                ]}
              >
                Your reading position saves automatically as you scroll.
              </Text>
            </View>

            <AppButton
              label="Start over"
              onPress={() => {
                setResumedFromPage(null);

                goToPage(1);
              }}
              variant="ghost"
            />
          </View>
        ) : null}

        <View style={styles.progressHeader}>
          <Text
            style={[
              styles.pageLabel,
              {
                color: palette.text,
              },
            ]}
          >
            Page {currentPage} of {pdfDocument.numPages}
          </Text>

          <Text
            style={[
              styles.progressLabel,
              {
                color: palette.accentStrong,
              },
            ]}
          >
            {progress}% read
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: palette.accentSolid,
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        <View style={styles.zoomControls}>
          <Pressable
            accessibilityLabel="Annotate full screen"
            accessibilityRole="button"
            onPress={enterFocusMode}
            style={[
              styles.focusEntry,
              {
                backgroundColor: palette.accentSolid,
              },
            ]}
          >
            <Ionicons color="#FFFFFF" name="expand-outline" size={18} />

            <Text style={styles.focusEntryLabel}>Annotate</Text>
          </Pressable>

          <View style={styles.zoomActions}>
            <AppButton
              accessibilityLabel="Zoom out"
              disabled={zoom <= 0.75}
              label="−"
              onPress={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))}
              style={styles.zoomButton}
              variant="secondary"
            />

            <Pressable
              accessibilityLabel="Reset zoom"
              accessibilityRole="button"
              onPress={() => setZoom(1)}
              style={[
                styles.zoomValue,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.zoomText,
                  {
                    color: palette.text,
                  },
                ]}
              >
                {Math.round(zoom * 100)}%
              </Text>
            </Pressable>

            <AppButton
              accessibilityLabel="Zoom in"
              disabled={zoom >= 2.5}
              label="+"
              onPress={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))}
              style={styles.zoomButton}
              variant="secondary"
            />
          </View>
        </View>

        <View
          style={[
            styles.viewer,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          <PdfAnnotationToolbar />

          {pages}
        </View>

        <View style={styles.jump}>
          <View style={styles.jumpField}>
            <FormField
              keyboardType="number-pad"
              label="Jump to page"
              onChangeText={setJumpPage}
              onSubmitEditing={() => goToPage(Number(jumpPage))}
              returnKeyType="go"
              value={jumpPage}
            />
          </View>

          <AppButton
            label="Go"
            onPress={() => goToPage(Number(jumpPage))}
            style={styles.goButton}
            variant="secondary"
          />
        </View>

        {saveError ? (
          <Text
            style={[
              styles.saveError,
              {
                color: palette.danger,
              },
            ]}
          >
            Reading position could not be saved: {saveError}
          </Text>
        ) : null}

        <PdfNotesPanel
          currentPage={currentPage}
          material={material.data}
          onJumpToPage={goToPage}
          pageCount={pdfDocument.numPages}
        />
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <PdfAnnotationProvider {...annotationProviderProps}>{readerContent}</PdfAnnotationProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    alignSelf: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },

  resume: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },

  resumeCopy: {
    flex: 1,
    gap: spacing.xs,
  },

  resumeTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
  },

  caption: typography.caption,

  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  pageLabel: typography.sectionTitle,

  progressLabel: typography.label,

  progressTrack: {
    borderRadius: radii.pill,
    height: 8,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },

  progressFill: {
    borderRadius: radii.pill,
    height: '100%',
  },

  zoomControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  zoomActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },

  zoomButton: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },

  zoomValue: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 66,
    paddingHorizontal: spacing.sm,
  },

  zoomText: typography.label,

  /**
   * No longer creates a one-page
   * scrolling container.
   *
   * The main ScrollView handles
   * vertical document scrolling.
   */
  viewer: {
    alignItems: 'stretch',
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 420,
    overflow: 'visible',
    padding: spacing.sm,
  },

  renderError: {
    ...typography.caption,
    maxWidth: 480,
    textAlign: 'center',
  },

  pagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    ...typography.caption,
    fontWeight: '700',
  },

  jump: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },

  jumpField: {
    flex: 1,
  },

  goButton: {
    marginTop: 29,
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 16,
  },
  saveError: {
    ...typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  focusHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 10,
  },

  focusIconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },

  focusTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  focusTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
  },

  focusFile: typography.caption,

  focusPageTools: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },

  focusPage: {
    ...typography.label,
    minWidth: 52,
    textAlign: 'center',
  },

  focusZoomTools: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },

  focusZoom: {
    ...typography.caption,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'center',
  },

  focusEntry: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  focusEntryLabel: {
    ...typography.label,
    color: '#FFFFFF',
  },
});
