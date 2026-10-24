import type { Metadata } from 'next';
import { publicAppOrigin } from '../lib/public-origin';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(publicAppOrigin(process.env.PUBLIC_APP_URL)),
  title: 'tokpop.dev · Your AI activity. With personality.',
  description: 'Track your AI coding tools, tokens, and daily streaks in one place. Turn your workflow into a live card worth sharing.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    siteName: 'tokpop.dev',
    title: 'tokpop.dev · Your AI activity. With personality.',
    description: 'Track your coding tools and streaks, then share your progress on a live builder card.',
    type: 'website',
    images: [{ url: '/brand-preview', width: 1200, height: 630, alt: 'tokpop.dev · Your AI activity. With personality.' }],
  },
  twitter: { card: 'summary_large_image', images: ['/brand-preview'] },
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
