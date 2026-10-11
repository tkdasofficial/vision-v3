import { Gauge, Brain, BookOpen, Code, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CHAT_MODES, type ChatMode } from "@/lib/ai/modes";

const ICONS: Record<ChatMode, React.ElementType> = { default: Gauge, deep: Brain, research: BookOpen, coding: Code };
const PICKABLE = CHAT_MODES.filter((m) => m.id !== "default");

type Props = { selectedMode: ChatMode; onModeChange: (mode: ChatMode) => void };

/** Mode picker: Deep Thinking, Research, Coding. The active mode shows as a removable chip. */
export default function ModeSelector({ selectedMode, onModeChange }: Props) {
  const current = CHAT_MODES.find((m) => m.id === selectedMode);
  const active = selectedMode !== "default" && current;
  const CurrentIcon = ICONS[selectedMode];

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" aria-label={active ? `Mode: ${current.label}` : "Choose mode"} title="Choose mode"
            className={cn("h-8 shrink-0 gap-1.5 rounded-full border transition-colors",
              active ? "border-primary/40 bg-primary/10 px-3 text-primary hover:bg-primary/15 hover:text-primary [&_svg]:size-4" : "w-8 border-border p-0 text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-[18px]")}>
            <CurrentIcon className="shrink-0" />
            {active && <span className="text-xs font-medium leading-none">{current.label}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-64 rounded-[1.75rem] border-border bg-card p-2 shadow-xl">
          {PICKABLE.map((mode) => {
            const Icon = ICONS[mode.id];
            const selected = mode.id === selectedMode;
            return (
              <DropdownMenuItem key={mode.id} onSelect={() => onModeChange(selected ? "default" : mode.id)} className="gap-3 rounded-2xl px-2 py-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"><Icon className="size-5 text-foreground" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-foreground">{mode.label}</span>
                  <span className="block text-xs text-muted-foreground">{mode.description}</span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {active && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear mode" title="Clear mode" onClick={() => onModeChange("default")}
          className="size-6 rounded-full p-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"><X /></Button>
      )}
    </div>
  );
}
