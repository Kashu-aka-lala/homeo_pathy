'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, CreditCard, Gift, Send, Lock, 
  Unlock, CheckCircle2, ChevronRight, AlertCircle, FileText, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEmrStore } from '@/lib/store';
import { Consultation, Invoice } from '@/lib/storage';
import PrescriptionBuilder from './prescription-builder';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import { uploadPdfToStorage } from '@/lib/upload-pdf';
import { sendInvoiceToPatient } from '@/lib/prescription-sender';

interface ConsultationWorkflowProps {
  onBack: () => void;
}

export default function ConsultationWorkflow({ onBack }: ConsultationWorkflowProps) {
  const {
    patients, consultations, invoices, activeConsultationId, 
    setActiveConsultationId, updateConsultation, updateInvoice, doctorInfo
  } = useEmrStore();

  const amountRef = useRef<HTMLInputElement>(null);

  // 1. Load active consultation details
  const activeConsultation = useMemo(() => {
    return consultations.find((c) => c.id === activeConsultationId) || null;
  }, [consultations, activeConsultationId]);

  // 2. Load active patient details
  const activePatient = useMemo(() => {
    if (!activeConsultation) return null;
    return patients.find((p) => p.id === activeConsultation.patient_id) || null;
  }, [patients, activeConsultation]);

  // 3. Load active invoice details
  const activeInvoice = useMemo(() => {
    if (!activeConsultationId) return null;
    return invoices.find((i) => i.consultation_id === activeConsultationId) || null;
  }, [invoices, activeConsultationId]);

  // Local state copy for easy editing
  const [consultationType, setConsultationType] = useState<'Paid' | 'Complimentary'>('Paid');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [amount, setAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Mobile Wallet' | 'Cash' | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid' | 'Waived'>('Pending');

  // Loading spinner & Notification Toast States
  const [isSharingInvoice, setIsSharingInvoice] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Synchronize local states when store items load or change
  useEffect(() => {
    if (activeConsultation) {
      setConsultationType(activeConsultation.consultation_type as 'Paid' | 'Complimentary');
      setDoctorNotes(activeConsultation.doctor_notes || '');
    }
    if (activeInvoice) {
      setAmount(activeInvoice.amount.toString());
      setPaymentMethod(activeInvoice.payment_method as any || '');
      setPaymentStatus(activeInvoice.payment_status as any);
    }
  }, [activeConsultation, activeInvoice]);

  // Determine if Rx is locked
  const isRxLocked = useMemo(() => {
    if (consultationType === 'Complimentary') return false;
    return paymentStatus !== 'Paid' && paymentStatus !== 'Waived';
  }, [consultationType, paymentStatus]);

  // Save changes to db/store
  const handleSaveConsultationState = async (
    updates: {
      type?: 'Paid' | 'Complimentary';
      notes?: string;
      invAmount?: number;
      invMethod?: typeof paymentMethod;
      invStatus?: typeof paymentStatus;
    }
  ) => {
    if (!activeConsultation || !activeInvoice) return;

    try {
      const typeChanged = updates.type !== undefined && updates.type !== activeConsultation.consultation_type;
      const notesChanged = updates.notes !== undefined && updates.notes !== activeConsultation.doctor_notes;
      
      if (typeChanged || notesChanged) {
        await updateConsultation({
          ...activeConsultation,
          consultation_type: updates.type ?? activeConsultation.consultation_type,
          doctor_notes: updates.notes ?? activeConsultation.doctor_notes,
        });
      }

      const invAmountVal = updates.invAmount ?? activeInvoice.amount;
      const invStatusVal = updates.invStatus ?? activeInvoice.payment_status;
      const invMethodVal = updates.invMethod !== undefined ? updates.invMethod : activeInvoice.payment_method;

      if (
        invAmountVal !== activeInvoice.amount ||
        invStatusVal !== activeInvoice.payment_status ||
        invMethodVal !== activeInvoice.payment_method
      ) {
        await updateInvoice({
          ...activeInvoice,
          amount: invAmountVal,
          payment_status: invStatusVal,
          payment_method: invMethodVal,
          paid_at: invStatusVal === 'Paid' ? new Date().toISOString() : null,
        });

        // Trigger confetti burst on Paid payment status!
        if (invStatusVal === 'Paid' && activeInvoice.payment_status !== 'Paid') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10b981', '#14b8a6', '#34d399']
          });
        }
      }
    } catch (e) {
      console.error('Failed to sync consultation updates:', e);
    }
  };

  // Toggle consultation category
  const handleToggleConsultationType = async (type: 'Paid' | 'Complimentary') => {
    setConsultationType(type);
    if (type === 'Complimentary') {
      setPaymentStatus('Waived');
      await handleSaveConsultationState({
        type: 'Complimentary',
        invStatus: 'Waived',
      });
    } else {
      setPaymentStatus('Pending');
      await handleSaveConsultationState({
        type: 'Paid',
        invStatus: 'Pending',
      });
      // Auto-focus amount field when switching to Paid
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  };

  const handleMarkAsPaid = async () => {
    setPaymentStatus('Paid');
    if (!paymentMethod) {
      setPaymentMethod('Cash');
      await handleSaveConsultationState({
        invStatus: 'Paid',
        invMethod: 'Cash',
      });
    } else {
      await handleSaveConsultationState({
        invStatus: 'Paid',
      });
    }
  };

  const handleSendInvoiceWhatsApp = async () => {
    if (!activePatient || !activeInvoice || !activeConsultation) return;
    
    setIsSharingInvoice(true);
    showToast('Compiling and sharing invoice PDF...', 'info');

    try {
      const amountVal = amount || '500';
      const methodStr = paymentMethod || 'Bank Transfer';

      // Call the upgraded dual-sharing engine (generates PDF, uploads to Supabase, shares or downloads + redirects to WhatsApp Web)
      const uploadedUrl = await sendInvoiceToPatient({
        patient: activePatient,
        consultation: activeConsultation,
        invoice: activeInvoice,
        fee: amountVal,
        paymentMethod: methodStr,
        doctorInfo: doctorInfo,
      });

      // Update the invoice in the database/store
      await updateInvoice({
        ...activeInvoice,
        amount: Number(amountVal),
        payment_method: methodStr,
      });

      showToast('Invoice PDF generated and shared!', 'success');
    } catch (err: any) {
      console.error('Invoice PDF dispatch failed:', err);
      showToast('Failed to compile or share Invoice PDF.', 'error');
    } finally {
      setIsSharingInvoice(false);
    }
  };

  const handleFinishConsultation = async () => {
    if (!activeConsultation) return;
    try {
      await updateConsultation({
        ...activeConsultation,
        status: 'Completed',
      });
      setActiveConsultationId(null);
      onBack();
    } catch (e) {
      console.error('Failed to complete consultation:', e);
    }
  };

  if (!activeConsultation || !activePatient || !activeInvoice) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle size={32} className="text-destructive mb-3 animate-bounce" />
        <p className="text-sm font-semibold text-foreground">No active consultation loaded</p>
        <button onClick={onBack} className="mt-4 text-xs font-semibold text-primary underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Upper Navigation Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-border p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Active Consultation Session</span>
            <h2 className="text-lg font-bold text-foreground">
              Patient: <span className="text-primary">{activePatient.full_name}</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            {activePatient.gender}, {activePatient.age} Yrs &bull; {activePatient.city}
          </span>
          <button
            onClick={handleFinishConsultation}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none disabled:opacity-50"
          >
            Finish & Close Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Setup Billing, notes, triggers */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Toggle Mode */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3.5">Consultation Category</h3>
            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => handleToggleConsultationType('Paid')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all focus:outline-none ${
                  consultationType === 'Paid'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard size={14} className={consultationType === 'Paid' ? 'text-primary' : ''} />
                Paid Consult
              </button>
              <button
                type="button"
                onClick={() => handleToggleConsultationType('Complimentary')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all focus:outline-none ${
                  consultationType === 'Complimentary'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Gift size={14} className={consultationType === 'Complimentary' ? 'text-primary' : ''} />
                Complimentary
              </button>
            </div>
          </div>

          {/* 2. Billing details (only if Paid) */}
          {consultationType === 'Paid' ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice & Payment</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                  paymentStatus === 'Paid'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/10'
                }`}>
                  {paymentStatus}
                </span>
              </div>

              {/* Fee Amount */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Fee Amount (Rs.)</label>
                <input
                  ref={amountRef}
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    const val = parseFloat(e.target.value);
                    handleSaveConsultationState({ invAmount: isNaN(val) ? 0 : val });
                  }}
                  placeholder="500"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value as any;
                    setPaymentMethod(method);
                    handleSaveConsultationState({ invMethod: method });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                >
                  <option value="">-- Select Payment Method --</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {/* Invoice Actions */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSendInvoiceWhatsApp}
                  disabled={isSharingInvoice}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus:outline-none disabled:opacity-50"
                >
                  {isSharingInvoice ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-primary" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send size={13} className="text-emerald-600 dark:text-emerald-400" />
                      Share Invoice
                    </>
                  )}
                </button>
                {paymentStatus !== 'Paid' && (
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none"
                  >
                    <CheckCircle2 size={13} />
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-tr from-indigo-500/5 to-teal-500/5 border border-indigo-500/10 rounded-2xl p-5 flex items-start space-x-3.5">
              <Gift size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Complimentary Session</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The consultation is marked as free. The billing status has been automatically set to &quot;Waived&quot;, and the homeopathic prescription builder is fully unlocked.
                </p>
              </div>
            </div>
          )}

          {/* 3. Clinical Notes & Advice */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clinical Investigation & Notes</h3>
            </div>
            <textarea
              value={doctorNotes}
              onChange={(e) => {
                setDoctorNotes(e.target.value);
                handleSaveConsultationState({ notes: e.target.value });
              }}
              placeholder="Record chief complaints, key modalities (aggravation/amelioration), thermal symptoms, diagnostic parameters, or laboratory investigation recommendations..."
              rows={6}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Prescription Builder (Conditional Lock) */}
        <div className="lg:col-span-7 relative h-full">
          {isRxLocked ? (
            /* Lock Screen */
            <div className="bg-card border border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center py-24 shadow-sm animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-5 animate-pulse">
                <Lock size={28} />
              </div>
              <h4 className="text-base font-bold text-foreground">Prescription Builder Locked</h4>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                To guarantee billing compliance, the Homeopathic Rx builder remains locked until the fee invoice is verified as **Paid**.
              </p>
              <div className="mt-6 flex gap-3.5">
                <button
                  onClick={handleMarkAsPaid}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none"
                >
                  <Unlock size={14} />
                  Verify Payment (Paid)
                </button>
                <button
                  onClick={() => handleToggleConsultationType('Complimentary')}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus:outline-none"
                >
                  Make Complimentary
                </button>
              </div>
            </div>
          ) : (
            /* Unlocked Rx Builder */
            <div className="animate-scale-in">
              <div className="flex items-center gap-2 mb-3 bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Unlock size={14} className="flex-shrink-0" />
                Prescription Builder Unlocked! Create patient remedy instructions.
              </div>
              <PrescriptionBuilder consultationId={activeConsultation.id} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md'
            : toast.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md'
            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 backdrop-blur-md'
        }`}>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
