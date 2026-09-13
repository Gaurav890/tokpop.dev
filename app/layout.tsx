import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'AI Native Profile — Show how you build. Back it with evidence.',
  description: 'A verified profile for coding-agent activity and the work you ship, with coverage and provenance on every signal.',
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
      <body>{children}</body>
    </html>
  );
}
