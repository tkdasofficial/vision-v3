import type { ReactNode } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared page top bar: back (or menu) button, page name right beside it, optional actions on the far right. */
export default function PageHeader({
  title, onBack, backTo, onMenu, actions, className, menuClassName,
}: {
  title: ReactNode;
  onBack?: () => void;
  backTo?: string;
  onMenu?: () => void;
  actions?: ReactNode;
  className?: string;
  menuClassName?: string;
}) {
  const navigate = useNavigate();
  const back = onBack ?? (backTo ? () => navigate(backTo) : onMenu ? undefined : () => navigate(-1));
  return (
    <header className={cn("flex shrink-0 items-center gap-3 bg-transparent px-4 py-3 [&_button_svg]:size-5", className)}>
      {back ? (
        <Button variant="secondary" size="icon" className="shrink-0 rounded-full" aria-label="Go back" title="Go back" onClick={back}><ArrowLeft /></Button>
      ) : (
        <Button variant="secondary" size="icon" className={cn("shrink-0 rounded-full [&_svg]:size-5", menuClassName)} aria-label="Open menu" title="Open menu" onClick={onMenu}><Menu /></Button>
      )}
      <h1 className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
