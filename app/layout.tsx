import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'AI Native Profile — Your AI developer activity, in one place',
  description: 'A provenance-aware activity profile for developers building with AI coding tools.',
  openGraph: {
    title: 'AI Native Profile — The open proof layer for AI-native developers',
    description: 'Evidence-based coding activity, GitHub delivery, transparent scoring, and portable developer profiles.',
    type: 'website',
    images: [{ url: '/og.png', width: 1734, height: 907, alt: 'AI Native Profile dashboard preview' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
