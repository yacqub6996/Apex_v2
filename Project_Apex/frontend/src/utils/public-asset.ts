/**
 * Build a public asset URL that respects Vite's base path.
 * Accepts paths with or without a leading slash (e.g. "/images/logo.svg" or "images/logo.svg").
 */
export const publicAsset = (path: string): string => {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};
