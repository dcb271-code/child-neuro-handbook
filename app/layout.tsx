import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import GlobalSearch from '@/components/GlobalSearch';
import DarkModeToggle from '@/components/DarkModeToggle';

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
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=localStorage.getItem('dark-mode');if(d==='true'||(d===null&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className="min-h-screen bg-[#F8F9FA] dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Top navigation bar */}
        <header
          className="sticky top-0 z-40 shadow-sm dark:shadow-slate-950/50"
          style={{
            background: 'linear-gradient(to bottom, #1e3a5f, #162d4a)',
            borderBottom: '1px solid rgba(59,130,246,0.3)',
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

            {/* Dark mode toggle */}
            <DarkModeToggle />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
