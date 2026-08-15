'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Check, AlertCircle, FileText, Send, Loader2
} from 'lucide-react';
import { useEmrStore } from '@/lib/store';
import { Medicine, Prescription } from '@/lib/storage';
import { REMEDIES, POTENCIES, VEHICLES, DIET_PRECAUTIONS_PRESETS } from '@/lib/constants';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from './PrescriptionPDF';
import { uploadPdfToStorage } from '@/lib/upload-pdf';
import { sendPrescriptionToPatient } from '@/lib/prescription-sender';

interface PrescriptionBuilderProps {
  consultationId: string;
}

export default function PrescriptionBuilder({ consultationId }: PrescriptionBuilderProps) {
  const {
    patients, consultations, prescriptions, addPrescription, 
    updatePrescription, doctorInfo
  } = useEmrStore();

  const [medicines, setMedicines] = useState<Medicine[]>([
    { remedy: '', potency: '30C', vehicle: 'Pills Size 40', dosage: '4 pills TDS', duration: '7 Days' }
  ]);
  const [selectedPrecautions, setSelectedPrecautions] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [remedyQuery, setRemedyQuery] = useState('');
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch existing prescription if it exists
  const existingPrescription = useMemo(() => {
    return prescriptions.find((p) => p.consultation_id === consultationId) || null;
  }, [prescriptions, consultationId]);

  const activeConsultation = useMemo(() => {
    return consultations.find((c) => c.id === consultationId) || null;
  }, [consultations, consultationId]);

  const activePatient = useMemo(() => {
    if (!activeConsultation) return null;
    return patients.find((p) => p.id === activeConsultation.patient_id) || null;
  }, [patients, activeConsultation]);

  // Load existing data
  useEffect(() => {
    if (existingPrescription) {
      if (existingPrescription.medicines && existingPrescription.medicines.length > 0) {
        setMedicines(existingPrescription.medicines);
      }
      setSelectedPrecautions(existingPrescription.diet_precautions || []);
      setPdfUrl(existingPrescription.pdf_url || null);
    }
  }, [existingPrescription]);

  // Filtered autocomplete remedies
  const filteredRemedies = useMemo(() => {
    const q = remedyQuery.toLowerCase().trim();
    if (!q) return [];
    return REMEDIES.filter((r) => r.toLowerCase().includes(q)).slice(0, 8);
  }, [remedyQuery]);

  // Handle autocomplete click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFocusedRowIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddRow = () => {
    setMedicines([
      ...medicines,
      { remedy: '', potency: '30C', vehicle: 'Pills Size 40', dosage: '4 pills TDS', duration: '7 Days' }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (medicines.length === 1) {
      setMedicines([{ remedy: '', potency: '30C', vehicle: 'Pills Size 40', dosage: '4 pills TDS', duration: '7 Days' }]);
      return;
    }
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setMedicines(updated);

    if (field === 'remedy') {
      setRemedyQuery(value);
      setHighlightedSuggestionIndex(0);
    }
  };

  const handleSelectRemedy = (index: number, name: string) => {
    const updated = [...medicines];
    updated[index].remedy = name;
    setMedicines(updated);
    setFocusedRowIndex(null);
  };

  // Keyboard navigation for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
    if (focusedRowIndex !== rowIndex) return;

    if (filteredRemedies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedSuggestionIndex((prev) => (prev + 1) % filteredRemedies.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedSuggestionIndex((prev) => (prev - 1 + filteredRemedies.length) % filteredRemedies.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectRemedy(rowIndex, filteredRemedies[highlightedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setFocusedRowIndex(null);
      }
    }
  };

  const handleTogglePrecaution = (precaution: string) => {
    if (selectedPrecautions.includes(precaution)) {
      setSelectedPrecautions(selectedPrecautions.filter((p) => p !== precaution));
    } else {
      setSelectedPrecautions([...selectedPrecautions, precaution]);
    }
  };

  const handleSavePrescription = async (): Promise<Prescription | null> => {
    // Validate rows
    const validMedicines = medicines.filter((m) => m.remedy.trim() !== '');
    if (validMedicines.length === 0) {
      setError('At least one medicine remedy name must be specified.');
      return null;
    }
    setError(null);

    const rxData = {
      consultation_id: consultationId,
      medicines: validMedicines,
      diet_precautions: selectedPrecautions,
      pdf_url: pdfUrl,
    };

    try {
      if (existingPrescription) {
        const updated = await updatePrescription({
          ...existingPrescription,
          ...rxData,
        });
        return updated;
      } else {
        const added = await addPrescription(rxData);
        return added;
      }
    } catch (e) {
      console.error(e);
      setError('Failed to save prescription to store.');
      return null;
    }
  };

  const handleGeneratePdf = async () => {
    const saved = await handleSavePrescription();
    if (!saved || !activePatient || !activeConsultation) return;

    setIsGeneratingPdf(true);
    setError(null);
    try {
      // Generate A4 PDF using @react-pdf/renderer
      const rxDoc = (
        <PrescriptionPDF
          doctorInfo={doctorInfo}
          patient={activePatient}
          consultation={activeConsultation}
          medicines={saved.medicines}
          dietPrecautions={saved.diet_precautions}
        />
      );
      const pdfBlob = await pdf(rxDoc).toBlob();

      // Upload file to Supabase
      const fileName = `rx_${saved.id}_${Date.now()}.pdf`;
      const generatedUrl = await uploadPdfToStorage(pdfBlob, fileName, 'prescriptions');

      // Update prescription with PDF url
      await updatePrescription({
        ...saved,
        pdf_url: generatedUrl,
      });

      setPdfUrl(generatedUrl);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to compile PDF: ${e.message || e}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareOnWhatsApp = async () => {
    if (!activePatient || !activeConsultation) return;
    
    setIsSendingWhatsApp(true);
    setError(null);

    try {
      // Save and compile PDF to guarantee latest data is saved
      const saved = await handleSavePrescription();
      if (!saved) return;

      // 1. Generate & Upload PDF to Supabase Storage for DB record (so it shows in Patient History Timeline)
      const rxDoc = (
        <PrescriptionPDF
          doctorInfo={doctorInfo}
          patient={activePatient}
          consultation={activeConsultation}
          medicines={saved.medicines}
          dietPrecautions={saved.diet_precautions}
        />
      );
      const pdfBlob = await pdf(rxDoc).toBlob();
      const fileName = `rx_${saved.id}_${Date.now()}.pdf`;
      const generatedUrl = await uploadPdfToStorage(pdfBlob, fileName, 'prescriptions');

      // Update prescription with PDF url
      await updatePrescription({
        ...saved,
        pdf_url: generatedUrl,
      });
      setPdfUrl(generatedUrl);

      // 2. Call the upgraded dual-sharing engine (Shares actual file or downloads + opens WhatsApp Web)
      await sendPrescriptionToPatient({
        patient: activePatient,
        consultation: activeConsultation,
        medicines: saved.medicines,
        precautions: saved.diet_precautions,
        doctorInfo: doctorInfo,
      });

    } catch (err: any) {
      console.error('WhatsApp Rx dual dispatch failed:', err);
      setError(`Failed to compile or share prescription: ${err.message || err}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3.5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Homeopathic Prescription (Rx)</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Define remedies, potencies, vehicles and frequencies.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Branded Clinic Stamp Preview */}
      <div className="bg-muted/30 border border-border/80 rounded-xl p-4 text-xs space-y-1 bg-gradient-to-tr from-emerald-550/5 to-teal-500/5">
        <div className="font-bold text-sm text-primary">{doctorInfo.clinicName}</div>
        <div className="font-semibold text-foreground">{doctorInfo.name} &bull; <span className="text-muted-foreground">{doctorInfo.degree}</span></div>
        <div className="text-muted-foreground">Reg No: {doctorInfo.regNo} &bull; Contact: {doctorInfo.phone}</div>
      </div>

      {/* Dynamic Medicine Rows */}
      <div className="space-y-3.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Medicine Recipes</label>
        
        {medicines.map((row, index) => (
          <div 
            key={index} 
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl border border-border bg-background/50 relative group hover:border-primary/30 transition-all"
          >
            {/* Remedy Autocomplete */}
            <div className="sm:col-span-4 relative">
              <label className="text-[9px] font-semibold text-muted-foreground block mb-0.5 sm:hidden">Remedy Name</label>
              <input
                type="text"
                value={row.remedy}
                onChange={(e) => handleUpdateField(index, 'remedy', e.target.value)}
                onFocus={() => {
                  setFocusedRowIndex(index);
                  setRemedyQuery(row.remedy);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="Search remedy (e.g. Arnica)"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold placeholder:font-normal"
              />
              
              {/* Autocomplete suggestion card */}
              {focusedRowIndex === index && filteredRemedies.length > 0 && (
                <div 
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full z-40 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg text-xs"
                >
                  {filteredRemedies.map((rem, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleSelectRemedy(index, rem)}
                      className={`w-full px-3 py-1.5 text-left font-semibold hover:bg-accent hover:text-accent-foreground ${
                        highlightedSuggestionIndex === sIdx ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      {rem}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Potency Selection */}
            <div className="sm:col-span-2">
              <label className="text-[9px] font-semibold text-muted-foreground block mb-0.5 sm:hidden">Potency</label>
              <select
                value={row.potency}
                onChange={(e) => handleUpdateField(index, 'potency', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {POTENCIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection */}
            <div className="sm:col-span-2">
              <label className="text-[9px] font-semibold text-muted-foreground block mb-0.5 sm:hidden">Vehicle</label>
              <select
                value={row.vehicle}
                onChange={(e) => handleUpdateField(index, 'vehicle', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Dosage & Frequency */}
            <div className="sm:col-span-2">
              <label className="text-[9px] font-semibold text-muted-foreground block mb-0.5 sm:hidden">Dosage</label>
              <input
                type="text"
                value={row.dosage}
                onChange={(e) => handleUpdateField(index, 'dosage', e.target.value)}
                placeholder="4 pills TDS"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Duration */}
            <div className="sm:col-span-1.5 col-span-2">
              <label className="text-[9px] font-semibold text-muted-foreground block mb-0.5 sm:hidden">Duration</label>
              <input
                type="text"
                value={row.duration}
                onChange={(e) => handleUpdateField(index, 'duration', e.target.value)}
                placeholder="7 Days"
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Remove Action */}
            <div className="sm:col-span-0.5 col-span-1 flex items-center justify-end sm:justify-center">
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg p-1.5 transition-colors focus:outline-none"
                title="Remove Row"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-background hover:bg-muted/40 w-full justify-center py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all focus:outline-none"
        >
          <Plus size={14} />
          Add Remedy Row
        </button>
      </div>

      {/* Dietary Restrictions Tags */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Dietary Restrictions & Precautions</label>
        <div className="flex flex-wrap gap-1.5">
          {DIET_PRECAUTIONS_PRESETS.map((tag) => {
            const isSelected = selectedPrecautions.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTogglePrecaution(tag)}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground'
                }`}
              >
                {isSelected && <Check size={10} />}
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger blocks */}
      <div className="border-t border-border pt-4 flex flex-col sm:flex-row gap-3 justify-between items-center bg-muted/10 -mx-5 -mb-5 p-5 rounded-b-2xl">
        <div className="text-xs text-muted-foreground font-medium text-center sm:text-left">
          {pdfUrl ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center sm:justify-start gap-1">
              <Check size={14} /> Prescription Compiled Successfully
            </span>
          ) : (
            'Compile the prescription to generate PDF and dispatch.'
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors focus:outline-none w-full sm:w-auto disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={13} className="animate-spin text-primary" />
                Compiling...
              </>
            ) : (
              <>
                <FileText size={13} className="text-primary" />
                Generate PDF
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShareOnWhatsApp}
            disabled={isGeneratingPdf || isSendingWhatsApp}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md focus:outline-none w-full sm:w-auto disabled:opacity-50 animate-fade-in"
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={13} />
                Send via WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
