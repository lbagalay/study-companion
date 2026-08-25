// Shared, framework-independent helpers will be exported from this directory.

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return 'Size unavailable';
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
