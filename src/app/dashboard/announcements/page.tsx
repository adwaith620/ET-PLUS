import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { getCombinedAnnouncements } from '@/lib/announcements-service';
import { getSession } from '@/lib/auth';
import { AnnouncementsClient } from './announcements-client';

export const metadata = {
  title: 'Announcements | ETLAB TKMCE',
  description: 'Official college notices, exam cell circulars, and cohort announcements for R3AI',
};

export default async function AnnouncementsPage() {
  const session = await getSession();
  const data = await getDashboardData();
  if (!data) return null;

  const combinedAnnouncements = await getCombinedAnnouncements(data.announcements);
  const currentUsername = session?.username || 'demo';
  const currentUserName = session?.displayName || session?.username || 'Student';

  return (
    <AnnouncementsClient
      announcements={combinedAnnouncements}
      currentUsername={currentUsername}
      currentUserName={currentUserName}
    />
  );
}
