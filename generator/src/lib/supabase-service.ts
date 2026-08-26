/**
 * supabase-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical, type-safe service layer for all Supabase interactions in the
 * Yashfeen Homoeopathic Clinic EMR.
 *
 * Rules enforced here:
 *  • Every string field is trimmed before insertion.
 *  • consultation_type is always stored as 'PAID' | 'COMPLIMENTARY'.
 *  • payment_status is always stored as 'PENDING' | 'PAID' | 'WAIVED'.
 *  • uploadPdf NEVER returns a blob: URL – if Supabase is unavailable the
 *    caller receives { data: null, error: '...' } and must handle the fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase, isSupabaseConfigured } from './storage';
import type { Patient, Consultation, Invoice, Prescription, Medicine } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsultationType = 'PAID' | 'COMPLIMENTARY';
export type PaymentStatus    = 'PENDING' | 'PAID' | 'WAIVED';
export type PaymentMethod    = 'Bank Transfer' | 'Mobile Wallet' | 'Cash' | '';

/** Result wrapper — every service call returns { data, error } */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normalizeConsultationType(raw: string): ConsultationType {
  return raw.toUpperCase() === 'COMPLIMENTARY' ? 'COMPLIMENTARY' : 'PAID';
}

function normalizePaymentStatus(raw: string): PaymentStatus {
  const u = raw.toUpperCase();
  if (u === 'PAID')   return 'PAID';
  if (u === 'WAIVED') return 'WAIVED';
  return 'PENDING';
}

export function sanitizePhone(raw: string): string {
  // Strip everything except digits, then map leading 0 (Pakistani local) → 92
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  }
  return digits;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export async function createPatient(
  patientData: Omit<Patient, 'id' | 'created_at'>
): Promise<ServiceResult<Patient>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const payload = {
    full_name:       patientData.full_name.trim(),
    phone:           sanitizePhone(patientData.phone),
    age:             patientData.age,
    gender:          patientData.gender.trim(),
    city:            patientData.city.trim(),
    medical_history: (patientData.medical_history ?? '').trim() || null,
  };

  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([payload])
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error creating patient.' };
  }
}

// ─── Consultation ─────────────────────────────────────────────────────────────

export async function createConsultation(
  patientId: string,
  consultationType: string,
  notes: string = ''
): Promise<ServiceResult<Consultation>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const payload = {
    patient_id:        patientId,
    consultation_type: normalizeConsultationType(consultationType),
    status:            'OPEN',
    doctor_notes:      notes.trim(),
  };

  try {
    const { data, error } = await supabase
      .from('consultations')
      .insert([payload])
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error creating consultation.' };
  }
}

export async function completeConsultation(
  consultationId: string
): Promise<ServiceResult<Consultation>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'COMPLETED' })
      .eq('id', consultationId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error completing consultation.' };
  }
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export async function createOrUpdateInvoice(
  consultationId: string,
  amount: number,
  method: PaymentMethod,
  status: string,
  pdfUrl?: string | null
): Promise<ServiceResult<Invoice>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const normalStatus = normalizePaymentStatus(status);

  const payload: Record<string, unknown> = {
    consultation_id: consultationId,
    amount:          Number(amount) || 0,
    payment_method:  method || 'Bank Transfer',
    payment_status:  normalStatus,
    paid_at:         normalStatus === 'PAID' ? new Date().toISOString() : null,
  };
  if (pdfUrl !== undefined) payload.pdf_url = pdfUrl;

  try {
    // Try to find existing invoice first
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('invoices')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) return { data: null, error: result.error.message };
    return { data: result.data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error saving invoice.' };
  }
}

// ─── Prescription ─────────────────────────────────────────────────────────────

export async function savePrescription(
  consultationId: string,
  medicines: Medicine[],
  precautions: string[],
  pdfUrl: string | null = null
): Promise<ServiceResult<Prescription>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const payload = {
    consultation_id:  consultationId,
    medicines:        medicines,      // stored as JSONB
    diet_precautions: precautions,    // stored as JSONB
    pdf_url:          pdfUrl,
  };

  try {
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase
        .from('prescriptions')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('prescriptions')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) return { data: null, error: result.error.message };
    return { data: result.data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error saving prescription.' };
  }
}

// ─── PDF Upload ───────────────────────────────────────────────────────────────

/**
 * Uploads a PDF blob to the 'clinic-documents' Supabase Storage bucket.
 * Returns the permanent public HTTPS CDN URL.
 *
 * IMPORTANT: This function NEVER returns a blob: URL.
 * If Supabase is unavailable or upload fails, data will be null.
 */
export async function uploadPdf(
  blob: Blob,
  fileName: string,
  folder: 'invoices' | 'prescriptions'
): Promise<ServiceResult<string>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured – PDF not uploaded.' };
  }

  const filePath = `${folder}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('clinic-documents')
      .upload(filePath, blob, {
        cacheControl: '31536000', // 1-year CDN cache
        upsert:       true,
        contentType:  'application/pdf',
      });

    if (error) {
      console.error(`[uploadPdf] Storage upload failed for "${filePath}":`, error.message);
      return { data: null, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('clinic-documents')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      return { data: null, error: `Could not resolve public URL for path "${data.path}"` };
    }

    return { data: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error(`[uploadPdf] Exception for "${filePath}":`, err?.message ?? err);
    return { data: null, error: err?.message ?? 'Unknown upload error.' };
  }
}

// ─── Direct Updates & Upserts (New Handlers) ───────────────────────────────────

export async function updateConsultation(
  id: string,
  updates: Partial<Omit<Consultation, 'id' | 'created_at'>>
): Promise<ServiceResult<Consultation>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const payload: Record<string, unknown> = {};
  if (updates.consultation_type !== undefined) {
    payload.consultation_type = normalizeConsultationType(updates.consultation_type);
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.doctor_notes !== undefined) {
    payload.doctor_notes = updates.doctor_notes.trim();
  }
  if (updates.patient_id !== undefined) {
    payload.patient_id = updates.patient_id;
  }

  try {
    const { data, error } = await supabase
      .from('consultations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error updating consultation.' };
  }
}

export async function upsertPrescription(
  consultationId: string,
  medicines: Medicine[],
  precautions: string[],
  pdfUrl: string | null = null
): Promise<ServiceResult<Prescription>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const payload = {
    consultation_id:  consultationId,
    medicines:        medicines,
    diet_precautions: precautions,
    pdf_url:          pdfUrl,
  };

  try {
    // Attempt standard upsert with onConflict: 'consultation_id'
    const { data, error } = await supabase
      .from('prescriptions')
      .upsert(payload, { onConflict: 'consultation_id' })
      .select()
      .single();

    if (error) {
      console.warn('[upsertPrescription] Upsert failed, falling back to manual select-then-update/insert:', error.message);
      
      // Fallback: manual select-then-update/insert
      const { data: existing } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('consultation_id', consultationId)
        .maybeSingle();

      let result;
      if (existing?.id) {
        result = await supabase
          .from('prescriptions')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('prescriptions')
          .insert([payload])
          .select()
          .single();
      }
      if (result.error) return { data: null, error: result.error.message };
      return { data: result.data, error: null };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error upserting prescription.' };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<ServiceResult<Invoice>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const normalStatus = normalizePaymentStatus(status);
  const payload = {
    payment_status: normalStatus,
    paid_at: normalStatus === 'PAID' ? new Date().toISOString() : null,
  };

  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Unknown error updating invoice status.' };
  }
}

