import React from 'react';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from '@/components/PrescriptionPDF';
import InvoicePDF from '@/components/InvoicePDF';
import { Patient, Consultation, Medicine, Invoice } from './storage';
import { DEFAULT_DOCTOR_INFO } from './constants';
import { uploadPdf, sanitizePhone } from './supabase-service';

// ─── Device detection ─────────────────────────────────────────────────────────

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ─── Doctor name helper ───────────────────────────────────────────────────────

/** Ensures exactly one "Dr." prefix – never "Dr. Dr." */
function formatDoctorName(rawName: string): string {
  let name = rawName.trim();
  // Strip leading duplicate Dr. prefixes
  while (/^dr\.?\s+dr\.?\s*/i.test(name)) {
    name = name.replace(/^dr\.?\s+/i, '');
  }
  if (!/^dr\.?\s+/i.test(name)) {
    name = `Dr. ${name}`;
  }
  return name;
}

// ─── Local download helper ────────────────────────────────────────────────────

function triggerLocalDownload(blob: Blob, fileName: string): void {
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
}

// ─── WhatsApp launcher ────────────────────────────────────────────────────────

function openWhatsApp(rawPhone: string, messageText: string): void {
  const cleanPhone = sanitizePhone(rawPhone);
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, '_blank');
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPrescriptionToPatient
// ─────────────────────────────────────────────────────────────────────────────

interface SendPrescriptionParams {
  patient: Patient;
  consultation: Consultation;
  medicines: Medicine[];
  precautions: string[];
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
  pdfUrl?: string | null; // optional pre-uploaded URL; we'll upload if missing
}

/**
 * Generates the Prescription PDF, uploads to Supabase Storage, and dispatches:
 *  • Mobile: navigator.share (with actual file attachment)
 *  • Desktop: local backup download + direct WhatsApp Web link with CDN URL
 *
 * The WhatsApp message NEVER contains a blob: URL.
 */
export async function sendPrescriptionToPatient({
  patient,
  consultation,
  medicines,
  precautions,
  doctorInfo,
  pdfUrl: existingPdfUrl,
}: SendPrescriptionParams): Promise<void> {
  const cleanDocName = formatDoctorName(doctorInfo.name);

  // 1. Generate PDF blob
  const pdfBlob = await pdf(
    <PrescriptionPDF
      doctorInfo={doctorInfo}
      patient={patient}
      consultation={consultation}
      medicines={medicines}
      dietPrecautions={precautions}
    />
  ).toBlob();

  const fileName = `Rx_${patient.full_name.replace(/\s+/g, '_')}.pdf`;

  // 2. Upload to Supabase Storage (always attempt; use existing URL as fallback)
  let permanentUrl: string | null = existingPdfUrl ?? null;
  if (!permanentUrl) {
    const uploadFileName = `rx_${consultation.id}_${Date.now()}.pdf`;
    const { data: uploadedUrl, error: uploadError } = await uploadPdf(pdfBlob, uploadFileName, 'prescriptions');
    if (uploadError) {
      console.warn('[sendPrescription] Upload failed:', uploadError);
    } else {
      permanentUrl = uploadedUrl;
    }
  }

  // 3. Build WhatsApp message
  const formattedPrecautions = precautions.length > 0
    ? precautions.map((p) => ` • ${p}`).join('\n')
    : ' • None specified';

  let messageText = `*Assalam-o-Alaikum ${patient.full_name},*\n\nYour prescription from *${cleanDocName}* (${doctorInfo.clinicName || 'Yashfeen Homoeopathic Clinic'}) is ready.`;

  if (permanentUrl) {
    messageText += `\n\n*Prescription Link:* ${permanentUrl}`;
  } else {
    messageText += `\n\nYour prescription PDF has been downloaded to your device.`;
  }

  messageText += `\n\n*Dietary Precautions & Instructions:*\n${formattedPrecautions}\n\n_Please take the remedies strictly as directed. Wishing you good health!_\n\n_— ${cleanDocName}, ${doctorInfo.clinicName}_`;

  // 4. Mobile: use Web Share API to attach the actual file
  const isMobile = isMobileDevice();
  if (
    isMobile &&
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([pdfBlob], fileName, { type: 'application/pdf' })] })
  ) {
    await navigator.share({
      files: [new File([pdfBlob], fileName, { type: 'application/pdf' })],
      title: `${patient.full_name} – Prescription`,
      text: messageText,
    });
    return;
  }

  // 5. Desktop: download backup + open WhatsApp directly (NO navigator.share)
  triggerLocalDownload(pdfBlob, fileName);
  openWhatsApp(patient.phone, messageText);
}

