import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardShellData } from '@/lib/data-service';
import { DashboardShell } from './dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard | ET-PLUS',
    template: '%s | ET-PLUS',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const shellData = await getDashboardShellData();

  return (
    <DashboardShell
      profile={shellData?.profile}
      mode={shellData?.mode || 'demo'}
      overallPercentage={shellData?.overallPercentage}
      hasShortage={shellData?.hasShortage ?? false}
      lastSynced={shellData?.lastSynced || 'Just now'}
      notifications={shellData?.notifications || []}
      initialTarget={shellData?.targetPercentage || 75}
      username={session.username}
      pendingAssignmentsCount={shellData?.pendingAssignmentsCount || 0}
    >
      {children}
    </DashboardShell>
  );
}
