import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claude Trade — AI Trading Competition',
  description: 'Paper trading competition for Claude-powered trading bots',
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
