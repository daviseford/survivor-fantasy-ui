// After a deploy, a tab that still holds the previous index.html asks for
// route chunks whose hashed filenames no longer exist. Firebase Hosting's
// SPA rewrite answers those requests with index.html, the browser rejects it
// as a module (MIME type text/html), and the lazy route never renders. Vite
// dispatches `vite:preloadError` on window whenever a dynamic import or one
// of its preloaded dependencies fails, so the fix is simply to reload: the
// fresh index.html references chunks that exist.

export const STALE_CHUNK_RELOAD_KEY = "gyt:stale-chunk-reload-at";

// If a reload within this window did not fix the import, the cause is not a
// stale index.html (outage, broken deploy, offline), and reloading again
// would just loop. Let the error surface to the route error boundary instead.
export const STALE_CHUNK_RELOAD_WINDOW_MS = 30_000;

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Records a reload attempt and reports whether reloading is allowed. Returns
 * false when a reload was already attempted inside the cooldown window.
 */
export const claimStaleChunkReload = (
  storage: ReloadStorage,
  now: number,
): boolean => {
  const stored = storage.getItem(STALE_CHUNK_RELOAD_KEY);
  const lastAttempt = stored === null ? Number.NaN : Number(stored);
  if (
    Number.isFinite(lastAttempt) &&
    now - lastAttempt < STALE_CHUNK_RELOAD_WINDOW_MS
  ) {
    return false;
  }
  storage.setItem(STALE_CHUNK_RELOAD_KEY, String(now));
  return true;
};

const getSessionStorage = (): ReloadStorage | null => {
  try {
    return window.sessionStorage;
  } catch {
    // Storage access can throw (privacy settings, sandboxed frames). Without
    // it there is no loop guard, so fall back to surfacing the error.
    return null;
  }
};

export const installStaleChunkReload = () => {
  window.addEventListener("vite:preloadError", (event) => {
    const storage = getSessionStorage();
    if (!storage || !claimStaleChunkReload(storage, Date.now())) return;
    // preventDefault stops Vite from rethrowing, so nothing flashes an error
    // in the instant before the reload.
    event.preventDefault();
    window.location.reload();
  });
};
