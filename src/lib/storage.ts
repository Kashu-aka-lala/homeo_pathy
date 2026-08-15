import { createClient } from '@supabase/supabase-js';

// Types representing our DB entities
export interface Patient {
  id: string;
  full_name: string;
  phone: string;
  age: number;
  gender: string;
  city: string;
  medical_history?: string;
  created_at?: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  consultation_type: 'Paid' | 'Complimentary';
  doctor_notes?: string;
  status: 'Draft' | 'Completed';
  created_at?: string;
}

export interface Invoice {
  id: string;
  consultation_id: string;
  amount: number;
  payment_status: 'Pending' | 'Paid' | 'Waived';
  payment_method?: 'Bank Transfer' | 'Mobile Wallet' | 'Cash' | '';
  paid_at?: string | null;
  created_at?: string;
}

export interface Medicine {
  remedy: string;
  potency: string;
  vehicle: string;
  dosage: string;
  duration: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  medicines: Medicine[];
  diet_precautions: string[];
  pdf_url?: string | null;
  created_at?: string;
}

// ----------------------------------------------------
// Supabase Client Setup (Dual Mode Check)
// ----------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// ----------------------------------------------------
// Local Storage Fallback Data Helpers
// ----------------------------------------------------
const IS_SERVER = typeof window === 'undefined';

function getLocalData<T>(key: string): T[] {
  if (IS_SERVER) return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveLocalData<T>(key: string, data: T[]): void {
  if (IS_SERVER) return;
  localStorage.setItem(key, JSON.stringify(data));
}

const KEYS = {
  PATIENTS: 'homeocare_patients',
  CONSULTATIONS: 'homeocare_consultations',
  INVOICES: 'homeocare_invoices',
  PRESCRIPTIONS: 'homeocare_prescriptions',
};

// ----------------------------------------------------
// Patient Storage Actions
// ----------------------------------------------------
export async function getPatients(): Promise<Patient[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return getLocalData<Patient>(KEYS.PATIENTS);
  }
}

export async function savePatient(patient: Omit<Patient, 'id' | 'created_at'>): Promise<Patient> {
  const newPatient: Patient = {
    ...patient,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('patients')
      .insert(newPatient)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const patients = getLocalData<Patient>(KEYS.PATIENTS);
    patients.unshift(newPatient);
    saveLocalData(KEYS.PATIENTS, patients);
    return newPatient;
  }
}

export async function updatePatient(patient: Patient): Promise<Patient> {
  if (supabase) {
    const { data, error } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', patient.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const patients = getLocalData<Patient>(KEYS.PATIENTS);
    const index = patients.findIndex((p) => p.id === patient.id);
    if (index !== -1) {
      patients[index] = patient;
      saveLocalData(KEYS.PATIENTS, patients);
    }
    return patient;
  }
}

// ----------------------------------------------------
// Consultation Storage Actions
// ----------------------------------------------------
export async function getConsultations(patientId?: string): Promise<Consultation[]> {
  if (supabase) {
    let query = supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false });
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } else {
    const list = getLocalData<Consultation>(KEYS.CONSULTATIONS);
    const sortedList = list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    return patientId ? sortedList.filter((c) => c.patient_id === patientId) : sortedList;
  }
}

export async function saveConsultation(consultation: Omit<Consultation, 'id' | 'created_at'>): Promise<Consultation> {
  const newConsultation: Consultation = {
    ...consultation,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('consultations')
      .insert(newConsultation)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const consultations = getLocalData<Consultation>(KEYS.CONSULTATIONS);
    consultations.unshift(newConsultation);
    saveLocalData(KEYS.CONSULTATIONS, consultations);
    return newConsultation;
  }
}

export async function updateConsultation(consultation: Consultation): Promise<Consultation> {
  if (supabase) {
    const { data, error } = await supabase
      .from('consultations')
      .update(consultation)
      .eq('id', consultation.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const consultations = getLocalData<Consultation>(KEYS.CONSULTATIONS);
    const index = consultations.findIndex((c) => c.id === consultation.id);
    if (index !== -1) {
      consultations[index] = consultation;
      saveLocalData(KEYS.CONSULTATIONS, consultations);
    }
    return consultation;
  }
}

// ----------------------------------------------------
// Invoice Storage Actions
// ----------------------------------------------------
export async function getInvoiceByConsultation(consultationId: string): Promise<Invoice | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const invoices = getLocalData<Invoice>(KEYS.INVOICES);
    return invoices.find((i) => i.consultation_id === consultationId) || null;
  }
}

export async function saveInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice> {
  const newInvoice: Invoice = {
    ...invoice,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(newInvoice)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const invoices = getLocalData<Invoice>(KEYS.INVOICES);
    invoices.unshift(newInvoice);
    saveLocalData(KEYS.INVOICES, invoices);
    return newInvoice;
  }
}

export async function updateInvoice(invoice: Invoice): Promise<Invoice> {
  if (supabase) {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', invoice.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const invoices = getLocalData<Invoice>(KEYS.INVOICES);
    const index = invoices.findIndex((i) => i.id === invoice.id);
    if (index !== -1) {
      invoices[index] = invoice;
      saveLocalData(KEYS.INVOICES, invoices);
    }
    return invoice;
  }
}

// ----------------------------------------------------
// Prescription Storage Actions
// ----------------------------------------------------
export async function getPrescriptionByConsultation(consultationId: string): Promise<Prescription | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const prescriptions = getLocalData<Prescription>(KEYS.PRESCRIPTIONS);
    return prescriptions.find((p) => p.consultation_id === consultationId) || null;
  }
}

export async function savePrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Promise<Prescription> {
  const newPrescription: Prescription = {
    ...prescription,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert(newPrescription)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const prescriptions = getLocalData<Prescription>(KEYS.PRESCRIPTIONS);
    prescriptions.unshift(newPrescription);
    saveLocalData(KEYS.PRESCRIPTIONS, prescriptions);
    return newPrescription;
  }
}

export async function updatePrescription(prescription: Prescription): Promise<Prescription> {
  if (supabase) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(prescription)
      .eq('id', prescription.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const prescriptions = getLocalData<Prescription>(KEYS.PRESCRIPTIONS);
    const index = prescriptions.findIndex((p) => p.id === prescription.id);
    if (index !== -1) {
      prescriptions[index] = prescription;
      saveLocalData(KEYS.PRESCRIPTIONS, prescriptions);
    }
    return prescription;
  }
}

// ----------------------------------------------------
// File Upload Action (Supabase Storage vs Local Blob)
// ----------------------------------------------------
export async function uploadPdf(fileName: string, pdfBlob: Blob): Promise<string> {
  if (supabase) {
    // Try to upload to bucket "prescriptions". If it doesn't exist, this might fail, so make sure bucket is set up.
    const { data, error } = await supabase.storage
      .from('prescriptions')
      .upload(fileName, pdfBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      });
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(data.path);
      
    return publicUrlData.publicUrl;
  } else {
    // In local-only mode, we return a local Blob URL. Note: this works for local downloads
    // but wa.me cannot reach it, which is the documented limitation in our implementation plan.
    return URL.createObjectURL(pdfBlob);
  }
}
