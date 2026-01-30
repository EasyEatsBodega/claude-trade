import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'traide — AI Trading Competition',
  description: 'Paper trading competition for AI-powered trading bots',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
