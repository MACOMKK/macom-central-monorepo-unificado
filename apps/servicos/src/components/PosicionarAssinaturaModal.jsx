import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@macom/ui';
import { loadAssinaturaPreference, saveAssinaturaPreference } from '@/lib/assinaturaPdfPreferences';

let pdfjsLibPromise = null;

// Carregado sob demanda (import dinamico) para nao inflar o bundle/precache do PWA com o
// pdfjs-dist inteiro so por causa desta tela, que so e usada quando o usuario marca "Incluir
// minha assinatura".
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, workerUrlModule]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
}

const CANVAS_TARGET_WIDTH = 560;
const MIN_WIDTH_FRAC = 0.06;
const MARGEM_PT = 40;
const LARGURA_PADRAO_PT = 120;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function defaultBox(pageWidthPt, pageHeightPt, imageAspectRatio) {
  const widthFrac = LARGURA_PADRAO_PT / pageWidthPt;
  const heightPt = imageAspectRatio * LARGURA_PADRAO_PT;
  const heightFrac = heightPt / pageHeightPt;
  const xFrac = (pageWidthPt - LARGURA_PADRAO_PT - MARGEM_PT) / pageWidthPt;
  const yFrac = 1 - (MARGEM_PT + heightPt) / pageHeightPt;
  return {
    xFrac: clamp(xFrac, 0, 1 - widthFrac),
    yFrac: clamp(yFrac, 0, 1 - heightFrac),
    widthFrac,
    heightFrac,
  };
}

