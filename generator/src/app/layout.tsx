import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Yashfeen EMR — Yashfeen Homoeopathic Clinic Management System',
  description: 'Manage homeopathic patient consultations, generate branded invoices and prescriptions, and dispatch PDFs via WhatsApp.',
  keywords: ['Homeopathy', 'EMR', 'Clinic Management', 'Prescription Builder', 'WhatsApp Dispatch', 'Yashfeen Clinic'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
