import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface HandwritingCanvasHandle {
  clear: () => void;
  toDataURL: () => string;
  isBlank: () => boolean;
}

interface Props {
  guideText?: string;
  guideShape?: "circle" | "square" | "triangle" | "rectangle";
  height?: number;
}

// Two stacked canvases: a static guide layer (lines/letter/shape, visual only)
// and a transparent ink layer the child actually draws on. Submissions are
// composited from the ink layer onto a plain white background so the guide
// artwork never pollutes handwriting evaluation (has-ink checks, AI vision).
export const HandwritingCanvas = forwardRef<HandwritingCanvasHandle, Props>(function HandwritingCanvas(
  { guideText, guideShape, height = 360 },
  ref,
) {
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const drawGuide = () => {
    const canvas = guideCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#d8e0f0";
    ctx.lineWidth = 2;
    const midY = canvas.height / 2;
    [0.25, 0.5, 0.75].forEach((frac) => {
      ctx.beginPath();
      ctx.setLineDash(frac === 0.5 ? [] : [8, 6]);
      ctx.moveTo(0, canvas.height * frac);
      ctx.lineTo(canvas.width, canvas.height * frac);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    if (guideText) {
      ctx.fillStyle = "#e5eaf5";
      ctx.font = `${Math.min(canvas.height * 0.7, 260)}px "Baloo 2", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guideText, canvas.width / 2, midY);
    }

    if (guideShape) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = Math.min(canvas.width, canvas.height) * 0.5;
      ctx.strokeStyle = "#c7d4ec";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (guideShape === "circle") {
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      } else if (guideShape === "square") {
        ctx.rect(cx - size / 2, cy - size / 2, size, size);
      } else if (guideShape === "rectangle") {
        ctx.rect(cx - size * 0.65, cy - size * 0.4, size * 1.3, size * 0.8);
      } else if (guideShape === "triangle") {
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx - size / 2, cy + size / 2);
        ctx.closePath();
      }
      ctx.stroke();
    }
  };

  const clearInk = () => {
    const canvas = inkCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
  };

  useEffect(() => {
    const guide = guideCanvasRef.current;
    const ink = inkCanvasRef.current;
    if (!guide || !ink) return;
    const parent = guide.parentElement;
    const width = parent ? parent.clientWidth : 600;
    guide.width = width;
    guide.height = height;
    ink.width = width;
    ink.height = height;
    drawGuide();
    clearInk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideText, guideShape, height]);

  useImperativeHandle(ref, () => ({
    clear: clearInk,
    toDataURL: () => {
      const ink = inkCanvasRef.current;
      if (!ink) return "";
      const output = document.createElement("canvas");
      output.width = ink.width;
      output.height = ink.height;
      const ctx = output.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.drawImage(ink, 0, 0);
      return output.toDataURL("image/png");
    },
    isBlank: () => !hasInkRef.current,
  }));

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = inkCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    inkCanvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPoint.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = inkCanvasRef.current?.getContext("2d");
    const point = getPoint(e);
    if (!ctx || !lastPoint.current) return;

    ctx.strokeStyle = "#2c3550";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPoint.current = point;
    hasInkRef.current = true;
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPoint.current = null;
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas
        ref={guideCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full rounded-3xl border-4 border-brand-blue-light bg-white shadow-inner"
      />
      <canvas
        ref={inkCanvasRef}
        className="kid-tap-target absolute inset-0 h-full w-full touch-none rounded-3xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
});
