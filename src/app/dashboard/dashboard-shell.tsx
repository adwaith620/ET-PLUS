'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { StudentProfile, NotificationItem } from '@/types';

interface DashboardShellProps {
  children: React.ReactNode;
  profile?: StudentProfile;
  mode: 'live' | 'demo';
  overallPercentage: number;
  hasShortage: boolean;
  lastSynced: string;
  notifications: NotificationItem[];
}

export function DashboardShell({
  children,
  profile,
  mode,
  overallPercentage,
  hasShortage,
  lastSynced,
  notifications,
}: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        profile={profile}
        mode={mode}
        overallPercentage={overallPercentage}
        hasShortage={hasShortage}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header
          profile={profile}
          lastSynced={lastSynced}
          notifications={notifications}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer & Bottom Quick Nav */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        profile={profile}
        mode={mode}
      />
    </div>
  );
}
