'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, UserPlus, Phone, MapPin, Activity, 
  PlusCircle, Edit2, Calendar, FileText, CheckCircle2, 
  Clock, AlertCircle, Eye, RefreshCw
} from 'lucide-react';
import { useEmrStore } from '@/lib/store';
import { Patient, Consultation, Invoice, Prescription, supabase } from '@/lib/storage';
import { createConsultation, createOrUpdateInvoice } from '@/lib/supabase-service';
import AddPatientModal from './add-patient-modal';

interface PatientRegistryProps {
  onStartConsultation: () => void;
}

export default function PatientRegistry({ onStartConsultation }: PatientRegistryProps) {
  const { 
    patients, consultations, invoices, prescriptions, 
    selectedPatientId, setSelectedPatientId, setActiveConsultationId,
    addConsultation, addInvoice, loadData
  } = useEmrStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

  // 1. Filtered Patients list
  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.phone.includes(q)
    );
  }, [patients, searchQuery]);

  // 2. Currently selected patient details
  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // 3. Chronological consultations list for selected patient
  const selectedPatientConsultations = useMemo(() => {
    if (!selectedPatientId) return [];
    return consultations
      .filter((c) => c.patient_id === selectedPatientId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [consultations, selectedPatientId]);

  // 4. Invoices map by consultation ID for quick retrieval
  const invoicesMap = useMemo(() => {
    const map: { [key: string]: Invoice } = {};
    invoices.forEach((i) => {
      map[i.consultation_id] = i;
    });
    return map;
  }, [invoices]);

  // 5. Prescriptions map by consultation ID for quick retrieval
  const prescriptionsMap = useMemo(() => {
    const map: { [key: string]: Prescription } = {};
    prescriptions.forEach((p) => {
      map[p.consultation_id] = p;
    });
    return map;
  }, [prescriptions]);

  const handleEditPatient = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToEdit(patient);
    setIsModalOpen(true);
  };

  const handleCreateNewPatient = () => {
    setPatientToEdit(null);
    setIsModalOpen(true);
  };

  const handleInitiateConsultation = async () => {
    if (!selectedPatient) return;
    setIsStartingConsultation(true);

    try {
      let newConsultation: any;

      if (supabase) {
        // Use the centralized service layer (normalizes type to uppercase, trims notes)
        const { data, error } = await createConsultation(selectedPatient.id, 'PAID', '');
        if (error || !data) throw new Error(error ?? 'Failed to create consultation');
        newConsultation = data;

        // Create the initial PENDING invoice via service layer
        const { error: invError } = await createOrUpdateInvoice(
          newConsultation.id,
          500,
          'Bank Transfer',
          'PENDING'
        );
        if (invError) throw new Error(invError);

        // Refresh EMR store state
        await loadData();
      } else {
        // Local storage fallback flow
        newConsultation = await addConsultation({
          patient_id:        selectedPatient.id,
          consultation_type: 'Paid',
          status:            'Draft',
          doctor_notes:      '',
        });

        await addInvoice({
          consultation_id: newConsultation.id,
          amount:          500,
          payment_status:  'Pending',
          payment_method:  '',
          paid_at:         null,
        });
      }

      setActiveConsultationId(newConsultation.id);
      onStartConsultation();
    } catch (err) {
      console.error('Failed to create consultation:', err);
    } finally {
      setIsStartingConsultation(false);
    }
  };

  const handleResumeConsultation = (consultationId: string) => {
    setActiveConsultationId(consultationId);
    onStartConsultation();
  };

  const handleShareInvoiceWhatsApp = (patientName: string, phone: string, amount: number, consultationId: string) => {
    const msg = `Assalam-o-Alaikum ${patientName}, your invoice for fee amount Rs. ${amount} is pending. Please complete the payment using Bank Transfer or Mobile Wallet. Thank you.`;
    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleShareRxWhatsApp = (patientName: string, phone: string, pdfUrl: string) => {
    const msg = `Assalam-o-Alaikum ${patientName}, your prescription is ready. You can view or download it here: ${pdfUrl}`;
    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-140px)] max-h-[800px]">
      {/* ----------------- LEFT PANEL: Patient Search & List ----------------- */}
      <div className="md:col-span-4 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-full">
        {/* Search Header */}
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Patient Registry</h3>
            <button
              onClick={handleCreateNewPatient}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm focus:outline-none"
            >
              <UserPlus size={14} />
              Register
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or WhatsApp..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all"
            />
          </div>
        </div>

        {/* Patients List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground font-medium">No patients found</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Register a new profile to get started.</p>
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'bg-accent/40 border-primary/40 shadow-sm'
                      : 'bg-background hover:bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {p.full_name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone size={10} />
                        {p.phone}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleEditPatient(p, e)}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                      title="Edit Profile"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-medium">
                    <span className="bg-muted px-2 py-0.5 rounded-md">
                      {p.gender}, {p.age} yrs
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin size={9} />
                      {p.city}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ----------------- RIGHT PANEL: Patient Chronological History ----------------- */}
      <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
        {selectedPatient ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Patient Header Block */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-emerald-500/5 to-teal-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-foreground">{selectedPatient.full_name}</h3>
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {selectedPatient.gender}, {selectedPatient.age} Years
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-muted-foreground" />
                    {selectedPatient.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-muted-foreground" />
                    {selectedPatient.city}
                  </span>
                </div>
                {selectedPatient.medical_history && (
                  <div className="mt-3 flex items-start gap-1.5 bg-destructive/5 text-destructive-foreground dark:text-red-300 border border-destructive/10 rounded-lg p-2.5 text-xs font-medium">
                    <Activity size={14} className="mt-0.5 flex-shrink-0 text-destructive" />
                    <div>
                      <span className="font-semibold block text-[11px] uppercase tracking-wider text-destructive/80">Clinical History / Allergies</span>
                      {selectedPatient.medical_history}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient actions */}
              <div className="flex flex-row sm:flex-col gap-2 justify-end">
                <button
                  onClick={handleInitiateConsultation}
                  disabled={isStartingConsultation}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none disabled:opacity-60"
                >
                  {isStartingConsultation ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <PlusCircle size={15} />
                      New Consultation
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => handleEditPatient(selectedPatient, e)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus:outline-none"
                >
                  <Edit2 size={13} />
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">Consultation Timeline History</h4>
              
              {selectedPatientConsultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
                  <Calendar size={36} className="text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No consult records yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    Click &apos;New Consultation&apos; above to record symptoms, generate invoices, and build prescriptions.
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-border pl-6 ml-3 space-y-8 pb-4">
                  {selectedPatientConsultations.map((c) => {
                    const invoice = invoicesMap[c.id];
                    const rx = prescriptionsMap[c.id];
                    const dateFormatted = c.created_at 
                      ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '';
                    const isDraft = c.status === 'Draft';

                    return (
                      <div key={c.id} className="relative animate-slide-up">
                        {/* Timeline node dot */}
                        <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background ${
                          isDraft ? 'border-amber-500' : 'border-emerald-600'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            isDraft ? 'bg-amber-500 animate-ping' : 'bg-emerald-600'
                          }`} />
                        </span>

                        {/* Timeline content card */}
                        <div className="bg-background border border-border rounded-xl p-5 shadow-xs">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3 mb-4">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">{dateFormatted}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <h5 className="font-bold text-sm text-foreground">Consultation</h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  c.consultation_type === 'Complimentary' 
                                    ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                                }`}>
                                  {c.consultation_type}
                                </span>
                              </div>
                            </div>
                            <div>
                              {isDraft ? (
                                <button
                                  onClick={() => handleResumeConsultation(c.id)}
                                  className="flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold hover:bg-amber-500/20 transition-all focus:outline-none"
                                >
                                  <Clock size={12} />
                                  Resume Draft
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Doctor Clinical Notes */}
                          {c.doctor_notes && (
                            <div className="mb-4">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Clinical Notes / Symptoms</span>
                              <p className="text-xs text-foreground mt-1 whitespace-pre-line bg-muted/40 rounded-lg p-2.5 border border-border/40 leading-relaxed">
                                {c.doctor_notes}
                              </p>
                            </div>
                          )}

                          {/* Invoice section */}
                          {invoice && (
                            <div className="bg-muted/20 border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Billing Information</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-xs font-medium text-muted-foreground">Amount:</span>
                                  <span className="text-sm font-bold text-foreground">Rs. {invoice.amount}</span>
                                </div>
                                {invoice.payment_method && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Method: <span className="font-semibold text-foreground">{invoice.payment_method}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-start sm:items-end justify-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Status:</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                    invoice.payment_status.toUpperCase() === 'PAID'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                                      : invoice.payment_status.toUpperCase() === 'WAIVED'
                                      ? 'bg-gray-500/10 text-muted-foreground border border-gray-500/10'
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/10'
                                  }`}>
                                    {invoice.payment_status}
                                  </span>
                                </div>
                                {invoice.payment_status.toUpperCase() === 'PENDING' && (
                                  <button
                                    onClick={() => handleShareInvoiceWhatsApp(selectedPatient.full_name, selectedPatient.phone, invoice.amount, c.id)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                  >
                                    <Phone size={10} />
                                    Send Invoice via WhatsApp
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Prescription section */}
                          {rx ? (
                            <div className="border border-border/80 rounded-xl p-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Prescribed Remedies (Rx)</span>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                                      <th className="pb-1.5 font-bold">Remedy</th>
                                      <th className="pb-1.5 font-bold">Potency</th>
                                      <th className="pb-1.5 font-bold">Form</th>
                                      <th className="pb-1.5 font-bold">Dosage & Frequency</th>
                                      <th className="pb-1.5 font-bold">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40 text-xs">
                                    {rx.medicines.map((med, idx) => (
                                      <tr key={idx} className="hover:bg-muted/10">
                                        <td className="py-2 font-bold text-foreground">{med.remedy}</td>
                                        <td className="py-2 text-muted-foreground">{med.potency}</td>
                                        <td className="py-2 text-muted-foreground">{med.vehicle}</td>
                                        <td className="py-2 text-foreground font-medium">{med.dosage}</td>
                                        <td className="py-2 text-muted-foreground">{med.duration}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {rx.diet_precautions && rx.diet_precautions.length > 0 && (
                                <div className="mt-4 border-t border-border pt-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Dietary Restrictions & Instructions</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {rx.diet_precautions.map((tag, idx) => (
                                      <span key={idx} className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rx.pdf_url && (
                                <div className="mt-4 flex justify-end gap-3 border-t border-border pt-3">
                                  <a
                                    href={rx.pdf_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                                  >
                                    <FileText size={13} />
                                    View PDF Prescription
                                  </a>
                                  <button
                                    onClick={() => handleShareRxWhatsApp(selectedPatient.full_name, selectedPatient.phone, rx.pdf_url || '')}
                                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                  >
                                    <Phone size={13} />
                                    Resend Rx WhatsApp
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            !isDraft && (
                              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2 font-medium">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                No prescription recorded for this completed session.
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 flex items-center justify-center text-primary mb-4 border border-primary/10 shadow-sm animate-pulse">
              <Activity size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Welcome to Yashfeen Homoeopathic Clinic EMR</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Select an existing patient profile from the registry directory or register a new one to start consultations, manage invoices, and compose prescriptions.
            </p>
            <button
              onClick={handleCreateNewPatient}
              className="flex items-center gap-2 mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none"
            >
              <UserPlus size={16} />
              Register Your First Patient
            </button>
          </div>
        )}
      </div>

      {/* Register / Edit Patient Modal */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientToEdit={patientToEdit}
      />
    </div>
  );
}
