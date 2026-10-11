import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Copy, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText, filenameFor } from "@/lib/code-files";
import { useCopy } from "@/components/chat/use-copy";

type Props = { code: string; language?: string; filename?: string; html?: string; onClose: () => void };
const MIN = 8, MAX = 32, BASE = 13;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

// Full-screen overlay (chat keeps its place underneath). Scrolls both ways and zooms with
// pinch, Ctrl/⌘ + wheel or the zoom buttons — the code re-lays out sharply instead of blurring.
export default function FullScreenCodeView({ code, language, filename, html, onClose }: Props) {
  const { copied, copy } = useCopy();
  const name = filenameFor(language, filename);
  const [size, setSize] = useState(BASE);
  const area = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ d: number; s: number } | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => { if (e.touches.length === 2) pinch.current = { d: dist(e.touches), s: size }; };
    const move = (e: TouchEvent) => { if (e.touches.length === 2 && pinch.current) { e.preventDefault(); setSize(clamp(Math.round(pinch.current.s * (dist(e.touches) / pinch.current.d)))); } };
    const end = () => { pinch.current = null; };
    const wheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setSize((s) => clamp(s + (e.deltaY < 0 ? 1 : -1))); } };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("wheel", wheel); };
  }, [size]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[10000] code-canvas flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back" className="rounded-full"><ArrowLeft /></Button>
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-sm text-muted-foreground">{name}</span>
        <Button variant="ghost" size="icon" onClick={() => downloadText(code, name)} aria-label={`Download ${name}`} className="rounded-full"><Download /></Button>
        <Button variant="ghost" size="icon" onClick={() => copy(code)} aria-label={copied ? "Copied" : "Copy"} className="rounded-full">{copied ? <Check /> : <Copy />}</Button>
      </header>
      <div ref={area} className="relative flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain">
        <pre className="m-0 min-w-max whitespace-pre p-4 pb-20 pl-[max(1rem,env(safe-area-inset-left))]">{html ? <code className="hljs bg-transparent p-0 font-mono leading-relaxed" style={{ fontSize: size }} dangerouslySetInnerHTML={{ __html: html }} /> : <code className="bg-transparent p-0 font-mono leading-relaxed" style={{ fontSize: size }}>{code}</code>}</pre>
      </div>
      <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        <Button variant="ghost" size="icon" className="pointer-events-auto size-8 rounded-full" onClick={() => setSize((s) => clamp(s - 1))} disabled={size <= MIN} aria-label="Zoom out"><ZoomOut className="size-4" /></Button>
        <button type="button" className="pointer-events-auto min-w-10 text-center font-mono text-xs text-muted-foreground" onClick={() => setSize(BASE)} aria-label="Reset zoom">{Math.round((size / BASE) * 100)}%</button>
        <Button variant="ghost" size="icon" className="pointer-events-auto size-8 rounded-full" onClick={() => setSize((s) => clamp(s + 1))} disabled={size >= MAX} aria-label="Zoom in"><ZoomIn className="size-4" /></Button>
      </div>
    </div>,
    document.body,
  );
}
