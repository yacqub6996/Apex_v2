import { OpenAPI } from "@/api/core/OpenAPI";

export const isAbsoluteUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
};

/**
 * Convert an API-returned path (e.g. "storage/..." or "/storage/...") into an absolute URL
 * using the configured OpenAPI.BASE. If the input is already absolute, it is returned as-is.
 * Returns undefined when the input is empty/falsy to play nicely with React <img>/<Avatar> src.
 */
export const toAbsoluteResource = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (isAbsoluteUrl(path)) return path;
  const base = OpenAPI.BASE || "";
  // Normalize backslashes to forward slashes (for Windows paths)
  const normalized = path.replace(/\\/g, "/");
  const trimmed = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${base}${trimmed}`;
};

/**
 * Normalize document/storage URLs to ensure proper browser resolution.
 * Specifically designed for paths returned by the file storage service.
 * 
 * @param url - The URL from the API response
 * @returns Normalized URL with leading slash, or null if input is empty
 * 
 * @example
 * normalizeStorageUrl("storage/kyc_documents/...") // => "/storage/kyc_documents/..."
 * normalizeStorageUrl("/storage/kyc_documents/...") // => "/storage/kyc_documents/..."
 * normalizeStorageUrl("http://example.com/file.jpg") // => "http://example.com/file.jpg"
 * 
 * Note: This function is specifically for storage-related URLs (kyc_documents, 
 * profile_pictures, trader_avatars). For general URL handling, use toAbsoluteResource().
 */
export const normalizeStorageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Already an absolute URL (http:// or https://)
  if (isAbsoluteUrl(url)) {
    return url;
  }
  
  // Already has leading slash - assume it's correct
  if (url.startsWith('/')) {
    return url;
  }
  
  // Legacy format from database: add leading slash to storage paths
  // This handles: "storage/kyc_documents/..." -> "/storage/kyc_documents/..."
  if (url.startsWith('storage/')) {
    return `/${url}`;
  }
  
  // For other relative paths, assume they're storage paths and prepend /storage/
  // This is a fallback for edge cases and should rarely be used
  return `/storage/${url}`;
};
