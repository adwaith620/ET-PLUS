'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { StudentProfile, NotificationItem } from '@/types';
import { AttendanceTargetProvider } from '@/context/attendance-target-context';

interface DashboardShellProps {
  children: React.ReactNode;
  profile?: StudentProfile;
  mode: 'live' | 'demo';
  overallPercentage: number;
  hasShortage: boolean;
  lastSynced: string;
  notifications: NotificationItem[];
  initialTarget?: number;
  username?: string;
  pendingAssignmentsCount?: number;
}

export function DashboardShell({
  children,
  profile,
  mode,
  overallPercentage,
  hasShortage,
  lastSynced,
  notifications,
  initialTarget = 75,
  username,
  pendingAssignmentsCount = 0,
}: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <AttendanceTargetProvider initialTarget={initialTarget} username={username}>
      <div className="min-h-screen flex bg-[#fdfcfb] dark:bg-[#141518] text-stone-900 dark:text-stone-100 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar
        profile={profile}
        mode={mode}
        overallPercentage={overallPercentage}
        hasShortage={hasShortage}
        pendingAssignmentsCount={pendingAssignmentsCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header
          profile={profile}
          lastSynced={lastSynced}
          notifications={notifications}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-6xl w-full mx-auto">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer & Bottom Quick Nav */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        profile={profile}
        mode={mode}
        pendingAssignmentsCount={pendingAssignmentsCount}
      />
    </div>
    </AttendanceTargetProvider>
  );
}
