import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    marginLeft: 10,
  },
  clinicName: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#059669',
    letterSpacing: 0.3,
  },
  doctorName: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginTop: 2,
    color: '#1e293b',
  },
  subText: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },
  invoiceTitleBadge: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    color: '#64748b',
    fontSize: 9.5,
  },
  value: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 9.5,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  paymentHeading: {
    fontWeight: 'bold',
    fontSize: 11,
    color: '#065f46',
    marginBottom: 6,
  },
  paymentDetailRow: {
    fontSize: 9.5,
    color: '#1e293b',
    marginVertical: 2.5,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 8.5,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
});

interface InvoicePDFProps {
  patient: {
    name: string;
    phone: string;
    city?: string;
  };
  fee: number | string;
  paymentMethod: string;
  doctorInfo: {
    name: string;
    clinicName?: string;
    qualifications?: string;
    regNo?: string;
    contact?: string;
  };
  invoiceNumber?: string;
}

export default function InvoicePDF({
  patient,
  fee,
  paymentMethod,
  doctorInfo,
  invoiceNumber,
}: InvoicePDFProps) {
  // Sanitize doctor name prefix
  let cleanDocName = doctorInfo.name.trim();
  while (/^dr\.?\s+dr\.?\s+/i.test(cleanDocName)) {
    cleanDocName = cleanDocName.replace(/^dr\.?\s+/i, '');
  }
  if (!/^dr\.?\s+/i.test(cleanDocName)) {
    cleanDocName = `Dr. ${cleanDocName}`;
  }

  const doctorDisplayName = cleanDocName;
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.jpg` : '';

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Clinic & Doctor Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>YASHFEEN HOMOEOPATHIC CLINIC</Text>
            <Text style={styles.doctorName}>DR. UMAR FAROOQ • DHMS (RMP) Physician</Text>
            <Text style={styles.subText}>
              {doctorInfo.regNo ? `Reg No: ${doctorInfo.regNo} | ` : ''}Contact: {doctorInfo.contact || '+92 300 1234567'}
            </Text>
          </View>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        </View>

        <Text style={styles.invoiceTitleBadge}>Consultation Fee Invoice</Text>

        {/* Invoice & Patient Meta */}
        <View style={styles.detailsBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{patient.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Patient Phone:</Text>
            <Text style={styles.value}>{patient.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Date:</Text>
            <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice #:</Text>
            <Text style={styles.value}>
              {invoiceNumber
                ? invoiceNumber.startsWith('INV-')
                  ? `INV-${invoiceNumber.slice(4, 12)}`
                  : `INV-${invoiceNumber.slice(0, 8)}`
                : `INV-${Date.now().toString().slice(-6)}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Selected Method:</Text>
            <Text style={styles.value}>{paymentMethod || 'Not Selected'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Consultation Fee:</Text>
            <Text style={styles.totalAmount}>Rs. {fee}</Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentHeading}>Official Payment Account Details</Text>
          <Text style={styles.paymentDetailRow}>• Bank: Meezan Bank / Askari Bank</Text>
          <Text style={styles.paymentDetailRow}>• Account Title: {doctorDisplayName}</Text>
          <Text style={styles.paymentDetailRow}>• IBAN / Account #: PK00XXXX00000000000000</Text>
          <Text style={styles.paymentDetailRow}>• Easypaisa / JazzCash: {doctorInfo.contact || '0300-1234567'}</Text>
        </View>

        <Text style={styles.footer}>
          After completing the fund transfer, kindly send a screenshot of the payment receipt on WhatsApp to initiate your consultation.
        </Text>
      </Page>
    </Document>
  );
}
export { InvoicePDF };
