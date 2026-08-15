"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjs from "pdfjs-dist";
import type { Book } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type ReaderProps = {
  book: Book;
  initialPage: number;
  pdfUrl: string;
};

type PageViewProps = {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  register: (el: HTMLElement, n: number) => void;
  unregister: (el: HTMLElement) => void;
  onVisibility: (n: number, v: boolean) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function PageView({
  pdf,
  pageNumber,
  scale,
  register,
  unregister,
  onVisibility,
}: PageViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [css, setCss] = useState({ w: 0, h: 0 });
  const visible = useRef(false);
  const renderedScale = useRef(0);
  const renderId = useRef(0);
  const taskRef = useRef<pdfjs.RenderTask | null>(null);

  const doRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !visible.current) return;
    if (renderedScale.current === scale && canvas.width > 4) return;
    const id = ++renderId.current;
    taskRef.current?.cancel();
    try {
      const pdfPage = await pdf.getPage(pageNumber);
      if (id !== renderId.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);
      if (id !== renderId.current) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const task = pdfPage.render({ canvasContext: ctx, canvas, viewport });
      taskRef.current = task;
      await task.promise;
      if (id !== renderId.current) return;
      taskRef.current = null;
      renderedScale.current = scale;
    } catch {
      // superseded by a newer render or unmount
    }
  }, [pdf, pageNumber, scale]);

  const renderRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    renderRef.current = doRender;
  }, [doRender]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    register(el, pageNumber);
    const io = new IntersectionObserver(
      (entries) => {
        visible.current = entries[0]?.isIntersecting ?? false;
        onVisibility(pageNumber, visible.current);
        if (visible.current) void renderRef.current();
      },
      { rootMargin: "150px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      taskRef.current?.cancel();
      onVisibility(pageNumber, false);
      unregister(el);
    };
  }, [register, unregister, onVisibility, pageNumber]);

  // Reserve the exact page size (cheap, no drawing) so the vertical scroll
  // layout has stable heights and jumping to any page works instantly.
  useEffect(() => {
    let cancelled = false;
    pdf
      .getPage(pageNumber)
      .then((pdfPage) => {
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale });
        setCss({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });
        if (cancelled) return;
        void renderRef.current();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0 overflow-hidden rounded-lg bg-white shadow-2xl shadow-stone-900/20"
      style={css.w > 0 ? { width: css.w, height: css.h } : undefined}
    >
      <canvas
        ref={canvasRef}
        draggable={false}
        className="block"
        style={{
          width: css.w > 0 ? css.w : undefined,
          height: css.h > 0 ? css.h : undefined,
          WebkitUserSelect: "none",
        }}
      />
    </div>
  );
}

