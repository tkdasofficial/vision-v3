import { Plus, Image as ImageIcon, Clapperboard, Paperclip, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "@/lib/router-compat";

export type AttachKind = "image" | "video" | "file";

export const ACCEPT: Record<AttachKind, string> = {
  image: "image/*",
  video: "video/*,.mp4,.webm,.avi,.mov,.mkv",
  file: ".zip,application/zip,audio/*,.txt,.pdf,.html,.md,.csv,.json,.xml,.mp3,.wav,.ogg,.aac,.flac,.m4a,.svg",
};

/** "+" button opening Image / Video / File / Plugins. */
export default function AttachMenu({ onPick, imageOnly }: { onPick: (kind: AttachKind) => void; imageOnly?: boolean }) {
  const navigate = useNavigate();
  const items = [
    { kind: "image" as const, label: "Image", icon: ImageIcon },
    ...(imageOnly ? [] : [
      { kind: "video" as const, label: "Video", icon: Clapperboard },
      { kind: "file" as const, label: "File", icon: Paperclip },
    ]),
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Add attachment" title="Add attachment"
          className="group size-8 shrink-0 rounded-full border border-border p-0 text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-foreground data-[state=open]:text-background [&_svg]:size-[18px]">
          <Plus className="transition-transform group-data-[state=open]:rotate-45" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-60 rounded-[1.75rem] border-border bg-card p-2 shadow-xl">
        {items.map(({ kind, label, icon: Icon }) => (
          <DropdownMenuItem key={kind} onSelect={() => onPick(kind)} className="gap-3 rounded-2xl px-2 py-2 text-[15px] font-medium">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"><Icon className="size-5 text-foreground" /></span>{label}
          </DropdownMenuItem>
        ))}
        {!imageOnly && (
          <DropdownMenuItem onSelect={() => navigate("/integrations")} className="gap-3 rounded-2xl px-2 py-2 text-[15px] font-medium">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"><AtSign className="size-5 text-foreground" /></span>Plugins
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