export default function PosicionarAssinaturaModal({
  open,
  onOpenChange,
  pdfBytes,
  totalPaginas,
  signatureUrl,
  userId,
  onConfirm,
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [box, setBox] = useState(null);
  const [pageSizePt, setPageSizePt] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [isRenderingPage, setIsRenderingPage] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const preferenceRef = useRef(null);

  useEffect(() => {
    if (!open || !pdfBytes) return;

    let cancelled = false;
    loadPdfjs()
      .then((pdfjsLib) => pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise)
      .then((doc) => {
        if (!cancelled) setPdfDoc(doc);
      })
      .catch(() => {
        if (!cancelled) setPdfDoc(null);
      });

    preferenceRef.current = loadAssinaturaPreference(userId, totalPaginas);
    setPageIndex(preferenceRef.current?.pageIndex ?? Math.max(0, totalPaginas - 1));
    setBox(null);

    return () => {
      cancelled = true;
    };
  }, [open, pdfBytes, userId, totalPaginas]);

  useEffect(() => {
    if (!open || !signatureUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth) setImageAspectRatio(img.naturalHeight / img.naturalWidth);
    };
    img.src = signatureUrl;
  }, [open, signatureUrl]);

  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;
    setIsRenderingPage(true);

    pdfDoc.getPage(pageIndex + 1).then((page) => {
      if (cancelled) return;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = CANVAS_TARGET_WIDTH / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');

      page
        .render({ canvasContext: context, viewport })
        .promise.then(() => {
          if (cancelled) return;
          setPageSizePt({ width: unscaledViewport.width, height: unscaledViewport.height });
          setCanvasSize({ width: viewport.width, height: viewport.height });
          setIsRenderingPage(false);
        })
        .catch(() => {
          if (!cancelled) setIsRenderingPage(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex]);

  useEffect(() => {
    if (!pageSizePt || box) return;
    const preference = preferenceRef.current;
    if (preference && preference.pageIndex === pageIndex) {
      setBox({
        xFrac: preference.xFrac,
        yFrac: preference.yFrac,
        widthFrac: preference.widthFrac,
        heightFrac: preference.heightFrac,
      });
    } else {
      setBox(defaultBox(pageSizePt.width, pageSizePt.height, imageAspectRatio));
    }
  }, [pageSizePt, box, pageIndex, imageAspectRatio]);

  const boxPx = useMemo(() => {
    if (!box || !canvasSize.width) return null;
    return {
      left: box.xFrac * canvasSize.width,
      top: box.yFrac * canvasSize.height,
      width: box.widthFrac * canvasSize.width,
      height: box.heightFrac * canvasSize.height,
    };
  }, [box, canvasSize]);

  function handlePageChange(value) {
    setBox(null);
    setPageIndex(Number(value));
  }

  function handleDragPointerDown(event) {
    if (!boxPx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: boxPx.left,
      startTop: boxPx.top,
    };
  }

  function handleDragPointerMove(event) {
    if (!dragStateRef.current || !canvasSize.width) return;
    const { startClientX, startClientY, startLeft, startTop } = dragStateRef.current;
    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    setBox((prev) => {
      if (!prev) return prev;
      const widthPx = prev.widthFrac * canvasSize.width;
      const heightPx = prev.heightFrac * canvasSize.height;
      const newLeft = clamp(startLeft + dx, 0, canvasSize.width - widthPx);
      const newTop = clamp(startTop + dy, 0, canvasSize.height - heightPx);
      return { ...prev, xFrac: newLeft / canvasSize.width, yFrac: newTop / canvasSize.height };
    });
  }

  function handleDragPointerUp(event) {
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleResizePointerDown(event) {
    event.stopPropagation();
    if (!boxPx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStateRef.current = { startClientX: event.clientX, startWidth: boxPx.width };
  }

  function handleResizePointerMove(event) {
    if (!resizeStateRef.current || !canvasSize.width) return;
    const { startClientX, startWidth } = resizeStateRef.current;
    const dx = event.clientX - startClientX;
    setBox((prev) => {
      if (!prev) return prev;
      const leftPx = prev.xFrac * canvasSize.width;
      const minWidthPx = MIN_WIDTH_FRAC * canvasSize.width;
      const maxWidthPx = canvasSize.width - leftPx;
      const newWidthPx = clamp(startWidth + dx, minWidthPx, maxWidthPx);
      const newHeightPx = newWidthPx * imageAspectRatio;
      const maxHeightPx = canvasSize.height - prev.yFrac * canvasSize.height;
      const finalHeightPx = Math.min(newHeightPx, maxHeightPx);
      const finalWidthPx = finalHeightPx / imageAspectRatio;
      return {
        ...prev,
        widthFrac: finalWidthPx / canvasSize.width,
        heightFrac: finalHeightPx / canvasSize.height,
      };
    });
  }

  function handleResizePointerUp(event) {
    resizeStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function handleConfirmar() {
    if (!box) return;
    setIsConfirming(true);
    try {
      await onConfirm({ pageIndex, ...box });
      saveAssinaturaPreference(userId, { pageIndex, totalPaginas, ...box });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isConfirming && onOpenChange(next)}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Posicionar assinatura</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Página</p>
          <Select value={String(pageIndex)} onValueChange={handlePageChange}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPaginas }, (_, index) => (
                <SelectItem key={index} value={String(index)}>
                  Página {index + 1} de {totalPaginas}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-md border border-border bg-muted/20"
          style={{ width: canvasSize.width || CANVAS_TARGET_WIDTH, height: canvasSize.height || 400 }}
        >
          <canvas ref={canvasRef} className="block" />

          {isRenderingPage && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Spinner size="sm" />
            </div>
          )}

          {!isRenderingPage && boxPx && signatureUrl && (
            <div
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              className="absolute cursor-move border border-dashed border-primary bg-primary/5"
              style={{ left: boxPx.left, top: boxPx.top, width: boxPx.width, height: boxPx.height }}
            >
              <img src={signatureUrl} alt="Assinatura" className="h-full w-full select-none object-contain" draggable={false} />
              <div
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-background"
              />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Arraste para posicionar e use a alça do canto para redimensionar.</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar} disabled={isConfirming || !box}>
            {isConfirming ? <Spinner size="sm" /> : null}
            Confirmar e baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
