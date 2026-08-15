'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit } from 'lucide-react';
import { Patient } from '@/lib/storage';
import { useEmrStore } from '@/lib/store';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
}

export default function AddPatientModal({ isOpen, onClose, patientToEdit }: AddPatientModalProps) {
  const { addPatient, updatePatient, setSelectedPatientId } = useEmrStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [city, setCity] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-focus first input on open
  useEffect(() => {
    if (isOpen) {
      if (patientToEdit) {
        setFullName(patientToEdit.full_name);
        setPhone(patientToEdit.phone);
        setAge(patientToEdit.age.toString());
        setGender(patientToEdit.gender);
        setCity(patientToEdit.city);
        setMedicalHistory(patientToEdit.medical_history || '');
      } else {
        setFullName('');
        setPhone('+92'); // default to Pakistan region prefix for clinic but editable
        setAge('');
        setGender('Male');
        setCity('');
        setMedicalHistory('');
      }
      setErrors({});
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, patientToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // WhatsApp phone validation (must have country code prefix +)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const sanitizedPhone = phone.replace(/[\s-()]/g, ''); // strip spaces/hyphens
    if (!phone.trim()) {
      newErrors.phone = 'WhatsApp number is required';
    } else if (!phoneRegex.test(sanitizedPhone)) {
      newErrors.phone = 'Must include country code (e.g., +923001234567)';
    }

    const parsedAge = parseInt(age);
    if (!age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      newErrors.age = 'Age must be between 0 and 120';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const sanitizedPhone = phone.replace(/[\s-()]/g, '');
      const patientData = {
        full_name: fullName.trim(),
        phone: sanitizedPhone,
        age: parseInt(age),
        gender,
        city: city.trim(),
        medical_history: medicalHistory.trim(),
      };

      if (patientToEdit) {
        const updated = await updatePatient({
          ...patientToEdit,
          ...patientData,
        });
        setSelectedPatientId(updated.id);
      } else {
        const added = await addPatient(patientData);
        setSelectedPatientId(added.id);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to save patient. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl border border-border animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-950/20 to-teal-950/20 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {patientToEdit ? <Edit size={18} /> : <Plus size={18} />}
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {patientToEdit ? 'Edit Patient Profile' : 'Register New Patient'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.submit && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 font-medium">
              {errors.submit}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Muhammad Ali"
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                errors.fullName ? 'border-destructive focus:ring-destructive/50' : 'border-border'
              }`}
            />
            {errors.fullName && <p className="text-xs text-destructive font-medium">{errors.fullName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">WhatsApp Number</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +923001234567"
                className={`w-full rounded-xl border bg-background px-4 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                  errors.phone ? 'border-destructive focus:ring-destructive/50' : 'border-border'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Required for prescription WhatsApp dispatches. Include country code (e.g. +92 for Pakistan).
            </p>
            {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
          </div>

          {/* Row: Age & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">Age (Years)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                min="0"
                max="120"
                className={`w-full rounded-xl border bg-background px-4 py-2.5 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                  errors.age ? 'border-destructive focus:ring-destructive/50' : 'border-border'
                }`}
              />
              {errors.age && <p className="text-xs text-destructive font-medium">{errors.age}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-muted-foreground">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Karachi"
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                errors.city ? 'border-destructive focus:ring-destructive/50' : 'border-border'
              }`}
            />
            {errors.city && <p className="text-xs text-destructive font-medium">{errors.city}</p>}
          </div>

          {/* Medical History */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-muted-foreground">Medical History & Allergies</label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="e.g. Chronic asthma, allergic to aspirin, history of hypertension..."
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : patientToEdit ? 'Save Changes' : 'Register Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}
