import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardShellData } from '@/lib/data-service';
import { DashboardShell } from './dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: {
    default: 'Dashboard | ETPlus',
    template: '%s | ETPlus',
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
