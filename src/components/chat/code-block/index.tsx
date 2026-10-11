import { useState } from "react";
import { Check, Copy } from "lucide-react";
import FullScreenCodeView from "@/components/chat/full-screen-code-view";
import { useCopy } from "@/components/chat/use-copy";

type Props = { code: string; language?: string; filename?: string };

// Square code canvas: code starts at the top edge, lines never wrap (scroll sideways inside the canvas only),
// copy sits in the top-right corner, and tapping anywhere else opens the full-screen viewer.
export default function CodeBlock({ code, language, filename }: Props) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopy();
  return (
    <div className="relative my-3 aspect-square w-full max-w-full overflow-hidden rounded-2xl border border-border bg-accent">
      <div
        role="button" tabIndex={0} aria-label="Open code full screen"
        onClick={() => { if (!window.getSelection()?.toString()) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="absolute inset-0 cursor-zoom-in overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-ring"
      >
        <pre className="m-0 min-w-max whitespace-pre p-4 pr-14"><code className="bg-transparent p-0 font-mono text-[13px] leading-relaxed">{code}</code></pre>
      </div>
      <button
        type="button" onClick={(e) => { e.stopPropagation(); copy(code); }} aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-background/90 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
      {open && <FullScreenCodeView code={code} language={language} filename={filename} onClose={() => setOpen(false)} />}
    </div>
  );
}
