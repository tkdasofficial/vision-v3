import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, MessageSquare, Brain, BookOpen, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CHAT_MODES, type ChatMode } from "@/lib/ai/modes";

const ICONS: Record<ChatMode, React.ElementType> = { default: MessageSquare, deep: Brain, research: BookOpen, coding: Code };

type Props = { selectedMode: ChatMode; onModeChange: (mode: ChatMode) => void };

export default function ModeSelector({ selectedMode, onModeChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const w = 224;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - 8 - w);
    setPos({ top: r.top - 8, left });
    const close = (e: MouseEvent) => {
      if (!popupRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [isOpen]);

  const current = CHAT_MODES.find((m) => m.id === selectedMode) ?? CHAT_MODES[0];
  const CurrentIcon = ICONS[current.id];

  return (
    <>
      <Button
        variant="ghost" size="icon" ref={buttonRef} type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 shrink-0 gap-1.5 rounded-full border transition-colors",
          selectedMode === "default" ? "w-8 p-0 [&_svg]:size-[18px]" : "w-auto px-2.5 [&_svg]:size-3.5",
          isOpen ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-label={`Mode: ${current.label}`} aria-expanded={isOpen} aria-haspopup="menu"
      >
        {selectedMode === "default" ? (
          <Plus className={cn("transition-transform", isOpen && "rotate-45")} />
        ) : (
          <><CurrentIcon className="shrink-0" /><span className="text-xs font-medium leading-none">{current.label}</span></>
        )}
      </Button>
      {isOpen && createPortal(
        <div ref={popupRef} role="menu" style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
          className="z-[9999] w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-1.5">
            {CHAT_MODES.map((mode) => {
              const Icon = ICONS[mode.id];
              const selected = mode.id === selectedMode;
              return (
                <Button key={mode.id} type="button" variant="ghost" role="menuitemradio" aria-checked={selected}
                  onClick={() => { onModeChange(mode.id); setIsOpen(false); }}
                  className={cn("flex h-auto w-full items-center justify-start gap-2.5 whitespace-normal rounded-lg px-2.5 py-2 text-left",
                    selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
                  <Icon className="size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{mode.label}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{mode.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
