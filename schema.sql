-- HomeoCare EMR PostgreSQL Database Schema (Supabase)

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    city TEXT NOT NULL,
    medical_history TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching patients by name or phone
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients (full_name, phone);

-- 2. Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    consultation_type TEXT NOT NULL CHECK (consultation_type IN ('Paid', 'Complimentary')),
    doctor_notes TEXT DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying consultations by patient
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations (patient_id);

-- 3. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    payment_method TEXT CHECK (payment_method IN ('Bank Transfer', 'Mobile Wallet', 'Cash')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying invoices by consultation
CREATE INDEX IF NOT EXISTS idx_invoices_consultation ON invoices (consultation_id);

-- 4. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of remedy object details
    diet_precautions TEXT DEFAULT '', -- Text or JSON representing restrictions
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying prescriptions by consultation
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions (consultation_id);

-- Enable Row Level Security (RLS) on tables for Supabase security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Create default security policies allowing anonymous/authenticated access for demonstration purposes
-- Adjust these in production for granular tenant or role access.
CREATE POLICY "Allow public read access" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON patients FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON consultations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON consultations FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON invoices FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON prescriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON prescriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON prescriptions FOR UPDATE USING (true);
