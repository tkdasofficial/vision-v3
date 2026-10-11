/** Reloads the page when a page file fails to download (new version live, or the preview was mid-update). Up to 3 tries per 30s, waiting a bit longer each time. */
export const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i;
const KEY = "vision_chunk_reload";

export function recoverFromChunkError(): boolean {
  if (typeof window === "undefined") return false;
  let s = { n: 0, at: 0 };
  try { s = JSON.parse(sessionStorage.getItem(KEY) || "") || s; } catch { /* ignore */ }
  if (Date.now() - s.at > 30_000) s = { n: 0, at: Date.now() };
  if (s.n >= 3) return false;
  s.n += 1;
  sessionStorage.setItem(KEY, JSON.stringify(s));
  setTimeout(() => window.location.reload(), 400 * s.n);
  return true;
}
