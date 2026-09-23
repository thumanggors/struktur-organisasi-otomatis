"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN = 0.25;
const MAX = 2;
const STEP = 0.1;

const btn =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Uses CSS `zoom` rather than `transform: scale` so the scroll area resizes
 * with the chart. The zoom sits on this wrapper, outside #org-chart-capture,
 * so PNG/PDF exports still render at full size.
 */
export default function ZoomableChart({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const set = (z: number) => setZoom(Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100)));
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // The chart loads lazily and a wide org puts the top person mid-canvas,
  // so center horizontally once the content first has a real width.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const observer = new ResizeObserver(() => {
      if (content.offsetWidth === 0) return;
      scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
      observer.disconnect();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => set(zoom - STEP)} disabled={zoom <= MIN} aria-label="Perkecil" className={btn}>
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-14 text-center text-sm font-medium text-slate-700 tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => set(zoom + STEP)} disabled={zoom >= MAX} aria-label="Perbesar" className={btn}>
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => set(1)} aria-label="Reset zoom ke 100%" className={btn}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div ref={scrollRef} className="max-h-[75vh] overflow-auto rounded-lg border border-slate-100">
        <div ref={contentRef} className="w-max" style={{ zoom }}>
          {children}
        </div>
      </div>
    </div>
  );
}
