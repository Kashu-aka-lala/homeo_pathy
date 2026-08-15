import { create } from 'zustand';
import * as storage from './storage';
import { Patient, Consultation, Invoice, Prescription } from './storage';
import { DEFAULT_DOCTOR_INFO } from './constants';

interface EmrState {
  patients: Patient[];
  consultations: Consultation[];
  invoices: Invoice[];
  prescriptions: Prescription[];
  selectedPatientId: string | null;
  activeConsultationId: string | null;
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
  isLoading: boolean;
  
  loadData: () => Promise<void>;
  setSelectedPatientId: (id: string | null) => void;
  setActiveConsultationId: (id: string | null) => void;
  
  addPatient: (patient: Omit<Patient, 'id' | 'created_at'>) => Promise<Patient>;
  updatePatient: (patient: Patient) => Promise<Patient>;
  
  addConsultation: (consultation: Omit<Consultation, 'id' | 'created_at'>) => Promise<Consultation>;
  updateConsultation: (consultation: Consultation) => Promise<Consultation>;
  
  addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at'>) => Promise<Invoice>;
  updateInvoice: (invoice: Invoice) => Promise<Invoice>;
  
  addPrescription: (prescription: Omit<Prescription, 'id' | 'created_at'>) => Promise<Prescription>;
  updatePrescription: (prescription: Prescription) => Promise<Prescription>;
  
  updateDoctorInfo: (info: typeof DEFAULT_DOCTOR_INFO) => void;
}

export const useEmrStore = create<EmrState>((set, get) => ({
  patients: [],
  consultations: [],
  invoices: [],
  prescriptions: [],
  selectedPatientId: null,
  activeConsultationId: null,
  doctorInfo: DEFAULT_DOCTOR_INFO,
  isLoading: false,

  loadData: async () => {
    set({ isLoading: true });
    try {
      // 1. Get Patients
      const patients = await storage.getPatients();
      
      // 2. Get Consultations
      const consultations = await storage.getConsultations();
      
      // 3. For each consultation, get invoices and prescriptions
      const invoicesList: Invoice[] = [];
      const prescriptionsList: Prescription[] = [];
      
      for (const c of consultations) {
        const inv = await storage.getInvoiceByConsultation(c.id);
        if (inv) invoicesList.push(inv);
        
        const rx = await storage.getPrescriptionByConsultation(c.id);
        if (rx) prescriptionsList.push(rx);
      }

      // Load Doctor Info from Local Storage if modified
      let docInfo = DEFAULT_DOCTOR_INFO;
      if (typeof window !== 'undefined') {
        const rawDoc = localStorage.getItem('homeocare_doctor_info');
        if (rawDoc) {
          docInfo = JSON.parse(rawDoc);
        }
      }

      set({
        patients,
        consultations,
        invoices: invoicesList,
        prescriptions: prescriptionsList,
        doctorInfo: docInfo,
      });
    } catch (e) {
      console.error('Failed to load data from storage:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setActiveConsultationId: (id) => set({ activeConsultationId: id }),

  addPatient: async (patientData) => {
    const p = await storage.savePatient(patientData);
    set((state) => ({ patients: [p, ...state.patients] }));
    return p;
  },

  updatePatient: async (patient) => {
    const p = await storage.updatePatient(patient);
    set((state) => ({
      patients: state.patients.map((item) => (item.id === p.id ? p : item)),
    }));
    return p;
  },

  addConsultation: async (consultationData) => {
    const c = await storage.saveConsultation(consultationData);
    set((state) => ({ consultations: [c, ...state.consultations] }));
    return c;
  },

  updateConsultation: async (consultation) => {
    const c = await storage.updateConsultation(consultation);
    set((state) => ({
      consultations: state.consultations.map((item) => (item.id === c.id ? c : item)),
    }));
    return c;
  },

  addInvoice: async (invoiceData) => {
    const i = await storage.saveInvoice(invoiceData);
    set((state) => ({ invoices: [i, ...state.invoices] }));
    return i;
  },

  updateInvoice: async (invoice) => {
    const i = await storage.updateInvoice(invoice);
    set((state) => ({
      invoices: state.invoices.map((item) => (item.id === i.id ? i : item)),
    }));
    return i;
  },

  addPrescription: async (prescriptionData) => {
    const pr = await storage.savePrescription(prescriptionData);
    set((state) => ({ prescriptions: [pr, ...state.prescriptions] }));
    return pr;
  },

  updatePrescription: async (prescription) => {
    const pr = await storage.updatePrescription(prescription);
    set((state) => ({
      prescriptions: state.prescriptions.map((item) => (item.id === pr.id ? pr : item)),
    }));
    return pr;
  },

  updateDoctorInfo: (info) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeocare_doctor_info', JSON.stringify(info));
    }
    set({ doctorInfo: info });
  },
}));
