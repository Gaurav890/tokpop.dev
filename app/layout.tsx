import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'AI Native Profile — Your AI build story, one live card',
  description: 'Turn your coding tools, tokens, streaks, and shipping into a live card made for your GitHub README.',
  openGraph: {
    title: 'Meet your AI build alter ego',
    description: 'Make a live GitHub card from the coding tools, tokens, streaks, and shipping behind your work.',
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
