"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjs from "pdfjs-dist";
import type { Book } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type ReaderProps = {
  book: Book;
  initialPage: number;
  pdfUrl: string;
};

export function Reader({ book, initialPage, pdfUrl }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ---- protection: block right-click, copy, print, save, selection ----
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["s", "p", "u", "o"].includes(k)) e.preventDefault();
      if (mod && e.shiftKey && ["i", "j", "c"].includes(k)) e.preventDefault();
      if (e.key === "F12" || e.key === "PrintScreen") e.preventDefault();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
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
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
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

  // ---- render the current page to canvas ----
  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || loading) return;

      const pdfPage = await pdf.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: zoom });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: ctx, canvas, viewport }).promise;
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [page, zoom, loading]);

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

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 1), numPages);
      setPage((p) => (p === clamped ? p : clamped));
    },
    [numPages]
  );

  const goToPageInput = useCallback(
    (value: string) => {
      const n = Number(value);
      if (Number.isInteger(n)) goTo(n);
    },
    [goTo]
  );

  const toolBtn =
    "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5";

  return (
    <div
      ref={containerRef}
      className="flex h-full select-none flex-col bg-stone-100"
      style={{ WebkitUserSelect: "none" }}
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
        <span className="shrink-0 text-xs text-stone-400">
          {book.author ?? ""}
        </span>
      </div>

      {/* Page canvas */}
      <div className="flex flex-1 items-start justify-center overflow-auto p-4">
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
          <canvas ref={canvasRef} className="rounded-lg shadow-2xl shadow-stone-900/20" />
        )}
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
            key={page}
            type="number"
            min={1}
            max={numPages}
            defaultValue={page}
            onBlur={(e) => goToPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToPageInput((e.target as HTMLInputElement).value);
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
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          disabled={loading}
          className={`${toolBtn} px-2.5`}
          title="Zoom out"
        >
          −
        </button>
        <span className="w-10 text-center text-xs font-medium text-stone-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
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
    </div>
  );
}