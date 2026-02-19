import type { Metadata } from 'next';
import './globals.css';
import GlobalSearch from '@/components/GlobalSearch';

export const metadata: Metadata = {
  title: 'Child Neurology Handbook',
  description: 'UofL Neurology Residency — Clinical Reference for Child Neurology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Top navigation bar */}
        <header style={{ backgroundColor: '#1a3050' }} className="sticky top-0 z-40 shadow-md">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
            {/* Brand */}
            <a href="/" className="flex flex-col shrink-0 leading-tight">
              <span className="text-white font-bold text-sm tracking-wide">Child Neurology Handbook</span>
              <span className="text-blue-300 text-xs">UofL Neurology Residency</span>
            </a>

            {/* Search — takes remaining space */}
            <div className="flex-1 max-w-lg">
              <GlobalSearch />
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
