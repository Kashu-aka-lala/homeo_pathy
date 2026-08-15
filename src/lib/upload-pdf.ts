import { supabase, isSupabaseConfigured } from './storage';

/**
 * Uploads a generated PDF blob to the 'clinic-documents' Supabase bucket.
 * Organizes files into sub-folders ('invoices' or 'prescriptions').
 * 
 * @param blob The generated PDF Blob object
 * @param fileName Unique file name (e.g., invoice_ID.pdf)
 * @param folder Sub-folder destination ('invoices' | 'prescriptions')
 * @returns Resolves to the public CDN URL of the uploaded document or a fallback local object URL
 */
export async function uploadPdfToStorage(
  blob: Blob,
  fileName: string,
  folder: 'invoices' | 'prescriptions'
): Promise<string> {
  const filePath = `${folder}/${fileName}`;

  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase credentials not configured. Falling back to local Blob URL.');
    return URL.createObjectURL(blob);
  }

  try {
    // Upload file to the 'clinic-documents' bucket
    const { data, error } = await supabase.storage
      .from('clinic-documents')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      });

    if (error) {
      // Log storage upload error details specifically
      console.error(`Supabase Storage upload failed for path "${filePath}":`, error.message || error);
      throw error;
    }

    // Retrieve the public URL for the newly uploaded file
    const { data: urlData } = supabase.storage
      .from('clinic-documents')
      .getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
      throw new Error(`Could not resolve public URL for path "${data.path}"`);
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error(`Exception during PDF storage upload for path "${filePath}":`, err.message || err);
    
    // In case of any exception (network error, policy restrictions, bucket does not exist, etc.),
    // return a local object URL to maintain full app functionalities on the client.
    return URL.createObjectURL(blob);
  }
}
