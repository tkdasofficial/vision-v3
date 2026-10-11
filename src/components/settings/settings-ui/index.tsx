import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/page-header";
import { cn } from "@/lib/utils";

/** Page frame for every Settings sub-page. */
export function SettingsPage({ title, children, loading, backTo = "/settings" }: { title: string; children: ReactNode; loading?: boolean; backTo?: string }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <PageHeader title={title} backTo={backTo} />
      <div className="flex-1 px-4 pt-2 pb-12 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-5">
          {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : children}
        </div>
      </div>
    </div>
  );
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <section>
      {description && !children && <p className="px-5 text-sm text-muted-foreground">{description}</p>}
      {children && <div className="space-y-2" aria-label={title}>{children}</div>}
    </section>
  );
}

export function SettingsRow({ label, hint, children, className }: { label: string; hint?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-full border border-border px-5 py-3 min-h-14", className)}>
      <p className="min-w-0 text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

export function SettingsToggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <SettingsRow label={label} hint={hint}>
      <button
        type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("w-11 h-6 shrink-0 rounded-full transition-colors relative disabled:opacity-50", checked ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("w-4 h-4 rounded-full bg-background absolute top-1 transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </SettingsRow>
  );
}

/** Segmented single-choice control. */
export function SettingsChoice<T extends string>({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-border px-5 py-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      
      <div role="radiogroup" aria-label={label} className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={cn("shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors border",
              value === o.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent")}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function ConfirmBox({ text, confirmLabel, onCancel, onConfirm, busy }: { text: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; busy?: boolean }) {
  return (
    <div className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-5">
      <p className="text-sm text-foreground mb-3">{text}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-full border border-border text-sm text-foreground hover:bg-accent">Cancel</button>
        <button onClick={onConfirm} disabled={busy} className="flex-1 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50">
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
