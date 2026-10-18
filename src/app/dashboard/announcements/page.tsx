import React from 'react';
import { getAnnouncementsPageData } from '@/lib/data-service';
import { AnnouncementsClient } from './announcements-client';

export const metadata = {
  title: 'Announcements',
  description: 'Official college notices, exam cell circulars, and cohort announcements for R3AI',
};

export default async function AnnouncementsPage() {
  const data = await getAnnouncementsPageData();
  if (!data) return null;

  return (
    <AnnouncementsClient
      announcements={data.announcements}
      currentUsername={data.currentUsername}
      currentUserName={data.currentUserName}
    />
  );
}
