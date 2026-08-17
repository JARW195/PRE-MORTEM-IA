// Client-safe formatting helpers shared between client and server.
// Keep this module free of any server-only imports (no pdf-parse/mammoth/xlsx/jszip).

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
