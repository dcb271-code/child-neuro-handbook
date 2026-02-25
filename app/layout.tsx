import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import GlobalSearch from '@/components/GlobalSearch';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Child Neurology Handbook',
  description: 'UofL Neurology Residency — Clinical Reference for Child Neurology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen">
        {/* Top navigation bar */}
        <header
          className="sticky top-0 z-40 shadow-md"
          style={{
            background: 'linear-gradient(to bottom, #1e3d6e, #152e56)',
            borderBottom: '2px solid #3b82f6',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-6">
            {/* Brand */}
            <a href="/" className="flex flex-col shrink-0 leading-tight min-w-0">
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide whitespace-nowrap">Child Neurology Handbook</span>
              <span className="text-blue-300 text-[10px] sm:text-xs whitespace-nowrap hidden sm:block">UofL Neurology Residency</span>
            </a>

            {/* Search — takes remaining space */}
            <div className="flex-1 min-w-0">
              <GlobalSearch />
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
