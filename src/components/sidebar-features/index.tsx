import { Image, Film, Library, FolderOpen, Plug, Hammer } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const features = [
  { label: "Images", to: "/images", icon: Image },
  { label: "Videos", to: "/videos", icon: Film },
  { label: "Library", to: "/library", icon: Library },
  { label: "Projects", to: "/projects", icon: FolderOpen },
  { label: "Builder", to: "/builder", icon: Hammer },
  { label: "Plugins", to: "/integrations", icon: Plug },
] as const;

export default function SidebarFeatures({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Workspace features" className="space-y-0.5 px-3 pt-1.5">
      {features.map(({ label, to, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Button
            key={to}
            asChild
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Link to={to} onClick={onNavigate} aria-current={active ? "page" : undefined}>
              <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
              <span className="truncate">{label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
