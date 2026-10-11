import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Download, RotateCcw, Square, ChevronDown, FileCode2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOB_STATUSES, isTerminal, type JobView } from "@/lib/builder/statuses";
import { cancelJob, downloadUrl } from "@/lib/builder/jobs-client";

const TITLES = { code_export: "Code file", project_generate: "Project", zip_analyze: "ZIP analysis" } as const;
const fmt = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

function StatusIcon({ status }: { status: JobView["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "completed_with_warnings") return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "cancelled") return <Ban className="h-4 w-4 text-muted-foreground" />;
  return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
}

export default function JobCard({ job, onRetry, compact }: { job: JobView; onRetry?: (id: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [cancelling, setCancelling] = useState(false);
  const running = !isTerminal(job.status);
  const r = job.result ?? {};
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <StatusIcon status={job.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{TITLES[job.type]}{r.name ? ` · ${r.name}` : r.fileName ? ` · ${r.fileName}` : ""}</span>
            <Badge variant={job.status === "failed" ? "destructive" : "secondary"} className="rounded-full">{JOB_STATUSES[job.status]}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" aria-live="polite">{job.error ?? job.detail}</p>
          {job.progress != null && running && <div className="mt-2 h-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>}
        </div>
        <div className="flex shrink-0 gap-1">
          {running && <Button size="sm" variant="ghost" disabled={cancelling} onClick={async () => { setCancelling(true); await cancelJob(job.id).catch(() => setCancelling(false)); }} aria-label="Cancel task"><Square className="h-3.5 w-3.5" /></Button>}
          {(job.status === "failed" || job.status === "cancelled") && onRetry && <Button size="sm" variant="ghost" onClick={() => onRetry(job.id)} aria-label="Retry task"><RotateCcw className="h-3.5 w-3.5" /></Button>}
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Show details"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></Button>
        </div>
      </div>

      {job.artifacts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.artifacts.map((a) => (
            <Button key={a.id} asChild size="sm" variant="secondary" className="rounded-full">
              <a href={downloadUrl(a.id)} download={a.name}><Download className="mr-1.5 h-3.5 w-3.5" />{a.name} <span className="ml-1 text-muted-foreground">{fmt(a.size)}</span></a>
            </Button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
          <ol className="space-y-1">
            {job.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", s.outcome === "error" ? "bg-destructive" : s.outcome === "warn" ? "bg-muted-foreground" : s.endedAt ? "bg-primary" : "animate-pulse bg-foreground")} />
                <span className="font-medium">{JOB_STATUSES[s.status] ?? s.status}</span>
                <span className="text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ol>
          {job.warnings.length > 0 && (
            <div className="rounded-xl bg-muted p-3 text-xs">
              <p className="mb-1 font-medium">Warnings</p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">{job.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {job.type === "project_generate" && r.files && (
            <div>
              <p className="mb-1 text-xs font-medium">{r.stackLabel} · {r.files.length} files</p>
              <ul className="max-h-56 overflow-y-auto rounded-xl bg-muted p-3 font-mono text-xs">{r.files.map((f: any) => <li key={f.path} className="flex justify-between gap-2"><span className="truncate"><FileCode2 className="mr-1 inline h-3 w-3" />{f.path}</span><span className="text-muted-foreground">{fmt(f.size)}</span></li>)}</ul>
              {r.validation && <p className="mt-2 text-xs text-muted-foreground">Checked: {r.validation.checked.join(", ")}. Not checked: {r.validation.notChecked.join("; ")}.</p>}
            </div>
          )}
          {job.type === "code_export" && r.content && (
            <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-3 text-xs"><code>{r.content}</code></pre>
          )}
          {job.type === "zip_analyze" && r.analysis && (
            <div className="space-y-2 text-xs">
              <p><span className="font-medium">Stack:</span> {r.analysis.stack.join(", ") || "Not detected"} · {r.analysis.inventory.files} files · {fmt(r.analysis.inventory.totalBytes)}</p>
              {r.analysis.findings.length > 0 && (
                <ul className="space-y-1">{r.analysis.findings.slice(0, 12).map((f: any, i: number) => <li key={i}><Badge variant={f.severity === "high" ? "destructive" : "outline"} className="mr-1.5 rounded-full text-[10px] uppercase">{f.severity}</Badge>{f.title}{f.path ? <span className="text-muted-foreground"> — {f.path}</span> : null}</li>)}</ul>
              )}
              <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 font-mono">{r.analysis.tree}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
