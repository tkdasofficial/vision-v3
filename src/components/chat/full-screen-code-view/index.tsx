import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText, filenameFor } from "@/lib/code-files";
import { useCopy } from "@/components/chat/use-copy";

type Props = { code: string; language?: string; filename?: string; onClose: () => void };

// Overlay (not a page change) so the chat keeps its scroll position underneath.
export default function FullScreenCodeView({ code, language, filename, onClose }: Props) {
  const { copied, copy } = useCopy();
  const name = filenameFor(language, filename);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[10000] flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back" className="rounded-full"><ArrowLeft /></Button>
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">{name}</span>
        <Button variant="ghost" size="icon" onClick={() => downloadText(code, name)} aria-label="Download" className="rounded-full"><Download /></Button>
        <Button variant="ghost" size="icon" onClick={() => copy(code)} aria-label={copied ? "Copied" : "Copy"} className="rounded-full">{copied ? <Check /> : <Copy />}</Button>
      </header>
      <div className="flex-1 overflow-auto">
        <pre className="m-0 min-w-max whitespace-pre p-4 pl-[max(1rem,env(safe-area-inset-left))]"><code className="bg-transparent p-0 font-mono text-[13px]">{code}</code></pre>
      </div>
    </div>,
    document.body,
  );
}
