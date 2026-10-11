import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import FullScreenCodeView from "@/components/chat/full-screen-code-view";
import { useCopy } from "@/components/chat/use-copy";
import { highlight } from "@/components/chat/highlight";

type Props = { code: string; language?: string; filename?: string };
const LINES = 15; // roughly 14–16 lines fill the square

// Square, colourised code canvas. Each code line stays on one line and is clipped at the edge.
// The canvas never scrolls or zooms itself: tapping, swiping or pinching it opens the full-screen viewer.
export default function CodeBlock({ code, language, filename }: Props) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const [font, setFont] = useState(13);
  const hl = useMemo(() => highlight(code, language), [code, language]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setFont(Math.max(9, Math.min(16, (el.clientHeight - 32) / (LINES * 1.6))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const openIt = (e: Event) => { e.preventDefault(); setOpen(true); };
    let sx = 0, sy = 0;
    const ts = (e: TouchEvent) => { if (e.touches.length > 1) return openIt(e); sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    // Horizontal swipe or pinch opens the viewer; vertical swipes keep scrolling the chat.
    const tm = (e: TouchEvent) => {
      if (e.touches.length > 1) return openIt(e);
      const dx = Math.abs(e.touches[0].clientX - sx), dy = Math.abs(e.touches[0].clientY - sy);
      if (dx > 12 && dx > dy) openIt(e);
    };
    const wh = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) openIt(e); };
    el.addEventListener("touchstart", ts, { passive: false });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("wheel", wh, { passive: false });
    return () => { el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("wheel", wh); };
  }, []);

  return (
    <div ref={box} className="code-canvas relative my-3 aspect-square w-full max-w-full overflow-hidden rounded-2xl border border-border">
      <div
        role="button" tabIndex={0} aria-label="Open code full screen"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="absolute inset-0 cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-ring"
      >
        <pre className="m-0 overflow-hidden whitespace-pre p-4 pr-14"><code className="hljs bg-transparent p-0 font-mono" style={{ fontSize: font, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: hl.html }} /></pre>
      </div>
      <button
        type="button" onClick={(e) => { e.stopPropagation(); copy(code); }} aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-background/90 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
      {open && <FullScreenCodeView code={code} language={language ?? hl.language} filename={filename} html={hl.html} onClose={() => setOpen(false)} />}
    </div>
  );
}
