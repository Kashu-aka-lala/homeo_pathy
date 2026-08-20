import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Patient, Consultation, Medicine } from '@/lib/storage';
import { DEFAULT_DOCTOR_INFO } from '@/lib/constants';

// Helper to sanitize doctor names and avoid duplicate "Dr. Dr." prefixes
const formatDoctorName = (name: string) => {
  let clean = name.trim();
  // Strip repeated "Dr." prefixes recursively
  while (/^dr\.?\s+dr\.?\s+/i.test(clean)) {
    clean = clean.replace(/^dr\.?\s+/i, '');
  }
  // Ensure exactly one "Dr." prefix
  if (!/^dr\.?\s+/i.test(clean)) {
    clean = `Dr. ${clean}`;
  }
  return clean;
};

// React-PDF Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  // Branded Header
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#047857', // Emerald
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  logo: {
    width: 55,
    height: 55,
    marginLeft: 10,
  },
  clinicName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#047857',
  },
  doctorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 3,
  },
  doctorDetails: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },
  // Patient Profile
  patientBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 5,
    padding: 8,
    marginBottom: 15,
  },
  patientTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  patientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patientCol: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 3,
  },
  patientLabel: {
    width: 80,
    color: '#64748b',
    fontSize: 8.5,
  },
  patientValue: {
    flex: 1,
    color: '#1e293b',
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  // Clinical Summary
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0d9488', // Teal
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  notesBox: {
    backgroundColor: '#fafafa',
    borderWidth: 0.5,
    borderColor: '#e5e5e5',
    borderRadius: 4,
    padding: 8,
    marginBottom: 15,
  },
  notesText: {
    fontSize: 8.5,
    color: '#444444',
    lineHeight: 1.4,
  },
  // Table Styling
  table: {
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#047857', // Emerald
    padding: 6,
  },
  tableHeaderCol: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: 6.5,
    alignItems: 'center',
  },
  tableRowCol: {
    fontSize: 8.5,
    color: '#334155',
  },
  colRemedy: {
    width: '35%',
    fontWeight: 'bold',
  },
  colPotency: {
    width: '15%',
  },
  colVehicle: {
    width: '20%',
  },
  colDosage: {
    width: '20%',
    fontWeight: 'bold',
  },
  colDuration: {
    width: '10%',
  },
  // Diet restrictions
  precautionsBox: {
    marginBottom: 20,
  },
  precautionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  precautionBullet: {
    fontSize: 8.5,
    color: '#dc2626', // Red bullet
    fontWeight: 'bold',
    marginRight: 12,
  },
  // Signature block
  signatureBlock: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureContainer: {
    width: 180,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    alignItems: 'flex-start',
  },
  signatureLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#475569',
  },
  signatureSubLabel: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  // Footer
  footer: {
    marginTop: 'auto',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});

interface PrescriptionPDFProps {
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
  patient: Patient;
  consultation: Consultation;
  medicines: Medicine[];
  dietPrecautions: string[];
}

export default function PrescriptionPDF({
  doctorInfo,
  patient,
  consultation,
  medicines,
  dietPrecautions,
}: PrescriptionPDFProps) {
  const dateStr = consultation.created_at
    ? new Date(consultation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString();

  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.jpg` : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Branded Clinic Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>{doctorInfo.clinicName}</Text>
            <Text style={styles.doctorName}>{formatDoctorName(doctorInfo.name)}</Text>
            <Text style={styles.doctorDetails}>
              Qualifications: {doctorInfo.degree} | Reg No: {doctorInfo.regNo}
            </Text>
            <Text style={styles.doctorDetails}>
              Clinic Contact: {doctorInfo.phone} | Email: {doctorInfo.email}
            </Text>
            <Text style={styles.doctorDetails}>
              Address: {doctorInfo.address}
            </Text>
          </View>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        </View>

        {/* Patient Details Block */}
        <View style={styles.patientBox}>
          <Text style={styles.patientTitle}>PATIENT INFRASTRUCTURE</Text>
          <View style={styles.patientGrid}>
            <View style={styles.patientCol}>
              <Text style={styles.patientLabel}>Name:</Text>
              <Text style={styles.patientValue}>{patient.full_name}</Text>
            </View>
            <View style={styles.patientCol}>
              <Text style={styles.patientLabel}>City / Location:</Text>
              <Text style={styles.patientValue}>{patient.city}</Text>
            </View>
            <View style={styles.patientCol}>
              <Text style={styles.patientLabel}>Age / Gender:</Text>
              <Text style={styles.patientValue}>{patient.age} Yrs / {patient.gender}</Text>
            </View>
            <View style={styles.patientCol}>
              <Text style={styles.patientLabel}>Prescribed Date:</Text>
              <Text style={styles.patientValue}>{dateStr}</Text>
            </View>
          </View>
        </View>

        {/* Clinical Notes / Symptoms */}
        {consultation.doctor_notes && (
          <View>
            <Text style={styles.sectionTitle}>Clinical Investigation & Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{consultation.doctor_notes}</Text>
            </View>
          </View>
        )}

        {/* Medicine Table */}
        <Text style={styles.sectionTitle}>Rx (Homeopathic Remedies)</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, styles.colRemedy]}>REMEDY</Text>
            <Text style={[styles.tableHeaderCol, styles.colPotency]}>POTENCY</Text>
            <Text style={[styles.tableHeaderCol, styles.colVehicle]}>VEHICLE / FORM</Text>
            <Text style={[styles.tableHeaderCol, styles.colDosage]}>DOSAGE / FREQ</Text>
            <Text style={[styles.tableHeaderCol, styles.colDuration]}>DURATION</Text>
          </View>

          {/* Table Rows */}
          {medicines.map((med, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableRowCol, styles.colRemedy]}>{med.remedy}</Text>
              <Text style={[styles.tableRowCol, styles.colPotency]}>{med.potency}</Text>
              <Text style={[styles.tableRowCol, styles.colVehicle]}>{med.vehicle}</Text>
              <Text style={[styles.tableRowCol, styles.colDosage]}>{med.dosage}</Text>
              <Text style={[styles.tableRowCol, styles.colDuration]}>{med.duration}</Text>
            </View>
          ))}
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.precautionsBox}>
          <Text style={styles.sectionTitle}>Dietary Guidelines & Restrictions</Text>
          {dietPrecautions && dietPrecautions.length > 0 ? (
            <View style={styles.precautionList}>
              {dietPrecautions.map((p, idx) => (
                <Text key={idx} style={styles.precautionBullet}>
                  {"\u2022"} {p}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[styles.notesText, { color: '#64748b' }]}>
              No specific dietary restrictions or instructions.
            </Text>
          )}
        </View>

        {/* Signature Box */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureLabel}>{formatDoctorName(doctorInfo.name)}</Text>
            <Text style={styles.signatureSubLabel}>Authorized Signature & Stamp</Text>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This prescription is digitally generated. Refills must be verified by the doctor.
          </Text>
          <Text style={styles.footerText}>
            Generated by Yashfeen Homoeopathic Clinic EMR.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
