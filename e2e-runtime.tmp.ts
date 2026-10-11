import { startJob } from "@/lib/jobs/dispatch.server";
import { getJob } from "@/lib/jobs/jobs.server";
import { d1 } from "@/lib/cloud/d1.server";
import { readFileSync } from "fs";
const uid = "e2e-runtime-test-user"; const id = crypto.randomUUID();
const [op,target,file,mime] = process.argv.slice(2); const bytes = new Uint8Array(readFileSync("/tmp/e2e/"+file));
let j = await startJob(uid, id, "runtime_task", { operation: op, params: { target }, fileName: file, mime, bytes });
console.log("start:", j?.status, j?.error ?? "");
for (let i = 0; i < 60 && j && !["completed","completed_with_warnings","failed","timed_out","cancelled"].includes(j.status); i++) {
  await new Promise(r => setTimeout(r, 5000)); j = await getJob(uid, id); console.log(new Date().toISOString().slice(11,19), j?.status, j?.detail);
}
console.log(JSON.stringify({ status: j?.status, error: j?.error, result: j?.result, artifacts: j?.artifacts }));
const rt = await d1("SELECT status, run_id, stage FROM runtime_jobs WHERE job_id = ?", [id]); console.log(rt);
