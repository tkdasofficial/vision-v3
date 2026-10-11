import { useState } from "react";
import { Check, Copy, FileCode } from "lucide-react";
import FullScreenCodeView from "@/components/chat/full-screen-code-view";
import { useCopy } from "@/components/chat/use-copy";

type Props = { code: string; language?: string; filename?: string };

// Code output block: copy in the corner, tap the code to open full screen. Never wraps lines.
export default function CodeBlock({ code, language, filename }: Props) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopy();
  return (
    <div className="my-3 w-full overflow-hidden rounded-2xl border border-border bg-accent">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{filename || language || "code"}</span>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); copy(code); }} aria-label={copied ? "Copied" : "Copy code"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <div role="button" tabIndex={0} aria-label="Open code full screen"
        onClick={() => { if (!window.getSelection()?.toString()) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="aspect-square max-h-[min(60vh,28rem)] w-full cursor-zoom-in overflow-auto focus-visible:outline-2 focus-visible:outline-ring">
        <pre className="m-0 whitespace-pre p-4"><code className="bg-transparent p-0 font-mono text-[13px]">{code}</code></pre>
      </div>
      {open && <FullScreenCodeView code={code} language={language} filename={filename} onClose={() => setOpen(false)} />}
    </div>
  );
}
