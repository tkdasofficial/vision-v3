import { createFileRoute } from "@tanstack/react-router";

const TYPES = ["code_export", "project_generate", "zip_analyze"] as const;

// Jobs API: list the caller's jobs, or start one (JSON for code/projects, multipart for ZIP uploads).
export const Route = createFileRoute("/api/jobs")({
  server: {
    handlers: {
      GET: async () => {
        const { getCaller } = await import("@/lib/cloud/auth.server");
        const caller = await getCaller();
        if (!caller) return Response.json({ error: "Please sign in." }, { status: 401 });
        const { listJobs } = await import("@/lib/jobs/jobs.server");
        return Response.json({ jobs: await listJobs(caller.user.id) }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const { getCaller } = await import("@/lib/cloud/auth.server");
        const caller = await getCaller();
        if (!caller) return Response.json({ error: "Please sign in." }, { status: 401 });
        {
          const { d1Store, factsFrom, assertSameOrigin } = await import("@/lib/cloud/security.server");
          const { enforceLimits, SECURITY_CONFIG } = await import("../../../security");
          try { assertSameOrigin(factsFrom(request.headers, null)); } catch (e: any) { return Response.json({ error: e.message }, { status: 403 }); }
          try { await enforceLimits(d1Store, [[`jobs:user:${caller.user.id}`, SECURITY_CONFIG.limits.chatPerUser]]); }
          catch (e: any) { return Response.json({ error: e.message }, { status: 429 }); }
        }
        const { ID_RE } = await import("@/lib/jobs/jobs.server");
        const { startJob } = await import("@/lib/jobs/dispatch.server");
        const ct = request.headers.get("content-type") ?? "";
        if (ct.includes("multipart/form-data")) {
          const form = await request.formData().catch(() => null);
          const file = form?.get("file");
          const id = String(form?.get("id") ?? "");
          if (!ID_RE.test(id)) return Response.json({ error: "Invalid job id." }, { status: 400 });
          if (!(file instanceof File)) return Response.json({ error: "No file provided." }, { status: 400 });
          if (file.size > 25 * 1024 * 1024) return Response.json({ error: "ZIP files up to 25 MB are supported." }, { status: 413 });
          if (!/\.zip$/i.test(file.name)) return Response.json({ error: "Please upload a .zip file." }, { status: 400 });
          const job = await startJob(caller.user.id, id, "zip_analyze", { fileName: file.name.slice(0, 120), bytes: new Uint8Array(await file.arrayBuffer()) });
          return Response.json({ job });
        }
        const body: any = await request.json().catch(() => null);
        if (!body || !ID_RE.test(String(body.id)) || !TYPES.includes(body.type) || body.type === "zip_analyze") return Response.json({ error: "Invalid request." }, { status: 400 });
        const i = body.input ?? {};
        const input = body.type === "code_export"
          ? { prompt: str(i.prompt, 8000), language: str(i.language, 30), filename: str(i.filename, 120), code: str(i.code, 500_000) }
          : { prompt: str(i.prompt, 8000) ?? "", stack: str(i.stack, 30), name: str(i.name, 60) };
        try {
          const job = await startJob(caller.user.id, body.id, body.type, input);
          return Response.json({ job });
        } catch (e: any) {
          return Response.json({ error: /UNIQUE/i.test(String(e?.message)) ? "This task already exists." : "Could not start the task." }, { status: 409 });
        }
      },
    },
  },
});

function str(v: unknown, max: number): any {
  return typeof v === "string" && v.length ? v.slice(0, max) : undefined;
}
