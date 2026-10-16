'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname === '/chat-comercial' || pathname?.startsWith('/whatsapp');

  return (
    <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden bg-slate-100/70 dark:bg-gradient-to-b dark:from-zinc-950 dark:to-[#0c0d0e] transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className={`flex-1 min-w-0 overflow-x-hidden ${isChatPage ? 'overflow-hidden p-0' : 'overflow-y-auto p-3 sm:p-4 md:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
