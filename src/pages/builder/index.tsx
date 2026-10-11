import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import WorkspaceShell from "@/components/workspace-shell";
import JobCard from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobView } from "@/lib/builder/statuses";
import { listJobs, retryJob, runJob } from "@/lib/builder/jobs-client";

const LANGS = ["auto", "html", "css", "javascript", "typescript", "tsx", "python", "java", "c", "cpp", "csharp", "go", "rust", "php", "ruby", "kotlin", "swift", "sql", "bash", "json", "yaml", "markdown"];
const STACK_OPTIONS = [
  { v: "auto", l: "Choose for me" },
  { v: "html-site", l: "HTML/CSS/JS website" },
  { v: "react-ts-vite", l: "React + TypeScript + Vite" },
  { v: "react-js-vite", l: "React + JavaScript + Vite" },
  { v: "node", l: "Node.js" },
  { v: "python", l: "Python" },
];

export default function Builder() {
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [busy, setBusy] = useState(false);
  const [codePrompt, setCodePrompt] = useState("");
  const [lang, setLang] = useState("auto");
  const [filename, setFilename] = useState("");
  const [projPrompt, setProjPrompt] = useState("");
  const [projName, setProjName] = useState("");
  const [stack, setStack] = useState("auto");
  const fileRef = useRef<HTMLInputElement>(null);

  const upsert = useCallback((j: JobView) => setJobs((prev) => [j, ...prev.filter((x) => x.id !== j.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))), []);
  const refresh = useCallback(() => listJobs().then(setJobs).catch((e) => toast.error(e.message)), []);
  useEffect(() => { void refresh(); }, [refresh]);

  const go = async (fn: () => Promise<JobView>) => {
    setBusy(true);
    try { const j = await fn(); if (j.status === "failed") toast.error(j.error ?? "Task failed"); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <WorkspaceShell title="Builder" menu={[{ label: "Refresh tasks", icon: RefreshCw, onSelect: () => void refresh() }]}>
      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="project" className="rounded-full">Project</TabsTrigger>
          <TabsTrigger value="code" className="rounded-full">Code file</TabsTrigger>
          <TabsTrigger value="zip" className="rounded-full">Analyze ZIP</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-4 space-y-3">
          <div className="space-y-1.5"><Label htmlFor="pp">What should it be?</Label>
            <Textarea id="pp" rows={4} value={projPrompt} onChange={(e) => setProjPrompt(e.target.value)} placeholder="A bakery website with Home, Menu, About and Contact pages" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="pn">Project name</Label><Input id="pn" value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label>Stack</Label>
              <Select value={stack} onValueChange={setStack}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STACK_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Button disabled={busy || !projPrompt.trim()} onClick={() => go(() => runJob("project_generate", { input: { prompt: projPrompt, name: projName || undefined, stack: stack === "auto" ? undefined : stack } }, upsert))}>Generate project</Button>
          <p className="text-xs text-muted-foreground">Files are checked for missing pieces, syntax and broken links, repaired up to twice, then packed into a ZIP. Installing and building are not available yet.</p>
        </TabsContent>

        <TabsContent value="code" className="mt-4 space-y-3">
          <div className="space-y-1.5"><Label htmlFor="cp">Describe the code</Label>
            <Textarea id="cp" rows={4} value={codePrompt} onChange={(e) => setCodePrompt(e.target.value)} placeholder="A Python script that renames photos by the date they were taken" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Language</Label>
              <Select value={lang} onValueChange={setLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l === "auto" ? "Choose for me" : l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="fn">File name</Label><Input id="fn" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="Optional, e.g. rename.py" /></div>
          </div>
          <Button disabled={busy || !codePrompt.trim()} onClick={() => go(() => runJob("code_export", { input: { prompt: codePrompt, language: lang === "auto" ? undefined : lang, filename: filename || undefined } }, upsert))}>Create file</Button>
        </TabsContent>

        <TabsContent value="zip" className="mt-4 space-y-3">
          <input ref={fileRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void go(() => runJob("zip_analyze", { file: f }, upsert)); }} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
            <Upload className="h-6 w-6" />Upload a project ZIP (up to 25 MB)
          </button>
          <p className="text-xs text-muted-foreground">The ZIP is checked for unsafe paths and oversized contents, then read without running anything. You get documentation and a findings report.</p>
        </TabsContent>
      </Tabs>

      <section className="mt-8 space-y-3" aria-label="Tasks">
        <h2 className="text-sm font-semibold">Tasks</h2>
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
        {jobs.map((j, i) => <JobCard key={j.id} job={j} compact={i > 0} onRetry={(id) => go(() => retryJob(id, upsert))} />)}
      </section>
    </WorkspaceShell>
  );
}
