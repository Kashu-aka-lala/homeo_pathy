'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, Activity, DollarSign, FileClock, Sun, Moon, 
  Settings, HeartPulse, RefreshCw, Database
} from 'lucide-react';
import { useEmrStore } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/storage';
import PatientRegistry from '@/components/patient-registry';
import ConsultationWorkflow from '@/components/consultation-workflow';
import DoctorSettingsModal from '@/components/doctor-settings-modal';

export default function Dashboard() {
  const { 
    patients, consultations, invoices, activeConsultationId, 
    loadData, isLoading, doctorInfo 
  } = useEmrStore();

  const [darkMode, setDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load EMR records on mount
  useEffect(() => {
    loadData();

    // Check localStorage for dark mode preference
    if (typeof window !== 'undefined') {
      const darkPref = localStorage.getItem('homeocare_dark_mode') === 'true';
      setDarkMode(darkPref);
      if (darkPref) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [loadData]);

  // Toggle theme controller
  const handleToggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeocare_dark_mode', String(nextDark));
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // ----------------------------------------------------
  // Statistics Calculations
  // ----------------------------------------------------
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const totalConsults = consultations.length;
    const pendingInvoices = invoices.filter((i) => i.payment_status.toUpperCase() === 'PENDING').length;
    const revenue = invoices
      .filter((i) => i.payment_status.toUpperCase() === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return [
      {
        title: 'Total Patients',
        value: totalPatients.toString(),
        icon: Users,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/10',
      },
      {
        title: 'Total Consultations',
        value: totalConsults.toString(),
        icon: Activity,
        color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/10',
      },
      {
        title: 'Pending Invoices',
        value: pendingInvoices.toString(),
        icon: FileClock,
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/10',
      },
      {
        title: 'Revenue Collected',
        value: `Rs. ${revenue.toLocaleString()}`,
        icon: DollarSign,
        color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/10',
      },
    ];
  }, [patients, consultations, invoices]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 shadow-md border border-primary/10">
          <HeartPulse className="animate-pulse text-primary" size={32} />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <RefreshCw size={14} className="animate-spin text-primary" />
          Synchronizing EMR records...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-all duration-300">
      {/* ----------------- TOP HEADER BAR ----------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10 border border-emerald-500/10">
              <HeartPulse size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                Yashfeen <span className="text-primary font-normal">EMR</span>
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Clinic of {doctorInfo.name} &bull; Reg No {doctorInfo.regNo}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Database mode status badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
              isSupabaseConfigured
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              <Database size={11} />
              <span className="hidden sm:inline">
                {isSupabaseConfigured ? 'Supabase Connected' : 'Local Fallback Storage'}
              </span>
              <span className="sm:hidden">
                {isSupabaseConfigured ? 'Supabase' : 'Local'}
              </span>
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={handleToggleTheme}
              className="rounded-xl border border-border p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Doctor Profile settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl border border-border p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
              title="Clinic Settings"
            >
              <Settings size={15} className="hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </header>

      {/* ----------------- CORE CONTENT BODY ----------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Render stats summary (Hide during active consultation to maximize typing space) */}
        {!activeConsultationId && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {stats.map((s, idx) => (
              <div 
                key={idx} 
                className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-xs hover:border-primary/20 transition-all duration-300"
              >
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">{s.title}</span>
                  <span className="text-base sm:text-lg font-bold text-foreground block mt-1.5">{s.value}</span>
                </div>
                <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl border ${s.color} flex-shrink-0 ml-2`}>
                  <s.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workspace Panel switcher */}
        <div className="w-full">
          {activeConsultationId ? (
            <ConsultationWorkflow onBack={() => useEmrStore.getState().setActiveConsultationId(null)} />
          ) : (
            <PatientRegistry onStartConsultation={() => {}} />
          )}
        </div>
      </main>

      {/* Profile & Clinic Settings Modal */}
      <DoctorSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
