'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldAlert, Check } from 'lucide-react';
import { useEmrStore } from '@/lib/store';

interface DoctorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DoctorSettingsModal({ isOpen, onClose }: DoctorSettingsModalProps) {
  const { doctorInfo, updateDoctorInfo } = useEmrStore();

  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [regNo, setRegNo] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && doctorInfo) {
      setName(doctorInfo.name);
      setDegree(doctorInfo.degree);
      setRegNo(doctorInfo.regNo);
      setClinicName(doctorInfo.clinicName);
      setAddress(doctorInfo.address);
      setPhone(doctorInfo.phone);
      setEmail(doctorInfo.email);
      setSavedSuccess(false);
    }
  }, [isOpen, doctorInfo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDoctorInfo({
      name: name.trim(),
      degree: degree.trim(),
      regNo: regNo.trim(),
      clinicName: clinicName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl border border-border animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-950/20 to-teal-950/20 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Settings size={18} className="text-primary animate-spin-slow" />
            <h2 className="text-base font-bold tracking-tight">Clinic Profile & Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {savedSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
              <Check size={16} /> Profile settings saved successfully!
            </div>
          )}

          {/* Clinic Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Clinic Name</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 font-semibold"
              required
            />
          </div>

          {/* Doctor Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Doctor Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 font-semibold"
              required
            />
          </div>

          {/* Qualifications & Reg No */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Degrees</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.H.M.S, M.D."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Registration No</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="e.g. RHC-90321"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                required
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Clinic Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Clinic Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                required
              />
            </div>
          </div>

          {/* Clinic Address */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Clinic Physical Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 resize-none leading-relaxed"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-border pt-4 bg-muted/10 -mx-6 -mb-6 p-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors focus:outline-none"
            >
              Close
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/45"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
