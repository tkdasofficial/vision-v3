// Starts a job and runs it to completion inside the request; the browser polls /api/jobs/$jobId meanwhile.
import { ARCHIVE_LIMITS } from "../../../security/archive/zip-guard";
import type { JobType } from "@/lib/builder/statuses";
import { createJob, getJob, safeError } from "./jobs.server";

export async function startJob(userId: string, id: string, type: JobType, input: any, attempt = 1) {
  const job = await createJob(id, userId, type, type === "zip_analyze" ? { fileName: input.fileName, sourceArtifactId: input.sourceArtifactId ?? null } : input, attempt);
  const { runCodeExport, runProjectGenerate, runZipAnalyze } = await import("./runners.server");
  try {
    if (type === "code_export") await runCodeExport(job, input);
    else if (type === "project_generate") await runProjectGenerate(job, input);
    else {
      let bytes: Uint8Array = input.bytes;
      if (!bytes && input.sourceArtifactId) {
        await job.step("downloading", "Loading the uploaded ZIP");
        bytes = await loadSource(userId, input.sourceArtifactId);
      }
      if (!bytes) throw new Error("No ZIP file provided.");
      if (bytes.length > ARCHIVE_LIMITS.maxUploadBytes) throw new Error("ZIP is larger than 25 MB.");
      if (!input.sourceArtifactId) {
        await job.step("uploading", "Storing the ZIP privately for retries");
        const ref = await job.saveArtifact(input.fileName, "application/zip", bytes, "source");
        const { d1 } = await import("@/lib/cloud/d1.server");
        await d1("UPDATE jobs SET input = ? WHERE id = ?", [JSON.stringify({ fileName: input.fileName, sourceArtifactId: ref.id }), id]);
      }
      await runZipAnalyze(job, { fileName: input.fileName, bytes });
    }
  } catch (e) {
    console.error("[jobs]", type, safeError(e));
    await job.fail(e);
  }
  return getJob(userId, id);
}

async function loadSource(userId: string, artifactId: string): Promise<Uint8Array> {
  const { d1 } = await import("@/lib/cloud/d1.server");
  const rows = await d1<any>("SELECT drive_file_id, expires_at FROM job_artifacts WHERE id = ? AND user_id = ? AND kind = 'source'", [artifactId, userId]);
  if (!rows[0] || Date.parse(rows[0].expires_at) <= Date.now()) throw new Error("The original ZIP has expired. Please upload it again.");
  const { getArtifactBytes } = await import("./artifact-store.server");
  return getArtifactBytes(rows[0].drive_file_id);
}
