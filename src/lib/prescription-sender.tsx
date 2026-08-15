import React from 'react';
import { pdf } from '@react-pdf/renderer';
import PrescriptionPDF from '@/components/PrescriptionPDF';
import InvoicePDF from '@/components/InvoicePDF';
import { Patient, Consultation, Medicine, Invoice } from './storage';
import { DEFAULT_DOCTOR_INFO } from './constants';
import { uploadPdfToStorage } from './upload-pdf';

interface SendPrescriptionParams {
  patient: Patient;
  consultation: Consultation;
  medicines: Medicine[];
  precautions: string[];
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
}

/**
 * Generates the Prescription PDF and dispatches it via a dual-sharing engine:
 * 1. If navigator.share with files is supported (e.g. mobile Safari/Chrome), shares the PDF file directly.
 * 2. Otherwise (e.g. desktop), triggers a local download and redirects the browser to WhatsApp Web.
 */
export async function sendPrescriptionToPatient({
  patient,
  consultation,
  medicines,
  precautions,
  doctorInfo,
}: SendPrescriptionParams): Promise<void> {
  try {
    // 1. Format the Doctor's name to ensure no double "Dr. Dr." prefixes
    let cleanDocName = doctorInfo.name.trim();
    while (/^dr\.?\s+dr\.?\s+/i.test(cleanDocName)) {
      cleanDocName = cleanDocName.replace(/^dr\.?\s+/i, '');
    }
    if (!/^dr\.?\s+/i.test(cleanDocName)) {
      cleanDocName = `Dr. ${cleanDocName}`;
    }

    // 2. Compile the PDF Blob
    const pdfBlob = await pdf(
      <PrescriptionPDF
        doctorInfo={doctorInfo}
        patient={patient}
        consultation={consultation}
        medicines={medicines}
        dietPrecautions={precautions}
      />
    ).toBlob();

    const fileName = `Prescription_${patient.full_name.replace(/\s+/g, '_')}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 3. Format Dietary Precautions & Message Text
    const formattedPrecautions = precautions.length > 0
      ? precautions.map((p) => ` • ${p}`).join('\n')
      : ' • None specified';

    const messageText = `*Assalam-o-Alaikum ${patient.full_name},*

Your prescription from *${cleanDocName}* (${doctorInfo.clinicName || 'Yashfeen Homoeopathic Clinic'}) is attached.

*Dietary Precautions & Instructions:*
${formattedPrecautions}

_Please take the remedies strictly as directed. Wishing you good health!_`;

    // 4. Mobile / Supported Device Flow (Web Share API - Sends Actual PDF File)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      await navigator.share({
        files: [pdfFile],
        title: `${patient.full_name} - Prescription`,
        text: messageText,
      });
      return;
    }

    // 5. Desktop Fallback: Auto-download PDF + Open WhatsApp Web
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);

    // Open WhatsApp Web with pre-formatted message
    const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

  } catch (error) {
    console.error('Error sharing prescription:', error);
    throw error;
  }
}

interface SendInvoiceParams {
  patient: Patient;
  consultation: Consultation;
  invoice: Invoice;
  fee: number | string;
  paymentMethod: string;
  doctorInfo: typeof DEFAULT_DOCTOR_INFO;
}

/**
 * Generates the Consultation Invoice PDF, uploads to Supabase, and dispatches via a dual-sharing engine:
 * 1. Uploads generated PDF to Supabase Storage 'clinic-documents' in 'invoices/' folder.
 * 2. If navigator.share is supported, shares the PDF file directly with billing link details.
 * 3. Otherwise (desktop), triggers a local download and redirects the browser to WhatsApp Web.
 */
export async function sendInvoiceToPatient({
  patient,
  consultation,
  invoice,
  fee,
  paymentMethod,
  doctorInfo,
}: SendInvoiceParams): Promise<string> {
  try {
    // 1. Format the Doctor's name to ensure no double "Dr. Dr." prefixes
    let cleanDocName = doctorInfo.name.trim();
    while (/^dr\.?\s+dr\.?\s+/i.test(cleanDocName)) {
      cleanDocName = cleanDocName.replace(/^dr\.?\s+/i, '');
    }
    if (!/^dr\.?\s+/i.test(cleanDocName)) {
      cleanDocName = `Dr. ${cleanDocName}`;
    }

    // 2. Compile the A5 PDF Blob
    const pdfBlob = await pdf(
      <InvoicePDF
        patient={{
          name: patient.full_name,
          phone: patient.phone,
          city: patient.city,
        }}
        fee={fee}
        paymentMethod={paymentMethod}
        doctorInfo={{
          name: doctorInfo.name,
          clinicName: doctorInfo.clinicName,
          qualifications: doctorInfo.degree,
          regNo: doctorInfo.regNo,
          contact: doctorInfo.phone,
        }}
        invoiceNumber={`INV-${invoice.id}`}
      />
    ).toBlob();

    const fileName = `Invoice_${patient.full_name.replace(/\s+/g, '_')}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 3. Upload to Supabase Storage
    const uploadedUrl = await uploadPdfToStorage(pdfBlob, fileName, 'invoices');

    // 4. Format Message Text
    const messageText = `*Assalam-o-Alaikum ${patient.full_name},*

Your consultation fee invoice from *${doctorInfo.clinicName || 'Yashfeen Homoeopathic Clinic'}* is ready.

*Fee Amount:* Rs. ${fee}
*Payment Method:* ${paymentMethod}
*Invoice Link:* ${uploadedUrl}

*Official Payment Account Details:*
• Bank: Meezan Bank / Askari Bank
• Account Title: ${cleanDocName}
• IBAN / Account #: PK00XXXX00000000000000
• Easypaisa / JazzCash: ${doctorInfo.phone}

_After completing the fund transfer, kindly send a screenshot of the payment receipt to start your consultation. Wishing you good health!_`;

    // 5. Mobile / Supported Device Flow (Web Share API - Sends Actual PDF File)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      await navigator.share({
        files: [pdfFile],
        title: `${patient.full_name} - Consultation Invoice`,
        text: messageText,
      });
      return uploadedUrl;
    }

    // 6. Desktop Fallback: Auto-download PDF + Open WhatsApp Web
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);

    // Open WhatsApp Web with pre-formatted message
    const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    return uploadedUrl;

  } catch (error) {
    console.error('Error sharing invoice:', error);
    throw error;
  }
}