export function Reader({ book, initialPage, pdfUrl }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pages = useRef(new Map<number, HTMLElement>());
  const visibleRef = useRef(new Set<number>());
  const pinch = useRef({ active: false, dist: 0, startZoom: 1 });
  const swipe = useRef({ x: 0, y: 0, active: false });
  const guardTimer = useRef(0);
  const scrollRaf = useRef(0);
  const pendingScroll = useRef(false);
  const didInit = useRef(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [baseW, setBaseW] = useState(1);
  const [containerW, setContainerW] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [guard, setGuard] = useState(false);

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // ---- protection: block right-click, copy, print, save, selection, screenshot ----
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["s", "p", "u", "o"].includes(k)) e.preventDefault();
      if (mod && e.shiftKey && ["i", "j", "c"].includes(k)) e.preventDefault();
      if (e.key === "F12" || e.key === "PrintScreen") {
        e.preventDefault();
        setGuard(true);
        window.clearTimeout(guardTimer.current);
        guardTimer.current = window.setTimeout(() => setGuard(false), 900);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    return () => {
      window.clearTimeout(guardTimer.current);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
    };
  }, []);

  // ---- hide content while the app is not in the foreground (anti-screenshot) ----
  useEffect(() => {
    const onBlur = () => setGuard(true);
    const onFocus = () => setGuard(false);
    const onVisibilityChange = () => setGuard(document.hidden);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // ---- load the PDF from the protected route ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(pdfUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load the book.");
        const buffer = await res.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        const first = await pdf.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        setBaseW(viewport.width);
        setNumPages(pdf.numPages);
        setPdfDoc(pdf);
        setPage((p) => Math.min(Math.max(p, 1), pdf.numPages));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open the book.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // ---- track available width so pages fit perfectly ----
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // ---- fit-to-width scale (pages are self-aligned, no horizontal scroll at 100%) ----
  const scale = useMemo(() => {
    const avail = Math.max((containerW || 0) - 32, 280);
    const capped = Math.min(avail, 560);
    const fit = capped / (baseW || 1);
    return Math.max(0.25, fit * zoom);
  }, [containerW, zoom, baseW]);

  const register = useCallback((el: HTMLElement, n: number) => {
    pages.current.set(n, el);
  }, []);
  const unregister = useCallback((el: HTMLElement) => {
    pages.current.forEach((e, n) => {
      if (e === el) pages.current.delete(n);
    });
  }, []);
  const onVisibility = useCallback((n: number, v: boolean) => {
    if (v) visibleRef.current.add(n);
    else visibleRef.current.delete(n);
  }, []);

  // ---- current page tracking + memory eviction for far-away pages ----
  const updateCurrentPage = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || visibleRef.current.size === 0) return;
    const anchor = scroller.getBoundingClientRect().top + 120;
    let best = 0;
    let bestDist = Infinity;
    visibleRef.current.forEach((n) => {
      const el = pages.current.get(n);
      if (!el) return;
      const dist = Math.abs(el.getBoundingClientRect().top - anchor);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    });
    if (!best) return;
    setPage((p) => (p === best ? p : best));
    pages.current.forEach((el, n) => {
      if (Math.abs(n - best) > 12 && !visibleRef.current.has(n)) {
        const canvas = el.querySelector("canvas");
        if (canvas && canvas.width > 4) {
          canvas.width = 2;
          canvas.height = 2;
        }
      }
    });
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(updateCurrentPage);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollRaf.current);
    };
  }, [updateCurrentPage]);

  // ---- navigation ----
  const scrollToPage = useCallback((n: number, smooth: boolean) => {
    const scroller = scrollRef.current;
    const el = pages.current.get(n);
    if (!scroller || !el) return;
    const top =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      8;
    scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(Math.round(next), 1), numPages);
      if (clamped < 1) return;
      pendingScroll.current = true;
      if (clamped === pageRef.current) {
        scrollToPage(clamped, true);
      } else {
        setPage(clamped);
      }
    },
    [numPages, scrollToPage]
  );

  useEffect(() => {
    if (loading || numPages === 0) return;
    if (pendingScroll.current) {
      pendingScroll.current = false;
      scrollToPage(page, true);
    }
  }, [page, loading, numPages, scrollToPage]);

  // jump to the saved position once, right after the layout is ready
  useEffect(() => {
    if (loading || numPages === 0 || didInit.current) return;
    didInit.current = true;
    const t = setTimeout(() => scrollToPage(page, false), 80);
    return () => clearTimeout(t);
  }, [loading, numPages, page, scrollToPage]);

  // ---- pinch / wheel zoom (native listeners so preventDefault works) ----
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch.current = {
          active: true,
          dist: Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          ),
          startZoom: zoomRef.current,
        };
        swipe.current.active = false;
      } else if (e.touches.length === 1) {
        swipe.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          active: true,
        };
      }
    };
    const onMove = (e: TouchEvent) => {
      if (pinch.current.active && e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setZoom(clamp(pinch.current.startZoom * (d / pinch.current.dist), 0.5, 3));
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (pinch.current.active) {
        pinch.current.active = false;
        swipe.current.active = false;
        return;
      }
      if (swipe.current.active && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - swipe.current.x;
        const dy = e.changedTouches[0].clientY - swipe.current.y;
        if (
          Math.abs(dx) > 60 &&
          Math.abs(dx) > Math.abs(dy) * 1.5 &&
          zoomRef.current <= 1.05
        ) {
          goTo(pageRef.current + (dx < 0 ? 1 : -1));
        }
      }
      swipe.current.active = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => clamp(z - e.deltaY * 0.002, 0.5, 3));
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [goTo]);

  // ---- fullscreen ----
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  // ---- save progress (debounced) ----
  useEffect(() => {
    if (loading || page < 1) return;
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/books/${book.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_page: page }),
        });
      } catch {
        // ignore — progress is best-effort
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [page, loading, book.id]);

  const toolBtn =
    "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5";

  return (
    <div
      ref={containerRef}
      className="flex h-dvh select-none flex-col overflow-hidden bg-stone-100"
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 bg-stone-900 px-4 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/library"
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Library
          </Link>
          <span className="min-w-0 truncate text-sm font-medium">{book.title}</span>
        </div>
        <span className="shrink-0 text-xs text-stone-400">{book.author ?? ""}</span>
      </div>

      {/* Vertical continuous scroll */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-auto overscroll-contain"
          style={{ touchAction: "pan-x pan-y" }}
        >
          {error ? (
            <div className="mt-16 rounded-2xl bg-red-50 px-6 py-4 text-center text-sm text-red-700">
              {error}
            </div>
          ) : loading ? (
            <div className="mt-24 flex flex-col items-center gap-2 text-sm text-[--muted]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              Opening book…
            </div>
          ) : (
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5 px-4 py-6">
              {pdfDoc &&
                Array.from({ length: numPages }, (_, i) => (
                  <PageView
                    key={i + 1}
                    pdf={pdfDoc}
                    pageNumber={i + 1}
                    scale={scale}
                    register={register}
                    unregister={unregister}
                    onVisibility={onVisibility}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Page flip arrows */}
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Previous page"
          className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-stone-700 shadow-lg ring-1 ring-black/5 transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
        >
          ‹
        </button>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= numPages || loading}
          aria-label="Next page"
          className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-stone-700 shadow-lg ring-1 ring-black/5 transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
        >
          ›
        </button>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 bg-stone-900 px-4 py-2.5 text-white sm:gap-3">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1 || loading}
          className={toolBtn}
        >
          ← Prev
        </button>

        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="number"
            min={1}
            max={numPages}
            value={page}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= numPages) goTo(n);
            }}
            className="w-14 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-center text-white outline-none focus:border-teal-400"
          />
          <span className="text-stone-400">/ {numPages}</span>
        </div>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= numPages || loading}
          className={toolBtn}
        >
          Next →
        </button>

        <div className="mx-1 h-5 w-px bg-white/10" />

        <button
          onClick={() => setZoom((z) => clamp(z - 0.25, 0.5, 3))}
          disabled={loading}
          className={`${toolBtn} px-2.5`}
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          disabled={loading}
          className="w-10 rounded-lg px-0.5 text-center text-xs font-medium text-stone-300 transition hover:text-white"
          title="Fit to width"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => clamp(z + 0.25, 0.5, 3))}
          disabled={loading}
          className={`${toolBtn} px-2.5`}
          title="Zoom in"
        >
          +
        </button>

        <button
          onClick={toggleFullscreen}
          disabled={loading}
          className={`${toolBtn} hidden sm:block`}
        >
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>

      {/* Anti-screenshot overlay while the app is not focused */}
      {guard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950">
          <p className="px-6 text-center text-sm text-stone-400">
            Content is hidden while you are away.
          </p>
        </div>
      )}
    </div>
  );
}
