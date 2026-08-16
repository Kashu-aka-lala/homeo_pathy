/**
 * upload-pdf.ts  ← thin compatibility shim
 * ──────────────────────────────────────────────────────────────────────────
 * Re-exports uploadPdfToStorage backed by the canonical supabase-service.ts
 * uploadPdf() function.  Existing callers that import `uploadPdfToStorage`
 * continue to work without changes.
 *
 * NOTE: On Supabase failure this wrapper falls back to a local blob: URL so
 * that prescription-builder.tsx (Generate PDF button) still works offline.
 * prescription-sender.tsx uses uploadPdf() directly and never returns blob: URLs.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { uploadPdf } from './supabase-service';

/**
 * @deprecated Prefer importing `uploadPdf` from `@/lib/supabase-service` directly.
 */
export async function uploadPdfToStorage(
  blob: Blob,
  fileName: string,
  folder: 'invoices' | 'prescriptions'
): Promise<string> {
  const { data: url, error } = await uploadPdf(blob, fileName, folder);

  if (url) return url;

  // Fallback to local object URL so Generate PDF still works offline
  console.warn('[uploadPdfToStorage] Supabase upload failed, returning local blob URL:', error);
  return URL.createObjectURL(blob);
}

