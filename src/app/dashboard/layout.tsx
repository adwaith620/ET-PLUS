import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardData } from '@/lib/data-service';
import { isUpcomingAssignment } from '@/lib/assignment-utils';
import { DashboardShell } from './dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const data = await getDashboardData();
  const upcomingAssignmentsCount = data?.upcomingAssignmentsCount ?? (data?.assignments || []).filter((a) => isUpcomingAssignment(a)).length;

  return (
    <DashboardShell
      profile={data?.profile}
      mode={data?.mode || 'demo'}
      overallPercentage={data?.attendance.overallPercentage || 83.2}
      hasShortage={(data?.attendance.subjects || []).some((s) => s.percentage < (data?.targetPercentage || 75))}
      lastSynced={data?.lastSynced || 'Just now'}
      notifications={data?.notifications || []}
      initialTarget={data?.targetPercentage || 75}
      username={session.username}
      pendingAssignmentsCount={upcomingAssignmentsCount}
    >
      {children}
    </DashboardShell>
  );
}