// ─────────────────────────────────────────────────────────────────────────────
// sendInvoiceToPatient
// ─────────────────────────────────────────────────────────────────────────────

interface SendInvoiceParams {
  patient: Patient;
  consultation: Consultation;
  invoice: Invoice;
  fee: number | string;
  paymentMethod: string;
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
}

/**
 * Generates the Invoice PDF, uploads to Supabase Storage, and dispatches:
 *  • Mobile: navigator.share (with actual file attachment)
 *  • Desktop: local backup download + direct WhatsApp Web link with CDN URL
 *
 * Returns the permanent public URL so the caller can persist it on the invoice row.
 * The WhatsApp message NEVER contains a blob: URL.
 */
export async function sendInvoiceToPatient({
  patient,
  consultation,
  invoice,
  fee,
  paymentMethod,
  doctorInfo,
}: SendInvoiceParams): Promise<string> {
  const cleanDocName = formatDoctorName(doctorInfo.name);

  // 1. Generate PDF blob
  const pdfBlob = await pdf(
    <InvoicePDF
      patient={{
        name:  patient.full_name,
        phone: patient.phone,
        city:  patient.city,
      }}
      fee={fee}
      paymentMethod={paymentMethod}
      doctorInfo={{
        name:           doctorInfo.name,
        clinicName:     doctorInfo.clinicName,
        qualifications: doctorInfo.degree,
        regNo:          doctorInfo.regNo,
        contact:        doctorInfo.phone,
      }}
      invoiceNumber={`INV-${invoice.id}`}
    />
  ).toBlob();

  const fileName = `Invoice_${patient.full_name.replace(/\s+/g, '_')}.pdf`;

  // 2. Upload to Supabase Storage
  const uploadFileName = `inv_${invoice.id}_${Date.now()}.pdf`;
  const { data: permanentUrl, error: uploadError } = await uploadPdf(pdfBlob, uploadFileName, 'invoices');
  if (uploadError) {
    console.warn('[sendInvoice] Upload failed:', uploadError);
  }

  // 3. Build WhatsApp message (uses CDN URL; gracefully omits link if upload failed)
  const messageText = [
    `*Assalam-o-Alaikum ${patient.full_name},*`,
    ``,
    `Your consultation fee invoice from *${doctorInfo.clinicName || 'Yashfeen Homoeopathic Clinic'}* is ready.`,
    ``,
    `*Fee Amount:* Rs. ${fee}`,
    `*Payment Method:* ${paymentMethod}`,
    permanentUrl ? `*Invoice Link:* ${permanentUrl}` : null,
    ``,
    `*Official Payment Account Details:*`,
    `- Bank: Meezan Bank / Askari Bank`,
    `- Account Title: ${cleanDocName}`,
    `- IBAN / Account #: PK00XXXX00000000000000`,
    `- Easypaisa / JazzCash: ${doctorInfo.phone}`,
    ``,
    `_After completing the fund transfer, kindly send a screenshot of the payment receipt to start your consultation. Wishing you good health!_`,
    ``,
    `_— ${cleanDocName}, ${doctorInfo.clinicName}_`,
  ].filter((line) => line !== null).join('\n');

  // 4. Mobile: use Web Share API to attach the actual file
  const isMobile = isMobileDevice();
  if (
    isMobile &&
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([pdfBlob], fileName, { type: 'application/pdf' })] })
  ) {
    await navigator.share({
      files: [new File([pdfBlob], fileName, { type: 'application/pdf' })],
      title: `${patient.full_name} – Consultation Invoice`,
      text: messageText,
    });
    return permanentUrl ?? '';
  }

  // 5. Desktop: download backup + open WhatsApp directly (NO navigator.share)
  triggerLocalDownload(pdfBlob, fileName);
  openWhatsApp(patient.phone, messageText);

  return permanentUrl ?? '';
}


