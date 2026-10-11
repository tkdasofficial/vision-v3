import { CHUNK_ERROR_RE, recoverFromChunkError } from "@/lib/chunk-recovery";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new version is published, an open tab may ask for old page files that
// no longer exist. Reload once to pick up the new version instead of a blank screen.
function installStaleChunkRecovery() {
  if (typeof window === "undefined" || (window as any).__visionChunkRecovery) return;
  (window as any).__visionChunkRecovery = true;
  const isChunkError = (msg: string) => CHUNK_ERROR_RE.test(msg);
  const recover = () => { recoverFromChunkError(); };
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); recover(); });
  window.addEventListener("unhandledrejection", (e) => { if (isChunkError(String(e.reason?.message ?? e.reason))) recover(); });
  window.addEventListener("error", (e) => { if (isChunkError(String(e.message))) recover(); });
}

export const getRouter = () => {
  installStaleChunkRecovery();
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
