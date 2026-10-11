import { createFileRoute } from "@tanstack/react-router";

// File storage API: uploads go to the configured Google Drive folder
// (sorted into per-type sub-folders), records live in D1. Sign-in required.
const MAX_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      GET: async () => {
        const { getCaller } = await import("@/lib/cloud/auth.server");
        const caller = await getCaller();
        if (!caller) return Response.json({ error: "Please sign in." }, { status: 401 });
        const { listFiles } = await import("@/lib/cloud/drive.server");
        return Response.json({ files: await listFiles(caller.user.id) });
      },

      POST: async ({ request }) => {
        const { getCaller } = await import("@/lib/cloud/auth.server");
        const caller = await getCaller();
        if (!caller) return Response.json({ error: "Please sign in." }, { status: 401 });
        {
          const { d1Store, factsFrom, assertSameOrigin } = await import("@/lib/cloud/security.server");
          const { enforceLimits, SECURITY_CONFIG } = await import("../../../security");
          try {
            assertSameOrigin(factsFrom(request.headers, null));
            await enforceLimits(d1Store, [[`upload:user:${caller.user.id}`, SECURITY_CONFIG.limits.uploadPerUser]]);
          } catch (e: any) { return Response.json({ error: e.message }, { status: 429 }); }
        }
        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File)) return Response.json({ error: "No file provided." }, { status: 400 });
        if (file.size > MAX_BYTES) return Response.json({ error: "Files up to 25 MB are supported." }, { status: 400 });
        try {
          const { storeFile } = await import("@/lib/cloud/drive.server");
          const record = await storeFile(caller.user.id, file.name, file.type, new Uint8Array(await file.arrayBuffer()));
          return Response.json({ file: record });
        } catch (e) {
          console.error("[files] upload failed", e);
          return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
        }
      },

      DELETE: async ({ request }) => {
        const { getCaller } = await import("@/lib/cloud/auth.server");
        const caller = await getCaller();
        if (!caller) return Response.json({ error: "Please sign in." }, { status: 401 });
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return Response.json({ error: "Missing file id." }, { status: 400 });
        try {
          const { deleteFile } = await import("@/lib/cloud/drive.server");
          await deleteFile(caller.user.id, id);
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[files] delete failed", e);
          return Response.json({ error: "Delete failed." }, { status: 500 });
        }
      },
    },
  },
});
